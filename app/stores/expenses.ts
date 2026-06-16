import { defineStore } from 'pinia'
import { createSafeStorage } from '~/utils/storage'

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
}

export const useExpenseStore = defineStore('expenses', {
    state: () => ({
        expenses: [] as ExpenseRecord[]
    }),
    actions: {
        addExpense(expense: ExpenseRecord) {
            this.expenses.push(expense)
        },
        setExpenses(expenses: ExpenseRecord[]) {
            this.expenses = expenses
        },
        updateExpense(updatedExpense: ExpenseRecord) {
            const index = this.expenses.findIndex(e => e.id === updatedExpense.id)
            if (index !== -1) {
                this.expenses[index] = updatedExpense
            }
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
        }
    },
    persist: {
        storage: createSafeStorage()
    }
})
