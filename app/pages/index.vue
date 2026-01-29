<script setup lang="ts">
import type { MonthOption } from '~/composables/useServiceStats'
import type { ServiceRecord } from '~/stores/services'
import { generateWordReport } from '~/utils/export'

const settingsStore = useSettingsStore()
const externalCalendar = useExternalCalendarStore()
const toast = useToast()
const { t, locale } = useI18n()
const { calculateTotals, currentMonthValue, monthOptions, getRecordsForMonth } = useServiceStats()


// Month/Year Selection Logic
const months = computed(() => [
  { value: 0, label: t('months.0') },
  { value: 1, label: t('months.1') },
  { value: 2, label: t('months.2') },
  { value: 3, label: t('months.3') },
  { value: 4, label: t('months.4') },
  { value: 5, label: t('months.5') },
  { value: 6, label: t('months.6') },
  { value: 7, label: t('months.7') },
  { value: 8, label: t('months.8') },
  { value: 9, label: t('months.9') },
  { value: 10, label: t('months.10') },
  { value: 11, label: t('months.11') },
  { value: 12, label: t('months.12') }
])

const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const selectedMonthValue = ref(new Date().getMonth() + 1)

const availableYears = computed(() => {
  const years = new Set([currentYear])
  monthOptions.value.forEach(opt => {
    const [y] = opt.value.split('-')
    years.add(Number(y))
  })
  return Array.from(years).sort((a, b) => b - a)
})

const activeMonth = computed<MonthOption | null>(() => {
  if (selectedMonthValue.value === 0) return null
  const monthLabel = months.value.find(m => m.value === selectedMonthValue.value)?.label
  return {
    value: `${selectedYear.value}-${String(selectedMonthValue.value).padStart(2, '0')}`,
    label: `${monthLabel} ${selectedYear.value}`
  }
})

const showAllMonths = computed(() => selectedMonthValue.value === 0)
const selectedMonth = computed(() => activeMonth.value) // Alias for compatibility

const selectedRecords = computed(() => {
  return getRecordsForMonth(activeMonth.value?.value ?? null)
})

const selectionTotals = computed(() => calculateTotals(selectedRecords.value))

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'EUR' }).format(value || 0)
}

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

const formatHours = (value: number) => {
  return `${new Intl.NumberFormat(locale.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value || 0)} h`
}
const formatWeeks = (value: number) => {
  return new Intl.NumberFormat(locale.value, { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(value || 0)
}

const selectedMonthLabel = computed(() => {
  if (showAllMonths.value) return t('common.all_months')
  return activeMonth.value?.label ?? t('common.current_month')
})
const hasTemplates = computed(() => Boolean(settingsStore.monthlyTemplate || settingsStore.serviceTemplate))
const dietPriceSet = computed(() => settingsStore.fullDietPrice > 0 || settingsStore.halfDietPrice > 0)
const canExportReport = computed(() => Boolean(activeMonth.value) && selectedRecords.value.length > 0 && hasTemplates.value)
const serviceListDescription = computed(() => `${t('home.lunches', { count: selectionTotals.value.lunches })} | ${t('home.dinners', { count: selectionTotals.value.dinners })}`)

const exportReport = async () => {
  if (!selectedMonth.value) {
    toast.add({ title: t('errors.select_month_export'), color: 'warning' })
    return
  }

  if (selectedRecords.value.length === 0) {
    toast.add({ title: t('errors.no_services_month'), color: 'info' })
    return
  }

  if (!hasTemplates.value) {
    toast.add({ title: t('errors.configure_template'), color: 'warning' })
    return
  }

  try {
    const result = await generateWordReport({
      records: selectedRecords.value,
      totals: selectionTotals.value,
      month: selectedMonth.value,
      settings: {
        halfDietPrice: settingsStore.halfDietPrice,
        fullDietPrice: settingsStore.fullDietPrice,
        firstName: settingsStore.firstName,
        lastName: settingsStore.lastName,
        nationalId: settingsStore.nationalId
      },
      templates: {
        monthly: settingsStore.monthlyTemplate,
        service: settingsStore.serviceTemplate
      }
    })

    if (!result) return

    const { blob, filename } = result
    const file = new File([blob], filename, { type: blob.type })

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file]
        })
        toast.add({ title: 'Documents compartits correctament', color: 'success' })
        return
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Continue to fallback
          if ((err as Error).name === 'NotAllowedError') {
            toast.add({ title: t('errors.share_not_allowed'), color: 'info' })
          }
        } else {
          // User cancelled share
          return
        }
      }
    }

    // Fallback download
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    toast.add({ title: t('success.documents_exported'), color: 'success' })

  } catch (error) {
    console.error(error)
    toast.add({ title: t('errors.documents_generation_failed'), color: 'error' })
  }
}
const showWelcome = ref(true)

