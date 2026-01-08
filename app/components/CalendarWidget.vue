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
        if (!props.modelValue) return undefined
        const d = props.modelValue
        return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
    },
    set: (val: DateValue) => {
        if (!val) return

        // Prevent interaction with days outside the current month view
        if (val.month !== placeholder.value.month) return

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

// Check if a date has a record and return it
const getRecord = (d: DateValue) => {
    return props.records.find(r => {
        const recordDate = new Date(r.startTime)
        return recordDate.getDate() === d.day &&
            recordDate.getMonth() + 1 === d.month &&
            recordDate.getFullYear() === d.year
    })
}

const hasDiet = (record: ServiceRecord) => {
    return record.displacements.some(d => d.hasLunch || d.hasDinner)
}

const hasRecord = (d: DateValue) => !!getRecord(d)

const hasExternalEvent = (d: DateValue) => {
    const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
    return externalCalendar.hasEvent(dateStr)
}

const goToCalendarSettings = () => {
    navigateTo('/settings#google-calendar-section')
}

const isCurrentMonth = (d: DateValue) => {
    return d.month === placeholder.value.month
}

const isToday = (d: DateValue) => {
    const today = new Date()
    return d.day === today.getDate() &&
        d.month === (today.getMonth() + 1) &&
        d.year === today.getFullYear()
}

const handleSync = async () => {
    // Pass the current view date to ensure we sync the relevant month
    // placeholder is a CalendarDate { year, month, day }
    const currentViewDate = new Date(placeholder.value.year, placeholder.value.month - 1, 1)
    await externalCalendar.syncEvents('events', currentViewDate)
}

const goToToday = () => {
    const today = new Date()
    placeholder.value = new CalendarDate(today.getFullYear(), today.getMonth() + 1, 1)
}
</script>

<template>
    <UCard>
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                    Calendari
                </h3>
                <UButton size="xs" color="neutral" variant="ghost" @click="goToToday">Avui</UButton>
            </div>
            <div v-if="useRuntimeConfig().public.googleClientId" class="flex items-center gap-2">
                <span v-if="externalCalendar.lastSync" class="text-xs text-gray-400 dark:text-gray-500">
                    {{ new Date(externalCalendar.lastSync).toLocaleString('ca-ES') }}
                </span>
                <UTooltip v-if="Object.keys(externalCalendar.events).length" text="Sincronitzar calendari extern">
                    <UButton :loading="externalCalendar.isLoading" icon="i-heroicons-arrow-path" variant="ghost"
                        color="neutral" size="xs" @click="handleSync" />
                </UTooltip>
                <UButton v-else :loading="externalCalendar.isLoading" icon="i-logos-google-icon" variant="soft"
                    size="xs" color="neutral" @click="goToCalendarSettings">
                    Configurar
                </UButton>
            </div>
        </div>
        <div class="flex justify-center">
            <UCalendar v-model="date" v-model:placeholder="placeholder" locale="ca-ES" :fixed-weeks="false">
                <template #day="{ day }">
                    <div class="w-full h-full flex items-center justify-center rounded-full relative" :class="[
                        !isCurrentMonth(day) ? 'text-gray-300 dark:text-gray-700 pointer-events-none' : '',
                        isCurrentMonth(day) && hasRecord(day) && hasDiet(getRecord(day)!) ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold' : '',
                        isCurrentMonth(day) && hasRecord(day) && !hasDiet(getRecord(day)!) ? 'bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300 font-bold' : '',
                        isCurrentMonth(day) && !hasRecord(day) && hasExternalEvent(day) ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-bold cursor-pointer' : '',
                        isCurrentMonth(day) && isToday(day) ? 'ring-2 ring-primary-500' : ''
                    ]">
                        {{ day.day }}
                        <template v-if="isCurrentMonth(day)">
                            <div v-if="getRecord(day)" class="absolute bottom-1 w-1 h-1 rounded-full"
                                :class="hasDiet(getRecord(day)!) ? 'bg-green-500' : 'bg-lime-500'" />
                            <div v-else-if="hasExternalEvent(day)"
                                class="absolute bottom-1 w-1 h-1 bg-orange-500 rounded-full" />
                        </template>
                    </div>
                </template>
            </UCalendar>
        </div>
    </UCard>
</template>
