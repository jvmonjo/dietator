<script setup lang="ts">
defineProps<{
  links: {
    label: string
    icon: string
    to: string
  }[]
}>()
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
    <div class="flex justify-around items-center h-16">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex flex-col items-center justify-center w-full h-full text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
        active-class="text-primary-600 dark:text-primary-400"
      >
        <UIcon :name="link.icon" class="w-6 h-6 mb-1" />
        <span class="text-xs font-medium">{{ link.label }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
