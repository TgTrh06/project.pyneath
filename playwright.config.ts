import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '.openai/playwright-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: '.openai/playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: '.openai/playwright-report', open: 'never' }]],
  use: {
    baseURL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  expect: { timeout: 5_000 },
  timeout: 30_000,
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'pnpm --filter @pyneath/web exec vite --host 127.0.0.1 --port 4173',
    url: baseURL,
    env: {
      ...process.env,
      VITE_API_URL: process.env.PYNEATH_E2E_API_URL ?? '',
      VITE_REALTIME_URL: process.env.PYNEATH_E2E_REALTIME_URL ?? '',
      VITE_ASSISTANCE_DEMO: 'false',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
