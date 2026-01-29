<script setup lang="ts">
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { FormSubmitEvent } from '#ui/types'
import type { Displacement, ServiceRecord } from '~/stores/services'
import { useSettingsStore } from '~/stores/settings'
import { useDistanceCalculator } from '~/composables/useDistanceCalculator'




// Removed custom uuidv4 since we installed uuid package in previously


// Helper to detect changes in displacements (ignoring IDs and other metadata)
const getDisplacementSignature = (displacements: Partial<Displacement>[] | undefined) => {
  if (!displacements) return ''
  return displacements.map(d => `${d.province?.trim()}|${d.municipality?.trim()}`).join('||')
}

const props = withDefaults(defineProps<{
  initialData?: ServiceRecord | null
  initialDate?: Date | null
  initialNotes?: string
  initialStartTime?: string
  initialEndTime?: string
  initialDisplacements?: Partial<Displacement>[]
  isDuplicate?: boolean
}>(), {
  initialData: null,
  initialDate: null,
  initialNotes: '',
  initialStartTime: '',
  initialEndTime: '',
  initialDisplacements: () => [],
  isDuplicate: false
})

// ... (emit and setup)
const emit = defineEmits<{
  (e: 'saved', record: ServiceRecord): void
}>()
const toast = useToast()
const serviceStore = useServiceStore()
const settingsStore = useSettingsStore()

const { t } = useI18n()
const { calculateRouteDistance } = useDistanceCalculator()

// Schema for validation
const schema = computed(() => z.object({
  startTime: z.string().min(1, t('components.service_form.validation.start_required')),
  endTime: z.string().min(1, t('components.service_form.validation.end_required')),
  displacements: z.array(z.object({
    province: z.string().min(1, t('components.service_form.validation.province_required')),
    municipality: z.string().min(1, t('components.service_form.validation.municipality_required')),
    hasLunch: z.boolean(),
    hasDinner: z.boolean()
  })).min(1, t('components.service_form.validation.one_displacement_required')),
  kilometers: z.number().optional()
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: t('components.service_form.validation.end_after_start'),
  path: ['endTime']
}))



type FormDisplacement = Displacement & { id: string }

const createEmptyDisplacement = (): FormDisplacement => ({
  id: uuidv4(),
  province: '',
  municipality: '',
  hasLunch: false,
  hasDinner: false,
  observations: ''
})

const state = reactive({
  startTime: '',
  endTime: '',
  displacements: [createEmptyDisplacement()],
  kilometers: undefined as number | undefined,
  notes: ''
})

const isLoading = ref(false)

const isEditing = computed(() => Boolean(props.initialData) && !props.isDuplicate)

// Locations loaded for passing provinces to editor
const { provinces } = useLocations()

const resetState = () => {
  if (props.initialDate) {
    const baseDate = new Date(props.initialDate)
    const yyyy = baseDate.getFullYear()
    const mm = String(baseDate.getMonth() + 1).padStart(2, '0')
    const dd = String(baseDate.getDate()).padStart(2, '0')

    state.startTime = props.initialStartTime || `${yyyy}-${mm}-${dd}T09:00`
    state.endTime = props.initialEndTime || `${yyyy}-${mm}-${dd}T18:00`
  } else {
    state.startTime = props.initialStartTime || ''
    state.endTime = props.initialEndTime || ''
  }

  if (props.initialDisplacements && props.initialDisplacements.length > 0) {
    state.displacements = props.initialDisplacements.map(d => ({
      ...createEmptyDisplacement(),
      ...d,
      id: uuidv4() // Always generate new ID
    }))
  } else {
    state.displacements = [createEmptyDisplacement()]
  }

  state.kilometers = undefined
  state.notes = props.initialNotes || ''
}

