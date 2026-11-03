import { afterEach, describe, expect, it, vi } from 'vitest'
import { createShiftCalendar, importShifts, listWritableCalendars } from '../../app/utils/shiftCalendar'

const days = [{ date: '2026-12-31', code: 'A' }, { date: '2027-01-01', code: 'V' }]
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('Google shift import', () => {
  it('paginates and offers only writable calendars', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ items: [{ id: 'read', accessRole: 'reader' }, { id: 'write', summary: 'Work', accessRole: 'writer' }], nextPageToken: 'next' }))
      .mockResolvedValueOnce(json({ items: [{ id: 'own', accessRole: 'owner' }] }))
    vi.stubGlobal('fetch', fetcher)
    expect((await listWritableCalendars('test')).map(item => item.id)).toEqual(['write', 'own'])
    expect(fetcher.mock.calls[1]?.[0]).toContain('pageToken=next')
  })

  it('creates a named calendar with the Madrid timezone and returns its ID', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ id: 'new-calendar' }))
    vi.stubGlobal('fetch', fetcher)
    expect(await createShiftCalendar('test', ' Work ')).toBe('new-calendar')
    expect(JSON.parse(fetcher.mock.calls[0]?.[1].body)).toEqual({ summary: 'Work', timeZone: 'Europe/Madrid' })
  })

  it('exports all-day shifts with exclusive next-day end and stable valid IDs', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({}))
    const progress = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    expect(await importShifts('test', 'user@example.com', days, progress)).toBe(2)
    expect(fetcher.mock.calls[0]?.[0]).toContain('user%40example.com')
    const event = JSON.parse(fetcher.mock.calls[0]?.[1].body)
    expect(event.start).toEqual({ date: '2026-12-31' })
    expect(event.end).toEqual({ date: '2027-01-01' })
    expect(event.id).toMatch(/^[0-9a-v]+$/)
    expect(progress).toHaveBeenLastCalledWith(2)
  })

  it('updates a previously imported day after a retry without creating duplicates', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({}, 409))
      .mockResolvedValueOnce(json({ extendedProperties: { private: { dietatorSource: 'shift-generator' } } }))
      .mockResolvedValueOnce(json({}))
    vi.stubGlobal('fetch', fetcher)
    expect(await importShifts('test', 'work', days.slice(0, 1))).toBe(1)
    expect(fetcher.mock.calls[2]?.[1].method).toBe('PATCH')
    expect(fetcher.mock.calls[2]?.[0]).toContain('/dietatorshift20261231')
  })

  it('does not overwrite unrelated calendar events on an ID conflict', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({}, 409)).mockResolvedValueOnce(json({ summary: 'Personal' }))
    vi.stubGlobal('fetch', fetcher)
    await expect(importShifts('test', 'work', days)).rejects.toMatchObject({ completed: 0, total: 2 })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('reports confirmed progress and destination when an import fails midway', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({})).mockResolvedValueOnce(json({}, 403))
    vi.stubGlobal('fetch', fetcher)
    await expect(importShifts('test', 'work', days)).rejects.toMatchObject({ completed: 1, total: 2, calendarId: 'work' })
  })
  it('backs off on rate limits before retrying the same deterministic event', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn().mockResolvedValueOnce(json({}, 429)).mockResolvedValueOnce(json({}))
    vi.stubGlobal('fetch', fetcher)
    const result = importShifts('test', 'work', days.slice(0, 1))
    await vi.runAllTimersAsync()
    expect(await result).toBe(1)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[0]?.[1].body).toBe(fetcher.mock.calls[1]?.[1].body)
  })

})
