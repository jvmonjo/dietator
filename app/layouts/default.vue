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

const openChangelog = () => {
  window.open('https://github.com/jvmonjo/dietator/releases', '_blank')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
    <UAlert v-if="swNeedsRefresh" icon="i-heroicons-arrow-path" color="primary" variant="soft"
      title="Nova versió disponible"
      description="Hi ha actualitzacions a Dietator. Fes click a actualitza per tindre la darrera versió." :actions="[
        { label: 'Actualitza', onClick: refreshApp, color: 'primary', variant: 'solid' },
        { label: 'Veure canvis', onClick: openChangelog, variant: 'link' },
        { label: 'Tancar', onClick: dismissUpdateBanner, variant: 'ghost', color: 'neutral' }
      ]" class="rounded-none border-t-0 border-x-0 border-b" />
    <PwaInstallBanner />

    <!-- Header -->
    <AppHeader />

    <!-- Main Content -->
    <main class="flex-1 container mx-auto px-4 py-6 mb-16 md:mb-0">
      <slot />
    </main>

    <!-- Bottom Nav (Mobile) -->
    <AppBottomNav class="md:hidden" :links="links" />

    <!-- Footer (Desktop) -->
    <footer
      class="hidden md:block border-t border-gray-200 dark:border-gray-800 py-6 text-center text-sm text-gray-500">
      <p>
        &copy; {{ new Date().getFullYear() }} Dietator. Tots els drets reservats. <span
          class="ml-2 text-xs opacity-60">v{{ appVersion }}</span>
        <span class="mx-2">·</span>
        <NuxtLink to="/terms" class="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Condicions Generals
        </NuxtLink>
        <span class="mx-2">·</span>
        <NuxtLink to="/privacy" class="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">Politica de
          Privacitat
        </NuxtLink>
      </p>
    </footer>
  </div>
</template>
