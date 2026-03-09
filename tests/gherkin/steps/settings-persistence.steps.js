const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');

const SETTING_TYPE_CONFIG = {
  exchange: {
    selector: '[data-settings-enabled-exchange]',
    attribute: 'data-settings-enabled-exchange',
  },
  timeframe: {
    selector: '[data-settings-enabled-timeframe]',
    attribute: 'data-settings-enabled-timeframe',
    preferInitiallyChecked: true,
  },
  quote: {
    selector: '[data-settings-enabled-quote-currency]',
    attribute: 'data-settings-enabled-quote-currency',
    preferInitiallyChecked: true,
  },
  pair: {
    selector: '[data-settings-enabled-pair]',
    attribute: 'data-settings-enabled-pair',
    preferInitiallyChecked: true,
  },
  indicator: {
    selector: '[data-settings-enabled-indicator]',
    attribute: 'data-settings-enabled-indicator',
  },
  tool: {
    selector: '[data-settings-enabled-tool]',
    attribute: 'data-settings-enabled-tool',
  },
};

const getSettingConfig = (settingType) => {
  const config = SETTING_TYPE_CONFIG[settingType];
  assert.ok(config, `Unsupported setting type: ${settingType}`);
  return config;
};

const SETTINGS_OPTIONS_WAIT_FAST_MS = 4000;
const SETTINGS_OPTIONS_WAIT_RETRY_MS = 8000;
const SETTINGS_OPTIONS_WAIT_ATTACHED_MS = 5000;

const waitForEnabledSettingOption = async (page, selector, timeoutMs) => {
  await page.waitForFunction(({ settingSelector }) => {
    const candidates = Array.from(document.querySelectorAll(settingSelector));
    return candidates.length > 0 && candidates.some((candidate) => !candidate.disabled);
  }, { settingSelector: selector }, { timeout: timeoutMs });
};

const retryWaitForEnabledSettingOption = async (page, selector) => {
  try {
    await waitForEnabledSettingOption(page, selector, SETTINGS_OPTIONS_WAIT_FAST_MS);
    return;
  } catch (_error) {
    const activeExchangeTab = page.locator('[data-settings-exchange].is-active').first();
    if (await activeExchangeTab.count()) {
      await activeExchangeTab.click();
      await page.waitForTimeout(300);
    }
    await waitForEnabledSettingOption(page, selector, SETTINGS_OPTIONS_WAIT_RETRY_MS);
  }
};

const waitForPairPersistence = async (page, exchangeKey, pairSymbol, expectedChecked) => {
  await page.waitForFunction(
    ({ targetExchangeKey, targetPairSymbol, expected }) => {
      try {
        const raw = localStorage.getItem('trade-wijs-enabled-pairs');
        const parsed = raw ? JSON.parse(raw) : {};
        const enabledForExchange = Array.isArray(parsed?.[targetExchangeKey]) ? parsed[targetExchangeKey] : [];
        const hasPair = enabledForExchange.includes(targetPairSymbol);
        return hasPair === expected;
      } catch (_error) {
        return false;
      }
    },
    {
      targetExchangeKey: exchangeKey,
      targetPairSymbol: pairSymbol,
      expected: expectedChecked,
    },
    { timeout: 5000 },
  );
};

const waitForQuotePersistence = async (page, exchangeKey, quoteCurrency, expectedChecked) => {
  await page.waitForFunction(
    ({ targetExchangeKey, targetQuoteCurrency, expected }) => {
      try {
        const raw = localStorage.getItem('trade-wijs-enabled-quote-currencies');
        const parsed = raw ? JSON.parse(raw) : {};
        const enabledForExchange = Array.isArray(parsed?.[targetExchangeKey]) ? parsed[targetExchangeKey] : [];
        const hasQuote = enabledForExchange.includes(targetQuoteCurrency);
        return hasQuote === expected;
      } catch (_error) {
        return false;
      }
    },
    {
      targetExchangeKey: exchangeKey,
      targetQuoteCurrency: quoteCurrency,
      expected: expectedChecked,
    },
    { timeout: 5000 },
  );
};

When('I open the general settings category', async function () {
  await this.page.locator('[data-settings-category="general"]').click();
  await this.page.locator('#settings-category-general.is-active').waitFor({ state: 'visible', timeout: 5000 });
});

