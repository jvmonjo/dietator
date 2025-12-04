<script setup lang="ts">
const serviceStore = useServiceStore()
const { records } = storeToRefs(serviceStore)

const columns = [
  { key: 'startTime', label: 'Start Time' },
  { key: 'endTime', label: 'End Time' },
  { key: 'displacements', label: 'Displacements' },
  { key: 'diets', label: 'Diets' },
  { key: 'actions' }
]

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString()
}

const getDiets = (displacements: Displacement[]) => {
  const lunches = displacements.filter(d => d.hasLunch).length
  const dinners = displacements.filter(d => d.hasDinner).length
  return `L: ${lunches}, D: ${dinners}`
}

const deleteRecord = (id: string) => {
  if (confirm('Are you sure you want to delete this record?')) {
    serviceStore.deleteRecord(id)
  }
}

const exportData = async () => {
  // TODO: Implement export
  await generateWordReport(records.value)
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Service Records</h1>
      <div class="flex gap-4">
        <UButton to="/" icon="i-heroicons-arrow-left" variant="ghost">Back to Form</UButton>
        <UButton icon="i-heroicons-document-arrow-down" color="green" @click="exportData">Export Report</UButton>
      </div>
    </div>

    <UCard>
      <UTable :rows="records" :columns="columns">
        <template #startTime-data="{ row }">
          {{ formatDate(row.startTime) }}
        </template>
        <template #endTime-data="{ row }">
          {{ formatDate(row.endTime) }}
        </template>
        <template #displacements-data="{ row }">
          <ul class="list-disc list-inside text-sm">
            <li v-for="d in row.displacements" :key="d.id">
              {{ d.municipality }}
            </li>
          </ul>
        </template>
        <template #diets-data="{ row }">
          {{ getDiets(row.displacements) }}
        </template>
        <template #actions-data="{ row }">
          <UButton icon="i-heroicons-trash" color="red" variant="ghost" size="xs" @click="deleteRecord(row.id)" />
        </template>
      </UTable>

      <div v-if="records.length === 0" class="text-center py-8 text-gray-500">
        No records found.
      </div>
    </UCard>
  </div>
</template>
