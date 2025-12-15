import { storeToRefs } from 'pinia'
import type { ServiceRecord } from '~/stores/services'

export interface MonthOption {
  value: string
  label: string
}

export interface ServiceTotals {
  lunches: number
  dinners: number
  halfDietCount: number
  fullDietCount: number
  dietUnits: number
  allowance: number
  serviceCount: number
}

const formatMonthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

const parseMonthValue = (value?: string | null) => {
  if (!value) return null
  const [yearStr, monthStr] = value.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null
  if (month < 1 || month > 12) return null
  return { year, month }
}

export const useServiceStats = () => {
  const serviceStore = useServiceStore()
  const settingsStore = useSettingsStore()
  const { records } = storeToRefs(serviceStore)

  const monthOptions = computed<MonthOption[]>(() => {
    const formatter = new Intl.DateTimeFormat('ca-ES', { year: 'numeric', month: 'long' })
    const months = new Map<string, MonthOption>()

    records.value.forEach((record) => {
      const date = new Date(record.startTime)
      if (Number.isNaN(date.getTime())) return

      const value = formatMonthKey(date.getFullYear(), date.getMonth() + 1)
      if (!months.has(value)) {
        months.set(value, {
          value,
          label: formatter.format(date)
        })
      }
    })

    return Array.from(months.values()).sort((a, b) => (a.value < b.value ? 1 : -1))
  })

  const currentMonthValue = computed(() => {
    const now = new Date()
    return formatMonthKey(now.getFullYear(), now.getMonth() + 1)
  })

  const getRecordsForMonth = (monthValue?: string | null) => {
    const target = parseMonthValue(monthValue)
    if (!target) return records.value.slice()

    return records.value.filter((record) => {
      const date = new Date(record.startTime)
      if (Number.isNaN(date.getTime())) return false

      return date.getFullYear() === target.year && (date.getMonth() + 1) === target.month
    })
  }

  const calculateTotals = (inputRecords?: ServiceRecord[]): ServiceTotals => {
    const source = inputRecords ?? records.value
    let lunches = 0
    let dinners = 0
    let halfDietCount = 0
    let fullDietCount = 0

    source.forEach((record) => {
      let serviceHasLunch = false
      let serviceHasDinner = false

      record.displacements.forEach(({ hasLunch, hasDinner }) => {
        if (hasLunch) {
          lunches++
          serviceHasLunch = true
        }
        if (hasDinner) {
          dinners++
          serviceHasDinner = true
        }
      })

      if (serviceHasLunch && serviceHasDinner) {
        fullDietCount += 1
      } else if (serviceHasLunch || serviceHasDinner) {
        halfDietCount += 1
      }
    })

    const dietUnits = fullDietCount + (halfDietCount * 0.5)
    const allowance = (fullDietCount * settingsStore.fullDietPrice) + (halfDietCount * settingsStore.halfDietPrice)

    return {
      lunches,
      dinners,
      halfDietCount,
      fullDietCount,
      dietUnits,
      allowance,
      serviceCount: source.length
    }
  }

  return {
    monthOptions,
    currentMonthValue,
    getRecordsForMonth,
    calculateTotals
  }
}
