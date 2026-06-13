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
