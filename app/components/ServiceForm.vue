<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { v4 as uuidv4 } from 'uuid'

defineProps<{
  initialData?: Record<string, unknown>
}>()

defineEmits(['submit'])
const toast = useToast()
const serviceStore = useServiceStore()

// Schema for validation
const schema = z.object({
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  displacements: z.array(z.object({
    municipality: z.string().min(1, 'Municipality is required'),
    hasLunch: z.boolean(),
    hasDinner: z.boolean()
  })).min(1, 'At least one displacement is required')
})

type Schema = z.output<typeof schema>

const state = reactive({
  startTime: '',
  endTime: '',
  displacements: [{ id: uuidv4(), municipality: '', hasLunch: false, hasDinner: false }]
})

// Load municipalities
const { data: municipalities } = await useFetch<string[]>('/municipalities.json')

const addDisplacement = () => {
  state.displacements.push({ id: uuidv4(), municipality: '', hasLunch: false, hasDinner: false })
}

const removeDisplacement = (index: number) => {
  state.displacements.splice(index, 1)
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const newRecord = {
    id: uuidv4(),
    startTime: event.data.startTime,
    endTime: event.data.endTime,
    displacements: event.data.displacements.map(d => ({
      ...d,
      id: uuidv4()
    }))
  }
  
  serviceStore.addRecord(newRecord)
  
  toast.add({ title: 'Service registered successfully', color: 'success' })
  
  // Reset form
  state.startTime = ''
  state.endTime = ''
  state.displacements = [{ id: uuidv4(), municipality: '', hasLunch: false, hasDinner: false }]
}
</script>

<template>
  <UCard class="w-full shadow-lg dark:shadow-primary-900/20 ring-1 ring-gray-200 dark:ring-gray-800">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="p-2 bg-primary-50 dark:bg-primary-900/50 rounded-lg">
          <UIcon name="i-heroicons-pencil-square" class="w-6 h-6 text-primary-500" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Register Service</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Enter service details below</p>
        </div>
      </div>
    </template>

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
            <UFormField label="Municipality" :name="`displacements.${index}.municipality`" required>
              <USelectMenu
                v-model="displacement.municipality"
                :items="municipalities || []"
                searchable
                searchable-placeholder="Search municipality..."
                placeholder="Select municipality"
                icon="i-heroicons-map-pin"
                class="w-full"
              />
            </UFormField>

            <div class="flex flex-wrap gap-4">
              <UCheckbox 
                v-model="displacement.hasLunch" 
                label="Lunch Included" 
                :ui="{ base: 'w-5 h-5', container: 'flex items-center' }"
              />
              <UCheckbox 
                v-model="displacement.hasDinner" 
                label="Dinner Included"
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
          Save Service Record
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>
