<script setup lang="ts">
import { validateSpanishId } from 'spain-id'

// Components are auto-imported due to naming convention (Settings/Language.vue -> <SettingsLanguage />)

const settingsStore = useSettingsStore()
const { t } = useI18n()
const toast = useToast()
const { provinces } = useLocations()

const formState = reactive({
  halfDietPrice: (settingsStore.halfDietPrice || 0) as number | string,
  fullDietPrice: (settingsStore.fullDietPrice || 0) as number | string,
  googleMapsApiKey: settingsStore.googleMapsApiKey || '',
  firstName: settingsStore.firstName || '',
  lastName: settingsStore.lastName || '',
  nationalId: settingsStore.nationalId || '',
  reminderDay: settingsStore.reminder?.day || 1,
  reminderTime: settingsStore.reminder?.time || '09:00',
  reminderRecurring: settingsStore.reminder?.isRecurring ?? true,
  googleClientId: settingsStore.googleClientId || '',
  googleCalendarId: settingsStore.googleCalendarId || '',
  habitualRoute: (settingsStore.habitualRoute || []).map(d => ({ ...d, id: d.id || crypto.randomUUID() }))
})

const parseCurrency = (input: string | number) => {
  if (typeof input === 'number') return input
  // Replace commas with dots
  const normalized = String(input).replace(/,/g, '.')
  const val = parseFloat(normalized)
  return Number.isNaN(val) ? 0 : val
}

const saveSettings = () => {
  if (formState.nationalId && !validateSpanishId(formState.nationalId)) {
    toast.add({ title: t('common.error'), description: 'DNI incorrecte', color: 'error' })
    return
  }

  const normalizedHalfPrice = parseCurrency(formState.halfDietPrice)
  const normalizedFullPrice = parseCurrency(formState.fullDietPrice)

  // Update UI with parsed values
  formState.halfDietPrice = normalizedHalfPrice
  formState.fullDietPrice = normalizedFullPrice

  settingsStore.updateDietPrices({
    half: normalizedHalfPrice,
    full: normalizedFullPrice
  })
  settingsStore.updatePersonalData({
    firstName: formState.firstName,
    lastName: formState.lastName,
    nationalId: formState.nationalId.toUpperCase()
  })

  settingsStore.$patch({
    googleMapsApiKey: formState.googleMapsApiKey,
    reminder: {
      day: formState.reminderDay,
      time: formState.reminderTime,
      isRecurring: formState.reminderRecurring
    },
    googleClientId: formState.googleClientId,
    googleCalendarId: formState.googleCalendarId
  })

  settingsStore.updateHabitualRoute(formState.habitualRoute)
  toast.add({ title: t('common.success'), color: 'success' })
}

const hasChanges = computed(() => {
  const current = {
    halfDietPrice: Number(String(formState.halfDietPrice).replace(',', '.')) || 0,
    fullDietPrice: Number(String(formState.fullDietPrice).replace(',', '.')) || 0,
    googleMapsApiKey: formState.googleMapsApiKey,
    firstName: formState.firstName,
    lastName: formState.lastName,
    nationalId: formState.nationalId,
    reminder: {
      day: formState.reminderDay,
      time: formState.reminderTime,
      isRecurring: formState.reminderRecurring
    },
    googleClientId: formState.googleClientId,
    googleCalendarId: formState.googleCalendarId,
    habitualRoute: formState.habitualRoute.map(d => ({
      province: d.province,
      municipality: d.municipality,
      hasLunch: d.hasLunch,
      hasDinner: d.hasDinner,
      observations: d.observations || ''
    }))
  }

  const saved = {
    halfDietPrice: settingsStore.halfDietPrice,
    fullDietPrice: settingsStore.fullDietPrice,
    googleMapsApiKey: settingsStore.googleMapsApiKey || '',
    firstName: settingsStore.firstName || '',
    lastName: settingsStore.lastName || '',
    nationalId: settingsStore.nationalId || '',
    reminder: {
      day: settingsStore.reminder?.day || 1,
      time: settingsStore.reminder?.time || '09:00',
      isRecurring: settingsStore.reminder?.isRecurring ?? true
    },
    googleClientId: settingsStore.googleClientId || '',
    googleCalendarId: settingsStore.googleCalendarId || '',
    habitualRoute: (settingsStore.habitualRoute || []).map(d => ({
      province: d.province,
      municipality: d.municipality,
      hasLunch: d.hasLunch,
      hasDinner: d.hasDinner,
      observations: d.observations || ''
    }))
  }

  return JSON.stringify(current) !== JSON.stringify(saved)
})

onBeforeRouteLeave((to, from, next) => {
  if (hasChanges.value) {
    const answer = window.confirm('Tens canvis sense guardar. Segur que vols sortir?')
    if (answer) next()
    else next(false)
  } else {
    next()
  }
})

// Refresh Logic when import happens
const onBackupImported = () => {
  formState.halfDietPrice = settingsStore.halfDietPrice || 0
  formState.fullDietPrice = settingsStore.fullDietPrice || 0
  formState.googleMapsApiKey = settingsStore.googleMapsApiKey || ''
  formState.firstName = settingsStore.firstName || ''
  formState.lastName = settingsStore.lastName || ''
  formState.nationalId = settingsStore.nationalId || ''
  formState.reminderDay = settingsStore.reminder?.day || 1
  formState.reminderTime = settingsStore.reminder?.time || '09:00'
  formState.reminderRecurring = settingsStore.reminder?.isRecurring ?? true
  formState.googleClientId = settingsStore.googleClientId || ''
  formState.googleCalendarId = settingsStore.googleCalendarId || ''
  formState.habitualRoute = (settingsStore.habitualRoute || []).map(d => ({ ...d, id: d.id || crypto.randomUUID() }))
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div class="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.title') }}</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">
          {{ $t('settings.description') }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-heroicons-check-circle" @click="saveSettings">{{ $t('settings.save') }}</UButton>
      </div>
    </div>

    <!-- Language -->
    <SettingsLanguage />

    <!-- Personal Data -->
    <SettingsPersonalData
v-model:first-name="formState.firstName" v-model:last-name="formState.lastName"
      v-model:national-id="formState.nationalId" />

    <!-- Prices -->
    <SettingsPrices v-model:half-diet-price="formState.halfDietPrice" v-model:full-diet-price="formState.fullDietPrice" />

    <!-- Habitual Route -->
    <SettingsHabitualRoute v-model="formState.habitualRoute" :provinces="provinces" />

    <!-- Integrations -->
    <SettingsIntegrations
v-model:google-maps-api-key="formState.googleMapsApiKey"
      v-model:google-calendar-id="formState.googleCalendarId" @save="saveSettings" />

    <!-- Templates -->
    <SettingsTemplates />

    <!-- Reminders -->
    <SettingsReminders
v-model:reminder-day="formState.reminderDay" v-model:reminder-time="formState.reminderTime"
      v-model:reminder-recurring="formState.reminderRecurring" />

    <!-- Backup -->
    <SettingsBackup @imported="onBackupImported" />

    <!-- Maintenance -->
    <SettingsMaintenance />

  </div>
</template>
