<script setup lang="ts">
import type { ServiceRecord } from '~/stores/services'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  enableEdit?: boolean
  enableDelete?: boolean
  records?: ServiceRecord[]
}>(), {
  title: 'Serveis registrats',
  description: 'Consulta, edita o esborra els registres existents.',
  enableEdit: true,
  enableDelete: true,
  records: () => []
})

const serviceStore = useServiceStore()
const toast = useToast()

const page = ref(1)
const itemsPerPage = ref(10)
const searchQuery = ref('')

const pageOptions = [
  { label: '5 per pàgina', value: 5 },
  { label: '10 per pàgina', value: 10 },
  { label: '20 per pàgina', value: 20 },
  { label: '50 per pàgina', value: 50 },
  { label: '100 per pàgina', value: 100 },
  { label: 'Tots', value: 1000000 }
]

const filteredRecords = computed(() => {
  if (!searchQuery.value) return props.records
  const query = searchQuery.value.toLowerCase()
  return props.records.filter(record => {
    // Check notes
    if (record.notes?.toLowerCase().includes(query)) return true

    // Check displacements (municipality or observations)
    return record.displacements.some(d =>
      d.municipality.toLowerCase().includes(query) ||
      d.observations?.toLowerCase().includes(query)
    )
  })
})

const recordCount = computed(() => filteredRecords.value.length)
const hasRecords = computed(() => recordCount.value > 0)
const totalPages = computed(() => Math.ceil(recordCount.value / itemsPerPage.value))

const tableData = computed(() => {
  return filteredRecords.value.slice().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
})

// Reset page when search or items per page changes
watch([searchQuery, itemsPerPage], () => {
  page.value = 1
})

const paginatedData = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return tableData.value.slice(start, end)
})

const isModalOpen = ref(false)
const selectedRecord = ref<ServiceRecord | null>(null)
const selectedDate = ref<Date | null>(null)
const selectedNotes = ref<string>('')
const isDuplicateMode = ref(false)

const modalTitle = computed(() => {
  if (isDuplicateMode.value) return 'Duplicar servei'
  if (selectedRecord.value) return 'Editar servei'
  return 'Nou servei'
})

const modalDescription = computed(() => {
  if (isDuplicateMode.value) return 'Crea un nou servei a partir de les dades existents'
  if (selectedRecord.value) return 'Actualitza les dades del servei seleccionat'
  return 'Ompli les dades del servei'
})

