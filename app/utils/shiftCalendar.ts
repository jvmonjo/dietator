import { nextShiftDate, type ShiftDay } from './shiftGenerator'

export const CALENDAR_READ_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
export const CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
export const CALENDAR_CREATE_SCOPE = 'https://www.googleapis.com/auth/calendar.calendars'
const API = 'https://www.googleapis.com/calendar/v3'

export interface WritableCalendar {
  id: string
  summary: string
  accessRole: string
}

export class ShiftImportError extends Error {
  constructor(public completed: number, public total: number, public calendarId: string) {
    super('importFailed')
  }
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function listWritableCalendars(token: string): Promise<WritableCalendar[]> {
  const calendars: WritableCalendar[] = []
  let pageToken = ''
  do {
    const query = new URLSearchParams({ minAccessRole: 'writer', maxResults: '250' })
    if (pageToken) query.set('pageToken', pageToken)
    const response = await fetch(`${API}/users/me/calendarList?${query}`, { headers: headers(token) })
    if (!response.ok) throw new Error('calendarListFailed')
    const data = await response.json() as { items?: WritableCalendar[], nextPageToken?: string }
    calendars.push(...(data.items ?? []).filter(item => ['writer', 'owner'].includes(item.accessRole)))
    pageToken = data.nextPageToken ?? ''
  } while (pageToken)
  return calendars
}

export async function createShiftCalendar(token: string, name: string): Promise<string> {
  if (!name.trim()) throw new Error('calendarNameRequired')
  const response = await fetch(`${API}/calendars`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ summary: name.trim(), timeZone: 'Europe/Madrid' })
  })
  if (!response.ok) throw new Error('calendarCreateFailed')
  const data = await response.json() as { id: string }
  return data.id
}

async function requestShiftEvent(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) })
    let rateLimited = response.status === 429
    if (response.status === 403) {
      const data = await response.clone().json().catch(() => null)
      rateLimited = data?.error?.errors?.some((error: { reason?: string }) =>
        ['rateLimitExceeded', 'userRateLimitExceeded'].includes(error.reason || '')) ?? false
    }
    if (attempt >= 4 || (!rateLimited && response.status < 500)) return response
    await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt))
  }
}

export async function importShifts(token: string, calendarId: string, days: ShiftDay[], onProgress?: (completed: number) => void): Promise<number> {
  let completed = 0
  const endpoint = `${API}/calendars/${encodeURIComponent(calendarId)}/events`
  try {
    for (const day of days) {
      // Google event IDs allow only base32hex characters. Keep one shift per date
      // and calendar, so retries after interrupted imports do not duplicate events.
      const id = `dietatorshift${day.date.replaceAll('-', '')}`
      const event = {
        id, summary: day.code,
        start: { date: day.date }, end: { date: nextShiftDate(day.date) },
        transparency: 'transparent',
        extendedProperties: { private: { dietatorSource: 'shift-generator' } }
      }
      const response = await requestShiftEvent(endpoint, {
        method: 'POST', headers: headers(token), body: JSON.stringify(event)
      })
      if (response.status === 409) {
        // Never replace an event unless its private marker identifies it as ours.
        const existing = await requestShiftEvent(`${endpoint}/${id}`, { headers: headers(token) })
        if (!existing.ok) throw new Error('eventReadFailed')
        const previous = await existing.json()
        if (previous.extendedProperties?.private?.dietatorSource !== 'shift-generator') throw new Error('eventConflict')
        const updated = await requestShiftEvent(`${endpoint}/${id}`, {
          method: 'PATCH', headers: headers(token), body: JSON.stringify(event)
        })
        if (!updated.ok) throw new Error('eventUpdateFailed')
      } else if (!response.ok) {
        throw new Error('eventCreateFailed')
      }
      completed++
      onProgress?.(completed)
    }
  } catch {
    throw new ShiftImportError(completed, days.length, calendarId)
  }
  return completed
}
