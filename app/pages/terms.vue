<template>
    <div class="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sm:p-10 border border-gray-100 dark:border-gray-700">
            <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
                Condicions Generals del Servei
            </h1>

            <div class="space-y-8 text-gray-600 dark:text-gray-300">
                <!-- Naturalesa del servei -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Naturalesa del Servei</h2>
                    <p>
                        <strong>Dietator</strong> és un projecte de programari lliure i de codi obert (<a
                            href="https://github.com/jvmonjo/dietator" target="_blank"
                            class="text-primary-500 hover:underline">GitHub</a>) desenvolupat i distribuït de manera
                        totalment gratuïta i sense cap ànim de lucre.
                    </p>
                    <p class="mt-2">
                        L'objectiu d'aquest programari és proporcionar una eina d'utilitat per a la gestió personal de
                        dietes i serveis, però no constitueix un servei professional ni comercial.
                    </p>
                </section>

                <!-- Estat del projecte: BETA -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Estat de desenvolupament (Beta)
                    </h2>
                    <p>
                        Aquesta aplicació es troba actualment en fase <strong>BETA</strong> i es considera una "prova de
                        concepte". Això significa que el programari està encara en desenvolupament actiu, pot contenir
                        errors, funcionalitats incompletes o patir canvis significatius sense previ avís.
                    </p>
                </section>

                <!-- Exempció de responsabilitat -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Exempció de Garanties i
                        Responsabilitat</h2>
                    <p>
                        El programari s'ofereix "TAL QUAL" (<strong>"AS IS"</strong>), sense cap mena de garantia,
                        expressa o implícita, incloent-hi, però sense limitar-se a, garanties de mercantilitat,
                        idoneïtat per a un propòsit particular o no infracció.
                    </p>
                    <p class="mt-2">
                        En cap cas els autors o titulars dels drets d'autor seran responsables de cap reclamació, dany o
                        altra responsabilitat, ja sigui en una acció contractual, greuge o d'una altra manera, que
                        sorgeixi de, fora de o en connexió amb el programari o l'ús o altres relacions amb el
                        programari.
                    </p>
                    <div
                        class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200">
                        <strong>Important:</strong> L'usuari és l'únic responsable de la veracitat de les dades
                        introduïdes i de realitzar còpies de seguretat periòdiques. Dietator no guarda cap dada als seus
                        servidors i no es fa responsable de la pèrdua de dades emmagatzemades localment al dispositiu de
                        l'usuari.
                    </div>
                </section>

                <!-- Privacitat -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Privacitat i Dades</h2>
                    <p>
                        Dietator funciona sota una filosofia <strong>Local-First</strong>. Totes les dades que introduïu
                        (serveis, preus, dades personals) es guarden exclusivament al vostre navegador (IndexedDB /
                        LocalStorage).
                    </p>
                    <p class="mt-2">
                        No s'envia cap informació a servidors de tercers, amb l'excepció de:
                    </p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li>L'ús de l'API de Google Calendar si decidiu connectar-hi el vostre compte (la comunicació és
                            directa entre el vostre navegador i Google).</li>
                        <li>L'ús de l'API de Google Maps, si configureu la vostra clau, per calcular distàncies.</li>
                    </ul>
                </section>

                <!-- Llicència -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Llicència</h2>
                    <p>
                        Aquest projecte està llicenciat sota els termes de la llicència MIT. Sou lliures d'utilitzar,
                        copiar, modificar, fusionar, publicar, distribuir, subllicenciar i/o vendre còpies del
                        programari, sempre que s'inclogui l'avís de drets d'autor i permís original.
                    </p>
                </section>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
useHead({
    title: 'Condicions Generals - Dietator'
})
</script>
