import { defineStore } from 'pinia'
import { piniaPluginPersistedstate } from '#imports'

const settingsStorage = piniaPluginPersistedstate.localStorage()

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    halfDietPrice: 0,
    fullDietPrice: 0,
    originProvince: '',
    originMunicipality: ''
  }),
  actions: {
    updateDietPrices (prices: { half: number, full: number }) {
      this.halfDietPrice = prices.half
      this.fullDietPrice = prices.full
    },
    loadSettings (settings: Partial<{ halfDietPrice: number, fullDietPrice: number, originProvince: string, originMunicipality: string }>) {
      if (typeof settings.halfDietPrice === 'number') this.halfDietPrice = settings.halfDietPrice
      if (typeof settings.fullDietPrice === 'number') this.fullDietPrice = settings.fullDietPrice
      if (typeof settings.originProvince === 'string') this.originProvince = settings.originProvince
      if (typeof settings.originMunicipality === 'string') this.originMunicipality = settings.originMunicipality
    },
    updateOrigin (province: string, municipality: string) {
      this.originProvince = province
      this.originMunicipality = municipality
    }
  },
  persist: {
    storage: settingsStorage
  }
})
