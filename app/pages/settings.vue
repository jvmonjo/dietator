<script setup lang="ts">
import type { TemplateType } from '~/stores/settings'
import { encryptBackup, decryptBackup } from '~/utils/secureBackup'

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
  halfDietPrice: settingsStore.halfDietPrice || 0,
  fullDietPrice: settingsStore.fullDietPrice || 0
})

const exportState = reactive({
  password: '',
  includeSettings: true,
  includeData: true,
  selectedMonth: 'all'
})

const importState = reactive({
  password: '',
  file: null as File | null
})

const { monthlyTemplate, serviceTemplate, monthlyTemplateLocation, serviceTemplateLocation } = storeToRefs(settingsStore)

const isExporting = ref(false)
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

const hasMonthData = computed(() => monthsWithData.value.length > 0)

const filteredServices = computed(() => {
  if (!exportState.includeData) {
    return []
  }
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

const saveSettings = () => {
  const normalizedHalfPrice = Number(formState.halfDietPrice) || 0
  const normalizedFullPrice = Number(formState.fullDietPrice) || 0

  settingsStore.updateDietPrices({
    half: normalizedHalfPrice,
    full: normalizedFullPrice
  })
  toast.add({ title: 'Configuracio guardada', color: 'success' })
}

const handleFileSelect = () => {
  importFileInput.value?.click()
}

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  importState.file = target.files?.[0] ?? null
}

const getBackupPayload = () => {
  const payload: Record<string, any> = {}

  if (exportState.includeData) {
    payload.services = JSON.parse(JSON.stringify(filteredServices.value))
    payload.meta = {
      ...(payload.meta || {}),
      month: exportState.selectedMonth
    }
  }

  if (exportState.includeSettings) {
    payload.settings = {
      halfDietPrice: settingsStore.halfDietPrice,
      fullDietPrice: settingsStore.fullDietPrice,
      monthlyTemplate: settingsStore.exportTemplates ? settingsStore.monthlyTemplate : null,
      serviceTemplate: settingsStore.exportTemplates ? settingsStore.serviceTemplate : null,
      monthlyTemplateLocation: settingsStore.monthlyTemplateLocation,
      serviceTemplateLocation: settingsStore.serviceTemplateLocation,
      exportTemplates: settingsStore.exportTemplates
    }
  }

  return payload
}

const exportBackup = async () => {
  if (!exportState.password) {
    toast.add({ title: 'Indica una contrasenya', color: 'warning' })
    return
  }

  if (!exportState.includeSettings && !exportState.includeData) {
    toast.add({ title: 'Selecciona què vols exportar', color: 'warning' })
    return
  }

  isExporting.value = true
  try {
    const payload = getBackupPayload()
    if (!payload.services && !payload.settings) {
      toast.add({ title: 'No hi ha contingut per exportar', color: 'warning' })
      return
    }
    const backup = await encryptBackup(exportState.password, payload)
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().split('T')[0]
    link.href = url
    link.download = `dietator-backup-${timestamp}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.add({ title: 'Backup exportat correctament', color: 'success' })
  } catch (error) {
    console.error(error)
    toast.add({ title: 'No s\'ha pogut exportar', color: 'error' })
  } finally {
    isExporting.value = false
  }
}

const importBackup = async () => {
  if (!importState.password) {
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
    const payload = await decryptBackup(importState.password, parsed)
    const hasServices = Array.isArray(payload?.services)
    const hasSettings = payload?.settings && typeof payload.settings === 'object'
    if (!hasServices && !hasSettings) {
      throw new Error('Backup malformat')
    }
    if (hasServices) {
      serviceStore.setRecords(payload.services)
    }
    if (hasSettings) {
      settingsStore.loadSettings(payload.settings)
      formState.halfDietPrice = settingsStore.halfDietPrice
      formState.fullDietPrice = settingsStore.fullDietPrice
    }
    const description = hasServices && hasSettings
      ? 'S\'han actualitzat les dades i la configuració'
      : hasServices
          ? 'S\'han actualitzat les dades'
          : 'S\'ha actualitzat la configuració'
    toast.add({ title: 'Backup importat', description, color: 'success' })
    importState.file = null
    if (importFileInput.value) {
      importFileInput.value.value = ''
    }
    Object.values(templateInputs).forEach((input) => {
      if (input.value) input.value.value = ''
    })
  } catch (error) {
    console.error(error)
    toast.add({ title: 'Error en importar el backup', color: 'error' })
  } finally {
    isImporting.value = false
  }
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
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      </div>
    </div>

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
              v-model.number="formState.halfDietPrice"
              type="number"
              step="0.01"
              min="0"
              icon="i-heroicons-currency-euro"
              inputmode="decimal"
            />
          </UFormField>

          <UFormField label="Preu dieta completa" name="fullDietPrice" hint="Dinar i sopar.">
            <UInput
              v-model.number="formState.fullDietPrice"
              type="number"
              step="0.01"
              min="0"
              icon="i-heroicons-currency-euro"
              inputmode="decimal"
            />
          </UFormField>
        </div>

        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Dinar o sopar: aplica mitja dieta</span>
          <span>Dinar i sopar: aplica dieta completa</span>
        </div>

        <div class="flex gap-3 pt-2">
          <UButton type="submit" icon="i-heroicons-check-circle">Desar configuracio</UButton>
          <UButton to="/" variant="ghost" icon="i-heroicons-arrow-left">Tornar a l'inici</UButton>
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
            <p class="text-sm text-gray-500 dark:text-gray-400">Puja la plantilla `.docx` o indica la ubicació on la tens guardada.</p>
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
          <UFormField
            label="Ubicació externa (opcional)"
            help="Ruta local, URL o qualsevol pista sobre on tens la plantilla original."
          >
            <UInput
              v-model="monthlyTemplateLocation"
              placeholder="Ex. OneDrive/Plantilles/Dietator-Mensual.docx"
              icon="i-heroicons-map-pin"
            />
          </UFormField>
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
          <UFormField
            label="Ubicació externa (opcional)"
            help="Serveix per recordar on tens la plantilla oficial si no la puges aquí."
          >
            <UInput
              v-model="serviceTemplateLocation"
              placeholder="Ex. SharePoint/Plantilla-Servei.docx"
              icon="i-heroicons-map-pin"
            />
          </UFormField>
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
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Exportar / Importar dades</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Protegeix els teus registres amb una contrasenya.</p>
          </div>
        </div>
      </template>

      <div class="space-y-8">
        <section class="space-y-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Exportar còpia de seguretat</h3>
          <UFormField label="Contrasenya per xifrar" name="exportPassword">
            <UInput
              v-model="exportState.password"
              type="password"
              placeholder="Introdueix una contrasenya"
            />
          </UFormField>
          <UCheckbox
            v-model="exportState.includeSettings"
            label="Incloure configuració"
            help="Preus, plantilles i ubicacions guardades."
          />
          <UCheckbox
            v-model="exportState.includeData"
            label="Incloure totes les dades"
            help="Serveis registrats a Dietator."
          />
          <UCheckbox
            v-model="settingsStore.exportTemplates"
            label="Incloure plantilles"
            help="Si ho marques, el fitxer de backup serà més gran ja que inclourà els Word."
            :disabled="!exportState.includeSettings"
            class="mb-4"
          />
          <UFormField
            v-if="exportState.includeData"
            label="Mes per exportar"
            help="Selecciona un mes concret o escull 'Tots els mesos'."
          >
            <USelect
              v-model="exportState.selectedMonth"
              :items="monthOptions"
              :disabled="monthOptions.length <= 1"
              placeholder="Tots els mesos"
              menu-teleport-to="body"
            />
            <p v-if="!hasMonthData" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Encara no hi ha dades registrades. Quan hi hagi serveis, podràs triar el mes a exportar.
            </p>
          </UFormField>
          <UButton :loading="isExporting" icon="i-heroicons-arrow-down-on-square-stack" @click="exportBackup">
            Exportar backup
          </UButton>
        </section>

        <USeparator />

        <section class="space-y-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Importar còpia de seguretat</h3>
          <UFormField label="Fitxer" name="importFile">
            <div class="flex items-center gap-3">
              <UButton variant="soft" icon="i-heroicons-folder-arrow-down" @click="handleFileSelect">
                Selecciona fitxer
              </UButton>
              <span class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ importState.file ? importState.file.name : 'Cap fitxer seleccionat' }}
              </span>
            </div>
            <input
              ref="importFileInput"
              type="file"
              class="hidden"
              accept="application/json"
              @change="onFileChange"
            >
          </UFormField>

          <UFormField label="Contrasenya per desencriptar" name="importPassword">
            <UInput
              v-model="importState.password"
              type="password"
              placeholder="Introdueix la contrasenya del backup"
            />
          </UFormField>

          <UButton :loading="isImporting" color="primary" icon="i-heroicons-arrow-up-on-square-stack" @click="importBackup">
            Importar backup
          </UButton>
        </section>
      </div>
    </UCard>
  </div>
</template>
