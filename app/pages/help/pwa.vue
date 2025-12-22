<script setup lang="ts">
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-8 pb-10">
    <UBreadcrumb
      :items="[
        { label: 'Inici', to: '/' },
        { label: 'Ajuda', to: '/help' },
        { label: 'Instal·lació (PWA)', to: '/help/pwa' }
      ]"
    />

    <article class="prose dark:prose-invert max-w-none">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Aplicació Web Progressiva (PWA)</h1>
      <p class="lead">
        Dietator és una <strong>PWA (Progressive Web App)</strong>. Això vol dir que, tot i ser una pàgina web, es pot instal·lar al teu dispositiu com si fos una aplicació nativa.
      </p>

      <div class="not-prose my-8">
        <UAlert
            icon="i-heroicons-bolt"
            color="primary"
            variant="soft"
            title="Avantatges d'instal·lar-la"
            description="Funciona fora de línia (sense internet), s'obre a pantalla completa sense barres de navegador, i és més ràpida."
        />
      </div>

      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Com instal·lar Dietator</h2>
      <p>Els passos varien lleugerament segons el dispositiu i el navegador que utilitzis.</p>

      <UTabs
:items="[
          { label: 'iPhone / iPad (iOS)', icon: 'i-simple-icons-apple', slot: 'ios' },
          { label: 'Android', icon: 'i-simple-icons-android', slot: 'android' },
          { label: 'Ordinador (Chrome/Edge)', icon: 'i-heroicons-computer-desktop', slot: 'desktop' }
      ]">
        <template #ios>
            <div class="p-4 space-y-4">
                <ol class="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                    <li>Obre <strong>Safari</strong> i ves a <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">jvmonjo.github.io/dietator</code> (o la URL on ho tinguis).</li>
                    <li>Prem el botó <strong>Compartir</strong> <UIcon name="i-heroicons-share" class="inline w-4 h-4" /> (la icona del quadrat amb una fletxa cap amunt).</li>
                    <li>Busca i prem l'opció <strong>"Afegir a la pantalla d'inici"</strong> (Add to Home Screen).</li>
                    <li>Confirma el nom i prem "Afegir".</li>
                </ol>
                <div class="text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-gray-500">
                    Nota: A iOS, això només funciona amb Safari.
                </div>
            </div>
        </template>

        <template #android>
            <div class="p-4 space-y-4">
                <ol class="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                    <li>Obre <strong>Google Chrome</strong>.</li>
                    <li>Normalment apareixerà un avís automàtic a la part inferior per "Afegir Dietator a la pantalla d'inici".</li>
                    <li>Si no apareix, prem el menú de tres punts <UIcon name="i-heroicons-ellipsis-vertical" class="inline w-4 h-4" /> a la cantonada superior dreta.</li>
                    <li>Selecciona <strong>"Instal·lar aplicació"</strong> o "Afegir a la pantalla d'inici".</li>
                </ol>
            </div>
        </template>

        <template #desktop>
            <div class="p-4 space-y-4">
                <p class="text-gray-700 dark:text-gray-300">En navegadors basats en Chromium (Google Chrome, Microsoft Edge, Brave...):</p>
                <ol class="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                    <li>A la barra de direccions (a la dreta del tot), veuràs una icona d'un monitor petit amb una fletxa cap avall <UIcon name="i-heroicons-computer-desktop" class="inline w-4 h-4" />.</li>
                    <li>Prem la icona i selecciona <strong>"Instal·lar"</strong>.</li>
                    <li>L'aplicació s'obrirà en una finestra independent i es crearà un accés directe al teu escriptori o menú d'aplicacions.</li>
                </ol>
            </div>
        </template>
      </UTabs>

      <h2 class="mt-8 text-xl font-semibold text-gray-900 dark:text-white">Actualitzacions</h2>
      <p>
        En ser una PWA, Dietator s'actualitza automàticament. 
        Quan hi hagi una nova versió, veuràs un avís a l'aplicació per "Actualitzar" (recarregar la pàgina).
      </p>

    </article>
  </div>
</template>
