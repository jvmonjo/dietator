<script setup lang="ts">
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

defineProps<{
  src: string | null
}>()

const emit = defineEmits<{
  (e: 'confirm', blob: Blob, grayscale: boolean): void
  (e: 'cancel'): void
}>()

const isOpen = defineModel<boolean>('open', { default: false })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cropperRef = ref<any>(null)
const isProcessing = ref(false)
// Grayscale "document" mode is on by default: smaller, cleaner receipts.
const grayscale = ref(true)

const cancel = () => {
  isOpen.value = false
  emit('cancel')
}

const confirm = () => {
  const canvas = cropperRef.value?.getResult()?.canvas as HTMLCanvasElement | undefined
  if (!canvas) {
    cancel()
    return
  }
  isProcessing.value = true
  // Export at high quality; grayscale + compression happen afterwards in ticket.ts.
  canvas.toBlob((blob) => {
    isProcessing.value = false
    if (blob) {
      emit('confirm', blob, grayscale.value)
      isOpen.value = false
    }
  }, 'image/jpeg', 0.9)
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-stretch justify-center sm:items-center sm:p-4">
    <div class="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" @click="cancel" />

    <div
      class="relative z-10 flex h-full w-full flex-col bg-white shadow-xl dark:bg-gray-900
             sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg">
      <div class="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t('components.expense_form.ticket_crop_title') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('components.expense_form.ticket_crop_hint') }}
          </p>
        </div>
        <UButton icon="i-heroicons-x-mark-20-solid" color="neutral" variant="ghost" @click="cancel" />
      </div>

      <!-- Cropper fills the remaining height on mobile and a fixed area on desktop. -->
      <div class="relative min-h-0 flex-1 bg-gray-950 sm:h-[60vh] sm:flex-none">
        <Cropper
          v-if="src" ref="cropperRef" :src="src"
          class="h-full w-full" :class="grayscale ? 'grayscale contrast-125' : ''"
          :stencil-props="{ movable: true, resizable: true }" />
      </div>

      <div
        class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 p-4 dark:border-gray-800">
        <USwitch v-model="grayscale" :label="$t('components.expense_form.ticket_grayscale')" />
        <div class="flex gap-3">
          <UButton color="neutral" variant="ghost" @click="cancel">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton color="primary" icon="i-heroicons-check" :loading="isProcessing" @click="confirm">
            {{ $t('components.expense_form.ticket_crop_confirm') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
