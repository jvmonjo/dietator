<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import type { ExpenseRecord } from '~/stores/expenses'
import { resolveExpenseCategory, CATEGORY_COLORS } from '~/utils/expenseCategories'
import { compressExpenseRecord, decompressExpenseRecord } from '~/utils/qr'
import { ensureUtc } from '~/utils/datetime'
import { shareExpenses } from '~/utils/expenseShare'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  archiveDateRange?: string
  expenses?: ExpenseRecord[]
}>(), {
  title: undefined,
  description: undefined,
  archiveDateRange: undefined,
  expenses: () => []
})

const { t, locale } = useI18n()
const expenseStore = useExpenseStore()
const toast = useToast()

const displayTitle = computed(() => props.title || t('components.expense_list.title'))
const displayDescription = computed(() => props.description || t('components.expense_list.description'))

// Category badge shown for non-diet expenses (diet is the implied default).
const categoryBadge = (expense: ExpenseRecord) => {
  const category = resolveExpenseCategory(expense)
  if (category === 'diet') return null
  return { label: t(`expenses.categories.${category}`), color: CATEGORY_COLORS[category] }
}

const page = ref(1)
const itemsPerPage = ref(10)
const searchQuery = ref('')
const locationQuery = ref('')

const pageOptions = computed(() => [
  { label: t('components.expense_list.per_page', { count: 5 }), value: 5 },
  { label: t('components.expense_list.per_page', { count: 10 }), value: 10 },
  { label: t('components.expense_list.per_page', { count: 20 }), value: 20 },
  { label: t('components.expense_list.per_page', { count: 50 }), value: 50 },
  { label: t('components.expense_list.per_page', { count: 100 }), value: 100 },
  { label: t('components.expense_list.all'), value: 1000000 }
])

const filteredExpenses = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  const location = locationQuery.value.toLowerCase().trim()
  return props.expenses.filter(expense => {
    const matchesSearch = !query || expense.description.toLowerCase().includes(query)
    const locationValues = [
      expense.location?.label,
      expense.location?.city,
      expense.location?.province,
      expense.location?.zone
    ].filter(Boolean).join(' ').toLowerCase()
    const matchesLocation = !location || locationValues.includes(location)
    return matchesSearch && matchesLocation
  })
})

const recordCount = computed(() => filteredExpenses.value.length)
const hasRecords = computed(() => recordCount.value > 0)
const totalPages = computed(() => Math.ceil(recordCount.value / itemsPerPage.value))

// Oldest expenses first, matching the service list order.
const tableData = computed(() => {
  return filteredExpenses.value.slice().sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
})

watch([searchQuery, locationQuery, itemsPerPage], () => {
  page.value = 1
})

const paginatedData = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return tableData.value.slice(start, end)
})

const isModalOpen = ref(false)
const selectedExpense = ref<ExpenseRecord | null>(null)

const modalTitle = computed(() => selectedExpense.value
  ? t('components.expense_list.modals.edit_title')
  : t('components.expense_list.modals.new_title'))

const modalDescription = computed(() => selectedExpense.value
  ? t('components.expense_list.modals.edit_desc')
  : t('components.expense_list.modals.new_desc'))

