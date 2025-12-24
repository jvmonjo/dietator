<script setup lang="ts">
import type { TemplateType } from '~/stores/settings'
import type { ServiceRecord } from '~/stores/services'
import { encryptBackup, decryptBackup, isEncryptedBackup, type BackupPayload } from '~/utils/secureBackup'
import { onBeforeRouteLeave } from 'vue-router'

import { validateSpanishId } from 'spain-id'
import { generateGoogleCalendarUrl, generateIcsFile } from '~/utils/calendarGenerator'
import { saveAs } from 'file-saver'

const settingsStore = useSettingsStore()
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
  selectedMonth: 'all' as string,
  includeTemplates: true,
  encrypt: false
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
  confirmLabel: 'Confirmar',
  confirmColor: 'primary' as 'primary' | 'error'
})

const { monthlyTemplate, serviceTemplate } = storeToRefs(settingsStore)

const isHabitualRouteOpen = ref(false)
const isExportingConfig = ref(false)
const isExportingData = ref(false)
const isImporting = ref(false)

const monthFormatter = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' })

const monthsWithData = computed(() => {
  const months = new Map<string, string>()
  serviceStore.records.forEach((record) => {
    const date = new Date(record.startTime)
    if (Number.isNaN(date.getTime())) { return }
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!months.has(key)) {
      const label = monthFormatter.format(date)
      months.set(key, label.charAt(0).toUpperCase() + label.slice(1))
    }
  })
  return [...months.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([value, label]) => ({ value, label }))
})

const monthOptions = computed(() => [
  { label: 'Tots els mesos', value: 'all', disabled: monthsWithData.value.length === 0 },
  ...monthsWithData.value
])



const filteredServices = computed(() => {
  if (exportState.selectedMonth === 'all') {
    return serviceStore.records
  }
  const targetPrefix = `${exportState.selectedMonth}-`
  return serviceStore.records.filter(record => record.startTime?.startsWith(targetPrefix))
})

watch(monthsWithData, (months) => {
  if (exportState.selectedMonth !== 'all' && !months.some(month => month.value === exportState.selectedMonth)) {
    exportState.selectedMonth = 'all'
  }
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
    toast.add({ title: 'DNI incorrecte', color: 'error' })
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
  toast.add({ title: 'Configuració guardada', color: 'success' })
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
  distancesCache: distancesStore.cache
})





const buildBackupFilename = (type: 'config' | 'data', timestamp: string) => {
  if (type === 'config') {
    return `config-${timestamp}-dietator.json`
  }

  // Data export
  if (exportState.selectedMonth !== 'all') {
    return `${exportState.selectedMonth}-dades-mensuals-dietator-${timestamp}.json`
  }

  return `dades-dietator-${timestamp}.json`
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
      payload.meta = { type: 'config' }
    } else {
      payload.services = JSON.parse(JSON.stringify(filteredServices.value)) as ServiceRecord[]
      payload.meta = {
        type: 'data',
        month: exportState.selectedMonth
      }

      if (!payload.services || payload.services.length === 0) {
        toast.add({ title: 'No hi ha dades per exportar', color: 'warning' })
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
      toast.add({ title: 'Backup descarregat correctament', color: 'success' })
    }

    if (method === 'share') {
      const file = new File([resultBlob], filename, { type: 'application/json' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Còpia de seguretat Dietator',
            text: `Aquí tens la còpia de seguretat ${type === 'config' ? 'de la configuració' : 'de les dades'}.`
          })
        } catch (err: unknown) {
          const errorName = (err as Error).name
          if (errorName === 'NotAllowedError') {
            toast.add({ title: 'Compartició no permesa, descarregant...', color: 'warning' })
            downloadFile()
          } else if (errorName === 'AbortError') {
            // User cancelled
          } else {
            throw err
          }
        }
      } else {
        toast.add({ title: 'El teu dispositiu no suporta compartir aquest fitxer, descarregant...', color: 'warning' })
        downloadFile()
      }
    } else {
      downloadFile()
    }

  } catch (error) {
    console.error(error)
    toast.add({ title: 'No s\'ha pogut exportar', color: 'error' })
  } finally {
    isExportingConfig.value = false
    isExportingData.value = false
  }
}

