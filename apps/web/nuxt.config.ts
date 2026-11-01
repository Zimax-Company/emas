// Server-rendered Vue (Nuxt SSR). The browser never sees the API token:
// it lives in an httpOnly cookie and requests go through server/api/proxy.
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  ssr: true,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    apiUrl: 'http://localhost:4000', // override with NUXT_API_URL
  },
  app: {
    head: {
      title: 'EMAS — Estate Management',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
})
