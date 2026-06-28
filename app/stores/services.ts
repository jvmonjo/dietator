import { defineStore } from 'pinia'
import { setServices as persistServices } from '~/utils/appDatabase'

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
    startTime: string // ISO string (UTC)
    endTime: string // ISO string (UTC)
    displacements: Displacement[]
    kilometers?: number
    notes?: string
}

export const useServiceStore = defineStore('services', {
    state: () => ({
        records: [] as ServiceRecord[]
    }),
    actions: {
        async addRecord(record: ServiceRecord) {
            this.records.push(record)
            await persistServices(this.records)
        },
        async setRecords(records: ServiceRecord[]) {
            this.records = records
            await persistServices(this.records)
        },
        async updateRecord(updatedRecord: ServiceRecord) {
            const index = this.records.findIndex(r => r.id === updatedRecord.id)
            if (index !== -1) {
                this.records[index] = updatedRecord
                await persistServices(this.records)
            }
        },
        async deleteRecord(id: string) {
            this.records = this.records.filter(r => r.id !== id)
            await persistServices(this.records)
        },
        async deleteRecordsByYear(year: number) {
            this.records = this.records.filter(record => {
                const recordYear = new Date(record.startTime).getFullYear()
                return recordYear !== year
            })
            await persistServices(this.records)
        },
        async deleteRecordsByMonth(year: number, month: number) {
            // month is 1-12
            this.records = this.records.filter(record => {
                const date = new Date(record.startTime)
                const recordYear = date.getFullYear()
                const recordMonth = date.getMonth() + 1
                return !(recordYear === year && recordMonth === month)
            })
            await persistServices(this.records)
        },
        getStorageUsage() {
            // Approximate size in bytes of the records JSON
            const json = JSON.stringify(this.records)
            return new Blob([json]).size
        }
    }
})
