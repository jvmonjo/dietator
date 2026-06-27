import { defineStore } from 'pinia'
import { createSafeStorage, wasLastStorageWriteSuccessful } from '~/utils/storage'
import type { ExpenseCategory } from '~/utils/expenseCategories'
import {
    buildExpenseAttachmentId,
    deleteExpenseAttachment,
    deleteExpenseAttachments,
    getExpenseAttachment,
    getExpenseAttachmentsStats,
    saveExpenseAttachment
} from '~/utils/expenseAttachments'

export interface ExpenseSaveResult {
    expense: ExpenseRecord
    attachmentRemoved: boolean
}

export interface ExpenseRecord {
    id: string
    description: string
    timestamp: string // ISO string, always stored in UTC
    amount: number
    // Optional receipt/ticket loaded in memory as a data URL (image or PDF).
    ticket?: string
    // IndexedDB key for the persisted attachment. The data URL itself is not
    // written to localStorage.
    ticketId?: string
    // Original file name and MIME type, kept for display and download.
    ticketName?: string
    ticketType?: string
    ticketSize?: number
    // Expense category (diet, parking, gas, tolls, other). Only "diet" counts
    // toward the net balance. Absent on older records — resolved via
    // resolveExpenseCategory(), which also honours the legacy flag below.
    category?: ExpenseCategory
    // Optional place where the expense happened.
    location?: ExpenseLocation
    // @deprecated Superseded by `category`. Kept so older records still resolve
    // correctly (true meant "don't count toward the balance").
    excludeFromBalance?: boolean
}

export interface ExpenseLocation {
    label: string
    placeId?: string
    city?: string
    province?: string
    zone?: string
    lat?: number
    lng?: number
}

// Return a copy of the expense with its ticket attachment removed, keeping the
// expense record itself intact.
export const EXPENSES_STORAGE_KEY = 'expenses'

const stripPersistedTicketData = (expense: ExpenseRecord): ExpenseRecord => {
    if (!expense.ticket) return expense
    const { ticket: _ticket, ...rest } = expense
    return rest
}

const serializeExpensesState = (expenses: ExpenseRecord[]) =>
    JSON.stringify({ expenses: expenses.map(stripPersistedTicketData) })

const persistExpensesSnapshot = (expenses: ExpenseRecord[]): boolean => {
    if (typeof window === 'undefined') return true
    const value = serializeExpensesState(expenses)
    createSafeStorage({ silent: true }).setItem(EXPENSES_STORAGE_KEY, value)
    return wasLastStorageWriteSuccessful(EXPENSES_STORAGE_KEY, value)
}

const stripTicket = (expense: ExpenseRecord): ExpenseRecord => {
    if (!expense.ticket && !expense.ticketId && !expense.ticketName && !expense.ticketType && !expense.ticketSize) return expense
    const { ticket: _t, ticketId: _i, ticketName: _n, ticketType: _y, ticketSize: _s, ...rest } = expense
    return rest
}

const ticketIds = (expenses: ExpenseRecord[]) =>
    expenses.map(expense => expense.ticketId).filter((id): id is string => Boolean(id))

const prepareExpenseForSave = async (expense: ExpenseRecord): Promise<ExpenseRecord> => {
    if (!expense.ticket) return expense

    const id = expense.ticketId || buildExpenseAttachmentId(expense.id)
    const attachment = await saveExpenseAttachment({
        id,
        dataUrl: expense.ticket,
        name: expense.ticketName,
        type: expense.ticketType
    })

    return {
        ...expense,
        ticketId: id,
        ticketName: attachment.name,
        ticketType: attachment.type,
        ticketSize: attachment.size,
        ticket: attachment.dataUrl
    }
}

