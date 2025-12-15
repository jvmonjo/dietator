import { defineStore } from 'pinia'
import { piniaPluginPersistedstate } from '#imports'

export type TemplateType = 'monthly' | 'service'

export interface TemplateFile {
  name: string
  mimeType: string
  dataUrl: string
  size: number
  updatedAt: string
}

interface SettingsState {
  halfDietPrice: number
  fullDietPrice: number
  originProvince: string
  originMunicipality: string
  monthlyTemplate: TemplateFile | null
  serviceTemplate: TemplateFile | null
  monthlyTemplateLocation: string
  serviceTemplateLocation: string
}

const settingsStorage = piniaPluginPersistedstate.localStorage()

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    halfDietPrice: 0,
    fullDietPrice: 0,
    originProvince: '',
    originMunicipality: '',
    monthlyTemplate: null,
    serviceTemplate: null,
    monthlyTemplateLocation: '',
    serviceTemplateLocation: ''
  }),
  actions: {
    updateDietPrices (prices: { half: number, full: number }) {
      this.halfDietPrice = prices.half
      this.fullDietPrice = prices.full
    },
    updateOrigin (province: string, municipality: string) {
      this.originProvince = province
      this.originMunicipality = municipality
    },
    setTemplate (type: TemplateType, template: TemplateFile | null) {
      if (type === 'monthly') {
        this.monthlyTemplate = template
      } else {
        this.serviceTemplate = template
      }
    },
    updateTemplateLocation (type: TemplateType, location: string) {
      if (type === 'monthly') {
        this.monthlyTemplateLocation = location
      } else {
        this.serviceTemplateLocation = location
      }
    },
    loadSettings (settings: Partial<SettingsState>) {
      if (typeof settings.halfDietPrice === 'number') this.halfDietPrice = settings.halfDietPrice
      if (typeof settings.fullDietPrice === 'number') this.fullDietPrice = settings.fullDietPrice
      if (typeof settings.originProvince === 'string') this.originProvince = settings.originProvince
      if (typeof settings.originMunicipality === 'string') this.originMunicipality = settings.originMunicipality
      if (settings.monthlyTemplate || settings.monthlyTemplate === null) this.monthlyTemplate = settings.monthlyTemplate
      if (settings.serviceTemplate || settings.serviceTemplate === null) this.serviceTemplate = settings.serviceTemplate
      if (typeof settings.monthlyTemplateLocation === 'string') this.monthlyTemplateLocation = settings.monthlyTemplateLocation
      if (typeof settings.serviceTemplateLocation === 'string') this.serviceTemplateLocation = settings.serviceTemplateLocation
    }
  },
  persist: {
    storage: settingsStorage
  }
})
