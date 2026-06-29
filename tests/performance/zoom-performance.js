const { chromium } = require("@playwright/test");
const { execSync } = require("child_process");
const path = require("path");

const APP_URL = process.env.TRADE_WIJS_URL || "http://localhost:3175";
const PROJECT_ROOT = process.env.TRADE_WIJS_ROOT || path.join(__dirname, "..", "..");

function percentile(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(1, p));
  const index = Math.floor((sortedValues.length - 1) * clamped);
  return Number(sortedValues[index]) || 0;
}

async function runWheelScenario(page, scenario) {
  const result = await page.evaluate(async (input) => {
    const {
      selector,
      scenarioName,
      eventCount,
      intervalMs,
      primaryDelta,
      settleDelayMs,
    } = input;

    const target = document.querySelector(selector);
    if (!target) {
      return {
        scenarioName,
        error: `Missing target element: ${selector}`,
      };
    }

    const paneScaleOverlay = document.getElementById("pane-scale-overlay");
    const fvgOverlay = document.getElementById("fvg-overlay");
    const smcOverlay = document.getElementById("smc-overlay");

    const overlayMutationState = {
      paneScale: 0,
      fvg: 0,
      smc: 0,
    };

    const createObserver = (element, key) => {
      if (!element) {
        return null;
      }
      const observer = new MutationObserver((records) => {
        overlayMutationState[key] += records.length;
      });
      observer.observe(element, { childList: true, subtree: true, attributes: true });
      return observer;
    };

    const observers = [
      createObserver(paneScaleOverlay, "paneScale"),
      createObserver(fvgOverlay, "fvg"),
      createObserver(smcOverlay, "smc"),
    ].filter(Boolean);

    const frameDeltas = [];
    let rafRunning = true;
    let rafHandle = null;
    let previousRafTs = performance.now();

    const rafTick = (ts) => {
      const delta = ts - previousRafTs;
      previousRafTs = ts;
      frameDeltas.push(delta);
      if (!rafRunning) {
        return;
      }
      rafHandle = window.requestAnimationFrame(rafTick);
    };

    rafHandle = window.requestAnimationFrame(rafTick);

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);

    const startTime = performance.now();
    for (let index = 0; index < eventCount; index += 1) {
      const isZoomOut = index % 2 === 0;
      const deltaY = isZoomOut ? primaryDelta : -primaryDelta;
      const wheelEvent = new WheelEvent("wheel", {
        deltaY,
        clientX: centerX,
        clientY: centerY,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(wheelEvent);
      await new Promise((resolve) => {
        window.setTimeout(resolve, intervalMs);
      });
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, settleDelayMs);
    });

    const endTime = performance.now();
    rafRunning = false;
    if (rafHandle !== null) {
      window.cancelAnimationFrame(rafHandle);
    }
    observers.forEach((observer) => observer.disconnect());

    const validFrameDeltas = frameDeltas
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0 && value < 1000)
      .sort((left, right) => left - right);

    const avgFrameMs = validFrameDeltas.length > 0
      ? validFrameDeltas.reduce((sum, value) => sum + value, 0) / validFrameDeltas.length
      : 0;
    const p95FrameMs = validFrameDeltas.length > 0
      ? validFrameDeltas[Math.floor((validFrameDeltas.length - 1) * 0.95)]
      : 0;
    const maxFrameMs = validFrameDeltas.length > 0
      ? validFrameDeltas[validFrameDeltas.length - 1]
      : 0;
    const jank32Count = validFrameDeltas.filter((value) => value > 32).length;
    const jank50Count = validFrameDeltas.filter((value) => value > 50).length;

    return {
      scenarioName,
      target: selector,
      wheelEventsSent: eventCount,
      durationMs: endTime - startTime,
      avgFrameMs,
      p95FrameMs,
      maxFrameMs,
      effectiveFps: avgFrameMs > 0 ? 1000 / avgFrameMs : 0,
      jank32Count,
      jank50Count,
      overlayMutations: {
        paneScale: overlayMutationState.paneScale,
        fvg: overlayMutationState.fvg,
        smc: overlayMutationState.smc,
      },
    };
  }, scenario);

  return result;
}

async function main() {
  // Restart app to ensure fresh code after modifications
  try {
    process.stdout.write("Restarting app for fresh code...\n");
    const stopScript = path.join(PROJECT_ROOT, "stop.ps1");
    const startScript = path.join(PROJECT_ROOT, "start.ps1");
    execSync(`powershell.exe -Command "& '${stopScript}'; & '${startScript}'"`, {
      stdio: "inherit",
      timeout: 240000,
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    process.stdout.write("App restarted successfully.\n");
  } catch (error) {
    process.stderr.write(`Warning: Could not restart app: ${error?.message || error}\n`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(APP_URL, { waitUntil: "networkidle" });
    await page.waitForSelector("#tv-chart", { timeout: 30000 });
    await page.waitForTimeout(1200);

    const scenarios = [
      {
        selector: "#tv-chart",
        scenarioName: "chart-wheel-zoom",
        eventCount: 180,
        intervalMs: 8,
        primaryDelta: 100,
        settleDelayMs: 800,
      },
      {
        selector: "#price-label-interaction-panel",
        scenarioName: "price-scale-wheel-zoom",
        eventCount: 180,
        intervalMs: 8,
        primaryDelta: 100,
        settleDelayMs: 800,
      },
    ];

    const results = [];
    for (const scenario of scenarios) {
      const scenarioResult = await runWheelScenario(page, scenario);
      results.push(scenarioResult);
    }

    const successfulResults = results.filter((item) => !item.error);
    const allP95Values = successfulResults
      .map((item) => Number(item.p95FrameMs))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((left, right) => left - right);

    const summary = {
      appUrl: APP_URL,
      capturedAtUtc: new Date().toISOString(),
      scenarioCount: results.length,
      successfulScenarioCount: successfulResults.length,
      avgEffectiveFps: successfulResults.length > 0
        ? successfulResults.reduce((sum, item) => sum + Number(item.effectiveFps || 0), 0) / successfulResults.length
        : 0,
      worstP95FrameMs: allP95Values.length > 0 ? allP95Values[allP95Values.length - 1] : 0,
      medianP95FrameMs: percentile(allP95Values, 0.5),
    };

    const output = {
      summary,
      scenarios: results,
    };

    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`zoom-performance failed: ${error?.stack || error}\n`);
  process.exit(1);
});