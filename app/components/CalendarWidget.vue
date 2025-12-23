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
    (e: 'update:modelValue' | 'date-selected', value: Date): void
    (e: 'record-selected', record: ServiceRecord): void
    (e: 'update:year' | 'update:month', value: number): void
}>()

const settingsStore = useSettingsStore()
const externalCalendar = useExternalCalendarStore()

// Placeholder for the current view (month/year)
const placeholder = ref(new CalendarDate(props.year, props.month === 0 ? new Date().getMonth() + 1 : props.month, 1)) as Ref<DateValue>

watch(() => [props.year, props.month], ([newYear, newMonth]) => {
    if (!newMonth || newMonth === 0) return // Don't enforce specific month if "All" is selected, let user browse or stay
    const current = placeholder.value
    // Ensure we have a CalendarDate to compare (DateValue is a union, but we are using CalendarDate)
    if ('year' in current && (current.year !== newYear || current.month !== newMonth)) {
        placeholder.value = new CalendarDate(newYear || new Date().getFullYear(), newMonth, 1)
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
        } else {
            // New feature: Open new service form for this date
            emit('date-selected', d)
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

const hasExternalEvent = (d: DateValue) => {
    const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
    return externalCalendar.hasEvent(dateStr)
}

const handleSync = async () => {
    await externalCalendar.syncEvents()
}

onMounted(() => {
    if (settingsStore.icalUrl && !Object.keys(externalCalendar.events).length) {
        externalCalendar.syncEvents()
    }
})
</script>

<template>
    <UCard>
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                Calendari
            </h3>
            <UTooltip v-if="settingsStore.icalUrl" text="Sincronitzar calendari extern">
                <UButton
:loading="externalCalendar.isLoading" icon="i-heroicons-arrow-path" variant="ghost"
                    color="neutral" size="xs" @click="handleSync" />
            </UTooltip>
        </div>

        <div class="flex justify-center">
            <UCalendar v-model="date" v-model:placeholder="placeholder" locale="ca-ES">
                <template #day="{ day }">
                    <div
class="w-full h-full flex items-center justify-center rounded-full relative" :class="[
                        hasRecord(day) ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold' : '',
                        !hasRecord(day) && hasExternalEvent(day) ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-bold cursor-pointer' : ''
                    ]">
                        {{ day.day }}
                        <div v-if="hasRecord(day)" class="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full" />
                        <div
v-else-if="hasExternalEvent(day)"
                            class="absolute bottom-1 w-1 h-1 bg-orange-500 rounded-full" />
                    </div>
                </template>
            </UCalendar>
        </div>
    </UCard>
</template>
