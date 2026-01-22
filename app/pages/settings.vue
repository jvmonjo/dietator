<script setup lang="ts">
import type { TemplateType } from '~/stores/settings'
import type { ServiceRecord } from '~/stores/services'
import { encryptBackup, decryptBackup, isEncryptedBackup, type BackupPayload } from '~/utils/secureBackup'
import { onBeforeRouteLeave } from 'vue-router'

import { validateSpanishId } from 'spain-id'
import { generateGoogleCalendarUrl, generateIcsFile } from '~/utils/calendarGenerator'
import { saveAs } from 'file-saver'

const settingsStore = useSettingsStore()
const { locale, setLocale, t } = useI18n()

const languageOptions = [
  { label: 'ca', value: 'ca' },
  { label: 'es', value: 'es' }
]

const serviceStore = useServiceStore()

const distancesStore = useDistancesStore()
const toast = useToast()
const { provinces } = useLocations()
const importFileInput = ref<HTMLInputElement | null>(null)
const monthlyTemplateInput = ref<HTMLInputElement | null>(null)
const serviceTemplateInput = ref<HTMLInputElement | null>(null)
const templateInputs: Record<TemplateType, Ref<HTMLInputElement | null>> = {
  monthly: monthlyTemplateInput,
  service: serviceTemplateInput
}

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

const exportState = reactive({
  password: '',
  selectedYear: 0, // 0 = All
  selectedMonth: 0, // 0 = All
  includeTemplates: true,
  encrypt: false,
  includeGoogleAuth: true
})

watch(() => exportState.selectedYear, (newYear) => {
  if (newYear === 0) {
    exportState.selectedMonth = 0
  }
})

const importState = reactive({
  password: '',
  file: null as File | null,
  isEncryptedFile: false
})

const confirmModal = reactive({
  isOpen: false,
  title: '',
  description: '',
  action: null as (() => Promise<void>) | null,
  confirmLabel: t('common.confirm'),
  confirmColor: 'primary' as 'primary' | 'error'
})

const { monthlyTemplate, serviceTemplate } = storeToRefs(settingsStore)

const isHabitualRouteOpen = ref(false)
const isExportingConfig = ref(false)
const isExportingData = ref(false)
const isImporting = ref(false)

const monthFormatter = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' })

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

const exportYearOptions = computed(() => {
  const years = new Set<number>()
  serviceStore.records.forEach(r => {
    const d = new Date(r.startTime)
    if (!Number.isNaN(d.getTime())) years.add(d.getFullYear())
  })
  const sortedYears = Array.from(years).sort((a, b) => b - a).map(y => ({ label: String(y), value: y }))

  return [
    { label: t('months.0'), value: 0 },
    ...sortedYears
  ]
})

