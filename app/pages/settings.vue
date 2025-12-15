<script setup lang="ts">
import { encryptBackup, decryptBackup } from '~/utils/secureBackup'

const settingsStore = useSettingsStore()
const serviceStore = useServiceStore()
const toast = useToast()
const { provinces, getMunicipalities } = useLocations()
const importFileInput = ref<HTMLInputElement | null>(null)

const formState = reactive({
  halfDietPrice: settingsStore.halfDietPrice || 0,
  fullDietPrice: settingsStore.fullDietPrice || 0,
  originProvince: settingsStore.originProvince || '',
  originMunicipality: settingsStore.originMunicipality || ''
})

const exportState = reactive({
  password: ''
})

const importState = reactive({
  password: '',
  file: null as File | null
})

const isExporting = ref(false)
const isImporting = ref(false)

const saveSettings = () => {
  const normalizedHalfPrice = Number(formState.halfDietPrice) || 0
  const normalizedFullPrice = Number(formState.fullDietPrice) || 0

  settingsStore.updateDietPrices({
    half: normalizedHalfPrice,
    full: normalizedFullPrice
  })
  settingsStore.updateOrigin(formState.originProvince, formState.originMunicipality)
  toast.add({ title: 'Configuracio guardada', color: 'success' })
}

const handleFileSelect = () => {
  importFileInput.value?.click()
}

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  importState.file = target.files?.[0] ?? null
}

const getBackupPayload = () => ({
  services: JSON.parse(JSON.stringify(serviceStore.records)),
  settings: {
    halfDietPrice: settingsStore.halfDietPrice,
    fullDietPrice: settingsStore.fullDietPrice,
    originProvince: settingsStore.originProvince,
    originMunicipality: settingsStore.originMunicipality
  }
})

const exportBackup = async () => {
  if (!exportState.password) {
    toast.add({ title: 'Indica una contrasenya', color: 'warning' })
    return
  }

  isExporting.value = true
  try {
    const backup = await encryptBackup(exportState.password, getBackupPayload())
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
    if (!payload?.services || !payload?.settings) {
      throw new Error('Backup malformat')
    }
    serviceStore.setRecords(payload.services)
    settingsStore.loadSettings(payload.settings)
    formState.halfDietPrice = settingsStore.halfDietPrice
    formState.fullDietPrice = settingsStore.fullDietPrice
    formState.originProvince = settingsStore.originProvince
    formState.originMunicipality = settingsStore.originMunicipality
    toast.add({ title: 'Backup importat', color: 'success' })
    importState.file = null
    if (importFileInput.value) {
      importFileInput.value.value = ''
    }
  } catch (error) {
    console.error(error)
    toast.add({ title: 'Error en importar el backup', color: 'error' })
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p class="text-gray-600 dark:text-gray-400">
          Marca el preu de la mitja dieta i de la dieta completa (dinar i sopar). Ho fem separat per si no és exactament el doble.
        </p>
      </div>
      <UButton to="/stats" icon="i-heroicons-chart-bar" variant="ghost">Veure estadistiques</UButton>
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
          <UFormField label="Preu mitja dieta" name="halfDietPrice" hint="Dinar o sopar." help="S'aplica quan només hi ha un àpat.">
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

        <USeparator label="Origen dels desplaçaments" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Província d'origen" name="originProvince">
            <ProvinceSelect
              v-model="formState.originProvince"
              :items="provinces"
              placeholder="Tria província"
              @update:model-value="formState.originMunicipality = ''"
            />
          </UFormField>

          <UFormField label="Municipi d'origen" name="originMunicipality">
            <MunicipalitySelect
              v-model="formState.originMunicipality"
              :items="getMunicipalities(formState.originProvince)"
              :disabled="!formState.originProvince"
              placeholder="Tria municipi"
            />
          </UFormField>
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
