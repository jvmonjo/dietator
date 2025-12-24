<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { Displacement, ServiceRecord } from '~/stores/services'
import { useSettingsStore } from '~/stores/settings'
import { useDistanceCalculator } from '~/composables/useDistanceCalculator'


// Replaced uuid import with local function to avoid potential crash
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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

const { calculateRouteDistance } = useDistanceCalculator()

// Schema for validation
const schema = z.object({
  startTime: z.string().min(1, 'L\'hora d\'inici és obligatòria'),
  endTime: z.string().min(1, 'L\'hora de fi és obligatòria'),
  displacements: z.array(z.object({
    province: z.string().min(1, 'La província és obligatòria'),
    municipality: z.string().min(1, 'El municipi és obligatori'),
    hasLunch: z.boolean(),
    hasDinner: z.boolean()
  })).min(1, 'Es requereix almenys un desplaçament'),
  kilometers: z.number().optional()
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'L\'hora de fi ha de ser posterior a l\'hora d\'inici',
  path: ['endTime']
})

type Schema = z.output<typeof schema>

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
    if (!confirm('Això substituirà els desplaçaments actuals. Vols continuar?')) {
      return
    }
  }

  // Map to form structure with new IDs
  state.displacements = settingsStore.habitualRoute.map(d => ({
    ...createEmptyDisplacement(),
    ...d,
    id: uuidv4()
  }))

  toast.add({ title: 'Ruta habitual importada', color: 'success' })
}

const loadRecord = (record: ServiceRecord) => {
  state.startTime = record.startTime
  state.endTime = record.endTime
  state.displacements = record.displacements.map(displacement => ({
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

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (isLoading.value) return
  isLoading.value = true

  try {
    // Auto-calculate kilometers if API key is configured AND (no value is present OR number of displacements changed)
    const initialDisplacementCount = props.initialData?.displacements?.length || 0
    const currentDisplacementCount = state.displacements.length
    const hasDisplacementCountChanged = initialDisplacementCount !== currentDisplacementCount

    if (settingsStore.googleMapsApiKey && state.displacements.length >= 2 && (!state.kilometers || hasDisplacementCountChanged)) {
      try {
        // Filter out incomplete displacements
        const validDisplacements = state.displacements.filter(d => d.province && d.municipality)
        if (validDisplacements.length >= 2) {
          const { distance, path } = await calculateRouteDistance(validDisplacements)
          if (distance > 0) {
            state.kilometers = distance
            toast.add({
              title: `Kilòmetres calculats: ${distance}`,
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
          title = 'API Key incorrecta'
          description = 'Comprova la configuració i que l\'API Distance Matrix estigui activada.'
        } else if (msg.includes('ApiTargetBlockedMapError')) {
          title = 'API Key bloquejada'
          description = 'La clau API no permet peticions des d\'aquest domini. Revisa les restriccions a Google Cloud.'
        } else if (msg.includes('OVER_QUERY_LIMIT')) {
          title = 'Quota superada'
          description = 'S\'ha superat el límit de peticions de Google Maps.'
        } else if (msg.includes('ZERO_RESULTS') || msg.includes('NOT_FOUND')) {
          title = 'Ruta no trobada'
          description = 'No s\'ha trobat una ruta per carretera entre els punts indicats.'
        } else if (msg.includes('TIMEOUT_GOOGLE_MAPS')) {
          title = 'Temps d\'espera esgotat'
          description = 'Google Maps no respon. S\'ha continuat sense calcular distància automàticament.'
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
      toast.add({ title: 'Ja existeix un servei amb aquesta data d\'inici', color: 'error' })
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
      toast.add({ title: 'Servei actualitzat correctament', color: 'success' })
      emit('saved', baseRecord)
    } else {
      serviceStore.addRecord(baseRecord)
      toast.add({ title: 'Servei registrat correctament', color: 'success' })
      resetState()
      emit('saved', baseRecord)
    }
  } catch (error) {
    console.error('Error saving service', error)
    toast.add({ title: 'Error guardant el servei', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const submitLabel = computed(() => isEditing.value ? 'Actualitzar servei' : 'Guardar servei')

const { getServiceWarnings } = useServiceWarnings()

const serviceWarnings = computed(() => {
  if (!state.startTime || !state.endTime) return []
  return getServiceWarnings(state.startTime, state.endTime, state.displacements)
})
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-8" @submit="onSubmit">
    <!-- Time Selection -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UFormField label="Hora d'inici" name="startTime" required>
        <UInput v-model="state.startTime" type="datetime-local" icon="i-heroicons-clock" class="w-full" />
      </UFormField>

      <UFormField label="Hora de fi" name="endTime" required>
        <UInput v-model="state.endTime" type="datetime-local" icon="i-heroicons-clock" class="w-full" />
      </UFormField>
    </div>
    <div v-if="serviceWarnings.length > 0" class="flex flex-col gap-1 mt-1">
      <p v-for="(warning, index) in serviceWarnings" :key="index" class="text-xs text-amber-600 dark:text-amber-400">
        📌 {{ warning.message }}
      </p>
    </div>

    <!-- Km Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
      <UFormField label="Kilòmetres (Opcional)" name="kilometers">
        <UInput v-model="state.kilometers" type="number" step="0.01" icon="i-heroicons-truck" placeholder="0.00" />
      </UFormField>


    </div>

    <UFormField label="Notes (Opcional)" name="notes">
      <UTextarea
v-model="state.notes" placeholder="Afegeix comentaris o observacions..." :rows="3" autoresize
        class="w-full" />
    </UFormField>

    <div class="flex items-center justify-between">
      <USeparator label="Desplaçaments" class="flex-1" />
      <UButton
v-if="settingsStore.habitualRoute && settingsStore.habitualRoute.length > 0" variant="ghost" size="xs"
        icon="i-heroicons-arrow-down-tray" class="ml-2" @click="importHabitualRoute">
        Importar ruta habitual
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
