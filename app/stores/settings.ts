import { defineStore } from 'pinia'
import { piniaPluginPersistedstate, useRuntimeConfig } from '#imports'
import type { Displacement } from '~/stores/services'

export type TemplateType = 'monthly' | 'service'

export interface TemplateFile {
  name: string
  mimeType: string
  dataUrl: string
  size: number
  updatedAt: string
}

export interface CalendarConfig {
  day: number
  time: string
  isRecurring: boolean
}

interface SettingsState {
  halfDietPrice: number
  fullDietPrice: number
  monthlyTemplate: TemplateFile | null
  serviceTemplate: TemplateFile | null
  exportTemplates: boolean
  googleMapsApiKey: string
  firstName?: string
  lastName?: string
  nationalId?: string
  reminder: CalendarConfig
  googleClientId?: string
  googleCalendarId?: string
  habitualRoute: Displacement[]
}

const settingsStorage = piniaPluginPersistedstate.localStorage()

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    halfDietPrice: 0,
    fullDietPrice: 0,
    monthlyTemplate: null,
    serviceTemplate: null,
    exportTemplates: false,
    googleMapsApiKey: '',
    firstName: '',
    lastName: '',
    nationalId: '',
    reminder: {
      day: 1,
      time: '09:00',
      isRecurring: true
    },
    googleClientId: useRuntimeConfig().public.googleClientId || '',
    googleCalendarId: '',
    habitualRoute: []
  }),
  actions: {
    updateDietPrices(prices: { half: number, full: number }) {
      this.halfDietPrice = prices.half
      this.fullDietPrice = prices.full
    },
    updatePersonalData(data: { firstName: string, lastName: string, nationalId: string }) {
      this.firstName = data.firstName
      this.lastName = data.lastName
      this.nationalId = data.nationalId
    },
    setTemplate(type: TemplateType, template: TemplateFile | null) {
      if (type === 'monthly') {
        this.monthlyTemplate = template
      } else {
        this.serviceTemplate = template
      }
    },
    loadSettings(settings: Partial<SettingsState>) {
      if (typeof settings.halfDietPrice === 'number') this.halfDietPrice = settings.halfDietPrice
      if (typeof settings.fullDietPrice === 'number') this.fullDietPrice = settings.fullDietPrice
      if (settings.monthlyTemplate || settings.monthlyTemplate === null) this.monthlyTemplate = settings.monthlyTemplate
      if (settings.serviceTemplate || settings.serviceTemplate === null) this.serviceTemplate = settings.serviceTemplate
      if (typeof settings.exportTemplates === 'boolean') this.exportTemplates = settings.exportTemplates
      this.googleMapsApiKey = settings.googleMapsApiKey || ''
      this.firstName = settings.firstName || ''
      this.lastName = settings.lastName || ''
      this.nationalId = settings.nationalId || ''
      if (settings.reminder) {
        this.reminder = settings.reminder
      }
      this.googleClientId = settings.googleClientId || ''
      this.googleCalendarId = settings.googleCalendarId || ''
      if (settings.habitualRoute) {
        this.habitualRoute = settings.habitualRoute
      }
    },
    updateHabitualRoute(route: Displacement[]) {
      this.habitualRoute = route
    }
  },
  persist: {
    storage: settingsStorage
  }
})
