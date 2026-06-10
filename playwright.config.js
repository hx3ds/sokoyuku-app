import { defineConfig, devices } from '@playwright/test';

const startConsulCommand = 'bash start_consul.sh local';

export default defineConfig({
  testDir: './test',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8880',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    /*
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    */
  ],
  webServer: [
    {
      command: startConsulCommand,
      cwd: '..',
      url: 'http://localhost:9000/healthz',
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:8880',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
