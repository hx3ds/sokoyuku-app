import { defineConfig, devices } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKER_COUNT } from './test/constants.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function canLaunchWebKit() {
  const probe = `
    const { webkit } = require('playwright');
    (async () => {
      const browser = await webkit.launch({ headless: true });
      await browser.close();
      process.exit(0);
    })().catch(() => process.exit(1));
  `;
  const result = spawnSync(process.execPath, ['-e', probe], {
    cwd: rootDir,
    env: {
      ...process.env,
      PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS: '1',
    },
    encoding: 'utf8',
  });
  return result.status === 0;
}

const webkitReady = canLaunchWebKit();
if (!webkitReady && process.env.TEST_WORKER_INDEX === undefined) {
  console.warn(
    '[playwright] Mobile Safari (WebKit) skipped: host missing WebKit libraries. Run: sudo npx playwright install-deps webkit'
  );
}

// storageState comes from test/fixtures.js (per-worker user-${parallelIndex}.json)
const browserProjects = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
    dependencies: ['setup'],
  },
  {
    name: 'Mobile Chrome',
    use: { ...devices['Pixel 7'] },
    dependencies: ['setup'],
  },
];

if (webkitReady) {
  browserProjects.push({
    name: 'Mobile Safari',
    use: { ...devices['iPhone 13'] },
    dependencies: ['setup'],
  });
}

export default defineConfig({
  testDir: './test',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: WORKER_COUNT,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8880',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      // Same-file setup tests parallelize (global fullyParallel is false).
      fullyParallel: true,
    },
    ...browserProjects,
  ],
  globalTeardown: './test/global.teardown.js',
});
