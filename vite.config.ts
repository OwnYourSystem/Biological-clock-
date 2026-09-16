import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest, not generateSW, because the service worker carries the
      // reminder logic: it has to read IndexedDB and answer a periodicsync.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
      manifest: {
        name: 'Health Log',
        short_name: 'Health Log',
        description: 'A private daily log. Not a monitor.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/#/today',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Log an episode',
            short_name: 'Episode',
            description: 'Timestamp an arrhythmia episode now',
            url: '/#/episode',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
