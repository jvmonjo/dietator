import { defineStore } from 'pinia'
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
        isLoading: false
    }),
    actions: {
        // ... (loadGoogleScript and syncEvents remain same)
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

        async syncEvents(mode: 'events' | 'calendars' = 'events') {
            const settings = useSettingsStore()
            const config = useRuntimeConfig()
            const toast = useToast()

            const clientId = config.public.googleClientId || settings.googleClientId

            if (!clientId) {
                toast.add({ title: 'Configura el Google Client ID primer', color: 'warning' })
                return
            }

            this.isLoading = true

            try {
                await this.loadGoogleScript()

                const tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: 'https://www.googleapis.com/auth/calendar.readonly',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    callback: async (tokenResponse: any) => {
                        if (tokenResponse.error) {
                            throw new Error(tokenResponse.error)
                        }
                        if (mode === 'calendars') {
                            await this.fetchCalendars(tokenResponse.access_token)
                        } else {
                            await this.fetchGoogleEvents(tokenResponse.access_token)
                        }
                    },
                })

                // Request access token (triggers popup)
                tokenClient.requestAccessToken()

            } catch (error) {
                console.error('Google Calendar sync error:', error)
                toast.add({ title: 'Error al sincronitzar amb Google Calendar', color: 'error' })
                this.isLoading = false
            }
        },

        async fetchCalendars(accessToken: string) {
            const toast = useToast()
            try {
                const response = await fetch(
                    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
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

            } catch (error) {
                console.error('Error fetching calendar list:', error)
                toast.add({ title: 'Error obtenint la llista de calendaris', color: 'error' })
            } finally {
                this.isLoading = false
            }
        },

        async fetchGoogleEvents(accessToken: string) {
            const settings = useSettingsStore()
            const toast = useToast()
            try {
                // Determine time range: From 1 month ago to 3 months ahead
                const now = new Date()
                const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
                const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString()

                const calendarId = settings.googleCalendarId || 'primary'

                const response = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=2500`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
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

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                console.error('Error fetching events:', error)
                const msg = error?.message || 'Error desconegut'
                toast.add({ title: 'Error obtenint esdeveniments', description: msg.substring(0, 100), color: 'error' })
            } finally {
                this.isLoading = false
            }
        },

        hasEvent(dateStr: string): boolean {
            return !!this.events[dateStr] && this.events[dateStr].length > 0
        },

        getEventsForDate(dateStr: string): GoogleEvent[] {
            return this.events[dateStr] || []
        },

        disconnect() {
            const settings = useSettingsStore()
            this.events = {}
            this.calendars = []
            this.lastSync = null
            // Reset selected calendar preference
            settings.googleCalendarId = ''
            useToast().add({ title: 'Desconnectat de Google Calendar', color: 'info' })
        }
    },
    persist: {
        key: 'external-calendar-v2',
        storage: piniaPluginPersistedstate.localStorage()
    }
})
