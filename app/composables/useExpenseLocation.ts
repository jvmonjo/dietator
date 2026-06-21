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

export interface ExpenseLocationSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
  // Google does not currently export its runtime PlacePrediction type through
  // the loader package, so keep the object opaque outside this composable.
  prediction?: unknown
}

export const useExpenseLocation = () => {
  const settingsStore = useSettingsStore()
  const { googleMapsApiKey } = storeToRefs(settingsStore)

  const ensureGoogleMaps = () => loadPlacesLibrary(googleMapsApiKey.value)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let autocompleteSessionToken: any

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

  const getLocationSuggestions = async (input: string): Promise<ExpenseLocationSuggestion[]> => {
    await ensureGoogleMaps()
    try {
      if (!autocompleteSessionToken) {
        autocompleteSessionToken = new google.maps.places.AutocompleteSessionToken()
      }

      const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ['es'],
        language: 'ca',
        region: 'es',
        sessionToken: autocompleteSessionToken
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const predictions = suggestions.flatMap((suggestion: any) => {
        const prediction = suggestion.placePrediction
        if (!prediction) return []
        return [{
          placeId: prediction.placeId,
          mainText: prediction.mainText?.toString() || prediction.text.toString(),
          secondaryText: prediction.secondaryText?.toString() || '',
          prediction
        }]
      })
      if (predictions.length) return predictions
    } catch (error) {
      console.warn('Places Autocomplete Data API failed; trying compatibility service.', error)
    }

    // Mobile Safari has intermittently failed to return results from the new
    // promise-based API. Keep the JS compatibility service as an independent
    // path; selected place IDs are resolved through Geocoding below.
    const service = new google.maps.places.AutocompleteService()
    const { predictions } = await service.getPlacePredictions({
      input,
      componentRestrictions: { country: 'es' },
      language: 'ca',
      region: 'es'
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (predictions || []).map((prediction: any) => ({
      placeId: prediction.place_id,
      mainText: prediction.structured_formatting?.main_text || prediction.description,
      secondaryText: prediction.structured_formatting?.secondary_text || '',
      prediction: undefined
    }))
  }

  const selectLocationSuggestion = async (suggestion: ExpenseLocationSuggestion): Promise<ExpenseLocation> => {
    if (!suggestion.prediction) {
      const geocoder = new google.maps.Geocoder()
      const response = await geocoder.geocode({ placeId: suggestion.placeId })
      const result = response.results?.[0]
      if (!result) throw new Error('location_not_found')
      autocompleteSessionToken = undefined
      return placeToLocation(result)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const place = (suggestion.prediction as any).toPlace()
    await place.fetchFields({
      fields: ['addressComponents', 'displayName', 'formattedAddress', 'id', 'location']
    })
    autocompleteSessionToken = undefined
    return autocompletePlaceToLocation(place)
  }

  return { detectCurrentLocation, getLocationSuggestions, selectLocationSuggestion }
}
