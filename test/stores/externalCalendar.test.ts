import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useExternalCalendarStore } from '../../app/stores/externalCalendar'
import { CALENDAR_READ_SCOPE, CALENDAR_EVENTS_SCOPE, CALENDAR_CREATE_SCOPE } from '../../app/utils/shiftCalendar'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useSettingsStore', () => ({ googleClientId: '', googleCalendarId: '' }))
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { googleClientId: 'test-client' } }))
  vi.stubGlobal('useToast', () => ({ add: vi.fn() }))
})
afterEach(() => vi.unstubAllGlobals())

function mockGoogle(grants: string[][]) {
  const client = vi.fn(options => ({
    requestAccessToken: () => options.callback({ access_token: 'test-token', expires_in: 3600, scope: grants.shift()?.join(' ') })
  }))
  vi.stubGlobal('window', { google: { accounts: { oauth2: { initTokenClient: client } } } })
  return client
}

describe('incremental Google Calendar permissions', () => {
  it('initializes from a Nuxt plugin without a component setup context', () => {
    // Use the real hook: the generic test shim hides the Vue I18n setup guard.
    vi.stubGlobal('useI18n', useI18n)
    expect(() => useExternalCalendarStore()).not.toThrow()
  })

  it('keeps ordinary synchronization read-only and reuses fresh tokens', async () => {
    const client = mockGoogle([[CALENDAR_READ_SCOPE]])
    const store = useExternalCalendarStore()
    expect(await store.ensureAccessToken()).toBe('test-token')
    expect(await store.ensureAccessToken()).toBe('test-token')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client.mock.calls[0]?.[0].scope).toBe(CALENDAR_READ_SCOPE)
  })

  it('requests consent for writing even when a fresh read-only token exists', async () => {
    const writeScopes = [CALENDAR_READ_SCOPE, CALENDAR_EVENTS_SCOPE]
    const client = mockGoogle([[CALENDAR_READ_SCOPE], writeScopes, [...writeScopes, CALENDAR_CREATE_SCOPE]])
    const store = useExternalCalendarStore()
    await store.ensureAccessToken()
    expect(await store.ensureAccessToken('', undefined, writeScopes)).toBe('test-token')
    expect(client.mock.calls[1]?.[0]).toMatchObject({ scope: writeScopes.join(' '), prompt: 'consent', include_granted_scopes: true })
    await store.ensureAccessToken('', undefined, [...writeScopes, CALENDAR_CREATE_SCOPE])
    expect(client).toHaveBeenCalledTimes(3)
  })

  it('does not proceed to writes if Google grants only the read scope', async () => {
    mockGoogle([[CALENDAR_READ_SCOPE]])
    const store = useExternalCalendarStore()
    expect(await store.ensureAccessToken('', undefined, [CALENDAR_READ_SCOPE, CALENDAR_EVENTS_SCOPE])).toBeNull()
    expect(store.accessToken).toBeNull()
  })
  it('preserves read-only refresh from a legacy backup without assuming write permission', async () => {
    const client = mockGoogle([[CALENDAR_READ_SCOPE, CALENDAR_EVENTS_SCOPE]])
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: 'refreshed', expires_in: 3600 })))
    vi.stubGlobal('fetch', fetcher)
    const store = useExternalCalendarStore()
    store.restoreFromBackup({ refreshToken: 'test-refresh' })
    expect(await store.ensureAccessToken()).toBe('refreshed')
    expect(client).not.toHaveBeenCalled()
    await store.ensureAccessToken('', undefined, [CALENDAR_READ_SCOPE, CALENDAR_EVENTS_SCOPE])
    expect(client).toHaveBeenCalledTimes(1)
  })

})
