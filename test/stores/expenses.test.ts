// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { EXPENSES_STORAGE_KEY, useExpenseStore, type ExpenseRecord } from '../../app/stores/expenses'
import { getExpenseAttachment } from '../../app/utils/expenseAttachments'

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
    vi.stubGlobal('indexedDB', new IDBFactory())
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('persists expenses normally', async () => {
    const store = useExpenseStore()
    const expense = makeExpense()

    const result = await store.addExpense(expense)

    expect(result).toEqual({ expense, attachmentRemoved: false })
    expect(JSON.parse(window.localStorage.getItem(EXPENSES_STORAGE_KEY) || '{}')).toEqual({
      expenses: [expense]
    })
  })

  it('stores ticket data in IndexedDB and keeps localStorage lightweight', async () => {
    const store = useExpenseStore()
    const expense = makeExpense({
      ticket: 'data:image/jpeg;base64,' + 'A'.repeat(1024),
      ticketName: 'receipt.jpg',
      ticketType: 'image/jpeg'
    })

    const result = await store.addExpense(expense)
    const persisted = window.localStorage.getItem(EXPENSES_STORAGE_KEY) || ''
    const attachment = await getExpenseAttachment(result.expense.ticketId!)

    expect(result.attachmentRemoved).toBe(false)
    expect(result.expense.ticketId).toBe(`expense:${expense.id}`)
    expect(result.expense.ticket).toBe(expense.ticket)
    expect(attachment?.dataUrl).toBe(expense.ticket)
    expect(store.expenses).toEqual([result.expense])
    expect(persisted).toContain(`expense:${expense.id}`)
    expect(persisted).not.toContain('data:image/jpeg')
  })

  it('hydrates ticket data from IndexedDB when only metadata was persisted', async () => {
    const store = useExpenseStore()
    const expense = makeExpense({
      ticket: 'data:image/jpeg;base64,' + 'A'.repeat(1024),
      ticketName: 'receipt.jpg',
      ticketType: 'image/jpeg'
    })

    const { expense: savedExpense } = await store.addExpense(expense)
    await store.setExpenses([{
      ...savedExpense,
      ticket: undefined
    }])

    await store.hydrateTicketAttachments()

    expect(store.expenses[0]?.ticket).toBe(expense.ticket)
    expect(window.localStorage.getItem(EXPENSES_STORAGE_KEY)).not.toContain('data:image/jpeg')
  })

  it('rolls back when storage is too full even without the ticket', async () => {
    const store = useExpenseStore()
    const expense = makeExpense({ ticket: 'data:image/jpeg;base64,AAAA' })

    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    vi.spyOn(window, 'alert').mockImplementation(() => {})

    await expect(store.addExpense(expense)).rejects.toThrow('Expense could not be persisted')
    expect(store.expenses).toEqual([])
  })
})
