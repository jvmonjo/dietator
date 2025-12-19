<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { Displacement, ServiceRecord } from '~/stores/services'

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
  (e: 'saved'): void
}>()
const toast = useToast()
const serviceStore = useServiceStore()

// Schema for validation
const schema = z.object({
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  displacements: z.array(z.object({
    province: z.string().min(1, 'Province is required'),
    municipality: z.string().min(1, 'Municipality is required'),
    hasLunch: z.boolean(),
    hasDinner: z.boolean()
  })).min(1, 'At least one displacement is required')
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time',
  path: ['endTime']
})

type Schema = z.output<typeof schema>

type FormDisplacement = Displacement & { id: string }

const createEmptyDisplacement = (): FormDisplacement => ({
  id: uuidv4(),
  province: '',
  municipality: '',
  hasLunch: false,
  hasDinner: false
})

const state = reactive({
  startTime: '',
  endTime: '',
  displacements: [createEmptyDisplacement()]
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
}

const loadRecord = (record: ServiceRecord) => {
  state.startTime = record.startTime
  state.endTime = record.endTime
  state.displacements = record.displacements.map(displacement => ({
    ...displacement,
    id: props.isDuplicate ? uuidv4() : (displacement.id || uuidv4())
  }))
}

watch(() => props.initialData, (record) => {
  if (record) {
    loadRecord(record)
  } else {
    resetState()
  }
}, { immediate: true })

async function onSubmit (event: FormSubmitEvent<Schema>) {
  const baseRecord: ServiceRecord = {
    id: (props.initialData?.id && !props.isDuplicate) ? props.initialData.id : uuidv4(),
    startTime: event.data.startTime,
    endTime: event.data.endTime,
    displacements: state.displacements.map(displacement => ({
      ...displacement,
      id: displacement.id || uuidv4()
    }))
  }

  const hasMeals = baseRecord.displacements.some(d => d.hasLunch || d.hasDinner)
  if (!hasMeals) {
    toast.add({ title: 'Introdueix almenys un dinar o sopar', color: 'warning' })
    return
  }

  if (isEditing.value) {
    serviceStore.updateRecord(baseRecord)
    toast.add({ title: 'Service updated successfully', color: 'success' })
    emit('saved')
  } else {
    serviceStore.addRecord(baseRecord)
    toast.add({ title: 'Service registered successfully', color: 'success' })
    resetState()
    emit('saved')
  }
}

const submitLabel = computed(() => isEditing.value ? 'Update Service Record' : 'Save Service Record')

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
      <UFormField label="Start Time" name="startTime" required>
        <UInput v-model="state.startTime" type="datetime-local" icon="i-heroicons-clock" class="w-full" />
      </UFormField>

      <UFormField label="End Time" name="endTime" required>
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

    <USeparator label="Displacements" />

    <!-- Displacements List -->
    <div class="space-y-4">
      <div
        v-for="(displacement, index) in state.displacements"
        :key="index"
        class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 relative group transition-all hover:border-primary-200 dark:hover:border-primary-800"
      >
        <div class="absolute top-4 right-4">
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
          <UFormField label="Province" :name="`displacements.${index}.province`" required>
            <ProvinceSelect
              v-model="displacement.province"
              :items="provinces"
              placeholder="Select province"
              @update:model-value="displacement.municipality = ''"
            />
          </UFormField>

          <UFormField label="Municipality" :name="`displacements.${index}.municipality`" required>
            <MunicipalitySelect
              v-model="displacement.municipality"
              :items="getMunicipalities(displacement.province)"
              :disabled="!displacement.province"
              placeholder="Select municipality"
            />
          </UFormField>

          <div class="flex flex-wrap gap-4">
            <UCheckbox
              v-model="displacement.hasLunch"
              label="Lunch Included"
              :disabled="state.displacements.some((d, idx) => idx !== index && d.hasLunch)"
              :ui="{ base: 'w-5 h-5', container: 'flex items-center' }"
            />
            <UCheckbox
              v-model="displacement.hasDinner"
              label="Dinner Included"
              :disabled="state.displacements.some((d, idx) => idx !== index && d.hasDinner)"
              :ui="{ base: 'w-5 h-5', container: 'flex items-center' }"
            />
          </div>
        </div>
      </div>

      <UButton
        icon="i-heroicons-plus-circle"
        variant="soft"
        block
        class="border-dashed border-2 border-gray-300 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500"
        @click="addDisplacement"
      >
        Add Another Displacement
      </UButton>
    </div>

    <div class="pt-4">
      <UButton type="submit" block size="xl" :loading="false">
        {{ submitLabel }}
      </UButton>
    </div>
  </UForm>
</template>
