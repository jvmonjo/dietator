<script setup lang="ts">
import { encryptBackup, decryptBackup, isEncryptedBackup, type BackupPayload } from '~/utils/secureBackup'
import type { ServiceRecord } from '~/stores/services'

const emit = defineEmits<{
    (e: 'imported'): void
}>()

const { t, locale, setLocale } = useI18n()
const toast = useToast()
const settingsStore = useSettingsStore()
const serviceStore = useServiceStore()
const distancesStore = useDistancesStore()
const externalCalendarStore = useExternalCalendarStore()

const importFileInput = ref<HTMLInputElement | null>(null)
const isExportingConfig = ref(false)
const isExportingData = ref(false)
const isImporting = ref(false)

const exportState = reactive({
    password: '',
    selectedYear: 0, // 0 = All
    selectedMonth: 0, // 0 = All
    includeTemplates: true,
    encrypt: false,
    includeGoogleAuth: true
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

watch(() => exportState.selectedYear, (newYear) => {
    if (newYear === 0) {
        exportState.selectedMonth = 0
    }
})

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
        // Removed direct formState updates. The parent should handle this upon event.
        // However, setLocale is global.
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

    // Emit event to notify parent to reload form state if needed
    if (settings) {
        emit('imported')
    }
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

            // Pass detected year to processImport via payload mutation
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
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-primary-500" />
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.backup.title') }}
                    </h2>
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
                    enter-from-class="transform -translate-y-2 opacity-0"
                    enter-to-class="transform translate-y-0 opacity-100"
                    leave-active-class="transition duration-150 ease-in"
                    leave-from-class="transform translate-y-0 opacity-100"
                    leave-to-class="transform -translate-y-2 opacity-0">
                    <UFormField
v-if="exportState.encrypt" :label="$t('settings.backup.password')" name="exportPassword"
                        :help="$t('settings.backup.password_help')">
                        <UInput
v-model="exportState.password" type="password"
                            placeholder="Introdueix una contrasenya segura" icon="i-heroicons-lock-closed" />
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
v-model="exportState.includeTemplates"
                            :label="$t('settings.backup.include_templates')"
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
                <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ $t('settings.backup.import_config')
                    }}
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
                                {{ importState.file ? $t('settings.backup.change_file') :
                                    $t('settings.backup.search_file') }}
                            </UButton>
                        </div>
                        <p v-if="importState.file" class="mt-1 text-xs text-primary-600 truncate font-medium">
                            {{ importState.file.name }}
                        </p>
                    </UFormField>
                </div>
                <input
ref="importFileInput" type="file" class="hidden" accept="application/json"
                    @change="onFileChange">

                <UButton
:loading="isImporting" block color="primary" icon="i-heroicons-arrow-up-on-square"
                    :disabled="!importState.file || (importState.isEncryptedFile && !importState.password)"
                    @click="prepareImport">
                    {{ $t('settings.backup.process_import') }}
                </UButton>
            </section>
        </div>

        <!-- Local Confirmation Modal -->
        <UModal v-model:open="confirmModal.isOpen" :title="confirmModal.title" :description="confirmModal.description">
            <template #footer>
                <UButton color="neutral" variant="ghost" @click="confirmModal.isOpen = false">{{ $t('common.cancel') }}
                </UButton>
                <UButton :color="confirmModal.confirmColor" @click="handleConfirm">{{ confirmModal.confirmLabel }}
                </UButton>
            </template>
        </UModal>
    </UCard>
</template>
