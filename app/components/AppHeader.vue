<script setup lang="ts">
const colorMode = useColorMode()

const isDark = computed({
  get () {
    return colorMode?.value === 'dark'
  },
  set (value: boolean) {
    if (colorMode) {
      colorMode.preference = value ? 'dark' : 'light'
    }
  }
})

const links = [
  {
    label: 'Inici',
    to: '/'
  },
  {
    label: 'Settings',
    to: '/settings'
  }
]
</script>

<template>
  <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
    <div class="container mx-auto px-4 h-16 flex items-center justify-between">
      <div class="flex items-center gap-8">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-clipboard-document-check" class="w-8 h-8 text-primary-500" />
          <span class="text-xl font-bold text-gray-900 dark:text-white">Dietator</span>
        </div>

        <nav class="hidden md:flex items-center gap-6">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            active-class="text-primary-600 dark:text-primary-300"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
      </div>

      <div class="flex items-center gap-4">
        <ClientOnly>
          <UButton
            :icon="isDark ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'"
            color="neutral"
            variant="ghost"
            aria-label="Theme"
            @click="isDark = !isDark"
          />
        </ClientOnly>
        <!-- <UAvatar
          src="https://avatars.githubusercontent.com/u/739984?v=4"
          alt="Avatar"
          size="sm"
        /> -->
      </div>
    </div>
  </header>
</template>
