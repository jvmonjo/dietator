import { storeToRefs } from 'pinia'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

let isLoading = false
let isLoaded = false
const waitingPromises: (() => void)[] = []

const loadGoogleMapsManual = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('Google Maps only available on client-side'))
            return
        }

        if (isLoaded || (window.google && window.google.maps)) {
            isLoaded = true
            resolve()
            return
        }

        // Check if script already exists to avoid double injection
        if (document.getElementById('google-maps-script')) {
            if (isLoaded) {
                resolve()
            } else {
                waitingPromises.push(resolve)
            }
            return
        }

        if (isLoading) {
            waitingPromises.push(resolve)
            return
        }

        isLoading = true

        const script = document.createElement('script')
        script.id = 'google-maps-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
        script.async = true
        script.defer = true

        script.onload = () => {
            isLoaded = true
            isLoading = false
            resolve()
            waitingPromises.forEach(cb => cb())
            waitingPromises.length = 0
        }

        script.onerror = (err) => {
            isLoading = false
            reject(err)
            waitingPromises.length = 0
        }

        document.head.appendChild(script)
    })
}

export const useDistanceCalculator = () => {
    const settingsStore = useSettingsStore()
    const distancesStore = useDistancesStore()
    const { googleMapsApiKey } = storeToRefs(settingsStore)

    /**
     * Calculates the distance between two points using the Google Maps Distance Matrix API.
     * Tries to fetch from local cache first.
     */
    const getSegmentDistance = async (origin: string, destination: string): Promise<number | null> => {
        if (!origin || !destination) return 0

        // 1. Check Cache
        const cached = distancesStore.getDistance(origin, destination)
        if (cached !== null) {
            return cached
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
                return km
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
    const calculateRouteDistance = async (displacements: { municipality: string, province: string }[]): Promise<number> => {
        if (!displacements || displacements.length < 2) return 0

        let totalKm = 0
        const places = displacements.map(d => `${d.municipality}, ${d.province}`)

        // Loop through segments: 0->1, 1->2, ... (N-1)->N
        for (let i = 0; i < places.length - 1; i++) {
            const origin = places[i]
            const dest = places[i + 1]
            if (origin && dest) {
                const segment = await getSegmentDistance(origin, dest)
                if (segment !== null) {
                    totalKm += segment
                }
            }
        }

        // Return trip: Last -> First
        const last = places[places.length - 1]
        const first = places[0]
        if (last && first) {
            const returnSegment = await getSegmentDistance(last, first)
            if (returnSegment !== null) {
                totalKm += returnSegment
            }
        }

        return Math.round(totalKm * 100) / 100
    }

    return {
        calculateRouteDistance
    }
}
