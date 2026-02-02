import { defineStore, type PiniaPluginContext } from 'pinia'

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        google: any;
    }
}

export interface GoogleEvent {
    id: string
    summary: string
    start: Date
    end: Date
    location?: string
    description?: string
    isAllDay: boolean
}

export const useExternalCalendarStore = defineStore('externalCalendar', () => {
    // State
    const events = ref<Record<string, GoogleEvent[]>>({})
    const calendars = ref<{ id: string, summary: string }[]>([])
    const lastSync = ref<number | null>(null)
    const isLoading = ref(false)
    const accessToken = ref<string | null>(null)
    const tokenExpiresAt = ref<number | null>(null)
    const refreshToken = ref<string | null>(null)
    const abortController = ref<AbortController | null>(null)

    // Composables
    const toast = useToast()
    const settings = useSettingsStore()
    const config = useRuntimeConfig()

    // Actions
    async function loadGoogleScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts?.oauth2) {
                resolve()
                return
            }
            const script = document.createElement('script')
            script.src = 'https://accounts.google.com/gsi/client'
            script.async = true
            script.defer = true
            script.onload = () => resolve()
            script.onerror = reject
            document.head.appendChild(script)
        })
    }

    async function refreshAccessToken(clientId: string, signal?: AbortSignal) {
        if (!refreshToken.value) {
            throw new Error('Missing refresh token')
        }

        const params = new URLSearchParams({
            client_id: clientId,
            grant_type: 'refresh_token',
            refresh_token: refreshToken.value
        })

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params,
            signal
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Refresh token exchange failed: ${errorText}`)
        }

        return response.json() as Promise<{ access_token: string, expires_in?: number }>
    }

    async function ensureAccessToken(prompt: 'consent' | '' = '', signal?: AbortSignal): Promise<string | null> {
        const clientId = config.public.googleClientId || settings.googleClientId

        if (!clientId) {
            toast.add({ title: 'Configura el Google Client ID primer', color: 'warning' })
            return null
        }

        await loadGoogleScript()

        const now = Date.now()
        const isTokenFresh = accessToken.value && tokenExpiresAt.value && (tokenExpiresAt.value - 60_000) > now
        if (isTokenFresh && prompt !== 'consent') {
            return accessToken.value
        }

        if (refreshToken.value && prompt !== 'consent') {
            try {
                const refreshed = await refreshAccessToken(clientId, signal)
                accessToken.value = refreshed.access_token
                const expiresInSeconds = Number(refreshed.expires_in)
                tokenExpiresAt.value = Number.isFinite(expiresInSeconds) ? Date.now() + expiresInSeconds * 1000 : null
                return accessToken.value
            } catch (error) {
                console.warn('Refresh token exchange failed, falling back to consent flow', error)
            }
        }

        try {
            const tokenResponse: { access_token: string, expires_in?: number, refresh_token?: string } = await new Promise((resolve, reject) => {
                if (signal?.aborted) {
                    return reject(new Error('AbortError'))
                }

                const abortHandler = () => {
                    reject(new Error('AbortError'))
                }
                signal?.addEventListener('abort', abortHandler)

                const tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: 'https://www.googleapis.com/auth/calendar.readonly',
                    prompt,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    callback: (response: any) => {
                        signal?.removeEventListener('abort', abortHandler)
                        if (response.error) {
                            reject(new Error(response.error))
                            return
                        }
                        resolve(response)
                    }
                })

                tokenClient.requestAccessToken()
            })

            accessToken.value = tokenResponse.access_token
            const expiresInSeconds = Number(tokenResponse.expires_in)
            tokenExpiresAt.value = Number.isFinite(expiresInSeconds) ? Date.now() + expiresInSeconds * 1000 : null
            if (tokenResponse.refresh_token) {
                refreshToken.value = tokenResponse.refresh_token
            }

            return accessToken.value
        } catch (error) {
            if (error instanceof Error && error.message === 'AbortError') {
                throw error // Propagate abort up
            }
            console.error('Google Calendar auth error:', error)
            toast.add({ title: 'Error d\'autorització amb Google Calendar', color: 'error' })
            return null
        }
    }

    async function fetchCalendars(token: string, signal?: AbortSignal): Promise<void> {
        try {
            const response = await fetch(
                'https://www.googleapis.com/calendar/v3/users/me/calendarList',
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    signal
                }
            )

            if (!response.ok) throw new Error('Failed to fetch calendars')

            const data = await response.json()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            calendars.value = data.items.map((item: any) => ({
                id: item.id,
                summary: item.summaryOverride || item.summary
            }))

            toast.add({ title: 'Llista de calendaris actualitzada', color: 'success' })

        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') throw error
            console.error('Error fetching calendar list:', error)
            toast.add({ title: 'Error obtenint la llista de calendaris', color: 'error' })
        }
    }

    async function fetchGoogleEvents(token: string, targetDate: Date = new Date(), signal?: AbortSignal): Promise<void> {
        try {
            // Determine time range: centered around targetDate (+/- 3 months)
            // This ensures if user is looking at a future/past date, we sync that range
            const timeMin = new Date(targetDate.getFullYear(), targetDate.getMonth() - 6, 1).toISOString()
            const timeMax = new Date(targetDate.getFullYear(), targetDate.getMonth() + 6, 1).toISOString()

            const calendarId = settings.googleCalendarId || 'primary'

            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=2500`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    signal
                }
            )

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`API Error ${response.status}: ${errorText}`)
            }

            const data = await response.json()
            const newEvents: Record<string, GoogleEvent[]> = {}

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.items.forEach((event: any) => {
                // Only care about start date
                const startRaw = event.start.dateTime || event.start.date
                const endRaw = event.end.dateTime || event.end.date

                if (startRaw) {
                    const start = new Date(startRaw)
                    const end = endRaw ? new Date(endRaw) : start
                    // Key for storage (YYYY-MM-DD)
                    const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`

                    if (!newEvents[dateStr]) {
                        newEvents[dateStr] = []
                    }

                    newEvents[dateStr].push({
                        id: event.id,
                        summary: event.summary || '(Sense títol)',
                        start,
                        end,
                        location: event.location,
                        description: event.description,
                        isAllDay: !!event.start.date
                    })
                }
            })

            events.value = newEvents
            lastSync.value = Date.now()
            toast.add({ title: 'Calendari de Google sincronitzat', color: 'success' })


        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') throw error
            console.error('Error fetching events:', error)
            const msg = error instanceof Error ? error.message : 'Error desconegut'
            toast.add({ title: 'Error obtenint esdeveniments', description: msg.substring(0, 100), color: 'error' })
        }
    }

    function cancelSync(): void {
        console.log('User cancelled sync')
        if (abortController.value) {
            abortController.value.abort()
        }
        isLoading.value = false
        abortController.value = null
        try {
            toast.add({ title: 'Sincronització aturada', color: 'info' })
        } catch (e) {
            console.error('Toast error', e)
        }
    }

    async function syncEvents(mode: 'events' | 'calendars' = 'events', targetDate?: Date): Promise<void> {
        if (isLoading.value) {
            // Already syncing, do nothing or cancel previous? 
            // Let's cancel previous to be safe if user spammed it
            cancelSync()
        }

        isLoading.value = true
        abortController.value = new AbortController()
        const signal = abortController.value.signal

        // Auto-timeout after 30 seconds
        const timeoutId = setTimeout(() => {
            if (isLoading.value && abortController.value) {
                abortController.value.abort('Timeout')
            }
        }, 30000)

        try {
            const token = await ensureAccessToken(accessToken.value ? '' : 'consent', signal)
            if (!token) return

            if (signal.aborted) return

            const shouldFetchCalendars = mode === 'calendars' || calendars.value.length === 0

            if (shouldFetchCalendars) {
                await fetchCalendars(token, signal)
            }

            if (mode !== 'calendars') {
                await fetchGoogleEvents(token, targetDate, signal)
            }

        } catch (error: unknown) {
            const isAbort = (error instanceof Error && error.name === 'AbortError') || error === 'Timeout'
            if (isAbort) {
                toast.add({ title: 'Sincronització cancel·lada o temps d\'espera esgotat', color: 'info' })
            } else {
                console.error('Google Calendar sync error:', error)
                toast.add({ title: 'Error al sincronitzar amb Google Calendar', color: 'error' })
            }
        } finally {
            clearTimeout(timeoutId)
            isLoading.value = false
            abortController.value = null
        }
    }

    function getBackupSnapshot(): { events: Record<string, GoogleEvent[]>, calendars: { id: string, summary: string }[], lastSync: number | null, refreshToken: string | null } {
        return {
            events: events.value,
            calendars: calendars.value,
            lastSync: lastSync.value,
            refreshToken: refreshToken.value
        }
    }

    function restoreFromBackup(snapshot: { events?: Record<string, GoogleEvent[]>, calendars?: { id: string, summary: string }[], lastSync?: number | null, refreshToken?: string | null }): void {
        if (snapshot.events) events.value = snapshot.events
        if (snapshot.calendars) calendars.value = snapshot.calendars
        if (typeof snapshot.lastSync !== 'undefined') lastSync.value = snapshot.lastSync
        if (typeof snapshot.refreshToken !== 'undefined') refreshToken.value = snapshot.refreshToken
    }

    function hasEvent(dateStr: string): boolean {
        return !!events.value[dateStr] && events.value[dateStr].length > 0
    }

    function getEventsForDate(dateStr: string): GoogleEvent[] {
        return events.value[dateStr] || []
    }

    function disconnect(): void {
        events.value = {}
        calendars.value = []
        lastSync.value = null
        accessToken.value = null
        tokenExpiresAt.value = null
        refreshToken.value = null
        // Reset selected calendar preference
        settings.googleCalendarId = ''
        toast.add({ title: 'Desconnectat de Google Calendar', color: 'info' })
    }

    return {
        // State
        events,
        calendars,
        lastSync,
        isLoading,
        accessToken,
        tokenExpiresAt,
        refreshToken,
        abortController,

        // Actions
        ensureAccessToken,
        refreshAccessToken,
        loadGoogleScript,
        syncEvents,
        getBackupSnapshot,
        restoreFromBackup,
        cancelSync,
        fetchCalendars,
        fetchGoogleEvents,
        hasEvent,
        getEventsForDate,
        disconnect
    }
}, {
    persist: {
        key: 'external-calendar-v2',
        storage: piniaPluginPersistedstate.localStorage(),
        paths: ['events', 'calendars', 'lastSync', 'refreshToken', 'accessToken', 'tokenExpiresAt'],
        afterRestore: (ctx: PiniaPluginContext) => {
            console.log('Validating state after restore...')
            ctx.store.isLoading = false
            ctx.store.abortController = null
            console.log('Forced isLoading to false in afterRestore')
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
})
