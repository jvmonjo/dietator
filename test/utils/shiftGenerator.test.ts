import { describe, expect, it } from 'vitest'
import { DEFAULT_SHIFT_CONFIG, generateYearShifts, getShiftStartIndices, nextShiftDate } from '../../app/utils/shiftGenerator'

const config = DEFAULT_SHIFT_CONFIG

describe('shift generation from calcular-turnos', () => {
  it('reproduces the full 28-day pattern starting on Monday and wraps both ways', () => {
    const days = generateYearShifts('2026-01-05', 'A', config)
    expect(days).toHaveLength(365)
    expect(days.slice(4, 32).map(day => day.code)).toEqual(config.pattern)
    expect(days[3]).toEqual({ date: '2026-01-04', code: 'L' })
    expect(days[32]).toEqual({ date: '2026-02-02', code: 'A' })
  })

  it('covers leap years and DST dates with no skipped or repeated calendar days', () => {
    const days = generateYearShifts('2024-01-01', 'A', config)
    expect(days).toHaveLength(366)
    expect(days[59]?.date).toBe('2024-02-29')
    expect(new Set(days.map(day => day.date)).size).toBe(366)
    expect(days.at(-1)?.date).toBe('2024-12-31')
    for (let i = 1; i < days.length; i++) expect(days[i]?.date).toBe(nextShiftDate(days[i - 1]!.date))
    expect(nextShiftDate('2026-12-31')).toBe('2027-01-01')
  })

  it('preserves first-match behavior and lets users disambiguate cycle weeks', () => {
    const indices = getShiftStartIndices('2026-01-04', 'L', config)
    expect(indices).toEqual([13, 27])
    expect(generateYearShifts('2026-01-04', 'L', config)[4]?.code).toBe('V')
    expect(generateYearShifts('2026-01-04', 'L', config, 27)[4]?.code).toBe('A')
  })

  it('supports custom cycles without weekday alignment', () => {
    const custom = { cycleLength: 3, codes: ['M', 'N', 'L'], pattern: ['M', 'N', 'L'] }
    expect(generateYearShifts('2026-01-02', 'N', custom).slice(0, 4).map(day => day.code)).toEqual(['M', 'N', 'L', 'M'])
  })

  it('rejects invalid dates, impossible anchors and malformed patterns', () => {
    expect(() => generateYearShifts('2026-02-30', 'A', config)).toThrow('invalidDate')
    expect(() => generateYearShifts('2026-01-05', 'X', config)).toThrow('invalidAnchor')
    expect(() => generateYearShifts('2026-01-05', 'A', config, 14)).toThrow('invalidAnchor')
    expect(() => generateYearShifts('2026-01-05', 'A', { ...config, cycleLength: 27 })).toThrow('invalidConfig')
    expect(() => generateYearShifts('2026-01-05', 'A', { ...config, codes: ['A'] })).toThrow('invalidConfig')
  })
})
