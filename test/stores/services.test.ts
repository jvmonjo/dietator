import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useServiceStore, type ServiceRecord } from '../../app/stores/services'

const makeRecord = (overrides: Partial<ServiceRecord> = {}): ServiceRecord => ({
  id: overrides.id ?? crypto.randomUUID(),
  // Local-time ISO (no trailing Z) keeps date-part assertions timezone safe.
  startTime: overrides.startTime ?? '2026-01-15T08:00:00',
  endTime: overrides.endTime ?? '2026-01-15T16:00:00',
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

  it('deletes all records for a given year', () => {
    const store = useServiceStore()
    store.setRecords([
      makeRecord({ id: '2025', startTime: '2025-06-01T08:00:00' }),
      makeRecord({ id: '2026', startTime: '2026-06-01T08:00:00' })
    ])
    store.deleteRecordsByYear(2025)
    expect(store.records.map(r => r.id)).toEqual(['2026'])
  })

  it('deletes records for a specific month/year only', () => {
    const store = useServiceStore()
    store.setRecords([
      makeRecord({ id: 'jan26', startTime: '2026-01-10T08:00:00' }),
      makeRecord({ id: 'feb26', startTime: '2026-02-10T08:00:00' }),
      makeRecord({ id: 'jan25', startTime: '2025-01-10T08:00:00' })
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
})
