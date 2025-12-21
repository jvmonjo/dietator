<script setup lang="ts">
const links = [
  {
    label: 'Inici',
    icon: 'i-heroicons-home',
    to: '/'
  },
  {
    label: 'Configuració',
    icon: 'i-heroicons-cog-6-tooth',
    to: '/settings'
  },
  {
    label: 'Ajuda',
    icon: 'i-heroicons-question-mark-circle',
    to: '/help'
  }
]


const { public: { appVersion } } = useRuntimeConfig()

const swNeedsRefresh = useState<boolean>('swUpdateAvailable', () => false)
const swUpdateTrigger = useState<(() => void) | null>('swUpdateTrigger', () => null)

const refreshApp = () => {
  swUpdateTrigger.value?.()
}

const dismissUpdateBanner = () => {
  swNeedsRefresh.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
    <div v-if="swNeedsRefresh" class="bg-yellow-50/80 dark:bg-yellow-900/40 border-b border-yellow-300 dark:border-yellow-700">
      <div class="container mx-auto px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-semibold text-yellow-800 dark:text-white">Nova versió disponible</p>
          <p class="text-xs text-yellow-700 dark:text-yellow-200">
            Hi ha actualitzacions a Dietator. Torna a carregar la pàgina per veure els canvis.
          </p>
        </div>
        <div class="flex gap-2 justify-end">
          <UButton size="sm" color="primary" @click="refreshApp">Actualitza</UButton>
          <UButton size="sm" variant="ghost" color="neutral" @click="dismissUpdateBanner">Tancar</UButton>
        </div>
      </div>
    </div>

    <!-- Header -->
    <AppHeader />

    <!-- Main Content -->
    <main class="flex-1 container mx-auto px-4 py-6 mb-16 md:mb-0">
      <slot />
    </main>

    <!-- Bottom Nav (Mobile) -->
    <AppBottomNav class="md:hidden" :links="links" />
    
    <!-- Footer (Desktop) -->
    <footer class="hidden md:block border-t border-gray-200 dark:border-gray-800 py-6 text-center text-sm text-gray-500">
      <p>
        &copy; {{ new Date().getFullYear() }} Dietator. Tots els drets reservats. <span class="ml-2 text-xs opacity-60">v{{ appVersion }}</span>
      </p>
    </footer>
  </div>
</template>
