import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  projects: [
    {
      name: 'backend-api',
      testMatch: /backend\.spec\.ts/,
    },
    {
      name: 'frontend-e2e',
      testMatch: /frontend\.spec\.ts/,
    },
  ],
});
