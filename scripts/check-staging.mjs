/**
 * End-to-end check of the deployed STAGING site against the dev Firebase project.
 *   node scripts/check-staging.mjs            (needs .env.test, see README §4)
 * Uses the permanent dev test accounts; never touches production data.
 * Checks: staging banner, outsider refused, parent login, profile, online and
 * offline quiz with sync, and that production and staging caches/storage coexist.
 */
import { readFileSync } from 'node:fs';
import { chromium, devices, expect } from '@playwright/test';
import { playArticlesQuiz } from '../tests/e2e/helpers.js';

const env = Object.fromEntries(readFileSync('.env.test', 'utf8').split('\n')
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const ORIGIN = 'https://smartdigital-edu.github.io';
const STG = `${ORIGIN}/staging/grammarhub/`;
const ok = (...a) => console.log('  ✓', ...a);

const browser = await chromium.launch();
let failed = false;
try {
  // 1. outsider (not allowlisted) is refused
  {
    const page = await (await browser.newContext(devices['Pixel 5'])).newPage();
    await page.goto(STG);
    await page.getByLabel('Email').fill(env.TEST_OUTSIDER_EMAIL);
    await page.getByLabel('Password').fill(env.TEST_PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.getByText(/does not have access yet/)).toBeVisible({ timeout: 15000 });
    ok('outsider refused');
    await page.context().close();
  }

  const ctx = await browser.newContext(devices['Pixel 5']);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // 2. production first, so we can check staging doesn't wipe its cache
  await page.goto(`${ORIGIN}/grammarhub/`);
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 });
  await expect(page.locator('.stage-banner')).toHaveCount(0);
  ok('production: no TEST SITE banner');

  // 3. staging login
  await page.goto(STG);
  await expect(page.locator('.stage-banner')).toBeVisible();
  ok('staging: TEST SITE banner shown');
  await page.getByLabel('Email').fill(env.TEST_PARENT_EMAIL);
  await page.getByLabel('Password').fill(env.TEST_PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('heading', { name: 'Who is Learning?' })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.demo-banner')).toHaveCount(0);
  ok('parent logged in (real dev Firebase, not demo mode)');

  const name = `Check ${new Date().toISOString().slice(5, 16).replace('T', ' ')}`;
  await page.getByRole('button', { name: 'Add Learner' }).click();
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Level').selectOption('2');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: new RegExp(`^${name}, Year 2`) }).click();
  ok(`profile "${name}" created`);

  const quiz = () => playArticlesQuiz(page, STG);
  ok('online quiz', await quiz());
  await page.waitForTimeout(2000);

  await ctx.setOffline(true);
  ok('offline quiz', await quiz());
  await page.goto(`${STG}#/scores`);
  await expect(page.locator('.scores-table tbody tr')).toHaveCount(2, { timeout: 10000 });
  ok('offline: 2 scores shown, pending:', await page.locator('.scores-table .pending').count());

  await ctx.setOffline(false);
  await page.waitForTimeout(5000);
  await page.reload();
  await expect(page.locator('.scores-table tbody tr')).toHaveCount(2, { timeout: 15000 });
  await expect(page.locator('.scores-table .pending')).toHaveCount(0, { timeout: 15000 });
  ok('back online: both scores synced (no pending)');

  // 4. production and staging coexist on the shared origin
  const caches = await page.evaluate(() => caches.keys());
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(caches.some((k) => /^grammarhub-[0-9a-f]{10}$/.test(k))).toBe(true);
  expect(caches.some((k) => /^grammarhub-staging-[0-9a-f]{10}$/.test(k))).toBe(true);
  ok('caches kept apart:', caches.filter((k) => k.startsWith('grammarhub')).join(', '));
  expect(keys.some((k) => k.startsWith('grammarhub-staging:'))).toBe(true);
  ok('staging storage namespaced:', keys.filter((k) => k.startsWith('grammarhub')).join(', '));

  if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
  console.log('\nSTAGING OK');
} catch (e) {
  failed = true;
  console.error('\nSTAGING CHECK FAILED:', e.message.split('\n').slice(0, 4).join('\n'));
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
