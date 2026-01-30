import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'off',
  },
  webServer: [
    {
      command: 'node dist/server/index.js',
      port: 3000,
      reuseExistingServer: true,
    },
    {
      command: 'npx vite --port 5173',
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
