/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // 상대 경로: GitHub Pages 하위 경로(/high/)와 로컬 미리보기 모두 대응
  base: './',
  plugins: [
    react(),
    VitePWA({
      // 게임 중 서비스 워커 교체 금지(P1-7): 자동 갱신 대신 사용자가 홈에서 새로고침
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icons/*.png', 'images/*.png', 'images/*.svg'],
      manifest: {
        name: '하이노트 — 고음 연습',
        short_name: '하이노트',
        description: '내 목소리를 측정하며 편한 음역에서 연습하는 웹앱',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#4A154B',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        // 한글 폰트는 unicode-range 조각이 많아 사전 캐시 대신 처음 쓸 때 캐시
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.woff2') || url.pathname.endsWith('.woff'),
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
