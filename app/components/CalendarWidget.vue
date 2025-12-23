<script setup lang="ts">
import { CalendarDate, type DateValue } from '@internationalized/date'
import type { ServiceRecord } from '~/stores/services'

const props = defineProps<{
    modelValue?: Date
    records: ServiceRecord[]
    year: number
    month: number
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: Date): void
    (e: 'record-selected', record: ServiceRecord): void
    (e: 'update:year', value: number): void
    (e: 'update:month', value: number): void
}>()

// Placeholder for the current view (month/year)
const placeholder = ref(new CalendarDate(props.year, props.month === 0 ? new Date().getMonth() + 1 : props.month, 1)) as Ref<DateValue>

watch(() => [props.year, props.month], ([newYear, newMonth]) => {
    if (!newMonth || newMonth === 0) return // Don't enforce specific month if "All" is selected, let user browse or stay
    const current = placeholder.value
    // Ensure we have a CalendarDate to compare (DateValue is a union, but we are using CalendarDate)
    if ('year' in current && (current.year !== newYear || current.month !== newMonth)) {
        placeholder.value = new CalendarDate(newYear, newMonth, 1)
    }
})

watch(placeholder, (newVal) => {
    // Check if new value has year/month properties (it should as DateValue)
    if ('year' in newVal && newVal.year !== props.year) {
        emit('update:year', newVal.year)
    }
    if ('month' in newVal && newVal.month !== props.month) {
        emit('update:month', newVal.month)
    }
})

const date = computed({
    get: () => {
        if (!props.modelValue) return new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())
        const d = props.modelValue
        return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
    },
    set: (val: DateValue) => {
        const d = new Date(val.year, val.month - 1, val.day)
        emit('update:modelValue', d)

        // Find record for this date
        const record = props.records.find(r => {
            const recordDate = new Date(r.startTime)
            return recordDate.getDate() === d.getDate() &&
                recordDate.getMonth() === d.getMonth() &&
                recordDate.getFullYear() === d.getFullYear()
        })

        if (record) {
            emit('record-selected', record)
        }
    }
})

// Check if a date has a record
const hasRecord = (d: DateValue) => {
    return props.records.some(r => {
        const recordDate = new Date(r.startTime)
        return recordDate.getDate() === d.day &&
            recordDate.getMonth() + 1 === d.month &&
            recordDate.getFullYear() === d.year
    })
}

// View switching logic (Month vs Week) - UCalendar handles month view by default.
// Weekly view is not standard in simple UCalendar but we can simulate/limit it or just stick to Month view as primary.
// The user asked for "choose betweeen weekly view and month view".
// UCalendar doesn't inherently support a "Week View" mode that collapses rows, but it's a date picker.
// We can use a custom wrapper or just render the calendar. 
// Given the constraints of UCalendar (which is often just a month grid), truly switching to a "Week Row" might require 
// simply filtering or different component. However, let's start with standard UCalendar and customized cells.

// We will use attributes or cell slots if available in v4/v-calendar underlying.
// Check if we can use a "dot" indicator or background class.
// Note: Nuxt UI v4 UCalendar is built on top of Radix Vue Calendar or similar.
// Actually, in Nuxt UI v3 (and likely v4, as it's the "Next" version), UCalendar is quite flexible.

// Let's implement a simple view first.
</script>

<template>
    <UCard>
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                Calendari
            </h3>
        </div>

        <div class="flex justify-center">
            <UCalendar v-model="date" v-model:placeholder="placeholder" locale="ca-ES">
                <template #day="{ day }">
                    <div class="w-full h-full flex items-center justify-center rounded-full relative" :class="[
                        hasRecord(day) ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold' : ''
                    ]">
                        {{ day.day }}
                        <div v-if="hasRecord(day)" class="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full" />
                    </div>
                </template>
            </UCalendar>
        </div>
    </UCard>
</template>