const filteredServices = computed(() => {
  let records = serviceStore.records

  if (exportState.selectedYear !== 0) {
    records = records.filter(r => new Date(r.startTime).getFullYear() === exportState.selectedYear)
  }

  if (exportState.selectedMonth !== 0) {
    records = records.filter(r => new Date(r.startTime).getMonth() + 1 === exportState.selectedMonth)
  }

  return records
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

const handleFileSelect = () => {
  importFileInput.value?.click()
}

const onFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  importState.file = file

  if (file) {
    try {
      const content = await file.text()
      const parsed = JSON.parse(content)
      importState.isEncryptedFile = isEncryptedBackup(parsed)
    } catch (e) {
      console.error('Error sniffing file', e)
      importState.isEncryptedFile = false
    }
  } else {
    importState.isEncryptedFile = false
  }
}

const buildSettingsPayload = (includeTemplates: boolean) => ({
  halfDietPrice: settingsStore.halfDietPrice,
  fullDietPrice: settingsStore.fullDietPrice,
  monthlyTemplate: includeTemplates ? settingsStore.monthlyTemplate : null,
  serviceTemplate: includeTemplates ? settingsStore.serviceTemplate : null,
  exportTemplates: includeTemplates,
  googleMapsApiKey: settingsStore.googleMapsApiKey,
  firstName: settingsStore.firstName,
  lastName: settingsStore.lastName,
  nationalId: settingsStore.nationalId,
  reminder: settingsStore.reminder,
  googleClientId: settingsStore.googleClientId,
  googleCalendarId: settingsStore.googleCalendarId,
  habitualRoute: settingsStore.habitualRoute,
  locale: locale.value
})


const buildBackupFilename = (type: 'config' | 'data', timestamp: string) => {
  if (type === 'config') {
    return `config-${timestamp}-dietator.json`
  }

  // Data export
  let prefix = ''
  if (exportState.selectedYear !== 0) {
    prefix += `${exportState.selectedYear}`
    if (exportState.selectedMonth !== 0) {
      prefix += `-${String(exportState.selectedMonth).padStart(2, '0')}`
    }
    prefix += '-'
  }

  return `${prefix}dades-dietator-${timestamp}.json`
}

const exportBackup = async (type: 'config' | 'data', method: 'download' | 'share' = 'download') => {
  if (exportState.encrypt && !exportState.password) {
    toast.add({ title: 'Indica una contrasenya', color: 'warning' })
    return
  }

  if (type === 'config') {
    isExportingConfig.value = true
  } else {
    isExportingData.value = true
  }

  try {
    const payload: BackupPayload = {}

    if (type === 'config') {
      payload.settings = buildSettingsPayload(exportState.includeTemplates)
      if (exportState.includeGoogleAuth) {
        payload.externalCalendar = externalCalendarStore.getBackupSnapshot()
      }
      payload.distancesCache = distancesStore.cache
      payload.meta = { type: 'config' }
    } else {
      payload.services = JSON.parse(JSON.stringify(filteredServices.value)) as ServiceRecord[]

      const metaMonth = (exportState.selectedYear !== 0 && exportState.selectedMonth !== 0)
        ? `${exportState.selectedYear}-${String(exportState.selectedMonth).padStart(2, '0')}`
        : 'all'

      payload.meta = {
        type: 'data',
        month: metaMonth,
        year: exportState.selectedYear !== 0 ? exportState.selectedYear : undefined
      }

      if (!payload.services || payload.services.length === 0) {
        toast.add({ title: t('common.error'), description: 'No hi ha dades per exportar', color: 'warning' })
        return
      }
    }

    let resultBlob: Blob

    if (exportState.encrypt) {
      const backup = await encryptBackup(exportState.password, payload)
      resultBlob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    } else {
      resultBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    }

    const timestamp = new Date().toISOString().split('T')[0] ?? new Date().toISOString()
    const filename = buildBackupFilename(type, timestamp)

    const downloadFile = () => {
      const url = URL.createObjectURL(resultBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      toast.add({ title: t('common.success'), color: 'success' })
    }

    if (method === 'share') {
      const file = new File([resultBlob], filename, { type: 'application/json' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file]
          })
        } catch (err: unknown) {
          const errorName = (err as Error).name
          if (errorName === 'NotAllowedError') {
            toast.add({ title: t('errors.share_not_allowed'), color: 'warning' })
            downloadFile()
          } else if (errorName === 'AbortError') {
            // User cancelled
          } else {
            throw err
          }
        }
      } else {
        toast.add({ title: t('errors.share_not_supported'), color: 'warning' })
        downloadFile()
      }
    } else {
      downloadFile()
    }

  } catch (error) {
    console.error(error)
    toast.add({ title: t('errors.export_failed'), color: 'error' })
  } finally {
    isExportingConfig.value = false
    isExportingData.value = false
  }
}

// Extended payload for internal use during import
type ImportPayload = BackupPayload & {
  detectedYear?: number
}

const processImport = async (payload: ImportPayload) => {
  const services = Array.isArray(payload?.services) ? payload.services : undefined
  const settings = payload?.settings

  if (services) {
    const importMonth = payload.meta?.month ?? 'all'
    const importYear = payload.detectedYear

    if (importMonth !== 'all') {
      // Monthly import (highest priority specificity)
      const targetPrefix = `${importMonth}-`
      const preserved = serviceStore.records.filter(record => !record.startTime?.startsWith(targetPrefix))
      serviceStore.setRecords([...preserved, ...services])
    } else if (importYear) {
      // Yearly import
      const preserved = serviceStore.records.filter(record => {
        const recordYear = new Date(record.startTime).getFullYear()
        return recordYear !== importYear
      })
      serviceStore.setRecords([...preserved, ...services])
    } else {
      // Full overwrite
      serviceStore.setRecords(services)
    }
  }

  if (settings) {
    settingsStore.loadSettings(settings)
    formState.halfDietPrice = settingsStore.halfDietPrice
    formState.fullDietPrice = settingsStore.fullDietPrice
    formState.googleMapsApiKey = settingsStore.googleMapsApiKey
    formState.firstName = settingsStore.firstName || ''
    formState.lastName = settingsStore.lastName || ''
    formState.nationalId = settingsStore.nationalId || ''
    formState.nationalId = settingsStore.nationalId || ''
    formState.habitualRoute = settingsStore.habitualRoute || []

    if (settings.locale) {
      setLocale(settings.locale as 'ca' | 'es')
    }
  }

  if (payload.distancesCache) {
    distancesStore.$patch({ cache: payload.distancesCache })
  }

  if (payload.externalCalendar) {
    externalCalendarStore.restoreFromBackup(payload.externalCalendar)
  }

  const description = services && settings
    ? t('settings.backup.updated_data_config')
    : services
      ? t('settings.backup.updated_data')
      : t('settings.backup.updated_config')

  toast.add({ title: t('settings.backup.imported'), description, color: 'success' })

  // Cleanup
  importState.file = null
  if (importFileInput.value) {
    importFileInput.value.value = ''
  }
  Object.values(templateInputs).forEach((input) => {
    if (input.value) input.value.value = ''
  })
}

