<template>
    <div class="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sm:p-10 border border-gray-100 dark:border-gray-700">
            <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
                Política de Privacitat
            </h1>

            <div class="space-y-8 text-gray-600 dark:text-gray-300">
                <!-- Filosofia Local-First -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Absència de Servidors
                        (Local-First)</h2>
                    <p>
                        Dietator està dissenyat amb una filosofia <strong>Local-First</strong>. Això significa que no
                        disposem de servidors centrals, bases de dades al núvol ni cap sistema per recopilar,
                        emmagatzemar o processar les vostres dades.
                    </p>
                    <p class="mt-2">
                        La totalitat de la informació que introduïu a l'aplicació s'emmagatzema <strong>exclusivament al
                            vostre dispositiu</strong> (ordinador, tauleta o mòbil) utilitzant les tecnologies del
                        navegador (IndexedDB i LocalStorage).
                    </p>
                </section>

                <!-- Responsabilitat de l'Usuari -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Responsabilitat de l'Usuari i
                        Seguretat</h2>
                    <p>
                        Com que no tenim accés a les vostres dades, <strong>no podem recuperar-les</strong> en cas de
                        pèrdua, robatori del dispositiu o esborrat accidental del navegador.
                    </p>
                    <p class="mt-2">
                        Per tant, és la vostra responsabilitat exclusiva:
                    </p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li>Mantenir la seguretat física i lògica del vostre dispositiu.</li>
                        <li>Realitzar <strong>còpies de seguretat</strong> periòdiques (Configuració > Exportar
                            Config/Dades).</li>
                        <li>Utilitzar l'opció d'<strong>encriptació</strong> en exportar les còpies de seguretat per
                            protegir les dades sensibles en cas de compartir el fitxer.</li>
                    </ul>
                </section>

                <!-- Tipus de dades -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Dades Emmagatzemades</h2>
                    <p>
                        L'aplicació guarda localment la següent informació necessària per al seu funcionament:
                    </p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li>Dades de perfil (nom, cognoms, DNI i preus de dietes).</li>
                        <li>Registre de serveis i desplaçaments realitzats.</li>
                        <li>Preferències de configuració (tema, recordatoris).</li>
                        <li>Tokens d'accés a Google Calendar (si s'ha connectat explícitament).</li>
                        <li>Clau API de Google Maps (si s'ha configurat).</li>
                    </ul>
                </section>

                <!-- Serveis de Tercers -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Serveis de Tercers</h2>
                    <p>
                        Tot i que Dietator no té servidors propis, l'aplicació pot connectar-se directament des del
                        vostre navegador a serveis de tercers si activeu aquestes funcionalitats:
                    </p>
                    <div class="mt-4 space-y-4">
                        <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <h3 class="font-bold text-gray-900 dark:text-white">Google Calendar API</h3>
                            <p class="text-sm mt-1">
                                S'utilitza únicament per llegir els vostres calendaris i esdeveniments per facilitar la
                                creació de registres. La connexió es fa directament entre el vostre navegador i Google.
                                Nosaltres no tenim accés a aquestes dades.
                            </p>
                        </div>
                        <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <h3 class="font-bold text-gray-900 dark:text-white">Google Maps API</h3>
                            <p class="text-sm mt-1">
                                Si configureu la vostra clau API, s'utilitzarà per calcular distàncies de rutes.
                                Aquestes peticions estan subjectes a la política de privacitat de Google.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- Drets i Eliminació -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Eliminació de Dades</h2>
                    <p>
                        Teniu el control absolut sobre les vostres dades. Podeu eliminar tota la informació
                        emmagatzemada per Dietator en qualsevol moment simplement:
                    </p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li>Utilitzant l'opció "Esborrar totes les dades" a l'apartat de manteniment de la Configuració.
                        </li>
                        <li>O bé, netejant les dades de llocs web (cookies i emmagatzematge local) des de les opcions
                            del vostre navegador.</li>
                    </ul>
                </section>

                <!-- Contacte -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Contacte</h2>
                    <p>
                        Si teniu dubtes sobre aquesta política o el funcionament tècnic de l'aplicació, podeu obrir una
                        incidència o discussió al repositori oficial de <a
href="https://github.com/jvmonjo/dietator"
                            target="_blank" class="text-primary-500 hover:underline">GitHub</a>.
                    </p>
                </section>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
useHead({
    title: 'Política de Privacitat - Dietator'
})
</script>
