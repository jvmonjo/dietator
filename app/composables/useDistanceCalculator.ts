import { storeToRefs } from 'pinia'
import { type LoaderOptions } from '@googlemaps/js-api-loader'
// We need to dynamic import the package because it might not be fully compatible with SSR imports directly if we used `import { Loader }` which was removed.
// However, standard import should expose the functions.
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

let isConfigured = false

const loadGoogleMapsManual = async (apiKey: string): Promise<void> => {
    if (typeof window === 'undefined') {
        throw new Error('Google Maps only available on client-side')
    }

    if (!isConfigured) {
        setOptions({
            key: apiKey,
            v: 'weekly',
            libraries: ['places', 'routes'],
            region: 'ES', // Bias results to Spain
            language: 'ca' // Prefer Catalan/local names
        })
        isConfigured = true
    }

    // We make sure the libraries are loaded. 
    // DistanceMatrixService is in 'routes' (usually) or core 'maps'.
    // But getting 'routes' is the safe bet for routing features.
    // 'places' is also needed for other parts of the app potentially.
    await Promise.all([
        importLibrary('maps'),
        importLibrary('routes'),
        importLibrary('places')
    ])
}

export const useDistanceCalculator = () => {
    const settingsStore = useSettingsStore()
    const distancesStore = useDistancesStore()
    const { googleMapsApiKey } = storeToRefs(settingsStore)

    /**
     * Calculates the distance between two points using the Google Maps Distance Matrix API.
     * Tries to fetch from local cache first.
     */
    const getSegmentDistance = async (origin: string, destination: string): Promise<{ distance: number, source: 'cache' | 'api' } | null> => {
        if (!origin || !destination) return { distance: 0, source: 'cache' }

        // 1. Check Cache
        const cached = distancesStore.getDistance(origin, destination)
        if (cached !== null) {
            return { distance: cached, source: 'cache' }
        }

        // 2. Check API Key
        const apiKey = googleMapsApiKey.value
        if (!apiKey) {
            console.warn('Google Maps API Key missing in settings.')
            return null
        }

        // 3. Load API & Call
        try {
            await loadGoogleMapsManual(apiKey)

            if (!window.google || !window.google.maps) {
                throw new Error('Google Maps API failed to load correctly.')
            }

            const service = new google.maps.DistanceMatrixService()

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await new Promise<any>((resolve, reject) => {
                service.getDistanceMatrix(
                    {
                        origins: [origin],
                        destinations: [destination],
                        travelMode: google.maps.TravelMode.DRIVING,
                        unitSystem: google.maps.UnitSystem.METRIC,
                        avoidHighways: false,
                        avoidTolls: false,
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (response: any, status: any) => {
                        if (status === 'OK' && response) {
                            resolve(response)
                        } else {
                            console.error('Distance Matrix failed:', status, response)
                            reject(status)
                        }
                    }
                )
            })

            const element = result.rows[0]?.elements[0]
            if (element && element.status === 'OK') {
                // value is in meters
                const km = Math.round((element.distance.value / 1000) * 100) / 100
                distancesStore.setDistance(origin, destination, km)
                return { distance: km, source: 'api' }
            }
        } catch (error) {
            console.error('Error fetching distance:', error)
        }

        return null
    }

    /**
     * Calculates the total distance for a route:
     * Origin (Displacement 0) -> Displacement 1 -> ... -> Displacement N -> Origin (Displacement 0)
     */
    const calculateRouteDistance = async (displacements: { municipality: string, province: string }[]): Promise<{ distance: number, path: string[] }> => {
        if (!displacements || displacements.length < 2) return { distance: 0, path: [] }

        let totalKm = 0
        const places = displacements.map(d => `${d.municipality}`) // Display friendly name
        // FORCE "España" suffix to avoid ambiguity (e.g. Valencia, Venezuela)
        const queries = displacements.map(d => `${d.municipality}, ${d.province}, España`)

        // Loop through segments: 0->1, 1->2, ... (N-1)->N
        for (let i = 0; i < queries.length - 1; i++) {
            const origin = queries[i]
            const dest = queries[i + 1]
            if (origin && dest) {
                const result = await getSegmentDistance(origin, dest)
                if (result) {
                    totalKm += result.distance
                }
            }
        }

        return {
            distance: Math.round(totalKm * 100) / 100,
            path: places
        }
    }

    return {
        calculateRouteDistance
    }
}
