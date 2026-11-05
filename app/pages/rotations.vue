<script setup lang="ts">
import { nextRotationQueue, rotationBalance, rotationQrPages, parseRotationQr, type RotationEntry, type RotationPerson } from '~/utils/rotations'

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
const entryComments = ref('')
const active = computed(() => store.activities.find(activity => activity.id === selectedId.value))
const activityCards = computed(() => store.activities.map(activity => ({
  ...activity, nextPerson: nextRotationQueue(activity, 1)[0]?.name ?? ''
})))
const personOptions = computed(() => active.value?.people.map(person => ({ label: person.name, value: person.id })) ?? [])
const balance = computed(() => active.value ? rotationBalance(active.value) : [])
const queue = computed(() => active.value ? nextRotationQueue(active.value) : [])
const totalOwed = computed(() => balance.value.reduce((total, person) => total + person.owed, 0))
const history = computed(() => [...(active.value?.entries ?? [])].reverse().sort((a, b) => b.date.localeCompare(a.date)))
const personName = (id: string) => active.value?.people.find(person => person.id === id)?.name ?? ''

const scannerOpen = ref(false)
const exportOpen = ref(false)
const qrPages = ref<string[]>([])
const qrPage = ref(0)
const notice = ref('')
const transferMenu = computed(() => [
  { label: t('rotations.importQr'), icon: 'i-heroicons-qr-code', disabled: store.saving, onSelect: () => { scannerOpen.value = true } },
  ...store.activities.map(activity => ({ label: t('rotations.exportQr', { title: activity.title }), icon: 'i-heroicons-arrow-up-tray', onSelect: () => {
    try {
      qrPages.value = rotationQrPages(activity)
      qrPage.value = 0
      exportOpen.value = true
    } catch { error.value = t('rotations.qrTooLarge') }
  } }))
])
async function importQr(raw: string) {
  error.value = ''
  notice.value = ''
  try {
    await store.importActivities(parseRotationQr(raw))
    notice.value = t('rotations.importedQr')
    resetEntry()
  } catch { error.value = t('rotations.invalidQr') }
}

function resetEntry() {
  entryId.value = ''
  entryComments.value = ''
  const today = new Date()
  entryDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  entryPerson.value = queue.value[0]?.id || ''
}
watch(selectedId, () => { editingActivity.value = false; error.value = ''; resetEntry() })

async function load() {
  error.value = ''
  try {
    await store.hydrate()
    selectedId.value = ''
    resetEntry()
  } catch { error.value = t('rotations.loadFailed') }
}
onMounted(load)

