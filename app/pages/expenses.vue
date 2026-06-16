<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  EXPENSE_CATEGORIES, CATEGORY_COLORS, resolveExpenseCategory, categoryCountsTowardBalance
} from '~/utils/expenseCategories'

const expenseStore = useExpenseStore()
const { expenses } = storeToRefs(expenseStore)
const { t, locale } = useI18n()
const { getRecordsForMonth, calculateTotals } = useServiceStats()

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
  expenses.value.forEach(expense => {
    const date = new Date(expense.timestamp)
    if (!Number.isNaN(date.getTime())) years.add(date.getFullYear())
  })
  return Array.from(years).sort((a, b) => b - a)
})

const showAllMonths = computed(() => selectedMonthValue.value === 0)

// Day selected on the calendar; filters the expense list to a single day.
const selectedDay = ref<Date | null>(null)

// Reset the day filter whenever the month/year selection changes.
watch([selectedYear, selectedMonthValue], () => {
  selectedDay.value = null
})

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

// Timestamps are stored in UTC; new Date() converts to local time for filtering,
// so months/days line up with what the user sees in the UI.
const selectedExpenses = computed(() => {
  return expenses.value.filter(expense => {
    const date = new Date(expense.timestamp)
    if (Number.isNaN(date.getTime())) return false
    if (date.getFullYear() !== selectedYear.value) return false
    if (!showAllMonths.value && date.getMonth() + 1 !== selectedMonthValue.value) return false
    return true
  })
})

// Days (within the selected month) that have at least one expense, for the calendar.
const markedDays = computed(() => {
  const keys = new Set<string>()
  selectedExpenses.value.forEach(expense => {
    const date = new Date(expense.timestamp)
    if (!Number.isNaN(date.getTime())) keys.add(dayKey(date))
  })
  return Array.from(keys)
})

// The list respects the calendar day filter when one is set.
const listExpenses = computed(() => {
  if (!selectedDay.value) return selectedExpenses.value
  const key = dayKey(selectedDay.value)
  return selectedExpenses.value.filter(expense => {
    const date = new Date(expense.timestamp)
    return !Number.isNaN(date.getTime()) && dayKey(date) === key
  })
})

// Per-category totals for the selected period (only categories with expenses).
const categoryTotals = computed(() => {
  const totals = new Map<string, { total: number, count: number }>()
  selectedExpenses.value.forEach(expense => {
    const category = resolveExpenseCategory(expense)
    const entry = totals.get(category) || { total: 0, count: 0 }
    entry.total += expense.amount || 0
    entry.count += 1
    totals.set(category, entry)
  })
  return EXPENSE_CATEGORIES
    .filter(category => totals.has(category))
    .map(category => ({
      category,
      color: CATEGORY_COLORS[category],
      label: t(`expenses.categories.${category}`),
      ...totals.get(category)!
    }))
})

const selectedMonthLabel = computed(() => {
  if (showAllMonths.value) return `${t('common.all_months')} ${selectedYear.value}`
  const monthLabel = months.value.find(m => m.value === selectedMonthValue.value)?.label
  return `${monthLabel} ${selectedYear.value}`
})

const totalExpenses = computed(() =>
  selectedExpenses.value.reduce((sum, expense) => sum + (expense.amount || 0), 0))

// Only diet-category expenses reduce the net balance; other categories
// (parking, fuel, tolls…) are tracked but excluded.
const dietExpenses = computed(() =>
  selectedExpenses.value.reduce(
    (sum, expense) => sum + (categoryCountsTowardBalance(resolveExpenseCategory(expense)) ? (expense.amount || 0) : 0), 0))

