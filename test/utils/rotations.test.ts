import { describe, expect, it } from 'vitest'
import { nextRotationQueue, rotationBalance, validateRotations, type RotationActivity } from '../../app/utils/rotations'

function activity(counts: number[]): RotationActivity {
  const people = counts.map((_, index) => ({ id: String(index), name: ['Anna', 'Bernat', 'Carme'][index]! }))
  return { id: 'travel', title: 'Viatge', people, entries: counts.flatMap((count, index) =>
    Array.from({ length: count }, (_, n) => ({ id: `${index}-${n}`, date: '2026-01-01', personId: String(index) }))) }
}

describe('fair rotation balance', () => {
  it('starts with the configured order and does not mutate the history', () => {
    const data = activity([0, 0, 0])
    expect(nextRotationQueue(data).map(person => person.name)).toEqual(['Anna', 'Bernat', 'Carme'])
    expect(data.entries).toEqual([])
  })

  it('allows repeated assignments and shows the other person catching up', () => {
    const data = activity([3, 0])
    expect(rotationBalance(data).map(person => person.owed)).toEqual([0, 3])
    expect(nextRotationQueue(data).map(person => person.name)).toEqual(['Bernat', 'Bernat', 'Bernat'])
  })

  it('balances three people using counts and configured tie order', () => {
    const data = activity([3, 0, 1])
    expect(rotationBalance(data).map(person => person.owed)).toEqual([0, 3, 2])
    expect(nextRotationQueue(data).map(person => person.name)).toEqual(['Bernat', 'Bernat', 'Carme', 'Bernat', 'Carme'])
  })

  it('begins another round when all counts are equal', () => {
    expect(nextRotationQueue(activity([2, 2])).map(person => person.name)).toEqual(['Anna', 'Bernat'])
  })

  it('caps the queue preview but preserves the complete debt counts', () => {
    const data = activity([100, 0])
    expect(nextRotationQueue(data)).toHaveLength(12)
    expect(rotationBalance(data)[1]?.owed).toBe(100)
  })

  it('recalculates after corrections or deletions regardless of entry dates', () => {
    const data = activity([2, 0])
    data.entries[0]!.personId = '1'
    data.entries[0]!.date = '2027-01-01'
    expect(rotationBalance(data).map(person => person.count)).toEqual([1, 1])
    data.entries.pop()
    expect(nextRotationQueue(data)[0]?.name).toBe('Anna')
  })

  it('rejects malformed imports, orphan entries, duplicate people and impossible dates', () => {
    const data = activity([1, 0])
    expect(() => validateRotations([data])).not.toThrow()
    expect(() => validateRotations([data, data])).toThrow('invalidRotation')
    expect(() => validateRotations([{ ...data, people: [data.people[0]] }])).toThrow()
    expect(() => validateRotations([{ ...data, people: [data.people[0], { id: 'new', name: ' ANNA ' }] }])).toThrow()
    expect(() => validateRotations([{ ...data, entries: [{ id: 'bad', date: '2026-02-30', personId: '0' }] }])).toThrow()
    expect(() => validateRotations([{ ...data, entries: [{ id: 'bad', date: '2026-02-01', personId: 'missing' }] }])).toThrow()
  })
})
