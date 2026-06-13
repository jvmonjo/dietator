import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Pin a deterministic timezone for the whole suite. The app stores timestamps
// in UTC but interprets them in the user's local wall-clock (getHours/getMonth/
// toDateString in useServiceWarnings and the services store), so date-sensitive
// tests are written against Europe/Madrid — the app's primary (ca-ES / Spain)
// audience. The `test` npm scripts set TZ via cross-env (which V8 reads at
// startup); this guard covers a bare `npx vitest` invocation. Must run before
// any Date is constructed.
process.env.TZ = process.env.TZ || 'Europe/Madrid'

// Plain Vitest setup (no Nuxt runtime) so unit tests stay fast, hermetic and
// network-free in CI. The default environment is `node`; tests that need a DOM
// opt in with a `// @vitest-environment happy-dom` docblock. The `~` / `@`
// aliases mirror Nuxt's so source files can be imported as-is.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['app/**/*.ts'],
      exclude: ['app/**/*.d.ts', 'app/**/*.vue']
    }
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url))
    }
  }
})
