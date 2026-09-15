import { test as base, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const authDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../playwright/.auth');

/**
 * Per-worker auth so parallel tests do not share one free-plan quota / JWT.
 * Override with test.use({ storageState: { cookies: [], origins: [] } }) for anonymous flows.
 */
export const test = base.extend({
  storageState: async ({}, use, workerInfo) => {
    await use(path.join(authDir, `user-${workerInfo.parallelIndex}.json`));
  },
});

export { expect };

export function authStatePath(workerIndex) {
  return path.join(authDir, `user-${workerIndex}.json`);
}
