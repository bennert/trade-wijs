import { expect, test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3175';

test('timeframe buttons are shown on the homepage', async ({ page }) => {
  const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  expect(response).not.toBeNull();
  expect(response?.ok()).toBeTruthy();

  await expect(page).toHaveTitle(/Trade Wijs/i);
  await expect(page.locator('#timeframe-buttons')).toBeVisible();

  const timeframeButtons = page.locator('#timeframe-buttons .timeframe-btn');
  await expect(timeframeButtons).toHaveCount(9);
  await expect(page.locator('#timeframe-buttons .timeframe-btn.is-active')).toHaveCount(1);

  await expect(page.locator('#timeframe-buttons .timeframe-btn[data-timeframe="1m"]')).toBeVisible();
  await expect(page.locator('#timeframe-buttons .timeframe-btn[data-timeframe="1M"]')).toBeVisible();
});
