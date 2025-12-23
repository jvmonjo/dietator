import { defineStore } from 'pinia'
import ICAL from 'ical.js'

export const useExternalCalendarStore = defineStore('externalCalendar', {
    state: () => ({
        events: {} as Record<string, boolean>, // key: YYYY-MM-DD
        lastSync: null as number | null,
        isLoading: false
    }),
    actions: {
        async syncEvents() {
            const settings = useSettingsStore()
            const toast = useToast()

            if (!settings.icalUrl) {
                toast.add({ title: 'Configura la URL del calendari iCal primer', color: 'warning' })
                return
            }

            this.isLoading = true
            try {
                const response = await fetch(settings.icalUrl)
                if (!response.ok) throw new Error('Error al descarregar el calendari')

                const iCalData = await response.text()
                const jcalData = ICAL.parse(iCalData)
                const comp = new ICAL.Component(jcalData)
                const vevents = comp.getAllSubcomponents('vevent')

                const newEvents: Record<string, boolean> = {}

                vevents.forEach(event => {
                    const dtstart = event.getFirstPropertyValue('dtstart') as ICAL.Time
                    if (dtstart) {
                        // Convert to JS Date to format consistently
                        const jsDate = dtstart.toJSDate()
                        // Format as YYYY-MM-DD
                        const dateStr = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`
                        newEvents[dateStr] = true
                    }
                })

                this.events = newEvents
                this.lastSync = Date.now()
                toast.add({ title: 'Calendari sincronitzat correctament', color: 'success' })

            } catch (error) {
                console.error('iCal sync error:', error)
                toast.add({ title: 'Error al sincronitzar el calendari. Comprova la URL i els permisos (CORS).', color: 'error' })
            } finally {
                this.isLoading = false
            }
        },

        hasEvent(dateStr: string): boolean {
            return !!this.events[dateStr]
        }
    },
    persist: {
        storage: piniaPluginPersistedstate.localStorage()
    }
})
