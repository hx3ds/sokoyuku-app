import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanupUserViaDB, closePool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.resolve(__dirname, '../playwright/.auth');
const pendingEmailsPath = path.join(authDir, 'pending_cleanup_emails.txt');
const setupUserEmailPath = path.join(authDir, 'user.email');

function ensureAuthDir() {
  fs.mkdirSync(authDir, { recursive: true });
}

function readPendingEmails() {
  try {
    if (!fs.existsSync(pendingEmailsPath)) return [];
    return fs
      .readFileSync(pendingEmailsPath, 'utf8')
      .split('\n')
      .map((e) => e.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Like testsuite.cleanupContactAfter: remember email for suite-end CleanupUserViaDB. */
export function cleanupContactAfter(email) {
  email = String(email || '').trim();
  if (!email) return;
  ensureAuthDir();
  // appendFile is safe enough across Playwright workers for line-oriented emails
  fs.appendFileSync(pendingEmailsPath, email + '\n');
}

export function saveSetupUserEmail(email) {
  email = String(email || '').trim();
  if (!email) return;
  ensureAuthDir();
  fs.writeFileSync(setupUserEmailPath, email + '\n');
  cleanupContactAfter(email);
}

export function readSetupUserEmail() {
  try {
    if (!fs.existsSync(setupUserEmailPath)) return '';
    return fs.readFileSync(setupUserEmailPath, 'utf8').trim();
  } catch {
    return '';
  }
}

/** Run pending user cleanups (mirrors Go t.Cleanup flush at suite end). */
export async function flushPendingUserCleanups({ includeSetupUser = true } = {}) {
  const emails = new Set(readPendingEmails());
  if (includeSetupUser) {
    const setupEmail = readSetupUserEmail();
    if (setupEmail) emails.add(setupEmail);
  }
  for (const email of emails) {
    try {
      await cleanupUserViaDB(email);
    } catch (err) {
      console.error(`CleanupUserViaDB(${email}):`, err);
    }
  }
  try {
    if (fs.existsSync(pendingEmailsPath)) fs.unlinkSync(pendingEmailsPath);
  } catch {
    // ignore
  }
  try {
    if (fs.existsSync(setupUserEmailPath)) fs.unlinkSync(setupUserEmailPath);
  } catch {
    // ignore
  }
  await closePool();
}
