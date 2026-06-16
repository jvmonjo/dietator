<script setup lang="ts">
import { CalendarDate, type DateValue } from '@internationalized/date'

// Reusable month calendar: navigates months, highlights "marked" days (those
// with data) and lets the user pick a day or a range of days. Data-agnostic —
// the parent supplies the marked days as `YYYY-MM-DD` strings and reacts to the
// selection.
//
// Two selection modes:
//  - single (default): `v-model` is a single Date (or null).
//  - range (`range` prop): `v-model:range` is a { start, end } pair. The first
//    click sets the start, the second completes the range, a further click
//    starts a new one. While only the start is set, `end` is null.
const { locale } = useI18n()

export interface DateRange {
  start: Date | null
  end: Date | null
}

const props = withDefaults(defineProps<{
  modelValue?: Date | null
  range?: boolean
  rangeValue?: DateRange | null
  markedDays?: string[]
  year: number
  month: number
  title?: string
}>(), {
  modelValue: null,
  range: false,
  rangeValue: null,
  markedDays: () => [],
  title: undefined
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date | null): void
  (e: 'update:rangeValue', value: DateRange | null): void
  (e: 'update:year' | 'update:month', value: number): void
  (e: 'day-selected', value: Date): void
  (e: 'range-selected', value: DateRange): void
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

const toDate = (val: DateValue) => new Date(val.year, val.month - 1, val.day)
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// Handle a click while in range mode, building the { start, end } pair.
const selectRangeDay = (d: Date) => {
  const current = props.rangeValue
  // Begin a new range when there is none yet or the previous one is complete.
  if (!current || !current.start || current.end) {
    emit('update:rangeValue', { start: d, end: null })
    return
  }
  // Complete the range, ordering the two ends.
  const start = current.start
  const range: DateRange = d.getTime() < start.getTime()
    ? { start: d, end: start }
    : { start, end: d }
  emit('update:rangeValue', range)
  emit('range-selected', range)
}

const date = computed({
  get: () => {
    if (props.range || !props.modelValue) return undefined
    const d = props.modelValue
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  },
  set: (val: DateValue) => {
    if (!val || val.month !== placeholder.value.month) return
    const d = toDate(val)
    if (props.range) {
      selectRangeDay(d)
      return
    }
    // Single mode: clicking the already-selected day clears the filter.
    const sel = props.modelValue
    if (sel && sameDay(sel, d)) {
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

const matchesDate = (d: DateValue, date: Date | null | undefined) =>
  !!date && date.getFullYear() === d.year && date.getMonth() + 1 === d.month && date.getDate() === d.day

const rangeStart = computed(() => props.rangeValue?.start ?? null)
const rangeEnd = computed(() => props.rangeValue?.end ?? null)
const isRangeStart = (d: DateValue) => matchesDate(d, rangeStart.value)
const isRangeEnd = (d: DateValue) => matchesDate(d, rangeEnd.value)
const isRangeEndpoint = (d: DateValue) => isRangeStart(d) || isRangeEnd(d)
// Days strictly between the two endpoints (the endpoints are styled on their own).
const isInRange = (d: DateValue) => {
  const start = rangeStart.value
  const end = rangeEnd.value
  if (!start || !end) return false
  const t = new Date(d.year, d.month - 1, d.day).getTime()
  return t > start.getTime() && t < end.getTime()
}

const hasSelection = computed(() => props.range
  ? !!rangeStart.value
  : !!props.modelValue)

const rangeFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }))
const rangeLabel = computed(() => {
  const start = rangeStart.value
  if (!start) return ''
  const end = rangeEnd.value
  if (!end || sameDay(start, end)) return rangeFormatter.value.format(start)
  return `${rangeFormatter.value.format(start)} – ${rangeFormatter.value.format(end)}`
})

const goToToday = () => {
  const today = new Date()
  placeholder.value = new CalendarDate(today.getFullYear(), today.getMonth() + 1, 1)
}
const clearSelection = () => {
  if (props.range) emit('update:rangeValue', null)
  else emit('update:modelValue', null)
}
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
      <div class="flex items-center gap-2">
        <span v-if="range && rangeLabel" class="text-xs font-medium text-primary-600 dark:text-primary-400">
          {{ rangeLabel }}
        </span>
        <UButton
          v-if="hasSelection" size="xs" color="neutral" variant="soft"
          icon="i-heroicons-x-mark-20-solid" @click="clearSelection">
          {{ range ? $t('components.month_calendar.clear_range') : $t('components.month_calendar.clear_day') }}
        </UButton>
      </div>
    </div>
    <p v-if="range" class="text-xs text-gray-400 mb-2 text-center">
      {{ $t('components.month_calendar.range_hint') }}
    </p>
    <div class="flex justify-center">
      <UCalendar v-model="date" v-model:placeholder="placeholder" :locale="locale" :fixed-weeks="false">
        <template #day="{ day }">
          <div
            class="w-full h-full flex items-center justify-center rounded-full relative" :class="[
              !isCurrentMonth(day) ? 'text-gray-300 dark:text-gray-700 pointer-events-none' : '',
              isCurrentMonth(day) && isMarked(day) ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold cursor-pointer' : '',
              isCurrentMonth(day) && range && isInRange(day) ? 'bg-primary-200 dark:bg-primary-800/60 text-primary-800 dark:text-primary-200' : '',
              isCurrentMonth(day) && range && isRangeEndpoint(day) ? 'bg-primary-500 text-white font-bold' : '',
              isCurrentMonth(day) && !range && isSelected(day) ? 'ring-2 ring-primary-500' : '',
              isCurrentMonth(day) && !isRangeEndpoint(day) && isToday(day) ? 'ring-1 ring-gray-300 dark:ring-gray-600' : ''
            ]">
            {{ day.day }}
            <div
              v-if="isCurrentMonth(day) && isMarked(day) && !(range && isRangeEndpoint(day))"
              class="absolute bottom-1 w-1 h-1 rounded-full bg-primary-500" />
          </div>
        </template>
      </UCalendar>
    </div>
  </UCard>
</template>