const dismissWelcome = () => {
  showWelcome.value = false
  try {
    localStorage.setItem('dietator_welcome_dismissed', 'true')
  } catch {
    // Ignore storage errors
  }
}

const serviceListRef = ref()

const handleRecordSelected = (record: ServiceRecord) => {
  if (serviceListRef.value) {
    serviceListRef.value.openRecord(record)
  }
}

const handleDateSelected = (date: Date) => {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const events = externalCalendar.getEventsForDate(dateStr) // Now returns GoogleEvent objects

  if (!events || events.length === 0) {
    if (serviceListRef.value) {
      serviceListRef.value.openNewService(date)
    }
    return
  }


  // Explicitly format to local time string for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatLocalTime = (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  // Calculate Start/End times
  // We assume events are sorted by start time, but let's be safe
  const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  // Filter out all-day events for time calculation to avoid skewing start/end times
  const timedEvents = sortedEvents.filter(e => !e.isAllDay)

  let startTime = ''
  let endTime = ''

  if (timedEvents.length > 0) {
    const firstEvent = timedEvents[0]!
    const lastEvent = timedEvents.reduce((latest, current) => {
      // Ensure 'latest' is defined (it is initiated with firstEvent)
      return new Date(current.end) > new Date(latest.end) ? current : latest
    }, firstEvent)

    startTime = formatLocalTime(new Date(firstEvent.start))
    endTime = formatLocalTime(new Date(lastEvent.end))
  }

  // Create a simple list of all events for the notes field
  const notesLines: string[] = []

  sortedEvents.forEach(e => {
    let timeStr = ''
    if (e.isAllDay) {
      timeStr = t('home.all_day')
    } else {
      const parts = formatLocalTime(new Date(e.start)).split('T')
      timeStr = parts[1] || ''
    }

    if (e.location) {
      notesLines.push(`- [${timeStr}] ${e.summary} (📍 ${e.location})`)
    } else {
      notesLines.push(`- [${timeStr}] ${e.summary}`)
    }
  })

  // Join all lines
  const notes = notesLines.length > 0
    ? `${t('home.events_of_day')}:\n` + notesLines.join('\n')
    : ''

  // Open the service form with pre-filled notes and empty displacements
  if (serviceListRef.value) {
    serviceListRef.value.openNewService(date, notes, startTime, endTime, [])
  }
}

onMounted(() => {
  try {
    if (localStorage.getItem('dietator_welcome_dismissed') === 'true') {
      showWelcome.value = false
    }
  } catch {
    // Ignore storage errors
  }
})
</script>

<template>
  <div class="space-y-8">
    <!-- Hero Section -->
    <div
v-if="showWelcome"
      class="relative bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 sm:p-12">
      <UButton
icon="i-heroicons-x-mark" color="neutral" variant="ghost" class="absolute top-4 right-4"
        @click="dismissWelcome" />
      <section class="text-center space-y-4">
        <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {{ $t('home.welcome.title') }} <span class="text-primary-500">Dietator</span>
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {{ $t('home.welcome.description') }}
        </p>
      </section>
    </div>

    <UAlert
v-if="!dietPriceSet" color="warning" icon="i-heroicons-exclamation-triangle" variant="subtle"
      :title="$t('home.alerts.price_missing.title')" :description="$t('home.alerts.price_missing.description')" />

    <!-- Calendar View -->
    <section>
      <CalendarWidget
:records="selectedRecords" :year="selectedYear" :month="selectedMonthValue"
        @update:year="selectedYear = $event" @update:month="selectedMonthValue = $event"
        @record-selected="handleRecordSelected" @date-selected="handleDateSelected" />
    </section>

    <!-- Registered Services -->
    <section>
      <ServiceList
