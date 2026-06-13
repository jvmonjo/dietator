import { ensureUtc } from '~/utils/datetime'

// One-time data migration: historically service start/end times were stored as
// naive local datetime strings ("2026-06-13T09:00"). We now store timestamps in
// UTC. This plugin normalises any legacy records found in persisted state on
// startup. It is idempotent — records already in UTC are left untouched.
export default defineNuxtPlugin(() => {
  const serviceStore = useServiceStore()

  let changed = false
  const migrated = serviceStore.records.map((record) => {
    const startTime = ensureUtc(record.startTime)
    const endTime = ensureUtc(record.endTime)
    if (startTime !== record.startTime || endTime !== record.endTime) {
      changed = true
      return { ...record, startTime, endTime }
    }
    return record
  })

  if (changed) {
    serviceStore.setRecords(migrated)
  }
})
