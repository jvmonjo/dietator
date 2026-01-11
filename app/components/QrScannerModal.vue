<script setup lang="ts">
import { QrcodeStream } from 'vue-qrcode-reader'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: undefined,
  description: undefined
})

const { t } = useI18n()
const displayTitle = computed(() => props.title || t('components.qr_scanner.title'))
const displayDescription = computed(() => props.description || t('components.qr_scanner.description'))

const emit = defineEmits<{
  (e: 'detected', result: string): void
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const error = ref<string>('')
const isLoading = ref(true)

const onCameraOn = () => {
  isLoading.value = false
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onError = (err: any) => {
  isLoading.value = false

  const errorName = err.name
  if (errorName === 'NotAllowedError') {
    error.value = t('components.qr_scanner.errors.permission')
  } else if (errorName === 'NotFoundError') {
    error.value = t('components.qr_scanner.errors.not_found')
  } else if (errorName === 'NotSupportedError') {
    error.value = t('components.qr_scanner.errors.ssl')
  } else if (errorName === 'NotReadableError') {
    error.value = t('components.qr_scanner.errors.in_use')
  } else if (errorName === 'OverconstrainedError') {
    error.value = t('components.qr_scanner.errors.overconstrained')
  } else if (errorName === 'StreamApiNotSupportedError') {
    error.value = t('components.qr_scanner.errors.stream')
  } else {
    error.value = t('components.qr_scanner.errors.unknown', { error: err.message })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onDetect = (detectedCodes: any[]) => {
  if (detectedCodes && detectedCodes.length > 0) {
    const rawValue = detectedCodes[0].rawValue
    emit('detected', rawValue)
    isOpen.value = false
  }
}

// Reset state when modal opens
watch(isOpen, (val) => {
  if (val) {
    error.value = ''
    isLoading.value = true
  }
})
</script>

<template>
  <UModal v-model:open="isOpen" :title="displayTitle" :description="displayDescription" :prevent-close="isLoading">
    <template #body>
      <div class="flex flex-col h-[60vh] sm:h-[400px]">
        <div class="flex-1 relative bg-black rounded-lg overflow-hidden min-h-[300px]">
          <div
v-if="error"
            class="absolute inset-0 flex items-center justify-center p-6 text-center text-red-400 bg-gray-900 z-10">
            {{ error }}
          </div>

          <QrcodeStream v-if="isOpen && !error" @camera-on="onCameraOn" @error="onError" @detect="onDetect">
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
              <div class="text-white flex flex-col items-center gap-2">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" />
                <span>{{ $t('components.qr_scanner.loading') }}</span>
              </div>
            </div>

            <!-- Overlay guide -->
            <div class="absolute inset-0 border-2 border-white/30 m-8 rounded-lg pointer-events-none">
              <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 -mt-0.5 -ml-0.5" />
              <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 -mt-0.5 -mr-0.5" />
              <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 -mb-0.5 -ml-0.5" />
              <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 -mb-0.5 -mr-0.5" />
            </div>
          </QrcodeStream>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" @click="isOpen = false">{{ $t('common.cancel') }}</UButton>
    </template>
  </UModal>
</template>
