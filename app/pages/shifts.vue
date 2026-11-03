<script setup lang="ts">
import { DEFAULT_SHIFT_CONFIG, generateYearShifts, getShiftStartIndices, validateShiftConfig, type ShiftDay } from '~/utils/shiftGenerator'
import { CALENDAR_READ_SCOPE, CALENDAR_EVENTS_SCOPE, CALENDAR_CREATE_SCOPE, listWritableCalendars, createShiftCalendar, importShifts, ShiftImportError, type WritableCalendar } from '~/utils/shiftCalendar'

const { t, locale } = useI18n()
const calendar = useExternalCalendarStore()
const settings = useSettingsStore()
const runtimeConfig = useRuntimeConfig()
const today = new Date()
const anchor = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
const code = ref('A')
const cycleLength = ref(28)
const codesText = ref(DEFAULT_SHIFT_CONFIG.codes.join(','))
const patternText = ref(DEFAULT_SHIFT_CONFIG.pattern.join(','))
const startIndex = ref<number | undefined>()
const generated = ref<ShiftDay[]>([])
const includeRest = ref(false)
const restCode = ref('L')
const targetMode = ref('existing')
const calendarId = ref('')
const calendarName = ref('')
const writableCalendars = ref<WritableCalendar[]>([])
const busy = ref(false)
const importing = ref(false)
const completed = ref(0)
const error = ref('')
const success = ref('')
const storageKey = 'dietator.shiftGenerator.v1'
const config = computed(() => ({
  cycleLength: Number(cycleLength.value),
  codes: codesText.value.split(',').map(value => value.trim()).filter(Boolean),
  pattern: patternText.value.split(',').map(value => value.trim()).filter(Boolean)
}))
const startOptions = computed(() => {
  try {
    return getShiftStartIndices(anchor.value, code.value, config.value).map(value => ({ label: t('shifts.cycleDay', { day: value + 1 }), value }))
  } catch { return [] }
})
const exportDays = computed(() => generated.value.filter(day => includeRest.value || day.code !== restCode.value))
const calendarOptions = computed(() => writableCalendars.value.map(item => ({ label: item.summary, value: item.id })))
const weekdays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 0, 1 + index)) // Monday first.
  const options = { timeZone: 'UTC' } as const
  return {
    label: new Intl.DateTimeFormat(locale.value, { ...options, weekday: 'short' }).format(date).replace(/\.$/, '').toLocaleUpperCase(locale.value),
    name: new Intl.DateTimeFormat(locale.value, { ...options, weekday: 'long' }).format(date)
  }
}))
const months = computed(() => Array.from({ length: 12 }, (_, index) => ({
  name: new Intl.DateTimeFormat(locale.value, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, index, 1))),
  offset: (new Date(Date.UTC(Number(anchor.value.slice(0, 4)), index, 1)).getUTCDay() + 6) % 7,
  days: generated.value.filter(day => Number(day.date.slice(5, 7)) === index + 1)
})))
const canConnect = computed(() => !!(runtimeConfig.public.googleClientId || settings.googleClientId))

watch([anchor, code, cycleLength, codesText, patternText], () => {
  startIndex.value = undefined
  generated.value = []
  error.value = ''
  success.value = ''
})
watch(startIndex, () => { generated.value = []; success.value = '' })

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (saved) {
      validateShiftConfig(saved.config)
      cycleLength.value = saved.config.cycleLength
      codesText.value = saved.config.codes.join(',')
      patternText.value = saved.config.pattern.join(',')
    }
  } catch { /* Ignore invalid or unavailable local storage. */ }
})

function generate() {
  error.value = ''
  success.value = ''
  try {
    generated.value = generateYearShifts(anchor.value, code.value, config.value, startIndex.value)
    if (!calendarName.value) calendarName.value = `Dietator ${anchor.value.slice(0, 4)}`
    try { localStorage.setItem(storageKey, JSON.stringify({ config: config.value })) } catch { /* Generation works without storage. */ }
  } catch (cause) {
    generated.value = []
    error.value = t(`shifts.${cause instanceof Error ? cause.message : 'invalidConfig'}`)
  }
}

async function loadCalendars() {
  busy.value = true
  error.value = ''
  try {
    const token = await calendar.ensureAccessToken()
    if (!token) { error.value = t('shifts.authFailed'); return }
    writableCalendars.value = await listWritableCalendars(token)
    if (!writableCalendars.value.some(item => item.id === calendarId.value)) {
      calendarId.value = writableCalendars.value.find(item => item.id === settings.googleCalendarId)?.id || writableCalendars.value[0]?.id || ''
    }
  } catch { error.value = t('shifts.calendarListFailed') }
  finally { busy.value = false }
}