const importHabitualRoute = () => {
  if (!settingsStore.habitualRoute || settingsStore.habitualRoute.length === 0) return

  const hasData = state.displacements.length > 1 ||
    (state.displacements[0] && (state.displacements[0].province || state.displacements[0].municipality))

  if (hasData) {
    if (!confirm(t('components.service_form.alerts.replace_route'))) {
      return
    }
  }

  // Map to form structure with new IDs
  state.displacements = settingsStore.habitualRoute.map(d => ({
    ...createEmptyDisplacement(),
    ...d,
    id: uuidv4()
  }))

  toast.add({ title: t('components.service_form.alerts.route_imported'), color: 'success' })
}

const loadRecord = (record: ServiceRecord) => {
  state.startTime = record.startTime
  state.endTime = record.endTime
  state.displacements = (record.displacements || []).map(displacement => ({
    ...displacement,
    id: props.isDuplicate ? uuidv4() : (displacement.id || uuidv4())
  }))
  // Preserve kilometers if editing or duplicating (can be manually changed later)
  if (record.kilometers !== undefined) {
    state.kilometers = record.kilometers
  }
  state.notes = record.notes || ''
}

// ... (loadRecord)

watch(() => [props.initialData, props.initialDate, props.initialNotes, props.initialStartTime, props.initialDisplacements], () => {
  if (props.initialData) {
    loadRecord(props.initialData)
  } else {
    resetState()
  }
}, { immediate: true })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function onSubmit(event: FormSubmitEvent<any>) {
  if (isLoading.value) return
  isLoading.value = true

  try {
    // Auto-calculate kilometers if API key is configured AND (no value is present OR displacements content changed)
    const initialSignature = getDisplacementSignature(props.initialData?.displacements)
    const currentSignature = getDisplacementSignature(state.displacements)
    const hasDisplacementsChanged = initialSignature !== currentSignature

    if (settingsStore.googleMapsApiKey && state.displacements.length >= 2 && (!state.kilometers || hasDisplacementsChanged)) {
      try {
        // Filter out incomplete displacements
        const validDisplacements = state.displacements.filter(d => d.province && d.municipality)
        if (validDisplacements.length >= 2) {
          const { distance, path } = await calculateRouteDistance(validDisplacements)
          if (distance > 0) {
            state.kilometers = distance
            toast.add({
              title: t('components.service_form.alerts.distance_calculated', { distance }),
              description: `Ruta: ${path.join(' ➜ ')}`,
              color: 'info'
            })
          }
        }
      } catch (e: unknown) {
        console.error('Error calculating distance', e)

        let title = 'Error calculant distància'
        let description = ''

        const msg = e instanceof Error ? e.message : String(e)

        if (msg.includes('REQUEST_DENIED') || msg.includes('ApiNotActivatedMapError')) {
          title = t('components.service_form.maps_errors.api_key')
          description = t('components.service_form.maps_errors.api_key_desc')
        } else if (msg.includes('ApiTargetBlockedMapError')) {
          title = t('components.service_form.maps_errors.blocked')
          description = t('components.service_form.maps_errors.blocked_desc')
        } else if (msg.includes('OVER_QUERY_LIMIT')) {
          title = t('components.service_form.maps_errors.quota')
          description = t('components.service_form.maps_errors.quota_desc')
        } else if (msg.includes('ZERO_RESULTS') || msg.includes('NOT_FOUND')) {
          title = t('components.service_form.maps_errors.not_found')
          description = t('components.service_form.maps_errors.not_found_desc')
        } else if (msg.includes('TIMEOUT_GOOGLE_MAPS')) {
          title = t('components.service_form.maps_errors.timeout')
          description = t('components.service_form.maps_errors.timeout_desc')
        }

        toast.add({ title, description, color: 'warning' })
      }
    }

    // Check for duplicate start date (ignoring time)
    const targetDate = event.data.startTime.split('T')[0]
    const isDuplicateDate = serviceStore.records.some(record => {
      const recordDate = record.startTime ? record.startTime.split('T')[0] : ''
      return recordDate === targetDate &&
        (!props.initialData || props.isDuplicate || record.id !== props.initialData.id)
    })

    if (isDuplicateDate) {
      toast.add({ title: t('components.service_form.alerts.duplicate_date'), color: 'error' })
      return
    }

    const baseRecord: ServiceRecord = {
      id: (props.initialData?.id && !props.isDuplicate) ? props.initialData.id : uuidv4(),
      startTime: event.data.startTime,
      endTime: event.data.endTime,
      displacements: state.displacements.map(displacement => ({
        ...displacement,
        id: displacement.id || uuidv4()
      })),
      kilometers: state.kilometers,
      notes: state.notes
    }

    if (isEditing.value) {
      serviceStore.updateRecord(baseRecord)
      toast.add({ title: t('components.service_form.alerts.updated'), color: 'success' })
      emit('saved', baseRecord)
    } else {
      serviceStore.addRecord(baseRecord)
      toast.add({ title: t('components.service_form.alerts.saved'), color: 'success' })
      resetState()
      emit('saved', baseRecord)
    }
  } catch (error) {
    console.error('Error saving service', error)
    toast.add({ title: t('components.service_form.alerts.save_error'), color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const submitLabel = computed(() => isEditing.value ? t('components.service_form.update') : t('components.service_form.save'))

const { getServiceWarnings } = useServiceWarnings()

const serviceWarnings = computed(() => {
  if (!state.startTime || !state.endTime) return []
  return getServiceWarnings(state.startTime, state.endTime, state.displacements)
})



const serviceDuration = computed(() => {
  if (!state.startTime || !state.endTime) return '-'

  const start = new Date(state.startTime)
  const end = new Date(state.endTime)
  const diffMs = end.getTime() - start.getTime()

  if (diffMs < 0) return '-'

  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${hours}h ${String(minutes).padStart(2, '0')}m`
})
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-8" @submit="onSubmit">
    <!-- Time Selection -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UFormField :label="$t('components.service_form.start_time')" name="startTime" required>
        <UInput v-model="state.startTime" type="datetime-local" icon="i-heroicons-clock" class="w-full" />
      </UFormField>

      <UFormField :label="$t('components.service_form.end_time')" name="endTime" required>
        <UInput v-model="state.endTime" type="datetime-local" icon="i-heroicons-clock" class="w-full" />
      </UFormField>
    </div>
    <div v-if="serviceWarnings.length > 0" class="flex flex-col gap-1 mt-1">
      <p v-for="(warning, index) in serviceWarnings" :key="index" class="text-xs text-amber-600 dark:text-amber-400">
        📌 {{ warning.message }}
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
      <UFormField :label="$t('components.service_form.kilometers')" name="kilometers">
        <UInput v-model="state.kilometers" type="number" step="0.01" icon="i-heroicons-truck" placeholder="0.00" />
      </UFormField>

      <UFormField :label="$t('components.service_form.duration')">
        <UInput :model-value="serviceDuration" disabled icon="i-heroicons-clock" class="opacity-75" />
      </UFormField>
    </div>

    <UFormField :label="$t('components.service_form.notes')" name="notes">
      <UTextarea
v-model="state.notes" :placeholder="$t('components.service_form.notes_placeholder')" :rows="3"
        autoresize class="w-full" />
    </UFormField>

    <div class="flex items-center justify-between">
      <USeparator :label="$t('components.service_form.displacements')" class="flex-1" />
      <UButton
v-if="settingsStore.habitualRoute && settingsStore.habitualRoute.length > 0" variant="ghost" size="xs"
        icon="i-heroicons-arrow-down-tray" class="ml-2" @click="importHabitualRoute">
        {{ $t('components.service_form.import_route') }}
      </UButton>
    </div>

    <!-- Displacements List -->
    <DisplacementListEditor v-model="state.displacements" :provinces="provinces" />

    <div class="pt-4">
      <UButton type="submit" block size="xl" :loading="isLoading">
        {{ submitLabel }}
      </UButton>
    </div>
  </UForm>
</template>
