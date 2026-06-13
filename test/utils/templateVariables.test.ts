import { describe, expect, it } from 'vitest'
import {
  displacementVariables,
  globalVariables,
  loops,
  monthlyVariables,
  serviceVariables
} from '../../app/utils/templateVariables'

const allGroups = {
  globalVariables,
  monthlyVariables,
  serviceVariables,
  displacementVariables,
  loops
}

describe('templateVariables catalog', () => {
  it('every variable group is a non-empty list of { name, desc }', () => {
    for (const [groupName, group] of Object.entries(allGroups)) {
      expect(group.length, `${groupName} should not be empty`).toBeGreaterThan(0)
      for (const entry of group) {
        expect(typeof entry.name, `${groupName} entry name`).toBe('string')
        expect(entry.name.length).toBeGreaterThan(0)
        expect(typeof entry.desc, `${groupName} entry desc`).toBe('string')
        expect(entry.desc.length).toBeGreaterThan(0)
      }
    }
  })

  it('variable placeholders are wrapped in square brackets', () => {
    const simpleVarGroups = [globalVariables, monthlyVariables]
    for (const group of simpleVarGroups) {
      for (const entry of group) {
        expect(entry.name.startsWith('[')).toBe(true)
        expect(entry.name).toContain(']')
      }
    }
  })

  it('has no duplicate variable names within a group', () => {
    for (const [groupName, group] of Object.entries(allGroups)) {
      const names = group.map(e => e.name)
      expect(new Set(names).size, `${groupName} has duplicates`).toBe(names.length)
    }
  })
})