const columns = computed(() => [
  { accessorKey: 'select', id: 'select', header: '' },
  { accessorKey: 'actions', id: 'actions', header: t('components.expense_list.actions') },
  { accessorKey: 'timestamp', id: 'timestamp', header: t('components.expense_list.date') },
  { accessorKey: 'description', id: 'description', header: t('components.expense_list.description_col') },
  { accessorKey: 'location', id: 'location', header: t('components.expense_list.location') },
  { accessorKey: 'amount', id: 'amount', header: t('components.expense_list.amount') }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[])

// Bulk selection: ids of the expenses ticked in the list. Selection persists
// across pages and is pruned whenever the underlying list changes.
const selectedIds = ref<Set<string>>(new Set())
const isSelected = (id: string) => selectedIds.value.has(id)
const toggleSelected = (id: string, value?: boolean) => {
  const next = new Set(selectedIds.value)
  const shouldSelect = value ?? !next.has(id)
  if (shouldSelect) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

const selectedCount = computed(() => selectedIds.value.size)
const selectedExpenses = computed(() => filteredExpenses.value.filter(e => selectedIds.value.has(e.id)))

// Header checkbox reflects/controls selection over the whole filtered list.
const allSelected = computed(() =>
  filteredExpenses.value.length > 0 && filteredExpenses.value.every(e => selectedIds.value.has(e.id)))
const someSelected = computed(() => selectedCount.value > 0 && !allSelected.value)
const toggleSelectAll = (value: boolean) => {
  selectedIds.value = value ? new Set(filteredExpenses.value.map(e => e.id)) : new Set()
}
const clearSelection = () => {
  selectedIds.value = new Set()
}

// Drop selected ids that are no longer part of the visible list (e.g. after a
// filter or date-range change).
watch(filteredExpenses, (expenses) => {
  if (selectedIds.value.size === 0) return
  const present = new Set(expenses.map(e => e.id))
  const next = new Set([...selectedIds.value].filter(id => present.has(id)))
  if (next.size !== selectedIds.value.size) selectedIds.value = next
})

const isSharing = ref(false)
const shareSelected = async () => {
  if (isSharing.value || selectedExpenses.value.length === 0) return
  isSharing.value = true
  try {
    const outcome = await shareExpenses(selectedExpenses.value, {
      locale: locale.value,
      categoryLabel: (category: string) => t(`expenses.categories.${category}`),
      title: t('components.expense_list.share_selected_title', { count: selectedExpenses.value.length }),
      filenameDateRange: props.archiveDateRange
    })
    if (outcome === 'shared' || outcome === 'downloaded') {
      toast.add({ title: t('components.expense_list.share_success'), color: 'success' })
    }
  } catch (error) {
    console.error('Error sharing expenses', error)
    toast.add({ title: t('components.expense_list.share_error'), color: 'error' })
  } finally {
    isSharing.value = false
  }
}

const openExpense = (expense: ExpenseRecord) => {
  selectedExpense.value = expense
  isModalOpen.value = true
}

const openNewExpense = () => {
  selectedExpense.value = null
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedExpense.value = null
}

const handleSaved = () => {
  closeModal()
}

const confirmModal = reactive({
  isOpen: false,
  title: '',
  description: '',
  action: null as (() => void) | null
})

const handleConfirmDelete = () => {
  if (confirmModal.action) {
    confirmModal.action()
  }
  confirmModal.isOpen = false
}

const confirmDelete = (id: string) => {
  confirmModal.title = t('components.expense_list.modals.delete_title')
  confirmModal.description = t('components.expense_list.modals.delete_desc')
  confirmModal.action = () => {
    expenseStore.deleteExpense(id)
    toast.add({ title: t('components.expense_list.modals.deleted'), color: 'success' })
  }
  confirmModal.isOpen = true
}

// Timestamps are stored in UTC; convert to the user's local time for display.
const formatDate = (value: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale.value)
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'EUR' }).format(value || 0)
}

const isViewerOpen = ref(false)
const viewerTicket = ref<ExpenseRecord | null>(null)
const viewTicket = (expense: ExpenseRecord) => {
  if (!expense.ticket) return
  viewerTicket.value = expense
  isViewerOpen.value = true
}

const hasTicket = (expense: ExpenseRecord) => Boolean(expense.ticket || expense.ticketId)

// QR sharing: export one expense to a QR code, or scan one to import it onto
// another device. Tickets are not included (too large for a QR).
const isQrModalOpen = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const qrData = ref<any>(null)
const isQrScannerOpen = ref(false)
const { initAudio } = useScanFeedback()

const openQrCode = (expense: ExpenseRecord) => {
  qrData.value = compressExpenseRecord(expense)
  isQrModalOpen.value = true
}

const handleOpenScanner = () => {
  initAudio()
  isQrScannerOpen.value = true
}

