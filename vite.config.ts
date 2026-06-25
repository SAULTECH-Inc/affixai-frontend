import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate' = service worker silently swaps the cached app shell
      // when a new build deploys. We could prompt the user with a toast
      // but auto-update keeps the surface area smaller; users who haven't
      // touched the tab in a while just get the new version on next load.
      registerType: 'autoUpdate',

      // Inject the SW registration code into our existing entry instead of
      // generating a separate <script>. Cleaner; one fewer network request.
      injectRegister: 'auto',

      // Files copied directly into the precache manifest. Keep this list
      // tight — every byte here lands on every visitor's device.
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon.png',
        'robots.txt',
        'sitemap.xml',
        'og-default.png',
      ],

      // The manifest. Replaces public/site.webmanifest at build time —
      // vite-plugin-pwa writes manifest.webmanifest into dist/ and updates
      // the <link rel="manifest"> reference automatically.
      manifest: {
        name: 'AffixAI',
        short_name: 'AffixAI',
        description: 'Auto-sign any PDF from your encrypted vault.',
        start_url: '/dashboard',
        // 'standalone' = installed app gets its own window without
        // browser chrome. 'minimal-ui' would keep the back/forward
        // buttons; we don't need them since we have in-app nav.
        display: 'standalone',
        background_color: '#0f1219',
        theme_color: '#0f1219',
        orientation: 'portrait',
        // Categories show up in the Chrome PWA install dialog on desktop
        // and in some app stores' web-app indexes.
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            // Maskable icon for Android adaptive-icon shapes (circle,
            // squircle, teardrop). Different file because the "safe
            // zone" inside a maskable icon is smaller — full-bleed
            // icons would get their corners chopped.
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // Shortcuts appear on long-press of the installed app icon
        // (Android) or right-click on Windows. Give power users 1-click
        // access to the most common actions.
        shortcuts: [
          {
            name: 'Auto-sign a document',
            short_name: 'Auto-sign',
            description: 'Drop in a PDF and auto-fill from your vault',
            url: '/auto-sign',
          },
          {
            name: 'Data Vault',
            short_name: 'Vault',
            description: 'Manage your saved data',
            url: '/data-vault',
          },
          {
            name: 'Documents',
            short_name: 'Docs',
            description: 'All your signed and pending documents',
            url: '/documents',
          },
        ],
      },

      // Workbox config — controls what gets precached and how dynamic
      // requests behave. Defaults are sensible; we override a few:
      workbox: {
        // Files matching this glob are precached at install time. Keep
        // it focused on the app shell — fonts / images / app code.
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
        // Don't precache giant assets — they'd inflate the install size.
        maximumFileSizeToCacheInBytes: 3_000_000,
        // SPA fallback: any nav request that isn't a static asset goes
        // to index.html (so deep-link refreshes work offline).
        navigateFallback: '/index.html',
        // Skip the SW for API + auth-walled routes — we never want a
        // stale auth response served from cache.
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        // Runtime caching: small in-flight cache for fonts + OG images so
        // they don't re-fetch on every nav. The vault / API calls are
        // NEVER cached — they should never be served stale.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/og.*\.png$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'og-images' },
          },
        ],
      },

      // Dev-mode SW. Off by default — running a service worker in dev
      // wreaks havoc on HMR. Turn this on to debug the install/update
      // flow locally.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