export const useExpenseStore = defineStore('expenses', {
    state: () => ({
        expenses: [] as ExpenseRecord[]
    }),
    actions: {
        async addExpense(expense: ExpenseRecord): Promise<ExpenseSaveResult> {
            const previousExpenses = [...this.expenses]
            const preparedExpense = await prepareExpenseForSave(expense)
            this.expenses.push(preparedExpense)
            if (persistExpensesSnapshot(this.expenses)) {
                return { expense: preparedExpense, attachmentRemoved: false }
            }

            if (preparedExpense.ticket || preparedExpense.ticketId || preparedExpense.ticketName || preparedExpense.ticketType) {
                const expenseWithoutTicket = stripTicket(preparedExpense)
                this.expenses[this.expenses.length - 1] = expenseWithoutTicket
                if (persistExpensesSnapshot(this.expenses)) {
                    if (preparedExpense.ticketId) await deleteExpenseAttachment(preparedExpense.ticketId)
                    return { expense: expenseWithoutTicket, attachmentRemoved: true }
                }
            }

            this.expenses = previousExpenses
            persistExpensesSnapshot(this.expenses)
            if (preparedExpense.ticketId && preparedExpense.ticketId !== expense.ticketId) {
                await deleteExpenseAttachment(preparedExpense.ticketId)
            }
            throw new Error('Expense could not be persisted')
        },
        async setExpenses(expenses: ExpenseRecord[]) {
            this.expenses = await Promise.all(expenses.map(prepareExpenseForSave))
            persistExpensesSnapshot(this.expenses)
        },
        async updateExpense(updatedExpense: ExpenseRecord): Promise<ExpenseSaveResult> {
            const index = this.expenses.findIndex(e => e.id === updatedExpense.id)
            if (index === -1) {
                return { expense: updatedExpense, attachmentRemoved: false }
            }

            const previousExpense = this.expenses[index]!
            const preparedExpense = await prepareExpenseForSave(updatedExpense)
            this.expenses[index] = preparedExpense
            if (persistExpensesSnapshot(this.expenses)) {
                if (!preparedExpense.ticketId && previousExpense.ticketId) {
                    await deleteExpenseAttachment(previousExpense.ticketId)
                }
                return { expense: preparedExpense, attachmentRemoved: false }
            }

            if (preparedExpense.ticket || preparedExpense.ticketId || preparedExpense.ticketName || preparedExpense.ticketType) {
                const expenseWithoutTicket = stripTicket(preparedExpense)
                this.expenses[index] = expenseWithoutTicket
                if (persistExpensesSnapshot(this.expenses)) {
                    if (preparedExpense.ticketId) await deleteExpenseAttachment(preparedExpense.ticketId)
                    return { expense: expenseWithoutTicket, attachmentRemoved: true }
                }
            }

            this.expenses[index] = previousExpense
            persistExpensesSnapshot(this.expenses)
            if (preparedExpense.ticketId && preparedExpense.ticketId !== previousExpense.ticketId) {
                await deleteExpenseAttachment(preparedExpense.ticketId)
            }
            throw new Error('Expense could not be persisted')
        },
        deleteExpense(id: string) {
            const expense = this.expenses.find(e => e.id === id)
            this.expenses = this.expenses.filter(e => e.id !== id)
            if (expense?.ticketId) void deleteExpenseAttachment(expense.ticketId)
        },
        deleteExpensesByYear(year: number) {
            const removedIds = ticketIds(this.expenses.filter(expense => new Date(expense.timestamp).getFullYear() === year))
            this.expenses = this.expenses.filter(expense => {
                return new Date(expense.timestamp).getFullYear() !== year
            })
            void deleteExpenseAttachments(removedIds)
        },
        deleteExpensesByMonth(year: number, month: number) {
            const removedIds = ticketIds(this.expenses.filter(expense => {
                const date = new Date(expense.timestamp)
                return date.getFullYear() === year && date.getMonth() + 1 === month
            }))
            // month is 1-12
            this.expenses = this.expenses.filter(expense => {
                const date = new Date(expense.timestamp)
                return !(date.getFullYear() === year && date.getMonth() + 1 === month)
            })
            void deleteExpenseAttachments(removedIds)
        },
        // Storage taken by the ticket files currently present in IndexedDB for
        // the expenses that still reference one.
        async getTicketStats(): Promise<{ count: number, bytes: number }> {
            return getExpenseAttachmentsStats(ticketIds(this.expenses))
        },
        // Strip ticket attachments to free space while keeping the expenses.
        removeAllTickets() {
            const removedIds = ticketIds(this.expenses)
            this.expenses = this.expenses.map(stripTicket)
            void deleteExpenseAttachments(removedIds)
        },
        removeTicketsByYear(year: number) {
            const removedIds = ticketIds(this.expenses.filter(expense =>
                new Date(expense.timestamp).getFullYear() === year))
            this.expenses = this.expenses.map(expense =>
                new Date(expense.timestamp).getFullYear() === year ? stripTicket(expense) : expense)
            void deleteExpenseAttachments(removedIds)
        },
        removeTicketsByMonth(year: number, month: number) {
            const removedIds = ticketIds(this.expenses.filter(expense => {
                const date = new Date(expense.timestamp)
                return date.getFullYear() === year && date.getMonth() + 1 === month
            }))
            // month is 1-12
            this.expenses = this.expenses.map(expense => {
                const date = new Date(expense.timestamp)
                return date.getFullYear() === year && date.getMonth() + 1 === month
                    ? stripTicket(expense)
                    : expense
            })
            void deleteExpenseAttachments(removedIds)
        },
        async hydrateTicketAttachments() {
            const hydrated = await Promise.all(this.expenses.map(async (expense) => {
                if (expense.ticket) {
                    return prepareExpenseForSave(expense)
                }

                if (!expense.ticketId) return expense

                const attachment = await getExpenseAttachment(expense.ticketId)
                if (!attachment) return expense

                return {
                    ...expense,
                    ticket: attachment.dataUrl,
                    ticketName: expense.ticketName || attachment.name,
                    ticketType: expense.ticketType || attachment.type,
                    ticketSize: expense.ticketSize ?? attachment.size
                }
            }))
            this.expenses = hydrated
            persistExpensesSnapshot(this.expenses)
        }
    },
    persist: {
        storage: createSafeStorage(),
        serializer: {
            serialize: state => serializeExpensesState(state.expenses),
            deserialize: value => JSON.parse(value)
        }
    }
})
