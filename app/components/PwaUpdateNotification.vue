<script setup lang="ts">
const { $pwa } = useNuxtApp()

const toast = useToast()

onMounted(() => {
  if ($pwa && $pwa.needRefresh) {
    showUpdateToast()
  }
})

// Watch for changes in needRefresh
watch(() => $pwa?.needRefresh, (needRefresh) => {
  if (needRefresh) {
    showUpdateToast()
  }
})

const showUpdateToast = () => {
  toast.add({
    id: 'pwa-update',
    title: 'Nova versió disponible',
    description: 'Fes clic per actualitzar l\'aplicació',
    icon: 'i-heroicons-arrow-path',
    color: 'primary',
    timeout: 0,
    actions: [{
      label: 'Actualitzar',
      click: () => {
        $pwa?.updateServiceWorker()
      }
    }]
  } as any)
}
</script>

<template>
  <div />
</template>