const prepareImport = async () => {
  if (importState.isEncryptedFile && !importState.password) {
    toast.add({ title: t('settings.backup.enter_password'), color: 'warning' })
    return
  }

  if (!importState.file) {
    toast.add({ title: t('settings.backup.select_file_warning'), color: 'warning' })
    return
  }

  isImporting.value = true
  try {
    const content = await importState.file.text()
    const parsed = JSON.parse(content)

    let payload: BackupPayload
    if (isEncryptedBackup(parsed)) {
      payload = await decryptBackup(importState.password, parsed)
    } else if (Array.isArray(parsed)) {
      // Legacy backup support (raw array from old Wrapped export)
      payload = {
        services: parsed as ServiceRecord[], // Use proper type instead of any
        meta: { type: 'data', month: 'all' }
      }
    } else {
      payload = parsed as BackupPayload
    }

    // Validate content
    const services = Array.isArray(payload?.services) ? payload.services : undefined
    const settings = payload?.settings

    if (!services && !settings) {
      throw new Error(t('settings.backup.malformed'))
    }

    // Determine warning message
    let title = ''
    let description = ''

    if (settings) {
      title = t('settings.backup.import_config_title')
      description = t('settings.backup.import_config_confirm')
    } else if (services) {
      title = t('settings.backup.import_data_title')
      const month = payload.meta?.month
      const yearMeta = payload.meta?.year

      // Scan for year if not present in meta
      let detectedYear: number | undefined
      if (yearMeta) {
        detectedYear = yearMeta
      } else {
        // Fallback: analyze services
        const years = new Set<number>()
        services.forEach(s => {
          const y = new Date(s.startTime).getFullYear()
          if (!Number.isNaN(y)) years.add(y)
        })

        if (years.size === 1) {
          detectedYear = Array.from(years)[0]
        }
      }

      // Pass detected year to processImport via payload mutation or similar mechanism
      // Since processImport takes types, we can extend the object we pass
      (payload as ImportPayload).detectedYear = detectedYear

      if (month && month !== 'all') {
        const [year, monthNum] = month.split('-')
        const date = new Date(Number(year), Number(monthNum) - 1)
        const monthName = monthFormatter.format(date)
        description = t('settings.backup.overwrite_month', { month: monthName })
      } else if (detectedYear) {
        description = t('settings.backup.overwrite_year', { year: detectedYear })
      } else {
        description = t('settings.backup.overwrite_all')
      }
    }

    confirmModal.title = title
    confirmModal.description = description
    confirmModal.action = () => processImport(payload)
    confirmModal.confirmLabel = t('settings.backup.confirm_import')
    confirmModal.confirmColor = 'primary'
    confirmModal.isOpen = true

  } catch (error) {
    console.error(error)
    toast.add({ title: t('settings.backup.import_error'), color: 'error' })
  } finally {
    isImporting.value = false
  }
}

const handleConfirm = async () => {
  if (confirmModal.action) {
    await confirmModal.action()
  }
  confirmModal.isOpen = false
}

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result as string)
  reader.onerror = (event) => reject(event)
  reader.readAsDataURL(file)
})

const triggerTemplateSelect = (type: TemplateType) => {
  templateInputs[type].value?.click()
}

