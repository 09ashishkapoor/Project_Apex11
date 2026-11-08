import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered explicitly in main.tsx so the native shell can skip it.
      injectRegister: false,
      includeAssets: ['img/*.jpg', 'fonts/*.woff2', 'audio/*.mp3', 'icons/*.png'],
      manifest: {
        name: 'MANTRINI',
        short_name: 'MANTRINI',
        description: 'A respectful, offline Japa companion.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0D0506',
        theme_color: '#0D0506',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,jpg,mp3,webmanifest}'],
        // Icons are only needed when the install prompt is shown, so they stay
        // out of the precache and are fetched lazily instead. That keeps the
        // offline install ~600 KB lighter on a metered connection.
        globIgnores: ['**/icons/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/icons\/.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mantrini-icons',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mantrini-audio',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
