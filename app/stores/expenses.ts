import { defineStore } from 'pinia'
import { createSafeStorage, wasLastStorageWriteSuccessful } from '~/utils/storage'
import type { ExpenseCategory } from '~/utils/expenseCategories'

export interface ExpenseSaveResult {
    expense: ExpenseRecord
    attachmentRemoved: boolean
}

export interface ExpenseRecord {
    id: string
    description: string
    timestamp: string // ISO string, always stored in UTC
    amount: number
    // Optional receipt/ticket stored locally as a data URL (image or PDF).
    ticket?: string
    // Original file name and MIME type, kept for display and download.
    ticketName?: string
    ticketType?: string
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

const serializeExpensesState = (expenses: ExpenseRecord[]) => JSON.stringify({ expenses })

const persistExpensesSnapshot = (expenses: ExpenseRecord[]): boolean => {
    if (typeof window === 'undefined') return true
    const value = serializeExpensesState(expenses)
    createSafeStorage({ silent: true }).setItem(EXPENSES_STORAGE_KEY, value)
    return wasLastStorageWriteSuccessful(EXPENSES_STORAGE_KEY, value)
}

const stripTicket = (expense: ExpenseRecord): ExpenseRecord => {
    if (!expense.ticket && !expense.ticketName && !expense.ticketType) return expense
    const { ticket: _t, ticketName: _n, ticketType: _y, ...rest } = expense
    return rest
}

export const useExpenseStore = defineStore('expenses', {
    state: () => ({
        expenses: [] as ExpenseRecord[]
    }),
    actions: {
        addExpense(expense: ExpenseRecord): ExpenseSaveResult {
            const previousExpenses = [...this.expenses]
            this.expenses.push(expense)
            if (persistExpensesSnapshot(this.expenses)) {
                return { expense, attachmentRemoved: false }
            }

            if (expense.ticket || expense.ticketName || expense.ticketType) {
                const expenseWithoutTicket = stripTicket(expense)
                this.expenses[this.expenses.length - 1] = expenseWithoutTicket
                if (persistExpensesSnapshot(this.expenses)) {
                    return { expense: expenseWithoutTicket, attachmentRemoved: true }
                }
            }

            this.expenses = previousExpenses
            persistExpensesSnapshot(this.expenses)
            throw new Error('Expense could not be persisted')
        },
        setExpenses(expenses: ExpenseRecord[]) {
            this.expenses = expenses
        },
        updateExpense(updatedExpense: ExpenseRecord): ExpenseSaveResult {
            const index = this.expenses.findIndex(e => e.id === updatedExpense.id)
            if (index === -1) {
                return { expense: updatedExpense, attachmentRemoved: false }
            }

            const previousExpense = this.expenses[index]!
            this.expenses[index] = updatedExpense
            if (persistExpensesSnapshot(this.expenses)) {
                return { expense: updatedExpense, attachmentRemoved: false }
            }

            if (updatedExpense.ticket || updatedExpense.ticketName || updatedExpense.ticketType) {
                const expenseWithoutTicket = stripTicket(updatedExpense)
                this.expenses[index] = expenseWithoutTicket
                if (persistExpensesSnapshot(this.expenses)) {
                    return { expense: expenseWithoutTicket, attachmentRemoved: true }
                }
            }

            this.expenses[index] = previousExpense
            persistExpensesSnapshot(this.expenses)
            throw new Error('Expense could not be persisted')
        },
        deleteExpense(id: string) {
            this.expenses = this.expenses.filter(e => e.id !== id)
        },
        deleteExpensesByYear(year: number) {
            this.expenses = this.expenses.filter(expense => {
                return new Date(expense.timestamp).getFullYear() !== year
            })
        },
        deleteExpensesByMonth(year: number, month: number) {
            // month is 1-12
            this.expenses = this.expenses.filter(expense => {
                const date = new Date(expense.timestamp)
                return !(date.getFullYear() === year && date.getMonth() + 1 === month)
            })
        },
        // Approximate storage taken by attached tickets (data URL + metadata),
        // and how many expenses carry one.
        getTicketStats(): { count: number, bytes: number } {
            let count = 0
            let bytes = 0
            this.expenses.forEach(expense => {
                if (!expense.ticket) return
                count++
                bytes += expense.ticket.length
                    + (expense.ticketName?.length || 0)
                    + (expense.ticketType?.length || 0)
            })
            return { count, bytes }
        },
        // Strip ticket attachments to free space while keeping the expenses.
        removeAllTickets() {
            this.expenses = this.expenses.map(stripTicket)
        },
        removeTicketsByYear(year: number) {
            this.expenses = this.expenses.map(expense =>
                new Date(expense.timestamp).getFullYear() === year ? stripTicket(expense) : expense)
        },
        removeTicketsByMonth(year: number, month: number) {
            // month is 1-12
            this.expenses = this.expenses.map(expense => {
                const date = new Date(expense.timestamp)
                return date.getFullYear() === year && date.getMonth() + 1 === month
                    ? stripTicket(expense)
                    : expense
            })
        }
    },
    persist: {
        storage: createSafeStorage()
    }
})
