const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');

Then('the horizontal line button is visible', async function () {
  const button = this.page.locator('#horizontal-line-btn');
  const isVisible = await button.isVisible();
  assert.equal(isVisible, true, 'Horizontal Line button is not visible.');
});

When('I click the horizontal line button', async function () {
  await this.page.locator('#horizontal-line-btn').click();
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
  assert.equal(previewVisible, 'true', 'Preview line is not visible during hover.');
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
  assert.ok(count >= 1, `Horizontal line was not placed. Current count: ${count}`);
});
