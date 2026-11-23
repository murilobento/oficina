import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Gera src/routeTree.gen.ts a partir dos arquivos em src/routes
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    // App instalável (PWA): guarda só a "casca" (telas, estilos, código) para abrir rápido.
    // Dados e login vêm sempre do servidor: /api nunca entra no cache.
    VitePWA({
      registerType: 'prompt', // nova versão só com o clique em "Atualizar" (não perde formulário aberto)
      injectRegister: false, // o registro fica em src/components/layout/atualizacao-app.tsx
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Oficina',
        short_name: 'Oficina',
        description: 'Gestão da oficina: orçamentos, vendas, compras e estoque.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#fafafa',
        theme_color: '#fafafa',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // A biblioteca de PDF é grande e só baixa quando se gera o primeiro PDF.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // A API (pnpm api) roda em outra porta; o navegador fala só com o endereço do site.
    proxy: { '/api': 'http://localhost:8787' },
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
