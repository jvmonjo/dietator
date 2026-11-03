import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRotationsStore } from '../../app/stores/rotations'
import { getRotationActivities, getServices, setServices, openAppDatabase } from '../../app/utils/appDatabase'
import { rotationBalance } from '../../app/utils/rotations'

const people = [{ id: 'a', name: 'Anna' }, { id: 'b', name: 'Bernat' }]
beforeEach(() => setActivePinia(createPinia()))

describe('rotation persistence and editing', () => {
  it('persists activities and entries across store instances without touching services', async () => {
    await setServices([])
    const store = useRotationsStore()
    await store.saveActivity('travel', 'Viatge', people)
    await store.saveEntry('travel', { id: 'first', date: '2026-01-01', personId: 'a' })
    setActivePinia(createPinia())
    const reloaded = useRotationsStore()
    await reloaded.hydrate()
    expect(reloaded.activities[0]?.entries).toHaveLength(1)
    expect(reloaded.activities[0]?.title).toBe('Viatge')
    expect(await getServices()).toEqual([])
  })

  it('corrects entries by ID, permits repeated turns and recalculates after deletion', async () => {
    const store = useRotationsStore()
    await store.saveActivity('travel', 'Viatge', people)
    await store.saveEntry('travel', { id: 'first', date: '2026-01-01', personId: 'a' })
    await store.saveEntry('travel', { id: 'second', date: '2026-01-01', personId: 'a' })
    expect(rotationBalance(store.activities[0]!).map(person => person.owed)).toEqual([0, 2])
    await store.saveEntry('travel', { id: 'first', date: '2026-02-01', personId: 'b' })
    expect(store.activities[0]?.entries).toHaveLength(2)
    expect(rotationBalance(store.activities[0]!).map(person => person.count)).toEqual([1, 1])
    await store.removeEntry('travel', 'second')
    expect(rotationBalance(store.activities[0]!).map(person => person.owed)).toEqual([1, 0])
  })

  it('keeps activities independent and preserves identity when renaming or reordering people', async () => {
    const store = useRotationsStore()
    await store.saveActivity('travel', 'Viatge', people)
    await store.saveActivity('summer', 'Vacances Estiu', people)
    await store.saveEntry('travel', { id: 'first', date: '2026-01-01', personId: 'a' })
    await store.saveActivity('travel', 'Viatges', [people[1]!, { id: 'a', name: 'Anna Maria' }])
    expect(rotationBalance(store.activities[0]!)[1]).toMatchObject({ name: 'Anna Maria', count: 1 })
    expect(store.activities[1]?.entries).toEqual([])
  })

  it('refuses to remove a person with history and leaves persisted data unchanged', async () => {
    const store = useRotationsStore()
    await store.saveActivity('travel', 'Viatge', [...people, { id: 'c', name: 'Carme' }])
    await store.saveEntry('travel', { id: 'first', date: '2026-01-01', personId: 'a' })
    await expect(store.saveActivity('travel', 'Viatge', [people[1]!, { id: 'c', name: 'Carme' }])).rejects.toThrow()
    expect((await getRotationActivities())?.[0]?.people).toHaveLength(3)
  })

  it('merges backup activities by ID and retains unrelated local activities', async () => {
    const store = useRotationsStore()
    await store.saveActivity('travel', 'Viatge', people)
    await store.saveActivity('easter', 'Vacances Pasqua', people)
    await store.restore([{ id: 'travel', title: 'Viatge restaurat', people, entries: [{ id: 'restored', date: '2026-01-01', personId: 'b' }] }])
    expect(store.activities.map(activity => activity.id)).toEqual(['easter', 'travel'])
    expect(store.activities[1]?.entries[0]?.personId).toBe('b')
    await expect(store.restore([{ id: 'broken' }])).rejects.toThrow()
    expect(store.activities).toHaveLength(2)
  })

  it('leaves the displayed history unchanged when IndexedDB fails to save', async () => {
    const store = useRotationsStore()
    await store.saveActivity('travel', 'Viatge', people)
    const database = await openAppDatabase()
    const transaction = vi.spyOn(database, 'transaction').mockImplementation(() => { throw new Error('disk full') })
    try {
      await expect(store.saveEntry('travel', { id: 'first', date: '2026-01-01', personId: 'a' })).rejects.toThrow('disk full')
      expect(store.activities[0]?.entries).toEqual([])
    } finally { transaction.mockRestore() }
  })
})
