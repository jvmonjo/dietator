<script setup lang="ts">
const { $pwa } = useNuxtApp()
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
    return 'Instal·la'
  }
  return 'Com instal·lar'
})
</script>

<template>
  <UAlert v-if="!isPwa && !isDismissed" icon="i-heroicons-device-phone-mobile" color="primary" variant="soft"
    title="Instal·la Dietator"
    description="Gaudeix de l'experiència completa instal·lant l'aplicació al teu dispositiu: pantalla completa, offline i més ràpida."
    :actions="[
      { label: mainActionLabel, onClick: install, color: 'primary', variant: 'solid' },
      { label: 'Fes-ho més tard', onClick: dismiss, variant: 'ghost', color: 'neutral' }
    ]" class="rounded-none border-t-0 border-x-0 border-b" />
</template>
