import { defineStore, type PiniaPluginContext } from 'pinia'
import { piniaPluginPersistedstate } from '#imports'

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

export const useExternalCalendarStore = defineStore('externalCalendar', {
    state: () => ({
        events: {} as Record<string, GoogleEvent[]>, // key: YYYY-MM-DD -> list of event objects
        calendars: [] as { id: string, summary: string }[],
        lastSync: null as number | null,
        isLoading: false,
        accessToken: null as string | null,
        tokenExpiresAt: null as number | null,
        refreshToken: null as string | null,
        abortController: null as AbortController | null
    }),
    actions: {
        async ensureAccessToken(prompt: 'consent' | '' = '', signal?: AbortSignal): Promise<string | null> {
            const settings = useSettingsStore()
            const config = useRuntimeConfig()
            const toast = useToast()

            const clientId = config.public.googleClientId || settings.googleClientId

            if (!clientId) {
                toast.add({ title: 'Configura el Google Client ID primer', color: 'warning' })
                return null
            }

            await this.loadGoogleScript()

            const now = Date.now()
            const isTokenFresh = this.accessToken && this.tokenExpiresAt && (this.tokenExpiresAt - 60_000) > now
            if (isTokenFresh && prompt !== 'consent') {
                return this.accessToken
            }

            if (this.refreshToken && prompt !== 'consent') {
                try {
                    const refreshed = await this.refreshAccessToken(clientId)
                    this.accessToken = refreshed.access_token
                    const expiresInSeconds = Number(refreshed.expires_in)
                    this.tokenExpiresAt = Number.isFinite(expiresInSeconds) ? Date.now() + expiresInSeconds * 1000 : null
                    return this.accessToken
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

                this.accessToken = tokenResponse.access_token
                const expiresInSeconds = Number(tokenResponse.expires_in)
                this.tokenExpiresAt = Number.isFinite(expiresInSeconds) ? Date.now() + expiresInSeconds * 1000 : null
                if (tokenResponse.refresh_token) {
                    this.refreshToken = tokenResponse.refresh_token
                }

                return this.accessToken
            } catch (error) {
                if (error instanceof Error && error.message === 'AbortError') {
                    throw error // Propagate abort up
                }
                console.error('Google Calendar auth error:', error)
                toast.add({ title: 'Error d\'autorització amb Google Calendar', color: 'error' })
                return null
            }
        },

        async refreshAccessToken(clientId: string) {
            if (!this.refreshToken) {
                throw new Error('Missing refresh token')
            }

            const params = new URLSearchParams({
                client_id: clientId,
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken
            })

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Refresh token exchange failed: ${errorText}`)
            }

            return response.json() as Promise<{ access_token: string, expires_in?: number }>
        },

        async loadGoogleScript(): Promise<void> {
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
        },

        async syncEvents(mode: 'events' | 'calendars' = 'events', targetDate?: Date): Promise<void> {
            if (this.isLoading) {
                // Already syncing, do nothing or cancel previous? 
                // Let's cancel previous to be safe if user spammed it
                this.cancelSync()
            }

            this.isLoading = true
            this.abortController = new AbortController()
            const signal = this.abortController.signal

            // Auto-timeout after 30 seconds
            const timeoutId = setTimeout(() => {
                if (this.isLoading && this.abortController) {
                    this.abortController.abort('Timeout')
                }
            }, 30000)

            try {
                const accessToken = await this.ensureAccessToken(this.accessToken ? '' : 'consent', signal)
                if (!accessToken) return

                if (signal.aborted) return

                const shouldFetchCalendars = mode === 'calendars' || this.calendars.length === 0

                if (shouldFetchCalendars) {
                    await this.fetchCalendars(accessToken, signal)
                }

                if (mode !== 'calendars') {
                    await this.fetchGoogleEvents(accessToken, targetDate, signal)
                }

            } catch (error: unknown) {
                const isAbort = (error instanceof Error && error.name === 'AbortError') || error === 'Timeout'
                if (isAbort) {
                    useToast().add({ title: 'Sincronització cancel·lada o temps d\'espera esgotat', color: 'info' })
                } else {
                    console.error('Google Calendar sync error:', error)
                    useToast().add({ title: 'Error al sincronitzar amb Google Calendar', color: 'error' })
                }
            } finally {
                clearTimeout(timeoutId)
                this.isLoading = false
                this.abortController = null
            }
        },

        getBackupSnapshot(): { events: Record<string, GoogleEvent[]>, calendars: { id: string, summary: string }[], lastSync: number | null, refreshToken: string | null } {
            return {
                events: this.events,
                calendars: this.calendars,
                lastSync: this.lastSync,
                refreshToken: this.refreshToken
            }
        },

        restoreFromBackup(snapshot: { events?: Record<string, GoogleEvent[]>, calendars?: { id: string, summary: string }[], lastSync?: number | null, refreshToken?: string | null }): void {
            if (snapshot.events) this.events = snapshot.events
            if (snapshot.calendars) this.calendars = snapshot.calendars
            if (typeof snapshot.lastSync !== 'undefined') this.lastSync = snapshot.lastSync
            if (typeof snapshot.refreshToken !== 'undefined') this.refreshToken = snapshot.refreshToken
        },

        cancelSync(): void {
            console.log('User cancelled sync')
            if (this.abortController) {
                this.abortController.abort()
            }
            this.isLoading = false
            this.abortController = null
            try {
                useToast().add({ title: 'Sincronització aturada', color: 'info' })
            } catch (e) {
                console.error('Toast error', e)
            }
        },

        async fetchCalendars(accessToken: string, signal?: AbortSignal): Promise<void> {
            const toast = useToast()
            try {
                const response = await fetch(
                    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        },
                        signal
                    }
                )

                if (!response.ok) throw new Error('Failed to fetch calendars')

                const data = await response.json()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.calendars = data.items.map((item: any) => ({
                    id: item.id,
                    summary: item.summaryOverride || item.summary
                }))

                toast.add({ title: 'Llista de calendaris actualitzada', color: 'success' })

            } catch (error: unknown) {
                if (error instanceof Error && error.name === 'AbortError') throw error
                console.error('Error fetching calendar list:', error)
                toast.add({ title: 'Error obtenint la llista de calendaris', color: 'error' })
            }
        },

        async fetchGoogleEvents(accessToken: string, targetDate: Date = new Date(), signal?: AbortSignal): Promise<void> {
            const settings = useSettingsStore()
            const toast = useToast()
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
                            'Authorization': `Bearer ${accessToken}`
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

                this.events = newEvents
                this.lastSync = Date.now()
                toast.add({ title: 'Calendari de Google sincronitzat', color: 'success' })


            } catch (error: unknown) {
                if (error instanceof Error && error.name === 'AbortError') throw error
                console.error('Error fetching events:', error)
                const msg = error instanceof Error ? error.message : 'Error desconegut'
                toast.add({ title: 'Error obtenint esdeveniments', description: msg.substring(0, 100), color: 'error' })
            }
        },

        hasEvent(dateStr: string): boolean {
            return !!this.events[dateStr] && this.events[dateStr].length > 0
        },

        getEventsForDate(dateStr: string): GoogleEvent[] {
            return this.events[dateStr] || []
        },

        disconnect(): void {
            const settings = useSettingsStore()
            this.events = {}
            this.calendars = []
            this.lastSync = null
            this.accessToken = null
            this.tokenExpiresAt = null
            this.refreshToken = null
            // Reset selected calendar preference
            settings.googleCalendarId = ''
            useToast().add({ title: 'Desconnectat de Google Calendar', color: 'info' })
        }
    },
    persist: {
        key: 'external-calendar-v2',
        storage: piniaPluginPersistedstate.localStorage(),
        paths: ['events', 'calendars', 'lastSync', 'refreshToken', 'accessToken', 'tokenExpiresAt'],
        afterRestore: (ctx: PiniaPluginContext) => {
            ctx.store.isLoading = false
            ctx.store.abortController = null
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
})
