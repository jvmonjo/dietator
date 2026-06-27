import { describe, expect, it } from 'vitest'
import { APPROXIMATE_LOCAL_STORAGE_LIMIT_BYTES } from '~/utils/localStorageStrategy'

describe('local storage strategy plan', () => {
    it('documents the approximate 5 MB localStorage limit', () => {
        expect(APPROXIMATE_LOCAL_STORAGE_LIMIT_BYTES).toBe(5 * 1024 * 1024)
    })

})
