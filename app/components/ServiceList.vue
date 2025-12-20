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
const itemsPerPage = 10
const searchQuery = ref('')

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
const totalPages = computed(() => Math.ceil(recordCount.value / itemsPerPage))

const tableData = computed(() => {
  return filteredRecords.value.slice().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
})





const paginatedData = computed(() => {
  const start = (page.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return tableData.value.slice(start, end)
})

const isModalOpen = ref(false)
const selectedRecord = ref<ServiceRecord | null>(null)
const isDuplicateMode = ref(false)

const columns = [
  { accessorKey: 'actions', id: 'actions', header: 'Accions' },
  { accessorKey: 'startTime', id: 'startTime', header: 'Inici' },
  { accessorKey: 'endTime', id: 'endTime', header: 'Fi' },
  { accessorKey: 'displacements', id: 'displacements', header: 'Desplaçaments' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[]

const openNewService = () => {
  selectedRecord.value = null
  isDuplicateMode.value = false
  isModalOpen.value = true
}

const openRecord = (record: ServiceRecord) => {
  selectedRecord.value = record
  isDuplicateMode.value = false
  isModalOpen.value = true
}

const duplicateRecord = (record: ServiceRecord) => {
  selectedRecord.value = record
  isDuplicateMode.value = true
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedRecord.value = null
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
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ props.title }} <UBadge color="primary" variant="soft">{{ recordCount }} registres</UBadge></h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ props.description }}</p>
      </div>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Buscar per municipi, notes..."
          class="w-full sm:w-64"
          :ui="{ trailing: 'pointer-events-auto' }"
        >
          <template #trailing>
            <UButton
              v-if="searchQuery"
              color="neutral"
              variant="link"
              icon="i-heroicons-x-mark-20-solid"
              :padded="false"
              @click="searchQuery = ''"
            />
          </template>
        </UInput>
        <div class="flex items-center gap-3">
          <UButton
            icon="i-heroicons-plus"
            color="primary"
            variant="soft"
            @click="openNewService"
          >
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

        <UTable
          :key="page"
          :data="paginatedData"
          :columns="columns"
        >
          <template #startTime-cell="{ row }">
            <div class="flex items-center gap-2">
              <UTooltip
                v-if="useServiceWarnings().getServiceWarnings((row.original as ServiceRecord).startTime, (row.original as ServiceRecord).endTime, (row.original as ServiceRecord).displacements).length > 0"
                :text="useServiceWarnings().getServiceWarnings((row.original as ServiceRecord).startTime, (row.original as ServiceRecord).endTime, (row.original as ServiceRecord).displacements).map(w => w.message).join('\n')"
              >
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
              <span v-for="(displacement, index) in (row.original as ServiceRecord).displacements" :key="displacement.id">
                {{ formatMunicipality(displacement.municipality) }}
                <span v-if="displacement.hasLunch || displacement.hasDinner" class="text-xs text-gray-500 dark:text-gray-400">
                  ({{ displacement.hasLunch ? 'D' : '' }}{{ displacement.hasLunch && displacement.hasDinner ? '+' : '' }}{{ displacement.hasDinner ? 'S' : '' }})
                </span><span v-if="index < (row.original as ServiceRecord).displacements.length - 1">, </span>
              </span>
            </div>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-2">
              <UTooltip text="Editar">
                <UButton
                  v-if="props.enableEdit"
                  icon="i-heroicons-pencil-square"
                  size="xs"
                  variant="soft"
                  @click="openRecord(row.original as ServiceRecord)"
                />
              </UTooltip>
              
              <UTooltip text="Duplicar">
                <UButton
                  icon="i-heroicons-document-duplicate"
                  size="xs"
                  variant="soft"
                  color="neutral"
                  @click="duplicateRecord(row.original as ServiceRecord)"
                />
              </UTooltip>
              
              <UTooltip text="Eliminar">
                <UButton
                  v-if="props.enableDelete"
                  icon="i-heroicons-trash"
                  size="xs"
                  color="error"
                  variant="ghost"
                  @click="confirmDelete((row.original as ServiceRecord).id)"
                />
              </UTooltip>
            </div>
          </template>
        </UTable>

        <div v-if="totalPages > 1" class="flex justify-center border-t border-gray-200 dark:border-gray-800 pt-4">
          <UPagination
            v-model:page="page"
            :page-count="itemsPerPage"
            :total="recordCount"
          />
        </div>
      </div>
    </UCard>

    <!-- Custom Modal Overlay -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" @click="closeModal" />
        
        <!-- Modal Content -->
        <div class="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div>
                     <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {{ isDuplicateMode ? 'Duplicar servei' : (selectedRecord ? 'Editar servei' : 'Nou servei') }}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ isDuplicateMode ? 'Crea un nou servei a partir de les dades existents' : (selectedRecord ? 'Actualitza les dades del servei seleccionat' : 'Ompli les dades del servei') }}
                    </p>
                </div>
                <UButton icon="i-heroicons-x-mark-20-solid" color="neutral" variant="ghost" @click="closeModal" />
            </div>

            <!-- Body -->
            <div class="p-6">
                 <ServiceForm
                    v-if="selectedRecord || !selectedRecord"
                    :initial-data="selectedRecord"
                    :is-duplicate="isDuplicateMode"
                    @saved="handleSaved"
                />
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
