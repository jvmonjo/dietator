<script setup lang="ts">
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { FormSubmitEvent } from '#ui/types'
import type { ExpenseRecord } from '~/stores/expenses'
import { utcToLocalInput, localInputToUtc } from '~/utils/datetime'

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
  amount: undefined as number | undefined
})

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
  } else {
    state.description = ''
    state.dateTime = formatLocalNow()
    state.amount = undefined
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
      amount: event.data.amount
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

    <div class="pt-2">
      <UButton type="submit" block size="xl" :loading="isLoading">
        {{ submitLabel }}
      </UButton>
    </div>
  </UForm>
</template>