const onTemplateUpload = async (type: TemplateType, event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    toast.add({ title: t('settings.templates.no_file_selected'), color: 'warning' })
    return
  }

  try {
    const dataUrl = await readFileAsDataUrl(file)
    settingsStore.setTemplate(type, {
      name: file.name,
      mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      dataUrl,
      size: file.size,
      updatedAt: new Date().toISOString()
    })
    toast.add({ title: t('settings.templates.saved'), color: 'success' })
  } catch (error) {
    console.error(error)
    toast.add({ title: t('settings.templates.read_error'), color: 'error' })
  } finally {
    target.value = ''
  }
}

const clearTemplate = (type: TemplateType) => {
  settingsStore.setTemplate(type, null)
  const input = templateInputs[type].value
  if (input) input.value = ''
  toast.add({ title: t('settings.templates.deleted'), color: 'info' })
}

const downloadTemplate = (type: TemplateType) => {
  const template = type === 'monthly' ? monthlyTemplate.value : serviceTemplate.value
  if (!template) {
    toast.add({ title: t('settings.templates.none_available'), color: 'warning' })
    return
  }

  const link = document.createElement('a')
  link.href = template.dataUrl
  link.download = template.name || (type === 'monthly' ? 'plantilla-mensual.docx' : 'plantilla-servei.docx')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const maintenanceState = reactive({
  selectedYear: undefined as number | undefined,
  selectedMonth: undefined as number | undefined
})

const availableYears = computed(() => {
  const years = new Set<number>()
  serviceStore.records.forEach(r => {
    const d = new Date(r.startTime)
    if (!Number.isNaN(d.getTime())) years.add(d.getFullYear())
  })
  return Array.from(years).sort((a, b) => b - a).map(y => ({ label: String(y), value: y }))
})

const availableMonthsForYear = computed(() => {
  if (!maintenanceState.selectedYear) return []
  const months = new Set<number>()
  serviceStore.records.forEach(r => {
    const d = new Date(r.startTime)
    if (!Number.isNaN(d.getTime()) && d.getFullYear() === maintenanceState.selectedYear) {
      months.add(d.getMonth() + 1)
    }
  })
  return Array.from(months).sort((a, b) => a - b).map(m => {
    const date = new Date(maintenanceState.selectedYear!, m - 1, 1)
    const label = monthFormatter.format(date)
    return { label: label.charAt(0).toUpperCase() + label.slice(1), value: m }
  })
})

const deleteButtonLabel = computed(() => {
  if (!maintenanceState.selectedYear) return t('settings.maintenance.select_year_to_delete')
  if (maintenanceState.selectedMonth) {
    const monthName = availableMonthsForYear.value.find(m => m.value === maintenanceState.selectedMonth)?.label
    return t('settings.maintenance.delete_month_data', { month: monthName })
  }
  return t('settings.maintenance.delete_year_data', { year: maintenanceState.selectedYear })
})

const confirmDelete = () => {
  if (!maintenanceState.selectedYear) return

  const year = maintenanceState.selectedYear
  const month = maintenanceState.selectedMonth

  const title = t('settings.maintenance.confirm_delete_title')
  const description = month
    ? t('settings.maintenance.confirm_delete_month', { month })
    : t('settings.maintenance.confirm_delete_year', { year })

  confirmModal.title = title
  confirmModal.description = description
  confirmModal.action = async () => {
    if (month) {
      serviceStore.deleteRecordsByMonth(year, month)
    } else {
      serviceStore.deleteRecordsByYear(year)
    }
    toast.add({ title: t('settings.maintenance.data_deleted'), color: 'success' })
    maintenanceState.selectedYear = undefined
    maintenanceState.selectedMonth = undefined
  }
  confirmModal.confirmLabel = t('common.confirm')
  confirmModal.confirmColor = 'error'
  confirmModal.isOpen = true
}

const confirmClearCache = () => {
  confirmModal.title = t('settings.maintenance.confirm_clear_cache_title')
  confirmModal.description = t('settings.maintenance.confirm_clear_cache_description')
  confirmModal.action = async () => {
    distancesStore.clearCache()
    toast.add({ title: t('settings.maintenance.cache_cleared'), color: 'success' })
  }
  confirmModal.confirmLabel = t('settings.maintenance.clear_cache')
  confirmModal.confirmColor = 'error'
  confirmModal.isOpen = true
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const dayOptions = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }))

const externalCalendarStore = useExternalCalendarStore()

const exportCalendar = (type: 'google' | 'ics') => {
  const config = {
    day: formState.reminderDay,
    time: formState.reminderTime,
    isRecurring: formState.reminderRecurring
  }

  if (type === 'google') {
    const url = generateGoogleCalendarUrl(config)
    window.open(url, '_blank')
  } else {
    const blob = generateIcsFile(config)
    saveAs(blob, 'recordatori-dietator.ics')
  }
}

