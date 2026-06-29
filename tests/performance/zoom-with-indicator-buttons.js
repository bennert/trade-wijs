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

    console.log("Testing indicator button toggles (via chart UI) + zoom + idle...\n");

    let baseline = await page.evaluate(() => {
      const perf = performance.memory || {};
      return { heapUsed: Math.round(perf.usedJSHeapSize / 1048576) };
    });
    console.log(`Baseline heap: ${baseline.heapUsed}MB\n`);

    const rect = await page.locator("#price-label-interaction-panel").boundingBox();
    let totalToggles = 0;

    // 5 cycles
    for (let cycle = 1; cycle <= 5; cycle++) {
      console.log(`=== CYCLE ${cycle} ===`);

      // Toggle all indicator buttons several times via JavaScript
      const indicators = ["bb", "fvg", "rsi", "smc", "stoch", "volume"];
      for (let toggle = 0; toggle < 3; toggle++) {
        for (const ind of indicators) {
          await page.evaluate((indName) => {
            const btn = document.querySelector(`[data-indicator="${indName}"]`);
            if (btn) btn.click();
          }, ind);
          totalToggles++;
          await page.waitForTimeout(50);
        }
      }
      console.log(`  Toggled ${18} indicator buttons`);

      // Send 200 wheel events
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
      }
      console.log(`  Sent 200 wheel events`);

      // Idle 5 seconds
      await page.waitForTimeout(5000);

      // Check memory
      const memory = await page.evaluate(() => {
        const perf = performance.memory || {};
        return { heapUsed: Math.round(perf.usedJSHeapSize / 1048576) };
      });

      // Check responsiveness
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

      console.log(`  Heap: ${memory.heapUsed}MB (Δ${heapGrowth}MB)`);
      console.log(
        `  Response time: ${response.toFixed(2)}ms - ${isResponsive ? "✓" : "✗"}`
      );

      if (!isResponsive) {
        console.log(` ⚠⚠⚠ UNRESPONSIVE!`);
      }
      console.log();
    }

    const final = await page.evaluate(() => {
      const perf = performance.memory || {};
      return { heapUsed: Math.round(perf.usedJSHeapSize / 1048576) };
    });

    console.log(`=== SUMMARY ===`);
    console.log(`Total indicator toggles: ${totalToggles}`);
    console.log(`Final heap: ${final.heapUsed}MB`);
    console.log(`Heap growth: ${final.heapUsed - baseline.heapUsed}MB`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error?.stack || error}\n`);
  process.exit(1);
});
