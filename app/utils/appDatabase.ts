import type { ExpenseRecord } from '~/stores/expenses'
import type { Displacement, ServiceRecord } from '~/stores/services'
import type { TemplateFile } from '~/stores/settings'
import type { GoogleEvent } from '~/stores/externalCalendar'

export interface AppSettingsSnapshot {
    halfDietPrice?: number
    fullDietPrice?: number
    monthlyTemplate?: TemplateFile | null
    serviceTemplate?: TemplateFile | null
    exportTemplates?: boolean
    googleMapsApiKey?: string
    firstName?: string
    lastName?: string
    nationalId?: string
    reminder?: {
        day: number
        time: string
        isRecurring: boolean
    }
    googleClientId?: string
    googleCalendarId?: string
    habitualRoute?: Displacement[]
}

export interface ExternalCalendarPersistenceSnapshot {
    events?: Record<string, GoogleEvent[]>
    calendars?: { id: string, summary: string }[]
    lastSync?: number | null
    refreshToken?: string | null
    accessToken?: string | null
    tokenExpiresAt?: number | null
}

export interface AppDatabaseState {
    services: ServiceRecord[]
    expenses: ExpenseRecord[]
    settings: AppSettingsSnapshot | null
    distancesCache: Record<string, number>
    externalCalendar: ExternalCalendarPersistenceSnapshot | null
}

export type UiPreferences = Record<string, boolean | string | number | null>

export interface AppDatabaseUsageStats {
    appStateBytes: number
    attachmentBytes: number
    attachmentCount: number
    totalBytes: number
    browserUsageBytes?: number
    browserQuotaBytes?: number
    legacyLocalStorageBytes: number
    legacyLocalStorageKeys: string[]
}

export const APP_DB_NAME = 'dietator'
export const APP_DB_VERSION = 2

export const APP_STORE_NAMES = {
    expenseAttachments: 'expenseAttachments',
    appState: 'appState'
} as const

export const APP_STATE_KEYS = {
    services: 'services',
    expenses: 'expenses',
    settings: 'settings',
    distances: 'distances',
    externalCalendar: 'externalCalendar',
    uiPreferences: 'uiPreferences',
    migrationVersion: 'migrationVersion'
} as const

const LOCAL_STORAGE_KEYS = {
    services: 'services',
    expenses: 'expenses',
    settings: 'settings',
    distances: 'distances',
    externalCalendar: 'external-calendar-v2'
} as const

const CURRENT_MIGRATION_VERSION = 1

const isIndexedDbAvailable = () => typeof indexedDB !== 'undefined'

let dbPromise: Promise<IDBDatabase> | null = null

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
    new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
    })

const jsonByteSize = (value: unknown): number => new Blob([JSON.stringify(value)]).size

const dataUrlByteSize = (dataUrl: string): number => {
    const commaIndex = dataUrl.indexOf(',')
    const base64 = commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1)
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

export const openAppDatabase = (): Promise<IDBDatabase> => {
    if (!isIndexedDbAvailable()) {
        return Promise.reject(new Error('IndexedDB is not available'))
    }

    dbPromise ??= new Promise((resolve, reject) => {
        const request = indexedDB.open(APP_DB_NAME, APP_DB_VERSION)

        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains(APP_STORE_NAMES.expenseAttachments)) {
                db.createObjectStore(APP_STORE_NAMES.expenseAttachments, { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains(APP_STORE_NAMES.appState)) {
                db.createObjectStore(APP_STORE_NAMES.appState, { keyPath: 'key' })
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
    })

    return dbPromise
}

export const runObjectStoreTransaction = async <T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
    const db = await openAppDatabase()
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    return requestToPromise(callback(store))
}

const getObjectStoreValues = async <T>(storeName: string): Promise<T[]> => {
    const result = await runObjectStoreTransaction(storeName, 'readonly', store => store.getAll())
    return result as T[]
}

const getAppStateValue = async <T>(key: string): Promise<T | null> => {
    const result = await runObjectStoreTransaction(APP_STORE_NAMES.appState, 'readonly', store => store.get(key))
    const record = result as { key: string, value: T } | undefined
    return record?.value ?? null
}

const toPlainValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const setAppStateValue = async <T>(key: string, value: T): Promise<void> => {
    await runObjectStoreTransaction(APP_STORE_NAMES.appState, 'readwrite', store => store.put({
        key,
        value: toPlainValue(value)
    }))
}

export const resetAppDatabaseConnection = () => {
    dbPromise = null
}

const parseLocalStorageJson = <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null
    const rawValue = window.localStorage.getItem(key)
    if (!rawValue) return null

    try {
        return JSON.parse(rawValue) as T
    } catch (error) {
        console.error(`Error parsing localStorage key ${key}`, error)
        return null
    }
}

const getLegacyState = <T>(key: string): T | null => {
    const parsed = parseLocalStorageJson<T | { state?: T }>(key)
    if (parsed && typeof parsed === 'object' && 'state' in parsed) {
        return parsed.state ?? null
    }
    return parsed as T | null
}