const googleButtonLabel = computed(() => Object.keys(externalCalendarStore.events).length ? t('settings.calendar.sync') : t('settings.calendar.connect'))

const calendarOptions = computed(() => {
  return externalCalendarStore.calendars.map(c => ({ label: c.summary, value: c.id }))
})

const saveAndSyncCalendar = async () => {
  saveSettings()
  // Trigger a re-sync with the new calendar ID using the existing Google token (no extra prompts if still valid)
  await externalCalendarStore.syncEvents('events')
}

const formatTimestamp = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ca-ES')
}

const habitualRouteSummary = computed(() => {
  if (!formState.habitualRoute || formState.habitualRoute.length === 0) return ''
  const cities = formState.habitualRoute
    .map(d => d.municipality)
    .filter(m => m && m.trim().length > 0)

  if (cities.length === 0) return ''
  return cities.join(' → ')
})

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

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-language" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.language.title') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.language.description') }}</p>
          </div>
        </div>
      </template>
      <div class="flex gap-4">
        <div class="w-full sm:w-1/2">
          <USelect
v-model="locale" :items="languageOptions" option-attribute="label" value-attribute="value"
            @update:model-value="(val) => setLocale(val as 'ca' | 'es')" />
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-user" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.personal_data.title') }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.personal_data.description') }}</p>
          </div>
        </div>
      </template>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField :label="$t('common.firstName')" name="firstName">
          <UInput v-model="formState.firstName" :placeholder="$t('settings.personal_data.firstNamePlaceholder')" />
        </UFormField>
        <UFormField :label="$t('common.lastName')" name="lastName">
          <UInput v-model="formState.lastName" :placeholder="$t('settings.personal_data.lastNamePlaceholder')" />
        </UFormField>
        <UFormField :label="$t('common.nationalId')" name="nationalId" class="md:col-span-2">
          <UInput v-model="formState.nationalId" placeholder="12345678Z" />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-currency-euro" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.prices.title') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.prices.description') }}</p>
          </div>
        </div>
      </template>

      <UForm :state="formState" class="space-y-6" @submit="saveSettings">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField :label="$t('settings.prices.half_diet')" name="halfDietPrice">
            <UInput
v-model="formState.halfDietPrice" type="text" icon="i-heroicons-currency-euro" inputmode="decimal"
              placeholder="0.00" />
          </UFormField>

          <UFormField :label="$t('settings.prices.full_diet')" name="fullDietPrice">
            <UInput
v-model="formState.fullDietPrice" type="text" icon="i-heroicons-currency-euro" inputmode="decimal"
              placeholder="0.00" />
          </UFormField>
        </div>
      </UForm>
    </UCard>

    <UCard>
      <template #header>
        <button
type="button" class="flex items-center justify-between w-full text-left"
          @click="isHabitualRouteOpen = !isHabitualRouteOpen">
          <div class="flex-1 min-w-0 flex items-center gap-3">
            <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
              <UIcon name="i-heroicons-map" class="w-6 h-6 text-primary-500" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.habitual_route.title') }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.habitual_route.description') }}</p>
              <div
v-if="habitualRouteSummary"
                class="mt-2 text-sm text-primary-600 dark:text-primary-400 font-medium break-words">
                {{ habitualRouteSummary }}
              </div>
            </div>
          </div>
          <UIcon
name="i-heroicons-chevron-down" class="w-5 h-5 text-gray-500 transition-transform duration-200"
            :class="{ 'rotate-180': isHabitualRouteOpen }" />
        </button>
      </template>

      <div v-show="isHabitualRouteOpen" class="space-y-4">
        <DisplacementListEditor v-model="formState.habitualRoute" :provinces="provinces" />
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Nota: Aquests desplaçaments es guardaran quan facis clic a "Desar configuració".
          Les dades s'utilitzaran com a plantilla per als nous serveis.
        </p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-puzzle-piece" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.integrations.title') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.integrations.description') }}</p>
          </div>
        </div>
      </template>
      <UForm :state="formState" class="space-y-6" @submit="saveSettings">
        <UFormField :label="$t('settings.api_keys.label')" name="googleMapsApiKey">
          <UInput v-model="formState.googleMapsApiKey" type="password" icon="i-heroicons-key" placeholder="AIza..." />
          <template #help>
            {{ $t('settings.api_keys.description') }}
            <NuxtLink
