<script setup lang="ts">
import { storeToRefs } from 'pinia'

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

const selectedMonthLabel = computed(() => {
  if (showAllMonths.value) return `${t('common.all_months')} ${selectedYear.value}`
  const monthLabel = months.value.find(m => m.value === selectedMonthValue.value)?.label
  return `${monthLabel} ${selectedYear.value}`
})

const totalExpenses = computed(() =>
  selectedExpenses.value.reduce((sum, expense) => sum + (expense.amount || 0), 0))

// Only diet-eligible (food) expenses reduce the net balance; non-food expenses
// like parking or fuel are tracked but excluded.
const dietExpenses = computed(() =>
  selectedExpenses.value.reduce(
    (sum, expense) => sum + (expense.excludeFromBalance ? 0 : (expense.amount || 0)), 0))

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

const expenseListDescription = computed(() =>
  t('expenses.list_description', { month: selectedMonthLabel.value }))
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

    <!-- Expense List -->
    <section>
      <ExpenseList
        :title="$t('expenses.list_title')" :description="expenseListDescription"
        :expenses="selectedExpenses" />
    </section>
  </div>
</template>
