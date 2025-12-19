<script setup lang="ts">
import type { MonthOption } from '~/composables/useServiceStats'
import type { ServiceRecord } from '~/stores/services'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  enableEdit?: boolean
  enableDelete?: boolean
}>(), {
  title: 'Serveis registrats',
  description: 'Consulta, edita o esborra els registres existents.',
  enableEdit: true,
  enableDelete: true
})

const emit = defineEmits<{
  (e: 'records-change', payload: { records: ServiceRecord[], month: MonthOption | null }): void
}>()

const serviceStore = useServiceStore()
const toast = useToast()
const { records } = storeToRefs(serviceStore)
const { monthOptions, getRecordsForMonth, currentMonthValue } = useServiceStats()

const monthFormatter = new Intl.DateTimeFormat('ca-ES', { year: 'numeric', month: 'long' })
const extendedMonthOptions = computed<MonthOption[]>(() => {
  const options = monthOptions.value.slice()
  const hasCurrent = options.some(option => option.value === currentMonthValue.value)
  if (!hasCurrent && currentMonthValue.value) {
    const [yearStr, monthStr] = currentMonthValue.value.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (Number.isFinite(year) && Number.isFinite(month)) {
      const fallbackDate = new Date(year, month - 1, 1)
      options.push({
        value: currentMonthValue.value,
        label: monthFormatter.format(fallbackDate)
      })
    }
  }
  return options.sort((a, b) => (a.value < b.value ? 1 : -1))
})

const selectedMonth = ref<MonthOption | undefined>()
const showAllMonths = ref(false)
watch(extendedMonthOptions, (options) => {
  if (!showAllMonths.value && !selectedMonth.value) {
    selectedMonth.value = options.find(option => option.value === currentMonthValue.value) ?? options[0]
  }
}, { immediate: true })

const activeMonth = computed<MonthOption | null>(() => {
  if (showAllMonths.value) {
    return null
  }
  if (!selectedMonth.value) {
    return extendedMonthOptions.value.find(option => option.value === currentMonthValue.value) ?? null
  }
  return selectedMonth.value
})

const filteredRecords = computed(() => {
  const month = activeMonth.value
  return getRecordsForMonth(month?.value ?? null)
})

watch([filteredRecords, activeMonth], ([records]) => {
  emit('records-change', {
    records,
    month: activeMonth.value
  })
}, { immediate: true })

const recordCount = computed(() => filteredRecords.value.length)
const hasRecords = computed(() => recordCount.value > 0)
const tableData = computed(() => {
  return filteredRecords.value.slice().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
})
const selectedMonthLabel = computed(() => {
  if (showAllMonths.value) {
    return 'Tots els mesos'
  }
  return activeMonth.value?.label ?? ''
})

const handleMonthChange = (value: MonthOption | null | undefined) => {
  if (!value) {
    showAllMonths.value = true
    selectedMonth.value = undefined
  } else {
    showAllMonths.value = false
    selectedMonth.value = value
  }
}

const isModalOpen = ref(false)
const selectedRecord = ref<ServiceRecord | null>(null)
const isDuplicateMode = ref(false)

const columns = [
  { accessorKey: 'startTime', id: 'startTime', header: 'Inici' },
  { accessorKey: 'endTime', id: 'endTime', header: 'Fi' },
  { accessorKey: 'displacements', id: 'displacements', header: 'Desplaçaments' },
  { accessorKey: 'actions', id: 'actions', header: 'Accions' }
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

const confirmDelete = (id: string) => {
  if (confirm('Segur que vols eliminar aquest servei?')) {
    serviceStore.deleteRecord(id)
    toast.add({ title: 'Servei eliminat', color: 'success' })
  }
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
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ props.title }}</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ props.description }}</p>
        <p class="text-xs text-gray-400 mt-1">
          Filtrat per {{ selectedMonthLabel }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <UInputMenu
          :model-value="showAllMonths ? undefined : selectedMonth"
          :items="extendedMonthOptions"
          placeholder="Selecciona un mes"
          clearable
          class="min-w-[200px]"
          @update:model-value="handleMonthChange"
        />
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          variant="solid"
          @click="openNewService"
        >
          Afegir servei
        </UButton>
        <UBadge color="primary" variant="soft">{{ recordCount }} registres</UBadge>
      </div>
    </div>

    <UCard>
      <div v-if="!hasRecords" class="py-10 text-center text-gray-500 dark:text-gray-400">
        Encara no hi ha serveis registrats.
      </div>
      <UTable
        v-else
        :data="tableData"
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
            <UButton
              v-if="props.enableEdit"
              icon="i-heroicons-pencil-square"
              size="xs"
              variant="soft"
              @click="openRecord(row.original as ServiceRecord)"
            >
              Editar
            </UButton>
             <UButton
              icon="i-heroicons-document-duplicate"
              size="xs"
              variant="soft"
              color="neutral"
              @click="duplicateRecord(row.original as ServiceRecord)"
            >
              Duplicar
            </UButton>
            <UButton
              v-if="props.enableDelete"
              icon="i-heroicons-trash"
              size="xs"
              color="error"
              variant="ghost"
              @click="confirmDelete((row.original as ServiceRecord).id)"
            >
              Eliminar
            </UButton>
          </div>
        </template>
      </UTable>
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
      
  </section>
</template>