const processImport = async (payload: BackupPayload) => {
  const services = Array.isArray(payload?.services) ? payload.services : undefined
  const settings = payload?.settings

  if (services) {
    const importMonth = payload.meta?.month ?? 'all'
    if (importMonth !== 'all') {
      const targetPrefix = `${importMonth}-`
      const preserved = serviceStore.records.filter(record => !record.startTime?.startsWith(targetPrefix))
      serviceStore.setRecords([...preserved, ...services])
    } else {
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
  }

  if (payload.distancesCache) {
    distancesStore.$patch({ cache: payload.distancesCache })
  }

  const description = services && settings
    ? 'S\'han actualitzat les dades i la configuració'
    : services
      ? 'S\'han actualitzat les dades'
      : 'S\'ha actualitzat la configuració'

  toast.add({ title: 'Backup importat', description, color: 'success' })

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
    toast.add({ title: 'Introdueix la contrasenya per importar', color: 'warning' })
    return
  }

  if (!importState.file) {
    toast.add({ title: 'Selecciona un fitxer de backup', color: 'warning' })
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
      throw new Error('Backup malformat o buit')
    }

    // Determine warning message
    let title = ''
    let description = ''

    if (settings) {
      title = 'Importar Configuració'
      description = 'Això sobreescriurà la configuració actual, incloent els preus i les plantilles. Vols continuar?'
    } else if (services) {
      title = 'Importar Dades'
      const month = payload.meta?.month
      if (month && month !== 'all') {
        const [year, monthNum] = month.split('-')
        const date = new Date(Number(year), Number(monthNum) - 1)
        const monthName = monthFormatter.format(date)
        description = `Estàs a punt de sobreescriure les dades del mes de ${monthName}. Vols continuar?`
      } else {
        description = 'Estàs a punt de sobreescriure TOTES les dades de serveis. Aquesta acció no es pot desfer. Vols continuar?'
      }
    }

    confirmModal.title = title
    confirmModal.description = description
    confirmModal.action = () => processImport(payload)
    confirmModal.confirmLabel = 'Confirmar i Importar'
    confirmModal.confirmColor = 'primary'
    confirmModal.isOpen = true

  } catch (error) {
    console.error(error)
    toast.add({ title: 'Error en importar (contrasenya incorrecta?)', color: 'error' })
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
    toast.add({ title: 'Cap fitxer seleccionat', color: 'warning' })
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
    toast.add({ title: 'Plantilla guardada', color: 'success' })
  } catch (error) {
    console.error(error)
    toast.add({ title: 'No s\'ha pogut llegir la plantilla', color: 'error' })
  } finally {
    target.value = ''
  }
}

const clearTemplate = (type: TemplateType) => {
  settingsStore.setTemplate(type, null)
  const input = templateInputs[type].value
  if (input) input.value = ''
  toast.add({ title: 'Plantilla eliminada', color: 'info' })
}

const downloadTemplate = (type: TemplateType) => {
  const template = type === 'monthly' ? monthlyTemplate.value : serviceTemplate.value
  if (!template) {
    toast.add({ title: 'Cap plantilla disponible', color: 'warning' })
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
  if (!maintenanceState.selectedYear) return 'Selecciona un any per esborrar'
  if (maintenanceState.selectedMonth) {
    const monthName = availableMonthsForYear.value.find(m => m.value === maintenanceState.selectedMonth)?.label
    return `Esborrar dades de ${monthName}`
  }
  return `Esborrar tot l'any ${maintenanceState.selectedYear}`
})

