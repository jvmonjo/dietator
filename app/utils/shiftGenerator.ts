// Adapted from jvmonjo/calcular-turnos (js/turnos.js).
export interface ShiftConfig {
  cycleLength: number
  codes: string[]
  pattern: string[]
}

export interface ShiftDay {
  date: string
  code: string
}

export const DEFAULT_SHIFT_CONFIG: ShiftConfig = {
  cycleLength: 28,
  codes: ['A', 'V', 'L'],
  pattern: [
    'A', 'L', 'V', 'L', 'A', 'A', 'A',
    'L', 'V', 'L', 'A', 'L', 'L', 'L',
    'V', 'L', 'A', 'L', 'V', 'V', 'V',
    'L', 'A', 'L', 'V', 'L', 'L', 'L'
  ]
}

export function validateShiftConfig(config: ShiftConfig): void {
  if (!Number.isInteger(config.cycleLength) || config.cycleLength < 1 || config.cycleLength > 366
    || !config.codes.length || config.codes.some(code => !code.trim())
    || new Set(config.codes).size !== config.codes.length
    || config.pattern.length !== config.cycleLength
    || config.pattern.some(code => !config.codes.includes(code))) {
    throw new Error('invalidConfig')
  }
}

// Date-only UTC arithmetic keeps calendar days stable across timezones and DST.
export function parseShiftDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('invalidDate')
  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('invalidDate')
  return date
}

export function nextShiftDate(value: string): string {
  const date = parseShiftDate(value)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function getShiftStartIndices(anchor: string, code: string, config: ShiftConfig): number[] {
  validateShiftConfig(config)
  const weekday = (parseShiftDate(anchor).getUTCDay() + 6) % 7
  return config.pattern.flatMap((item, index) =>
    item === code && (config.cycleLength % 7 !== 0 || index % 7 === weekday) ? [index] : [])
}

export function generateYearShifts(anchor: string, code: string, config: ShiftConfig, startIndex?: number): ShiftDay[] {
  const indices = getShiftStartIndices(anchor, code, config)
  // Like calcular-turnos, default to the first matching weekday and shift.
  const index = startIndex ?? indices[0]
  if (index === undefined || !indices.includes(index)) throw new Error('invalidAnchor')
  const anchorDate = parseShiftDate(anchor)
  const year = anchorDate.getUTCFullYear()
  if (year < 1900 || year > 2100) throw new Error('invalidDate')
  const days: ShiftDay[] = []
  const cursor = new Date(Date.UTC(year, 0, 1))
  while (cursor.getUTCFullYear() === year) {
    const offset = Math.round((cursor.getTime() - anchorDate.getTime()) / 86400000)
    const position = ((index + offset) % config.cycleLength + config.cycleLength) % config.cycleLength
    days.push({ date: cursor.toISOString().slice(0, 10), code: config.pattern[position]! })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}
