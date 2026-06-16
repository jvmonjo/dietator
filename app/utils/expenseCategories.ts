// Expense categories. Keys are language-independent and stored on the record;
// labels are translated in the UI via `expenses.categories.<key>`.

export const EXPENSE_CATEGORIES = ['diet', 'parking', 'gas', 'tolls', 'other'] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = 'diet'

// Only "diet" expenses are offset by the per-diem, so only they reduce the net balance.
export const categoryCountsTowardBalance = (category: ExpenseCategory): boolean => category === 'diet'

// Resolve an expense's effective category, migrating older records that only had
// the boolean `excludeFromBalance` flag (true → non-diet, kept as "other").
export function resolveExpenseCategory(
    expense: { category?: ExpenseCategory, excludeFromBalance?: boolean }
): ExpenseCategory {
    if (expense.category) return expense.category
    return expense.excludeFromBalance ? 'other' : 'diet'
}

// Nuxt UI badge/colour per category, used for badges and calendar dots.
export const CATEGORY_COLORS: Record<ExpenseCategory, 'primary' | 'info' | 'warning' | 'error' | 'neutral'> = {
    diet: 'primary',
    parking: 'info',
    gas: 'warning',
    tolls: 'error',
    other: 'neutral'
}
