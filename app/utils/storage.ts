export const createSafeStorage = () => {
    return {
        getItem: (key: string) => {
            if (typeof window === 'undefined') return null
            return window.localStorage.getItem(key)
        },
        setItem: (key: string, value: string) => {
            if (typeof window === 'undefined') return
            try {
                window.localStorage.setItem(key, value)
            } catch (e) {
                if (e instanceof DOMException &&
                    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
                ) {
                    const message = 'ATENCIÓ: No s\'ha pogut guardar la informació perquè el disc o la memòria del navegador està plena. Si us plau, allibera espai (esborrant dades antigues a Configuració) per evitar perdre dades.'

                    // Dispatch event for UI component to catch if needed
                    window.dispatchEvent(new CustomEvent('dietator:storage-error', {
                        detail: { message }
                    }))

                    // Last resort alert to ensure user sees it
                    window.alert(message)
                } else {
                    console.error('Error saving to localStorage', e)
                }
            }
        },
        removeItem: (key: string) => {
            if (typeof window === 'undefined') return
            window.localStorage.removeItem(key)
        },
        clear: () => {
            if (typeof window === 'undefined') return
            window.localStorage.clear()
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
