<script setup lang="ts">
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

defineProps<{
  src: string | null
}>()

const emit = defineEmits<{
  (e: 'confirm', blob: Blob): void
  (e: 'cancel'): void
}>()

const isOpen = defineModel<boolean>('open', { default: false })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cropperRef = ref<any>(null)
const isProcessing = ref(false)

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
  // Export at high quality; browser-image-compression does the heavy lifting afterwards.
  canvas.toBlob((blob) => {
    isProcessing.value = false
    if (blob) {
      emit('confirm', blob)
      isOpen.value = false
    }
  }, 'image/jpeg', 0.9)
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div class="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" @click="cancel" />

    <div class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-900">
      <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
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

      <div class="bg-gray-950 p-2">
        <Cropper
          v-if="src" ref="cropperRef" :src="src"
          class="max-h-[60vh]" :stencil-props="{ movable: true, resizable: true }" />
      </div>

      <div class="flex justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-800">
        <UButton color="neutral" variant="ghost" @click="cancel">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton color="primary" icon="i-heroicons-check" :loading="isProcessing" @click="confirm">
          {{ $t('components.expense_form.ticket_crop_confirm') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
