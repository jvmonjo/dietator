<script setup lang="ts">
import { generateGoogleCalendarUrl, generateIcsFile } from '~/utils/calendarGenerator'
import { saveAs } from 'file-saver'

const reminderDay = defineModel<number>('reminderDay')
const reminderTime = defineModel<string>('reminderTime')
const reminderRecurring = defineModel<boolean>('reminderRecurring')




const dayOptions = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }))

const exportCalendar = (type: 'google' | 'ics') => {
    const config = {
        day: reminderDay.value || 1,
        time: reminderTime.value || '09:00',
        isRecurring: reminderRecurring.value ?? true
    }

    if (type === 'google') {
        const url = generateGoogleCalendarUrl(config)
        window.open(url, '_blank')
    } else {
        const blob = generateIcsFile(config)
        saveAs(blob, 'recordatori-dietator.ics')
    }
}
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                    <UIcon name="i-heroicons-bell" class="w-6 h-6 text-primary-500" />
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.reminders.title') }}
                    </h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.reminders.description') }}</p>
                </div>
            </div>
        </template>

        <div class="space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UFormField :label="$t('settings.reminders.day')" name="reminderDay">
                    <USelect v-model="reminderDay" :items="dayOptions" />
                </UFormField>

                <UFormField :label="$t('settings.reminders.time')" name="reminderTime">
                    <UInput v-model="reminderTime" type="time" />
                </UFormField>

                <div class="sm:col-span-2">
                    <UCheckbox
v-model="reminderRecurring" :label="$t('settings.reminders.recurring')"
                        help="L'esdeveniment es crearà amb una regla de repetició mensual." />
                </div>
            </div>

            <USeparator />

            <div class="flex flex-col sm:flex-row gap-3">
                <UButton icon="i-simple-icons-googlecalendar" variant="soft" @click="exportCalendar('google')">
                    {{ $t('settings.reminders.add_to_calendar') }}
                </UButton>
                <UButton icon="i-heroicons-calendar-days" variant="outline" @click="exportCalendar('ics')">
                    {{ $t('settings.reminders.download_ics') }}
                </UButton>
            </div>
        </div>
    </UCard>
</template>
