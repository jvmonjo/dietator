import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    dietPrice: 0,
    originProvince: '',
    originMunicipality: ''
  }),
  actions: {
    updateDietPrice (price: number) {
      this.dietPrice = price
    },
    updateOrigin (province: string, municipality: string) {
      this.originProvince = province
      this.originMunicipality = municipality
    }
  },
  persist: {
    storage: localStorage
  }
})
