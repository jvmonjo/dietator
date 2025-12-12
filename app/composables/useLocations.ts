export const useLocations = () => {
  const { data: locations, pending } = useFetch<{ provinces: { code: string, name: string }[], municipalities: Record<string, string[]> }>('/locations.json')

  const provinces = computed(() => locations.value?.provinces.map(p => p.name) || [])

  const getMunicipalities = (provinceName: string) => {
    if (!locations.value || !provinceName) return []
    const province = locations.value.provinces.find(p => p.name === provinceName)
    if (!province) return []
    return locations.value.municipalities[province.code] || []
  }

  return {
    locations,
    provinces,
    getMunicipalities,
    isLoadingLocations: pending
  }
}
