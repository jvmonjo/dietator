<script setup lang="ts">
const { locale, setLocale, t } = useI18n()

const languageOptions = [
    { label: 'ca', value: 'ca' },
    { label: 'es', value: 'es' }
]
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                    <UIcon name="i-heroicons-language" class="w-6 h-6 text-primary-500" />
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ t('settings.language.title') }}
                    </h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('settings.language.description') }}</p>
                </div>
            </div>
        </template>
        <div class="flex gap-4">
            <div class="w-full sm:w-1/2">
                <USelect
:model-value="locale" :items="languageOptions" option-attribute="label" value-attribute="value"
                    @update:model-value="(val) => setLocale(val as 'ca' | 'es')" />
            </div>
        </div>
    </UCard>
</template>
