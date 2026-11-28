import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test runs against the Grammar Hub dev server; the offline test runs
 * against a production Kivokid build (service worker active). Both use demo mode.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:5199', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: [
    {
      command: 'npx cross-env APP=grammarhub VITE_DEMO_MODE=true vite --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Separate outDir so the demo-mode build never overwrites dist/.
      command: 'npx cross-env APP=kiddora VITE_DEMO_MODE=true vite build --outDir dist-e2e/kiddora'
        + ' && npx cross-env APP=kiddora vite preview --outDir dist-e2e/kiddora --port 5198 --strictPort',
      url: 'http://localhost:5198',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