const confirmDelete = () => {
  if (!maintenanceState.selectedYear) return

  const year = maintenanceState.selectedYear
  const month = maintenanceState.selectedMonth

  const title = 'Confirmar eliminació'
  const description = month
    ? `Estàs segur que vols esborrar tots els serveis del període selecionat? Aquesta acció no es pot desfer.`
    : `Estàs segur que vols esborrar tots els serveis de l'any ${year}? Aquesta acció no es pot desfer.`

  confirmModal.title = title
  confirmModal.description = description
  confirmModal.action = async () => {
    if (month) {
      serviceStore.deleteRecordsByMonth(year, month)
    } else {
      serviceStore.deleteRecordsByYear(year)
    }
    toast.add({ title: 'Dades eliminades correctament', color: 'success' })
    maintenanceState.selectedYear = undefined
    maintenanceState.selectedMonth = undefined
    maintenanceState.selectedMonth = undefined
  }
  confirmModal.confirmLabel = 'Confirma l\'eliminació'
  confirmModal.confirmColor = 'error'
  confirmModal.isOpen = true
}

const confirmClearCache = () => {
  confirmModal.title = 'Netejar caché de distàncies'
  confirmModal.description = 'Estàs segur que vols esborrar totes les distàncies guardades? S\'hauran de tornar a calcular (i gastar quota de Google Maps) la propera vegada.'
  confirmModal.action = async () => {
    distancesStore.clearCache()
    toast.add({ title: 'Caché netejada correctament', color: 'success' })
  }
  confirmModal.confirmLabel = 'Netejar Caché'
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

const googleButtonLabel = computed(() => Object.keys(externalCalendarStore.events).length ? 'Sincronitzar ara' : 'Connectar amb Google Calendar')

const calendarOptions = computed(() => {
  return externalCalendarStore.calendars.map(c => ({ label: c.summary, value: c.id }))
})

const saveAndSyncCalendar = async () => {
  saveSettings()
  // Trigger a re-sync with the new calendar ID (requires a fresh token unfortunately, or standard re-flow)
  // Actually, syncEvents('events') will trigger the oauth flow again which is safe.
  await externalCalendarStore.syncEvents('events')
}

const formatTimestamp = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ca-ES')
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
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div class="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Configuració</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">
          Gestiona les teves dades personals i preferències de l'aplicació.
        </p>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-heroicons-check-circle" @click="saveSettings">Desar configuració</UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-user" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Dades Personals</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Informació bàsica per als documents.</p>
          </div>
        </div>
      </template>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Nom" name="firstName">
          <UInput v-model="formState.firstName" placeholder="El teu nom" />
        </UFormField>
        <UFormField label="Cognoms" name="lastName">
          <UInput v-model="formState.lastName" placeholder="Els teus cognoms" />
        </UFormField>
        <UFormField label="DNI" name="nationalId" class="md:col-span-2">
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
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Preus de les dietes</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Defineix els imports per als càlculs automàtics.</p>
          </div>
        </div>
      </template>

      <UForm :state="formState" class="space-y-6" @submit="saveSettings">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Preu mitja dieta" name="halfDietPrice">
            <UInput v-model="formState.halfDietPrice" type="text" icon="i-heroicons-currency-euro" inputmode="decimal"
              placeholder="0.00" />
          </UFormField>

          <UFormField label="Preu dieta completa" name="fullDietPrice">
            <UInput v-model="formState.fullDietPrice" type="text" icon="i-heroicons-currency-euro" inputmode="decimal"
              placeholder="0.00" />
          </UFormField>
        </div>
      </UForm>
    </UCard>

    <UCard>
      <template #header>
        <button type="button" class="flex items-center justify-between w-full text-left"
          @click="isHabitualRouteOpen = !isHabitualRouteOpen">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
              <UIcon name="i-heroicons-map" class="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Ruta Habitual</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">Defineix uns desplaçaments habituals per importar-los
                ràpidament als nous serveis.</p>
            </div>
          </div>
          <UIcon name="i-heroicons-chevron-down" class="w-5 h-5 text-gray-500 transition-transform duration-200"
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
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Integracions</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Configureu serveis externs per automatitzar tasques.</p>
          </div>
        </div>
      </template>
      <UForm :state="formState" class="space-y-6" @submit="saveSettings">
        <UFormField label="Google Maps API Key" name="googleMapsApiKey">
          <UInput v-model="formState.googleMapsApiKey" type="password" icon="i-heroicons-key" placeholder="AIza..." />
          <template #help>
            Necessari per al càlcul automàtic de quilòmetres.
            <NuxtLink to="/help/maps"
              class="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium inline-flex items-center gap-1 mt-1">
              <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4" /> Com obtenir-la?
            </NuxtLink>
          </template>
        </UFormField>

        <div class="relative py-4">
          <div class="absolute inset-0 flex items-center" aria-hidden="true">
            <div class="w-full border-t border-gray-300 dark:border-gray-700" />
          </div>
          <div class="relative flex justify-center">
            <span class="bg-white dark:bg-gray-900 px-2 text-sm text-gray-500">Calendaris Externs</span>
          </div>
        </div>

        <UFormField label="Google Calendar" name="googleCalendar">
          <div class="flex flex-col gap-2">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Sincronitzeu el vostre calendari principal per veure els dies ocupats.
            </p>
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <UButton :loading="externalCalendarStore.isLoading"
                  :disabled="!useRuntimeConfig().public.googleClientId" icon="i-logos-google-icon" color="neutral"
                  variant="soft" @click="externalCalendarStore.syncEvents('events')">
                  {{ googleButtonLabel }}
                </UButton>
                <UBadge v-if="Object.keys(externalCalendarStore.events).length" color="success" variant="subtle">
                  Connectat
                </UBadge>
                <UButton v-if="Object.keys(externalCalendarStore.events).length" icon="i-heroicons-trash" color="error"
                  variant="ghost" size="xs" @click="externalCalendarStore.disconnect()">
                  Desconnectar
                </UButton>
              </div>
              <p v-if="!useRuntimeConfig().public.googleClientId" class="text-xs text-red-500 dark:text-red-400">
                Falta configurar la variable d'entorn <code>NUXT_PUBLIC_GOOGLE_CLIENT_ID</code>.
              </p>

              <div v-if="Object.keys(externalCalendarStore.events).length">
                <UButton v-if="externalCalendarStore.calendars.length === 0" icon="i-heroicons-list-bullet"
                  color="neutral" variant="ghost" size="xs" :loading="externalCalendarStore.isLoading"
                  @click="externalCalendarStore.syncEvents('calendars')">
                  Canviar calendari (Carregar llista)
                </UButton>

                <UFormField v-else label="Selecciona un calendari" name="calendarSelector">
                  <USelect v-model="formState.googleCalendarId" :items="calendarOptions" placeholder="Selecciona..."
                    style="width: 100%" @change="saveAndSyncCalendar" />
                  <template #help>
                    Canviar el calendari tornarà a demanar permisos per sincronitzar els nous esdeveniments.
                  </template>
                </UFormField>
              </div>
            </div>
          </div>
        </UFormField>


      </UForm>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-document-text" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Plantilles Word</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Puja la plantilla `.docx` per generar els documents des
              d'aquesta aplicació.</p>
            <NuxtLink to="/help/templates"
              class="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium inline-flex items-center gap-1 mt-1">
              <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4" />
              Veure ajudes i variables disponibles
            </NuxtLink>
          </div>
        </div>
      </template>

      <div class="space-y-8">
        <section class="space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Plantilla mensual</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">S'utilitza per generar tots els desplaçaments del mes.
              </p>
            </div>
            <div class="flex gap-2">
              <UButton icon="i-heroicons-folder-arrow-down" variant="soft" @click="triggerTemplateSelect('monthly')">
                Selecciona fitxer
              </UButton>
              <UButton v-if="monthlyTemplate" icon="i-heroicons-arrow-down-tray" variant="ghost"
                @click="downloadTemplate('monthly')">
                Descarrega
              </UButton>
              <UButton v-if="monthlyTemplate" icon="i-heroicons-trash" color="error" variant="ghost"
                @click="clearTemplate('monthly')">
                Elimina
              </UButton>
            </div>
          </div>
          <input ref="monthlyTemplateInput" type="file" class="hidden"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="event => onTemplateUpload('monthly', event)">
          <div v-if="monthlyTemplate"
            class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 space-y-1 text-sm">
            <p class="font-medium text-gray-900 dark:text-white">{{ monthlyTemplate.name }}</p>
            <p class="text-gray-600 dark:text-gray-300">Tamany: {{ formatBytes(monthlyTemplate.size) }}</p>
            <p class="text-gray-600 dark:text-gray-300">Actualitzada: {{ formatTimestamp(monthlyTemplate.updatedAt) }}
            </p>
          </div>
          <div v-else class="text-sm text-gray-500 dark:text-gray-400">
            Encara no hi ha cap plantilla mensual guardada.
          </div>
        </section>

        <USeparator />

        <section class="space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Plantilla per servei</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">Per generar documents d'un servei individual.</p>
            </div>
            <div class="flex gap-2">
              <UButton icon="i-heroicons-folder-arrow-down" variant="soft" @click="triggerTemplateSelect('service')">
                Selecciona fitxer
              </UButton>
              <UButton v-if="serviceTemplate" icon="i-heroicons-arrow-down-tray" variant="ghost"
                @click="downloadTemplate('service')">
                Descarrega
              </UButton>
              <UButton v-if="serviceTemplate" icon="i-heroicons-trash" color="error" variant="ghost"
                @click="clearTemplate('service')">
                Elimina
              </UButton>
            </div>
          </div>
          <input ref="serviceTemplateInput" type="file" class="hidden"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="event => onTemplateUpload('service', event)">
          <div v-if="serviceTemplate"
            class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 space-y-1 text-sm">
            <p class="font-medium text-gray-900 dark:text-white">{{ serviceTemplate.name }}</p>
            <p class="text-gray-600 dark:text-gray-300">Tamany: {{ formatBytes(serviceTemplate.size) }}</p>
            <p class="text-gray-600 dark:text-gray-300">Actualitzada: {{ formatTimestamp(serviceTemplate.updatedAt) }}
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
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Recordatoris</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Configura avisos per imputar les dietes.</p>
          </div>
        </div>
      </template>

      <div class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Dia del mes" name="reminderDay">
            <USelect v-model="formState.reminderDay" :items="dayOptions" />
          </UFormField>

          <UFormField label="Hora" name="reminderTime">
            <UInput v-model="formState.reminderTime" type="time" />
          </UFormField>

          <div class="sm:col-span-2">
            <UCheckbox v-model="formState.reminderRecurring" label="Repetir cada mes"
              help="L'esdeveniment es crearà amb una regla de repetició mensual." />
          </div>
        </div>

        <USeparator />

        <div class="flex flex-col sm:flex-row gap-3">
          <UButton icon="i-simple-icons-googlecalendar" variant="soft" @click="exportCalendar('google')">
            Afegir a Google Calendar
          </UButton>
          <UButton icon="i-heroicons-calendar-days" variant="outline" @click="exportCalendar('ics')">
            Descarregar ICS (Apple/Outlook)
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
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Exportar / Importar</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Gestió de backups i transferència de dades.</p>
          </div>
        </div>
      </template>

      <div class="space-y-8">

        <!-- Common Password Field -->
        <div
          class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800 space-y-4">
          <UCheckbox v-model="exportState.encrypt" label="Encriptar còpia de seguretat"
            help="Protegeix el fitxer amb una contrasenya." />

          <transition enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform -translate-y-2 opacity-0" enter-to-class="transform translate-y-0 opacity-100"
            leave-active-class="transition duration-150 ease-in" leave-from-class="transform translate-y-0 opacity-100"
            leave-to-class="transform -translate-y-2 opacity-0">
            <UFormField v-if="exportState.encrypt" label="Contrasenya d'encriptació" name="exportPassword"
              help="S'utilitza per protegir el fitxer exportat.">
              <UInput v-model="exportState.password" type="password" placeholder="Introdueix una contrasenya segura"
                icon="i-heroicons-lock-closed" />
            </UFormField>
          </transition>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- EXPORT CONFIG -->
          <section class="space-y-4">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5 text-gray-500" />
              Exportar Configuració
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Guarda els preus, les plantilles Word i les opcions de l'aplicació.
            </p>

            <div class="space-y-4 pt-2">
              <UCheckbox v-model="exportState.includeTemplates" label="Incloure plantilles Word"
                help="El fitxer serà més gran." />
              <UButton :loading="isExportingConfig" block variant="soft" icon="i-heroicons-share"
                @click="exportBackup('config', 'share')">
                Exportar Config
              </UButton>
            </div>
          </section>

          <!-- EXPORT DATA -->
          <section class="space-y-4">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-table-cells" class="w-5 h-5 text-gray-500" />
              Exportar Dades
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Guarda els registres dels serveis realitzats.
            </p>

            <div class="space-y-4 pt-2">
              <USelect v-model="exportState.selectedMonth" :items="monthOptions" :disabled="monthOptions.length <= 1"
                placeholder="Tots els mesos" class="w-full" />
              <UButton :loading="isExportingData" block variant="soft" icon="i-heroicons-share"
                @click="exportBackup('data', 'share')">
                Exportar Dades
              </UButton>
            </div>
          </section>
        </div>

        <USeparator />

        <!-- IMPORT SECTION -->
        <section class="space-y-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Importar Backup</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Restaura una configuració o dades des d'un fitxer `.json` anterior.
          </p>

          <div class="grid md:grid-cols-2 gap-4 items-end">
            <UFormField v-if="importState.isEncryptedFile" label="Contrasenya del fitxer" name="importPassword">
              <UInput v-model="importState.password" type="password" placeholder="Contrasenya..."
                icon="i-heroicons-key" />
            </UFormField>

            <UFormField label="Selecciona fitxer" name="importFile">
              <div class="flex gap-2">
                <UButton color="neutral" variant="outline" icon="i-heroicons-folder-open" class="flex-1"
                  @click="handleFileSelect">
                  {{ importState.file ? 'Canviar fitxer' : 'Buscar fitxer...' }}
                </UButton>
              </div>
              <p v-if="importState.file" class="mt-1 text-xs text-primary-600 truncate font-medium">
                {{ importState.file.name }}
              </p>
            </UFormField>
          </div>
          <input ref="importFileInput" type="file" class="hidden" accept="application/json" @change="onFileChange">

          <UButton :loading="isImporting" block color="primary" icon="i-heroicons-arrow-up-on-square"
            :disabled="!importState.file || (importState.isEncryptedFile && !importState.password)"
            @click="prepareImport">
            Processar Importació
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
              <h2 class="text-xl font-semibold text-red-500">Manteniment i Neteja</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">Zona perillosa! Aneu amb compte!</p>
            </div>
          </div>
        </template>

        <div class="space-y-6">
          <div
            class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Ús aproximat d'emmagatzematge</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Dades de serveis locals</p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-primary-600 dark:text-primary-400">{{
                formatBytes(serviceStore.getStorageUsage()) }}</p>
              <p class="text-xs text-gray-500">{{ serviceStore.records.length }} serveis totals</p>
            </div>
          </div>

          <div
            class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Caché de kilòmetres</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Distàncies guardades per estalviar peticions</p>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <p class="text-lg font-bold text-primary-600 dark:text-primary-400">{{
                  formatBytes(distancesStore.getCacheStats().size) }}</p>
                <p class="text-xs text-gray-500">{{ distancesStore.getCacheStats().items }} rutes</p>
              </div>
              <UButton color="error" variant="ghost" icon="i-heroicons-trash" size="xs" @click="confirmClearCache">
                Netejar
              </UButton>
            </div>
          </div>

          <section class="space-y-4">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Esborrar dades</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <UFormField label="Any" name="deleteYear">
                <USelect v-model="maintenanceState.selectedYear" :items="availableYears" placeholder="Selecciona un any"
                  class="w-full" />
              </UFormField>
              <UFormField label="Mes (Opcional)" name="deleteMonth">
                <USelect v-model="maintenanceState.selectedMonth" :items="availableMonthsForYear"
                  :disabled="!maintenanceState.selectedYear" placeholder="Tot l'any" class="w-full" />
              </UFormField>
            </div>

            <UButton block color="error" variant="soft" icon="i-heroicons-trash"
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
        <UButton color="neutral" variant="ghost" @click="confirmModal.isOpen = false">Cancel·lar</UButton>
        <UButton :color="confirmModal.confirmColor" @click="handleConfirm">{{ confirmModal.confirmLabel }}</UButton>
      </template>
    </UModal>

  </div>
</template>
