<script setup lang="ts">
import { nextRotationQueue, rotationBalance, type RotationEntry, type RotationPerson } from '~/utils/rotations'

const { t } = useI18n()
const store = useRotationsStore()
const selectedId = ref('')
const error = ref('')
const editingActivity = ref(false)
const activityId = ref('')
const activityTitle = ref('')
const people = ref<RotationPerson[]>([])
const entryId = ref('')
const entryDate = ref('')
const entryPerson = ref('')
const active = computed(() => store.activities.find(activity => activity.id === selectedId.value))
const activityOptions = computed(() => store.activities.map(activity => ({ label: activity.title, value: activity.id })))
const personOptions = computed(() => active.value?.people.map(person => ({ label: person.name, value: person.id })) ?? [])
const balance = computed(() => active.value ? rotationBalance(active.value) : [])
const queue = computed(() => active.value ? nextRotationQueue(active.value) : [])
const totalOwed = computed(() => balance.value.reduce((total, person) => total + person.owed, 0))
const history = computed(() => [...(active.value?.entries ?? [])].reverse().sort((a, b) => b.date.localeCompare(a.date)))
const personName = (id: string) => active.value?.people.find(person => person.id === id)?.name ?? ''

function resetEntry() {
  entryId.value = ''
  const today = new Date()
  entryDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  entryPerson.value = queue.value[0]?.id || ''
}
watch(selectedId, () => { editingActivity.value = false; error.value = ''; resetEntry() })

async function load() {
  error.value = ''
  try {
    await store.hydrate()
    selectedId.value = store.activities[0]?.id || ''
    resetEntry()
  } catch { error.value = t('rotations.loadFailed') }
}
onMounted(load)

