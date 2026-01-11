<!-- eslint-disable vue/no-v-html -->
<template>
    <div class="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sm:p-10 border border-gray-100 dark:border-gray-700">
            <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
                {{ $t('privacy.title') }}
            </h1>

            <div class="space-y-8 text-gray-600 dark:text-gray-300">
                <!-- Filosofia Local-First -->
                <!-- Filosofia Local-First -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{
                        $t('privacy.local_first.title')
                        }}</h2>
                    <p v-html="$t('privacy.local_first.p1')" />
                    <p class="mt-2" v-html="$t('privacy.local_first.p2')" />
                </section>

                <!-- Responsabilitat de l'Usuari -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{
                        $t('privacy.responsibility.title')
                        }}</h2>
                    <p v-html="$t('privacy.responsibility.p1')" />
                    <p class="mt-2">
                        {{ $t('privacy.responsibility.p2') }}
                    </p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li>{{ $t('privacy.responsibility.li1') }}</li>
                        <li v-html="$t('privacy.responsibility.li2')" />
                        <li v-html="$t('privacy.responsibility.li3')" />
                    </ul>
                </section>

                <!-- Tipus de dades -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('privacy.stored_data.title')
                        }}</h2>
                    <p>
                        {{ $t('privacy.stored_data.p1') }}
                    </p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li>{{ $t('privacy.stored_data.li1') }}</li>
                        <li>{{ $t('privacy.stored_data.li2') }}</li>
                        <li>{{ $t('privacy.stored_data.li3') }}</li>
                        <li>{{ $t('privacy.stored_data.li4') }}</li>
                        <li>{{ $t('privacy.stored_data.li5') }}</li>
                    </ul>
                </section>

                <!-- Serveis de Tercers -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('privacy.third_party.title')
                        }}</h2>
                    <p>
                        {{ $t('privacy.third_party.p1') }}
                    </p>
                    <div class="mt-4 space-y-4">
                        <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <h3 class="font-bold text-gray-900 dark:text-white">{{
                                $t('privacy.third_party.google_calendar.title') }}</h3>
                            <p class="text-sm mt-1">
                                {{ $t('privacy.third_party.google_calendar.description') }}
                            </p>
                        </div>
                        <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <h3 class="font-bold text-gray-900 dark:text-white">{{
                                $t('privacy.third_party.google_maps.title')
                                }}</h3>
                            <p class="text-sm mt-1">
                                {{ $t('privacy.third_party.google_maps.description') }}
                            </p>
                        </div>
                    </div>
                </section>

                <!-- Drets i Eliminació -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('privacy.deletion.title') }}
                    </h2>
                    <p>
                        {{ $t('privacy.deletion.p1') }}
                    </p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li>{{ $t('privacy.deletion.li1') }}</li>
                        <li>{{ $t('privacy.deletion.li2') }}</li>
                    </ul>
                </section>

                <!-- Contacte -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('privacy.contact.title') }}
                    </h2>
                    <p v-html="$t('privacy.contact.p1')" />
                </section>
            </div>
        </div>
    </div>
</template>

<!-- eslint-disable vue/no-v-html -->
<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
const { t } = useI18n()

useHead({
    title: computed(() => `${t('privacy.title')} - Dietator`)
})
</script>