ref="serviceListRef" :title="$t('home.stats.services')" :description="serviceListDescription"
        :records="selectedRecords" />
    </section>

    <!-- Docs Generator-->
    <section>
      <UCard>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('home.documents.title') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('home.documents.selected_month') }}: <strong>{{ selectedMonthLabel }}</strong> — {{
                $t('home.documents.services_count', { count: selectedRecords.length }) }}
            </p>
            <p class="text-xs text-gray-400">
              {{ $t('home.documents.diets_types', {
                full: selectionTotals.fullDietCount, half:
                  selectionTotals.halfDietCount
              }) }}
            </p>
            <p class="text-xs text-gray-400">
              {{ $t('home.documents.kilometers') }}: <strong>{{ selectionTotals.kilometers?.toLocaleString(locale) ?? 0
                }}
                km</strong>
            </p>
            <p v-if="!hasTemplates" class="text-xs text-red-500 dark:text-red-400">
              {{ $t('home.documents.missing_templates') }}
            </p>
          </div>
          <div class="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full sm:w-auto">
            <USelect
v-model="selectedMonthValue" :items="months" option-attribute="label" value-attribute="value"
              class="w-full sm:min-w-[140px]" />
            <USelect v-model="selectedYear" :items="availableYears" class="w-full sm:w-[100px]" />
            <UButton
icon="i-heroicons-share" color="primary" :disabled="!canExportReport"
              class="col-span-2 sm:w-auto flex justify-center" @click="exportReport">
              {{ $t('common.export') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </section>

    <!-- Worked Hours -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {{ $t('home.stats.worked_hours') }} {{ selectedMonthLabel.toLowerCase() }}
          </div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatHours(totalHoursWorked) }}</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{
            $t('home.stats.weekly_average') }}</div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatHours(averageWeeklyHours) }}</div>
          <p class="text-xs text-gray-400">
            {{ $t('home.stats.weekly_average_subtitle', {
              weeks: formatWeeks(weeksInSelectedMonth), month:
                selectedMonthLabel.toLowerCase()
            }) }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{
            $t('home.stats.service_average') }}</div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatHours(averageHoursPerService) }}</div>
          <p class="text-xs text-gray-400">
            {{ $t('home.stats.service_average_subtitle', { count: selectionTotals.serviceCount }) }}
          </p>
        </div>
      </UCard>
    </section>

    <!-- Quick Stats -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {{ $t('home.stats.services') }} {{ selectedMonthLabel.toLowerCase() }}
          </div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ selectionTotals.serviceCount }}</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('home.stats.diets') }} {{
            selectedMonthLabel.toLowerCase() }}</div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatCurrency(selectionTotals.allowance || 0) }}
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{
            $t('home.stats.configured_prices') }}</div>
          <p class="text-base text-gray-800 dark:text-gray-200">{{ $t('home.stats.full') }}: {{
            formatCurrency(settingsStore.fullDietPrice || 0) }}</p>
          <p class="text-base text-gray-800 dark:text-gray-200">{{ $t('home.stats.half') }}: {{
            formatCurrency(settingsStore.halfDietPrice || 0) }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ $t('home.stats.kilometers')
          }}</div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ selectionTotals.kilometers?.toLocaleString(locale)
            ?? 0 }} <span class="text-sm font-normal text-gray-500">km</span></div>
          <p class="text-xs text-gray-400">
            {{ $t('home.stats.kilometers_average', {
              avg: averageKmPerService.toLocaleString(locale, {
                maximumFractionDigits: 1
              })
            }) }}
          </p>
        </div>
      </UCard>

      <!-- Year in Review Card -->
      <UCard
v-if="new Date().getMonth() >= 10 || new Date().getMonth() <= 1"
        class="cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all group relative overflow-hidden"
        @click="navigateTo('/wrapped')">
        <!-- Background Decoration -->
        <div
          class="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

        <div class="text-center space-y-2 relative z-10">
          <div
            class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center justify-center gap-1">
            <UIcon name="i-heroicons-sparkles" class="text-yellow-500 w-4 h-4" />
            {{ $t('home.wrapped.annual_summary') }}
          </div>
          <div class="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">
            {{ $t('home.wrapped.your_year', { year: new Date().getFullYear() }) }}
          </div>
          <p class="text-xs text-gray-400">
            {{ $t('home.wrapped.discover') }}
          </p>
        </div>
      </UCard>
    </section>

  </div>
</template>
