import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateGoogleCalendarUrl,
  generateIcsFile
} from '../../app/utils/calendarGenerator'
import type { CalendarConfig } from '../../app/stores/settings'

const baseConfig: CalendarConfig = { day: 5, time: '09:30', isRecurring: true }

const readBlob = async (blob: Blob) => await blob.text()

describe('calendarGenerator', () => {
  beforeEach(() => {
    // Freeze "now" so the next-occurrence calculation is deterministic.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateGoogleCalendarUrl', () => {
    it('builds a Google Calendar template URL with the event details', () => {
      const url = generateGoogleCalendarUrl(baseConfig)
      const parsed = new URL(url)

      expect(parsed.origin + parsed.pathname).toBe('https://calendar.google.com/calendar/render')
      expect(parsed.searchParams.get('action')).toBe('TEMPLATE')
      expect(parsed.searchParams.get('text')).toBe('Dietator: Generar documents')
      expect(parsed.searchParams.get('dates')).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/)
    })

    it('adds a monthly recurrence rule only when recurring', () => {
      const recurring = new URL(generateGoogleCalendarUrl(baseConfig))
      expect(recurring.searchParams.get('recur')).toBe('RRULE:FREQ=MONTHLY')

      const oneOff = new URL(generateGoogleCalendarUrl({ ...baseConfig, isRecurring: false }))
      expect(oneOff.searchParams.has('recur')).toBe(false)
    })

    it('schedules a 30 minute event', () => {
      const parsed = new URL(generateGoogleCalendarUrl(baseConfig))
      const [start, end] = parsed.searchParams.get('dates')!.split('/')
      const toDate = (s: string) =>
        new Date(s.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'))

      expect(toDate(end!).getTime() - toDate(start!).getTime()).toBe(30 * 60 * 1000)
    })
  })

  describe('generateIcsFile', () => {
    it('produces a valid VCALENDAR/VEVENT body', async () => {
      const blob = generateIcsFile(baseConfig)
      expect(blob.type).toContain('text/calendar')

      const text = await readBlob(blob)
      expect(text).toContain('BEGIN:VCALENDAR')
      expect(text).toContain('BEGIN:VEVENT')
      expect(text).toContain('SUMMARY:Dietator: Generar documents')
      expect(text).toContain('RRULE:FREQ=MONTHLY')
      expect(text).toContain('END:VEVENT')
      expect(text).toContain('END:VCALENDAR')
      // CRLF line endings as required by the iCalendar spec.
      expect(text).toContain('\r\n')
    })

    it('omits the recurrence rule for one-off reminders', async () => {
      const text = await readBlob(generateIcsFile({ ...baseConfig, isRecurring: false }))
      expect(text).not.toContain('RRULE')
    })
  })
})
