<script setup lang="ts">
import type { MonthOption } from '~/composables/useServiceStats'
import type { ServiceRecord } from '~/stores/services'
import { generateWordReport } from '~/utils/export'

const settingsStore = useSettingsStore()
const toast = useToast()
const { calculateTotals, currentMonthValue, monthOptions, getRecordsForMonth } = useServiceStats()

const monthFormatter = new Intl.DateTimeFormat('ca-ES', { year: 'numeric', month: 'long' })
const extendedMonthOptions = computed<MonthOption[]>(() => {
  const options = monthOptions.value.slice()
  const hasCurrent = options.some(option => option.value === currentMonthValue.value)
  if (!hasCurrent && currentMonthValue.value) {
    const [yearStr, monthStr] = currentMonthValue.value.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (Number.isFinite(year) && Number.isFinite(month)) {
      const fallbackDate = new Date(year, month - 1, 1)
      options.push({
        value: currentMonthValue.value,
        label: monthFormatter.format(fallbackDate)
      })
    }
  }
  return options.sort((a, b) => (a.value < b.value ? 1 : -1))
})

const selectedMonth = ref<MonthOption | undefined>()
const showAllMonths = ref(false)

watch(extendedMonthOptions, (options) => {
  if (!showAllMonths.value && !selectedMonth.value) {
    selectedMonth.value = options.find(option => option.value === currentMonthValue.value) ?? options[0]
  }
}, { immediate: true })

const activeMonth = computed<MonthOption | null>(() => {
  if (showAllMonths.value) {
    return null
  }
  if (!selectedMonth.value) {
    return extendedMonthOptions.value.find(option => option.value === currentMonthValue.value) ?? null
  }
  return selectedMonth.value
})

const selectedRecords = computed(() => {
    return getRecordsForMonth(activeMonth.value?.value ?? null)
})

const selectionTotals = computed(() => calculateTotals(selectedRecords.value))

const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const formatCurrency = (value: number) => currencyFormatter.format(value || 0)

const HOURS_PER_MS = 1 / (1000 * 60 * 60)
interface ParsedMonth {
  year: number
  month: number
}

const parseMonthValueFromString = (value?: string | null): ParsedMonth | null => {
  if (!value) return null
  const [yearStr, monthStr] = value.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null
  if (month < 1 || month > 12) return null
  return { year, month }
}

const calculateRecordDurationMs = (record: ServiceRecord) => {
  const start = new Date(record.startTime)
  const end = new Date(record.endTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, end.getTime() - start.getTime())
}

const getWeeksInMonth = (value?: string | null) => {
  const targetValue = value ?? currentMonthValue.value
  const parsed = parseMonthValueFromString(targetValue)
  if (!parsed) return 1

  const lastDay = new Date(parsed.year, parsed.month, 0)
  const daysInMonth = lastDay.getDate()
  return Math.max(1, daysInMonth / 7)
}

const totalHoursWorked = computed(() => {
  const totalMs = selectedRecords.value.reduce((sum, record) => sum + calculateRecordDurationMs(record), 0)
  return totalMs * HOURS_PER_MS
})

const weeksInSelectedMonth = computed(() => getWeeksInMonth(activeMonth.value?.value ?? currentMonthValue.value))
const averageWeeklyHours = computed(() => {
  if (weeksInSelectedMonth.value <= 0) return 0
  return totalHoursWorked.value / weeksInSelectedMonth.value
})

const averageHoursPerService = computed(() => {
  if (selectionTotals.value.serviceCount <= 0) return 0
  return totalHoursWorked.value / selectionTotals.value.serviceCount
})

const averageKmPerService = computed(() => {
  if (selectionTotals.value.serviceCount <= 0) return 0
  return (selectionTotals.value.kilometers || 0) / selectionTotals.value.serviceCount
})

