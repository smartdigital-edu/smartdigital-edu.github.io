import { expect } from '@playwright/test';

/**
 * Answer the current quiz question (any type) and move on. Answers may be
 * wrong – the point is to reach the next question:
 *  - mc / fill / spot: tap the first enabled choice
 *  - build: move every word-bank tile into the sentence, then Check Answer
 *    (repeated until the runner shows Next/Finish)
 *  - anything else: Check Answer
 */
export async function answerAndNext(page) {
  const next = page.getByRole('button', { name: /^(➜\s*)?(Next|Finish)$/ });
  for (let attempt = 0; attempt < 5 && !(await next.isVisible()); attempt += 1) {
    const choice = page.locator('.play-stage .choice:not([disabled])').first();
    const bankTiles = page.locator('.play-stage .tile-bank:not(.sentence-line) .tile:not([disabled])');
    const check = page.getByRole('button', { name: 'Check Answer' });
    if (await choice.count()) {
      await choice.click();
    } else if (await bankTiles.count()) {
      while (await bankTiles.count()) await bankTiles.first().click();
      await check.click();
    } else if (await check.isEnabled().catch(() => false)) {
      await check.click();
    }
    await page.waitForTimeout(150);
  }
  await expect(next).toBeVisible();
  await next.click();
}

/** Play a 5-question Grammar Hub quiz on the Articles topic; returns the result text, e.g. "60%". */
export async function playArticlesQuiz(page, base = '') {
  await page.goto(`${base}#/home`);
  await page.getByRole('link', { name: /Articles/ }).click();
  await page.getByRole('button', { name: 'Start Quiz' }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  for (let i = 0; i < 5; i += 1) {
    await expect(page.getByText(`Question ${i + 1} of 5`)).toBeVisible();
    await answerAndNext(page);
  }
  await expect(page.locator('.results-pct')).toHaveText(/\d+%/);
  return (await page.locator('.results-pct').textContent()).trim();
}
