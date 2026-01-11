<script setup lang="ts">
const { public: { appVersion } } = useRuntimeConfig()
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-8 pb-10">
    <UBreadcrumb
:items="[
      { label: 'Inici', to: '/' },
      { label: 'Ajuda', to: '/help' },
      { label: 'Sobre Dietator', to: '/help/about' }
    ]" />

    <article class="prose dark:prose-invert max-w-none">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Sobre Dietator</h1>

      <div
        class="not-prose mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div class="text-sm">
          <span class="font-semibold text-gray-700 dark:text-gray-300">Versió:</span>
          <span
            class="ml-2 font-mono bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">v{{
              appVersion }}</span>
          <span class="mx-3 text-gray-300 dark:text-gray-700">|</span>
          <span class="text-gray-500">&copy; 2025 Josep Monjo</span>
        </div>
        <UButton
icon="i-simple-icons-github" to="https://github.com/jvmonjo/dietator/releases" target="_blank"
          color="neutral" variant="ghost" size="xs">
          Veure historial de canvis
        </UButton>
      </div>

      <p class="lead">
        Dietator és una eina moderna de gestió de dietes i desplaçaments, dissenyada amb una filosofia clara:
        <strong>les teues dades són teues</strong>.
      </p>

      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Filosofia "Local-First" i "Serverless"</h2>
      <p>
        A diferència de la majoria d'aplicacions web actuals, Dietator <strong>no té una base de dades al núvol</strong>
        on guarda la teva informació.
        No hi ha cap servidor central que "vegi" els teus moviments, clients o imports.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 not-prose">
        <UCard class="h-full">
          <template #header>
            <div class="flex items-center gap-2 text-primary-500">
              <UIcon name="i-heroicons-server-stack" class="w-6 h-6" />
              <span class="font-bold">Sense Servidor</span>
            </div>
          </template>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            L'aplicació es carrega al teu navegador i funciona de manera autònoma. Si el servidor de Dietator
            desaparegués demà,
            tu podries seguir usant l'app sense problemes.
          </p>
        </UCard>
        <UCard class="h-full">
          <template #header>
            <div class="flex items-center gap-2 text-emerald-500">
              <UIcon name="i-heroicons-device-phone-mobile" class="w-6 h-6" />
              <span class="font-bold">Dades Locals</span>
            </div>
          </template>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Tota la informació es guarda exclusivament al <strong>Local Storage</strong> del teu dispositiu (navegador,
            mòbil o
            tauleta).
          </p>
        </UCard>
        <UCard class="h-full">
          <template #header>
            <div class="flex items-center gap-2 text-blue-500">
              <UIcon name="i-heroicons-lock-closed" class="w-6 h-6" />
              <span class="font-bold">Privadesa Total</span>
            </div>
          </template>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Nosaltres no podem veure, vendre ni perdre les teues dades, perquè simplement no les tenim.
          </p>
        </UCard>
      </div>

      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Seguretat i Xifratge</h2>
      <p>
        Com que les dades viuen al teu dispositiu, és important tenir còpies de seguretat.
        Quan exportes un <strong>Backup</strong> des de la configuració, tens l'opció de xifrar-lo amb contrasenya.
      </p>
      <p>
        Aquest xifratge utilitza l'estàndard <strong>AES-GCM</strong> (Advanced Encryption Standard).
        Això significa que encara que algú aconsegueixi el fitxer del teu backup,
        sense la contrasenya és matemàticament impossible que pugui llegir el seu contingut.
      </p>

      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Codi Obert</h2>
      <p>
        Dietator és un projecte de codi obert (Open Source). Això garanteix la transparència total:
        qualsevol expert pot auditar el codi per verificar que, efectivament, no enviem dades enlloc
        i que el xifratge és segur.
      </p>
      <p>
        Pots trobar el codi font a <a href="https://github.com/jvmonjo/dietator" target="_blank">GitHub</a>.
      </p>
    </article>
  </div>
</template>
