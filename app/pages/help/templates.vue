<script setup lang="ts">
import {
  globalVariables,
  monthlyVariables,
  serviceVariables,
  displacementVariables,
  loops
} from '~/utils/templateVariables'

definePageMeta({
  layout: 'default'
})

const columns = [
  { accessorKey: 'name', header: 'Variable', id: 'name' },
  { accessorKey: 'desc', header: 'Descripció', id: 'desc' }
]
</script>

<template>
  <div class="space-y-6 pb-10">

    <UBreadcrumb
      :items="[
        { label: 'Inici', to: '/' },
        { label: 'Ajuda', to: '/help' },
        { label: 'Plantilles de Word' }
      ]"
    />
    <div class="flex items-center gap-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Plantilles de Word</h1>
    </div>

    <section class="space-y-6">
      <div>
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
