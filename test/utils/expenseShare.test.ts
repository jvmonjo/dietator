import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildExpensesArchive } from '~/utils/expenseShare'
import type { ExpenseRecord } from '~/stores/expenses'

const categoryLabel = (c: string) => `cat:${c}`

// 1x1 transparent PNG data URL.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const expenses: ExpenseRecord[] = [
  { id: '1', description: 'Dinar feina', timestamp: '2026-03-10T12:00:00.000Z', amount: 12.5, category: 'diet' },
  {
    id: '2', description: 'Pàrquing', timestamp: '2026-03-11T09:00:00.000Z', amount: 3,
    category: 'parking', ticket: PNG, ticketName: 'rebut.png', ticketType: 'image/png'
  }
]

describe('buildExpensesArchive', () => {
  it('returns null for an empty selection', async () => {
    const result = await buildExpensesArchive([], { locale: 'ca-ES', categoryLabel })
    expect(result).toBeNull()
  })

  it('bundles a CSV, a JSON copy and the ticket attachments', async () => {
    const result = await buildExpensesArchive(expenses, { locale: 'ca-ES', categoryLabel })
    expect(result).not.toBeNull()

    const buffer = await result!.blob.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)
    expect(zip.file('expenses.csv')).toBeTruthy()
    expect(zip.file('expenses.json')).toBeTruthy()

    // One ticket file in the tickets/ folder for the expense that has one.
    const ticketFiles = Object.keys(zip.files).filter(name => name.startsWith('tickets/') && !zip.files[name]!.dir)
    expect(ticketFiles).toHaveLength(1)

    const csv = await zip.file('expenses.csv')!.async('string')
    expect(csv).toContain('Dinar feina')
    expect(csv).toContain('cat:parking')

    const json = JSON.parse(await zip.file('expenses.json')!.async('string'))
    expect(json.meta.count).toBe(2)
    expect(json.meta.total).toBe(15.5)
    expect(json.expenses).toHaveLength(2)
  })
})
