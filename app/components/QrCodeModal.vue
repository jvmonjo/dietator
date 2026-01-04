<script setup lang="ts">
import QRCode from 'qrcode'

const props = withDefaults(defineProps<{
  data: string | object
  title?: string
  description?: string
  open?: boolean
}>(), {
  title: 'Codi QR',
  description: 'Escaneja aquest codi des d\'un altre dispositiu per importar el servei.',
  open: false
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const qrDataUrl = ref<string>('')
const error = ref<string>('')

const generateQR = async () => {
  if (!props.data) {
    return
  }

  try {
    const stringData = typeof props.data === 'string'
      ? props.data
      : JSON.stringify(props.data)

    qrDataUrl.value = await QRCode.toDataURL(stringData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
    error.value = ''
  } catch (err) {
    console.error('Error generating QR code', err)
    error.value = 'No s\'ha pogut generar el codi QR'
  }
}

watch(() => props.data, generateQR, { immediate: true })
watch(isOpen, (val) => {
  if (val) generateQR()
}, { immediate: true })
</script>

<template>
  <UModal v-model:open="isOpen" :title="title" :description="description">
    <template #body>
      <div class="flex justify-center bg-white p-4 rounded-lg min-h-[100px]">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code" class="max-w-full h-auto rounded-lg">
        <div v-else-if="error" class="text-red-500">
          {{ error }}
        </div>
        <div v-else class="text-gray-400">
          Generant QR...
        </div>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" @click="isOpen = false">Tancar</UButton>
    </template>
  </UModal>
</template>
