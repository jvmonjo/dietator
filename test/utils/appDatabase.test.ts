// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  getDistancesCache,
  getExpenses,
  getServices,
  migrateLocalStorageToIndexedDb
} from '../../app/utils/appDatabase'

describe('appDatabase migration', () => {
  it('moves legacy localStorage data into IndexedDB and removes the old copy', async () => {
    const service = {
      id: 'service-1',
      startTime: '2026-01-01T08:00:00.000Z',
      endTime: '2026-01-01T16:00:00.000Z',
      displacements: []
    }
    const expense = {
      id: 'expense-1',
      description: 'Parking',
      timestamp: '2026-01-01T12:00:00.000Z',
      amount: 12,
      ticket: 'data:image/jpeg;base64,AAAA'
    }

    localStorage.setItem('services', JSON.stringify({ state: { records: [service] } }))
    localStorage.setItem('expenses', JSON.stringify({ state: { expenses: [expense] } }))
    localStorage.setItem('distances', JSON.stringify({ state: { cache: { 'a:b': 42 } } }))

    await migrateLocalStorageToIndexedDb()

    await expect(getServices()).resolves.toEqual([service])
    await expect(getExpenses()).resolves.toEqual([expense])
    await expect(getDistancesCache()).resolves.toEqual({ 'a:b': 42 })
    expect(localStorage.getItem('services')).toBeNull()
    expect(localStorage.getItem('expenses')).toBeNull()
    expect(localStorage.getItem('distances')).toBeNull()
  })
})
