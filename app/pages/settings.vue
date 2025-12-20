<script setup lang="ts">
import type { TemplateType } from '~/stores/settings'
import type { ServiceRecord } from '~/stores/services'
import { encryptBackup, decryptBackup, isEncryptedBackup, type BackupPayload } from '~/utils/secureBackup'

import { validateSpanishId } from 'spain-id'

const settingsStore = useSettingsStore()
const serviceStore = useServiceStore()
const toast = useToast()
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
  nationalId: settingsStore.nationalId || ''
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
  action: null as (() => Promise<void>) | null
})

const { monthlyTemplate, serviceTemplate } = storeToRefs(settingsStore)

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
    toast.add({ title: 'DNI/NIE incorrecte', color: 'error' })
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
  settingsStore.$patch({ googleMapsApiKey: formState.googleMapsApiKey })
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
  nationalId: settingsStore.nationalId
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

const exportBackup = async (type: 'config' | 'data') => {
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

    const url = URL.createObjectURL(resultBlob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().split('T')[0] ?? new Date().toISOString()
    const filename = buildBackupFilename(type, timestamp)
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    toast.add({ title: 'Backup exportat correctament', color: 'success' })
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

const formatBytes = (size?: number) => {
  if (!size || size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / Math.pow(1024, index)
  return `${value.toFixed(1)} ${units[index]}`
}

const formatTimestamp = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ca-ES')
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Configuració</h1>
      </div>
      <div class="flex gap-2">
         <UButton @click="saveSettings" icon="i-heroicons-check-circle">Desar configuració</UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-user" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Dades Personals</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Informació que apareixerà a les plantilles.</p>
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
        <UFormField label="DNI / NIE" name="nationalId" class="md:col-span-2">
          <UInput v-model="formState.nationalId" placeholder="12345678Z" />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-cog-6-tooth" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Preus de les dietes</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Introdueix imports separats per la mitja dieta i la completa.</p>
          </div>
        </div>
      </template>

      <UForm :state="formState" class="space-y-6" @submit="saveSettings">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Preu mitja dieta" name="halfDietPrice" hint="Dinar o sopar." >
            <UInput
              v-model="formState.halfDietPrice"
              type="text"
              icon="i-heroicons-currency-euro"
              inputmode="decimal"
              placeholder="0.00"
            />
          </UFormField>

          <UFormField label="Preu dieta completa" name="fullDietPrice" hint="Dinar i sopar.">
            <UInput
              v-model="formState.fullDietPrice"
              type="text"
              icon="i-heroicons-currency-euro"
              inputmode="decimal"
              placeholder="0.00"
            />
          </UFormField>
        </div>

        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Dinar o sopar: aplica mitja dieta</span>
          <span>Dinar i sopar: aplica dieta completa</span>
        </div>

        <div class="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-puzzle-piece" class="w-5 h-5 text-gray-500" />
            Integracions
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Configureu serveis externs per automatitzar tasques.
          </p>

          <UFormField label="Google Maps API Key" name="googleMapsApiKey" help="Necessari per al càlcul automàtic de quilòmetres.">
            <UInput
              v-model="formState.googleMapsApiKey"
              type="password"
              icon="i-heroicons-key"
              placeholder="AIza..."
            />
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
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Plantilles Word</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Puja la plantilla `.docx` per generar els documents des d'aquesta aplicació.</p>
            <NuxtLink to="/help" class="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium inline-flex items-center gap-1 mt-1">
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
              <p class="text-sm text-gray-500 dark:text-gray-400">S'utilitza per generar tots els desplaçaments del mes.</p>
            </div>
            <div class="flex gap-2">
              <UButton icon="i-heroicons-folder-arrow-down" variant="soft" @click="triggerTemplateSelect('monthly')">
                Selecciona fitxer
              </UButton>
              <UButton
                v-if="monthlyTemplate"
                icon="i-heroicons-arrow-down-tray"
                variant="ghost"
                @click="downloadTemplate('monthly')"
              >
                Descarrega
              </UButton>
              <UButton
                v-if="monthlyTemplate"
                icon="i-heroicons-trash"
                color="error"
                variant="ghost"
                @click="clearTemplate('monthly')"
              >
                Elimina
              </UButton>
            </div>
          </div>
          <input
            ref="monthlyTemplateInput"
            type="file"
            class="hidden"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="event => onTemplateUpload('monthly', event)"
          >
          <div v-if="monthlyTemplate" class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 space-y-1 text-sm">
            <p class="font-medium text-gray-900 dark:text-white">{{ monthlyTemplate.name }}</p>
            <p class="text-gray-600 dark:text-gray-300">Tamany: {{ formatBytes(monthlyTemplate.size) }}</p>
            <p class="text-gray-600 dark:text-gray-300">Actualitzada: {{ formatTimestamp(monthlyTemplate.updatedAt) }}</p>
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
              <UButton
                v-if="serviceTemplate"
                icon="i-heroicons-arrow-down-tray"
                variant="ghost"
                @click="downloadTemplate('service')"
              >
                Descarrega
              </UButton>
              <UButton
                v-if="serviceTemplate"
                icon="i-heroicons-trash"
                color="error"
                variant="ghost"
                @click="clearTemplate('service')"
              >
                Elimina
              </UButton>
            </div>
          </div>
          <input
            ref="serviceTemplateInput"
            type="file"
            class="hidden"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="event => onTemplateUpload('service', event)"
          >
          <div v-if="serviceTemplate" class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 space-y-1 text-sm">
            <p class="font-medium text-gray-900 dark:text-white">{{ serviceTemplate.name }}</p>
            <p class="text-gray-600 dark:text-gray-300">Tamany: {{ formatBytes(serviceTemplate.size) }}</p>
            <p class="text-gray-600 dark:text-gray-300">Actualitzada: {{ formatTimestamp(serviceTemplate.updatedAt) }}</p>
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
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Exportar / Importar</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Gestió de backups i transferència de dades.</p>
          </div>
        </div>
      </template>

      <div class="space-y-8">
        
        <!-- Common Password Field -->
        <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800 space-y-4">
           <UCheckbox
             v-model="exportState.encrypt"
             label="Encriptar còpia de seguretat"
             help="Protegeix el fitxer amb una contrasenya."
           />

           <transition
             enter-active-class="transition duration-200 ease-out"
             enter-from-class="transform -translate-y-2 opacity-0"
             enter-to-class="transform translate-y-0 opacity-100"
             leave-active-class="transition duration-150 ease-in"
             leave-from-class="transform translate-y-0 opacity-100"
             leave-to-class="transform -translate-y-2 opacity-0"
           >
             <UFormField v-if="exportState.encrypt" label="Contrasenya d'encriptació" name="exportPassword" help="S'utilitza per protegir el fitxer exportat.">
              <UInput
                v-model="exportState.password"
                type="password"
                placeholder="Introdueix una contrasenya segura"
                icon="i-heroicons-lock-closed"
              />
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
              <UCheckbox
                v-model="exportState.includeTemplates"
                label="Incloure plantilles Word" 
                help="El fitxer serà més gran."
              />
              <UButton 
                :loading="isExportingConfig" 
                block 
                variant="soft" 
                icon="i-heroicons-arrow-down-on-square" 
                @click="exportBackup('config')"
              >
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
              <USelect
                v-model="exportState.selectedMonth"
                :items="monthOptions"
                :disabled="monthOptions.length <= 1"
                placeholder="Tots els mesos"
                class="w-full"
              />
               <UButton 
                :loading="isExportingData" 
                block 
                variant="soft"
                icon="i-heroicons-arrow-down-on-square-stack" 
                @click="exportBackup('data')"
              >
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
              <UInput
                v-model="importState.password"
                type="password"
                placeholder="Contrasenya..."
                icon="i-heroicons-key"
              />
            </UFormField>

            <UFormField label="Selecciona fitxer" name="importFile">
              <div class="flex gap-2">
                 <UButton 
                  color="neutral" 
                  variant="outline"
                  icon="i-heroicons-folder-open" 
                  class="flex-1"
                  @click="handleFileSelect"
                >
                  {{ importState.file ? 'Canviar fitxer' : 'Buscar fitxer...' }}
                </UButton>
              </div>
              <p v-if="importState.file" class="mt-1 text-xs text-primary-600 truncate font-medium">
                {{ importState.file.name }}
              </p>
            </UFormField>
          </div>
            <input
              ref="importFileInput"
              type="file"
              class="hidden"
              accept="application/json"
              @change="onFileChange"
            >

          <UButton 
            :loading="isImporting" 
            block 
            color="primary" 
            icon="i-heroicons-arrow-up-on-square" 
            :disabled="!importState.file || (importState.isEncryptedFile && !importState.password)"
            @click="prepareImport"
          >
            Processar Importació
          </UButton>
        </section>
      </div>
    </UCard>

    <!-- Confirmation Modal -->
    <UModal v-model:open="confirmModal.isOpen" :title="confirmModal.title" :description="confirmModal.description">
      <template #footer>
        <UButton color="neutral" variant="ghost" @click="confirmModal.isOpen = false">Cancel·lar</UButton>
        <UButton color="primary" @click="handleConfirm">Confirmar i Importar</UButton>
      </template>
    </UModal>

  </div>
</template>
