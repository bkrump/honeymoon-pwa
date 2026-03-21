import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = 'honeymoon-pwa';
const base = process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png'],
      manifest: {
        name: 'Honeymoon',
        short_name: 'Honeymoon',
        description: 'Offline honeymoon guide for Mykonos and Marrakech.',
        theme_color: '#0f4f7d',
        background_color: '#f4efe6',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'assets/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'assets/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'assets/icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,json}']
      }
    })
  ],
  server: {
    host: '0.0.0.0'
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true
  }
});
