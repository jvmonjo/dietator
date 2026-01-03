<script setup lang="ts">
import { helpTopics } from '~/utils/helpNavigation'


const searchQuery = ref('')

const filteredTopics = computed(() => {
  if (!searchQuery.value) return helpTopics
  const q = searchQuery.value.toLowerCase()
  return helpTopics.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="space-y-8 pb-10">
    <UBreadcrumb
:items="[
      { label: 'Inici', to: '/' },
      { label: 'Ajuda', to: '/help' }
    ]" />

    <!-- Header -->
    <div class="border-b border-gray-200 dark:border-gray-800 pb-6">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Ajuda i Documentació</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        Informació sobre l'aplicació i guia de referència.
      </p>
    </div>



    <!-- Help Index Section -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Temes d'Ajuda</h2>
        <UInput
v-model="searchQuery" icon="i-heroicons-magnifying-glass" placeholder="Filtrar temes..."
          class="w-full max-w-xs" />
      </div>

      <div v-if="filteredTopics.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NuxtLink v-for="topic in filteredTopics" :key="topic.to" :to="topic.to" class="block group">
          <UCard class="h-full transition-shadow duration-200 hover:shadow-md dark:hover:shadow-gray-800">
            <div class="flex items-start gap-4">
              <div class="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-500">
                <UIcon :name="topic.icon" class="w-6 h-6" />
              </div>
              <div>
                <h3
                  class="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {{ topic.title }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {{ topic.description }}
                </p>
              </div>
            </div>
          </UCard>
        </NuxtLink>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500">No s'han trobat temes que coincideixin amb la cerca.</p>
        <UButton color="neutral" variant="ghost" class="mt-2" @click="searchQuery = ''">
          Netejar filtre
        </UButton>
      </div>
    </section>

    <!-- Legal Section -->
    <section class="border-t border-gray-200 dark:border-gray-800 pt-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Legal</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NuxtLink to="/terms" class="block group">
          <UCard class="transition-shadow duration-200 hover:shadow-md dark:hover:shadow-gray-800 h-full">
            <div class="flex items-center gap-4">
              <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                <UIcon name="i-heroicons-scale" class="w-6 h-6" />
              </div>
              <div>
                <h3
                  class="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  Condicions Generals
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Informació legal, garanties i llicència d'ús.
                </p>
              </div>
              <UIcon
name="i-heroicons-arrow-right"
                class="w-5 h-5 ml-auto text-gray-400 group-hover:text-primary-500" />
            </div>
          </UCard>
        </NuxtLink>

        <NuxtLink to="/privacy" class="block group">
          <UCard class="transition-shadow duration-200 hover:shadow-md dark:hover:shadow-gray-800 h-full">
            <div class="flex items-center gap-4">
              <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                <UIcon name="i-heroicons-shield-check" class="w-6 h-6" />
              </div>
              <div>
                <h3
                  class="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  Política de Privacitat
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Com gestionem (i no guardem) les teves dades.
                </p>
              </div>
              <UIcon
name="i-heroicons-arrow-right"
                class="w-5 h-5 ml-auto text-gray-400 group-hover:text-primary-500" />
            </div>
          </UCard>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
