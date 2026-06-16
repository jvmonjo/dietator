<script setup lang="ts">
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { FormSubmitEvent } from '#ui/types'
import type { ExpenseRecord } from '~/stores/expenses'
import { utcToLocalInput, localInputToUtc } from '~/utils/datetime'
import {
  compressImageToDataUrl, processDocumentFile, fileToDataUrl, isImageFile,
  TicketProcessingError, MAX_TICKET_BYTES
} from '~/utils/ticket'
import { EXPENSE_CATEGORIES, DEFAULT_EXPENSE_CATEGORY, resolveExpenseCategory, type ExpenseCategory } from '~/utils/expenseCategories'

const props = withDefaults(defineProps<{
  initialData?: ExpenseRecord | null
}>(), {
  initialData: null
})

const emit = defineEmits<{
  (e: 'saved', expense: ExpenseRecord): void
}>()

const toast = useToast()
const expenseStore = useExpenseStore()
const { t } = useI18n()

const isEditing = computed(() => Boolean(props.initialData))
const isLoading = ref(false)

// `dateTime` holds a local datetime-local value (YYYY-MM-DDTHH:mm). We convert
// to/from UTC when loading and saving so the stored timestamp is always UTC.
const state = reactive({
  description: '',
  dateTime: '',
  amount: undefined as number | undefined,
  ticket: undefined as string | undefined,
  ticketName: undefined as string | undefined,
  ticketType: undefined as string | undefined,
  // Expense category; only "diet" counts toward the net balance.
  category: DEFAULT_EXPENSE_CATEGORY as ExpenseCategory
})

const categoryItems = computed(() => EXPENSE_CATEGORIES.map(value => ({
  value,
  label: t(`expenses.categories.${value}`)
})))

// Two hidden inputs: a plain file picker and a camera capture (mobile).
const uploadInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const isProcessingTicket = ref(false)

// Crop step: images are routed through the cropper before compression.
const isCropOpen = ref(false)
const cropSrc = ref<string | null>(null)
const pendingTicketName = ref('ticket.jpg')

const ticketIsImage = computed(() => Boolean(state.ticketType?.startsWith('image/')))

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// Decoded byte size of the stored ticket data URL, shown next to the file name.
const ticketSize = computed(() => {
  if (!state.ticket) return null
  const base64 = state.ticket.slice(state.ticket.indexOf(',') + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return formatBytes(Math.floor((base64.length * 3) / 4) - padding)
})

const triggerUpload = () => uploadInput.value?.click()
const triggerCamera = () => cameraInput.value?.click()

const notifyTicketError = (error: unknown) => {
  const reason = error instanceof TicketProcessingError ? error.reason : 'error'
  const maxMb = Math.round(MAX_TICKET_BYTES / (1024 * 1024))
  const messages: Record<string, string> = {
    too_large: t('components.expense_form.alerts.ticket_too_large', { size: maxMb }),
    invalid: t('components.expense_form.alerts.ticket_invalid'),
    error: t('components.expense_form.alerts.ticket_error')
  }
  toast.add({ title: messages[reason] || messages.error, color: 'error' })
}

async function onTicketSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Allow re-selecting the same file later.
  input.value = ''
  if (!file) return

  // Images go through the crop step first; PDFs are stored directly.
  if (isImageFile(file)) {
    try {
      cropSrc.value = await fileToDataUrl(file)
      pendingTicketName.value = file.name || 'ticket.jpg'
      isCropOpen.value = true
    } catch (error) {
      notifyTicketError(error)
    }
    return
  }

  isProcessingTicket.value = true
  try {
    const ticket = await processDocumentFile(file)
    state.ticket = ticket.dataUrl
    state.ticketName = ticket.name
    state.ticketType = ticket.type
  } catch (error) {
    notifyTicketError(error)
  } finally {
    isProcessingTicket.value = false
  }
}

async function onCropConfirm(blob: Blob, grayscale: boolean) {
  isProcessingTicket.value = true
  try {
    const ticket = await compressImageToDataUrl(blob, pendingTicketName.value, { grayscale })
    state.ticket = ticket.dataUrl
    state.ticketName = ticket.name
    state.ticketType = ticket.type
  } catch (error) {
    notifyTicketError(error)
  } finally {
    isProcessingTicket.value = false
    cropSrc.value = null
  }
}

const onCropCancel = () => {
  cropSrc.value = null
}

// Re-open the cropper to adjust an image ticket that was already attached.
const editTicket = () => {
  if (!state.ticket || !ticketIsImage.value) return
  cropSrc.value = state.ticket
  pendingTicketName.value = state.ticketName || 'ticket.jpg'
  isCropOpen.value = true
}

const removeTicket = () => {
  state.ticket = undefined
  state.ticketName = undefined
  state.ticketType = undefined
}

const isViewerOpen = ref(false)
const viewTicket = () => {
  if (state.ticket) isViewerOpen.value = true
}

const schema = computed(() => z.object({
  description: z.string().min(1, t('components.expense_form.validation.description_required')),
  dateTime: z.string().min(1, t('components.expense_form.validation.date_required')),
  amount: z.number({ message: t('components.expense_form.validation.amount_required') })
    .positive(t('components.expense_form.validation.amount_positive'))
}))

const formatLocalNow = () => utcToLocalInput(new Date().toISOString())

