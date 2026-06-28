// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useExpenseStore, type ExpenseRecord } from '../../app/stores/expenses'
import { getExpenseAttachment } from '../../app/utils/expenseAttachments'
import { getExpenses } from '../../app/utils/appDatabase'

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
        vi.restoreAllMocks()
  })

  it('persists expenses normally', async () => {
    const store = useExpenseStore()
    const expense = makeExpense()

    const result = await store.addExpense(expense)

    expect(result).toEqual({ expense, attachmentRemoved: false })
    await expect(getExpenses()).resolves.toEqual([expense])
  })

  it('stores ticket data and lightweight expense metadata in IndexedDB', async () => {
    const store = useExpenseStore()
    const expense = makeExpense({
      ticket: 'data:image/jpeg;base64,' + 'A'.repeat(1024),
      ticketName: 'receipt.jpg',
      ticketType: 'image/jpeg'
    })

    const result = await store.addExpense(expense)
    const persisted = JSON.stringify(await getExpenses())
    const attachment = await getExpenseAttachment(result.expense.ticketId!)

    expect(result.attachmentRemoved).toBe(false)
    expect(result.expense.ticketId).toBe(`expense:${expense.id}`)
    expect(result.expense.ticket).toBe(expense.ticket)
    expect(attachment?.dataUrl).toBe(expense.ticket)
    expect(store.expenses).toEqual([result.expense])
    expect(persisted).toContain(`expense:${expense.id}`)
    expect(persisted).not.toContain('data:image/jpeg')
  })

  it('calculates ticket stats from IndexedDB attachments, not expense metadata', async () => {
    const store = useExpenseStore()
    const expense = makeExpense({
      ticket: 'data:image/jpeg;base64,' + 'A'.repeat(1024),
      ticketName: 'receipt.jpg',
      ticketType: 'image/jpeg'
    })

    await store.addExpense(expense)
    store.expenses[0]!.ticketSize = 999999

    await expect(store.getTicketStats()).resolves.toEqual({
      count: 1,
      bytes: 768
    })
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
    await expect(getExpenses()).resolves.not.toContainEqual(expect.objectContaining({ ticket: expense.ticket }))
  })

  it('rolls back when storage is unavailable', async () => {
    const store = useExpenseStore()
    const expense = makeExpense()

    vi.stubGlobal('indexedDB', undefined)

    await expect(store.addExpense(expense)).rejects.toThrow('Expense could not be persisted')
    expect(store.expenses).toEqual([])
  })
})