const columns = [
  { accessorKey: 'actions', id: 'actions', header: 'Accions' },
  { accessorKey: 'startTime', id: 'startTime', header: 'Inici' },
  { accessorKey: 'endTime', id: 'endTime', header: 'Fi' },
  { accessorKey: 'displacements', id: 'displacements', header: 'Desplaçaments' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[]

// ...

const openRecord = (record: ServiceRecord) => {
  selectedRecord.value = record
  selectedDate.value = null
  isDuplicateMode.value = false
  isModalOpen.value = true
}

const duplicateRecord = (record: ServiceRecord) => {
  selectedRecord.value = record
  selectedDate.value = null
  isDuplicateMode.value = true
  isModalOpen.value = true
}

const selectedStartTime = ref<string>('')
const selectedEndTime = ref<string>('')
const selectedDisplacements = ref<ServiceRecord['displacements']>([])

const openNewService = (date?: Date, notes?: string, startTime?: string, endTime?: string, displacements?: ServiceRecord['displacements']) => {
  selectedRecord.value = null
  selectedDate.value = date || null
  selectedNotes.value = notes || ''
  selectedStartTime.value = startTime || ''
  selectedEndTime.value = endTime || ''
  selectedDisplacements.value = displacements || []
  isDuplicateMode.value = false
  isModalOpen.value = true
}

// ...

const closeModal = () => {
  isModalOpen.value = false
  selectedRecord.value = null
  selectedDate.value = null
  selectedNotes.value = ''
  isDuplicateMode.value = false
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
  confirmModal.title = 'Eliminar servei'
  confirmModal.description = 'Estàs segur que vols eliminar aquest servei? Aquesta acció no es pot desfer.'
  confirmModal.action = () => {
    serviceStore.deleteRecord(id)
    toast.add({ title: 'Servei eliminat', color: 'success' })
  }
  confirmModal.isOpen = true
}

const formatDate = (value: string) => {
  if (!value)
    return '—'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const formatMunicipality = (name: string) => {
  if (!name) return ''
  return name.length > 3 ? name.substring(0, 3) : name
}

defineExpose({
  openRecord,
  openNewService
})
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ props.title }} <UBadge color="primary"
            variant="soft">{{ recordCount }} registres</UBadge>
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ props.description }}</p>
      </div>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        <UInput v-model="searchQuery" placeholder="Buscar per municipi, notes..." class="w-full sm:w-64"
          :ui="{ trailing: 'pointer-events-auto' }">
          <template #leading>
            <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-400" />
          </template>
          <template #trailing>
            <UButton v-if="searchQuery" color="neutral" variant="link" icon="i-heroicons-x-mark-20-solid"
              :padded="false" @click="searchQuery = ''" />
          </template>
        </UInput>
        <div class="flex items-center gap-3">
          <UButton icon="i-heroicons-plus" color="primary" variant="soft" @click="() => openNewService()">
            Afegir servei
          </UButton>
        </div>
      </div>
    </div>

    <UCard>
      <div v-if="!hasRecords" class="py-10 text-center text-gray-500 dark:text-gray-400">
        Encara no hi ha serveis registrats.
      </div>
      <div v-else class="space-y-4">

        <UTable :key="page" :data="paginatedData" :columns="columns">
          <template #startTime-cell="{ row }">
            <div class="flex items-center gap-2">
              <UTooltip
                v-if="useServiceWarnings().getServiceWarnings((row.original as ServiceRecord).startTime, (row.original as ServiceRecord).endTime, (row.original as ServiceRecord).displacements).length > 0"
                :text="useServiceWarnings().getServiceWarnings((row.original as ServiceRecord).startTime, (row.original as ServiceRecord).endTime, (row.original as ServiceRecord).displacements).map(w => w.message).join('\n')">
                <UIcon name="i-heroicons-exclamation-triangle" class="text-amber-500 w-5 h-5 flex-shrink-0" />
              </UTooltip>
              <span>{{ formatDate((row.original as ServiceRecord).startTime) }}</span>
            </div>
          </template>
          <template #endTime-cell="{ row }">
            {{ formatDate((row.original as ServiceRecord).endTime) }}
          </template>
          <template #displacements-cell="{ row }">
            <div class="text-sm text-gray-700 dark:text-gray-300">
              <span v-for="(displacement, index) in (row.original as ServiceRecord).displacements"
                :key="displacement.id">
                {{ formatMunicipality(displacement.municipality) }}
                <span v-if="displacement.hasLunch || displacement.hasDinner"
                  class="text-xs text-gray-500 dark:text-gray-400">
                  ({{ displacement.hasLunch ? 'D' : '' }}{{ displacement.hasLunch && displacement.hasDinner ? '+' : ''
                  }}{{ displacement.hasDinner ? 'S' : '' }})
                </span><span v-if="index < (row.original as ServiceRecord).displacements.length - 1">, </span>
              </span>
            </div>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-2">
              <UTooltip text="Editar">
                <UButton v-if="props.enableEdit" icon="i-heroicons-pencil-square" size="xs" variant="soft"
                  @click="openRecord(row.original as ServiceRecord)" />
              </UTooltip>

              <UTooltip text="Duplicar">
                <UButton icon="i-heroicons-document-duplicate" size="xs" variant="soft" color="neutral"
                  @click="duplicateRecord(row.original as ServiceRecord)" />
              </UTooltip>

              <UTooltip text="Eliminar">
                <UButton v-if="props.enableDelete" icon="i-heroicons-trash" size="xs" color="error" variant="ghost"
                  @click="confirmDelete((row.original as ServiceRecord).id)" />
              </UTooltip>
            </div>
          </template>
        </UTable>

        <div v-if="recordCount > 5"
          class="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200 dark:border-gray-800 pt-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            <USelect v-model="itemsPerPage" :items="pageOptions" option-attribute="label" value-attribute="value"
              size="xs" color="neutral" variant="outline" />
          </div>

          <UPagination v-if="totalPages > 1" v-model:page="page" :page-count="itemsPerPage" :total="recordCount" />
        </div>
      </div>
    </UCard>

    <!-- Custom Modal Overlay -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" @click="closeModal" />

      <!-- Modal Content -->
      <div
        class="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ modalTitle }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ modalDescription }}
            </p>
          </div>
          <UButton icon="i-heroicons-x-mark-20-solid" color="neutral" variant="ghost" @click="closeModal" />
        </div>

        <!-- Body -->
        <div class="p-6">
          <ServiceForm v-if="selectedRecord || !selectedRecord" :initial-data="selectedRecord"
            :initial-date="selectedDate" :initial-notes="selectedNotes" :initial-start-time="selectedStartTime"
            :initial-end-time="selectedEndTime" :initial-displacements="selectedDisplacements"
            :is-duplicate="isDuplicateMode" @saved="handleSaved" />
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <UModal v-model:open="confirmModal.isOpen" :title="confirmModal.title" :description="confirmModal.description">
      <template #footer>
        <UButton color="neutral" variant="ghost" @click="confirmModal.isOpen = false">Cancel·lar</UButton>
        <UButton color="error" @click="handleConfirmDelete">Eliminar</UButton>
      </template>
    </UModal>

  </section>
</template>
