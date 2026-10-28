import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// `base: './'` keeps asset paths relative so the site works on GitHub Pages
// (served from /brain-training/) and locally without changes.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      workbox: {
        // words.txt is fetched on demand, but precache it so word games work offline.
        globPatterns: ['**/*.{js,css,html,svg,txt,png,woff2}'],
      },
      manifest: {
        name: 'Brain Training',
        short_name: 'Brain',
        description: 'Daily brain-training games and a murder-mystery campaign.',
        theme_color: '#1a352d',
        background_color: '#24463c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
