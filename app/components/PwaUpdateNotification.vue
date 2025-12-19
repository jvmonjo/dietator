<script setup lang="ts">
const toast = useToast()

const updateAvailable = useState<boolean>('swUpdateAvailable', () => false)
const triggerUpdate = useState<(() => void) | null>('swUpdateTrigger', () => null)

watch(updateAvailable, (available) => {
  if (available) {
    showUpdateToast()
  }
}, { immediate: true })

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
        triggerUpdate.value?.()
        updateAvailable.value = false
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any]
  })
}
</script>

<template>
  <div />
</template>
