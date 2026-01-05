<script setup lang="ts">
const { $pwa } = useNuxtApp()
const toast = useToast()

const openChangelog = () => {
    window.open('https://github.com/jvmonjo/dietator/releases', '_blank')
}

const refreshApp = () => {
    $pwa?.updateServiceWorker?.()
}

onMounted(() => {
    if (!$pwa) return

    // Watch for offline ready state
    watch(() => $pwa.offlineReady, (ready) => {
        if (ready) {
            toast.add({
                title: 'App disponible sense connexió',
                description: 'L\'aplicació s\'ha descarregat i ja podeu usar-la sense internet.',
                icon: 'i-heroicons-check-circle',
                color: 'success',
                duration: 5000
            } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }, { immediate: true })

    // Watch for update available
    watch(() => $pwa.needRefresh, (needRefresh) => {
        if (needRefresh) {
            toast.add({
                title: 'Nova versió disponible',
                description: 'Hi ha una actualització pendent.',
                icon: 'i-heroicons-arrow-path',
                color: 'primary',
                duration: 0,
                actions: [{
                    label: 'Actualitzar',
                    onClick: refreshApp
                }, {
                    label: 'Veure canvis',
                    onClick: openChangelog
                }]
            } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }, { immediate: true })
})
</script>

<template>
    <div />
</template>
