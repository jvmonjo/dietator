import { defineStore } from 'pinia'
import { piniaPluginPersistedstate } from '#imports'

interface DistancesState {
    cache: Record<string, number>
}

const distancesStorage = piniaPluginPersistedstate.localStorage()

// Helper to normalize keys consistently (e.g., lowercase, sorted or directional)
// Since A->B distance might differ slightly from B->A in real roads, we keep direction.
// Key format: "origin|destination"
const normalizeKey = (origin: string, destination: string) => {
    return `${origin.trim().toLowerCase()}|${destination.trim().toLowerCase()}`
}

export const useDistancesStore = defineStore('distances', {
    state: (): DistancesState => ({
        cache: {}
    }),
    actions: {
        getDistance(origin: string, destination: string): number | null {
            const key = normalizeKey(origin, destination)
            return this.cache[key] ?? null
        },
        setDistance(origin: string, destination: string, kilometers: number) {
            const key = normalizeKey(origin, destination)
            this.cache[key] = kilometers
        }
    },
    persist: {
        storage: distancesStorage
    }
})
