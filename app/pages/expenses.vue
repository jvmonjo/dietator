<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  EXPENSE_CATEGORIES, CATEGORY_COLORS, resolveExpenseCategory, categoryCountsTowardBalance,
  type ExpenseCategory
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

// Category filter for the calendar + list. An empty selection shows every
// category; otherwise only the chosen ones. The statistics always summarise the
// whole month regardless of this filter.
const categoryFilter = ref<ExpenseCategory[]>([])
const categoryFilterItems = computed(() =>
  EXPENSE_CATEGORIES.map(value => ({ value, label: t(`expenses.categories.${value}`) })))

// Range of days selected on the calendar; filters the expense list. While only
// the start is set (end null) the list narrows to that single day.
const selectedRange = ref<{ start: Date | null, end: Date | null } | null>(null)

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

// Expenses narrowed by the category filter; drives the calendar marks and list.
const filteredExpenses = computed(() => {
  if (categoryFilter.value.length === 0) return selectedExpenses.value
  const selected = new Set(categoryFilter.value)
  return selectedExpenses.value.filter(e => selected.has(resolveExpenseCategory(e)))
})

// Days (within the selected month) that have at least one matching expense.
const markedDays = computed(() => {
  const keys = new Set<string>()
  filteredExpenses.value.forEach(expense => {
    const date = new Date(expense.timestamp)
    if (!Number.isNaN(date.getTime())) keys.add(dayKey(date))
  })
  return Array.from(keys)
})

// The list respects both the category filter and the calendar range filter.
// A range may span several months, so when one is active the list is built from
// every expense (across months/years) instead of the currently viewed month.
const listExpenses = computed(() => {
  const range = selectedRange.value
  if (!range || !range.start) return filteredExpenses.value
  // YYYY-MM-DD keys sort lexicographically in chronological order.
  const startKey = dayKey(range.start)
  const endKey = dayKey(range.end ?? range.start)
  const categories = categoryFilter.value.length ? new Set(categoryFilter.value) : null
  return expenses.value.filter(expense => {
    const date = new Date(expense.timestamp)
    if (Number.isNaN(date.getTime())) return false
    if (categories && !categories.has(resolveExpenseCategory(expense))) return false
    const key = dayKey(date)
    return key >= startKey && key <= endKey
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

// Diet and non-diet expenses are kept separate: diet ones are offset by the
// per-diem, the rest go to a different account, so the totals are never merged.
const dietItems = computed(() =>
  selectedExpenses.value.filter(e => categoryCountsTowardBalance(resolveExpenseCategory(e))))
const otherItems = computed(() =>
  selectedExpenses.value.filter(e => !categoryCountsTowardBalance(resolveExpenseCategory(e))))

const sumAmount = (items: { amount?: number }[]) =>
  items.reduce((sum, e) => sum + (e.amount || 0), 0)

const dietExpenses = computed(() => sumAmount(dietItems.value))
const otherExpenses = computed(() => sumAmount(otherItems.value))

// Distinct local days that have at least one diet expense (the daily average is
// about diet spending only).
const dietExpenseDays = computed(() => {
  const days = new Set<string>()
  dietItems.value.forEach(expense => {
    const date = new Date(expense.timestamp)
    if (!Number.isNaN(date.getTime())) days.add(dayKey(date))
  })
  return days.size
})

const averageDailyDiet = computed(() => {
  if (dietExpenseDays.value === 0) return 0
  return dietExpenses.value / dietExpenseDays.value
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
  const range = selectedRange.value
  if (range?.start) {
    const startLabel = range.start.toLocaleDateString(locale.value)
    if (!range.end || range.end.getTime() === range.start.getTime()) {
      return t('expenses.list_description_day', { day: startLabel })
    }
    return t('expenses.list_description_range', {
      start: startLabel,
      end: range.end.toLocaleDateString(locale.value)
    })
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
          <USelectMenu
            v-model="categoryFilter" :items="categoryFilterItems" multiple
            label-key="label" value-key="value" icon="i-heroicons-tag"
            :placeholder="$t('expenses.all_categories')"
            class="w-full col-span-2 sm:col-span-1 sm:min-w-[150px]" />
        </div>
      </div>
    </section>

    <!-- Calendar (mimics the services view: on top, filled with expenses) -->
    <section>
      <MonthCalendar
        v-model:range-value="selectedRange" range :title="$t('expenses.calendar_title')"
        :marked-days="markedDays" :year="selectedYear" :month="calendarMonth"
        @update:year="selectedYear = $event" @update:month="selectedMonthValue = $event" />
    </section>

    <!-- Expense List (just below the calendar) -->
    <section>
      <ExpenseList
        :title="$t('expenses.list_title')" :description="expenseListDescription"
        :expenses="listExpenses" />
    </section>

    <!-- Statistics (at the bottom) -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {{ $t('expenses.stats.diet_total') }}
          </div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatCurrency(dietExpenses) }}</div>
          <p class="text-xs text-gray-400">
            {{ $t('expenses.stats.count', { count: dietItems.length }) }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {{ $t('expenses.stats.other_total') }}
          </div>
          <div class="text-3xl font-bold text-gray-700 dark:text-gray-200 mt-2">{{ formatCurrency(otherExpenses) }}</div>
          <p class="text-xs text-gray-400">
            {{ $t('expenses.stats.other_total_subtitle', { count: otherItems.length }) }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center space-y-1">
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {{ $t('expenses.stats.daily_average') }}
          </div>
          <div class="text-3xl font-bold text-primary-500 mt-2">{{ formatCurrency(averageDailyDiet) }}</div>
          <p class="text-xs text-gray-400">
            {{ $t('expenses.stats.daily_average_subtitle', { days: dietExpenseDays }) }}
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
  </div>
</template>
