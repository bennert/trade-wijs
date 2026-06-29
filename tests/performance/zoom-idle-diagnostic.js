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

    console.log("Starting indicator toggle + zoom + idle test...\n");

    // Get baseline
    let baseline = await page.evaluate(() => {
      const perf = performance.memory || {};
      return {
        heapUsed: Math.round(perf.usedJSHeapSize / 1048576),
      };
    });
    console.log(`Baseline heap: ${baseline.heapUsed}MB`);

    // Cycle 1: Toggle indicators multiple times
    console.log("\n=== CYCLE 1: Toggle indicators ===");
    
    // Open settings
    await page.click("#left-menu-settings-btn");
    await page.waitForTimeout(300);
    
    // Find and toggle indicator checkboxes
    const indicatorToggles = await page.locator("[data-settings-enabled-indicator]").all();
    console.log(`  Found ${indicatorToggles.length} indicator toggles`);
    
    for (let i = 0; i < Math.min(3, indicatorToggles.length); i++) {
      try {
        await indicatorToggles[i].click();
        await page.waitForTimeout(150);
        console.log(`  Toggled indicator ${i + 1}`);
      } catch (e) {
        console.log(`  Skip indicator ${i + 1}: ${e.message}`);
      }
    }
    
    // Close settings
    await page.click("#left-menu-trade-btn");
    await page.waitForTimeout(300);

    // Cycle 2: Wheel zoom
    console.log("\n=== CYCLE 2: Wheel zoom ===");
    const rect = await page.locator("#price-label-interaction-panel").boundingBox();
    for (let i = 0; i < 100; i++) {
      await page.evaluate(async (y) => {
        const pricePanel = document.getElementById("price-label-interaction-panel");
        if (!pricePanel) return;
        const wheelEvent = new WheelEvent("wheel", {
          deltaY: i % 2 === 0 ? 100 : -100,
          clientX: pricePanel.getBoundingClientRect().left + 50,
          clientY: y,
          bubbles: true,
          cancelable: true,
        });
        pricePanel.dispatchEvent(wheelEvent);
      }, rect.y + (rect.height / 2));
    }
    console.log("  Sent 100 wheel events");

    // Wait idle
    console.log("\n=== Waiting 2 minutes idle ===");
    for (let min = 0; min < 2; min++) {
      await page.waitForTimeout(30000);
      
      const memory = await page.evaluate(() => {
        const perf = performance.memory || {};
        return {
          heapUsed: Math.round(perf.usedJSHeapSize / 1048576),
          heapLimit: Math.round(perf.jsHeapSizeLimit / 1048576),
        };
      });

      // Check responsiveness
      const response = await page.evaluate(() => {
        const start = performance.now();
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += Math.sqrt(i);
        }
        return performance.now() - start;
      });

      const heapGrowth = memory.heapUsed - baseline.heapUsed;
      console.log(`  +${30 * (min + 1)}s: Heap ${memory.heapUsed}MB (Δ${heapGrowth}MB) | Response: ${response.toFixed(2)}ms`);

      if (response > 100) {
        console.log(`    ⚠ SLOW RESPONSE! Likely memory leak or DOM accumulation`);
      }
    }

    // Final diagnosis
    const final = await page.evaluate(() => {
      const perf = performance.memory || {};
      return {
        heapUsed: Math.round(perf.usedJSHeapSize / 1048576),
        heapLimit: Math.round(perf.jsHeapSizeLimit / 1048576),
      };
    });

    const totalGrowth = final.heapUsed - baseline.heapUsed;
    console.log(`\n=== FINAL ===`);
    console.log(`Total heap growth: ${totalGrowth}MB`);
    if (totalGrowth > 50) {
      console.log("⚠ SIGNIFICANT MEMORY LEAK - likely DOM nodes accumulating in overlays");
    }

  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error?.stack || error}\n`);
  process.exit(1);
});
