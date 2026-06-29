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

    console.log("EXTENDED STRESS TEST: Simulating 10+ minutes of heavy user activity\n");

    let baseline = await page.evaluate(() => {
      const perf = performance.memory || {};
      return { heapUsed: Math.round(perf.usedJSHeapSize / 1048576) };
    });
    console.log(`Baseline heap: ${baseline.heapUsed}MB\n`);

    const rect = await page.locator("#price-label-interaction-panel").boundingBox();
    let cycleCount = 0;
    let totalToggleClicks = 0;
    let totalWheelEvents = 0;

    // 10 EXTENDED CYCLES (each ~1 min)
    for (let cycle = 1; cycle <= 10; cycle++) {
      cycleCount++;
      console.log(`=== CYCLE ${cycle}/10 (${cycle}:00 elapsed) ===`);

      // Rapid indicator toggles
      const indicators = ["bb", "fvg", "rsi", "smc", "stoch", "volume"];
      for (let pass = 0; pass < 5; pass++) {
        for (const ind of indicators) {
          await page.evaluate((indName) => {
            const btn = document.querySelector(`[data-indicator="${indName}"]`);
            if (btn) btn.click();
          }, ind);
          totalToggleClicks++;
        }
      }

      // Very intensive wheel events (300 per cycle)
      for (let i = 0; i < 300; i++) {
        await page.evaluate(async (data) => {
          const pricePanel = document.getElementById("price-label-interaction-panel");
          if (!pricePanel) return;
          const wheelEvent = new WheelEvent("wheel", {
            deltaY: data.delta,
            clientX: pricePanel.getBoundingClientRect().left + 50,
            clientY: data.centerY,
            bubbles: true,
            cancelable: true,
          });
          pricePanel.dispatchEvent(wheelEvent);
        }, {
          delta: i % 2 === 0 ? 100 : -100,
          centerY: rect.y + (rect.height / 2),
        });
        totalWheelEvents++;
        
        // Give JS engine chance to breathe
        if (i % 50 === 0) {
          await page.waitForTimeout(10);
        }
      }

      // Longer idle
      console.log(`  Idle 5 seconds...`);
      await page.waitForTimeout(5000);

      // Measure
      const memory = await page.evaluate(() => {
        const perf = performance.memory || {};
        return { 
          heapUsed: Math.round(perf.usedJSHeapSize / 1048576),
          heapLimit: Math.round(perf.jsHeapSizeLimit / 1048576)
        };
      });

      const response = await page.evaluate(() => {
        const start = performance.now();
        let sum = 0;
        for (let i = 0; i < 300000; i++) {
          sum += Math.sqrt(i);
        }
        return performance.now() - start;
      });

      const heapGrowth = memory.heapUsed - baseline.heapUsed;
      const isResponsive = response < 150;
      const trend = heapGrowth > 30 ? "⚠ GROWING" : "✓";

      console.log(`  Toggles: ${totalToggleClicks}, Wheel: ${totalWheelEvents}`);
      console.log(`  Heap: ${memory.heapUsed}MB (Δ${heapGrowth}MB) ${trend}`);
      console.log(`  Response: ${response.toFixed(2)}ms ${isResponsive ? "✓ FAST" : "⚠⚠ SLOW"}`);

      if (!isResponsive) {
        console.log(`  ⚠⚠⚠ SLOW! This matches user complaint!`);
        break; // Stop on first slow response to save time
      }
      console.log();
    }

    const final = await page.evaluate(() => {
      const perf = performance.memory || {};
      return { heapUsed: Math.round(perf.usedJSHeapSize / 1048576) };
    });

    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Cycles completed: ${cycleCount}`);
    console.log(`Total indicator toggles: ${totalToggleClicks}`);
    console.log(`Total wheel events: ${totalWheelEvents}`);
    console.log(`Final heap: ${final.heapUsed}MB`);
    console.log(`Total heap growth: ${final.heapUsed - baseline.heapUsed}MB`);
    
    if (final.heapUsed - baseline.heapUsed > 50) {
      console.log("\n⚠ MEMORY LEAK DETECTED - Check renderSmcOverlay/renderFvgOverlay for DOM cleanup");
    } else {
      console.log("\n✓ Memory appears stable - issue may be elsewhere");
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
