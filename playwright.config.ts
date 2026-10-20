import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  outputDir: 'test-results',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['line']] : 'line',
  // CI tests the build it deploys (deploy.yml runs `npm run build` first);
  // locally the dev server skips the build so repeated runs start sooner.
  webServer: {
    command: process.env.CI ? 'npx vite preview --port 4173 --strictPort' : 'npx vite --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: {
    baseURL: 'http://localhost:4173/',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    browserName: 'chromium',
    viewport: { width: 360, height: 780 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 3,
  },
  projects: [{ name: 'phone' }],
});