async function exportToCalendar() {
  if (!exportDays.value.length || busy.value) return
  if (targetMode.value === 'existing' && !writableCalendars.value.some(item => item.id === calendarId.value)) return
  if (targetMode.value === 'new' && !calendarName.value.trim()) return
  busy.value = true
  importing.value = true
  completed.value = 0
  error.value = ''
  success.value = ''
  try {
    const scopes = [CALENDAR_READ_SCOPE, CALENDAR_EVENTS_SCOPE]
    if (targetMode.value === 'new') scopes.push(CALENDAR_CREATE_SCOPE)
    const token = await calendar.ensureAccessToken('', undefined, scopes)
    if (!token) { error.value = t('shifts.authFailed'); return }
    if (targetMode.value === 'new') {
      const name = calendarName.value.trim()
      calendarId.value = await createShiftCalendar(token, name)
      writableCalendars.value.push({ id: calendarId.value, summary: name, accessRole: 'owner' })
      // Keep the created calendar selected even if the event import fails.
      targetMode.value = 'existing'
    }
    await importShifts(token, calendarId.value, exportDays.value, count => { completed.value = count })
    success.value = t('shifts.importSuccess', { count: completed.value })
  } catch (cause) {
    error.value = cause instanceof ShiftImportError
      ? t('shifts.importPartial', { count: cause.completed, total: cause.total })
      : t('shifts.exportFailed')
  } finally { busy.value = false; importing.value = false }
}
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold">{{ t('shifts.title') }}</h1>
    <p>{{ t('shifts.description') }}</p>
    <UCard>
      <form class="space-y-4" @submit.prevent="generate">
        <fieldset :disabled="busy" class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('shifts.anchor')">
            <UInput v-model="anchor" type="date" min="1900-01-01" max="2100-12-31" required />
          </UFormField>
          <UFormField :label="t('shifts.startCode')">
            <USelect v-model="code" :items="config.codes" class="w-full" />
          </UFormField>
          <UFormField :label="t('shifts.cycleLength')">
            <UInput v-model="cycleLength" type="number" min="1" max="366" required />
          </UFormField>
          <UFormField :label="t('shifts.codes')">
            <UInput v-model="codesText" required class="w-full" />
          </UFormField>
          <UFormField :label="t('shifts.pattern')" class="sm:col-span-2">
            <UTextarea v-model="patternText" required class="w-full" />
          </UFormField>
          <UFormField v-if="startOptions.length > 1" :label="t('shifts.startPosition')" :help="t('shifts.ambiguity')" class="sm:col-span-2">
            <USelect v-model="startIndex" :items="startOptions" :placeholder="startOptions[0]?.label" />
          </UFormField>
          <p v-if="config.cycleLength % 7 !== 0" class="sm:col-span-2 text-sm">{{ t('shifts.arbitraryCycle') }}</p>
          <UButton type="submit" :disabled="busy">{{ t('shifts.generate') }}</UButton>
        </fieldset>
      </form>
    </UCard>
    <UAlert v-if="error" color="error" :title="error" role="alert" />
    <UAlert v-if="success" color="success" :title="success" role="status" />
    <template v-if="generated.length">
      <UCard>
        <template #header><h2 class="text-xl font-semibold">{{ t('shifts.exportTitle') }}</h2></template>
        <fieldset :disabled="busy" class="space-y-4">
          <p>{{ t('shifts.exportHelp') }}</p>
          <UCheckbox v-model="includeRest" :label="t('shifts.includeRest')" />
          <UFormField v-if="!includeRest" :label="t('shifts.restCode')">
            <USelect v-model="restCode" :items="config.codes" />
          </UFormField>
          <UFormField :label="t('shifts.destination')">
            <USelect v-model="targetMode" :items="[{ label: t('shifts.existingCalendar'), value: 'existing' }, { label: t('shifts.newCalendar'), value: 'new' }]" class="w-full" />
          </UFormField>
          <template v-if="targetMode === 'existing'">
            <UButton :disabled="!canConnect || busy" :loading="busy" variant="soft" @click="loadCalendars">{{ t('shifts.loadCalendars') }}</UButton>
            <UFormField :label="t('shifts.existingCalendar')">
              <USelect v-model="calendarId" :items="calendarOptions" :placeholder="t('shifts.selectCalendar')" class="w-full" />
            </UFormField>
          </template>
          <UFormField v-else :label="t('shifts.calendarName')">
            <UInput v-model="calendarName" class="w-full" />
          </UFormField>
          <p v-if="!canConnect" class="text-sm">{{ t('settings.calendar.client_id_missing') }}</p>
          <UButton :disabled="!canConnect || busy || !exportDays.length || (targetMode === 'existing' ? !calendarId : !calendarName.trim())" :loading="busy" @click="exportToCalendar">
            {{ t(targetMode === 'new' ? 'shifts.confirmCreate' : 'shifts.confirmImport', { count: exportDays.length }) }}
          </UButton>
        </fieldset>
        <p v-if="importing" role="status" class="mt-3">{{ t('shifts.progress', { count: completed, total: exportDays.length }) }}</p>
      </UCard>
      <h2 class="text-xl font-semibold">{{ t('shifts.preview', { year: anchor.slice(0, 4), count: generated.length }) }}</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UCard v-for="month in months" :key="month.name">
          <template #header><h3 class="font-semibold capitalize">{{ month.name }}</h3></template>
          <div class="grid grid-cols-7 gap-1 text-center text-sm">
            <abbr v-for="weekday in weekdays" :key="weekday.name" :title="weekday.name" class="py-1 font-semibold no-underline">{{ weekday.label }}</abbr>
            <div v-for="padding in month.offset" :key="`padding-${padding}`" aria-hidden="true" />
            <div v-for="day in month.days" :key="day.date" class="rounded bg-gray-100 dark:bg-gray-800 p-1" :title="day.date">
              <span class="block text-xs text-gray-500">{{ Number(day.date.slice(8)) }}</span>
              <strong class="block min-h-5">{{ includeRest || day.code !== restCode ? day.code : '\u00a0' }}</strong>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
