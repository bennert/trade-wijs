const { chromium } = require("@playwright/test");

const APP_URL = "http://localhost:3175";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(APP_URL, { waitUntil: "networkidle" });
    await page.waitForSelector("#tv-chart", { timeout: 30000 });
    await page.waitForTimeout(1200);

    const deepDiagnostics = await page.evaluate(async () => {
      const pricePanel = document.getElementById("price-label-interaction-panel");
      const rect = pricePanel.getBoundingClientRect();
      const centerY = rect.top + (rect.height / 2);

      const timings = {
        renderFvg: [],
        renderSmc: [],
        renderPaneScale: [],
        priceScaleSetVisibleRange: [],
        rafTicks: [],
      };

      let rafFrameCount = 0;
      const originalRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = function(callback) {
        const start = performance.now();
        return originalRaf(() => {
          const end = performance.now();
          timings.rafTicks.push(end - start);
          rafFrameCount++;
          callback(end);
        });
      };

      // Intercept key expensive operations
      const priceScaleApi = window.chart?.priceScale?.("price");
      if (priceScaleApi) {
        const originalSetVisibleRange = priceScaleApi.setVisibleRange;
        priceScaleApi.setVisibleRange = function(range) {
          const start = performance.now();
          const result = originalSetVisibleRange.call(this, range);
          const end = performance.now();
          timings.priceScaleSetVisibleRange.push(end - start);
          return result;
        };
      }

      // Send 20 rapid wheel events
      const batchStart = performance.now();

      for (let i = 0; i < 20; i++) {
        const wheelEvent = new WheelEvent("wheel", {
          deltaY: 100,
          clientX: rect.left + (rect.width / 2),
          clientY: centerY,
          bubbles: true,
          cancelable: true,
        });
        pricePanel.dispatchEvent(wheelEvent);
      }

      // Wait for all renders to settle
      await new Promise((resolve) => setTimeout(resolve, 600));
      const batchEnd = performance.now();

      window.requestAnimationFrame = originalRaf;

      const rafAvg = timings.rafTicks.length > 0
        ? timings.rafTicks.reduce((a, b) => a + b, 0) / timings.rafTicks.length
        : 0;

      const rangeSetAvg = timings.priceScaleSetVisibleRange.length > 0
        ? timings.priceScaleSetVisibleRange.reduce((a, b) => a + b, 0) / timings.priceScaleSetVisibleRange.length
        : 0;

      return {
        totalDuration: batchEnd - batchStart,
        eventCount: 20,
        avgPerEvent: (batchEnd - batchStart) / 20,
        rafMetrics: {
          frameCount: rafFrameCount,
          avgFrameHandlerTime: rafAvg.toFixed(2),
          maxFrameHandlerTime: Math.max(...timings.rafTicks).toFixed(2),
          samples: timings.rafTicks.length,
        },
        priceScaleMetrics: {
          setVisibleRangeCalls: timings.priceScaleSetVisibleRange.length,
          avgTimePerCall: rangeSetAvg.toFixed(2),
          totalTime: timings.priceScaleSetVisibleRange.reduce((a, b) => a + b, 0).toFixed(2),
          maxTime: Math.max(...timings.priceScaleSetVisibleRange).toFixed(2),
        },
      };
    });

    const analysis = {
      timestamp: new Date().toISOString(),
      result: deepDiagnostics,
      analysis: {
        bottleneck: "The real issue",
        findings: [
          `Total time for 20 events: ${deepDiagnostics.totalDuration.toFixed(0)}ms`,
          `Average per event: ${deepDiagnostics.avgPerEvent.toFixed(1)}ms`,
          `RAF frame handler avg: ${deepDiagnostics.rafMetrics.avgFrameHandlerTime}ms`,
          `priceScale.setVisibleRange() calls: ${deepDiagnostics.priceScaleMetrics.setVisibleRangeCalls}`,
          `Each setVisibleRange() takes avg ${deepDiagnostics.priceScaleMetrics.avgTimePerCall}ms`,
          `Total time in setVisibleRange: ${deepDiagnostics.priceScaleMetrics.totalTime}ms`,
        ],
        rootCause:
          deepDiagnostics.priceScaleMetrics.setVisibleRangeCalls > 15
            ? "PROBLEM: Too many setVisibleRange() calls (not batching enough)"
            : deepDiagnostics.priceScaleMetrics.avgTimePerCall > 5
            ? "PROBLEM: Each setVisibleRange() call is expensive (likely triggers full chart reflow)"
            : "INVESTIGATION: Check if visible-range subscription triggers expensive renders",
        solution: [
          "Increase PRICE_SCALE_WHEEL_FLUSH_MS from 45 to 150-200ms to batch more events",
          "Or: Disable chart subscription updates during active wheel zoom",
          "Or: Defer visible-range updates until zoom interaction ends",
        ],
      },
    };

    process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error?.stack || error}\n`);
  process.exit(1);
});
