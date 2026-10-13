import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

// Chromium 가짜 오디오 입력으로 하는 스모크 테스트. 실제 iOS 권한·하드웨어 시험을 대신하지 못한다(§11.4-8).
const wav = resolve(process.cwd(), 'tests/fixtures/a3-sine.wav');

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173/',
    permissions: ['microphone'],
    launchOptions: {
      executablePath: process.env.CHROME_PATH || undefined,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
