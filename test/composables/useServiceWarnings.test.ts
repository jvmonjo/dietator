import { describe, expect, it } from 'vitest'
import { useServiceWarnings } from '../../app/composables/useServiceWarnings'
import type { Displacement } from '../../app/stores/services'

// `useI18n` is shimmed in test/setup.ts to return the key verbatim, so warning
// messages equal stable i18n keys. Dates use local-time ISO strings (no `Z`)
// so the hour-of-day rules are evaluated independently of the CI timezone.

const disp = (over: Partial<Displacement> = {}): Displacement => ({
  id: over.id ?? 'd1',
  province: over.province ?? 'Barcelona',
  municipality: over.municipality ?? 'Manresa',
  hasLunch: over.hasLunch ?? false,
  hasDinner: over.hasDinner ?? false
})

const messagesFor = (start: string, end: string, displacements: Displacement[]) =>
  useServiceWarnings()
    .getServiceWarnings(start, end, displacements)
    .map(w => w.message)

describe('useServiceWarnings', () => {
  it('returns no warnings when start or end time is missing', () => {
    expect(messagesFor('', '', [disp({ hasLunch: true })])).toEqual([])
  })

  it('returns no warnings when the dates are unparseable', () => {
    expect(messagesFor('not-a-date', 'also-bad', [disp({ hasLunch: true })])).toEqual([])
  })

  it('warns when no meals are claimed', () => {
    const messages = messagesFor('2026-01-10T08:00:00', '2026-01-10T18:00:00', [disp()])
    expect(messages).toContain('warnings.no_meals_claimed')
  })

  it('produces no warnings for a well-formed full-day service', () => {
    const messages = messagesFor('2026-01-10T08:00:00', '2026-01-10T23:00:00', [
      disp({ hasLunch: true, hasDinner: true })
    ])
    expect(messages).toEqual([])
  })

  it('warns about a service longer than 24h', () => {
    const messages = messagesFor('2026-01-10T08:00:00', '2026-01-11T10:00:00', [
      disp({ hasDinner: true })
    ])
    expect(messages).toContain('warnings.duration_over_24h')
  })

  it('warns when a lunch is claimed but the service ends before 15:30', () => {
    const messages = messagesFor('2026-01-10T08:00:00', '2026-01-10T14:00:00', [
      disp({ hasLunch: true })
    ])
    expect(messages).toEqual(['warnings.check_lunch_right'])
  })

  it('warns when a dinner is claimed but the service ends before 22:30', () => {
    const messages = messagesFor('2026-01-10T08:00:00', '2026-01-10T21:00:00', [
      disp({ hasDinner: true })
    ])
    expect(messages).toEqual(['warnings.check_dinner_right'])
  })

  it('warns about a late/overnight finish with no dinner claimed', () => {
    const messages = messagesFor('2026-01-10T20:00:00', '2026-01-11T02:00:00', [
      disp({ hasLunch: true })
    ])
    expect(messages).toContain('warnings.late_finish_no_dinner')
    // Starting after 16:00 with a lunch claim also trips its own warning.
    expect(messages).toContain('warnings.start_after_16_lunch')
  })

  it('warns when a lunch is claimed but the service starts after 16:00', () => {
    const messages = messagesFor('2026-01-10T17:00:00', '2026-01-10T23:30:00', [
      disp({ hasLunch: true, hasDinner: true })
    ])
    expect(messages).toEqual(['warnings.start_after_16_lunch'])
  })
})