const resetState = () => {
  if (props.initialData) {
    state.description = props.initialData.description
    state.dateTime = utcToLocalInput(props.initialData.timestamp)
    state.amount = props.initialData.amount
    state.ticket = props.initialData.ticket
    state.ticketName = props.initialData.ticketName
    state.ticketType = props.initialData.ticketType
    state.category = resolveExpenseCategory(props.initialData)
  } else {
    state.description = ''
    state.dateTime = formatLocalNow()
    state.amount = undefined
    state.ticket = undefined
    state.ticketName = undefined
    state.ticketType = undefined
    state.category = DEFAULT_EXPENSE_CATEGORY
  }
}

watch(() => props.initialData, resetState, { immediate: true })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function onSubmit(event: FormSubmitEvent<any>) {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const baseRecord: ExpenseRecord = {
      id: props.initialData?.id || uuidv4(),
      description: event.data.description.trim(),
      timestamp: localInputToUtc(event.data.dateTime),
      amount: event.data.amount,
      category: state.category,
      ...(state.ticket
        ? { ticket: state.ticket, ticketName: state.ticketName, ticketType: state.ticketType }
        : {})
    }

    if (isEditing.value) {
      expenseStore.updateExpense(baseRecord)
      toast.add({ title: t('components.expense_form.alerts.updated'), color: 'success' })
    } else {
      expenseStore.addExpense(baseRecord)
      toast.add({ title: t('components.expense_form.alerts.saved'), color: 'success' })
      resetState()
    }

    emit('saved', baseRecord)
  } catch (error) {
    console.error('Error saving expense', error)
    toast.add({ title: t('components.expense_form.alerts.save_error'), color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const submitLabel = computed(() => isEditing.value
  ? t('components.expense_form.update')
  : t('components.expense_form.save'))
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
    <UFormField :label="$t('components.expense_form.description')" name="description" required>
      <UInput
        v-model="state.description" icon="i-heroicons-document-text"
        :placeholder="$t('components.expense_form.description_placeholder')" class="w-full" />
    </UFormField>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UFormField :label="$t('components.expense_form.date')" name="dateTime" required>
        <UInput v-model="state.dateTime" type="datetime-local" icon="i-heroicons-clock" class="w-full" />
      </UFormField>

      <UFormField :label="$t('components.expense_form.amount')" name="amount" required>
        <UInput
          v-model="state.amount" type="number" step="0.01" min="0"
          icon="i-heroicons-banknotes" placeholder="0.00" class="w-full" />
      </UFormField>
    </div>

    <UFormField :label="$t('components.expense_form.category')" name="category">
      <USelect
        v-model="state.category" :items="categoryItems" option-attribute="label" value-attribute="value"
        icon="i-heroicons-tag" class="w-full" />
      <template #help>{{ $t('components.expense_form.category_hint') }}</template>
    </UFormField>

    <UFormField :label="$t('components.expense_form.ticket')" name="ticket">
      <p class="text-xs text-gray-400 mb-2">{{ $t('components.expense_form.ticket_hint') }}</p>

      <!-- Hidden native inputs drive both the file picker and the camera. -->
      <input
        ref="uploadInput" type="file" accept="image/*,application/pdf" class="hidden"
        @change="onTicketSelected">
      <input
        ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden"
        @change="onTicketSelected">

      <div v-if="!state.ticket" class="flex flex-wrap gap-3">
        <UButton
          icon="i-heroicons-arrow-up-tray" color="neutral" variant="outline"
          :loading="isProcessingTicket" @click="triggerUpload">
          {{ $t('components.expense_form.ticket_upload') }}
        </UButton>
        <UButton
          icon="i-heroicons-camera" color="neutral" variant="outline"
          :loading="isProcessingTicket" @click="triggerCamera">
          {{ $t('components.expense_form.ticket_camera') }}
        </UButton>
      </div>

      <div
        v-else
        class="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
        <img
          v-if="ticketIsImage" :src="state.ticket" alt="ticket"
          class="h-16 w-16 rounded object-cover cursor-pointer" @click="viewTicket">
        <UIcon v-else name="i-heroicons-document" class="h-10 w-10 text-gray-400" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm text-gray-700 dark:text-gray-300">{{ state.ticketName }}</p>
          <div class="flex items-center gap-2 text-xs">
            <span v-if="ticketSize" class="text-gray-400">{{ ticketSize }}</span>
            <button
              type="button" class="text-primary-500 hover:underline" @click="viewTicket">
              {{ $t('components.expense_form.ticket_view') }}
            </button>
          </div>
        </div>
        <UButton
          v-if="ticketIsImage" icon="i-heroicons-scissors" color="neutral" variant="ghost" size="xs"
          :aria-label="$t('components.expense_form.ticket_edit')" @click="editTicket" />
        <UButton
          icon="i-heroicons-trash" color="error" variant="ghost" size="xs"
          :aria-label="$t('components.expense_form.ticket_remove')" @click="removeTicket" />
      </div>
    </UFormField>

    <TicketCropperModal
      v-model:open="isCropOpen" :src="cropSrc"
      @confirm="onCropConfirm" @cancel="onCropCancel" />

    <TicketViewerModal
      v-model:open="isViewerOpen" :src="state.ticket || null"
      :name="state.ticketName" :type="state.ticketType" />

    <div class="pt-2">
      <UButton type="submit" block size="xl" :loading="isLoading">
        {{ submitLabel }}
      </UButton>
    </div>
  </UForm>
</template>
