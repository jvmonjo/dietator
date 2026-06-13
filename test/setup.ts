import { vi } from 'vitest'

// Lightweight shims for the Nuxt auto-imports used by the composables under
// test, so they can run without booting a full Nuxt runtime. `useI18n` returns
// the translation key verbatim, which lets tests assert on stable identifiers
// instead of localized strings.
const globalScope = globalThis as Record<string, unknown>

globalScope.useI18n = () => ({
  t: (key: string) => key
})

// Keep console quiet/inspectable across suites without losing spy ability.
globalScope.vi = vi
