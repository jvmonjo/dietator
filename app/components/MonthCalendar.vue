<script setup lang="ts">
import { CalendarDate, type DateValue } from '@internationalized/date'

// Reusable month calendar: navigates months, highlights "marked" days (those
// with data) and lets the user pick a day. Data-agnostic — the parent supplies
// the marked days as `YYYY-MM-DD` strings and reacts to the selected day.
const { locale } = useI18n()

const props = withDefaults(defineProps<{
  modelValue?: Date | null
  markedDays?: string[]
  year: number
  month: number
  title?: string
}>(), {
  modelValue: null,
  markedDays: () => [],
  title: undefined
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date | null): void
  (e: 'update:year' | 'update:month', value: number): void
  (e: 'day-selected', value: Date): void
}>()

const markedSet = computed(() => new Set(props.markedDays))
const toKey = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// month can be 0 ("all"); fall back to the current month for the initial view.
const fallbackMonth = props.month && props.month !== 0 ? props.month : new Date().getMonth() + 1
const placeholder = ref(new CalendarDate(props.year, fallbackMonth, 1)) as Ref<DateValue>

watch(() => [props.year, props.month], ([newYear, newMonth]) => {
  const current = placeholder.value
  if (!('year' in current)) return
  const targetMonth = (newMonth && newMonth !== 0) ? newMonth : current.month
  const targetYear = newYear || current.year
  if (current.year !== targetYear || current.month !== targetMonth) {
    placeholder.value = new CalendarDate(targetYear, targetMonth, 1)
  }
})

watch(placeholder, (newVal) => {
  if ('year' in newVal && newVal.year !== props.year) emit('update:year', newVal.year)
  if ('month' in newVal && newVal.month !== props.month) emit('update:month', newVal.month)
})

const date = computed({
  get: () => {
    if (!props.modelValue) return undefined
    const d = props.modelValue
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  },
  set: (val: DateValue) => {
    if (!val || val.month !== placeholder.value.month) return
    const d = new Date(val.year, val.month - 1, val.day)
    const sel = props.modelValue
    // Clicking the already-selected day clears the filter.
    if (sel && sel.getFullYear() === d.getFullYear()
      && sel.getMonth() === d.getMonth() && sel.getDate() === d.getDate()) {
      emit('update:modelValue', null)
      return
    }
    emit('update:modelValue', d)
    emit('day-selected', d)
  }
})

const isCurrentMonth = (d: DateValue) => d.month === placeholder.value.month
const isMarked = (d: DateValue) => markedSet.value.has(toKey(d.year, d.month, d.day))
const isToday = (d: DateValue) => {
  const today = new Date()
  return d.day === today.getDate() && d.month === today.getMonth() + 1 && d.year === today.getFullYear()
}
const isSelected = (d: DateValue) => {
  const sel = props.modelValue
  return !!sel && sel.getDate() === d.day && sel.getMonth() + 1 === d.month && sel.getFullYear() === d.year
}

const goToToday = () => {
  const today = new Date()
  placeholder.value = new CalendarDate(today.getFullYear(), today.getMonth() + 1, 1)
}
const clearDay = () => emit('update:modelValue', null)
</script>

<template>
  <UCard>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
          {{ title || $t('components.calendar.title') }}
        </h3>
        <UButton size="xs" color="neutral" variant="ghost" @click="goToToday">
          {{ $t('components.calendar.today') }}
        </UButton>
      </div>
      <UButton
        v-if="modelValue" size="xs" color="neutral" variant="soft"
        icon="i-heroicons-x-mark-20-solid" @click="clearDay">
        {{ $t('components.month_calendar.clear_day') }}
      </UButton>
    </div>
    <div class="flex justify-center">
      <UCalendar v-model="date" v-model:placeholder="placeholder" :locale="locale" :fixed-weeks="false">
        <template #day="{ day }">
          <div
            class="w-full h-full flex items-center justify-center rounded-full relative" :class="[
              !isCurrentMonth(day) ? 'text-gray-300 dark:text-gray-700 pointer-events-none' : '',
              isCurrentMonth(day) && isMarked(day) ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold cursor-pointer' : '',
              isCurrentMonth(day) && isSelected(day) ? 'ring-2 ring-primary-500' : '',
              isCurrentMonth(day) && !isSelected(day) && isToday(day) ? 'ring-1 ring-gray-300 dark:ring-gray-600' : ''
            ]">
            {{ day.day }}
            <div
              v-if="isCurrentMonth(day) && isMarked(day)"
              class="absolute bottom-1 w-1 h-1 rounded-full bg-primary-500" />
          </div>
        </template>
      </UCalendar>
    </div>
  </UCard>
</template>
