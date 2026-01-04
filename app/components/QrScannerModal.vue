<script setup lang="ts">
import { QrcodeStream } from 'vue-qrcode-reader'

withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: 'Escanejar QR',
  description: 'Enfoca el codi QR dins del requadre per importar el servei.'
})

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
    error.value = "Necessites donar permís d'accés a la càmera."
  } else if (errorName === 'NotFoundError') {
    error.value = 'No s\'ha trobat cap càmera en aquest dispositiu.'
  } else if (errorName === 'NotSupportedError') {
    error.value = 'Aquesta pàgina no es serveix a través de HTTPS (seguretat requerida).'
  } else if (errorName === 'NotReadableError') {
    error.value = 'La càmera ja està en ús.'
  } else if (errorName === 'OverconstrainedError') {
    error.value = 'Les càmeres instal·lades no són adequades.'
  } else if (errorName === 'StreamApiNotSupportedError') {
    error.value = 'El navegador no suporta l\'accés a la càmera.'
  } else {
    error.value = `Error de càmera: ${err.message}`
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
  <UModal v-model:open="isOpen" :title="title" :description="description" :prevent-close="isLoading">
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
                <span>Iniciant càmera...</span>
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
      <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel·lar</UButton>
    </template>
  </UModal>
</template>
