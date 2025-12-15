<script setup lang="ts">
import type { ServiceRecord } from '~/stores/services'

const serviceStore = useServiceStore()
const toast = useToast()
const { records } = storeToRefs(serviceStore)
const recordCount = computed(() => records.value.length)
const hasRecords = computed(() => recordCount.value > 0)
const tableData = computed(() => records.value.slice())

const isModalOpen = ref(false)
const selectedRecord = ref<ServiceRecord | null>(null)

const columns = [
  { accessorKey: 'startTime', id: 'startTime', header: 'Inici' },
  { accessorKey: 'endTime', id: 'endTime', header: 'Fi' },
  { accessorKey: 'displacements', id: 'displacements', header: 'Desplaçaments' },
  { accessorKey: 'actions', id: 'actions', header: 'Accions' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[]

const openRecord = (record: ServiceRecord) => {
  selectedRecord.value = record
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedRecord.value = null
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
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Serveis registrats</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Consulta, edita o esborra els registres existents.</p>
      </div>
      <UBadge color="primary" variant="soft">{{ recordCount }} registres</UBadge>
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
          {{ formatDate((row.original as ServiceRecord).startTime) }}
        </template>
        <template #endTime-cell="{ row }">
          {{ formatDate((row.original as ServiceRecord).endTime) }}
        </template>
        <template #displacements-cell="{ row }">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            <p v-for="displacement in (row.original as ServiceRecord).displacements" :key="displacement.id">
              {{ displacement.province }} - {{ displacement.municipality }}
              <span class="text-xs text-gray-500 dark:text-gray-400">
                ({{ displacement.hasLunch ? 'Dinar' : '' }}{{ displacement.hasLunch && displacement.hasDinner ? ' · ' : '' }}{{ displacement.hasDinner ? 'Sopar' : '' }})
              </span>
            </p>
          </div>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton
              icon="i-heroicons-pencil-square"
              size="xs"
              variant="soft"
              @click="openRecord(row.original as ServiceRecord)"
            >
              Editar
            </UButton>
            <UButton
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

    <UModal v-model="isModalOpen" @close="closeModal">
      <div class="max-w-3xl">
        <ServiceForm v-if="selectedRecord" :initial-data="selectedRecord" @saved="handleSaved" />
      </div>
    </UModal>
  </section>
</template>
