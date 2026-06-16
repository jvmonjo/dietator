import { describe, expect, it } from 'vitest'
import {
  categoryCountsTowardBalance,
  resolveExpenseCategory
} from '../../app/utils/expenseCategories'

describe('expense categories', () => {
  it('only diet counts toward the balance', () => {
    expect(categoryCountsTowardBalance('diet')).toBe(true)
    expect(categoryCountsTowardBalance('parking')).toBe(false)
    expect(categoryCountsTowardBalance('gas')).toBe(false)
    expect(categoryCountsTowardBalance('tolls')).toBe(false)
    expect(categoryCountsTowardBalance('other')).toBe(false)
  })

  it('uses the explicit category when present', () => {
    expect(resolveExpenseCategory({ category: 'parking' })).toBe('parking')
    expect(resolveExpenseCategory({ category: 'diet', excludeFromBalance: true })).toBe('diet')
  })

  it('migrates legacy records without a category', () => {
    // No flags → defaults to diet (previous behaviour: everything counted).
    expect(resolveExpenseCategory({})).toBe('diet')
    // Legacy excludeFromBalance → mapped to "other" (still excluded from balance).
    expect(resolveExpenseCategory({ excludeFromBalance: true })).toBe('other')
    expect(resolveExpenseCategory({ excludeFromBalance: false })).toBe('diet')
  })
})
