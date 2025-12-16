// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  ssr: false,

  modules: [
    '@nuxt/ui',
    '@vite-pwa/nuxt',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxt/eslint'
  ],

  spaLoadingTemplate: 'spa-loading-template.html',

  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      link: [
        { rel: 'icon', type: 'image/png', sizes: '196x196', href: (process.env.NUXT_APP_BASE_URL || '/') + 'favicon-196.png' },
        { rel: 'apple-touch-icon', href: (process.env.NUXT_APP_BASE_URL || '/') + 'apple-icon-180.png' }
      ],
      meta: [
        { name: 'msapplication-square70x70logo', content: (process.env.NUXT_APP_BASE_URL || '/') + 'mstile-icon-128.png' },
        { name: 'msapplication-square150x150logo', content: (process.env.NUXT_APP_BASE_URL || '/') + 'mstile-icon-270.png' },
        { name: 'msapplication-square310x310logo', content: (process.env.NUXT_APP_BASE_URL || '/') + 'mstile-icon-558.png' },
        { name: 'msapplication-wide310x150logo', content: (process.env.NUXT_APP_BASE_URL || '/') + 'mstile-icon-558-270.png' }
      ]
    }
  },

  css: ['./app/assets/css/main.css'],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Dietator',
      short_name: 'Dietator',
      theme_color: '#f5dc00ff',
      icons: [
        {
          src: (process.env.NUXT_APP_BASE_URL || '/') + 'manifest-icon-192.maskable.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: (process.env.NUXT_APP_BASE_URL || '/') + 'manifest-icon-192.maskable.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: (process.env.NUXT_APP_BASE_URL || '/') + 'manifest-icon-512.maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: (process.env.NUXT_APP_BASE_URL || '/') + 'manifest-icon-512.maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
      suppressWarnings: true,
      navigateFallback: '/',
      type: 'module',
    },
  }
})