export const migrateLocalStorageToIndexedDb = async (): Promise<void> => {
    const migrationVersion = await getAppStateValue<number>(APP_STATE_KEYS.migrationVersion)
    if (migrationVersion && migrationVersion >= CURRENT_MIGRATION_VERSION) return

    const servicesState = getLegacyState<{ records?: ServiceRecord[] }>(LOCAL_STORAGE_KEYS.services)
    const expensesState = getLegacyState<{ expenses?: ExpenseRecord[] }>(LOCAL_STORAGE_KEYS.expenses)
    const settingsState = getLegacyState<AppSettingsSnapshot>(LOCAL_STORAGE_KEYS.settings)
    const distancesState = getLegacyState<{ cache?: Record<string, number> }>(LOCAL_STORAGE_KEYS.distances)
    const externalCalendarState = getLegacyState<ExternalCalendarPersistenceSnapshot>(LOCAL_STORAGE_KEYS.externalCalendar)

    if (servicesState?.records) await setServices(servicesState.records)
    if (expensesState?.expenses) await setExpenses(expensesState.expenses)
    if (settingsState) await setSettings(settingsState)
    if (distancesState?.cache) await setDistancesCache(distancesState.cache)
    if (externalCalendarState) await setExternalCalendar(externalCalendarState)

    await setAppStateValue(APP_STATE_KEYS.migrationVersion, CURRENT_MIGRATION_VERSION)
    clearLegacyLocalStorageData()
}

export const clearLegacyLocalStorageData = (): void => {
    if (typeof window === 'undefined') return
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => window.localStorage.removeItem(key))
}

const getLegacyLocalStorageStats = (): { bytes: number, keys: string[] } => {
    if (typeof window === 'undefined') return { bytes: 0, keys: [] }

    return Object.values(LOCAL_STORAGE_KEYS).reduce((stats, key) => {
        const value = window.localStorage.getItem(key)
        if (!value) return stats
        stats.keys.push(key)
        stats.bytes += new Blob([value]).size
        return stats
    }, { bytes: 0, keys: [] as string[] })
}

export const getServices = () => getAppStateValue<ServiceRecord[]>(APP_STATE_KEYS.services)
export const setServices = (records: ServiceRecord[]) => setAppStateValue(APP_STATE_KEYS.services, records)

export const getExpenses = () => getAppStateValue<ExpenseRecord[]>(APP_STATE_KEYS.expenses)
export const setExpenses = (expenses: ExpenseRecord[]) => setAppStateValue(APP_STATE_KEYS.expenses, expenses)

export const getSettings = () => getAppStateValue<AppSettingsSnapshot>(APP_STATE_KEYS.settings)
export const setSettings = (settings: AppSettingsSnapshot) => setAppStateValue(APP_STATE_KEYS.settings, settings)

export const getDistancesCache = () => getAppStateValue<Record<string, number>>(APP_STATE_KEYS.distances)
export const setDistancesCache = (cache: Record<string, number>) => setAppStateValue(APP_STATE_KEYS.distances, cache)

export const getExternalCalendar = () => getAppStateValue<ExternalCalendarPersistenceSnapshot>(APP_STATE_KEYS.externalCalendar)
export const setExternalCalendar = (snapshot: ExternalCalendarPersistenceSnapshot) =>
    setAppStateValue(APP_STATE_KEYS.externalCalendar, snapshot)

export const getAppDatabaseState = async (): Promise<AppDatabaseState> => ({
    services: await getServices() ?? [],
    expenses: await getExpenses() ?? [],
    settings: await getSettings(),
    distancesCache: await getDistancesCache() ?? {},
    externalCalendar: await getExternalCalendar()
})

export const getUiPreferences = () => getAppStateValue<UiPreferences>(APP_STATE_KEYS.uiPreferences)

export const getUiPreference = async <T extends boolean | string | number | null>(key: string): Promise<T | null> => {
    const preferences = await getUiPreferences() ?? {}
    return (preferences[key] as T | undefined) ?? null
}

export const setUiPreference = async (key: string, value: boolean | string | number | null): Promise<void> => {
    const preferences = await getUiPreferences() ?? {}
    preferences[key] = value
    await setAppStateValue(APP_STATE_KEYS.uiPreferences, preferences)
}

export const getAppDatabaseUsageStats = async (): Promise<AppDatabaseUsageStats> => {
    const [appStateRecords, attachmentRecords, storageEstimate] = await Promise.all([
        getObjectStoreValues(APP_STORE_NAMES.appState),
        getObjectStoreValues<{ dataUrl?: string, size?: number }>(APP_STORE_NAMES.expenseAttachments),
        typeof navigator !== 'undefined' && navigator.storage?.estimate
            ? navigator.storage.estimate().catch(() => null)
            : Promise.resolve(null)
    ])
    const legacyStats = getLegacyLocalStorageStats()
    const appStateBytes = jsonByteSize(appStateRecords)
    const attachmentBytes = attachmentRecords.reduce((total, attachment) => {
        if (typeof attachment.size === 'number') return total + attachment.size
        if (attachment.dataUrl) return total + dataUrlByteSize(attachment.dataUrl)
        return total
    }, 0)

    return {
        appStateBytes,
        attachmentBytes,
        attachmentCount: attachmentRecords.length,
        totalBytes: appStateBytes + attachmentBytes,
        browserUsageBytes: storageEstimate?.usage,
        browserQuotaBytes: storageEstimate?.quota,
        legacyLocalStorageBytes: legacyStats.bytes,
        legacyLocalStorageKeys: legacyStats.keys
    }
}