function showDashboard() {
  selectedId.value = ''
  editingActivity.value = false
  error.value = ''
  resetEntry()
}
function openDetails(id: string) {
  selectedId.value = id
  editingActivity.value = false
}
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
    await store.saveEntry(active.value.id, { id: entryId.value || crypto.randomUUID(), date: entryDate.value, personId: entryPerson.value, comments: entryComments.value.trim() || undefined })
    resetEntry()
  } catch { error.value = t('rotations.saveFailed') }
}
function editEntry(entry: RotationEntry) {
  entryId.value = entry.id
  entryDate.value = entry.date
  entryPerson.value = entry.personId
  entryComments.value = entry.comments ?? ''
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
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">{{ t('rotations.title') }}</h1>
      <UDropdownMenu v-if="store.ready" :items="transferMenu">
        <UButton icon="i-heroicons-ellipsis-vertical" color="neutral" variant="ghost" :aria-label="t('rotations.transfer')" />
      </UDropdownMenu>
    </div>
    <UAlert v-if="notice" :title="notice" color="success" role="status" />
    <QrScannerModal v-model:open="scannerOpen" :title="t('rotations.importQr')" :description="t('rotations.qrHelp')" @detected="importQr" />
    <QrCodeModal v-model:open="exportOpen" :data="qrPages[qrPage] || ''" :title="t('rotations.transfer')" :description="t('rotations.qrHelp')">
      <template #actions>
        <UButton :disabled="qrPage === 0" :aria-label="t('rotations.previousQr')" @click="qrPage--">←</UButton>
        <span>{{ qrPage + 1 }} / {{ qrPages.length }}</span>
        <UButton :disabled="qrPage >= qrPages.length - 1" :aria-label="t('rotations.nextQr')" @click="qrPage++">→</UButton>
      </template>
    </QrCodeModal>
    <p>{{ t('rotations.description') }}</p>
    <UAlert v-if="error" :title="error" color="error" role="alert" />
    <UButton v-if="!store.ready" @click="load">{{ t('rotations.retry') }}</UButton>
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div v-if="active" class="flex flex-wrap items-center gap-3 min-w-0">
          <UButton icon="i-heroicons-arrow-left" :disabled="store.saving" variant="ghost" @click="showDashboard">{{ t('rotations.backToActivities') }}</UButton>
          <h2 class="text-xl font-semibold break-words [overflow-wrap:anywhere]">{{ active.title }}</h2>
        </div>
        <UButton v-if="!active && !editingActivity" :disabled="store.saving" icon="i-heroicons-plus" @click="openActivity()">{{ t('rotations.newActivity') }}</UButton>
        <UButton v-if="active && !editingActivity" :disabled="store.saving" variant="soft" @click="openActivity(true)">{{ t('rotations.editActivity') }}</UButton>
      </div>
      <section v-if="!active && !editingActivity" :aria-label="t('rotations.title')" class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-300">{{ t('rotations.dashboardHelp') }}</p>
        <UCard v-if="!activityCards.length"><p>{{ t('rotations.emptyActivities') }}</p></UCard>
        <div v-else class="grid gap-4 sm:grid-cols-2">
          <button
            v-for="activity in activityCards" :key="activity.id" type="button"
            :aria-label="t('rotations.openDetails', { activity: activity.title })" :disabled="store.saving"
            class="group min-w-0 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-left transition hover:border-primary-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500 disabled:opacity-50"
            @click="openDetails(activity.id)"
          >
            <span class="flex items-start justify-between gap-3">
              <span class="text-xl font-semibold break-words [overflow-wrap:anywhere]">{{ activity.title }}</span>
              <UIcon name="i-heroicons-arrow-right" class="size-5 shrink-0 text-gray-400 group-hover:text-primary-500" />
            </span>
            <span class="block mt-6 text-sm text-gray-500 dark:text-gray-400">{{ t('rotations.nextTurn') }}</span>
            <span class="block mt-1 text-3xl font-semibold break-words [overflow-wrap:anywhere]">{{ activity.nextPerson }}</span>
            <span class="flex flex-wrap gap-x-4 gap-y-1 mt-6 text-sm text-gray-600 dark:text-gray-300">
              <span>{{ t('rotations.cardPeople', { count: activity.people.length }) }}</span>
              <span>{{ t('rotations.cardEntries', { count: activity.entries.length }) }}</span>
            </span>
          </button>
        </div>
      </section>
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
          <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="saveEntry">
            <UFormField :label="t('rotations.date')"><UInput v-model="entryDate" type="date" required :disabled="store.saving" class="w-full" /></UFormField>
            <UFormField :label="t('rotations.person')"><USelect v-model="entryPerson" :items="personOptions" :disabled="store.saving" class="w-full" /></UFormField>
            <UFormField :label="t('rotations.comments')" class="sm:col-span-2">
              <UTextarea v-model="entryComments" :disabled="store.saving" class="w-full" />
            </UFormField>
            <div class="flex flex-wrap gap-2 sm:col-span-2">
              <UButton type="submit" :loading="store.saving" :disabled="!entryPerson">{{ t(entryId ? 'rotations.saveEntry' : 'rotations.addEntry') }}</UButton>
              <UButton v-if="entryId" variant="ghost" :disabled="store.saving" @click="resetEntry">{{ t('common.cancel') }}</UButton>
            </div>
          </form>
          <p class="text-sm mt-3">{{ t('rotations.repeatedHelp') }}</p>
        </UCard>
        <UCard>
          <template #header><h2 class="font-semibold">{{ t('rotations.history') }}</h2></template>
          <p v-if="!history.length">{{ t('rotations.emptyHistory') }}</p>
          <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
            <li v-for="entry in history" :key="entry.id" class="py-3 space-y-2">
              <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
                <div class="min-w-0 sm:contents">
                  <time :datetime="entry.date" class="block whitespace-nowrap tabular-nums">{{ entry.date }}</time>
                  <span class="block min-w-0 break-words [overflow-wrap:anywhere]">{{ personName(entry.personId) }}</span>
                </div>
                <div class="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                  <UButton variant="ghost" :disabled="store.saving" class="whitespace-nowrap" @click="editEntry(entry)">{{ t('rotations.editEntry') }}</UButton>
                  <UButton color="error" variant="ghost" :disabled="store.saving" class="whitespace-nowrap" @click="removeEntry(entry)">{{ t('rotations.deleteEntry') }}</UButton>
                </div>
              </div>
              <p v-if="entry.comments" class="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm text-gray-600 dark:text-gray-300 sm:pl-[7.75rem]">{{ entry.comments }}</p>
            </li>
          </ul>
        </UCard>
      </template>
    </template>
  </div>
</template>
