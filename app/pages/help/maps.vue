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
        { label: 'API Google Maps' }
      ]"
    />
    <div class="flex items-center gap-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">API de Google Maps</h1>
    </div>

    <!-- Google Maps API Section -->
    <section>
      <UCard>
        <template #header>
          <h3 class="font-semibold text-lg">Com obtenir la teua API Key</h3>
        </template>
        
        <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Per a que el càlcul automàtic de distàncies funcioni, necessites una <strong>API Key de Google Maps</strong> amb la "Distance Matrix API" habilitada. Segueix aquests passos:
          </p>

          <ol class="list-decimal list-inside space-y-3 ml-2">
            <li>
              <strong>Crea un projecte a Google Cloud:</strong>
              <div class="ml-5 mt-1">
                Ves a la <a href="https://console.cloud.google.com/" target="_blank" class="text-primary-500 hover:underline">Google Cloud Console</a> i crea un nou projecte.
              </div>
            </li>
            <li>
              <strong>Habilita la API:</strong>
              <div class="ml-5 mt-1">
                Al menú lateral esquerre, ves a <em>"APIs & Services" > "Library"</em>. Cerca <strong>"Distance Matrix API"</strong> i prem "Enable".
              </div>
            </li>
            <li>
              <strong>Crea les credencials:</strong>
              <div class="ml-5 mt-1">
                Ves a <em>"APIs & Services" > "Credentials"</em>. Fes clic a <em>"Create Credentials"</em> i tria <strong>"API Key"</strong>. Copia la clau generada.
              </div>
            </li>
            <li>
              <strong>Configura la clau a Dietator:</strong>
              <div class="ml-5 mt-1">
                Torna a aquesta aplicació, ves a <NuxtLink to="/settings" class="text-primary-500 hover:underline">Configuració</NuxtLink> i enganxa la clau al camp "Google Maps API Key".
              </div>
            </li>
          </ol>

          <UAlert
            icon="i-heroicons-exclamation-triangle"
            color="warning"
            variant="soft"
            title="Costos i Facturació"
            description="Google ofereix un crèdit mensual gratuït de $200, suficient per a moltes consultes. No obstant, és obligatori configurar un compte de facturació per activar el servei. Recomanem establir quotes/límits de pressupost al panell de Google Cloud per evitar sorpreses."
            class="mt-4"
          />
        </div>
      </UCard>
    </section>

    <!-- Google Maps Logic Section -->
    <section>
      <UCard>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            L'aplicació permet calcular automàticament els quilòmetres de les rutes utilitzant la <strong>Distance Matrix API</strong> de Google Maps.
          </p>

          <h3 class="font-semibold text-gray-900 dark:text-white text-base">Funcionament del Càlcul</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            El sistema calcula la distància sumant els trajectes de forma seqüencial entre els municipis introduïts, seguint l'ordre de la llista:
          </p>
          <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 ml-2">
            <li>Tram 1: Origen ➜ Destinació 1</li>
            <li>Tram 2: Destinació 1 ➜ Destinació 2</li>
            <li>...</li>
            <li>Tram Final: Penúltim ➜ Últim destí</li>
          </ul>
          <UAlert
            icon="i-heroicons-information-circle"
            color="primary"
            variant="soft"
            title="Nota important"
            description="El sistema NO afegeix automàticament el retorn a l'origen inicial. Si el servei inclou tornada, cal afegir el municipi d'origen com a última destinació de la llista."
            class="mt-2"
          />

          <h3 class="font-semibold text-gray-900 dark:text-white text-base mt-2">Estratègia de Caching (Estalvi de Costos)</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Per minimitzar el cost de la API de Google, l'aplicació implementa un sistema de <strong>memòria cau (caching)</strong> local:
          </p>
          <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 ml-2">
            <li>Quan es calcula la distància entre dos punts (ex: "València" ➜ "Alzira"), el resultat es guarda al navegador.</li>
            <li>Les properes vegades que es necessiti aquest mateix tram, s'utilitzarà el valor guardat i <strong>NO es farà cap petició a Google</strong>.</li>
            <li>Això redueix dràsticament el consum de l'API, especialment per a rutes habituals.</li>
          </ul>
        </div>
      </UCard>
    </section>
  </div>
</template>
