/**
 * Renders scripts/icons/*.svg to the PNG sizes PWAs and iOS need.
 * Usage: node scripts/make-icons.mjs   (needs `npx playwright install chromium` once)
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const SIZES = [180, 192, 512];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const app of ['kiddora', 'grammarhub']) {
  const svg = readFileSync(`scripts/icons/${app}.svg`, 'utf8');
  for (const size of SIZES) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: `public/icons/${app}-${size}.png`, omitBackground: true });
  }
  // maskable: full-bleed background with the artwork in the safe zone
  await page.setViewportSize({ width: 512, height: 512 });
  const bg = app === 'kiddora' ? '#FF7A59' : '#0B63CE';
  await page.setContent(`<html><body style="margin:0;background:${bg};display:grid;place-items:center;height:512px">${svg.replace('<svg ', '<svg width="400" height="400" ')}</body></html>`);
  await page.screenshot({ path: `public/icons/${app}-maskable-512.png` });
}
await browser.close();
console.log('icons written to public/icons');
