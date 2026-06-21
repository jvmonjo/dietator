import { storeToRefs } from 'pinia'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import type { ExpenseLocation } from '~/stores/expenses'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any

let isConfigured = false
let configuredKey = ''

const loadPlacesLibrary = async (apiKey: string) => {
  if (typeof window === 'undefined') throw new Error('client_only')
  if (!apiKey) throw new Error('missing_api_key')

  if (!isConfigured || configuredKey !== apiKey) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      libraries: ['places', 'geocoding'],
      region: 'ES',
      language: 'ca'
    })
    isConfigured = true
    configuredKey = apiKey
  }

  await Promise.all([importLibrary('places'), importLibrary('geocoding')])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAddressPart = (components: any[] = [], types: string[]) => {
  const component = components.find(item => types.some(type => item.types?.includes(type)))
  return component?.long_name || component?.longText || ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const placeToLocation = (place: any): ExpenseLocation => {
  const components = place.address_components || []
  return {
    label: place.formatted_address || place.name || '',
    placeId: place.place_id || undefined,
    city: getAddressPart(components, ['locality', 'postal_town', 'administrative_area_level_3']),
    province: getAddressPart(components, ['administrative_area_level_2', 'administrative_area_level_1']),
    zone: getAddressPart(components, ['sublocality', 'neighborhood', 'administrative_area_level_4']),
    lat: typeof place.geometry?.location?.lat === 'function' ? place.geometry.location.lat() : undefined,
    lng: typeof place.geometry?.location?.lng === 'function' ? place.geometry.location.lng() : undefined
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const autocompletePlaceToLocation = (place: any): ExpenseLocation => {
  const components = place.addressComponents || []
  return {
    label: place.formattedAddress || place.displayName || '',
    placeId: place.id || undefined,
    city: getAddressPart(components, ['locality', 'postal_town', 'administrative_area_level_3']),
    province: getAddressPart(components, ['administrative_area_level_2', 'administrative_area_level_1']),
    zone: getAddressPart(components, ['sublocality', 'neighborhood', 'administrative_area_level_4']),
    lat: typeof place.location?.lat === 'function' ? place.location.lat() : undefined,
    lng: typeof place.location?.lng === 'function' ? place.location.lng() : undefined
  }
}

export const useExpenseLocation = () => {
  const settingsStore = useSettingsStore()
  const { googleMapsApiKey } = storeToRefs(settingsStore)

  const ensureGoogleMaps = () => loadPlacesLibrary(googleMapsApiKey.value)

  const detectCurrentLocation = async (): Promise<ExpenseLocation> => {
    await ensureGoogleMaps()
    if (!navigator.geolocation) throw new Error('geolocation_unavailable')

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
    })

    const geocoder = new google.maps.Geocoder()
    const response = await geocoder.geocode({
      location: { lat: position.coords.latitude, lng: position.coords.longitude }
    })
    const place = response.results?.[0]
    if (!place) throw new Error('location_not_found')
    return placeToLocation(place)
  }

  const attachAutocomplete = async (
    container: HTMLElement,
    options: {
      value: string
      placeholder: string
      onInput: (value: string) => void
      onSelected: (location: ExpenseLocation) => void
    }
  ) => {
    await ensureGoogleMaps()
    const autocomplete = new google.maps.places.PlaceAutocompleteElement({
      value: options.value,
      placeholder: options.placeholder,
      requestedLanguage: 'ca',
      requestedRegion: 'es'
    })
    autocomplete.classList.add('w-full')
    autocomplete.addEventListener('input', () => {
      options.onInput(autocomplete.value || '')
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autocomplete.addEventListener('gmp-select', async (event: any) => {
      const place = event.placePrediction.toPlace()
      await place.fetchFields({
        fields: ['addressComponents', 'displayName', 'formattedAddress', 'id', 'location']
      })
      options.onSelected(autocompletePlaceToLocation(place))
    })

    container.replaceChildren(autocomplete)
    return autocomplete
  }

  return { attachAutocomplete, detectCurrentLocation }
}
