const { Before, After, Given, When, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3175';

setDefaultTimeout(30 * 1000);

Before(async function () {
  this.browser = await chromium.launch();
  this.context = await this.browser.newContext();
  this.page = await this.context.newPage();
});

After(async function () {
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
});

Given('the Trade Wijs homepage', async function () {
  this.baseUrl = BASE_URL;
});

When('I open the homepage', async function () {
  this.response = await this.page.goto(this.baseUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });
  await this.page.locator('#tv-chart').waitFor({ state: 'visible', timeout: 20000 });
  await this.page.locator('#refresh-status').waitFor({ state: 'visible', timeout: 20000 });
  await this.page.locator('#timeframe-buttons').waitFor({ state: 'visible', timeout: 20000 });
  await this.page.locator('#horizontal-line-btn').waitFor({ state: 'visible', timeout: 20000 });
});
