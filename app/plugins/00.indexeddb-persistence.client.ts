import {
    getDistancesCache,
    getExpenses,
    getExternalCalendar,
    getServices,
    getSettings,
    migrateLocalStorageToIndexedDb,
    setDistancesCache,
    setExpenses,
    setExternalCalendar,
    setServices,
    setSettings
} from '~/utils/appDatabase'

export default defineNuxtPlugin(async () => {
    try {
        await migrateLocalStorageToIndexedDb()

        const serviceStore = useServiceStore()
        const expenseStore = useExpenseStore()
        const settingsStore = useSettingsStore()
        const distancesStore = useDistancesStore()
        const externalCalendarStore = useExternalCalendarStore()

        const [services, expenses, settings, distancesCache, externalCalendar] = await Promise.all([
            getServices(),
            getExpenses(),
            getSettings(),
            getDistancesCache(),
            getExternalCalendar()
        ])

        if (services) serviceStore.records = services
        if (expenses) expenseStore.expenses = expenses
        if (settings) settingsStore.$patch(settings)
        if (distancesCache) distancesStore.cache = distancesCache
        if (expenses) {
            void expenseStore.hydrateTicketAttachments().catch((error) => {
                console.error('Error hydrating expense attachments', error)
            })
        }

        if (externalCalendar) {
            externalCalendarStore.events = externalCalendar.events ?? {}
            externalCalendarStore.calendars = externalCalendar.calendars ?? []
            externalCalendarStore.lastSync = externalCalendar.lastSync ?? null
            externalCalendarStore.refreshToken = externalCalendar.refreshToken ?? null
            externalCalendarStore.accessToken = externalCalendar.accessToken ?? null
            externalCalendarStore.tokenExpiresAt = externalCalendar.tokenExpiresAt ?? null
            externalCalendarStore.isLoading = false
            externalCalendarStore.abortController = null
        }

        watch(() => serviceStore.records, records => {
            void setServices(records)
        }, { deep: true })

        watch(() => expenseStore.expenses, expenses => {
            void setExpenses(expenses.map(({ ticket: _ticket, ...expense }) => expense))
        }, { deep: true })

        watch(() => settingsStore.$state, state => {
            void setSettings(state)
        }, { deep: true })

        watch(() => distancesStore.cache, cache => {
            void setDistancesCache(cache)
        }, { deep: true })

        watch(() => ({
            events: externalCalendarStore.events,
            calendars: externalCalendarStore.calendars,
            lastSync: externalCalendarStore.lastSync,
            refreshToken: externalCalendarStore.refreshToken,
            accessToken: externalCalendarStore.accessToken,
            tokenExpiresAt: externalCalendarStore.tokenExpiresAt
        }), snapshot => {
            void setExternalCalendar(snapshot)
        }, { deep: true })
    } catch (error) {
        console.error('Error initialising IndexedDB persistence', error)
    }
})
