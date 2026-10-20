import { execFileSync } from 'node:child_process';
import { defineConfig } from '@playwright/test';

// Each run gets its own free port, picked once here; test workers inherit it
// through the environment, so they all reach this run's server. Set E2E_PORT to choose one.
process.env.E2E_PORT ??= execFileSync(process.execPath, ['scripts/free-port.ts'], { encoding: 'utf8' }).trim();
const port = Number(process.env.E2E_PORT);
const url = `http://localhost:${port}/`;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  outputDir: 'test-results',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['line']] : 'line',
  // CI tests the build it deploys (deploy.yml runs `npm run build` first);
  // locally the dev server skips the build so repeated runs start sooner.
  webServer: {
    command: `npx vite${process.env.CI ? ' preview' : ''} --port ${port} --strictPort`,
    url,
    // Never reuse: a server already on the port could be another worktree's code.
    reuseExistingServer: false,
    timeout: 180_000,
  },
  use: {
    baseURL: url,
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