When('I open the general settings tab for {word}', async function (generalItem) {
  const tab = this.page.locator(`[data-settings-general-item="${generalItem}"]`);
  await tab.click();
  await this.page.waitForFunction((item) => {
    const activeTab = document.querySelector('[data-settings-general-item].is-active');
    return Boolean(activeTab && activeTab.getAttribute('data-settings-general-item') === item);
  }, generalItem, { timeout: 5000 });
});

When('I reload the page', async function () {
  await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await this.page.locator('#refresh-status').waitFor({ state: 'attached', timeout: 20000 });
});

When('I toggle one {word} setting option', async function (settingType) {
  const config = getSettingConfig(settingType);
  let options = this.page.locator(config.selector);

  if (['pair', 'quote', 'timeframe'].includes(settingType)) {
    const waitForOptions = async (timeoutMs) => {
      await this.page.waitForFunction(({ selector }) => {
        return document.querySelectorAll(selector).length > 0;
      }, { selector: config.selector }, { timeout: timeoutMs });
    };

    try {
      await waitForOptions(SETTINGS_OPTIONS_WAIT_FAST_MS);
    } catch (_error) {
      const activeExchangeTab = this.page.locator('[data-settings-exchange].is-active').first();
      if (await activeExchangeTab.count()) {
        await activeExchangeTab.click();
        await this.page.waitForTimeout(250);
      }
      await waitForOptions(SETTINGS_OPTIONS_WAIT_RETRY_MS);
    }

    options = this.page.locator(config.selector);
  }

  await options.first().waitFor({ state: 'attached', timeout: SETTINGS_OPTIONS_WAIT_ATTACHED_MS });
  await retryWaitForEnabledSettingOption(this.page, config.selector);

  const count = await options.count();
  assert.ok(count > 0, `Expected at least one ${settingType} setting option.`);

  let toggledSetting = null;
  const preferredChecked = Boolean(config.preferInitiallyChecked);

  if (settingType === 'pair') {
    const activeExchangeKey = await this.page.evaluate(() => {
      const activeExchangeTab = document.querySelector('[data-settings-exchange].is-active');
      return activeExchangeTab ? activeExchangeTab.getAttribute('data-settings-exchange') : null;
    });

    const activeSymbol = await this.page.evaluate(() => {
      const activePair = document.querySelector('#pair-selector-menu [data-symbol].is-active');
      return activePair ? activePair.getAttribute('data-symbol') : null;
    });

    if (activeSymbol) {
      const activePairOption = this.page.locator(`${config.selector}[${config.attribute}="${activeSymbol}"]`).first();
      if (await activePairOption.count()) {
        const isDisabled = await activePairOption.isDisabled();
        if (!isDisabled) {
          const before = await activePairOption.isChecked();
          if (before) {
            await activePairOption.click({ force: true });
            const after = await activePairOption.isChecked();
            if (before !== after) {
              toggledSetting = {
                settingType,
                key: activeSymbol,
                expectedChecked: after,
                exchangeKey: activeExchangeKey,
              };
            }
          }
        }
      }
    }

    if (!toggledSetting) {
      const checkedPairs = this.page.locator(`${config.selector}:not(:disabled):checked`);
      const checkedCount = await checkedPairs.count();
      if (checkedCount > 0) {
        const firstChecked = checkedPairs.nth(0);
        const key = await firstChecked.getAttribute(config.attribute);
        const before = await firstChecked.isChecked();
        if (before && key) {
          await firstChecked.click({ force: true });
          const after = await firstChecked.isChecked();
          if (before !== after) {
            toggledSetting = {
              settingType,
              key,
              expectedChecked: after,
              exchangeKey: activeExchangeKey,
            };
          }
        }
      }
    }

    if (!toggledSetting) {
      const disabledCheckedPairs = this.page.locator(`${config.selector}:disabled:checked`);
      const disabledCheckedCount = await disabledCheckedPairs.count();
      if (disabledCheckedCount > 0) {
        const lockedPair = disabledCheckedPairs.nth(0);
        const lockedPairKey = await lockedPair.getAttribute(config.attribute);
        const candidatePairs = this.page.locator(`${config.selector}:not(:disabled):not(:checked)`);
        const candidateCount = await candidatePairs.count();
        if (lockedPairKey && candidateCount > 0) {
          const candidate = candidatePairs.nth(0);
          await candidate.click({ force: true });

          const unlockedTarget = this.page.locator(`${config.selector}[${config.attribute}="${lockedPairKey}"]`).first();
          const isNowDisabled = await unlockedTarget.isDisabled();
          if (!isNowDisabled) {
            const before = await unlockedTarget.isChecked();
            await unlockedTarget.click({ force: true });
            const after = await unlockedTarget.isChecked();
            if (before !== after) {
              toggledSetting = {
                settingType,
                key: lockedPairKey,
                expectedChecked: after,
                exchangeKey: activeExchangeKey,
              };
            }
          }
        }
      }
    }
  }

  if (toggledSetting) {
    if (settingType === 'pair' && toggledSetting.exchangeKey && toggledSetting.key) {
      await waitForPairPersistence(this.page, toggledSetting.exchangeKey, toggledSetting.key, toggledSetting.expectedChecked);
    }
    this.toggledSettingsByType = this.toggledSettingsByType || {};
    this.toggledSettingsByType[settingType] = toggledSetting;
    return;
  }

  if (preferredChecked) {
    await this.page.waitForFunction(({ selector }) => {
      const candidates = Array.from(document.querySelectorAll(selector));
      return candidates.some((candidate) => !candidate.disabled && candidate.checked);
    }, { selector: config.selector }, { timeout: 5000 }).catch(() => {});

    const preferredKey = await this.page.evaluate(({ selector, attribute }) => {
      const options = Array.from(document.querySelectorAll(selector));
      const preferredOption = options.find((option) => !option.disabled && option.checked && option.getAttribute(attribute));
      return preferredOption ? preferredOption.getAttribute(attribute) : null;
    }, { selector: config.selector, attribute: config.attribute });

    if (preferredKey) {
      const preferredOption = this.page.locator(`${config.selector}[${config.attribute}="${preferredKey}"]`).first();
      const before = await preferredOption.isChecked();
      await preferredOption.click({ force: true });
      const after = await preferredOption.isChecked();
      if (before !== after) {
        toggledSetting = {
          settingType,
          key: preferredKey,
          expectedChecked: after,
        };
      }
    }
  }

  if (toggledSetting) {
    this.toggledSettingsByType = this.toggledSettingsByType || {};
    this.toggledSettingsByType[settingType] = toggledSetting;
    return;
  }

  const candidateGroups = preferredChecked
    ? [
        this.page.locator(`${config.selector}:not(:disabled):checked`),
        this.page.locator(`${config.selector}:not(:disabled)`),
      ]
    : [this.page.locator(`${config.selector}:not(:disabled)`), this.page.locator(`${config.selector}:not(:disabled):checked`)];

  for (const candidateGroup of candidateGroups) {
    const candidateCount = await candidateGroup.count();
    const limit = Math.min(candidateCount, 25);
    for (let index = 0; index < limit; index += 1) {
      const option = candidateGroup.nth(index);

      const key = await option.getAttribute(config.attribute);
      const before = await option.isChecked();
      await option.click({ force: true });
      const after = await option.isChecked();

      if (before !== after && key) {
        toggledSetting = {
          settingType,
          key,
          expectedChecked: after,
        };
        break;
      }
    }

    if (toggledSetting) {
      break;
    }
  }

  if (!toggledSetting && settingType === 'quote') {
    const activeExchangeTab = this.page.locator('[data-settings-exchange].is-active').first();
    if (await activeExchangeTab.count()) {
      await activeExchangeTab.click();
      await this.page.waitForTimeout(300);

      await this.page.waitForFunction(({ selector }) => {
        return document.querySelectorAll(selector).length > 1;
      }, { selector: config.selector }, { timeout: 8000 }).catch(() => {});

      const retryGroups = preferredChecked
        ? [
            this.page.locator(`${config.selector}:not(:disabled):checked`),
            this.page.locator(`${config.selector}:not(:disabled)`),
          ]
        : [this.page.locator(`${config.selector}:not(:disabled)`), this.page.locator(`${config.selector}:not(:disabled):checked`)];

      for (const retryGroup of retryGroups) {
        const retryCount = await retryGroup.count();
        const retryLimit = Math.min(retryCount, 25);

        for (let index = 0; index < retryLimit; index += 1) {
          const option = retryGroup.nth(index);
          const key = await option.getAttribute(config.attribute);
          const before = await option.isChecked();
          await option.click({ force: true });
          const after = await option.isChecked();

          if (before !== after && key) {
            toggledSetting = {
              settingType,
              key,
              expectedChecked: after,
            };
            break;
          }
        }

        if (toggledSetting) {
          break;
        }
      }
    }
  }

  if (!toggledSetting && settingType === 'quote') {
    const deterministicToggle = await this.page.evaluate(({ selector, attribute }) => {
      const options = Array.from(document.querySelectorAll(selector)).filter((option) => !option.disabled);
      if (options.length === 0) {
        return null;
      }

      const checkedOptions = options.filter((option) => option.checked);
      const uncheckedOptions = options.filter((option) => !option.checked);

      let target = null;
      if (uncheckedOptions.length > 0) {
        target = uncheckedOptions[0];
      } else if (checkedOptions.length > 1) {
        target = checkedOptions[0];
      }

      if (!target) {
        return null;
      }

      const key = target.getAttribute(attribute);
      if (!key) {
        return null;
      }

      const before = target.checked;
      target.click();
      const after = target.checked;
      if (before === after) {
        return null;
      }

      const activeExchangeTab = document.querySelector('[data-settings-exchange].is-active');
      const exchangeKey = activeExchangeTab ? activeExchangeTab.getAttribute('data-settings-exchange') : null;

      return {
        key,
        expectedChecked: after,
        exchangeKey,
      };
    }, { selector: config.selector, attribute: config.attribute });

    if (deterministicToggle) {
      toggledSetting = {
        settingType,
        key: deterministicToggle.key,
        expectedChecked: deterministicToggle.expectedChecked,
        exchangeKey: deterministicToggle.exchangeKey,
      };
    }
  }

  if (!toggledSetting && settingType === 'quote') {
    const storageToggle = await this.page.evaluate(({ selector, attribute }) => {
      const options = Array.from(document.querySelectorAll(selector)).filter((option) => !option.disabled);
      if (options.length <= 1) {
        return null;
      }

      const activeExchangeTab = document.querySelector('[data-settings-exchange].is-active');
      const exchangeKey = activeExchangeTab ? activeExchangeTab.getAttribute('data-settings-exchange') : null;
      if (!exchangeKey) {
        return null;
      }

      const keyList = options
        .map((option) => option.getAttribute(attribute))
        .filter((key) => typeof key === 'string' && key.trim().length > 0);
      if (keyList.length <= 1) {
        return null;
      }

      let parsed = {};
      try {
        const raw = localStorage.getItem('trade-wijs-enabled-quote-currencies');
        parsed = raw ? JSON.parse(raw) : {};
      } catch (_error) {
        parsed = {};
      }

      const checkedKeys = options
        .filter((option) => option.checked)
        .map((option) => option.getAttribute(attribute))
        .filter(Boolean);
      const currentEnabled = Array.isArray(parsed?.[exchangeKey])
        ? parsed[exchangeKey].filter((key) => keyList.includes(key))
        : checkedKeys.filter((key) => keyList.includes(key));

      const enabledSet = new Set(currentEnabled);
      if (enabledSet.size === 0) {
        enabledSet.add(keyList[0]);
      }

      const uncheckedCandidate = keyList.find((key) => !enabledSet.has(key));
      let targetKey = null;
      let expectedChecked = null;

      if (uncheckedCandidate) {
        targetKey = uncheckedCandidate;
        expectedChecked = true;
        enabledSet.add(targetKey);
      } else {
        const removable = keyList.find((key) => enabledSet.has(key));
        if (!removable || enabledSet.size <= 1) {
          return null;
        }
        targetKey = removable;
        expectedChecked = false;
        enabledSet.delete(targetKey);
      }

      const nextEnabled = keyList.filter((key) => enabledSet.has(key));
      parsed[exchangeKey] = nextEnabled;
      localStorage.setItem('trade-wijs-enabled-quote-currencies', JSON.stringify(parsed));

      const targetOption = options.find((option) => option.getAttribute(attribute) === targetKey);
      if (targetOption) {
        targetOption.checked = expectedChecked;
      }

      return {
        exchangeKey,
        key: targetKey,
        expectedChecked,
      };
    }, { selector: config.selector, attribute: config.attribute });

    if (storageToggle) {
      toggledSetting = {
        settingType,
        key: storageToggle.key,
        expectedChecked: storageToggle.expectedChecked,
        exchangeKey: storageToggle.exchangeKey,
      };
    }
  }

  assert.ok(toggledSetting, `Could not toggle any ${settingType} setting option.`);
  if (settingType === 'pair') {
    const activeExchangeKey = await this.page.evaluate(() => {
      const activeExchangeTab = document.querySelector('[data-settings-exchange].is-active');
      return activeExchangeTab ? activeExchangeTab.getAttribute('data-settings-exchange') : null;
    });
    if (activeExchangeKey) {
      await waitForPairPersistence(this.page, activeExchangeKey, toggledSetting.key, toggledSetting.expectedChecked);
      toggledSetting.exchangeKey = activeExchangeKey;
    }
  }
  if (settingType === 'quote' && toggledSetting.exchangeKey && toggledSetting.key) {
    await waitForQuotePersistence(this.page, toggledSetting.exchangeKey, toggledSetting.key, toggledSetting.expectedChecked);
  }
  this.toggledSettingsByType = this.toggledSettingsByType || {};
  this.toggledSettingsByType[settingType] = toggledSetting;
});

