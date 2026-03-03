const assert = require('node:assert/strict');
const { Before, After, Given, When, Then } = require('@cucumber/cucumber');
const { chromium } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3175';

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
  this.response = await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
});

Then('the page title is visible', async function () {
  assert.ok(this.response, 'Geen HTTP response ontvangen.');
  assert.equal(this.response.ok(), true, 'Homepage response is niet OK.');

  const title = await this.page.title();
  assert.match(title, /Trade Wijs/i);
});

Then('the timeframe buttons block is visible', async function () {
  const isVisible = await this.page.locator('#timeframe-buttons').isVisible();
  assert.equal(isVisible, true, 'Timeframe button block is niet zichtbaar.');
});

Then('there are {int} timeframe buttons', async function (count) {
  const buttonCount = await this.page.locator('#timeframe-buttons .timeframe-btn').count();
  assert.equal(buttonCount, count, `Verwacht ${count} knoppen, kreeg ${buttonCount}.`);
});

Then('there is exactly {int} active timeframe button', async function (count) {
  const activeCount = await this.page.locator('#timeframe-buttons .timeframe-btn.is-active').count();
  assert.equal(activeCount, count, `Verwacht ${count} actieve knop, kreeg ${activeCount}.`);
});

Then('the {word} button is visible', async function (timeframe) {
  const isVisible = await this.page.locator(`#timeframe-buttons .timeframe-btn[data-timeframe="${timeframe}"]`).isVisible();
  assert.equal(isVisible, true, `Knop ${timeframe} is niet zichtbaar.`);
});
