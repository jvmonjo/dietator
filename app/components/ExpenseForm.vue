<script setup lang="ts">
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { FormSubmitEvent } from '#ui/types'
import type { ExpenseRecord } from '~/stores/expenses'
import { utcToLocalInput, localInputToUtc } from '~/utils/datetime'
import { processTicketFile, TicketProcessingError, MAX_TICKET_BYTES } from '~/utils/ticket'

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
  ticketType: undefined as string | undefined
})

// Two hidden inputs: a plain file picker and a camera capture (mobile).
const uploadInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const isProcessingTicket = ref(false)

const ticketIsImage = computed(() => Boolean(state.ticketType?.startsWith('image/')))

const triggerUpload = () => uploadInput.value?.click()
const triggerCamera = () => cameraInput.value?.click()

async function onTicketSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Allow re-selecting the same file later.
  input.value = ''
  if (!file) return

  isProcessingTicket.value = true
  try {
    const ticket = await processTicketFile(file)
    state.ticket = ticket.dataUrl
    state.ticketName = ticket.name
    state.ticketType = ticket.type
  } catch (error) {
    const reason = error instanceof TicketProcessingError ? error.reason : 'error'
    const maxMb = Math.round(MAX_TICKET_BYTES / (1024 * 1024))
    const messages: Record<string, string> = {
      too_large: t('components.expense_form.alerts.ticket_too_large', { size: maxMb }),
      invalid: t('components.expense_form.alerts.ticket_invalid'),
      error: t('components.expense_form.alerts.ticket_error')
    }
    toast.add({ title: messages[reason] || messages.error, color: 'error' })
  } finally {
    isProcessingTicket.value = false
  }
}

const removeTicket = () => {
  state.ticket = undefined
  state.ticketName = undefined
  state.ticketType = undefined
}

const viewTicket = () => {
  if (state.ticket) window.open(state.ticket, '_blank')
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
  } else {
    state.description = ''
    state.dateTime = formatLocalNow()
    state.amount = undefined
    state.ticket = undefined
    state.ticketName = undefined
    state.ticketType = undefined
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
          <button
            type="button" class="text-xs text-primary-500 hover:underline" @click="viewTicket">
            {{ $t('components.expense_form.ticket_view') }}
          </button>
        </div>
        <UButton
          icon="i-heroicons-trash" color="error" variant="ghost" size="xs"
          :aria-label="$t('components.expense_form.ticket_remove')" @click="removeTicket" />
      </div>
    </UFormField>

    <div class="pt-2">
      <UButton type="submit" block size="xl" :loading="isLoading">
        {{ submitLabel }}
      </UButton>
    </div>
  </UForm>
</template>
