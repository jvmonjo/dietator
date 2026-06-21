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
import { recognizeImages, parseReceiptText } from '~/utils/ocr'
import { renderPdfToImages } from '~/utils/pdf'
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
const { attachAutocomplete, detectCurrentLocation } = useExpenseLocation()

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
  category: DEFAULT_EXPENSE_CATEGORY as ExpenseCategory,
  locationLabel: '',
  location: undefined as ExpenseRecord['location']
})
const locationAutocompleteHost = ref<HTMLElement | null>(null)
const locationAutocomplete = shallowRef<HTMLElement & { value?: string }>()
const isLocationAutocompleteReady = ref(false)
const isDetectingLocation = ref(false)

const setLocation = (location: ExpenseRecord['location']) => {
  state.location = location
  state.locationLabel = location?.label || ''
  if (locationAutocomplete.value && locationAutocomplete.value.value !== state.locationLabel) {
    locationAutocomplete.value.value = state.locationLabel
  }
}

onMounted(async () => {
  if (!locationAutocompleteHost.value) return
  try {
    locationAutocomplete.value = await attachAutocomplete(locationAutocompleteHost.value, {
      value: state.locationLabel,
      placeholder: t('components.expense_form.location_placeholder'),
      onInput: value => { state.locationLabel = value },
      onSelected: setLocation
    })
    isLocationAutocompleteReady.value = true
  } catch {
    // Google Maps is optional; users can still type a location manually.
  }
})

watch(() => state.locationLabel, (label) => {
  if (!label.trim()) {
    state.location = undefined
    return
  }
  if (state.location?.label !== label) {
    state.location = { label: label.trim() }
  }
  if (locationAutocomplete.value && locationAutocomplete.value.value !== label) {
    locationAutocomplete.value.value = label
  }
})

const autoDetectLocation = async () => {
  if (isDetectingLocation.value) return
  isDetectingLocation.value = true
  try {
    setLocation(await detectCurrentLocation())
    toast.add({ title: t('components.expense_form.alerts.location_detected'), color: 'success' })
  } catch (error) {
    console.error('Location detection failed', error)
    toast.add({ title: t('components.expense_form.alerts.location_error'), color: 'error' })
  } finally {
    isDetectingLocation.value = false
  }
}

const categoryItems = computed(() => EXPENSE_CATEGORIES.map(value => ({
  value,
  label: t(`expenses.categories.${value}`)
})))

// The amount is edited as free text (so trailing decimals like "1.0" or "1,"
// are not swallowed by numeric coercion) and mirrored into state.amount as a
// number for validation and saving. Both '.' and ',' are accepted as the
// decimal separator.
const amountInput = ref('')
watch(amountInput, (raw) => {
  // Keep only digits and a single decimal separator (first one wins).
  let cleaned = raw.replace(/[^0-9.,]/g, '')
  const firstSep = cleaned.search(/[.,]/)
  if (firstSep !== -1) {
    cleaned = cleaned.slice(0, firstSep + 1) + cleaned.slice(firstSep + 1).replace(/[.,]/g, '')
  }
  if (cleaned !== raw) {
    amountInput.value = cleaned // Re-runs the watcher with the sanitised value.
    return
  }
  if (cleaned === '') {
    state.amount = undefined
    return
  }
  const parsed = Number.parseFloat(cleaned.replace(',', '.'))
  state.amount = Number.isFinite(parsed) ? parsed : undefined
})

// Two hidden inputs: a plain file picker and a camera capture (mobile).
const uploadInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const isProcessingTicket = ref(false)

// Crop step: images are routed through the cropper before compression.
const isCropOpen = ref(false)
const cropSrc = ref<string | null>(null)
const pendingTicketName = ref('ticket.jpg')

const ticketIsImage = computed(() => Boolean(state.ticketType?.startsWith('image/')))
const ticketIsPdf = computed(() => state.ticketType === 'application/pdf')

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

// OCR: read the attached image ticket locally and prefill empty fields. The
// engine (tesseract.js) and its language model are loaded on demand.
const isExtracting = ref(false)
const extractProgress = ref(0)

