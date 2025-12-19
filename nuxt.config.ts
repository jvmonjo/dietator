// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  runtimeConfig: {
    public: {
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || 'dev'
    }
  },
  devtools: { enabled: true },
  ssr: false,

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/png', sizes: '196x196', href: 'favicon-196.png' },
        { rel: 'icon', type: 'image/x-icon', href: 'favicon.ico' },
        { rel: 'apple-touch-icon', href: 'apple-icon-180.png' },
        { rel: 'manifest', href: 'manifest.webmanifest' }
      ],
      meta: [
        { name: 'msapplication-square70x70logo', content: 'mstile-icon-128.png' },
        { name: 'msapplication-square150x150logo', content: 'mstile-icon-270.png' },
        { name: 'msapplication-square310x310logo', content: 'mstile-icon-558.png' },
        { name: 'msapplication-wide310x150logo', content: 'mstile-icon-558-270.png' }
      ]
    }
  },

  css: ['./app/assets/css/main.css'],

  modules: [
    '@nuxt/ui',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@vite-pwa/nuxt',
    '@nuxt/eslint'
  ],

  nitro: {
    preset: 'github-pages',
    debug: process.env.NUXT_DEBUG === '1'
  },

  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Dietator',
      short_name: 'Dietator',
      background_color: '#f5dc00',
      theme_color: '#f5dc00',
      display: 'standalone',
      icons: [
        {
          src: 'manifest-icon-192.maskable.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'manifest-icon-192.maskable.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: 'manifest-icon-512.maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'manifest-icon-512.maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      screenshots: [
        {
          src: 'pwa-screenshots/mobile.png',
          sizes: '375x667',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'Mobile'
        },
        {
          src: 'pwa-screenshots/desktop.png',
          sizes: '1152x648',
          type: 'image/png',
          form_factor: 'wide',
          label: 'Desktop'
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
