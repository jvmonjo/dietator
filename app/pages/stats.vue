<script setup lang="ts">
import type { Displacement, ServiceRecord } from '~/stores/services'

const serviceStore = useServiceStore()
const settingsStore = useSettingsStore()
const { records } = storeToRefs(serviceStore)

const columns = [
  { key: 'startTime', label: 'Start Time', id: 'startTime' },
  { key: 'endTime', label: 'End Time', id: 'endTime' },
  { key: 'displacements', label: 'Displacements', id: 'displacements' },
  { key: 'diets', label: 'Diets', id: 'diets' },
  { key: 'actions', label: '', id: 'actions' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[]

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString()
}

const getDiets = (displacements: Displacement[]) => {
  const lunches = displacements.filter(d => d.hasLunch).length
  const dinners = displacements.filter(d => d.hasDinner).length
  return `L: ${lunches}, D: ${dinners}`
}

const totals = computed(() => {
  let lunches = 0
  let dinners = 0
  let dietUnits = 0

  records.value.forEach(record => {
    record.displacements.forEach(displacement => {
      if (displacement.hasLunch) lunches++
      if (displacement.hasDinner) dinners++

      if (displacement.hasLunch && displacement.hasDinner) {
        dietUnits += 1
      } else if (displacement.hasLunch || displacement.hasDinner) {
        dietUnits += 0.5
      }
    })
  })

  return {
    lunches,
    dinners,
    dietUnits,
    allowance: dietUnits * settingsStore.dietPrice
  }
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
}

const dietPriceSet = computed(() => settingsStore.dietPrice > 0)

const deleteRecord = (id: string) => {
  if (confirm('Are you sure you want to delete this record?')) {
    serviceStore.deleteRecord(id)
  }
}

const exportData = async () => {
  // TODO: Implement export
  await generateWordReport(records.value)
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Service Records</h1>
      <div class="flex gap-4">
        <UButton to="/" icon="i-heroicons-arrow-left" variant="ghost">Back to Form</UButton>
        <UButton icon="i-heroicons-document-arrow-down" color="success" @click="exportData">Export Report</UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <UCard>
        <p class="text-sm text-gray-500 dark:text-gray-400">Preu dieta</p>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white">
          {{ dietPriceSet ? formatCurrency(settingsStore.dietPrice) : 'Sense preu' }}
        </div>
        <UButton to="/settings" variant="ghost" size="xs" class="mt-2" icon="i-heroicons-cog-6-tooth">Configurar</UButton>
      </UCard>
      <UCard>
        <p class="text-sm text-gray-500 dark:text-gray-400">Dietes calculades</p>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white">
          {{ totals.dietUnits.toFixed(2) }}
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">Dinar o sopar 0.5, dinar i sopar 1</p>
      </UCard>
      <UCard>
        <p class="text-sm text-gray-500 dark:text-gray-400">Import total</p>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white">
          {{ formatCurrency(totals.allowance || 0) }}
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">Basat en les dietes calculades</p>
      </UCard>
    </div>

    <UAlert
      v-if="!dietPriceSet"
      color="warning"
      icon="i-heroicons-exclamation-triangle"
      variant="subtle"
      class="mb-6"
      title="Afegeix el preu de la dieta"
      description="Configura el preu per poder calcular correctament els totals."
    />

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Detall de serveis</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
                            Dinars: {{ totals.lunches }} | Sopars: {{ totals.dinners }}
            </p>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Total registres: {{ records.length }}</p>
        </div>
      </template>

      <UTable :rows="records" :columns="columns">
        <template #startTime-cell="{ row }">
          {{ formatDate((row as unknown as ServiceRecord).startTime) }}
        </template>
        <template #endTime-cell="{ row }">
          {{ formatDate((row as unknown as ServiceRecord).endTime) }}
        </template>
        <template #displacements-cell="{ row }">
          <ul class="list-disc list-inside text-sm">
            <li v-for="d in (row as unknown as ServiceRecord).displacements" :key="d.id">
              {{ d.municipality }}
            </li>
          </ul>
        </template>
        <template #diets-cell="{ row }">
          {{ getDiets((row as unknown as ServiceRecord).displacements) }}
        </template>
        <template #actions-cell="{ row }">
          <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" @click="deleteRecord((row as unknown as ServiceRecord).id)" />
        </template>
      </UTable>

      <div v-if="records.length === 0" class="text-center py-8 text-gray-500">
        No records found.
      </div>
    </UCard>
  </div>
</template>
