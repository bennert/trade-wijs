const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const clickDifferentTimeframe = async (page) => {
  const activeButton = page.locator('#timeframe-buttons .timeframe-btn.is-active').first();
  const activeTimeframe = await activeButton.getAttribute('data-timeframe');

  const buttons = page.locator('#timeframe-buttons .timeframe-btn');
  const buttonCount = await buttons.count();

  let targetButton = null;
  for (let index = 0; index < buttonCount; index += 1) {
    const candidate = buttons.nth(index);
    const timeframe = await candidate.getAttribute('data-timeframe');
    if (timeframe && timeframe !== activeTimeframe) {
      targetButton = candidate;
      break;
    }
  }

  assert.ok(targetButton, 'No alternative timeframe button available to select.');
  await targetButton.click();
};

const clickDifferentPair = async (page) => {
  await page.locator('#pair-selector-btn').click();
  const selected = page.locator('#pair-selector-menu [data-symbol].is-active').first();
  const selectedSymbol = await selected.getAttribute('data-symbol');

  const options = page.locator('#pair-selector-menu [data-symbol]');
  const optionCount = await options.count();

  let targetOption = null;
  for (let index = 0; index < optionCount; index += 1) {
    const candidate = options.nth(index);
    const symbol = await candidate.getAttribute('data-symbol');
    if (symbol && symbol !== selectedSymbol) {
      targetOption = candidate;
      break;
    }
  }

  assert.ok(targetOption, 'No alternative pair option available to select.');
  await targetOption.click();
};

const clickDifferentExchange = async (page) => {
  await page.locator('#exchange-selector-btn').click();
  const selected = page.locator('#exchange-selector-menu [data-exchange].is-active').first();
  const selectedExchange = await selected.getAttribute('data-exchange');

  const options = page.locator('#exchange-selector-menu [data-exchange]');
  const optionCount = await options.count();

  let targetOption = null;
  for (let index = 0; index < optionCount; index += 1) {
    const candidate = options.nth(index);
    const exchange = await candidate.getAttribute('data-exchange');
    if (exchange && exchange !== selectedExchange) {
      targetOption = candidate;
      break;
    }
  }

  assert.ok(targetOption, 'No alternative exchange option available to select.');
  await targetOption.click();
};

const assertRefreshStatusUpdatingThenLive = async (page, timeoutMs = 12000) => {
  const status = page.locator('#refresh-status');
  const startTime = Date.now();
  let sawUpdating = false;

  while (Date.now() - startTime < timeoutMs) {
    const currentText = ((await status.textContent()) || '').trim();
    if (currentText === 'Updating...') {
      sawUpdating = true;
    }

    if (sawUpdating && currentText === 'Live') {
      return;
    }

    await sleep(50);
  }

  const finalText = ((await status.textContent()) || '').trim();
  assert.fail(`Refresh status did not transition through Updating to Live (final text: ${finalText}).`);
};

Then('the exchange selector button is visible', async function () {
  const isVisible = await this.page.locator('#exchange-selector-btn').isVisible();
  assert.equal(isVisible, true, 'Exchange selector button is not visible.');
});

When('I open the exchange selector menu', async function () {
  await this.page.locator('#exchange-selector-btn').click();
});

Then('the exchange selector menu is visible', async function () {
  const isVisible = await this.page.locator('#exchange-selector-menu.is-visible').isVisible();
  assert.equal(isVisible, true, 'Exchange selector menu is not visible.');
});

When('I select a different exchange option', async function () {
  const selected = await this.page.locator('#exchange-selector-menu [data-exchange].is-active').first();
  const selectedKey = await selected.getAttribute('data-exchange');

  const options = this.page.locator('#exchange-selector-menu [data-exchange]');
  const optionCount = await options.count();

  let targetOption = null;
  for (let index = 0; index < optionCount; index += 1) {
    const candidate = options.nth(index);
    const key = await candidate.getAttribute('data-exchange');
    if (key && key !== selectedKey) {
      targetOption = candidate;
      break;
    }
  }

  assert.ok(targetOption, 'No alternative exchange option available to select.');
  this.selectedExchangeLabel = (await targetOption.textContent() || '').trim();

  await targetOption.click();
});

