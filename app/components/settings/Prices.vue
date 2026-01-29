<script setup lang="ts">
const halfDietPrice = defineModel<string | number>('halfDietPrice')
const fullDietPrice = defineModel<string | number>('fullDietPrice')
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                    <UIcon name="i-heroicons-currency-euro" class="w-6 h-6 text-primary-500" />
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.prices.title') }}
                    </h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.prices.description') }}</p>
                </div>
            </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="$t('settings.prices.half_diet')" name="halfDietPrice">
                <UInput
v-model="halfDietPrice" type="text" icon="i-heroicons-currency-euro" inputmode="decimal"
                    placeholder="0.00" />
            </UFormField>

            <UFormField :label="$t('settings.prices.full_diet')" name="fullDietPrice">
                <UInput
v-model="fullDietPrice" type="text" icon="i-heroicons-currency-euro" inputmode="decimal"
                    placeholder="0.00" />
            </UFormField>
        </div>
    </UCard>
</template>
