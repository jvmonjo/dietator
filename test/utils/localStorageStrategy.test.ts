import { describe, expect, it } from 'vitest'
import {
    APPROXIMATE_LOCAL_STORAGE_LIMIT_BYTES,
    getRecommendedLocalDataStorageStrategy,
    localDataStorageStrategies
} from '~/utils/localStorageStrategy'

describe('local storage strategy plan', () => {
    it('documents the approximate 5 MB localStorage limit', () => {
        expect(APPROXIMATE_LOCAL_STORAGE_LIMIT_BYTES).toBe(5 * 1024 * 1024)
    })

    it('recommends keeping attachments in IndexedDB first', () => {
        expect(getRecommendedLocalDataStorageStrategy()?.id).toBe('indexeddb-attachments')
    })

    it('keeps both local-only alternatives available', () => {
        expect(localDataStorageStrategies.map(strategy => strategy.id)).toEqual([
            'indexeddb-attachments',
            'indexeddb-database'
        ])
    })
})