const handleQrImport = (result: string) => {
  try {
    const decompressed = decompressExpenseRecord(JSON.parse(result))
    if (!decompressed.description || !decompressed.timestamp || typeof decompressed.amount !== 'number') {
      throw new Error('invalid')
    }
    void expenseStore.addExpense({
      id: uuidv4(),
      description: decompressed.description,
      timestamp: ensureUtc(decompressed.timestamp),
      amount: decompressed.amount,
      ...(decompressed.category ? { category: decompressed.category } : {}),
      ...(decompressed.location ? { location: decompressed.location } : {})
    }).then(() => {
      toast.add({ title: t('components.expense_list.modals.import_success'), color: 'success' })
    }).catch((error) => {
      console.error(error)
      toast.add({
        title: t('components.expense_list.modals.import_error_title'),
        description: t('components.expense_list.modals.import_error'),
        color: 'error'
      })
    })
  } catch (e) {
    console.error(e)
    toast.add({
      title: t('components.expense_list.modals.import_error_title'),
      description: t('components.expense_list.modals.import_error'),
      color: 'error'
    })
  }
}

const rowActions = (expense: ExpenseRecord) => {
  const items = [
    {
      label: t('components.expense_list.edit'),
      icon: 'i-heroicons-pencil-square',
      onSelect: () => openExpense(expense)
    }
  ]
  if (hasTicket(expense)) {
    items.push({
      label: t('components.expense_list.view_ticket'),
      icon: 'i-heroicons-paper-clip',
      onSelect: () => viewTicket(expense)
    })
  }
  items.push({
    label: t('components.expense_list.delete'),
    icon: 'i-heroicons-trash',
    color: 'error',
    onSelect: () => confirmDelete(expense.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  return items
}

defineExpose({
  openExpense,
  openNewExpense
})
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ displayTitle }}
          <UBadge color="primary" variant="soft">{{ $t('components.expense_list.records_count', { count: recordCount }) }}</UBadge>
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ displayDescription }}</p>
      </div>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        <UInput
          v-model="searchQuery" :placeholder="$t('components.expense_list.search_placeholder')"
          class="w-full sm:w-64" :ui="{ trailing: 'pointer-events-auto' }">
          <template #leading>
            <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-400" />
          </template>
          <template #trailing>
            <UButton
              v-if="searchQuery" color="neutral" variant="link" icon="i-heroicons-x-mark-20-solid"
              :padded="false" @click="searchQuery = ''" />
          </template>
        </UInput>
        <UInput
          v-model="locationQuery" :placeholder="$t('components.expense_list.location_filter_placeholder')"
          class="w-full sm:w-64" :ui="{ trailing: 'pointer-events-auto' }">
          <template #leading>
            <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-gray-400" />
          </template>
          <template #trailing>
            <UButton
              v-if="locationQuery" color="neutral" variant="link" icon="i-heroicons-x-mark-20-solid"
              :padded="false" @click="locationQuery = ''" />
          </template>
        </UInput>
        <UButton icon="i-heroicons-plus" color="primary" variant="soft" @click="openNewExpense">
          {{ $t('components.expense_list.add') }}
        </UButton>
        <UButton icon="i-heroicons-qr-code" color="neutral" variant="solid" @click="handleOpenScanner">
          {{ $t('components.expense_list.import') }}
        </UButton>
      </div>
    </div>

    <!-- Bulk selection bar: appears once at least one row is selected. -->
    <div
      v-if="selectedCount > 0"
      class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-200 dark:border-primary-900 bg-primary-50 dark:bg-primary-950/40 px-4 py-2">
      <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
        {{ $t('components.expense_list.selected_count', { count: selectedCount }) }}
      </span>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-arrow-up-tray" color="primary" variant="soft" size="sm"
          :loading="isSharing" @click="shareSelected">
          {{ $t('components.expense_list.share_selected') }}
        </UButton>
        <UButton
          icon="i-heroicons-x-mark-20-solid" color="neutral" variant="ghost" size="sm"
          @click="clearSelection">
          {{ $t('components.expense_list.clear_selection') }}
        </UButton>
      </div>
    </div>

    <UCard>
      <div v-if="!hasRecords" class="py-10 text-center text-gray-500 dark:text-gray-400">
        {{ $t('components.expense_list.empty') }}
      </div>
      <div v-else class="space-y-4">
        <UTable
          :key="page" :data="paginatedData" :columns="columns"
          @select="(e: any, row: any) => openExpense(row.original)">
          <template #select-header>
            <UCheckbox
              :model-value="allSelected ? true : (someSelected ? 'indeterminate' : false)"
              :aria-label="$t('components.expense_list.select_all')"
              @update:model-value="toggleSelectAll(Boolean($event))" @click.stop />
          </template>
          <template #select-cell="{ row }">
            <UCheckbox
              :model-value="isSelected((row.original as ExpenseRecord).id)"
              :aria-label="$t('components.expense_list.select_row')"
              @update:model-value="toggleSelected((row.original as ExpenseRecord).id, Boolean($event))"
              @click.stop />
          </template>
          <template #timestamp-cell="{ row }">
            {{ formatDate((row.original as ExpenseRecord).timestamp) }}
          </template>
          <template #description-cell="{ row }">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ (row.original as ExpenseRecord).description }}</span>
              <UBadge
                v-if="categoryBadge(row.original as ExpenseRecord)" :color="categoryBadge(row.original as ExpenseRecord)!.color"
                variant="soft" size="xs">
                {{ categoryBadge(row.original as ExpenseRecord)!.label }}
              </UBadge>
              <UIcon
                v-if="hasTicket(row.original as ExpenseRecord)" name="i-heroicons-paper-clip"
                class="h-4 w-4 shrink-0 text-gray-400 cursor-pointer"
                :title="$t('components.expense_list.ticket_badge')"
                @click.stop="viewTicket(row.original as ExpenseRecord)" />
            </div>
          </template>
          <template #location-cell="{ row }">
            <span class="text-sm text-gray-600 dark:text-gray-300">
              {{ (row.original as ExpenseRecord).location?.label || '—' }}
            </span>
          </template>
          <template #amount-cell="{ row }">
            <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency((row.original as ExpenseRecord).amount) }}</span>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-2 items-center" @click.stop>
              <UTooltip :text="$t('components.expense_list.share_qr')">
                <UButton
                  icon="i-heroicons-qr-code" size="xs" variant="soft" color="neutral"
                  @click="openQrCode(row.original as ExpenseRecord)" />
              </UTooltip>
              <UDropdownMenu :items="rowActions(row.original as ExpenseRecord)">
                <UButton color="neutral" variant="ghost" icon="i-heroicons-ellipsis-vertical" size="xs" />
              </UDropdownMenu>
            </div>
          </template>
        </UTable>

        <div
          v-if="recordCount > 5"
          class="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200 dark:border-gray-800 pt-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            <USelect
              v-model="itemsPerPage" :items="pageOptions" option-attribute="label" value-attribute="value"
              size="xs" color="neutral" variant="outline" />
          </div>
          <UPagination v-if="totalPages > 1" v-model:page="page" :items-per-page="itemsPerPage" :total="recordCount" />
        </div>
      </div>
    </UCard>

    <!-- Custom Modal Overlay -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" @click="closeModal" />

      <div
        class="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ modalTitle }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ modalDescription }}</p>
          </div>
          <UButton icon="i-heroicons-x-mark-20-solid" color="neutral" variant="ghost" @click="closeModal" />
        </div>

        <div class="p-6">
          <ExpenseForm :initial-data="selectedExpense" @saved="handleSaved" />
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <UModal v-model:open="confirmModal.isOpen" :title="confirmModal.title" :description="confirmModal.description">
      <template #footer>
        <UButton color="neutral" variant="ghost" @click="confirmModal.isOpen = false">{{ $t('common.cancel') }}</UButton>
        <UButton color="error" @click="handleConfirmDelete">{{ $t('common.delete') }}</UButton>
      </template>
    </UModal>

    <TicketViewerModal
      v-model:open="isViewerOpen" :src="viewerTicket?.ticket || null"
      :name="viewerTicket?.ticketName" :type="viewerTicket?.ticketType" />

    <QrCodeModal
      v-if="isQrModalOpen" v-model:open="isQrModalOpen" :data="qrData || {}"
      :title="$t('components.expense_list.qr_title')" />
    <QrScannerModal v-if="isQrScannerOpen" v-model:open="isQrScannerOpen" @detected="handleQrImport" />
  </section>
</template>
