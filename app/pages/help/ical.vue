<script setup lang="ts">
definePageMeta({
    layout: 'default'
})
</script>

<template>
    <div class="space-y-6 pb-10">

        <UBreadcrumb
:items="[
            { label: 'Inici', to: '/' },
            { label: 'Ajuda', to: '/help' },
            { label: 'Google Calendar' }
        ]" />
        <div class="border-b border-gray-200 dark:border-gray-800 pb-6">
            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Integració amb Google Calendar</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-2">
                Vincula el teu compte de Google per visualitzar i utilitzar els teus esdeveniments a Dietator.
            </p>
        </div>

        <section>
            <UCard>
                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                        Dietator utilitza l'API oficial de Google Calendar per sincronitzar els teus esdeveniments de
                        manera segura.
                        Això et permet:
                    </p>
                    <ul class="list-disc list-inside space-y-1 ml-2">
                        <li>Veure els dies amb esdeveniments (indicador taronja) al calendari principal.</li>
                        <li>Pre-omplir les notes dels nous serveis amb els detalls de l'esdeveniment (títol).</li>
                    </ul>
                </div>
            </UCard>
        </section>

        <section>
            <UCard>
                <template #header>
                    <h3 class="font-semibold text-lg">Com connectar</h3>
                </template>
                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <ol class="list-decimal list-inside space-y-3 ml-2">
                        <li>
                            Ves a la pàgina d'inici o a <strong>Configuració</strong>.
                        </li>
                        <li>
                            Trobaràs un botó que diu <strong>"Connectar"</strong> amb el logotip de Google (o una icona
                            de
                            sincronització si ja ho has fet abans).
                        </li>
                        <li>
                            Fes clic al botó. S'obrirà una finestra emergent de Google.
                        </li>
                        <li>
                            Inicia sessió amb el teu compte de Google i accepta els permisos perquè Dietator pugui
                            <strong>llegir</strong> els teus calendaris.
                            <br>
                            <span class="text-xs text-gray-500">Només demanem permís de lectura
                                (calendar.readonly).</span>
                        </li>
                        <li>
                            Un cop connectat, els esdeveniments es carregaran automàticament.
                        </li>
                    </ol>
                </div>
            </UCard>
        </section>

        <section>
            <UCard>
                <template #header>
                    <h3 class="font-semibold text-lg text-amber-600 dark:text-amber-400">Privadesa i Seguretat</h3>
                </template>
                <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                        La teva privadesa és la nostra prioritat:
                    </p>
                    <ul class="list-disc list-inside space-y-1 ml-2">
                        <li>La connexió es fa directament entre el teu navegador i Google.</li>
                        <li>Les dades dels teus esdeveniments es guarden <strong>només al teu dispositiu</strong>
                            (LocalStorage).</li>
                        <li>Dietator no envia les teves dades a cap servidor extern (excepte a Google per obtenir els
                            esdeveniments).</li>
                    </ul>
                </div>
            </UCard>
        </section>

    </div>
</template>
