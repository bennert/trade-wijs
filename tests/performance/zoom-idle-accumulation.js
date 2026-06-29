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

    console.log("Testing continuous wheel zoom + idle for memory accumulation...\n");

    // Get baseline
    let baseline = await page.evaluate(() => {
      const perf = performance.memory || {};
      return {
        heapUsed: Math.round(perf.usedJSHeapSize / 1048576),
      };
    });
    console.log(`Baseline heap: ${baseline.heapUsed}MB\n`);

    // Run multiple zoom cycles with idle between
    for (let cycle = 1; cycle <= 4; cycle++) {
      console.log(`=== CYCLE ${cycle}: Zoom + Idle ===`);
      
      // Get chart rect
      const rect = await page.locator("#price-label-interaction-panel").boundingBox();
      
      // Send 150 wheel events (up and down)
      for (let i = 0; i < 150; i++) {
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
      }
      console.log(`  Sent 150 wheel events`);

      // Idle period
      await page.waitForTimeout(3000);

      // Check memory
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
      const isResponsive = response < 50;
      
      console.log(`  Heap: ${memory.heapUsed}MB (Δ${heapGrowth}MB)`);
      console.log(`  Response time: ${response.toFixed(2)}ms - ${isResponsive ? "✓" : "✗"}`);
      
      if (!isResponsive) {
        console.log(`  ⚠⚠⚠ UNRESPONSIVE! This is the issue!`);
      }
    }

    const final = await page.evaluate(() => {
      const perf = performance.memory || {};
      return {
        heapUsed: Math.round(perf.usedJSHeapSize / 1048576),
      };
    });

    const totalGrowth = final.heapUsed - baseline.heapUsed;
    console.log(`\n=== TOTAL ===`);
    console.log(`Heap growth: ${totalGrowth}MB`);
    if (totalGrowth > 30) {
      console.log("⚠ Significant memory accumulation detected");
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
