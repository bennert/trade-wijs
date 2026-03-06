const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');

When('I open the settings view', async function () {
  await this.page.locator('#left-menu-settings-btn').click();
  await this.page.locator('#settings-panel').waitFor({ state: 'visible', timeout: 5000 });
});

When('I open the exchanges settings category', async function () {
  await this.page.locator('[data-settings-category="exchanges"]').click();
  await this.page.locator('#settings-category-exchanges.is-active').waitFor({ state: 'visible', timeout: 5000 });
});

When('I open the exchange settings tab for {word}', async function (exchangeKey) {
  const tab = this.page.locator(`[data-settings-exchange="${exchangeKey}"]`);
  await tab.click();
  await this.page.waitForFunction((key) => {
    const activeTab = document.querySelector('[data-settings-exchange].is-active');
    return Boolean(activeTab && activeTab.getAttribute('data-settings-exchange') === key);
  }, exchangeKey, { timeout: 5000 });
});

When('I disable the exchange option for {word}', async function (exchangeKey) {
  const checkbox = this.page.locator(`[data-settings-enabled-exchange="${exchangeKey}"]`);
  if (await checkbox.isChecked()) {
    await checkbox.click();
  }
});

When('I enable the exchange option for {word}', async function (exchangeKey) {
  const checkbox = this.page.locator(`[data-settings-enabled-exchange="${exchangeKey}"]`);
  if (!(await checkbox.isChecked())) {
    await checkbox.click();
  }
});

Then('the exchange editor controls are disabled', async function () {
  const apiKeyDisabled = await this.page.locator('#settings-api-key').isDisabled();
  const apiSecretDisabled = await this.page.locator('#settings-api-secret').isDisabled();
  const apiPassphraseDisabled = await this.page.locator('#settings-api-passphrase').isDisabled();
  const saveDisabled = await this.page.locator('#settings-save-btn').isDisabled();

  assert.equal(apiKeyDisabled, true, 'API key field should be disabled.');
  assert.equal(apiSecretDisabled, true, 'API secret field should be disabled.');
  assert.equal(apiPassphraseDisabled, true, 'API passphrase field should be disabled.');
  assert.equal(saveDisabled, true, 'Save button should be disabled.');

  const timeframeCheckboxes = this.page.locator('[data-settings-enabled-timeframe]');
  const timeframeCount = await timeframeCheckboxes.count();
  assert.ok(timeframeCount > 0, 'Expected timeframe checkboxes to exist.');

  for (let index = 0; index < timeframeCount; index += 1) {
    const disabled = await timeframeCheckboxes.nth(index).isDisabled();
    assert.equal(disabled, true, `Timeframe checkbox at index ${index} should be disabled.`);
  }
});

Then('the exchange editor controls are enabled', async function () {
  const apiKeyDisabled = await this.page.locator('#settings-api-key').isDisabled();
  const apiSecretDisabled = await this.page.locator('#settings-api-secret').isDisabled();
  const apiPassphraseDisabled = await this.page.locator('#settings-api-passphrase').isDisabled();
  const saveDisabled = await this.page.locator('#settings-save-btn').isDisabled();

  assert.equal(apiKeyDisabled, false, 'API key field should be enabled.');
  assert.equal(apiSecretDisabled, false, 'API secret field should be enabled.');
  assert.equal(apiPassphraseDisabled, false, 'API passphrase field should be enabled.');
  assert.equal(saveDisabled, false, 'Save button should be enabled.');

  const timeframeCheckboxes = this.page.locator('[data-settings-enabled-timeframe]');
  const timeframeCount = await timeframeCheckboxes.count();
  assert.ok(timeframeCount > 0, 'Expected timeframe checkboxes to exist.');

  let foundEnabledCheckbox = false;
  for (let index = 0; index < timeframeCount; index += 1) {
    const disabled = await timeframeCheckboxes.nth(index).isDisabled();
    if (!disabled) {
      foundEnabledCheckbox = true;
      break;
    }
  }

  assert.equal(foundEnabledCheckbox, true, 'Expected at least one timeframe checkbox to be enabled.');
});
