<script setup lang="ts">
const { $pwa } = useNuxtApp()
const toast = useToast()
const swUpdateTrigger = useState<(() => void) | null>('swUpdateTrigger', () => null)

const refreshApp = () => {
    swUpdateTrigger.value?.()
}

onMounted(() => {
    if (!$pwa) return

    // Watch for offline ready state
    // Note: $pwa is a reactive object from @vite-pwa/nuxt plugin
    watch(() => $pwa.offlineReady, (ready) => {
        if (ready) {
            toast.add({
                title: 'App disponible sense connexió',
                description: 'L\'aplicació s\'ha descarregat i ja funciona sense internet.',
                icon: 'i-heroicons-check-circle',
                color: 'success',
                timeout: 5000
            } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }, { immediate: true })

    // Also handle update available
    watch(() => $pwa.needRefresh, (needRefresh) => {
        if (needRefresh) {
            toast.add({
                title: 'Nova versió disponible',
                description: 'Hi ha una actualització pendent.',
                icon: 'i-heroicons-arrow-path',
                color: 'primary',
                timeout: 0,
                actions: [{
                    label: 'Actualitzar',
                    click: refreshApp
                }]
            } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }, { immediate: true })
})
</script>

<template>
    <div />
</template>
