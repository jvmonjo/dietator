type LocationOption = { label: string, value: string }

export const useLocations = () => {
  const { data: locations, pending } = useFetch<{ provinces: { code: string, name: string }[], municipalities: Record<string, string[]> }>('/locations.json')

  const provinces = computed<LocationOption[]>(() => {
    return locations.value?.provinces.map(p => ({
      label: p.name,
      value: p.name
    })) ?? []
  })

  const getMunicipalities = (provinceName: string): LocationOption[] => {
    if (!locations.value || !provinceName) return []
    const province = locations.value.provinces.find(p => p.name === provinceName)
    if (!province) return []
    return (locations.value.municipalities[province.code] || []).map(name => ({
      label: name,
      value: name
    }))
  }

  return {
    locations,
    provinces,
    getMunicipalities,
    isLoadingLocations: pending
  }
}
