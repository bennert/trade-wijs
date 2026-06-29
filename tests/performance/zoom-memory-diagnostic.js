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

    console.log("Starting continuous wheel zoom test...\n");

    // Run 5 cycles of wheel zoom to detect accumulation
    for (let cycle = 0; cycle < 5; cycle++) {
      console.log(`\n=== CYCLE ${cycle + 1} ===`);

      const rect = await page.locator("#price-label-interaction-panel").boundingBox();
      const centerY = rect.y + (rect.height / 2);

      const metricsBeforeCycle = await page.evaluate(() => {
        return {
          timerCount: 0,
          mutationObserverCount: 0,
          timestamp: Date.now(),
        };
      });

      console.log(`Before cycle: Starting wheel zoom...`);

      // Send 30 wheel events
      for (let i = 0; i < 30; i++) {
        await page.evaluate(async (y) => {
          const pricePanel = document.getElementById("price-label-interaction-panel");
          const rect = pricePanel.getBoundingClientRect();
          const wheelEvent = new WheelEvent("wheel", {
            deltaY: 100,
            clientX: rect.left + (rect.width / 2),
            clientY: y,
            bubbles: true,
            cancelable: true,
          });
          pricePanel.dispatchEvent(wheelEvent);
        }, centerY);
        
        // Small delay between events to let batching happen
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      // Wait for idle
      await new Promise((resolve) => setTimeout(resolve, 500));

      const metricsAfterCycle = await page.evaluate(async () => {
        // Force a GC-like measurement by checking memory-related data
        const perfMemory = performance.memory || {};
        return {
          heapUsed: Math.round(perfMemory.usedJSHeapSize / 1048576),
          heapLimit: Math.round(perfMemory.jsHeapSizeLimit / 1048576),
          timestamp: Date.now(),
        };
      });

      console.log(`After cycle: Heap ~${metricsAfterCycle.heapUsed}MB / ${metricsAfterCycle.heapLimit}MB`);

      // Check if page is still responsive
      const isResponsive = await page.evaluate(() => {
        const start = performance.now();
        // Simple calculation
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += Math.sqrt(i);
        }
        const duration = performance.now() - start;
        return { duration, isResponsive: duration < 100 };
      });

      console.log(`Response time: ${isResponsive.duration.toFixed(2)}ms - Responsive: ${isResponsive.isResponsive ? "✓ YES" : "✗ NO (SLOW!)"}`);
    }

    console.log("\n=== TEST COMPLETE ===");
    console.log("If responsiveness degrades over cycles, there's likely a memory leak or accumulating timers.");

  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error?.stack || error}\n`);
  process.exit(1);
});
