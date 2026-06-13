// Helpers to keep timestamps in UTC in storage while editing/displaying in local time.

// Convert a UTC ISO timestamp to a value usable by an <input type="datetime-local">
// (which works with the browser's local time, format: YYYY-MM-DDTHH:mm).
export const utcToLocalInput = (iso?: string | null): string => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

// Convert a local datetime-local input value (interpreted in the browser's
// local time zone) to a UTC ISO string suitable for storage.
export const localInputToUtc = (local?: string | null): string => {
  if (!local) return ''
  const date = new Date(local)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

// Local calendar day (YYYY-MM-DD) of a timestamp, regardless of whether it is
// stored as a UTC ISO string or a naive local datetime string.
export const localDateKey = (value?: string | null): string => {
  return utcToLocalInput(value).split('T')[0] ?? ''
}

// A "naive" local datetime string carries no time zone, e.g. "2026-06-13T09:00"
// (the value produced by <input type="datetime-local">). UTC ISO strings end
// with "Z" or carry an explicit offset, so they are excluded.
const NAIVE_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/

export const isNaiveLocalDateTime = (value?: string | null): boolean => {
  return typeof value === 'string' && NAIVE_DATETIME_RE.test(value)
}

// Normalise a timestamp to UTC. Naive local datetimes are interpreted in the
// browser's local time zone and converted; values that already carry time zone
// information (or are empty) are returned untouched. Idempotent.
export const ensureUtc = (value?: string | null): string => {
  if (!value) return value ?? ''
  return isNaiveLocalDateTime(value) ? localInputToUtc(value) : value
}
