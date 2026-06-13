// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSafeStorage } from '../../app/utils/storage'

describe('createSafeStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads, writes and removes items via localStorage', () => {
    const storage = createSafeStorage()

    storage.setItem('foo', 'bar')
    expect(storage.getItem('foo')).toBe('bar')
    expect(window.localStorage.getItem('foo')).toBe('bar')

    storage.removeItem('foo')
    expect(storage.getItem('foo')).toBeNull()
  })

  it('reports length and exposes keys', () => {
    const storage = createSafeStorage()
    storage.setItem('a', '1')
    storage.setItem('b', '2')

    expect(storage.length).toBe(2)
    expect(storage.key(0)).not.toBeNull()
  })

  it('clears all entries', () => {
    const storage = createSafeStorage()
    storage.setItem('a', '1')
    storage.clear()
    expect(storage.length).toBe(0)
  })

  it('surfaces a quota error event and alert instead of throwing', () => {
    const storage = createSafeStorage()

    const quotaError = new DOMException('full', 'QuotaExceededError')
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw quotaError
    })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    expect(() => storage.setItem('x', 'y')).not.toThrow()
    expect(alertSpy).toHaveBeenCalledOnce()
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'dietator:storage-error' })
    )
  })

  it('logs non-quota errors without alerting', () => {
    const storage = createSafeStorage()
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('boom')
    })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => storage.setItem('x', 'y')).not.toThrow()
    expect(alertSpy).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })
})
