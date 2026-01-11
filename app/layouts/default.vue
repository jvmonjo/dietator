<script setup lang="ts">
const { t } = useI18n()
const links = computed(() => [
  {
    label: t('components.header.home'),
    icon: 'i-heroicons-home',
    to: '/'
  },
  {
    label: t('components.header.settings'),
    icon: 'i-heroicons-cog-6-tooth',
    to: '/settings'
  },
  {
    label: t('components.header.help'),
    icon: 'i-heroicons-question-mark-circle',
    to: '/help'
  }
])


const { public: { appVersion } } = useRuntimeConfig()

</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">


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
        &copy; {{ new Date().getFullYear() }} {{ $t('components.header.title') }}. {{ $t('layout.footer.rights') }}
        <span class="ml-2 text-xs opacity-60">v{{ appVersion }}</span>
        <span class="mx-2">·</span>
        <NuxtLink to="/terms" class="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">{{
          $t('layout.footer.terms') }}
        </NuxtLink>
        <span class="mx-2">·</span>
        <NuxtLink to="/privacy" class="hover:text-gray-900 dark:hover:text-gray-300 transition-colors">{{
          $t('layout.footer.privacy') }}
        </NuxtLink>
      </p>
    </footer>
  </div>
</template>