function openActivity(edit = false) {
  error.value = ''
  activityId.value = edit && active.value ? active.value.id : crypto.randomUUID()
  activityTitle.value = edit && active.value ? active.value.title : ''
  people.value = edit && active.value
    ? active.value.people.map(person => ({ ...person }))
    : [{ id: crypto.randomUUID(), name: '' }, { id: crypto.randomUUID(), name: '' }]
  editingActivity.value = true
}
function addPerson() { people.value.push({ id: crypto.randomUUID(), name: '' }) }
function moveUp(index: number) {
  const person = people.value[index]
  const previous = people.value[index - 1]
  if (person && previous) { people.value[index - 1] = person; people.value[index] = previous }
}
function hasHistory(personId: string) {
  return store.activities.find(activity => activity.id === activityId.value)?.entries.some(entry => entry.personId === personId)
}
async function saveActivity() {
  error.value = ''
  try {
    await store.saveActivity(activityId.value, activityTitle.value, people.value)
    selectedId.value = activityId.value
    editingActivity.value = false
    resetEntry()
  } catch { error.value = t('rotations.saveFailed') }
}
async function saveEntry() {
  if (!active.value) return
  error.value = ''
  try {
    await store.saveEntry(active.value.id, { id: entryId.value || crypto.randomUUID(), date: entryDate.value, personId: entryPerson.value })
    resetEntry()
  } catch { error.value = t('rotations.saveFailed') }
}
function editEntry(entry: RotationEntry) {
  entryId.value = entry.id
  entryDate.value = entry.date
  entryPerson.value = entry.personId
}
async function removeEntry(entry: RotationEntry) {
  if (!active.value || !window.confirm(t('rotations.confirmDelete', { date: entry.date, person: personName(entry.personId) }))) return
  try {
    await store.removeEntry(active.value.id, entry.id)
    resetEntry()
  } catch { error.value = t('rotations.saveFailed') }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <h1 class="text-2xl font-bold">{{ t('rotations.title') }}</h1>
    <p>{{ t('rotations.description') }}</p>
    <UAlert v-if="error" :title="error" color="error" role="alert" />
    <UButton v-if="!store.ready" @click="load">{{ t('rotations.retry') }}</UButton>
    <template v-else>
      <div class="flex flex-wrap gap-3 items-end">
        <UFormField v-if="activityOptions.length" :label="t('rotations.activity')">
          <USelect v-model="selectedId" :items="activityOptions" :disabled="store.saving" class="min-w-48" />
        </UFormField>
        <UButton :disabled="store.saving" @click="openActivity()">{{ t('rotations.newActivity') }}</UButton>
        <UButton v-if="active" :disabled="store.saving" variant="soft" @click="openActivity(true)">{{ t('rotations.editActivity') }}</UButton>
      </div>
      <UCard v-if="editingActivity">
        <form class="space-y-4" @submit.prevent="saveActivity">
          <p>{{ t('rotations.editHelp') }}</p>
          <UFormField :label="t('rotations.activityName')">
            <UInput v-model="activityTitle" required :disabled="store.saving" class="w-full" />
          </UFormField>
          <p>{{ t('rotations.peopleOrder') }}</p>
          <div v-for="(person, index) in people" :key="person.id" class="flex gap-2 items-end">
            <UFormField :label="t('rotations.personNumber', { number: index + 1 })" class="flex-1">
              <UInput v-model="person.name" required :disabled="store.saving" class="w-full" />
            </UFormField>
            <UButton variant="soft" :disabled="index === 0 || store.saving" :aria-label="t('rotations.moveUp')" @click="moveUp(index)">↑</UButton>
            <UButton color="error" variant="ghost" :disabled="people.length <= 2 || !!hasHistory(person.id) || store.saving" @click="people.splice(index, 1)">{{ t('rotations.removePerson') }}</UButton>
          </div>
          <p class="text-sm text-gray-500">{{ t('rotations.peopleHelp') }}</p>
          <div class="flex gap-2 flex-wrap">
            <UButton variant="soft" :disabled="store.saving" @click="addPerson">{{ t('rotations.addPerson') }}</UButton>
            <UButton type="submit" :loading="store.saving">{{ t('rotations.saveActivity') }}</UButton>
            <UButton variant="ghost" :disabled="store.saving" @click="editingActivity = false">{{ t('common.cancel') }}</UButton>
          </div>
        </form>
      </UCard>
      <template v-if="active && !editingActivity">
        <UCard>
          <h2 class="text-xl font-semibold">{{ t('rotations.next', { person: queue[0]?.name || '' }) }}</h2>
          <p class="mt-2 text-sm">{{ t('rotations.rule') }}</p>
          <div class="overflow-x-auto mt-4">
            <table class="w-full text-left">
              <thead><tr><th class="p-2">{{ t('rotations.person') }}</th><th class="p-2">{{ t('rotations.count') }}</th><th class="p-2">{{ t('rotations.owed') }}</th></tr></thead>
              <tbody><tr v-for="person in balance" :key="person.id"><td class="p-2">{{ person.name }}</td><td class="p-2">{{ person.count }}</td><td class="p-2">{{ person.owed }}</td></tr></tbody>
            </table>
          </div>
          <p v-if="!totalOwed" class="mt-3">{{ t('rotations.balanced') }}</p>
          <h3 class="font-semibold mt-4">{{ t(totalOwed ? 'rotations.makeUpQueue' : 'rotations.nextCycle') }}</h3>
          <ol class="list-decimal ml-6 mt-2"><li v-for="(person, index) in queue" :key="index">{{ person.name }}</li></ol>
          <p v-if="totalOwed > queue.length" class="text-sm mt-2">{{ t('rotations.queueLimit', { count: queue.length, total: totalOwed }) }}</p>
          <p class="text-sm text-gray-500 mt-2">{{ t('rotations.previewHelp') }}</p>
        </UCard>
        <UCard>
          <template #header><h2 class="font-semibold">{{ t(entryId ? 'rotations.editEntry' : 'rotations.newEntry') }}</h2></template>
          <form class="flex gap-3 flex-wrap items-end" @submit.prevent="saveEntry">
            <UFormField :label="t('rotations.date')"><UInput v-model="entryDate" type="date" required :disabled="store.saving" /></UFormField>
            <UFormField :label="t('rotations.person')"><USelect v-model="entryPerson" :items="personOptions" :disabled="store.saving" /></UFormField>
            <UButton type="submit" :loading="store.saving" :disabled="!entryPerson">{{ t(entryId ? 'rotations.saveEntry' : 'rotations.addEntry') }}</UButton>
            <UButton v-if="entryId" variant="ghost" :disabled="store.saving" @click="resetEntry">{{ t('common.cancel') }}</UButton>
          </form>
          <p class="text-sm mt-3">{{ t('rotations.repeatedHelp') }}</p>
        </UCard>
        <UCard>
          <template #header><h2 class="font-semibold">{{ t('rotations.history') }}</h2></template>
          <p v-if="!history.length">{{ t('rotations.emptyHistory') }}</p>
          <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
            <li v-for="entry in history" :key="entry.id" class="flex flex-wrap gap-3 items-center py-2">
              <time :datetime="entry.date">{{ entry.date }}</time><span class="flex-1">{{ personName(entry.personId) }}</span>
              <UButton variant="ghost" :disabled="store.saving" @click="editEntry(entry)">{{ t('rotations.editEntry') }}</UButton>
              <UButton color="error" variant="ghost" :disabled="store.saving" @click="removeEntry(entry)">{{ t('rotations.deleteEntry') }}</UButton>
            </li>
          </ul>
        </UCard>
      </template>
    </template>
  </div>
</template>