const hoursFormatter = new Intl.NumberFormat('ca-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const weeksFormatter = new Intl.NumberFormat('ca-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
const formatHours = (value: number) => `${hoursFormatter.format(value || 0)} h`
const formatWeeks = (value: number) => weeksFormatter.format(value || 0)

const selectedMonthLabel = computed(() => {
    if (showAllMonths.value) return 'Tots els mesos'
    return activeMonth.value?.label ?? 'Mes actual'
})
const hasTemplates = computed(() => Boolean(settingsStore.monthlyTemplate || settingsStore.serviceTemplate))
const dietPriceSet = computed(() => settingsStore.fullDietPrice > 0 || settingsStore.halfDietPrice > 0)
const canExportReport = computed(() => Boolean(activeMonth.value) && selectedRecords.value.length > 0 && hasTemplates.value)
const serviceListDescription = computed(() => `Dinars: ${selectionTotals.value.lunches} | Sopars: ${selectionTotals.value.dinners}`)

const handleMonthChange = (value: MonthOption | null | undefined) => {
  if (!value) {
    showAllMonths.value = true
    selectedMonth.value = undefined
  } else {
    showAllMonths.value = false
    selectedMonth.value = value
  }
}

const exportReport = async () => {
  if (!selectedMonth.value) {
    toast.add({ title: 'Selecciona un mes per exportar', color: 'warning' })
    return
  }

  if (selectedRecords.value.length === 0) {
    toast.add({ title: 'No hi ha serveis per al mes seleccionat', color: 'info' })
    return
  }

  if (!hasTemplates.value) {
    toast.add({ title: 'Configura una plantilla Word abans d\'exportar', color: 'warning' })
    return
  }

  try {
    await generateWordReport({
      records: selectedRecords.value,
      totals: selectionTotals.value,
      month: selectedMonth.value,
      settings: {
        halfDietPrice: settingsStore.halfDietPrice,
        fullDietPrice: settingsStore.fullDietPrice
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
  <div class="space-y-8">
    <!-- Hero Section -->
    <section class="text-center space-y-4 py-8">
      <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        Benvingut a <span class="text-primary-500">Dietator</span>
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        Gestiona els teus serveis i dietes de manera eficient. Funciona sense connexió a internet. Ara pots afegir també serveis sense dieta.
      </p>
    </section>

    <UAlert
      v-if="!dietPriceSet"
      color="warning"
      icon="i-heroicons-exclamation-triangle"
      variant="subtle"
      title="Afegeix el preu de la dieta"
      description="Configura el preu per poder calcular correctament els totals i generar informes."
    />

    <section>
      <UCard>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Generar informe Word</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Mes seleccionat: <strong>{{ selectedMonthLabel }}</strong> — {{ selectedRecords.length }} serveis
            </p>
            <p class="text-xs text-gray-400">
              Dietes: {{ selectionTotals.fullDietCount }} completes · {{ selectionTotals.halfDietCount }} mitges
            </p>
            <p class="text-xs text-gray-400">
              Kilòmetres: <strong>{{ selectionTotals.kilometers?.toLocaleString('ca-ES') ?? 0 }} km</strong>
            </p>
            <p v-if="!hasTemplates" class="text-xs text-red-500 dark:text-red-400">
              S'ha de pujar una plantilla mensual o per servei des de Configuració.
            </p>
          </div>
          <div class="flex items-center gap-3">
             <UInputMenu
               :model-value="showAllMonths ? undefined : selectedMonth"
               :items="extendedMonthOptions"
               placeholder="Selecciona un mes"
               clearable
               class="min-w-[200px]"
               @update:model-value="handleMonthChange"
             />
            <UButton
              icon="i-heroicons-document-arrow-down"
              color="primary"
              :disabled="!canExportReport"
              @click="exportReport"
            >
              Generar informe
            </UButton>
          </div>
        </div>
      </UCard>
    </section>

    <!-- Registered Services -->
    <section>
      <ServiceList
        title="Serveis registrats"
        :description="serviceListDescription"
        :records="selectedRecords"
      />
    </section>

    <!-- Worked Hours -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Hores treballades {{ selectedMonthLabel.toLowerCase() }}
          </div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatHours(totalHoursWorked) }}</div>
          <p class="text-xs text-gray-400">
            No inclou dies sense dieta
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mitjana setmanal</div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatHours(averageWeeklyHours) }}</div>
          <p class="text-xs text-gray-400">
            Mitjana de {{ formatWeeks(weeksInSelectedMonth) }} setmanes de {{ selectedMonthLabel.toLowerCase() }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mitjana per servei</div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatHours(averageHoursPerService) }}</div>
          <p class="text-xs text-gray-400">
            Mitjana basada en {{ selectionTotals.serviceCount }} serveis
          </p>
        </div>
      </UCard>
    </section>

    <!-- Quick Stats -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Serveis {{ selectedMonthLabel.toLowerCase() }}
          </div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ selectionTotals.serviceCount }}</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Import {{ selectedMonthLabel.toLowerCase() }}</div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatCurrency(selectionTotals.allowance || 0) }}</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Preus configurats</div>
          <p class="text-base text-gray-800 dark:text-gray-200">Completa: {{ formatCurrency(settingsStore.fullDietPrice || 0) }}</p>
          <p class="text-base text-gray-800 dark:text-gray-200">Mitja: {{ formatCurrency(settingsStore.halfDietPrice || 0) }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kilòmetres</div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ selectionTotals.kilometers?.toLocaleString('ca-ES') ?? 0 }} <span class="text-sm font-normal text-gray-500">km</span></div>
          <p class="text-xs text-gray-400">
             Mitjana: {{ averageKmPerService.toLocaleString('ca-ES', { maximumFractionDigits: 1 }) }} km/servei
          </p>
        </div>
      </UCard>
    </section>

  </div>
</template>
