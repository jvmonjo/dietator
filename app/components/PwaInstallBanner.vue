<script setup lang="ts">
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

const navigateToHelp = async () => {
  await navigateTo('/help/pwa')
  // Optional: keep it shown or dismiss? User might want to read help and then install.
  // Let's not auto-dismiss on navigation so they can see it when they come back if they want.
}
</script>

<template>
  <UAlert
    v-if="!isPwa && !isDismissed"
    icon="i-heroicons-device-phone-mobile"
    color="primary"
    variant="soft"
    title="Instal·la Dietator"
    description="Gaudeix de l'experiència completa instal·lant l'aplicació al teu dispositiu: pantalla completa, offline i més ràpida."
    :actions="[
      { label: 'Com instal·lar', onClick: navigateToHelp, color: 'primary', variant: 'solid' },
      { label: 'Fes-ho més tard', onClick: dismiss, variant: 'ghost', color: 'neutral' }
    ]"
    class="rounded-none border-t-0 border-x-0 border-b"
  />
</template>
