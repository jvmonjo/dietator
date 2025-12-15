<script setup lang="ts">
import type { Displacement, ServiceRecord } from '~/stores/services'

const serviceStore = useServiceStore()
const settingsStore = useSettingsStore()
const { records } = storeToRefs(serviceStore)

const monthOptions = computed(() => {
  const months = new Map<string, { value: string, label: string }>()

  records.value.forEach(record => {
    const date = new Date(record.startTime)
    if (Number.isNaN(date.getTime())) return
    const year = date.getFullYear()
    const month = date.getMonth()
    const value = `${year}-${String(month + 1).padStart(2, '0')}`
    if (!months.has(value)) {
      const formatter = new Intl.DateTimeFormat('ca-ES', { year: 'numeric', month: 'long' })
      months.set(value, {
        value,
        label: formatter.format(date)
      })
    }
  })

  return Array.from(months.values()).sort((a, b) => (a.value < b.value ? 1 : -1))
})

const selectedMonth = ref<string>('')

const filteredRecords = computed(() => {
  if (!selectedMonth.value) {
    return records.value
  }

  const [year, month] = selectedMonth.value.split('-').map(Number)
  return records.value.filter(record => {
    const date = new Date(record.startTime)
    return date.getFullYear() === year && (date.getMonth() + 1) === month
  })
})

const columns = [
  { accessorKey: 'startTime', header: 'Start Time', id: 'startTime' },
  { accessorKey: 'endTime', header: 'End Time', id: 'endTime' },
  { accessorKey: 'displacements', header: 'Displacements', id: 'displacements' },
  { accessorKey: 'diets', header: 'Diets', id: 'diets' },
  { accessorKey: 'actions', header: '', id: 'actions' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[]

const formatDate = (dateStr: string) => {
  if (!dateStr) {
    return '—'
  }
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const getDiets = (displacements: Displacement[]) => {
  const lunches = displacements.filter(d => d.hasLunch).length
  const dinners = displacements.filter(d => d.hasDinner).length
  return `L: ${lunches}, D: ${dinners}`
}

const totals = computed(() => {
  let lunches = 0
  let dinners = 0
  let halfDietCount = 0
  let fullDietCount = 0

  filteredRecords.value.forEach((record) => {
    record.displacements.forEach((displacement) => {
      const { hasLunch, hasDinner } = displacement

      if (hasLunch) lunches++
      if (hasDinner) dinners++

      if (hasLunch && hasDinner) {
        fullDietCount += 1
      } else if (hasLunch || hasDinner) {
        halfDietCount += 1
      }
    })
  })

  const dietUnits = fullDietCount + halfDietCount * 0.5
  const allowance = (fullDietCount * settingsStore.fullDietPrice) + (halfDietCount * settingsStore.halfDietPrice)

  return {
    lunches,
    dinners,
    halfDietCount,
    fullDietCount,
    dietUnits,
    allowance
  }
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
}

const dietPriceSet = computed(() => settingsStore.fullDietPrice > 0 || settingsStore.halfDietPrice > 0)

const deleteRecord = (id: string) => {
  if (confirm('Are you sure you want to delete this record?')) {
    serviceStore.deleteRecord(id)
  }
}

const exportData = async () => {
  // TODO: Implement export
  await generateWordReport(filteredRecords.value)
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <h1 class="text-2xl font-bold">Service Records</h1>
      <div class="flex flex-wrap items-center gap-3">
        <UInputMenu
          v-model="selectedMonth"
          :options="monthOptions"
          placeholder="Tots els mesos"
          clearable
          class="min-w-[200px]"
        />
        <UButton to="/" icon="i-heroicons-arrow-left" variant="ghost">Back to Form</UButton>
        <UButton icon="i-heroicons-document-arrow-down" color="success" @click="exportData">Export Report</UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <UCard>
        <p class="text-sm text-gray-500 dark:text-gray-400">Preus dietes</p>
        <div class="space-y-3 mt-1">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Dieta completa</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ settingsStore.fullDietPrice > 0 ? formatCurrency(settingsStore.fullDietPrice) : 'Sense preu' }}
            </p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Mitja dieta</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ settingsStore.halfDietPrice > 0 ? formatCurrency(settingsStore.halfDietPrice) : 'Sense preu' }}
            </p>
          </div>
        </div>
        <UButton to="/settings" variant="ghost" size="xs" class="mt-4" icon="i-heroicons-cog-6-tooth">Configurar</UButton>
      </UCard>
      <UCard>
        <p class="text-sm text-gray-500 dark:text-gray-400">Dietes calculades</p>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white">
          {{ totals.dietUnits.toFixed(2) }}
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ totals.fullDietCount }} completes · {{ totals.halfDietCount }} mitges
        </p>
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
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Registres: {{ filteredRecords.length }}
            <span v-if="selectedMonth" class="block text-xs text-gray-400">
              Filtrat per {{ monthOptions.find(option => option.value === selectedMonth)?.label }}
            </span>
          </p>
        </div>
      </template>

      <UTable :data="filteredRecords" :columns="columns">
        <template #startTime-cell="{ row }">
          {{ formatDate((row.original as ServiceRecord).startTime) }}
        </template>
        <template #endTime-cell="{ row }">
          {{ formatDate((row.original as ServiceRecord).endTime) }}
        </template>
        <template #displacements-cell="{ row }">
          <ul class="list-disc list-inside text-sm">
            <li v-for="d in (row.original as ServiceRecord).displacements" :key="d.id">
              {{ d.municipality }}
            </li>
          </ul>
        </template>
        <template #diets-cell="{ row }">
          {{ getDiets((row.original as ServiceRecord).displacements) }}
        </template>
        <template #actions-cell="{ row }">
          <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" @click="deleteRecord((row.original as ServiceRecord).id)" />
        </template>
      </UTable>

      <div v-if="filteredRecords.length === 0" class="text-center py-8 text-gray-500">
        No records found for this period.
      </div>
    </UCard>
  </div>
</template>
