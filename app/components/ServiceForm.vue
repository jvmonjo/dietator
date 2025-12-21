<script setup lang="ts">
import { z } from 'zod'
import { toRef } from 'vue'
import type { FormSubmitEvent } from '#ui/types'
import type { Displacement, ServiceRecord } from '~/stores/services'
import { useSettingsStore } from '~/stores/settings'
import { useDistanceCalculator } from '~/composables/useDistanceCalculator'
import { useSortable } from '@vueuse/integrations/useSortable'

// Replaced uuid import with local function to avoid potential crash
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const props = withDefaults(defineProps<{
  initialData?: ServiceRecord | null
  isDuplicate?: boolean
}>(), {
  initialData: null,
  isDuplicate: false
})

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

const displacementListRef = ref<HTMLElement | null>(null)

useSortable(displacementListRef, toRef(state, 'displacements'), {
  handle: '.drag-handle',
  animation: 150
})



const isEditing = computed(() => Boolean(props.initialData) && !props.isDuplicate)

// Load locations
const { provinces, getMunicipalities } = useLocations()

const addDisplacement = () => {
  state.displacements.push(createEmptyDisplacement())
}

const removeDisplacement = (index: number) => {
  state.displacements.splice(index, 1)
}

const resetState = () => {
  state.startTime = ''
  state.endTime = ''
  state.displacements = [createEmptyDisplacement()]
  state.kilometers = undefined
  state.notes = ''
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

watch(() => props.initialData, (record) => {
  if (record) {
    loadRecord(record)
  } else {
    resetState()
  }
}, { immediate: true })

async function onSubmit (event: FormSubmitEvent<Schema>) {
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
      } catch (e: any) {
          console.error('Error calculating distance', e)
          
          let title = 'Error calculant distància'
          let description = ''

          const msg = e.message || e.toString()

          if (msg.includes('REQUEST_DENIED') || msg.includes('ApiNotActivatedMapError')) {
              title = 'API Key incorrecta'
              description = 'Comprova la configuració i que l\'API Distance Matrix estigui activada.'
          } else if (msg.includes('OVER_QUERY_LIMIT')) {
              title = 'Quota superada'
              description = 'S\'ha superat el límit de peticions de Google Maps.'
          } else if (msg.includes('ZERO_RESULTS') || msg.includes('NOT_FOUND')) {
              title = 'Ruta no trobada'
              description = 'No s\'ha trobat una ruta per carretera entre els punts indicats.'
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
      <p
        v-for="(warning, index) in serviceWarnings"
        :key="index"
        class="text-xs text-amber-600 dark:text-amber-400"
      >
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
        v-model="state.notes" 
        placeholder="Afegeix comentaris o observacions..." 
        :rows="3" 
        autoresize
        class="w-full"
      />
    </UFormField>

    <USeparator label="Desplaçaments" />

    <!-- Displacements List -->
    <div ref="displacementListRef" class="space-y-4">
      <div
        v-for="(displacement, index) in state.displacements"
        :key="displacement.id"
        class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 relative group transition-all hover:border-primary-200 dark:hover:border-primary-800"
      >
        <div class="absolute top-4 right-4 flex items-center gap-2">
           <UIcon name="i-heroicons-bars-3" class="w-5 h-5 text-gray-400 cursor-move drag-handle hover:text-gray-600 dark:hover:text-gray-300" />
          <UButton
            v-if="state.displacements.length > 1"
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="xs"
            @click="removeDisplacement(index)"
          />
        </div>

        <div class="grid grid-cols-1 gap-4 pr-8">
          <UFormField label="Província" :name="`displacements.${index}.province`" required>
            <ProvinceSelect
              v-model="displacement.province"
              :items="provinces"
              placeholder="Selecciona província"
              @update:model-value="displacement.municipality = ''"
            />
          </UFormField>

          <UFormField label="Municipi" :name="`displacements.${index}.municipality`" required>
            <MunicipalitySelect
              v-model="displacement.municipality"
              :items="getMunicipalities(displacement.province)"
              :disabled="!displacement.province"
              placeholder="Selecciona municipi"
            />
          </UFormField>

          <div class="flex flex-wrap gap-4">
            <UCheckbox
              v-model="displacement.hasLunch"
              label="Dinar inclòs"
              :disabled="state.displacements.some((d, idx) => idx !== index && d.hasLunch)"
              :ui="{ base: 'w-5 h-5', container: 'flex items-center' }"
            />
            <UCheckbox
              v-model="displacement.hasDinner"
              label="Sopar inclòs"
              :disabled="state.displacements.some((d, idx) => idx !== index && d.hasDinner)"
              :ui="{ base: 'w-5 h-5', container: 'flex items-center' }"
            />
          </div>

          <UFormField label="Observacions" :name="`displacements.${index}.observations`">
            <UTextarea
              v-model="displacement.observations" 
              placeholder="Detalls addicionals d'aquest desplaçament..."
              icon="i-heroicons-pencil-square"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>

      <UButton
        icon="i-heroicons-plus-circle"
        variant="soft"
        block
        class="border-dashed border-2 border-gray-300 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500"
        @click="addDisplacement"
      >
        Afegir un altre desplaçament
      </UButton>
    </div>

    <div class="pt-4">
      <UButton type="submit" block size="xl" :loading="false">
        {{ submitLabel }}
      </UButton>
    </div>
  </UForm>
</template>
