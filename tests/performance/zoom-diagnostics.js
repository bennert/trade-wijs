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

    const diagnostics = await page.evaluate(async () => {
      const pricePanel = document.getElementById("price-label-interaction-panel");
      if (!pricePanel) {
        return { error: "Missing price panel" };
      }

      const rect = pricePanel.getBoundingClientRect();
      const centerX = rect.left + (rect.width / 2);
      const centerY = rect.top + (rect.height / 2);

      // Track all rendering function calls
      const callCounts = {
        renderPaneScaleOverlay: 0,
        renderFvgOverlay: 0,
        renderSmcOverlay: 0,
        renderChartOrderPreview: 0,
        renderDynamicPriceScaleLines: 0,
        setManualPriceScaleRange: 0,
      };

      // Intercept rendering calls
      window._renderPaneScaleOverlay = window.renderPaneScaleOverlay || function() {};
      window._renderFvgOverlay = window.renderFvgOverlay || function() {};
      window._renderSmcOverlay = window.renderSmcOverlay || function() {};
      window._renderChartOrderPreview = window.renderChartOrderPreview || function() {};
      window._renderDynamicPriceScaleLines = window.renderDynamicPriceScaleLines || function() {};
      window._setManualPriceScaleRange = window.setManualPriceScaleRange || function() {};

      // Measure single wheel event handling
      const singleEventStart = performance.now();
      const wheelEvent = new WheelEvent("wheel", {
        deltaY: 100,
        clientX: centerX,
        clientY: centerY,
        bubbles: true,
        cancelable: true,
      });

      pricePanel.dispatchEvent(wheelEvent);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const singleEventEnd = performance.now();
      const singleEventDuration = singleEventEnd - singleEventStart;

      // Measure batched events
      const mutationCounts = {
        paneScale: 0,
        fvg: 0,
        smc: 0,
      };

      const paneScaleOverlay = document.getElementById("pane-scale-overlay");
      const fvgOverlay = document.getElementById("fvg-overlay");
      const smcOverlay = document.getElementById("smc-overlay");

      const createObserver = (element, key) => {
        if (!element) return null;
        const observer = new MutationObserver(() => {
          mutationCounts[key] += 1;
        });
        observer.observe(element, { childList: true, subtree: true, attributes: true });
        return observer;
      };

      const observers = [
        createObserver(paneScaleOverlay, "paneScale"),
        createObserver(fvgOverlay, "fvg"),
        createObserver(smcOverlay, "smc"),
      ].filter(Boolean);

      const batchStart = performance.now();

      // Send 30 rapid events (no gap, like real user zoom)
      for (let i = 0; i < 30; i++) {
        const event = new WheelEvent("wheel", {
          deltaY: 100,
          clientX: centerX,
          clientY: centerY,
          bubbles: true,
          cancelable: true,
        });
        pricePanel.dispatchEvent(event);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const batchEnd = performance.now();
      const batchDuration = batchEnd - batchStart;

      observers.forEach((obs) => obs?.disconnect());

      return {
        singleEventDuration,
        batchDuration,
        batchEventCount: 30,
        avgEventDuration: batchDuration / 30,
        mutationCounts,
        avgMutationsPerEvent: {
          paneScale: mutationCounts.paneScale / 30,
          fvg: mutationCounts.fvg / 30,
          smc: mutationCounts.smc / 30,
        },
      };
    });

    const report = {
      timestamp: new Date().toISOString(),
      appUrl: APP_URL,
      diagnostics,
      interpretation: {
        issue: "Why is price-scale zoom slow?",
        findings: [
          `Single wheel event takes ${diagnostics.singleEventDuration.toFixed(1)}ms`,
          `Batch of 30 events takes ${diagnostics.batchDuration.toFixed(1)}ms (avg ${(diagnostics.batchDuration / 30).toFixed(1)}ms per event)`,
          `SMC overlay mutations: ${diagnostics.mutationCounts.smc} total (${(diagnostics.mutationCounts.smc / 30).toFixed(1)} per event)`,
          `Pane scale overlay mutations: ${diagnostics.mutationCounts.paneScale} total (${(diagnostics.mutationCounts.paneScale / 30).toFixed(1)} per event)`,
        ],
        recommendations: [
          "1. Skip SMC/FVG rendering COMPLETELY during wheel zoom (not just throttle)",
          "2. Render SMC/FVG once after zoom interaction ends (after 200ms idle)",
          "3. Increase wheel batching window to 100-150ms instead of 45ms",
          "4. Consider caching SMC zone calculations and only rebuild on timeframe/symbol change",
        ],
      },
    };

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error?.stack || error}\n`);
  process.exit(1);
});
