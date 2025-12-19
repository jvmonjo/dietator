<script setup lang="ts">
const { public: { appVersion } } = useRuntimeConfig()

const globalVariables = [
  { name: '[half_diet_price]', desc: 'Preu configurat per a mitja dieta.' },
  { name: '[half_diet_price_value]', desc: 'Valor numèric del preu de mitja dieta.' },
  { name: '[full_diet_price]', desc: 'Preu configurat per a dieta completa.' },
  { name: '[full_diet_price_value]', desc: 'Valor numèric del preu de dieta completa.' },
  { name: '[current_month_label]', desc: 'Mes i any actual (ex. març 2024).' },
  { name: '[current_month_key]', desc: 'Clau tècnica del mes (YYYY-MM).' }
]

const monthlyVariables = [
  { name: '[month_service_count]', desc: 'Nombre de serveis en el període.' },
  { name: '[month_displacement_count]', desc: 'Nombre total de desplaçaments.' },
  { name: '[month_lunches]', desc: 'Total de dinars.' },
  { name: '[month_dinners]', desc: 'Total de sopars.' },
  { name: '[month_half_diets]', desc: 'Total de mitges dietes.' },
  { name: '[month_full_diets]', desc: 'Total de dietes completes.' },
  { name: '[month_diet_units]', desc: 'Unitats de dieta (completa=1, mitja=0.5).' },
  { name: '[month_kilometers]', desc: 'Total de quilòmetres registrats al mes.' },
  { name: '[month_allowance]', desc: 'Import total a percebre.' },
  { name: '[month_allowance_value]', desc: 'Valor numèric de l\'import total.' },
  { name: '[previous_month_last_working_day]', desc: 'Data de l\'últim dia laborable del mes anterior (ISO).' },
  { name: '[previous_month_last_working_day:human]', desc: 'Data de l\'últim dia laborable del mes anterior (Text).' },
  { name: '[previous_month_last_working_day_minus_1]', desc: 'Data del penúltim dia laborable del mes anterior (ISO).' },
  { name: '[previous_month_last_working_day_minus_1_human]', desc: 'Data del penúltim dia laborable del mes anterior (Text).' },
  { name: '[previous_month_last_working_day_minus_2]', desc: 'Data del 3r dia més recent laborable del mes anterior (ISO).' },
  { name: '[previous_month_last_working_day_minus_2_human]', desc: 'Data del 3r dia més recent laborable del mes anterior (Text).' }
]

const serviceVariables = [
  { name: '[service_index]', desc: 'Número seqüencial del servei.' },
  { name: '[service_id]', desc: 'Identificador intern del servei.' },
  { name: '[service_reference]', desc: 'Referència única (SERV-YYYY-MM-DD-XX).' },
  { name: '[service_start_date]', desc: 'Data d\'inici (DD/MM/YYYY).' },
  { name: '[service_start_time]', desc: 'Hora d\'inici (HH:mm).' },
  { name: '[service_start_iso]', desc: 'Data i hora d\'inici (ISO).' },
  { name: '[service_end_date]', desc: 'Data de fi.' },
  { name: '[service_end_time]', desc: 'Hora de fi.' },
  { name: '[service_end_iso]', desc: 'Data i hora de fi (ISO).' },
  { name: '[service_duration_hours]', desc: 'Durada en hores.' },
  { name: '[service_displacement_count]', desc: 'Nombre de desplaçaments.' },
  { name: '[service_half_diets]', desc: 'Nombre de mitges dietes en aquest servei.' },
  { name: '[service_full_diets]', desc: 'Nombre de dietes completes en aquest servei.' },
  { name: '[service_lunches]', desc: 'Nombre de dinars en aquest servei.' },
  { name: '[service_dinners]', desc: 'Nombre de sopars en aquest servei.' },
  { name: '[service_total_lunches]', desc: 'Total de dinars (alias).' },
  { name: '[service_total_dinners]', desc: 'Total de sopars (alias).' },
  { name: '[service_kilometers]', desc: 'Total de quilòmetres del servei.' },
  { name: '[service_total_allowance]', desc: 'Import total del servei.' },
  { name: '[service_total_allowance_value]', desc: 'Valor numèric de l\'import total.' }
]