to="/help/maps"
              class="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium inline-flex items-center gap-1 mt-1">
              <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4" /> {{ $t('settings.api_keys.help') }}
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
                  <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4" /> {{ $t('settings.calendar.help') }}
                </NuxtLink>
              </p>
              <div class="flex flex-col gap-3">
                <div class="flex items-center gap-3">
                  <UButton
:loading="externalCalendarStore.isLoading"
                    :disabled="!useRuntimeConfig().public.googleClientId" icon="i-logos-google-icon" color="neutral"
                    variant="soft" @click="externalCalendarStore.syncEvents('events')">
                    {{ googleButtonLabel }}
                  </UButton>
                  <UBadge v-if="Object.keys(externalCalendarStore.events).length" color="success" variant="subtle">
                    {{ $t('settings.calendar.connected') }}
                  </UBadge>
                  <UButton
v-if="externalCalendarStore.isLoading || Object.keys(externalCalendarStore.events).length"
                    icon="i-heroicons-trash" color="error" variant="ghost" size="xs"
                    @click="externalCalendarStore.isLoading ? externalCalendarStore.cancelSync() : externalCalendarStore.disconnect()">
                    {{ externalCalendarStore.isLoading ? $t('common.cancel') : $t('common.disconnect') }}
                  </UButton>
                </div>
                <p v-if="!useRuntimeConfig().public.googleClientId" class="text-xs text-red-500 dark:text-red-400">
                  {{ $t('settings.calendar.client_id_missing') }}
                </p>

                <div v-if="Object.keys(externalCalendarStore.events).length">
                  <UButton
v-if="externalCalendarStore.calendars.length === 0" icon="i-heroicons-list-bullet"
                    color="neutral" variant="ghost" size="xs" :loading="externalCalendarStore.isLoading"
                    @click="externalCalendarStore.syncEvents('calendars')">
                    @click="externalCalendarStore.syncEvents('calendars')">
                    {{ $t('settings.calendar.change_calendar') }}
                  </UButton>

                  <UFormField v-else :label="$t('settings.calendar.select_calendar')" name="calendarSelector">
                    <USelect
v-model="formState.googleCalendarId" :items="calendarOptions" placeholder="Selecciona..."
                      style="width: 100%" @change="saveAndSyncCalendar" />
                  </UFormField>
                </div>
              </div>
            </div>
          </UFormField>
        </div>


      </UForm>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-document-text" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.templates.title') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.templates.description') }}</p>
            <NuxtLink
to="/help/templates"
              class="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium inline-flex items-center gap-1 mt-1">
              <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4" />
              {{ $t('settings.templates.help') }}
            </NuxtLink>
          </div>
        </div>
      </template>

      <div class="space-y-8">
        <section class="space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ $t('settings.templates.monthly') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.templates.monthly_description') }}
              </p>
            </div>
            <div class="flex gap-2">
              <UButton icon="i-heroicons-folder-arrow-down" variant="soft" @click="triggerTemplateSelect('monthly')">
                {{ $t('settings.templates.select_file') }}
              </UButton>
              <UButton
v-if="monthlyTemplate" icon="i-heroicons-arrow-down-tray" variant="ghost"
                @click="downloadTemplate('monthly')">
                {{ $t('settings.templates.download') }}
              </UButton>
              <UButton
v-if="monthlyTemplate" icon="i-heroicons-trash" color="error" variant="ghost"
                @click="clearTemplate('monthly')">
                {{ $t('settings.templates.delete') }}
              </UButton>
            </div>
          </div>
          <input
ref="monthlyTemplateInput" type="file" class="hidden"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="event => onTemplateUpload('monthly', event)">
          <div
v-if="monthlyTemplate"
            class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 space-y-1 text-sm">
            <p class="font-medium text-gray-900 dark:text-white">{{ monthlyTemplate.name }}</p>
            <p class="text-gray-600 dark:text-gray-300">{{ $t('settings.templates.size', {
              size:
                formatBytes(monthlyTemplate.size)
            }) }}</p>
            <p class="text-gray-600 dark:text-gray-300">{{ $t('settings.templates.saved_at', {
              date:
                formatTimestamp(monthlyTemplate.updatedAt)
            }) }}
            </p>
          </div>
          <div v-else class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('settings.templates.no_monthly_template') }}
          </div>
        </section>

        <USeparator />

        <section class="space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ $t('settings.templates.service') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.templates.service_description') }}</p>
            </div>
            <div class="flex gap-2">
              <UButton icon="i-heroicons-folder-arrow-down" variant="soft" @click="triggerTemplateSelect('service')">
                {{ $t('settings.templates.select_file') }}
              </UButton>
              <UButton
