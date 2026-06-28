// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JSZip from 'jszip'
import { generateWordReport } from '../../app/utils/export'
import type { ExpenseRecord } from '../../app/stores/expenses'
import type { ServiceRecord } from '../../app/stores/services'

const service: ServiceRecord = {
  id: 'svc-1',
  startTime: '2026-03-10T08:00:00.000Z',
  endTime: '2026-03-10T16:00:00.000Z',
  kilometers: 24,
  displacements: [
    { id: 'disp-1', province: 'Barcelona', municipality: 'Manresa', hasLunch: true, hasDinner: false }
  ]
}

const expense: ExpenseRecord = {
  id: 'expense-1',
  description: 'Parking',
  timestamp: '2026-03-10T12:00:00.000Z',
  amount: 3.5,
  category: 'parking',
  ticket: 'data:image/png;base64,AAAA',
  ticketId: 'expense:expense-1',
  ticketName: 'ticket.png',
  ticketType: 'image/png'
}

describe('generateWordReport', () => {
  beforeEach(() => {
    vi.stubGlobal('useRuntimeConfig', () => ({ app: { baseURL: '/' } }))
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('skip logo in unit tests'))))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('includes selected expenses and hydrated ticket data in the monthly JSON backup', async () => {
    const result = await generateWordReport({
      records: [service],
      expenses: [expense],
      totals: {
        lunches: 1,
        dinners: 0,
        halfDietCount: 1,
        fullDietCount: 0,
        dietUnits: 0.5,
        allowance: 7.5,
        serviceCount: 1,
        kilometers: 24
      },
      month: { value: '2026-03', label: 'març 2026' },
      settings: {
        halfDietPrice: 15,
        fullDietPrice: 30
      },
      templates: {
        monthly: null,
        service: null
      }
    })

    expect(result).toBeTruthy()
    const zip = await JSZip.loadAsync(await result!.blob.arrayBuffer())
    const jsonFile = Object.keys(zip.files).find(name => name.includes('dades-mensuals-dietator'))
    expect(jsonFile).toBeTruthy()

    const payload = JSON.parse(await zip.file(jsonFile!)!.async('string'))
    expect(payload.services).toEqual([service])
    expect(payload.expenses).toEqual([expense])
  })
})