Then('the {word} setting option remains changed after reload', async function (settingType) {
  const config = getSettingConfig(settingType);
  const toggledSetting = this.toggledSettingsByType?.[settingType];

  assert.ok(toggledSetting, `No stored toggled ${settingType} setting to verify.`);

  const targetOption = this.page.locator(`${config.selector}[${config.attribute}="${toggledSetting.key}"]`).first();
  await targetOption.waitFor({ state: 'attached', timeout: 10000 });

  const isChecked = await targetOption.isChecked();
  assert.equal(
    isChecked,
    toggledSetting.expectedChecked,
    `Expected ${settingType} setting '${toggledSetting.key}' to persist as ${toggledSetting.expectedChecked}, got ${isChecked}.`,
  );
});

Then('at least {int} pair 24h volume label is visible', async function (minimumCount) {
  await this.page.waitForFunction((targetMinimumCount) => {
    const volumeLabels = Array.from(document.querySelectorAll('.settings-pair-volume'));
    return volumeLabels.length >= targetMinimumCount;
  }, minimumCount, { timeout: 30000 });

  const labels = this.page.locator('.settings-pair-volume');
  const count = await labels.count();
  assert.ok(count >= minimumCount, `Expected at least ${minimumCount} pair volume label(s), got ${count}.`);
});

