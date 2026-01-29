<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const serviceStore = useServiceStore()
const distancesStore = useDistancesStore()

const maintenanceState = reactive({
    selectedYear: undefined as number | undefined,
    selectedMonth: undefined as number | undefined
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

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

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

const handleConfirm = async () => {
    if (confirmModal.action) {
        await confirmModal.action()
    }
    confirmModal.isOpen = false
}
</script>

<template>
    <section class="space-y-4">
        <UCard>
            <template #header>
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-red-50 dark:bg-red-900/40 rounded-lg">
                        <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h2 class="text-xl font-semibold text-red-500">{{ $t('settings.maintenance.title') }}</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.maintenance.description') }}
                        </p>
                    </div>
                </div>
            </template>

            <div class="space-y-6">
                <div
                    class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">{{
                            $t('settings.maintenance.storage_usage')
                            }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{
                            $t('settings.maintenance.local_data') }}</p>
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
                        <p class="text-sm font-medium text-gray-900 dark:text-white">{{
                            $t('settings.maintenance.cache_title') }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{
                            $t('settings.maintenance.cache_description')
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
                        <UButton
color="error" variant="ghost" icon="i-heroicons-trash" size="xs"
                            @click="confirmClearCache">
                            {{ $t('settings.maintenance.clear_cache') }}
                        </UButton>
                    </div>
                </div>

                <section class="space-y-4">
                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{
                        $t('settings.maintenance.delete_data')
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
                                :disabled="!maintenanceState.selectedYear"
                                :placeholder="$t('settings.maintenance.entire_year')" class="w-full" />
                        </UFormField>
                    </div>

                    <UButton
block color="error" variant="soft" icon="i-heroicons-trash"
                        :disabled="!maintenanceState.selectedYear" @click="confirmDelete">
                        {{ deleteButtonLabel }}
                    </UButton>
                </section>
            </div>

            <!-- Local Confirmation Modal -->
            <UModal
v-model:open="confirmModal.isOpen" :title="confirmModal.title"
                :description="confirmModal.description">
                <template #footer>
                    <UButton color="neutral" variant="ghost" @click="confirmModal.isOpen = false">{{ $t('common.cancel')
                        }}
                    </UButton>
                    <UButton :color="confirmModal.confirmColor" @click="handleConfirm">{{ confirmModal.confirmLabel }}
                    </UButton>
                </template>
            </UModal>
        </UCard>
    </section>
</template>
