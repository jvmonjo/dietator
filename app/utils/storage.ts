const quotaErrorNames = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'])

const lastFailedWrites = new Map<string, string>()

export const isStorageQuotaError = (error: unknown): error is DOMException => {
    return error instanceof DOMException && quotaErrorNames.has(error.name)
}

export const wasLastStorageWriteSuccessful = (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return true
    if (lastFailedWrites.get(key) === value) return false
    return window.localStorage.getItem(key) === value
}

export const createSafeStorage = (options: { silent?: boolean } = {}) => {
    return {
        getItem: (key: string) => {
            if (typeof window === 'undefined') return null
            return window.localStorage.getItem(key)
        },
        setItem: (key: string, value: string) => {
            if (typeof window === 'undefined') return
            try {
                window.localStorage.setItem(key, value)
                lastFailedWrites.delete(key)
            } catch (e) {
                if (isStorageQuotaError(e)) {
                    // Some browsers can surface quota errors even when the value
                    // is already present. Treat that case as a successful write so
                    // users are not warned after their data was actually saved.
                    if (window.localStorage.getItem(key) === value) {
                        lastFailedWrites.delete(key)
                        return
                    }

                    lastFailedWrites.set(key, value)
                    const message = 'ATENCIÓ: No s\'ha pogut guardar la informació perquè el disc o la memòria del navegador està plena. Si us plau, allibera espai (esborrant dades antigues a Configuració) per evitar perdre dades.'

                    if (!options.silent) {
                        // Dispatch event for UI component to catch if needed
                        window.dispatchEvent(new CustomEvent('dietator:storage-error', {
                            detail: { message }
                        }))

                        // Last resort alert to ensure user sees it
                        window.alert(message)
                    }
                } else {
                    console.error('Error saving to localStorage', e)
                }
            }
        },
        removeItem: (key: string) => {
            if (typeof window === 'undefined') return
            window.localStorage.removeItem(key)
            lastFailedWrites.delete(key)
        },
        clear: () => {
            if (typeof window === 'undefined') return
            window.localStorage.clear()
            lastFailedWrites.clear()
        },
        key: (index: number) => {
            if (typeof window === 'undefined') return null
            return window.localStorage.key(index)
        },
        get length() {
            if (typeof window === 'undefined') return 0
            return window.localStorage.length
        }
    }
}