async function extractFromTicket() {
  if (isExtracting.value || !state.ticket || (!ticketIsImage.value && !ticketIsPdf.value)) return
  isExtracting.value = true
  extractProgress.value = 0
  try {
    // PDFs are rasterised first (OCR only reads images); images go straight in.
    const images = ticketIsPdf.value
      ? await renderPdfToImages(state.ticket)
      : [state.ticket]
    if (images.length === 0) throw new Error('no_pages')

    const text = await recognizeImages(images, (p) => { extractProgress.value = Math.round(p * 100) })
    const parsed = parseReceiptText(text)

    const filled: string[] = []
    if (parsed.description && !state.description.trim()) {
      state.description = parsed.description
      filled.push(t('components.expense_form.description'))
    }
    if (parsed.amount != null && state.amount == null) {
      amountInput.value = String(parsed.amount)
      filled.push(t('components.expense_form.amount'))
    }
    // Only override the date for a brand-new expense (it defaults to "now").
    if (parsed.dateTime && !isEditing.value) {
      state.dateTime = parsed.dateTime
      filled.push(t('components.expense_form.date'))
    }

    if (filled.length > 0) {
      toast.add({
        title: t('components.expense_form.alerts.ocr_success'),
        description: filled.join(', '),
        color: 'success'
      })
    } else {
      toast.add({ title: t('components.expense_form.alerts.ocr_empty'), color: 'warning' })
    }
  } catch (error) {
    console.error('OCR extraction failed', error)
    toast.add({ title: t('components.expense_form.alerts.ocr_error'), color: 'error' })
  } finally {
    isExtracting.value = false
  }
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
    amountInput.value = props.initialData.amount != null ? String(props.initialData.amount) : ''
    state.ticket = props.initialData.ticket
    state.ticketName = props.initialData.ticketName
    state.ticketType = props.initialData.ticketType
    state.category = resolveExpenseCategory(props.initialData)
    setLocation(props.initialData.location)
  } else {
    state.description = ''
    state.dateTime = formatLocalNow()
    state.amount = undefined
    amountInput.value = ''
    state.ticket = undefined
    state.ticketName = undefined
    state.ticketType = undefined
    state.category = DEFAULT_EXPENSE_CATEGORY
    setLocation(undefined)
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
      ...(state.location ? { location: state.location } : {}),
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
          v-model="amountInput" type="text" inputmode="decimal"
          icon="i-heroicons-banknotes" placeholder="0.00" class="w-full" />
      </UFormField>
    </div>

    <UFormField :label="$t('components.expense_form.category')" name="category">
      <USelect
        v-model="state.category" :items="categoryItems" option-attribute="label" value-attribute="value"
        icon="i-heroicons-tag" class="w-full" />
      <template #help>{{ $t('components.expense_form.category_hint') }}</template>
    </UFormField>

    <UFormField :label="$t('components.expense_form.location')" name="location">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="w-full">
          <div ref="locationAutocompleteHost" :class="{ hidden: !isLocationAutocompleteReady }" />
          <UInput
            v-if="!isLocationAutocompleteReady" v-model="state.locationLabel" icon="i-heroicons-map-pin"
            :placeholder="$t('components.expense_form.location_placeholder')" class="w-full" />
        </div>
        <UButton
          type="button" icon="i-heroicons-map" color="neutral" variant="outline"
          :loading="isDetectingLocation" @click="autoDetectLocation">
          {{ $t('components.expense_form.detect_location') }}
        </UButton>
      </div>
      <template #help>{{ $t('components.expense_form.location_hint') }}</template>
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

      <!-- OCR: extract the expense fields from the attached image or PDF. -->
      <div v-if="state.ticket && (ticketIsImage || ticketIsPdf)" class="mt-3">
        <UButton
          icon="i-heroicons-sparkles" color="primary" variant="soft" size="sm"
          :loading="isExtracting" @click="extractFromTicket">
          {{ isExtracting && extractProgress > 0
            ? $t('components.expense_form.ticket_extract_progress', { progress: extractProgress })
            : $t('components.expense_form.ticket_extract') }}
        </UButton>
        <p class="text-xs text-gray-400 mt-1">{{ $t('components.expense_form.ticket_extract_hint') }}</p>
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
