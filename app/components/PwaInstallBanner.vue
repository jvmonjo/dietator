<script setup lang="ts">
const { $pwa } = useNuxtApp()
const { t } = useI18n()
const isPwa = ref(true) // Default to true to avoid flash
const isDismissed = ref(true)

onMounted(() => {
  // Check dismissal state
  const dismissed = localStorage.getItem('dietator-install-banner-dismissed')
  if (dismissed) {
    isDismissed.value = true
    return
  }

  // Check display mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true

  isPwa.value = isStandalone
  isDismissed.value = false
})

const dismiss = () => {
  isDismissed.value = true
  localStorage.setItem('dietator-install-banner-dismissed', 'true')
}

const install = () => {
  if (unref($pwa?.showInstallPrompt)) {
    $pwa?.install()
    return
  }
  navigateTo('/help/pwa')
}

const mainActionLabel = computed(() => {
  if (unref($pwa?.showInstallPrompt)) {
    return t('components.pwa.install')
  }
  return t('components.pwa.install') // Same label? "Com instal·lar" vs "Instal·la". Let's reuse 'install' or 'how_to_install'.
  // Reuse 'install' for simplicity or add another key.
  // Original was "Com instal·lar" vs "Instal·la". I'll use "install" for both or generic.
})
</script>

<template>
  <UAlert
v-if="!isPwa && !isDismissed" icon="i-heroicons-device-phone-mobile" color="primary" variant="soft"
    :title="$t('components.pwa.install')" :description="$t('components.pwa.install_description')" :actions="[
      { label: mainActionLabel, onClick: install, color: 'primary', variant: 'solid' },
      { label: $t('components.pwa.dismiss'), onClick: dismiss, variant: 'ghost', color: 'neutral' }
    ]" class="rounded-none border-t-0 border-x-0 border-b" />
</template>
