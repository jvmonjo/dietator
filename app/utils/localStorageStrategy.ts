export const APPROXIMATE_LOCAL_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024

export type LocalDataStorageStrategyId = 'indexeddb-attachments' | 'indexeddb-database'

export interface LocalDataStorageStrategy {
    id: LocalDataStorageStrategyId
    titleKey: string
    descriptionKey: string
    recommended: boolean
}

export const localDataStorageStrategies: LocalDataStorageStrategy[] = [
    {
        id: 'indexeddb-attachments',
        titleKey: 'settings.maintenance.storage_strategy.attachments_title',
        descriptionKey: 'settings.maintenance.storage_strategy.attachments_description',
        recommended: true
    },
    {
        id: 'indexeddb-database',
        titleKey: 'settings.maintenance.storage_strategy.database_title',
        descriptionKey: 'settings.maintenance.storage_strategy.database_description',
        recommended: false
    }
]

export const getRecommendedLocalDataStorageStrategy = () => {
    return localDataStorageStrategies.find(strategy => strategy.recommended) ?? localDataStorageStrategies[0]
}
