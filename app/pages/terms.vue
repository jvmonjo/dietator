<!-- eslint-disable vue/no-v-html -->
<template>
    <div class="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sm:p-10 border border-gray-100 dark:border-gray-700">
            <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
                {{ $t('terms.title') }}
            </h1>

            <div class="space-y-8 text-gray-600 dark:text-gray-300">
                <!-- Naturalesa del servei -->
                <!-- Naturalesa del servei -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('terms.nature.title') }}</h2>
                    <p v-html="$t('terms.nature.p1')" />
                    <p class="mt-2">
                        {{ $t('terms.nature.p2') }}
                    </p>
                </section>

                <!-- Estat del projecte: BETA -->
                <!-- Estat del projecte: BETA -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('terms.beta.title') }}
                    </h2>
                    <p v-html="$t('terms.beta.p1')" />
                </section>

                <!-- Exempció de responsabilitat -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('terms.disclaimer.title') }}
                    </h2>
                    <p v-html="$t('terms.disclaimer.p1')" />
                    <p class="mt-2">
                        {{ $t('terms.disclaimer.p2') }}
                    </p>
                    <div
class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200"
                        v-html="$t('terms.disclaimer.warning')" />
                </section>

                <!-- Privacitat -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('terms.privacy.title') }}
                    </h2>
                    <p v-html="$t('terms.privacy.p1')" />
                    <p class="mt-2">
                        {{ $t('terms.privacy.p2') }}
                    </p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li>{{ $t('terms.privacy.li1') }}</li>
                        <li>{{ $t('terms.privacy.li2') }}</li>
                    </ul>
                </section>

                <!-- Llicència -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('terms.license.title') }}
                    </h2>
                    <p>
                        {{ $t('terms.license.p1') }}
                    </p>
                </section>
            </div>
        </div>
    </div>
</template>

<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
const { t } = useI18n()

useHead({
    title: computed(() => `${t('terms.title')} - Dietator`)
})
</script>
