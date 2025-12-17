const normalizeBaseURL = (value?: string) => {
  if (!value) { return '/' }
  let base = value.startsWith('/') ? value : `/${value}`
  if (!base.endsWith('/')) {
    base = `${base}/`
  }
  return base
}

const appBaseURL = normalizeBaseURL(process.env.NUXT_APP_BASE_URL)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  ssr: false,

  spaLoadingTemplate: 'spa-loading-template.html',

  app: {
    baseURL: appBaseURL,
    head: {
      link: [
        { rel: 'icon', type: 'image/png', sizes: '196x196', href: appBaseURL + 'favicon-196.png' },
        { rel: 'icon', type: 'image/x-icon', href: appBaseURL + 'favicon.ico' },
        { rel: 'apple-touch-icon', href: appBaseURL + 'apple-icon-180.png' },
        { rel: 'manifest', href: appBaseURL + 'manifest.webmanifest' }
      ],
      meta: [
        { name: 'msapplication-square70x70logo', content: appBaseURL + 'mstile-icon-128.png' },
        { name: 'msapplication-square150x150logo', content: appBaseURL + 'mstile-icon-270.png' },
        { name: 'msapplication-square310x310logo', content: appBaseURL + 'mstile-icon-558.png' },
        { name: 'msapplication-wide310x150logo', content: appBaseURL + 'mstile-icon-558-270.png' }
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
    base: appBaseURL,
    scope: appBaseURL,
    registerType: 'autoUpdate',
    manifest: {
      name: 'Dietator',
      short_name: 'Dietator',
      background_color: '#f5dc00ff',
      theme_color: '#f5dc00ff',
      display: 'standalone',
      scope: appBaseURL,
      start_url: appBaseURL,
      icons: [
        {
          src: appBaseURL + 'manifest-icon-192.maskable.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: appBaseURL + 'manifest-icon-192.maskable.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: appBaseURL + 'manifest-icon-512.maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: appBaseURL + 'manifest-icon-512.maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: appBaseURL,
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
      suppressWarnings: true,
      navigateFallback: appBaseURL,
      type: 'module',
    },
  }
})
