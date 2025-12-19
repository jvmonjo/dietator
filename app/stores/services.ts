import { defineStore } from 'pinia'
import { piniaPluginPersistedstate } from '#imports'

export interface Displacement {
    id: string
    province: string
    municipality: string
    hasLunch: boolean
    hasDinner: boolean
}

export interface ServiceRecord {
    id: string
    startTime: string // ISO string
    endTime: string // ISO string
    displacements: Displacement[]
    kilometers?: number
    notes?: string
}

const servicesStorage = piniaPluginPersistedstate.localStorage()

export const useServiceStore = defineStore('services', {
    state: () => ({
        records: [] as ServiceRecord[]
    }),
    actions: {
        addRecord(record: ServiceRecord) {
            this.records.push(record)
        },
        setRecords(records: ServiceRecord[]) {
            this.records = records
        },
        updateRecord(updatedRecord: ServiceRecord) {
            const index = this.records.findIndex(r => r.id === updatedRecord.id)
            if (index !== -1) {
                this.records[index] = updatedRecord
            }
        },
        deleteRecord(id: string) {
            this.records = this.records.filter(r => r.id !== id)
        }
    },
    persist: {
        storage: servicesStorage
    }
})
