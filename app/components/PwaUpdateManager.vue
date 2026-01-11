<script setup lang="ts">
const { $pwa } = useNuxtApp()
const toast = useToast()
const { t } = useI18n()

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
                title: t('components.pwa.update_available'),
                description: t('components.pwa.new_version', { version: '' }), // Version not easily available from pwa var
                icon: 'i-heroicons-arrow-path',
                color: 'primary',
                duration: 0,
                actions: [{
                    label: t('components.pwa.update_now'),
                    icon: 'i-lucide-refresh-cw',
                    onClick: refreshApp
                }]
            } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }, { immediate: true })
})
</script>

<template>
    <div />
</template>
