const assert = require('node:assert/strict');
const { Before, After, Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
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

Then('the horizontal line button is visible', async function () {
  const button = this.page.locator('#horizontal-line-btn');
  const isVisible = await button.isVisible();
  assert.equal(isVisible, true, 'Horizontal Line knop is niet zichtbaar.');
});

When('I click the horizontal line button', async function () {
  await this.page.locator('#horizontal-line-btn').click();
});

Then('the horizontal line button is active', async function () {
  await this.page.waitForFunction(() => {
    const button = document.querySelector('#horizontal-line-btn');
    return Boolean(button && button.classList.contains('is-active'));
  }, null, { timeout: 5000 });

  const className = await this.page.locator('#horizontal-line-btn').getAttribute('class');
  assert.match(className ?? '', /is-active/, 'Horizontal Line knop heeft geen actieve omlijning.');
});

When('I hover over the chart in horizontal line mode', async function () {
  const chart = this.page.locator('.chart-canvas');
  await chart.hover({ position: { x: 180, y: 120 } });
  await this.page.evaluate(() => {
    const chartElement = document.querySelector('.chart-canvas');
    if (!chartElement) {
      return;
    }

    const rect = chartElement.getBoundingClientRect();
    const clientX = rect.left + Math.min(180, Math.max(10, rect.width - 10));
    const clientY = rect.top + Math.min(120, Math.max(10, rect.height - 30));
    const overlay = document.querySelector('#draw-capture-overlay');

    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX,
      clientY,
      bubbles: true,
      cancelable: true,
      view: window,
    });

    chartElement.dispatchEvent(mouseMoveEvent);
    if (overlay) {
      overlay.dispatchEvent(mouseMoveEvent);
    }
  });
});

Then('the horizontal line preview is visible', async function () {
  await this.page.waitForFunction(() => {
    const element = document.querySelector('.chart-canvas');
    return Boolean(element && element.dataset.previewVisible === 'true');
  }, null, { timeout: 2000 });

  const previewVisible = await this.page.locator('.chart-canvas').getAttribute('data-preview-visible');
  assert.equal(previewVisible, 'true', 'Preview lijn is niet zichtbaar tijdens hover.');
});

When('I click the chart to place a horizontal line', async function () {
  await this.page.locator('#draw-capture-overlay').click({ position: { x: 220, y: 200 } });
});

Then('a horizontal line is placed', async function () {
  await this.page.waitForFunction(() => {
    const element = document.querySelector('.chart-canvas');
    return Boolean(element && Number(element.dataset.horizontalLineCount || '0') >= 1);
  }, null, { timeout: 2000 });

  const countRaw = await this.page.locator('.chart-canvas').getAttribute('data-horizontal-line-count');
  const count = Number(countRaw || '0');
  assert.ok(count >= 1, `Horizontale lijn is niet geplaatst. Huidige count: ${count}`);
});
