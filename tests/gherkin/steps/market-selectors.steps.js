const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isPairMenuOpen = async (page) => {
  return page.evaluate(() => {
    const menu = document.querySelector('#pair-selector-menu');
    return Boolean(menu && menu.classList.contains('is-visible'));
  });
};

const ensurePairMenuOpen = async (page) => {
  const open = await isPairMenuOpen(page);
  if (!open) {
    await page.locator('#pair-selector-btn').click();
  }
  await waitForPairMenuVisible(page);
};

const waitForPairMenuVisible = async (page) => {
  await page.locator('#pair-selector-menu.is-visible').waitFor({ state: 'visible', timeout: 5000 });
};

const getPairMenuOptions = async (page, options = {}) => {
  const includeHidden = options.includeHidden === true;
  return page.evaluate(({ shouldIncludeHidden }) => {
    const menu = document.querySelector('#pair-selector-menu');
    if (!menu) {
      return [];
    }

    return Array.from(menu.querySelectorAll('[data-symbol]'))
      .map((button) => ({
        symbol: button.getAttribute('data-symbol') || '',
        label: (button.textContent || '').trim(),
        isActive: button.classList.contains('is-active'),
        isVisible: !button.hidden,
      }))
      .filter((item) => item.symbol)
      .filter((item) => shouldIncludeHidden || item.isVisible);
  }, { shouldIncludeHidden: includeHidden });
};

const findDifferentVisiblePairOption = async (page) => {
  const currentLabel = ((await page.locator('#pair-selector-btn').textContent()) || '').trim();
  const options = await getPairMenuOptions(page);

  if (options.length === 0) {
    return null;
  }

  const activeOption = options.find((option) => option.isActive);
  const activeSymbol = activeOption?.symbol || null;
  const currentLabelOption = options.find((option) => option.label === currentLabel);
  const currentSymbol = currentLabelOption?.symbol || activeSymbol;

  const alternative = options.find((option) => option.symbol !== currentSymbol);
  if (!alternative) {
    return null;
  }

  return alternative;
};

const clickAnyDifferentPairOption = async (page) => {
  const currentLabel = ((await page.locator('#pair-selector-btn').textContent()) || '').trim();
  const didClick = await page.evaluate(({ expectedCurrentLabel }) => {
    const menu = document.querySelector('#pair-selector-menu');
    if (!menu) {
      return null;
    }

    const buttons = Array.from(menu.querySelectorAll('[data-symbol]'));
    if (buttons.length === 0) {
      return null;
    }

    const activeButton = buttons.find((button) => button.classList.contains('is-active'));
    const currentLabelButton = buttons.find((button) => (button.textContent || '').trim() === expectedCurrentLabel);
    const currentSymbol = (currentLabelButton || activeButton)?.getAttribute('data-symbol');
    const nextButton = buttons.find((button) => {
      const symbol = button.getAttribute('data-symbol');
      return Boolean(symbol && symbol !== currentSymbol);
    });

    if (!nextButton) {
      return null;
    }

    nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return (nextButton.textContent || '').trim();
  }, { expectedCurrentLabel: currentLabel });

  return didClick;
};

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
  await ensurePairMenuOpen(page);

  const alternative = await findDifferentVisiblePairOption(page);
  if (!alternative) {
    const clickedLabel = await clickAnyDifferentPairOption(page);
    assert.ok(clickedLabel, 'No alternative pair option available to select.');
    return;
  }

  await page.locator(`#pair-selector-menu [data-symbol="${alternative.symbol}"]`).first().click();
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

const assertRefreshStatusUpdatingThenLive = async (page, timeoutMs = 18000) => {
  const status = page.locator('#refresh-status');
  const startTime = Date.now();
  let sawUpdating = false;

  while (Date.now() - startTime < timeoutMs) {
    const currentText = ((await status.textContent()) || '').trim();
    if (/^Updating(\b|\s|:|\.)/.test(currentText)) {
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
  await ensurePairMenuOpen(this.page);

  const alternative = await findDifferentVisiblePairOption(this.page);
  if (!alternative) {
    const clickedLabel = await clickAnyDifferentPairOption(this.page);
    assert.ok(clickedLabel, 'No alternative pair option available to select.');
    this.selectedPairLabel = clickedLabel;
    return;
  }

  this.selectedPairLabel = alternative.label;
  await this.page.locator(`#pair-selector-menu [data-symbol="${alternative.symbol}"]`).first().click();
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

Then('the market info panel is expanded', async function () {
  const toggle = this.page.locator('#market-info-toggle-btn');
  const isVisible = await this.page.locator('#market-info-grid').isVisible();
  const expanded = await toggle.getAttribute('aria-expanded');

  assert.equal(expanded, 'true', 'Market info toggle should be expanded.');
  assert.equal(isVisible, true, 'Market info grid should be visible when expanded.');
});

When('I toggle the market info panel', async function () {
  await this.page.locator('#market-info-toggle-btn').click();
});

Then('the market info panel is collapsed', async function () {
  const toggle = this.page.locator('#market-info-toggle-btn');
  const grid = this.page.locator('#market-info-grid');
  const expanded = await toggle.getAttribute('aria-expanded');
  const isVisible = await grid.isVisible();

  assert.equal(expanded, 'false', 'Market info toggle should be collapsed.');
  assert.equal(isVisible, false, 'Market info grid should be hidden when collapsed.');
});