// Number of distinct local days that have at least one expense.
const expenseDays = computed(() => {
  const days = new Set<string>()
  selectedExpenses.value.forEach(expense => {
    const date = new Date(expense.timestamp)
    if (Number.isNaN(date.getTime())) return
    days.add(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`)
  })
  return days.size
})

const averageDailyExpense = computed(() => {
  if (expenseDays.value === 0) return 0
  return totalExpenses.value / expenseDays.value
})

// Diet allowance accrued during the same period, used to compute the net balance.
// A diet is not meant to earn money, only to offset expenses, so this is a balance.
const dietAllowance = computed(() => {
  let records
  if (showAllMonths.value) {
    records = getRecordsForMonth(null, selectedYear.value)
  } else {
    const monthValue = `${selectedYear.value}-${String(selectedMonthValue.value).padStart(2, '0')}`
    records = getRecordsForMonth(monthValue)
  }
  return calculateTotals(records).allowance
})

const netBalance = computed(() => dietAllowance.value - dietExpenses.value)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'EUR' }).format(value || 0)

const expenseListDescription = computed(() => {
  if (selectedDay.value) {
    return t('expenses.list_description_day', { day: selectedDay.value.toLocaleDateString(locale.value) })
  }
  return t('expenses.list_description', { month: selectedMonthLabel.value })
})

// The calendar navigates a concrete month; fall back to the current month when
// "all months" is selected. Navigating it narrows the selection to that month.
const calendarMonth = computed(() => showAllMonths.value ? new Date().getMonth() + 1 : selectedMonthValue.value)
</script>

<template>
  <div class="space-y-8">
    <section>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ $t('expenses.title') }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('expenses.subtitle') }}</p>
        </div>
        <div class="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full sm:w-auto">
          <USelect
            v-model="selectedMonthValue" :items="months" option-attribute="label" value-attribute="value"
            class="w-full sm:min-w-[140px]" />
          <USelect v-model="selectedYear" :items="availableYears" class="w-full sm:w-[100px]" />
        </div>
      </div>
    </section>

    <!-- Statistics -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {{ $t('expenses.stats.total') }}
          </div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatCurrency(totalExpenses) }}</div>
          <p class="text-xs text-gray-400">
            {{ $t('expenses.stats.count', { count: selectedExpenses.length }) }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {{ $t('expenses.stats.daily_average') }}
          </div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatCurrency(averageDailyExpense) }}</div>
          <p class="text-xs text-gray-400">
            {{ $t('expenses.stats.daily_average_subtitle', { days: expenseDays }) }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {{ $t('expenses.stats.net_balance') }}
          </div>
          <div
            class="text-3xl font-bold mt-2"
            :class="netBalance >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ formatCurrency(netBalance) }}
          </div>
          <p class="text-xs text-gray-400">
            {{ $t('expenses.stats.net_balance_subtitle', {
              diet: formatCurrency(dietAllowance), food: formatCurrency(dietExpenses) }) }}
          </p>
        </div>
      </UCard>
    </section>

    <!-- Per-category breakdown -->
    <section v-if="categoryTotals.length">
      <UCard>
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4">
          {{ $t('expenses.stats.by_category') }}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="entry in categoryTotals" :key="entry.category"
            class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
            <div class="flex items-center gap-2 min-w-0">
              <UBadge :color="entry.color" variant="soft" size="xs">{{ entry.label }}</UBadge>
              <span class="text-xs text-gray-400">{{ $t('expenses.stats.count', { count: entry.count }) }}</span>
            </div>
            <span class="font-semibold text-gray-900 dark:text-white whitespace-nowrap">{{ formatCurrency(entry.total) }}</span>
          </div>
        </div>
      </UCard>
    </section>

    <!-- Calendar -->
    <section>
      <MonthCalendar
        v-model="selectedDay" :title="$t('expenses.calendar_title')" :marked-days="markedDays"
        :year="selectedYear" :month="calendarMonth"
        @update:year="selectedYear = $event" @update:month="selectedMonthValue = $event" />
    </section>

    <!-- Expense List -->
    <section>
      <ExpenseList
        :title="$t('expenses.list_title')" :description="expenseListDescription"
        :expenses="listExpenses" />
    </section>
  </div>
</template>
