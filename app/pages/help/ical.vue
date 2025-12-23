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
            { label: 'Calendari Extern (iCal)' }
        ]" />
        <div class="border-b border-gray-200 dark:border-gray-800 pb-6">
            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Integració de Calendari Extern</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-2">
                Sincronitza el teu calendari personal o professional per veure els teus esdeveniments directament a
                Dietator.
            </p>
        </div>

        <section>
            <UCard>
                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                        Dietator permet importar un calendari extern en format <strong>iCal (.ics)</strong>. Això et
                        permetrà veure els teus compromisos existents al calendari de Dietator (marcats en taronja) per
                        evitar solapar serveis.
                    </p>
                    <p>
                        A continuació t'expliquem com obtenir l'enllaç secret del teu proveïdor de calendari.
                    </p>
                </div>
            </UCard>
        </section>

        <!-- Google Calendar -->
        <section>
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-logos-google-calendar" class="w-5 h-5" />
                        <h3 class="font-semibold text-lg">Google Calendar</h3>
                    </div>
                </template>

                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <ol class="list-decimal list-inside space-y-3 ml-2">
                        <li>
                            Obre <a
href="https://calendar.google.com" target="_blank"
                                class="text-primary-500 hover:underline">Google
                                Calendar</a> al teu ordinador.
                        </li>
                        <li>
                            A la barra lateral esquerra, busca l'apartat "Els meus calendaris". Passa el ratolí per
                            sobre del calendari
                            que vols compartir i fes clic als <strong>tres punts verticals (⋮)</strong> >
                            <strong>Configuració i
                                compartició</strong>.
                        </li>
                        <li>
                            Desplaça't cap avall fins a la secció <strong>"Integració del calendari"</strong>.
                        </li>
                        <li>
                            Busca el camp que diu <strong>"Adreça secreta en format iCal"</strong>.
                            <div
                                class="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded mt-1 text-xs border border-yellow-200 dark:border-yellow-800">
                                ⚠️ Important: Utilitza l'adreça <strong>secreta</strong>, no la pública, llevat que
                                hagis fet públic el
                                teu calendari intencionadament. L'adreça secreta permet a Dietator llegir els
                                esdeveniments sense
                                fer-los públics a tothom.
                            </div>
                        </li>
                        <li>
                            Copia aquesta URL sencera i enganxa-la a la configuració de Dietator.
                        </li>
                    </ol>
                </div>
            </UCard>
        </section>

        <!-- Apple Calendar (iCloud) -->
        <section>
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-logos-apple" class="w-5 h-5 text-gray-900 dark:text-white" />
                        <h3 class="font-semibold text-lg">Apple Calendar (iCloud)</h3>
                    </div>
                </template>

                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <ol class="list-decimal list-inside space-y-3 ml-2">
                        <li>
                            Obre l'aplicació Calendari al teu Mac o ves a <a
href="https://icloud.com/calendar"
                                target="_blank" class="text-primary-500 hover:underline">iCloud.com</a>.
                        </li>
                        <li>
                            A la llista de calendaris de l'esquerra, fes clic a la icona de <strong>compartir (neulina o
                                ones)</strong> al costat del calendari que vols utilitzar.
                        </li>
                        <li>
                            Activa l'opció <strong>"Calendari públic"</strong>.
                            <div class="bg-gray-50 dark:bg-gray-800/50 p-2 rounded mt-1 text-xs">
                                Nota: Apple no ofereix una "adreça secreta" fàcil com Google. Per obtenir la URL iCal,
                                has de
                                fer-lo públic tècnicament. La URL és llarga i difícil d'endevinar, però tingues en
                                compte que
                                tècnicament és accessible.
                            </div>
                        </li>
                        <li>
                            Copia l'enllaç que apareix (començarà per <code>webcal://</code>).
                        </li>
                        <li>
                            Enganxa'l a Dietator. Si tens problemes, pots provar de canviar <code>webcal://</code> per
                            <code>https://</code>.
                        </li>
                    </ol>
                </div>
            </UCard>
        </section>

        <!-- Outlook / Office 365 -->
        <section>
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-logos-microsoft-outlook" class="w-5 h-5" />
                        <h3 class="font-semibold text-lg">Outlook / Office 365</h3>
                    </div>
                </template>

                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <ol class="list-decimal list-inside space-y-3 ml-2">
                        <li>
                            Inicia sessió a <a
href="https://outlook.live.com/calendar" target="_blank"
                                class="text-primary-500 hover:underline">Outlook.com</a> o Office 365.
                        </li>
                        <li>
                            Fes clic a la icona de l'engranatge (Configuració) a la part superior dreta.
                        </li>
                        <li>
                            Ves a <strong>"Calendar"</strong> > <strong>"Shared calendars"</strong> (Calendaris
                            compartits).
                        </li>
                        <li>
                            A la secció <strong>"Publish a calendar"</strong> (Publicar un calendari), selecciona el
                            calendari
                            que vols utilitzar i els permisos (ex: "Can view all details").
                        </li>
                        <li>
                            Fes clic a "Publish" (Publicar). Apareixeran dos enllaços.
                        </li>
                        <li>
                            Copia l'enllaç <strong>ICS</strong> i enganxa'l a Dietator.
                        </li>
                    </ol>
                </div>
            </UCard>
        </section>
    </div>
</template>
