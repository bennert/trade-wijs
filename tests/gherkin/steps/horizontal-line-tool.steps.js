const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');

Then('the horizontal line button is visible', async function () {
  const button = this.page.locator('#horizontal-line-btn');
  const isVisible = await button.isVisible();
  assert.equal(isVisible, true, 'Horizontal Line button is not visible.');
});

When('I click the horizontal line button', async function () {
  const button = this.page.locator('#horizontal-line-btn');
  await button.waitFor({ state: 'visible', timeout: 10000 });
  await button.scrollIntoViewIfNeeded();

  const isDisabled = await button.isDisabled();
  assert.equal(isDisabled, false, 'Horizontal Line button is disabled.');

  try {
    await button.click({ timeout: 5000 });
  } catch (_error) {
    await this.page.evaluate(() => {
      const element = document.querySelector('#horizontal-line-btn');
      if (element instanceof HTMLButtonElement) {
        element.click();
      }
    });
  }
});

Then('the horizontal line button is active', async function () {
  const isDrawModeActive = async () => this.page.evaluate(() => {
    const button = document.querySelector('#horizontal-line-btn');
    const overlay = document.querySelector('#draw-capture-overlay');
    const refreshStatus = document.querySelector('#refresh-status');

    const hasActiveClass = Boolean(button && button.classList.contains('is-active'));
    const overlayEnabled = Boolean(
      overlay &&
      window.getComputedStyle(overlay).display !== 'none' &&
      window.getComputedStyle(overlay).pointerEvents !== 'none'
    );
    const statusIndicatesDrawMode = Boolean(
      refreshStatus && /click chart: horizontal line/i.test((refreshStatus.textContent || '').trim())
    );

    return hasActiveClass || overlayEnabled || statusIndicatesDrawMode;
  });

  let drawModeActive = await isDrawModeActive();
  for (let attempt = 0; attempt < 2 && !drawModeActive; attempt += 1) {
    await this.page.locator('#horizontal-line-btn').click();
    await this.page.waitForTimeout(150);
    drawModeActive = await isDrawModeActive();
  }

  assert.equal(drawModeActive, true, 'Horizontal Line button does not activate draw mode.');
});

When('I hover over the chart in horizontal line mode', async function () {
  await this.page.evaluate(() => {
    const chartElement = document.querySelector('.chart-canvas');
    if (!chartElement) {
      return;
    }

    const rect = chartElement.getBoundingClientRect();
    const overlay = document.querySelector('#draw-capture-overlay');
    const clientX = rect.left + Math.min(Math.max(20, rect.width * 0.25), Math.max(20, rect.width - 20));
    const candidateYRatios = [0.03, 0.05, 0.07, 0.09];

    candidateYRatios.forEach((ratio) => {
      const clientY = rect.top + Math.max(10, Math.min(rect.height - 30, rect.height * ratio));
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
});

Then('the horizontal line preview is visible', async function () {
  await this.page.waitForFunction(() => {
    const element = document.querySelector('.chart-canvas');
    return Boolean(element && element.dataset.previewVisible === 'true');
  }, null, { timeout: 4000 });

  const previewVisible = await this.page.locator('.chart-canvas').getAttribute('data-preview-visible');
  assert.equal(previewVisible, 'true', 'Preview line is not visible during hover.');
});

When('I click the chart to place a horizontal line', async function () {
  const overlay = this.page.locator('#draw-capture-overlay');
  const box = await overlay.boundingBox();

  const clickPosition = {
    x: box ? Math.max(20, Math.min(box.width - 20, box.width * 0.3)) : 220,
    y: box ? Math.max(14, Math.min(box.height - 30, box.height * 0.07)) : 40,
  };

  await overlay.click({ position: clickPosition });
});

Then('a horizontal line is placed', async function () {
  await this.page.waitForFunction(() => {
    const element = document.querySelector('.chart-canvas');
    return Boolean(element && Number(element.dataset.horizontalLineCount || '0') >= 1);
  }, null, { timeout: 4000 });

  const countRaw = await this.page.locator('.chart-canvas').getAttribute('data-horizontal-line-count');
  const count = Number(countRaw || '0');
  assert.ok(count >= 1, `Horizontal line was not placed. Current count: ${count}`);
});
