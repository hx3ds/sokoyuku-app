import { flushPendingUserCleanups } from './cleanup.js';

export default async function globalTeardown() {
  await flushPendingUserCleanups({ includeSetupUser: true });
}
