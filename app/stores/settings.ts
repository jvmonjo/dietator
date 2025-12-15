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
    updateOrigin (province: string, municipality: string) {
      this.originProvince = province
      this.originMunicipality = municipality
    }
  },
  persist: {
    storage: settingsStorage
  }
})
