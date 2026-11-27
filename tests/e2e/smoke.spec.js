import { test, expect } from '@playwright/test';

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

  // Open a topic: lesson -> start quiz -> choose 5 questions
  await page.getByRole('link', { name: /Articles/ }).click();
  await expect(page.getByRole('heading', { name: 'Articles' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Quiz' }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();

  // Answer 5 questions (first option / check) and move on
  for (let i = 0; i < 5; i += 1) {
    await expect(page.getByText(`Question ${i + 1} of 5`)).toBeVisible();
    const choice = page.locator('.play-stage .choice:not([disabled])').first();
    if (await choice.count()) await choice.click();
    else await page.getByRole('button', { name: 'Check Answer' }).click();
    await page.locator('.next-row button').first().click();
  }

  // Results screen
  await expect(page.locator('.results-pct')).toHaveText(/\d+%/);
  const pct = await page.locator('.results-pct').textContent();

  // Score appears in the Scores table
  await page.goto('/#/scores');
  const row = page.locator('.scores-table tbody tr').first();
  await expect(row).toContainText('Articles');
  await expect(row).toContainText(pct.trim());
});
