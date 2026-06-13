import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useServiceStore, type ServiceRecord } from '../../app/stores/services'

// Timestamps are UTC ISO strings (with `Z`) — the shape the app stores. The
// store filters records by their *local* calendar year/month (getFullYear /
// getMonth), so the suite pins TZ=Europe/Madrid (CET = UTC+1, CEST = UTC+2).
const makeRecord = (overrides: Partial<ServiceRecord> = {}): ServiceRecord => ({
  id: overrides.id ?? crypto.randomUUID(),
  startTime: overrides.startTime ?? '2026-01-15T07:00:00.000Z', // 08:00 local (CET)
  endTime: overrides.endTime ?? '2026-01-15T15:00:00.000Z', // 16:00 local (CET)
  displacements: overrides.displacements ?? [],
  kilometers: overrides.kilometers,
  notes: overrides.notes
})

describe('useServiceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts empty', () => {
    const store = useServiceStore()
    expect(store.records).toEqual([])
  })

  it('adds and replaces records', () => {
    const store = useServiceStore()
    store.addRecord(makeRecord({ id: 'a' }))
    store.addRecord(makeRecord({ id: 'b' }))
    expect(store.records).toHaveLength(2)

    store.setRecords([makeRecord({ id: 'c' })])
    expect(store.records.map(r => r.id)).toEqual(['c'])
  })

  it('updates an existing record by id and ignores unknown ids', () => {
    const store = useServiceStore()
    store.setRecords([makeRecord({ id: 'a', kilometers: 10 })])

    store.updateRecord(makeRecord({ id: 'a', kilometers: 99 }))
    expect(store.records[0]!.kilometers).toBe(99)

    store.updateRecord(makeRecord({ id: 'does-not-exist', kilometers: 1 }))
    expect(store.records).toHaveLength(1)
  })

  it('deletes a record by id', () => {
    const store = useServiceStore()
    store.setRecords([makeRecord({ id: 'a' }), makeRecord({ id: 'b' })])
    store.deleteRecord('a')
    expect(store.records.map(r => r.id)).toEqual(['b'])
  })

  it('deletes all records for a given (local) year', () => {
    const store = useServiceStore()
    store.setRecords([
      makeRecord({ id: '2025', startTime: '2025-06-01T06:00:00.000Z' }), // 08:00 local
      makeRecord({ id: '2026', startTime: '2026-06-01T06:00:00.000Z' })
    ])
    store.deleteRecordsByYear(2025)
    expect(store.records.map(r => r.id)).toEqual(['2026'])
  })

  it('deletes records for a specific (local) month/year only', () => {
    const store = useServiceStore()
    store.setRecords([
      makeRecord({ id: 'jan26', startTime: '2026-01-10T10:00:00.000Z' }),
      makeRecord({ id: 'feb26', startTime: '2026-02-10T10:00:00.000Z' }),
      makeRecord({ id: 'jan25', startTime: '2025-01-10T10:00:00.000Z' })
    ])
    // month is 1-indexed.
    store.deleteRecordsByMonth(2026, 1)
    expect(store.records.map(r => r.id).sort()).toEqual(['feb26', 'jan25'])
  })

  it('reports a non-zero storage footprint once records exist', () => {
    const store = useServiceStore()
    expect(store.getStorageUsage()).toBe(new Blob([JSON.stringify([])]).size)
    store.addRecord(makeRecord({ id: 'a' }))
    expect(store.getStorageUsage()).toBeGreaterThan(2)
  })

  // --- Near-midnight / timezone edge cases --------------------------------

  it('buckets a near-midnight UTC timestamp by its LOCAL calendar month', () => {
    const store = useServiceStore()
    // 23:30Z on Jan 31 is 00:30 on Feb 1 in Madrid (CET, UTC+1).
    store.setRecords([makeRecord({ id: 'edge', startTime: '2026-01-31T23:30:00.000Z' })])

    // It belongs to February locally, so deleting January must keep it...
    store.deleteRecordsByMonth(2026, 1)
    expect(store.records.map(r => r.id)).toEqual(['edge'])

    // ...and deleting February removes it.
    store.deleteRecordsByMonth(2026, 2)
    expect(store.records).toEqual([])
  })

  it('buckets a near-midnight UTC timestamp by its LOCAL calendar year', () => {
    const store = useServiceStore()
    // 23:30Z on Dec 31 2025 is 00:30 on Jan 1 2026 in Madrid.
    store.setRecords([makeRecord({ id: 'edge', startTime: '2025-12-31T23:30:00.000Z' })])

    store.deleteRecordsByYear(2025)
    expect(store.records.map(r => r.id)).toEqual(['edge'])

    store.deleteRecordsByYear(2026)
    expect(store.records).toEqual([])
  })
})
