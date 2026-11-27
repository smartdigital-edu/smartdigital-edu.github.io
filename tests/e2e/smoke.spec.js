import { test, expect } from '@playwright/test';
import { playArticlesQuiz } from './helpers.js';

// Demo-mode seed account (src/core/backend/local.js) – not a real credential.
const EMAIL = 'demo@kiddora.test';
const PASSWORD = 'demo123';

test('login → pick profile → finish a quiz → score appears', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();

  // Log in
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('heading', { name: 'Who is Learning?' })).toBeVisible();

  // Add and pick a profile
  await page.getByRole('button', { name: 'Add Learner' }).click();
  await page.getByLabel('Name').fill('Playwright');
  await page.getByLabel('Level').selectOption('2');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: /Playwright, Year 2/ }).click();
  await expect(page.getByRole('heading', { name: 'Hi, Playwright!' })).toBeVisible();

  // Open a topic: lesson -> start quiz -> 5 questions (any type) -> results
  const pct = await playArticlesQuiz(page);

  // Score appears in the Scores table
  await page.goto('/#/scores');
  const row = page.locator('.scores-table tbody tr').first();
  await expect(row).toContainText('Articles');
  await expect(row).toContainText(pct);
});
