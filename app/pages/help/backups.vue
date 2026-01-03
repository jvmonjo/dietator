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
            { label: 'Còpies de Seguretat' }
        ]" />
        <div class="border-b border-gray-200 dark:border-gray-800 pb-6">
            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Còpies de Seguretat</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-2">
                Aprèn a protegir, exportar i restaurar les teues dades.
            </p>
        </div>

        <!-- Data Exports -->
        <section>
            <UCard>
                <template #header>
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                            <UIcon name="i-heroicons-share" class="w-6 h-6 text-primary-500" />
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Exportar Dades</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Guarda els registres dels teus serveis a
                                un fitxer.</p>
                        </div>
                    </div>
                </template>

                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                        Pots exportar les teues dades des de <em>Configuració > Exportar i Importar</em>. L'aplicació
                        genera un fitxer
                        <code>.json</code> que pots guardar al teu dispositiu o al núvol.
                    </p>

                    <h4 class="font-medium text-gray-900 dark:text-white mt-4">Opcions d'Exportació:</h4>
                    <ul class="list-disc list-inside space-y-2 ml-2">
                        <li><strong>Tot l'historial:</strong> Inclou tots els anys i mesos.</li>
                        <li><strong>Per Any:</strong> Selecciona un any específic per generar un fitxer més petit i
                            fàcil de gestionar.
                        </li>
                        <li><strong>Per Mes:</strong> Ideal per fer tancaments mensuals.</li>
                    </ul>

                    <UAlert
icon="i-heroicons-shield-check" color="success" variant="soft" title="Sempre Local"
                        description="Les dades no s'envíen a cap servidor extern. El fitxer es genera directament al teu navegador."
                        class="mt-4" />
                </div>
            </UCard>
        </section>

        <!-- Config Exports -->
        <section>
            <UCard>
                <template #header>
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <UIcon name="i-heroicons-cog-6-tooth" class="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Exportar Configuració</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Còpia de seguretat de les teues
                                preferències.</p>
                        </div>
                    </div>
                </template>

                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                        Aquesta opció és independent de les dades de serveis i inclou:
                    </p>
                    <ul class="list-disc list-inside space-y-2 ml-2">
                        <li>Dades personals (Nom, DNI...).</li>
                        <li>Preus de dietes.</li>
                        <li>Plantilles de Word personalitzades.</li>
                        <li>Configuració de Google Maps i Calendar.</li>
                        <li>Credencials d'accés a Google Calendar (si es marca l'opció).</li>
                    </ul>
                </div>
            </UCard>
        </section>

        <!-- Encryption -->
        <section>
            <UCard>
                <template #header>
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <UIcon name="i-heroicons-lock-closed" class="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Encriptació</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Protegeix els teus fitxers amb
                                contrasenya.</p>
                        </div>
                    </div>
                </template>

                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                        Si exportes dades sensibles o credencials de Google, et recomanem activar l'opció
                        <strong>"Encriptar
                            còpia de seguretat"</strong>.
                    </p>
                    <p>
                        L'aplicació xifrarà el contingut del fitxer amb la contrasenya que triïs. Per restaurar-lo,
                        necessitaràs
                        introduir la mateixa contrasenya exactament.
                    </p>
                    <UAlert
icon="i-heroicons-exclamation-triangle" color="warning" variant="soft" title="Important"
                        description="Si oblides la contrasenya, no hi ha cap manera de recuperar les dades. Nosaltres no tenim accés a la teva contrasenya ni als teus fitxers."
                        class="mt-2" />
                </div>
            </UCard>
        </section>

        <!-- Restoration -->
        <section>
            <UCard>
                <div class="space-y-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Restauració de Dades</h3>

                    <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                        <p>
                            Per recuperar les teues dades, selecciona el fitxer `.json` a l'apartat "Importar". El
                            sistema
                            detectarà automàticament el tipus de contingut.
                        </p>

                        <h4 class="font-medium text-gray-900 dark:text-white">Com funciona la sobreescriptura?</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div
                                class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                <div class="font-medium mb-1">Backup Anual / Mensual</div>
                                <p class="text-sm text-gray-500">
                                    Si importes un fitxer que conté dades <strong>NOMÉS d'un any específic</strong> (ex:
                                    2024),
                                    l'aplicació només esborrarà i substituirà les dades d'aquell any. La resta (2023,
                                    2025...)
                                    es mantindran intactes.
                                </p>
                            </div>
                            <div
                                class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                <div class="font-medium mb-1">Backup Complet</div>
                                <p class="text-sm text-gray-500">
                                    Si importes un backup complet (o de diversos anys), es sobreescriurà
                                    <strong>TOT</strong>
                                    l'historial de serveis actual.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </UCard>
        </section>

    </div>
</template>