v-if="serviceTemplate" icon="i-heroicons-arrow-down-tray" variant="ghost"
                @click="downloadTemplate('service')">
                {{ $t('settings.templates.download') }}
              </UButton>
              <UButton
v-if="serviceTemplate" icon="i-heroicons-trash" color="error" variant="ghost"
                @click="clearTemplate('service')">
                {{ $t('settings.templates.delete') }}
              </UButton>
            </div>
          </div>
          <input
ref="serviceTemplateInput" type="file" class="hidden"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="event => onTemplateUpload('service', event)">
          <div
v-if="serviceTemplate"
            class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 space-y-1 text-sm">
            <p class="font-medium text-gray-900 dark:text-white">{{ serviceTemplate.name }}</p>
            <p class="text-gray-600 dark:text-gray-300">Tamany: {{ formatBytes(serviceTemplate.size) }}</p>
            <p class="text-gray-600 dark:text-gray-300">{{ $t('settings.templates.saved_at', {
              date:
                formatTimestamp(serviceTemplate.updatedAt)
            }) }}
            </p>
          </div>
          <div v-else class="text-sm text-gray-500 dark:text-gray-400">
            Encara no hi ha cap plantilla individual guardada.
          </div>
        </section>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-bell" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.reminders.title') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.reminders.description') }}</p>
          </div>
        </div>
      </template>

      <div class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="$t('settings.reminders.day')" name="reminderDay">
            <USelect v-model="formState.reminderDay" :items="dayOptions" />
          </UFormField>

          <UFormField :label="$t('settings.reminders.time')" name="reminderTime">
            <UInput v-model="formState.reminderTime" type="time" />
          </UFormField>

          <div class="sm:col-span-2">
            <UCheckbox
v-model="formState.reminderRecurring" :label="$t('settings.reminders.recurring')"
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

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.backup.title') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.backup.description') }}</p>
          </div>
        </div>
      </template>

      <div class="space-y-8">

        <!-- Common Password Field -->
        <div
          class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800 space-y-4">
          <UCheckbox
v-model="exportState.encrypt" :label="$t('settings.backup.encrypt')"
            :help="$t('settings.backup.encrypt_help')" />

          <transition
enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform -translate-y-2 opacity-0" enter-to-class="transform translate-y-0 opacity-100"
            leave-active-class="transition duration-150 ease-in" leave-from-class="transform translate-y-0 opacity-100"
            leave-to-class="transform -translate-y-2 opacity-0">
            <UFormField
v-if="exportState.encrypt" :label="$t('settings.backup.password')" name="exportPassword"
              :help="$t('settings.backup.password_help')">
              <UInput
v-model="exportState.password" type="password" placeholder="Introdueix una contrasenya segura"
                icon="i-heroicons-lock-closed" />
            </UFormField>
          </transition>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- EXPORT CONFIG -->
          <section class="space-y-4">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5 text-gray-500" />
              {{ $t('settings.backup.export_config') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('settings.backup.export_config_description') }}
            </p>

            <div class="space-y-4 pt-2">
              <UCheckbox
v-model="exportState.includeTemplates" :label="$t('settings.backup.include_templates')"
                :help="$t('settings.backup.include_templates_help')" />
              <UCheckbox
v-model="exportState.includeGoogleAuth" :label="$t('settings.backup.include_google')"
                :help="$t('settings.backup.include_google_help')" />
              <UButton
:loading="isExportingConfig" block variant="soft" icon="i-heroicons-share"
                @click="exportBackup('config', 'share')">
                {{ $t('settings.backup.export_config_btn') }}
              </UButton>
            </div>
          </section>

          <!-- EXPORT DATA -->
          <section class="space-y-4">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-table-cells" class="w-5 h-5 text-gray-500" />
              {{ $t('settings.backup.export_data') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('settings.backup.export_data_description') }}
            </p>

            <div class="space-y-4 pt-2">
              <div class="flex gap-2">
                <USelect v-model="exportState.selectedYear" :items="exportYearOptions" class="w-1/2" />
                <USelect
v-model="exportState.selectedMonth" :items="months" class="w-1/2"
                  :disabled="exportState.selectedYear === 0" />
              </div>
              <UButton
