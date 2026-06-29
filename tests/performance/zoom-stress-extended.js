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

    console.log("Extended stress test: many indicator toggles + zoom cycles + idle...\n");

    // Get baseline
    let baseline = await page.evaluate(() => {
      const perf = performance.memory || {};
      return {
        heapUsed: Math.round(perf.usedJSHeapSize / 1048576),
      };
    });
    console.log(`Baseline heap: ${baseline.heapUsed}MB\n`);

    const rect = await page.locator("#price-label-interaction-panel").boundingBox();
    let totalToggles = 0;
    let totalWheelEvents = 0;

    // 6 cycles of intensive interactions
    for (let cycle = 1; cycle <= 6; cycle++) {
      console.log(`=== CYCLE ${cycle} ===`);
      
      // Toggle ALL indicators multiple times rapidly
      for (let toggle = 0; toggle < 5; toggle++) {
        const indicators = ["smc", "bollingerBands", "stochastic", "rsi", "volume"];
        for (const indName of indicators) {
          const cb = await page.$(`[data-indicator='${indName}'] [role='checkbox']`);
          if (cb) {
            await cb.evaluate(el => el.click());
            totalToggles++;
            await page.waitForTimeout(30); // Rapid but not instant
          }
        }
      }

      // Send 200 wheel events (more intensive)
      for (let i = 0; i < 200; i++) {
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
      }

      // Longer idle to let things settle and potential issues appear
      await page.waitForTimeout(5000);

      // Check memory and responsiveness
      const memory = await page.evaluate(() => {
        const perf = performance.memory || {};
        return {
          heapUsed: Math.round(perf.usedJSHeapSize / 1048576),
        };
      });

      const response = await page.evaluate(() => {
        const start = performance.now();
        let sum = 0;
        for (let i = 0; i < 200000; i++) {
          sum += Math.sqrt(i);
        }
        return performance.now() - start;
      });

      const heapGrowth = memory.heapUsed - baseline.heapUsed;
      const isResponsive = response < 100;
      
      console.log(`  After ${totalToggles} toggles, ${totalWheelEvents} wheel events`);
      console.log(`  Heap: ${memory.heapUsed}MB (Δ${heapGrowth}MB)`);
      console.log(`  Response time: ${response.toFixed(2)}ms - ${isResponsive ? "✓" : "✗"}`);
      
      if (!isResponsive) {
        console.log(`  ⚠⚠⚠ SLOW RESPONSE DETECTED!`);
      }
      if (heapGrowth > 50) {
        console.log(`  ⚠⚠⚠ SIGNIFICANT HEAP GROWTH!`);
      }
      console.log();
    }

    const final = await page.evaluate(() => {
      const perf = performance.memory || {};
      return {
        heapUsed: Math.round(perf.usedJSHeapSize / 1048576),
      };
    });

    const totalGrowth = final.heapUsed - baseline.heapUsed;
    console.log(`=== SUMMARY ===`);
    console.log(`Total toggles: ${totalToggles}`);
    console.log(`Total wheel events: ${totalWheelEvents}`);
    console.log(`Final heap growth: ${totalGrowth}MB`);
    
    if (totalGrowth > 50) {
      console.log("⚠ Significant memory accumulation detected - likely memory leak");
    } else {
      console.log("✓ Memory stable - issue may be in rendering/DOM operations");
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
