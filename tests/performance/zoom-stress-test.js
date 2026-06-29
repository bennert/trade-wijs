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

    console.log("Starting AGGRESSIVE continuous wheel zoom test (simulating user holding scroll)...\n");

    // Run continuous wheel events for extended period
    const durations = [];
    
    for (let minute = 1; minute <= 3; minute++) {
      console.log(`\n=== MINUTE ${minute} ===`);
      
      const startTime = Date.now();
      const responseTimes = [];

      // Rapidly send 500 wheel events per minute (simulating rapid zooming)
      for (let i = 0; i < 500; i++) {
        await page.evaluate(async () => {
          const pricePanel = document.getElementById("price-label-interaction-panel");
          if (!pricePanel) return;
          const rect = pricePanel.getBoundingClientRect();
          const wheelEvent = new WheelEvent("wheel", {
            deltaY: Math.random() > 0.5 ? 100 : -100,
            clientX: rect.left + (rect.width / 2),
            clientY: rect.top + (rect.height / 2),
            bubbles: true,
            cancelable: true,
          });
          pricePanel.dispatchEvent(wheelEvent);
        });

        // Every 50 events, check responsiveness
        if (i % 50 === 0) {
          const responseTime = await page.evaluate(() => {
            const start = performance.now();
            let sum = 0;
            for (let j = 0; j < 50000; j++) {
              sum += Math.sqrt(j);
            }
            return performance.now() - start;
          });
          responseTimes.push(responseTime);
        }
      }

      const cycleTime = Date.now() - startTime;
      const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponse = Math.max(...responseTimes);
      const isSlowDown = maxResponse > 50;

      durations.push(cycleTime);
      console.log(`  Duration: ${cycleTime}ms`);
      console.log(`  Avg response: ${avgResponse.toFixed(2)}ms`);
      console.log(`  Max response: ${maxResponse.toFixed(2)}ms`);
      console.log(`  Status: ${isSlowDown ? "⚠ SLOW! May indicate memory leak" : "✓ OK"}`);

      // Check memory
      const memory = await page.evaluate(() => {
        const perf = performance.memory || {};
        return {
          used: Math.round(perf.usedJSHeapSize / 1048576),
          limit: Math.round(perf.jsHeapSizeLimit / 1048576),
        };
      });
      console.log(`  Heap: ${memory.used}MB / ${memory.limit}MB`);

      // Wait before next cycle
      await page.waitForTimeout(1000);
    }

    // Analyze trends
    console.log("\n=== TREND ANALYSIS ===");
    if (durations[1] > durations[0] * 1.2) {
      console.log("⚠ Performance DEGRADING - likely memory leak!");
    } else if (durations[2] > durations[1] * 1.2) {
      console.log("⚠ Performance DEGRADING in later cycles!");
    } else {
      console.log("✓ Performance stable");
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
