export interface RotationPerson { id: string, name: string }
export interface RotationEntry { id: string, date: string, personId: string, comments?: string }
export interface RotationActivity {
  id: string
  title: string
  people: RotationPerson[]
  entries: RotationEntry[]
}

const fail = (): never => { throw new Error('invalidRotation') }
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value

// Validate imported/persisted data before it can replace any local history.
export function validateRotations(value: unknown): asserts value is RotationActivity[] {
  if (!Array.isArray(value)) throw new Error('invalidRotation')
  const activityIds = new Set<string>()
  for (const activity of value) {
    if (!activity || !text(activity.id) || activityIds.has(activity.id) || !text(activity.title)
      || !Array.isArray(activity.people) || activity.people.length < 2 || !Array.isArray(activity.entries)) fail()
    activityIds.add(activity.id)
    const people = new Set<string>()
    const names = new Set<string>()
    for (const person of activity.people) {
      if (!person || !text(person.id) || !text(person.name) || people.has(person.id)
        || names.has(person.name.trim().toLocaleLowerCase())) fail()
      people.add(person.id)
      names.add(person.name.trim().toLocaleLowerCase())
    }
    const entries = new Set<string>()
    for (const entry of activity.entries) {
      if (!entry || !text(entry.id) || entries.has(entry.id) || !people.has(entry.personId)
        || typeof entry.date !== 'string' || !validDate(entry.date)
        || (entry.comments !== undefined && typeof entry.comments !== 'string')) fail()
      entries.add(entry.id)
    }
  }
}

export function rotationBalance(activity: RotationActivity) {
  const counts = new Map(activity.people.map(person => [person.id, 0]))
  for (const entry of activity.entries) counts.set(entry.personId, (counts.get(entry.personId) ?? 0) + 1)
  const max = Math.max(0, ...counts.values())
  return activity.people.map(person => ({ ...person, count: counts.get(person.id) ?? 0, owed: max - (counts.get(person.id) ?? 0) }))
}

// Lowest count first; ties use the configured participant order. A bounded
// preview avoids allocating a huge queue when importing a long history.
export function nextRotationQueue(activity: RotationActivity, limit = 12): RotationPerson[] {
  const balance = rotationBalance(activity)
  const deficit = balance.reduce((total, person) => total + person.owed, 0)
  const size = Math.min(Math.max(0, limit), deficit || balance.length)
  const queue: RotationPerson[] = []
  for (let index = 0; index < size; index++) {
    const next = balance.reduce((first, person) => person.count < first.count ? person : first)
    queue.push({ id: next.id, name: next.name })
    next.count++
  }
  return queue
}

// QR imports are additive: stable IDs prevent rescans from duplicating turns.
// Local records win conflicts, so an older shared QR cannot undo an edit.
export function mergeRotationImport(current: RotationActivity[], incoming: unknown): RotationActivity[] {
  validateRotations(incoming)
  const result: RotationActivity[] = structuredClone(current)
  for (const activity of incoming) {
    const local = result.find(item => item.id === activity.id)
    if (!local) { result.push(structuredClone(activity)); continue }
    for (const person of activity.people) {
      const existing = local.people.find(item => item.id === person.id)
      if (existing) continue
      // Different IDs with the same name are ambiguous; do not silently remap history.
      if (local.people.some(item => item.name.trim().toLocaleLowerCase() === person.name.trim().toLocaleLowerCase())) fail()
      local.people.push({ ...person })
    }
    for (const entry of activity.entries) {
      if (!local.entries.some(item => item.id === entry.id)) local.entries.push({ ...entry })
    }
  }
  validateRotations(result)
  return result
}

export function rotationQrPages(activity: RotationActivity): string[] {
  validateRotations([activity])
  const pages: string[] = []
  const payload = (entries: RotationEntry[]) => JSON.stringify({ type: 'dietator-rotations', version: 1, activities: [{ ...activity, entries }] })
  let entries: RotationEntry[] = []
  for (const entry of activity.entries) {
    if (new TextEncoder().encode(payload([...entries, entry])).length > 2000) {
      if (!entries.length) fail()
      pages.push(payload(entries))
      entries = []
    }
    entries.push(entry)
  }
  const last = payload(entries)
  if (new TextEncoder().encode(last).length > 2000) fail()
  pages.push(last)
  return pages
}

export function parseRotationQr(raw: string): RotationActivity[] {
  const value = JSON.parse(raw)
  if (value?.type !== 'dietator-rotations' || value.version !== 1) fail()
  validateRotations(value.activities)
  return value.activities
}
