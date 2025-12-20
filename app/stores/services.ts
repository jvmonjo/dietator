import { defineStore } from 'pinia'
import { createSafeStorage } from '~/utils/storage'

export interface Displacement {
    id: string
    province: string
    municipality: string
    hasLunch: boolean
    hasDinner: boolean
    observations?: string
}

export interface ServiceRecord {
    id: string
    startTime: string // ISO string
    endTime: string // ISO string
    displacements: Displacement[]
    kilometers?: number
    notes?: string
}

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
        },
        deleteRecordsByYear(year: number) {
            this.records = this.records.filter(record => {
                const recordYear = new Date(record.startTime).getFullYear()
                return recordYear !== year
            })
        },
        deleteRecordsByMonth(year: number, month: number) {
            // month is 1-12
            this.records = this.records.filter(record => {
                const date = new Date(record.startTime)
                const recordYear = date.getFullYear()
                const recordMonth = date.getMonth() + 1
                return !(recordYear === year && recordMonth === month)
            })
        },
        getStorageUsage() {
            // Approximate size in bytes of the records JSON
            const json = JSON.stringify(this.records)
            return new Blob([json]).size
        }
    },
    persist: {
        storage: createSafeStorage()
    }
})
