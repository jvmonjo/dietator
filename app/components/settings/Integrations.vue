<script setup lang="ts">
const googleMapsApiKey = defineModel<string>('googleMapsApiKey')
const googleCalendarId = defineModel<string>('googleCalendarId')

const emit = defineEmits<{
    (e: 'save'): void
}>()

const { t } = useI18n()
const externalCalendarStore = useExternalCalendarStore()
const config = useRuntimeConfig()

const googleButtonLabel = computed(() => Object.keys(externalCalendarStore.events).length ? t('settings.calendar.sync') : t('settings.calendar.connect'))

const calendarOptions = computed(() => {
    return externalCalendarStore.calendars.map(c => ({ label: c.summary, value: c.id }))
})

const saveAndSyncCalendar = async () => {
    emit('save')
    // Trigger a re-sync with the new calendar ID using the existing Google token (no extra prompts if still valid)
    await externalCalendarStore.syncEvents('events')
}
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                    <UIcon name="i-heroicons-puzzle-piece" class="w-6 h-6 text-primary-500" />
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.integrations.title')
                        }}</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.integrations.description') }}
                    </p>
                </div>
            </div>
        </template>

        <div class="space-y-6">
            <UFormField :label="$t('settings.api_keys.label')" name="googleMapsApiKey">
                <UInput v-model="googleMapsApiKey" type="password" icon="i-heroicons-key" placeholder="AIza..." />
                <template #help>
                    {{ $t('settings.api_keys.description') }}
                    <NuxtLink
to="/help/maps"
                        class="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium inline-flex items-center gap-1 mt-1">
                        <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4" /> {{
                            $t('settings.api_keys.help') }}
                    </NuxtLink>
                </template>
            </UFormField>

            <div class="relative py-4">
                <div class="absolute inset-0 flex items-center" aria-hidden="true">
                    <div class="w-full border-t border-gray-300 dark:border-gray-700" />
                </div>
                <div class="relative flex justify-center">
                    <span class="bg-white dark:bg-gray-900 px-2 text-sm text-gray-500">{{ $t('settings.calendar.title')
                        }}</span>
                </div>
            </div>

            <div id="google-calendar-section" class="scroll-mt-32">
                <UFormField label="Google Calendar" name="googleCalendar">
                    <div class="flex flex-col gap-2">
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            {{ $t('settings.calendar.description') }}
                            <NuxtLink
to="/help/google-calendar"
                                class="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium inline-flex items-center gap-1 ml-1">
                                <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4" /> {{
                                    $t('settings.calendar.help') }}
                            </NuxtLink>
                        </p>
                        <div class="flex flex-col gap-3">
                            <div class="flex items-center gap-3">
                                <UButton
:loading="externalCalendarStore.isLoading"
                                    :disabled="!config.public.googleClientId" icon="i-logos-google-icon" color="neutral"
                                    variant="soft" @click="externalCalendarStore.syncEvents('events')">
                                    {{ googleButtonLabel }}
                                </UButton>
                                <UBadge
v-if="Object.keys(externalCalendarStore.events).length" color="success"
                                    variant="subtle">
                                    {{ $t('settings.calendar.connected') }}
                                </UBadge>
                                <UButton
                                    v-if="externalCalendarStore.isLoading || Object.keys(externalCalendarStore.events).length"
                                    icon="i-heroicons-trash" color="error" variant="ghost" size="xs"
                                    @click="externalCalendarStore.isLoading ? externalCalendarStore.cancelSync() : externalCalendarStore.disconnect()">
                                    {{ externalCalendarStore.isLoading ? $t('common.cancel') : $t('common.disconnect')
                                    }}
                                </UButton>
                            </div>
                            <p v-if="!config.public.googleClientId" class="text-xs text-red-500 dark:text-red-400">
                                {{ $t('settings.calendar.client_id_missing') }}
                            </p>

                            <div v-if="Object.keys(externalCalendarStore.events).length">
                                <UButton
v-if="externalCalendarStore.calendars.length === 0"
                                    icon="i-heroicons-list-bullet" color="neutral" variant="ghost" size="xs"
                                    :loading="externalCalendarStore.isLoading"
                                    @click="externalCalendarStore.syncEvents('calendars')">
                                    {{ $t('settings.calendar.change_calendar') }}
                                </UButton>

                                <UFormField
v-else :label="$t('settings.calendar.select_calendar')"
                                    name="calendarSelector">
                                    <USelect
v-model="googleCalendarId" :items="calendarOptions"
                                        placeholder="Selecciona..." style="width: 100%" @change="saveAndSyncCalendar" />
                                </UFormField>
                            </div>
                        </div>
                    </div>
                </UFormField>
            </div>
        </div>
    </UCard>
</template>
