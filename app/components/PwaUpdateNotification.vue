<script setup lang="ts">
const { $pwa } = useNuxtApp()
const toast = useToast()

onMounted(() => {
  if ($pwa && $pwa.needRefresh) {
    showUpdateToast()
  }
})

watch(() => $pwa?.needRefresh, (needRefresh) => {
  if (needRefresh) {
    showUpdateToast()
  }
})

const showUpdateToast = () => {
    // Check if toast already exists to avoid duplicates
    // @ts-expect-error - internal API access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = toast.items?.value?.find((t: any) => t.id === 'pwa-update')
  if (existing) return

  toast.add({
    id: 'pwa-update',
    title: 'Nova versió disponible',
    description: 'Fes clic per actualitzar l\'aplicació',
    icon: 'i-heroicons-arrow-path',
    color: 'primary',
    duration: 0,
    actions: [{
      label: 'Actualitzar',
      click: () => {
        $pwa?.updateServiceWorker()
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any]
  })
}
</script>

<template>
  <div />
</template>
