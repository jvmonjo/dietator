import { describe, expect, it } from 'vitest'
import { useServiceWarnings } from '../../app/composables/useServiceWarnings'
import type { Displacement } from '../../app/stores/services'

// `useI18n` is shimmed in test/setup.ts to return the key verbatim, so warning
// messages equal stable i18n keys.
//
// Timestamps are UTC ISO strings (with `Z`) — the shape the app actually stores
// (see app/utils/datetime.ts `ensureUtc`). The warning rules read *local*
// wall-clock fields (getHours/getMinutes/toDateString), so the suite pins
// TZ=Europe/Madrid (CET = UTC+1 in winter, CEST = UTC+2 in summer) to stay
// deterministic *and* to exercise the UTC -> local conversion. Each case notes
// its local equivalent in a comment.

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
    // 07:00Z–17:00Z = 08:00–18:00 local (CET)
    const messages = messagesFor('2026-01-10T07:00:00Z', '2026-01-10T17:00:00Z', [disp()])
    expect(messages).toContain('warnings.no_meals_claimed')
  })

  it('produces no warnings for a well-formed full-day service', () => {
    // 07:00Z–22:00Z = 08:00–23:00 local (CET)
    const messages = messagesFor('2026-01-10T07:00:00Z', '2026-01-10T22:00:00Z', [
      disp({ hasLunch: true, hasDinner: true })
    ])
    expect(messages).toEqual([])
  })

  it('warns about a service longer than 24h', () => {
    // 07:00Z Jan 10 – 09:00Z Jan 11 = 26h (08:00 Jan 10 – 10:00 Jan 11 local)
    const messages = messagesFor('2026-01-10T07:00:00Z', '2026-01-11T09:00:00Z', [
      disp({ hasDinner: true })
    ])
    expect(messages).toContain('warnings.duration_over_24h')
  })

  it('warns when a lunch is claimed but the service ends before 15:30', () => {
    // 07:00Z–13:00Z = 08:00–14:00 local
    const messages = messagesFor('2026-01-10T07:00:00Z', '2026-01-10T13:00:00Z', [
      disp({ hasLunch: true })
    ])
    expect(messages).toEqual(['warnings.check_lunch_right'])
  })

  it('warns when a dinner is claimed but the service ends before 22:30', () => {
    // 07:00Z–20:00Z = 08:00–21:00 local
    const messages = messagesFor('2026-01-10T07:00:00Z', '2026-01-10T20:00:00Z', [
      disp({ hasDinner: true })
    ])
    expect(messages).toEqual(['warnings.check_dinner_right'])
  })

  it('warns about a late/overnight finish with no dinner claimed', () => {
    // 19:00Z Jan 10 – 01:00Z Jan 11 = 20:00 Jan 10 – 02:00 Jan 11 local
    const messages = messagesFor('2026-01-10T19:00:00Z', '2026-01-11T01:00:00Z', [
      disp({ hasLunch: true })
    ])
    expect(messages).toContain('warnings.late_finish_no_dinner')
    // Starting after 16:00 with a lunch claim also trips its own warning.
    expect(messages).toContain('warnings.start_after_16_lunch')
  })

  it('warns when a lunch is claimed but the service starts after 16:00', () => {
    // 16:00Z–22:30Z = 17:00–23:30 local
    const messages = messagesFor('2026-01-10T16:00:00Z', '2026-01-10T22:30:00Z', [
      disp({ hasLunch: true, hasDinner: true })
    ])
    expect(messages).toEqual(['warnings.start_after_16_lunch'])
  })

  // --- Timezone / near-midnight edge cases --------------------------------
  // These would behave differently (and wrongly) if the rules were evaluated
  // in UTC instead of the user's local time.

  it('applies the 22:30 threshold in local time, not UTC (summer, CEST)', () => {
    // 18:00Z–21:00Z in summer = 20:00–23:00 local. 23:00 local is past 22:30,
    // so a missing dinner trips the late-finish warning — even though 21:00 in
    // UTC would be *before* the threshold and would not.
    const messages = messagesFor('2026-06-10T18:00:00Z', '2026-06-10T21:00:00Z', [
      disp({ hasLunch: true })
    ])
    expect(messages).toContain('warnings.late_finish_no_dinner')
  })

  it('treats a finish past local midnight as a different day (near-midnight, CEST)', () => {
    // 20:00Z–22:15Z Jun 10 = 22:00 Jun 10 – 00:15 Jun 11 local. The end is the
    // next *local* day, so the service counts as a late/overnight finish with
    // no dinner. Judged in UTC it would be the same day and 22:15 (< 22:30),
    // so no late-finish warning would fire.
    const messages = messagesFor('2026-06-10T20:00:00Z', '2026-06-10T22:15:00Z', [
      disp({ hasLunch: true })
    ])
    expect(messages).toContain('warnings.late_finish_no_dinner')
    // ...and it must NOT be treated as a same-day early finish.
    expect(messages).not.toContain('warnings.check_dinner_right')
  })
})