const displacementVariables = [
  { name: '[displacement_index]', desc: 'Número seqüencial del desplaçament.' },
  { name: '[displacement_id]', desc: 'Identificador intern.' },
  { name: '[displacement_province]', desc: 'Província.' },
  { name: '[displacement_municipality]', desc: 'Municipi.' },
  { name: '[displacement_municipality:limit3]', desc: 'Municipi (primeres 3 lletres).' },
  { name: '[displacement_has_lunch]', desc: 'Té dinar (Sí/No).' },
  { name: '[displacement_has_dinner]', desc: 'Té sopar (Sí/No).' },
  { name: '[displacement_meals]', desc: 'Descripció àpats (Dinar, Sopar, Dinar i sopar, —).' },
  { name: '[displacement_date]', desc: 'Data del desplaçament (igual a l\'inici del servei).' }
]

const loops = [
  { name: '[loop:services] ... [endloop:services]', desc: 'Itera sobre cada servei del mes.' },
  { name: '[loop:service_displacements] ... [endloop:service_displacements]', desc: 'Itera sobre els desplaçaments d\'un servei (dins de loop:services).' },
  { name: '[loop:month_displacements] ... [endloop:month_displacements]', desc: 'Itera sobre tots els desplaçaments del mes, sense agrupar.' }
]

const columns = [
  { accessorKey: 'name', header: 'Variable', id: 'name' },
  { accessorKey: 'desc', header: 'Descripció', id: 'desc' }
]
</script>

<template>
  <div class="space-y-8 pb-10">
    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 pb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Ajuda i Documentació</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        Informació sobre l'aplicació i guia de referència per a les plantilles de Word.
      </p>
    </div>

    <!-- About Section -->
    <section>
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sobre Dietator</h2>
      <UCard>
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <SiteLogo class="h-12 w-12" />
            <div>
              <h3 class="font-bold text-lg">Dietator</h3>
              <p class="text-sm text-gray-500">Gestió de dietes i desplaçaments</p>
            </div>
          </div>
          <USeparator />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-semibold text-gray-700 dark:text-gray-300">Versió:</span>
              <span class="ml-2 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">v{{ appVersion }}</span>
            </div>
            <div>
              <span class="font-semibold text-gray-700 dark:text-gray-300">Copyright:</span>
              <span class="ml-2">&copy; 2025 Josep Vicent Monjo</span>
            </div>
          </div>
          <div class="flex justify-start pt-2">
            <UButton
              icon="i-simple-icons-github"
              to="https://github.com/jvmonjo/dietator/releases"
              target="_blank"
              color="neutral"
              variant="soft"
            >
              Veure historial de canvis (Changelog)
            </UButton>
          </div>
        </div>
      </UCard>
    </section>

    <!-- Google Maps API Section -->
    <section>
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">API de Google Maps i Càlcul de Kilòmetres</h2>
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

    <!-- Templates Section -->
    <section class="space-y-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Plantilles de Word</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Pots personalitzar els informes pujant els teus propis fitxers `.docx` a la configuració.
          Utilitza les variables entre claudàtors (ex. <code>[variable]</code>) perquè siguin substituïdes per les dades reals.
        </p>

        <UAlert
            icon="i-heroicons-information-circle"
            color="info"
            variant="soft"
            title="Condicionals i format"
            description="Pots utilitzar [if:variable]...[endif:variable] per mostrar/amagar text. També pots usar modificadors com :human (dates llargues) o :limitN (retallar text)."
        />
      </div>

      <UCard>
        <template #header>
          <h3 class="font-semibold">Variables Globals</h3>
        </template>
        <UTable :data="globalVariables" :columns="columns" class="text-sm" />
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-semibold">Totals Mensuals</h3>
          <p class="text-xs text-gray-500 font-normal">Disponibles a la plantilla mensual.</p>
        </template>
        <UTable :data="monthlyVariables" :columns="columns" class="text-sm" />
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-semibold">Bucles i Iteracions</h3>
        </template>
        <UTable :data="loops" :columns="columns" class="text-sm" />
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-semibold">Variables de Servei</h3>
          <p class="text-xs text-gray-500 font-normal">Dins de <code>[loop:services]</code> o al generar un informe individual.</p>
        </template>
        <UTable :data="serviceVariables" :columns="columns" class="text-sm" />
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-semibold">Variables de Desplaçament</h3>
          <p class="text-xs text-gray-500 font-normal">
            Dins de <code>[loop:service_displacements]</code> o <code>[loop:month_displacements]</code>.
          </p>
        </template>
        <UTable :data="displacementVariables" :columns="columns" class="text-sm" />
      </UCard>

    </section>
  </div>
</template>
