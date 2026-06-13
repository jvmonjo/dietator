import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

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
