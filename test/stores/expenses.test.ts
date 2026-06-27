// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EXPENSES_STORAGE_KEY, useExpenseStore, type ExpenseRecord } from '../../app/stores/expenses'

const makeExpense = (overrides: Partial<ExpenseRecord> = {}): ExpenseRecord => ({
  id: overrides.id ?? crypto.randomUUID(),
  description: overrides.description ?? 'Parking',
  timestamp: overrides.timestamp ?? '2026-01-15T12:00:00.000Z',
  amount: overrides.amount ?? 12.5,
  category: overrides.category ?? 'parking',
  ticket: overrides.ticket,
  ticketName: overrides.ticketName,
  ticketType: overrides.ticketType
})

describe('useExpenseStore persistence safeguards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('persists expenses normally', () => {
    const store = useExpenseStore()
    const expense = makeExpense()

    const result = store.addExpense(expense)

    expect(result).toEqual({ expense, attachmentRemoved: false })
    expect(JSON.parse(window.localStorage.getItem(EXPENSES_STORAGE_KEY) || '{}')).toEqual({
      expenses: [expense]
    })
  })

  it('keeps the expense but removes its ticket when storage is only too full for the attachment', () => {
    const store = useExpenseStore()
    const expense = makeExpense({
      ticket: 'data:image/jpeg;base64,' + 'A'.repeat(1024),
      ticketName: 'receipt.jpg',
      ticketType: 'image/jpeg'
    })
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage)

    vi.spyOn(window.localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === EXPENSES_STORAGE_KEY && value.includes('data:image/jpeg')) {
        throw new DOMException('full', 'QuotaExceededError')
      }
      originalSetItem(key, value)
    })
    vi.spyOn(window, 'alert').mockImplementation(() => {})

    const result = store.addExpense(expense)

    expect(result.attachmentRemoved).toBe(true)
    expect(result.expense.ticket).toBeUndefined()
    expect(store.expenses).toEqual([result.expense])
    expect(window.localStorage.getItem(EXPENSES_STORAGE_KEY)).not.toContain('data:image/jpeg')
  })

  it('rolls back when storage is too full even without the ticket', () => {
    const store = useExpenseStore()
    const expense = makeExpense({ ticket: 'data:image/jpeg;base64,AAAA' })

    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    vi.spyOn(window, 'alert').mockImplementation(() => {})

    expect(() => store.addExpense(expense)).toThrow('Expense could not be persisted')
    expect(store.expenses).toEqual([])
  })
})
