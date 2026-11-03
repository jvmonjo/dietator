import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getRotationActivities, setRotationActivities } from '~/utils/appDatabase'
import { validateRotations, type RotationActivity, type RotationEntry, type RotationPerson } from '~/utils/rotations'

export const useRotationsStore = defineStore('rotations', () => {
  const activities = ref<RotationActivity[]>([])
  const ready = ref(false)
  const saving = ref(false)
  let loading: Promise<void> | null = null

  async function hydrate() {
    if (ready.value) return
    if (!loading) loading = (async () => {
      const saved = await getRotationActivities() ?? []
      validateRotations(saved)
      activities.value = saved
      ready.value = true
    })().finally(() => { loading = null })
    await loading
  }

  async function persist(change: (current: RotationActivity[]) => RotationActivity[]) {
    await hydrate()
    if (saving.value) throw new Error('rotationBusy')
    saving.value = true
    try {
      const next = JSON.parse(JSON.stringify(change(activities.value))) as RotationActivity[]
      validateRotations(next)
      // Commit to IndexedDB before changing the displayed balance.
      await setRotationActivities(next)
      activities.value = next
    } finally { saving.value = false }
  }

  async function saveActivity(id: string, title: string, people: RotationPerson[]) {
    await persist(current => {
      const previous = current.find(activity => activity.id === id)
      const activity = { id, title: title.trim(), people: people.map(person => ({ ...person, name: person.name.trim() })), entries: previous?.entries ?? [] }
      return previous ? current.map(item => item.id === id ? activity : item) : [...current, activity]
    })
  }

  async function saveEntry(activityId: string, entry: RotationEntry) {
    await persist(current => {
      if (!current.some(activity => activity.id === activityId)) throw new Error('invalidRotation')
      return current.map(activity => activity.id === activityId ? {
        ...activity,
        entries: activity.entries.some(item => item.id === entry.id)
          ? activity.entries.map(item => item.id === entry.id ? entry : item)
          : [...activity.entries, entry]
      } : activity)
    })
  }

  async function removeEntry(activityId: string, entryId: string) {
    await persist(current => current.map(activity => activity.id === activityId
      ? { ...activity, entries: activity.entries.filter(entry => entry.id !== entryId) } : activity))
  }

  async function restore(snapshot: unknown) {
    validateRotations(snapshot)
    await persist(current => [...current.filter(activity => !snapshot.some(item => item.id === activity.id)), ...snapshot])
  }

  return { activities, ready, saving, hydrate, saveActivity, saveEntry, removeEntry, restore }
})