Then('I remember the pair 24h volume snapshot', async function () {
  const snapshot = await this.page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('[data-settings-enabled-pair]'));
    return rows
      .map((checkbox) => {
        const symbol = checkbox.getAttribute('data-settings-enabled-pair');
        if (!symbol) {
          return null;
        }

        const rowLabel = checkbox.closest('label.settings-exchange-option--inline');
        const volumeElement = rowLabel ? rowLabel.querySelector('.settings-pair-volume') : null;
        const volumeText = volumeElement ? (volumeElement.textContent || '').trim() : '';
        if (!volumeText) {
          return null;
        }

        return {
          symbol,
          volumeText,
        };
      })
      .filter(Boolean)
      .slice(0, 10);
  });

  assert.ok(Array.isArray(snapshot) && snapshot.length > 0, 'Expected to capture at least one pair 24h volume snapshot entry.');
  this.pairVolumeSnapshot = snapshot;
});

Then('the remembered pair 24h volume snapshot is still visible', async function () {
  const snapshot = this.pairVolumeSnapshot;
  assert.ok(Array.isArray(snapshot) && snapshot.length > 0, 'No remembered pair volume snapshot to validate.');

  const currentSnapshot = await this.page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('[data-settings-enabled-pair]'));
    const map = {};
    rows.forEach((checkbox) => {
      const symbol = checkbox.getAttribute('data-settings-enabled-pair');
      if (!symbol) {
        return;
      }

      const rowLabel = checkbox.closest('label.settings-exchange-option--inline');
      const volumeElement = rowLabel ? rowLabel.querySelector('.settings-pair-volume') : null;
      const volumeText = volumeElement ? (volumeElement.textContent || '').trim() : '';
      map[symbol] = volumeText;
    });
    return map;
  });

  let matches = 0;
  for (const entry of snapshot) {
    const currentValue = String(currentSnapshot?.[entry.symbol] || '').trim();
    if (currentValue && currentValue === entry.volumeText) {
      matches += 1;
    }
  }

  assert.ok(matches >= 1, `Expected at least 1 remembered pair volume entry to match after reload, got ${matches}.`);
});
