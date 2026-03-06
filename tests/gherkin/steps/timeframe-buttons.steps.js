const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');

Then('the page title is visible', async function () {
  assert.ok(this.response, 'No HTTP response received.');
  assert.equal(this.response.ok(), true, 'Homepage response is not OK.');

  const title = await this.page.title();
  assert.match(title, /Trade Wijs/i);
});

Then('the timeframe buttons block is visible', async function () {
  const isVisible = await this.page.locator('#timeframe-buttons').isVisible();
  assert.equal(isVisible, true, 'Timeframe button block is not visible.');
});

Then('there are {int} timeframe buttons', async function (count) {
  const buttonCount = await this.page.locator('#timeframe-buttons .timeframe-btn').count();
  assert.equal(
    buttonCount >= count,
    true,
    `Expected at least ${count} buttons, got ${buttonCount}.`,
  );
});

Then('there are at least {int} timeframe buttons', async function (count) {
  const buttonCount = await this.page.locator('#timeframe-buttons .timeframe-btn').count();
  assert.equal(
    buttonCount >= count,
    true,
    `Expected at least ${count} buttons, got ${buttonCount}.`,
  );
});

Then('there is at least {int} timeframe button', async function (count) {
  const buttonCount = await this.page.locator('#timeframe-buttons .timeframe-btn').count();
  assert.equal(
    buttonCount >= count,
    true,
    `Expected at least ${count} button(s), got ${buttonCount}.`,
  );
});

Then('there is exactly {int} active timeframe button', async function (count) {
  const activeCount = await this.page.locator('#timeframe-buttons .timeframe-btn.is-active').count();
  assert.equal(activeCount, count, `Expected ${count} active button(s), got ${activeCount}.`);
});

Then('the {word} button is visible', async function (timeframe) {
  const isVisible = await this.page.locator(`#timeframe-buttons .timeframe-btn[data-timeframe="${timeframe}"]`).isVisible();
  assert.equal(isVisible, true, `Button ${timeframe} is not visible.`);
});

When('I click the {word} button', async function (timeframe) {
  await this.page.locator(`#timeframe-buttons .timeframe-btn[data-timeframe="${timeframe}"]`).click();
});

Then('the {word} button is active', async function (timeframe) {
  const button = this.page.locator(`#timeframe-buttons .timeframe-btn[data-timeframe="${timeframe}"]`);
  const hasActiveClass = await button.evaluate((element) => element.classList.contains('is-active'));
  assert.equal(hasActiveClass, true, `Button ${timeframe} is not active (no visible active rectangle).`);
});

