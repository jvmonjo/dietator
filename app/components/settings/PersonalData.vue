<script setup lang="ts">
const firstName = defineModel<string>('firstName')
const lastName = defineModel<string>('lastName')
const nationalId = defineModel<string>('nationalId')
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                    <UIcon name="i-heroicons-user" class="w-6 h-6 text-primary-500" />
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{
                        $t('settings.personal_data.title') }}
                    </h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.personal_data.description') }}
                    </p>
                </div>
            </div>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="$t('common.firstName')" name="firstName">
                <UInput v-model="firstName" :placeholder="$t('settings.personal_data.firstNamePlaceholder')" />
            </UFormField>
            <UFormField :label="$t('common.lastName')" name="lastName">
                <UInput v-model="lastName" :placeholder="$t('settings.personal_data.lastNamePlaceholder')" />
            </UFormField>
            <UFormField :label="$t('common.nationalId')" name="nationalId" class="md:col-span-2">
                <UInput v-model="nationalId" placeholder="12345678Z" />
            </UFormField>
        </div>
    </UCard>
</template>
