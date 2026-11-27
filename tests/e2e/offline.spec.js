import { test, expect } from '@playwright/test';

// Production Kiddora build (see playwright.config.js). Demo-mode seed account – not a real credential.
const BASE = 'http://localhost:5198/';

test('service worker caches every activity: app works offline after one online visit', async ({ page, context }) => {
  await page.goto(BASE);
  await page.getByLabel('Email').fill('demo@kiddora.test');
  await page.getByLabel('Password').fill('demo123');
  await page.getByRole('button', { name: /^(Log In|Sign in)$/ }).click();
  await page.getByRole('button', { name: 'Add Learner' }).click();
  await page.getByLabel('Name').fill('Offline');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: /^Offline,/ }).click();
  await expect(page.getByRole('heading', { name: 'Hi, Offline!' })).toBeVisible();

  // Wait until the service worker controls the page and has finished precaching.
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.evaluate(() => navigator.serviceWorker.ready);

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
  await context.setOffline(true);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hi, Offline!' })).toBeVisible();

  // None of these activities were opened online.
  const activities = [
    ['#/play/numbers/count', "Let's Count"],
    ['#/play/abc/trace', 'ABC Tracing'],
    ['#/play/colour/balloon', 'Pop the Balloon'],
    ['#/play/abc/complete', 'Complete the ABC'],
  ];
  for (const [hash, title] of activities) {
    await page.goto(BASE + hash);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('.play-stage > *').first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});