Then('the exchange selector button reflects the selected exchange', async function () {
  await this.page.waitForFunction((expectedLabel) => {
    const button = document.querySelector('#exchange-selector-btn');
    if (!button) {
      return false;
    }

    return (button.textContent || '').trim() === expectedLabel;
  }, this.selectedExchangeLabel, { timeout: 5000 });

  const label = (await this.page.locator('#exchange-selector-btn').textContent() || '').trim();
  assert.equal(label, this.selectedExchangeLabel, 'Exchange button does not show the selected exchange.');
});

Then('there is exactly {int} active exchange option', async function (count) {
  const activeCount = await this.page.locator('#exchange-selector-menu [data-exchange].is-active').count();
  assert.equal(activeCount, count, `Expected ${count} active exchange option(s), got ${activeCount}.`);
});

Then('the pair selector button is visible', async function () {
  const isVisible = await this.page.locator('#pair-selector-btn').isVisible();
  assert.equal(isVisible, true, 'Pair selector button is not visible.');
});

When('I open the pair selector menu', async function () {
  await this.page.locator('#pair-selector-btn').click();
});

Then('the pair selector menu is visible', async function () {
  const isVisible = await this.page.locator('#pair-selector-menu.is-visible').isVisible();
  assert.equal(isVisible, true, 'Pair selector menu is not visible.');
});

When('I select a different pair option', async function () {
  const selected = await this.page.locator('#pair-selector-menu [data-symbol].is-active').first();
  const selectedSymbol = await selected.getAttribute('data-symbol');

  const options = this.page.locator('#pair-selector-menu [data-symbol]');
  const optionCount = await options.count();

  let targetOption = null;
  for (let index = 0; index < optionCount; index += 1) {
    const candidate = options.nth(index);
    const symbol = await candidate.getAttribute('data-symbol');
    if (symbol && symbol !== selectedSymbol) {
      targetOption = candidate;
      break;
    }
  }

  assert.ok(targetOption, 'No alternative pair option available to select.');
  this.selectedPairLabel = (await targetOption.textContent() || '').trim();

  await targetOption.click();
});

Then('the pair selector button reflects the selected pair', async function () {
  await this.page.waitForFunction((expectedLabel) => {
    const button = document.querySelector('#pair-selector-btn');
    if (!button) {
      return false;
    }

    return (button.textContent || '').trim() === expectedLabel;
  }, this.selectedPairLabel, { timeout: 5000 });

  const label = (await this.page.locator('#pair-selector-btn').textContent() || '').trim();
  assert.equal(label, this.selectedPairLabel, 'Pair button does not show the selected pair.');
});

Then('there is exactly {int} active pair option', async function (count) {
  const activeCount = await this.page.locator('#pair-selector-menu [data-symbol].is-active').count();
  assert.equal(activeCount, count, `Expected ${count} active pair option(s), got ${activeCount}.`);
});

Then('the refresh status shows Live', async function () {
  await this.page.waitForFunction(() => {
    const element = document.querySelector('#refresh-status');
    return element && (element.textContent || '').trim() === 'Live';
  }, { timeout: 10000 });
});

When('I trigger a manual market refresh via {word}', async function (selector) {
  if (selector === 'timeframe') {
    await clickDifferentTimeframe(this.page);
    return;
  }

  if (selector === 'pair') {
    await clickDifferentPair(this.page);
    return;
  }

  if (selector === 'exchange') {
    await clickDifferentExchange(this.page);
    return;
  }

  assert.fail(`Unsupported selector type: ${selector}`);
});

Then('the refresh status transitions through Updating to Live', async function () {
  await assertRefreshStatusUpdatingThenLive(this.page);
});