:loading="isExportingData" block variant="soft" icon="i-heroicons-share"
                @click="exportBackup('data', 'share')">
                {{ $t('settings.backup.export_data_btn') }}
              </UButton>
            </div>
          </section>
        </div>

        <USeparator />

        <!-- IMPORT SECTION -->
        <section class="space-y-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ $t('settings.backup.import_config') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('settings.backup.import_config_description') }}
          </p>

          <div class="grid md:grid-cols-2 gap-4 items-end">
            <UFormField
v-if="importState.isEncryptedFile" :label="$t('settings.backup.password')"
              name="importPassword">
              <UInput
v-model="importState.password" type="password" placeholder="Contrasenya..."
                icon="i-heroicons-key" />
            </UFormField>

            <UFormField :label="$t('settings.backup.select_file')" name="importFile">
              <div class="flex gap-2">
                <UButton
color="neutral" variant="outline" icon="i-heroicons-folder-open" class="flex-1"
                  @click="handleFileSelect">
                  {{ importState.file ? $t('settings.backup.change_file') : $t('settings.backup.search_file') }}
                </UButton>
              </div>
              <p v-if="importState.file" class="mt-1 text-xs text-primary-600 truncate font-medium">
                {{ importState.file.name }}
              </p>
            </UFormField>
          </div>
          <input ref="importFileInput" type="file" class="hidden" accept="application/json" @change="onFileChange">

          <UButton
:loading="isImporting" block color="primary" icon="i-heroicons-arrow-up-on-square"
            :disabled="!importState.file || (importState.isEncryptedFile && !importState.password)"
            @click="prepareImport">
            {{ $t('settings.backup.process_import') }}
          </UButton>
        </section>
      </div>
    </UCard>

    <!-- DELETE DATA -->
    <section class="space-y-4">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-red-50 dark:bg-red-900/40 rounded-lg">
              <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-red-500">{{ $t('settings.maintenance.title') }}</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.maintenance.description') }}</p>
            </div>
          </div>
        </template>

        <div class="space-y-6">
          <div
            class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ $t('settings.maintenance.storage_usage')
                }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ $t('settings.maintenance.local_data') }}</p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-primary-600 dark:text-primary-400">{{
                formatBytes(serviceStore.getStorageUsage()) }}</p>
              <p class="text-xs text-gray-500">{{ $t('settings.maintenance.total_services', {
                count:
                  serviceStore.records.length
              }) }}</p>
            </div>
          </div>

          <div
            class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ $t('settings.maintenance.cache_title') }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ $t('settings.maintenance.cache_description')
                }}
              </p>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <p class="text-lg font-bold text-primary-600 dark:text-primary-400">{{
                  formatBytes(distancesStore.getCacheStats().size) }}</p>
                <p class="text-xs text-gray-500">{{ $t('settings.maintenance.routes_count', {
                  count:
                    distancesStore.getCacheStats().items
                }) }}</p>
              </div>
              <UButton color="error" variant="ghost" icon="i-heroicons-trash" size="xs" @click="confirmClearCache">
                {{ $t('settings.maintenance.clear_cache') }}
              </UButton>
            </div>
          </div>

          <section class="space-y-4">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ $t('settings.maintenance.delete_data')
              }}
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <UFormField :label="$t('settings.maintenance.year')" name="deleteYear">
                <USelect
v-model="maintenanceState.selectedYear" :items="availableYears"
                  :placeholder="$t('settings.maintenance.select_year')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('settings.maintenance.month_optional')" name="deleteMonth">
                <USelect
v-model="maintenanceState.selectedMonth" :items="availableMonthsForYear"
                  :disabled="!maintenanceState.selectedYear" :placeholder="$t('settings.maintenance.entire_year')"
                  class="w-full" />
              </UFormField>
            </div>

            <UButton
block color="error" variant="soft" icon="i-heroicons-trash"
              :disabled="!maintenanceState.selectedYear" @click="confirmDelete">
              {{ deleteButtonLabel }}
            </UButton>
          </section>
        </div>
      </UCard>
    </section>
    <!-- Confirmation Modal -->
    <UModal v-model:open="confirmModal.isOpen" :title="confirmModal.title" :description="confirmModal.description">
      <template #footer>
        <UButton color="neutral" variant="ghost" @click="confirmModal.isOpen = false">{{ $t('common.cancel') }}
        </UButton>
        <UButton :color="confirmModal.confirmColor" @click="handleConfirm">{{ confirmModal.confirmLabel }}</UButton>
      </template>
    </UModal>

  </div>
</template>
