<script setup lang="ts">
// In-app ticket preview. Opening a data URL via window.open() shows a blank
// page on mobile Safari (and is blocked elsewhere), so we render the receipt
// inline and offer a reliable download via a blob URL.
const props = defineProps<{
  src: string | null
  name?: string
  type?: string
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const isImage = computed(() => Boolean(props.type?.startsWith('image/')) || !props.type)
const downloadName = computed(() => props.name || (isImage.value ? 'ticket.jpg' : 'ticket.pdf'))

// Blob URL for downloads/embeds; data: URLs don't download reliably on mobile.
const blobUrl = ref<string | null>(null)

const revoke = () => {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = null
  }
}

watch([isOpen, () => props.src], async () => {
  revoke()
  if (!isOpen.value || !props.src) return
  try {
    const res = await fetch(props.src)
    blobUrl.value = URL.createObjectURL(await res.blob())
  } catch {
    blobUrl.value = null
  }
}, { immediate: true })

onBeforeUnmount(revoke)

const close = () => {
  isOpen.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-stretch justify-center sm:items-center sm:p-4">
      <div class="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" @click="close" />

      <div
        class="relative z-10 flex h-full w-full flex-col bg-white shadow-xl dark:bg-gray-900
               sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg">
        <div
          class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-800"
          :style="{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }">
          <h3 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
            {{ downloadName }}
          </h3>
          <div class="flex shrink-0 items-center gap-2">
            <a
              v-if="blobUrl" :href="blobUrl" :download="downloadName"
              class="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500
                     hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
              :aria-label="$t('components.expense_form.ticket_download')">
              <UIcon name="i-heroicons-arrow-down-tray" class="h-5 w-5" />
            </a>
            <UButton icon="i-heroicons-x-mark-20-solid" color="neutral" variant="ghost" @click="close" />
          </div>
        </div>

        <div
          class="min-h-0 flex-1 overflow-auto bg-gray-950 p-2"
          :style="{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }">
          <img
            v-if="isImage && src" :src="src" :alt="downloadName"
            class="mx-auto h-auto max-w-full object-contain">
          <iframe
            v-else-if="blobUrl" :src="blobUrl" :title="downloadName"
            class="h-full min-h-[60vh] w-full bg-white" />
          <div v-else class="flex h-full items-center justify-center p-8 text-center text-gray-400">
            {{ $t('components.expense_form.ticket_view') }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
