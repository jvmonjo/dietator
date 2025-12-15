<script setup lang="ts">
import type { MonthOption } from '~/composables/useServiceStats'
import type { ServiceRecord } from '~/stores/services'
import { generateWordReport } from '~/utils/export'

const settingsStore = useSettingsStore()
const toast = useToast()
const { calculateTotals } = useServiceStats()

const filteredRecords = ref<ServiceRecord[]>([])
const selectedMonth = ref<MonthOption | null>(null)

const totals = computed(() => calculateTotals(filteredRecords.value))
const serviceTableDescription = computed(() => `Dinars: ${totals.value.lunches} | Sopars: ${totals.value.dinners}`)

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
}

const dietPriceSet = computed(() => settingsStore.fullDietPrice > 0 || settingsStore.halfDietPrice > 0)
const hasSelectedMonth = computed(() => Boolean(selectedMonth.value))

const handleRecordsChange = (payload: { records: ServiceRecord[], month: MonthOption | null }) => {
  filteredRecords.value = payload.records
  selectedMonth.value = payload.month
}

const exportData = async () => {
  if (!selectedMonth.value) {
    toast.add({ title: 'Selecciona un mes', color: 'warning' })
    return
  }

  if (!settingsStore.monthlyTemplate && !settingsStore.serviceTemplate) {
    toast.add({ title: 'Configura una plantilla Word abans d\'exportar', color: 'warning' })
    return
  }

  if (filteredRecords.value.length === 0) {
    toast.add({ title: 'No hi ha serveis per al mes seleccionat', color: 'info' })
    return
  }

  try {
    await generateWordReport({
      records: filteredRecords.value,
      totals: totals.value,
      month: selectedMonth.value,
      settings: {
        halfDietPrice: settingsStore.halfDietPrice,
        fullDietPrice: settingsStore.fullDietPrice,
        originProvince: settingsStore.originProvince,
        originMunicipality: settingsStore.originMunicipality
      },
      templates: {
        monthly: settingsStore.monthlyTemplate,
        service: settingsStore.serviceTemplate
      }
    })
    toast.add({ title: 'Documents generats correctament', color: 'success' })
  } catch (error) {
    console.error(error)
    toast.add({ title: 'No s\'han pogut generar els documents', color: 'error' })
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <h1 class="text-2xl font-bold">Service Records</h1>
      <div class="flex flex-wrap items-center gap-3">
        <UButton to="/" icon="i-heroicons-arrow-left" variant="ghost">Back to Form</UButton>
        <UButton
          icon="i-heroicons-document-arrow-down"
          color="success"
          :disabled="!hasSelectedMonth"
          @click="exportData"
        >
          Export Report
        </UButton>
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

    <ServiceList
      title="Detall de serveis"
      :description="serviceTableDescription"
      :enable-edit="false"
      :enable-delete="true"
      @records-change="handleRecordsChange"
    />
  </div>
</template>
