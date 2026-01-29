<script setup lang="ts">
import type { TemplateType } from '~/stores/settings'

const { t } = useI18n()
const toast = useToast()
const settingsStore = useSettingsStore()
const { monthlyTemplate, serviceTemplate } = storeToRefs(settingsStore)

const monthlyTemplateInput = ref<HTMLInputElement | null>(null)
const serviceTemplateInput = ref<HTMLInputElement | null>(null)
const templateInputs: Record<TemplateType, Ref<HTMLInputElement | null>> = {
    monthly: monthlyTemplateInput,
    service: serviceTemplateInput
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

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTimestamp = (value?: string) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('ca-ES')
}
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                    <UIcon name="i-heroicons-document-text" class="w-6 h-6 text-primary-500" />
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.templates.title') }}
                    </h2>
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
                        <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{
                            $t('settings.templates.monthly') }}
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{{
                            $t('settings.templates.monthly_description') }}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <UButton
icon="i-heroicons-folder-arrow-down" variant="soft"
                            @click="triggerTemplateSelect('monthly')">
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
                        <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{
                            $t('settings.templates.service') }}
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{{
                            $t('settings.templates.service_description') }}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <UButton
icon="i-heroicons-folder-arrow-down" variant="soft"
                            @click="triggerTemplateSelect('service')">
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
</template>
