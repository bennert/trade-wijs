    (function () {
      // Skip SMC/FVG overlays during price-scale wheel interaction
      let isPriceScaleWheelInteracting = false;
      let priceScaleWheelIdleTimerId = null;
      let pendingOverlayRenderTimerId = null;
      const bootstrapElement = document.getElementById("trade-wijs-bootstrap");
      const bootstrap = bootstrapElement ? JSON.parse(bootstrapElement.textContent || "{}") : {};
      const appShellElement = document.querySelector(".app-shell");
      const rightPanelElement = document.querySelector(".right-panel");
      const chartFooterElement = document.getElementById("chart-footer");
      const chartElement = document.getElementById("tv-chart");
      const chartCanvas = document.querySelector(".chart-canvas");
      const scrollToRecentButtonElement = document.getElementById("scroll-to-recent-btn");
      const fvgOverlayElement = document.getElementById("fvg-overlay");
      const smcOverlayElement = document.getElementById("smc-overlay");
      const chartOrderPreviewElement = document.getElementById("chart-order-preview");
      const chartOrderPreviewSideElement = document.getElementById("chart-order-preview-side");
      const chartOrderPreviewDetailsElement = document.getElementById("chart-order-preview-details");
      const chartOrderPreviewHelpElement = document.getElementById("chart-order-preview-help");
      const chartOrderPreviewClearButtonElement = document.getElementById("chart-order-preview-clear-btn");
      const chartStopPreviewElement = document.getElementById("chart-stop-preview");
      const chartStopPreviewDetailsElement = document.getElementById("chart-stop-preview-details");
      const chartStopPreviewHelpElement = document.getElementById("chart-stop-preview-help");
      const chartOrderPreviewLineElement = document.getElementById("chart-order-preview-line");
      const chartStopPreviewLineElement = document.getElementById("chart-stop-preview-line");
      const priceHoverGuideLineElement = document.getElementById("price-hover-guide-line");
      const priceHoverGuideLabelElement = document.getElementById("price-hover-guide-label");
      const priceHoverGuideValueElement = document.getElementById("price-hover-guide-value");
      let chartMarkerTooltipElement = null;
      const horizontalLineSelectionHandleElement = document.getElementById("horizontal-line-selection-handle");
      const trendLineStartHandleElement = document.getElementById("trend-line-start-handle");
      const trendLineEndHandleElement = document.getElementById("trend-line-end-handle");
      const paneScaleOverlayElement = document.getElementById("pane-scale-overlay");
      const priceLabelInteractionPanelElement = document.getElementById("price-label-interaction-panel");
      const paneReorderOverlayElement = document.getElementById("pane-reorder-overlay");
      const stochDividerElement = document.getElementById("stoch-divider");
      const stochDividerLabelElements = [
        document.getElementById("stoch-divider-label-left"),
        document.getElementById("stoch-divider-label-right"),
      ].filter(Boolean);
      const rsiDividerElement = document.getElementById("rsi-divider");
      const rsiDividerLabelElements = [
        document.getElementById("rsi-divider-label-left"),
        document.getElementById("rsi-divider-label-right"),
      ].filter(Boolean);
      const scaleDividerElement = document.getElementById("scale-divider");
      const scaleDividerLabelElements = [
        document.getElementById("scale-divider-label-left"),
        document.getElementById("scale-divider-label-right"),
      ].filter(Boolean);
      const dataElement = document.getElementById("candles-data");
      const refreshStatusElement = document.getElementById("refresh-status");
      const timeframeButtonsElement = document.getElementById("timeframe-buttons");
      const timeframeButtonElements = Array.from(document.querySelectorAll(".timeframe-btn"));
      const indicatorButtonsElement = document.querySelector(".indicator-buttons");
      const indicatorButtonElements = Array.from(document.querySelectorAll(".indicator-btn"));
      const timeframeSettingsButtonElement = document.getElementById("timeframe-settings-btn");
      const indicatorSettingsButtonElement = document.getElementById("indicator-settings-btn");
      const undoButtonElement = document.getElementById("undo-btn");
      const drawLineButtonElement = document.getElementById("horizontal-line-btn");
      const trendLineButtonElement = document.getElementById("trend-line-btn");
      const leftMenuButtonElements = Array.from(document.querySelectorAll(".left-menu-btn"));
      const leftMenuTradeButtonElement = document.getElementById("left-menu-trade-btn");
      const leftMenuSettingsButtonElement = document.getElementById("left-menu-settings-btn");
      const settingsPanelElement = document.getElementById("settings-panel");
      const settingsCategoryTabElements = Array.from(document.querySelectorAll("[data-settings-category]"));
      const settingsCategorySectionElements = Array.from(document.querySelectorAll("[data-settings-category-section]"));
      const settingsMiddleSectionElements = Array.from(document.querySelectorAll("[data-settings-middle-section]"));
      const settingsGeneralItemTabElements = Array.from(document.querySelectorAll("[data-settings-general-item]"));
      const settingsGeneralSectionElements = Array.from(document.querySelectorAll("[data-settings-general-section]"));
      const settingsDisplayThemeRadioElements = Array.from(document.querySelectorAll("input[name='settings-display-theme']"));
      const settingsExchangeLabelElement = document.getElementById("settings-exchange-label");
      const settingsExchangeTabElements = Array.from(document.querySelectorAll("[data-settings-exchange]"));
      const settingsExchangeToggleElements = Array.from(document.querySelectorAll("[data-settings-enabled-exchange]"));
      const settingsExchangesListElement = settingsPanelElement?.querySelector(".settings-exchanges-list") || null;
      let settingsTimeframeToggleElements = Array.from(document.querySelectorAll("[data-settings-enabled-timeframe]"));
      let settingsQuoteCurrencyToggleElements = Array.from(document.querySelectorAll("[data-settings-enabled-quote-currency]"));
      let settingsPairToggleElements = Array.from(document.querySelectorAll("[data-settings-enabled-pair]"));
      const settingsToggleTimeframesButtonElement = document.getElementById("settings-toggle-timeframes-btn");
      const settingsToggleQuoteCurrenciesButtonElement = document.getElementById("settings-toggle-quote-currencies-btn");
      const settingsTogglePairsButtonElement = document.getElementById("settings-toggle-pairs-btn");
      const settingsIndicatorToggleElements = Array.from(document.querySelectorAll("[data-settings-enabled-indicator]"));
      const settingsToolToggleElements = Array.from(document.querySelectorAll("[data-settings-enabled-tool]"));
      const settingsApiKeyElement = document.getElementById("settings-api-key");
      const settingsApiSecretElement = document.getElementById("settings-api-secret");
      const settingsApiPassphraseElement = document.getElementById("settings-api-passphrase");
      const settingsActionsElement = document.getElementById("settings-actions");
      const settingsExchangeTimeframesPanelElement = document.getElementById("settings-exchange-timeframes-panel");
      const settingsPairsListElement = settingsExchangeTimeframesPanelElement?.querySelector("[aria-label='Pairs options']") || null;
      const settingsSaveButtonElement = document.getElementById("settings-save-btn");
      const settingsSaveStatusElement = document.getElementById("settings-save-status");
      const settingsFactoryResetButtonElement = document.getElementById("settings-factory-reset-btn");
      const settingsFactoryResetStatusElement = document.getElementById("settings-factory-reset-status");
      const rightPanelTabsElement = document.getElementById("right-panel-tabs");
      const panelTabButtons = Array.from(document.querySelectorAll(".panel-tab"));
      const panelOrderElement = document.getElementById("panel-order");
      const panelWatchlistElement = document.getElementById("panel-watchlist");
      const panelSignalsElement = document.getElementById("panel-signals");
      const ohlcOpenElement = document.getElementById("ohlc-open");
      const ohlcHighElement = document.getElementById("ohlc-high");
      const ohlcLowElement = document.getElementById("ohlc-low");
      const ohlcCloseElement = document.getElementById("ohlc-close");
      const ohlcBarVolumeElement = document.getElementById("ohlc-bar-volume");
      const ohlcVol24Element = document.getElementById("ohlc-vol24");
      const marketTabsElement = document.getElementById("market-tabs");
      const marketTabAddButtonElement = document.getElementById("market-tab-add-btn");
      const pairSelectorButtonElement = document.getElementById("pair-selector-btn");
      const exchangeSelectorButtonElement = document.getElementById("exchange-selector-btn");
      const timeframeLabelElement = document.getElementById("timeframe-label");
      const pairSelectorMenuElement = document.getElementById("pair-selector-menu");
      const exchangeSelectorMenuElement = document.getElementById("exchange-selector-menu");
      const rightPanelToggleButtonElement = document.getElementById("right-panel-toggle-btn");
      const marketTitleElement = document.getElementById("market-title");
      const marketInfoSectionElement = document.getElementById("market-info-section");
      const marketInfoToggleButtonElement = document.getElementById("market-info-toggle-btn");
      const marketErrorElement = document.getElementById("market-error");
      const marketInfoGridElement = document.getElementById("market-info-grid");
      const marketUpdatedElement = document.getElementById("market-updated");
      const valueLastElement = document.getElementById("value-last");
      const valueBidElement = document.getElementById("value-bid");
      const valueAskElement = document.getElementById("value-ask");
      const valueHighElement = document.getElementById("value-high");
      const valueLowElement = document.getElementById("value-low");
      const valueVolumeElement = document.getElementById("value-volume");
      const orderPriceInputElement = document.getElementById("order-price-input");
      const orderStopPriceInputElement = document.getElementById("order-stop-price-input");
      const orderAmountInputElement = document.getElementById("order-amount-input");
      const orderTotalInputElement = document.getElementById("order-total-input");
      const orderAmountBaseElement = document.getElementById("order-amount-base");
      const orderStopPriceQuoteElement = document.getElementById("order-stop-price-quote");
      const orderPriceQuoteElement = document.getElementById("order-price-quote");
      const orderTotalQuoteElement = document.getElementById("order-total-quote");
      const orderAmountLockButtonElement = document.getElementById("order-amount-lock-btn");
      const orderTotalLockButtonElement = document.getElementById("order-total-lock-btn");
      const orderStopPriceGroupElement = document.getElementById("order-stop-price-group");
      const orderActionStatusElement = document.getElementById("order-action-status");
      const orderActionButtonElements = Array.from(document.querySelectorAll("#panel-order .trade-btn"));
      const placeOrderButtonElement = document.getElementById("place-order-btn");
      const placeOrderModalElement = document.getElementById("place-order-modal");
      const placeOrderModalTitleElement = document.getElementById("place-order-modal-title");
      const placeOrderModalPayloadElement = document.getElementById("place-order-modal-payload");
      const placeOrderModalCloseButtonElement = document.getElementById("place-order-modal-close-btn");
      const paperTradeBalanceElement = document.getElementById("paper-trade-balance");
      const paperTradePositionElement = document.getElementById("paper-trade-position");
      const paperTradeOpenOrdersListElement = document.getElementById("paper-trade-open-orders-list");
      const paperTradeClosedOrdersListElement = document.getElementById("paper-trade-closed-orders-list");
      const paperTradeResetExchangeButtonElement = document.getElementById("paper-trade-reset-exchange-btn");
      const paperTradeResetAllButtonElement = document.getElementById("paper-trade-reset-all-btn");
      const orderBuyButtonElement = document.querySelector("#panel-order .buy-btn");
      const orderSellButtonElement = document.querySelector("#panel-order .sell-btn");
      const orderFillButtonElements = Array.from(document.querySelectorAll("[data-order-fill-source]"));
      const orderTypeInputElements = Array.from(document.querySelectorAll("input[name='order-type']"));
      const orderTypeStopLimitElement = document.getElementById("type-stop-limit");
      const orderTypeMarketElement = document.getElementById("type-market");
      const orderTypeStopMarketElement = document.getElementById("type-stop-market");
      const orderTypeOcoElement = document.getElementById("type-oco");
      const orderPriceFieldElement = document.getElementById("order-price-field");
      const orderPriceFillActionsElement = document.getElementById("order-price-fill-actions");

      if (!chartElement || !chartCanvas || !dataElement || !window.LightweightCharts) {
        return;
      }

      let allCandles = JSON.parse(dataElement.textContent || "[]");
      if (!Array.isArray(allCandles) || allCandles.length === 0) {
        return;
      }

      let currentTimeframe = bootstrap.timeframe || "1m";
      let latestServerTimestampSeconds = Number(marketUpdatedElement?.dataset.timestampUnix);
      let latestServerTimestampSetAtMs = Date.now();
      let currentSymbol = bootstrap.symbol || "BTC/USDT";
      let currentDisplaySymbol = bootstrap.display_symbol || "BTCUSDT";
      let currentExchangeKey = bootstrap.exchange_key || "binance";
      let currentExchangeLabel = bootstrap.exchange || "Binance";
      let activeSelectorMenu = null;
      const timeframeStorageKey = "trade-wijs-timeframe";
      const symbolStorageKey = "trade-wijs-symbol";
      const exchangeStorageKey = "trade-wijs-exchange";
      const marketTabsStorageKey = "trade-wijs-market-tabs";
      const activeMarketTabStorageKey = "trade-wijs-active-market-tab";
      const appViewModeStorageKey = "trade-wijs-app-view-mode";
      const rightPanelCollapseStorageKey = "trade-wijs-right-panel-collapsed";
      const settingsCategoryStorageKey = "trade-wijs-settings-category";
      const settingsExchangeStorageKey = "trade-wijs-settings-exchange";
      const settingsGeneralItemStorageKey = "trade-wijs-settings-general-item";
      const displayThemeStorageKey = "trade-wijs-display-theme";
      const enabledExchangesStorageKey = "trade-wijs-enabled-exchanges";
      const enabledTimeframesStorageKey = "trade-wijs-enabled-timeframes";
      const enabledQuoteCurrenciesStorageKey = "trade-wijs-enabled-quote-currencies";
      const enabledPairsStorageKey = "trade-wijs-enabled-pairs";
      const enabledIndicatorsStorageKey = "trade-wijs-enabled-indicators";
      const enabledToolsStorageKey = "trade-wijs-enabled-tools";
      const exchangeApiSettingsStorageKey = "trade-wijs-exchange-api-settings";
      let validTimeframes = new Set(timeframeButtonElements.map((button) => button.dataset.timeframe).filter(Boolean));
      let validQuoteCurrencies = new Set(
        settingsQuoteCurrencyToggleElements.map((checkbox) => checkbox.dataset.settingsEnabledQuoteCurrency).filter(Boolean),
      );
      const validIndicators = new Set(indicatorButtonElements.map((button) => button.dataset.indicator).filter(Boolean));
      const validTools = new Set(["horizontal-line", "trend-line"]);
      let validSymbols = new Set(
        Array.from(pairSelectorMenuElement?.querySelectorAll("[data-symbol]") || []).map((button) => button.dataset.symbol).filter(Boolean),
      );
      let validSettingsPairs = new Set(
        settingsPairToggleElements.map((checkbox) => checkbox.dataset.settingsEnabledPair).filter(Boolean),
      );
      const validExchangeKeys = new Set(
        Array.from(exchangeSelectorMenuElement?.querySelectorAll("[data-exchange]") || []).map((button) => button.dataset.exchange).filter(Boolean),
      );
      const exchangeSelectorMenuItemElements = Array.from(exchangeSelectorMenuElement?.querySelectorAll("[data-exchange]") || []);
      let shouldInitialTimeframeRefresh = false;
      let isRefreshing = false;
      let refreshRequestCounter = 0;
      let pendingPriorityRefresh = false;
      let pendingPriorityRefreshShowUpdating = false;
      let pendingPriorityRefreshLabel = null;
      let forceFullChartRefresh = true;
      let lastChartContextKey = null;
      let loadingTimeframe = null;
      let refreshTimerId = null;
      const renderCandleLimit = 5000;
      const maxHorizontalLines = 20;
      const horizontalLineStorageKey = `trade-wijs-horizontal-lines:${bootstrap.display_symbol_storage_key || currentDisplaySymbol.replace(/\s+/g, "_")}`;
      const maxTrendLines = 20;
      const trendLineStorageKey = `trade-wijs-trend-lines:${bootstrap.display_symbol_storage_key || currentDisplaySymbol.replace(/\s+/g, "_")}`;
      const drawingUndoStackStorageKey = `trade-wijs-drawing-undo-stack:${bootstrap.display_symbol_storage_key || currentDisplaySymbol.replace(/\s+/g, "_")}`;
      const indicatorStorageKey = "trade-wijs-indicators";
      const marketInfoCollapseStorageKey = "trade-wijs-market-info-collapsed";
      let chartData = [];
      let deferredCandlesForRedraw = null;
      let deferredMarketDataForRefresh = null;
      let hasFitContent = false;
      const drawnLineSeries = [];
      const drawnTrendLineSeries = [];
      const dynamicPriceScaleLines = [];
      const drawingUndoStack = [];
      let drawHoverPreviewLine = null;
      let drawTrendPreviewSeries = null;
      let trendDrawAnchorPoint = null;
      let drawCaptureOverlayElement = null;
      let drawLineMode = false;
      let activeDrawTool = null;
      let currentAppViewMode = "trade";
      let isRightPanelCollapsed = false;
      let isMarketInfoCollapsed = false;
      let activeSettingsCategory = "exchanges";
      let activeSettingsExchangeKey = currentExchangeKey;
      let activeSettingsGeneralItem = "indicators";
      let activeDisplayTheme = "dark";
      let exchangeApiSettings = {};
      let enabledExchangeKeys = new Set(validExchangeKeys);
      let enabledTimeframes = new Set(validTimeframes);
      let enabledTimeframesByExchange = {};
      let enabledQuoteCurrencies = new Set(validQuoteCurrencies);
      let enabledQuoteCurrenciesByExchange = {};
      let enabledPairs = new Set(validSymbols);
      let enabledPairsByExchange = {};
      let availableTimeframesByExchange = {
        [currentExchangeKey]: Array.from(validTimeframes),
      };
      let availableQuoteCurrenciesByExchange = {
        [currentExchangeKey]: Array.from(validQuoteCurrencies),
      };
      let availableSymbolsByExchange = {};
      let settingsOptionsRequestId = 0;
      let enabledIndicators = new Set(validIndicators);
      let enabledTools = new Set(validTools);
      let marketInfoHasError =
        Boolean(marketErrorElement)
        && (marketErrorElement.style.display || "") !== "none"
        && ((marketErrorElement.textContent || "").trim().length > 0);
      let currentPriceCountdownIntervalId = null;
      let liveQuotePollIntervalId = null;
      let liveQuoteRequestInFlight = false;
      let paperTradeStateRequestId = 0;
      let isSubmittingPaperOrder = false;
      const LIVE_QUOTE_POLL_INTERVAL_MS = 3000;
      const EXCHANGE_RETRIEVAL_STATUS_DELAY_MS = 1000;
      const EXCHANGE_RETRIEVAL_STATUS_TEXT = "Updating: Retrieving data from exchange";
      let pendingExchangeRetrievalRequests = 0;
      let exchangeRetrievalStatusTimerId = null;
      let exchangeRetrievalStatusShown = false;
      let lastObservedCurrentPrice = Number(valueLastElement?.textContent || "");
      let countdownAnchorCandleTime = null;
      let countdownAnchorSetAtMs = Date.now();
      let selectedHorizontalLineEntry = null;
      let draggedHorizontalLineEntry = null;
      let isDraggingHorizontalLine = false;
      let didDragHorizontalLine = false;
      let horizontalLineContextMenuElement = null;
      let contextMenuHorizontalLineEntry = null;
      let trendLineContextMenuElement = null;
      let contextMenuTrendLineEntry = null;
      let candleOrderContextMenuElement = null;
      let contextMenuCandleOrderPoint = null;
      const horizontalLineSelectionTolerancePx = 10;
      let selectedTrendLineEntry = null;
      const trendLineSelectionTolerancePx = 10;
      let draggedTrendLineEndpoint = null;
      let didDragTrendLineEndpoint = false;
      let draggedTrendLineEntry = null;
      let draggedTrendLineState = null;
      let didDragTrendLine = false;
      if (chartCanvas) {
        chartCanvas.dataset.previewVisible = "false";
        chartCanvas.dataset.horizontalLineCount = "0";
        chartCanvas.dataset.trendLineCount = "0";
      }
      let isDraggingScaleDivider = false;
      let isDraggingStochDivider = false;
      let isDraggingRsiDivider = false;
      let isDraggingPriceScale = false;
      let priceScaleDragStartRange = null;
      let priceScaleDragStartPrice = null;
      let priceScaleDragStartClientY = null;
      let currentPriceLineTone = null;
      let marketTabs = [];
      let activeMarketTabId = "";
      let chartContextCache = {};
      const indicatorState = {
        bb: true,
        smc: true,
        stoch: true,
        rsi: true,
        volume: true,
        fvg: true,
      };
      const chartSplitStorageKey = "trade-wijs-chart-split";
      const minVisiblePaneHeightRatio = 0.1;
      let chartSplitRatio = 0.75;
      let lastVolumeSplitRatio = chartSplitRatio;
      const paneOrderStorageKey = "trade-wijs-pane-order";
      const chartViewStorageKey = "trade-wijs-chart-view";
      let paneOrder = ["candle", "stoch", "rsi", "volume"];
      let draggedPaneName = null;
      let paneLayout = {};
      let renderedPaneLayout = {};
      let visiblePaneOrder = [];
      let candleVolumeByTime = new Map();
      let stochKByTime = new Map();
      let stochDByTime = new Map();
      let rsiByTime = new Map();
      let hoveredCandleTime = null;
      let savedChartViewByTimeframe = {};
      let pendingRestoreLogicalRange = null;
      let lastAppliedChartWidth = 0;
      let lastAppliedChartHeight = 0;
      let pendingAppViewModeTaskToken = 0;
      const stochSplitStorageKey = "trade-wijs-stoch-split";
      let stochHeightRatio = 0.2;
      let lastStochHeightRatio = stochHeightRatio;
      const rsiSplitStorageKey = "trade-wijs-rsi-split";
      let rsiHeightRatio = 0.2;
      let lastRsiHeightRatio = rsiHeightRatio;
      let activeOrderSide = "buy";
      let isDraggingChartOrderPreview = false;
      let isDraggingChartStopPreview = false;
      let lockedOrderValueField = "total";
      let currentPaperTradeState = null;
      const paperTradeMarkerDetailsByTime = new Map();
      let candleSeriesMarkersPrimitive = null;

      if (chartCanvas) {
        chartMarkerTooltipElement = document.createElement("div");
        chartMarkerTooltipElement.className = "chart-marker-tooltip";
        chartMarkerTooltipElement.setAttribute("aria-hidden", "true");
        chartCanvas.appendChild(chartMarkerTooltipElement);
      }

      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

      const getChartViewKey = (
        timeframe = currentTimeframe,
        exchangeKey = currentExchangeKey,
        symbol = currentSymbol,
      ) => `${timeframe}|${exchangeKey}|${symbol}`;

      const getChartContextKey = (
        exchangeKey = currentExchangeKey,
        symbol = currentSymbol,
        timeframe = currentTimeframe,
      ) => `${exchangeKey}__${symbol}__${timeframe}`;

      const cloneChartCacheMarketData = (marketData) => {
        if (!marketData || typeof marketData !== "object") {
          return null;
        }

        return {
          ...marketData,
          supported_symbols: Array.isArray(marketData.supported_symbols)
            ? marketData.supported_symbols.map((item) => ({ ...item }))
            : [],
          supported_timeframes: Array.isArray(marketData.supported_timeframes)
            ? marketData.supported_timeframes.slice()
            : [],
          supported_quote_currencies: Array.isArray(marketData.supported_quote_currencies)
            ? marketData.supported_quote_currencies.slice()
            : [],
        };
      };

      const cacheChartContext = (contextKey, candles, marketData) => {
        if (!contextKey || !Array.isArray(candles) || candles.length === 0 || !marketData) {
          return;
        }

        chartContextCache[contextKey] = {
          candles: candles.map((candle) => ({ ...candle })),
          marketData: cloneChartCacheMarketData(marketData),
          cachedAtMs: Date.now(),
        };
      };

      const isChartContextCacheFresh = (contextKey, maxAgeMs = 5000) => {
        const cachedEntry = chartContextCache[contextKey];
        if (!cachedEntry) {
          return false;
        }

        const cachedAtMs = Number(cachedEntry.cachedAtMs);
        if (!Number.isFinite(cachedAtMs) || cachedAtMs <= 0) {
          return false;
        }

        return Date.now() - cachedAtMs <= maxAgeMs;
      };

      const restoreChartContextFromCache = (contextKey) => {
        const cachedEntry = chartContextCache[contextKey];
        if (!cachedEntry || !Array.isArray(cachedEntry.candles) || cachedEntry.candles.length === 0 || !cachedEntry.marketData) {
          return false;
        }

        allCandles = cachedEntry.candles.map((candle) => ({ ...candle }));
        refreshMarketInfo(cloneChartCacheMarketData(cachedEntry.marketData));
        redrawChart();
        forceFullChartRefresh = false;
        lastChartContextKey = contextKey;
        setLoadingTimeframeButton(null);
        setRefreshStatus("Live", "is-live");
        return true;
      };

      const getTimeframeDurationSeconds = (timeframe) => {
        if (typeof timeframe !== "string" || timeframe.length < 2) {
          return 60;
        }

        const units = {
          m: 60,
          h: 3600,
          d: 86400,
          w: 604800,
          M: 2592000,
        };

        const numberPart = timeframe.slice(0, -1);
        const unitPart = timeframe.slice(-1);
        const multiplier = Number(numberPart);
        const unitSeconds = units[unitPart];

        if (!Number.isFinite(multiplier) || multiplier <= 0 || !Number.isFinite(unitSeconds)) {
          return 60;
        }

        return Math.floor(multiplier * unitSeconds);
      };

      const getEstimatedServerNowSeconds = () => {
        if (!Number.isFinite(latestServerTimestampSeconds)) {
          return Math.floor(Date.now() / 1000);
        }

        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - latestServerTimestampSetAtMs) / 1000));
        return latestServerTimestampSeconds + elapsedSeconds;
      };

      const updateCountdownAnchor = () => {
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return;
        }

        const latestCandle = chartData[chartData.length - 1];
        const latestCandleTime = Number(latestCandle?.time);
        if (!Number.isFinite(latestCandleTime)) {
          return;
        }

        if (countdownAnchorCandleTime !== latestCandleTime) {
          countdownAnchorCandleTime = latestCandleTime;
          countdownAnchorSetAtMs = Date.now();
        }
      };

      const formatCandleCountdown = (secondsRemaining) => {
        const totalSeconds = Math.max(0, Math.floor(Number(secondsRemaining) || 0));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
          return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }

        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      };

      const getCurrentCandleCountdownText = () => {
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return "--:--";
        }

        if (!Number.isFinite(Number(countdownAnchorCandleTime))) {
          updateCountdownAnchor();
        }

        if (!Number.isFinite(Number(countdownAnchorCandleTime))) {
          return "--:--";
        }

        const timeframeSeconds = getTimeframeDurationSeconds(currentTimeframe);
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - countdownAnchorSetAtMs) / 1000));
        const remainingSeconds = Math.max(0, timeframeSeconds - elapsedSeconds);

        return formatCandleCountdown(remainingSeconds);
      };

      const setPreferenceCookie = (key, value) => {
        const safeValue = encodeURIComponent(String(value || ""));
        document.cookie = `${key}=${safeValue}; path=/; max-age=31536000; samesite=lax`;
      };

      const clearPreferenceCookie = (key) => {
        document.cookie = `${key}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
      };

      const clearTradeWijsStoredState = () => {
        const knownStorageKeys = [
          timeframeStorageKey,
          symbolStorageKey,
          exchangeStorageKey,
          appViewModeStorageKey,
          rightPanelCollapseStorageKey,
          settingsCategoryStorageKey,
          settingsExchangeStorageKey,
          settingsGeneralItemStorageKey,
          displayThemeStorageKey,
          enabledExchangesStorageKey,
          enabledTimeframesStorageKey,
          enabledQuoteCurrenciesStorageKey,
          enabledIndicatorsStorageKey,
          enabledToolsStorageKey,
          exchangeApiSettingsStorageKey,
          chartSplitStorageKey,
          stochSplitStorageKey,
          rsiSplitStorageKey,
          paneOrderStorageKey,
          chartViewStorageKey,
          indicatorStorageKey,
          marketInfoCollapseStorageKey,
          horizontalLineStorageKey,
          trendLineStorageKey,
          drawingUndoStackStorageKey,
        ];

        knownStorageKeys.forEach((storageKey) => {
          try {
            localStorage.removeItem(storageKey);
          } catch (_error) {
          }
        });

        try {
          const dynamicPrefixes = [
            "trade-wijs-",
            "trade-wijs:",
            "trade-wijs-horizontal-lines:",
            "trade-wijs-trend-lines:",
            "trade-wijs-drawing-undo-stack:",
          ];
          const keysToRemove = [];
          for (let index = 0; index < localStorage.length; index += 1) {
            const storageKey = localStorage.key(index);
            if (!storageKey) {
              continue;
            }

            if (dynamicPrefixes.some((prefix) => storageKey.startsWith(prefix))) {
              keysToRemove.push(storageKey);
            }
          }

          keysToRemove.forEach((storageKey) => {
            try {
              localStorage.removeItem(storageKey);
            } catch (_error) {
            }
          });
        } catch (_error) {
        }

        clearPreferenceCookie("trade_wijs_timeframe");
        clearPreferenceCookie("trade_wijs_symbol");
        clearPreferenceCookie("trade_wijs_exchange");
      };

      try {
        const savedAppViewMode = localStorage.getItem(appViewModeStorageKey);
        if (savedAppViewMode === "trade" || savedAppViewMode === "settings") {
          currentAppViewMode = savedAppViewMode;
        }
      } catch (_error) {
      }

      try {
        const savedEnabledExchanges = JSON.parse(localStorage.getItem(enabledExchangesStorageKey) || "[]");
        if (Array.isArray(savedEnabledExchanges)) {
          const sanitizedEnabledExchanges = savedEnabledExchanges.filter((exchangeKey) => validExchangeKeys.has(exchangeKey));
          if (sanitizedEnabledExchanges.length > 0) {
            enabledExchangeKeys = new Set(sanitizedEnabledExchanges);
          }
        }
      } catch (_error) {
      }

      try {
        const savedEnabledTimeframes = JSON.parse(localStorage.getItem(enabledTimeframesStorageKey) || "{}");
        if (savedEnabledTimeframes && typeof savedEnabledTimeframes === "object") {
          const nextEnabledTimeframesByExchange = {};
          Object.keys(savedEnabledTimeframes).forEach((exchangeKey) => {
            if (!validExchangeKeys.has(exchangeKey) || !enabledExchangeKeys.has(exchangeKey)) {
              return;
            }

            const configuredTimeframes = savedEnabledTimeframes[exchangeKey];
            if (!Array.isArray(configuredTimeframes)) {
              return;
            }

            const sanitizedEnabledTimeframes = configuredTimeframes
              .map((timeframe) => String(timeframe || "").trim())
              .filter(Boolean);
            nextEnabledTimeframesByExchange[exchangeKey] = Array.from(new Set(sanitizedEnabledTimeframes));
          });

          if (Object.keys(nextEnabledTimeframesByExchange).length > 0) {
            enabledTimeframesByExchange = nextEnabledTimeframesByExchange;
          }
        }
      } catch (_error) {
      }

      try {
        const savedEnabledQuoteCurrencies = JSON.parse(localStorage.getItem(enabledQuoteCurrenciesStorageKey) || "{}");
        if (savedEnabledQuoteCurrencies && typeof savedEnabledQuoteCurrencies === "object") {
          const nextEnabledQuoteCurrenciesByExchange = {};
          Object.keys(savedEnabledQuoteCurrencies).forEach((exchangeKey) => {
            if (!validExchangeKeys.has(exchangeKey) || !enabledExchangeKeys.has(exchangeKey)) {
              return;
            }

            const configuredQuoteCurrencies = savedEnabledQuoteCurrencies[exchangeKey];
            if (!Array.isArray(configuredQuoteCurrencies)) {
              return;
            }

            const sanitizedEnabledQuoteCurrencies = configuredQuoteCurrencies
              .map((quoteCurrency) => String(quoteCurrency || "").trim().toUpperCase())
              .filter(Boolean);
            nextEnabledQuoteCurrenciesByExchange[exchangeKey] = Array.from(new Set(sanitizedEnabledQuoteCurrencies));
          });

          if (Object.keys(nextEnabledQuoteCurrenciesByExchange).length > 0) {
            enabledQuoteCurrenciesByExchange = nextEnabledQuoteCurrenciesByExchange;
          }
        }
      } catch (_error) {
      }

      try {
        const savedEnabledPairs = JSON.parse(localStorage.getItem(enabledPairsStorageKey) || "{}");
        if (savedEnabledPairs && typeof savedEnabledPairs === "object") {
          const nextEnabledPairsByExchange = {};
          Object.keys(savedEnabledPairs).forEach((exchangeKey) => {
            if (!validExchangeKeys.has(exchangeKey) || !enabledExchangeKeys.has(exchangeKey)) {
              return;
            }

            const configuredPairs = savedEnabledPairs[exchangeKey];
            if (!Array.isArray(configuredPairs)) {
              return;
            }

            const sanitizedEnabledPairs = configuredPairs
              .map((symbol) => String(symbol || "").trim())
              .filter(Boolean);
            nextEnabledPairsByExchange[exchangeKey] = Array.from(new Set(sanitizedEnabledPairs));
          });

          if (Object.keys(nextEnabledPairsByExchange).length > 0) {
            enabledPairsByExchange = nextEnabledPairsByExchange;
          }
        }
      } catch (_error) {
      }

      try {
        const savedEnabledIndicators = JSON.parse(localStorage.getItem(enabledIndicatorsStorageKey) || "[]");
        if (Array.isArray(savedEnabledIndicators)) {
          const sanitizedEnabledIndicators = savedEnabledIndicators.filter((indicator) => validIndicators.has(indicator));
          if (sanitizedEnabledIndicators.length > 0) {
            enabledIndicators = new Set(sanitizedEnabledIndicators);
          }
        }
      } catch (_error) {
      }

      try {
        const savedEnabledTools = JSON.parse(localStorage.getItem(enabledToolsStorageKey) || "[]");
        if (Array.isArray(savedEnabledTools)) {
          const sanitizedEnabledTools = savedEnabledTools.filter((toolName) => validTools.has(toolName));
          if (sanitizedEnabledTools.length > 0) {
            enabledTools = new Set(sanitizedEnabledTools);
          }
        }
      } catch (_error) {
      }

      try {
        const savedSettingsCategory = localStorage.getItem(settingsCategoryStorageKey);
        if (savedSettingsCategory === "exchanges" || savedSettingsCategory === "general") {
          activeSettingsCategory = savedSettingsCategory;
        }
      } catch (_error) {
      }

      try {
        const savedSettingsExchange = localStorage.getItem(settingsExchangeStorageKey);
        if (savedSettingsExchange && validExchangeKeys.has(savedSettingsExchange)) {
          activeSettingsExchangeKey = savedSettingsExchange;
        }
      } catch (_error) {
      }

      try {
        const savedSettingsGeneralItem = localStorage.getItem(settingsGeneralItemStorageKey);
        if (
          savedSettingsGeneralItem === "indicators"
          || savedSettingsGeneralItem === "display"
          || savedSettingsGeneralItem === "tools"
          || savedSettingsGeneralItem === "factory-reset"
        ) {
          activeSettingsGeneralItem = savedSettingsGeneralItem;
        }
      } catch (_error) {
      }

      try {
        const savedDisplayTheme = localStorage.getItem(displayThemeStorageKey);
        if (savedDisplayTheme === "light" || savedDisplayTheme === "dark") {
          activeDisplayTheme = savedDisplayTheme;
        }
      } catch (_error) {
      }

      try {
        const savedExchangeApiSettings = JSON.parse(localStorage.getItem(exchangeApiSettingsStorageKey) || "{}");
        if (savedExchangeApiSettings && typeof savedExchangeApiSettings === "object") {
          const sanitizedExchangeApiSettings = {};
          Object.keys(savedExchangeApiSettings).forEach((exchangeKey) => {
            if (!validExchangeKeys.has(exchangeKey) || !enabledExchangeKeys.has(exchangeKey)) {
              return;
            }

            const settingsForExchange = savedExchangeApiSettings[exchangeKey];
            if (!settingsForExchange || typeof settingsForExchange !== "object") {
              return;
            }

            sanitizedExchangeApiSettings[exchangeKey] = settingsForExchange;
          });

          exchangeApiSettings = sanitizedExchangeApiSettings;
        }
      } catch (_error) {
      }

      try {
        localStorage.setItem(enabledTimeframesStorageKey, JSON.stringify(enabledTimeframesByExchange));
        localStorage.setItem(enabledQuoteCurrenciesStorageKey, JSON.stringify(enabledQuoteCurrenciesByExchange));
        localStorage.setItem(enabledPairsStorageKey, JSON.stringify(enabledPairsByExchange));
        localStorage.setItem(exchangeApiSettingsStorageKey, JSON.stringify(exchangeApiSettings));
      } catch (_error) {
      }

      try {
        const savedRightPanelCollapsed = localStorage.getItem(rightPanelCollapseStorageKey);
        isRightPanelCollapsed = savedRightPanelCollapsed === "true";
      } catch (_error) {
      }

      try {
        const savedMarketInfoCollapsed = localStorage.getItem(marketInfoCollapseStorageKey);
        isMarketInfoCollapsed = savedMarketInfoCollapsed === "true";
      } catch (_error) {
      }

      try {
        const savedIndicators = JSON.parse(localStorage.getItem(indicatorStorageKey) || "{}");
        if (savedIndicators && typeof savedIndicators === "object") {
          ["bb", "smc", "stoch", "rsi", "volume", "fvg"].forEach((name) => {
            if (typeof savedIndicators[name] === "boolean") {
              indicatorState[name] = savedIndicators[name];
            }
          });

          if (typeof savedIndicators.bb !== "boolean" && typeof savedIndicators.sma === "boolean") {
            indicatorState.bb = savedIndicators.sma;
          }
        }
      } catch (_error) {
      }

      try {
        const savedTimeframe = localStorage.getItem(timeframeStorageKey);
        if (savedTimeframe && validTimeframes.has(savedTimeframe) && savedTimeframe !== currentTimeframe) {
          currentTimeframe = savedTimeframe;
          shouldInitialTimeframeRefresh = true;
        }
      } catch (_error) {
      }

      try {
        const savedSymbol = localStorage.getItem(symbolStorageKey);
        if (savedSymbol && validSymbols.has(savedSymbol) && savedSymbol !== currentSymbol) {
          currentSymbol = savedSymbol;
          shouldInitialTimeframeRefresh = true;
        }
      } catch (_error) {
      }

      try {
        const savedExchange = localStorage.getItem(exchangeStorageKey);
        if (savedExchange && validExchangeKeys.has(savedExchange) && enabledExchangeKeys.has(savedExchange) && savedExchange !== currentExchangeKey) {
          currentExchangeKey = savedExchange;
          shouldInitialTimeframeRefresh = true;
        }
      } catch (_error) {
      }

      if (!enabledExchangeKeys.has(currentExchangeKey)) {
        const fallbackEnabledExchange = Array.from(enabledExchangeKeys)[0] || currentExchangeKey;
        if (fallbackEnabledExchange !== currentExchangeKey) {
          currentExchangeKey = fallbackEnabledExchange;
          shouldInitialTimeframeRefresh = true;
        }
      }

      const getEnabledTimeframesForExchange = (exchangeKey) => {
        const configured = enabledTimeframesByExchange[exchangeKey];
        if (Array.isArray(configured)) {
          const sanitized = configured.filter((timeframe) => validTimeframes.has(timeframe));
          return new Set(sanitized);
        }

        return new Set(validTimeframes);
      };

      const getEnabledQuoteCurrenciesForExchange = (exchangeKey) => {
        const configured = enabledQuoteCurrenciesByExchange[exchangeKey];
        if (Array.isArray(configured)) {
          const sanitized = configured.filter((quoteCurrency) => validQuoteCurrencies.has(quoteCurrency));
          return new Set(sanitized);
        }

        const availableQuoteCurrencies = Array.isArray(availableQuoteCurrenciesByExchange[exchangeKey])
          ? availableQuoteCurrenciesByExchange[exchangeKey]
          : Array.from(validQuoteCurrencies);
        const normalizedQuoteCurrencies = availableQuoteCurrencies
          .map((quoteCurrency) => String(quoteCurrency || "").trim().toUpperCase())
          .filter(Boolean);

        const defaultQuoteCurrency = normalizedQuoteCurrencies.includes("USDT")
          ? "USDT"
          : (normalizedQuoteCurrencies.includes("USDC")
            ? "USDC"
            : (normalizedQuoteCurrencies.includes("EUR")
              ? "EUR"
              : (normalizedQuoteCurrencies[0] || "")));

        return defaultQuoteCurrency ? new Set([defaultQuoteCurrency]) : new Set();
      };

      const getSymbolOptionsForExchange = (exchangeKey) => {
        const configuredSymbols = availableSymbolsByExchange[exchangeKey];
        return Array.isArray(configuredSymbols) ? configuredSymbols : [];
      };

      const getFilteredPairOptionsForExchange = (exchangeKey) => {
        const enabledQuotesForExchange = getEnabledQuoteCurrenciesForExchange(exchangeKey);
        return getSymbolOptionsForExchange(exchangeKey).filter((item) => {
          if (!enabledQuotesForExchange.size) {
            return true;
          }

          const quoteCurrency = String(item.quote || getQuoteCurrencyFromSymbol(item.symbol || "")).toUpperCase();
          return enabledQuotesForExchange.has(quoteCurrency);
        });
      };

      const getDefaultEnabledPairForExchange = (exchangeKey, candidateSymbols = []) => {
        const symbolOptions = candidateSymbols.length > 0
          ? candidateSymbols
          : getSymbolOptionsForExchange(exchangeKey).map((item) => item.symbol).filter(Boolean);

        if (symbolOptions.includes("BTC/USDT")) {
          return "BTC/USDT";
        }

        if (symbolOptions.includes("BTCUSDT")) {
          return "BTCUSDT";
        }

        const normalizedBtcUsdt = symbolOptions.find((symbol) => String(symbol).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === "BTCUSDT");
        if (normalizedBtcUsdt) {
          return normalizedBtcUsdt;
        }

        return symbolOptions[0] || "";
      };

      const getEnabledPairsForExchange = (exchangeKey) => {
        const availableSymbols = new Set(
          getSymbolOptionsForExchange(exchangeKey)
            .map((item) => item.symbol)
            .filter(Boolean),
        );
        const configured = enabledPairsByExchange[exchangeKey];
        if (Array.isArray(configured)) {
          if (availableSymbols.size === 0) {
            return new Set(configured.filter(Boolean));
          }
          const sanitized = configured.filter((symbol) => availableSymbols.has(symbol));
          return new Set(sanitized);
        }

        return new Set(Array.from(availableSymbols).filter(Boolean));
      };

      enabledTimeframes = getEnabledTimeframesForExchange(currentExchangeKey);
      enabledQuoteCurrencies = getEnabledQuoteCurrenciesForExchange(currentExchangeKey);
      enabledPairs = getEnabledPairsForExchange(currentExchangeKey);

      if (!enabledTimeframes.has(currentTimeframe)) {
        const fallbackEnabledTimeframe = Array.from(enabledTimeframes)[0] || currentTimeframe;
        if (fallbackEnabledTimeframe !== currentTimeframe) {
          currentTimeframe = fallbackEnabledTimeframe;
          shouldInitialTimeframeRefresh = true;
        }
      }

      setPreferenceCookie("trade_wijs_timeframe", currentTimeframe);
      setPreferenceCookie("trade_wijs_symbol", currentSymbol);
      setPreferenceCookie("trade_wijs_exchange", currentExchangeKey);

      try {
        const savedPaneOrder = JSON.parse(localStorage.getItem(paneOrderStorageKey) || "[]");
        if (Array.isArray(savedPaneOrder)) {
          const normalizedOrder = savedPaneOrder.filter((pane) => ["candle", "stoch", "rsi", "volume"].includes(pane));
          ["candle", "stoch", "rsi", "volume"].forEach((pane) => {
            if (!normalizedOrder.includes(pane)) {
              normalizedOrder.push(pane);
            }
          });
          paneOrder = normalizedOrder;
        }
      } catch (_error) {
      }

      try {
        const savedChartView = JSON.parse(localStorage.getItem(chartViewStorageKey) || "{}");
        if (savedChartView && typeof savedChartView === "object") {
          savedChartViewByTimeframe = savedChartView;
          const timeframeView = savedChartViewByTimeframe[getChartViewKey()] || savedChartViewByTimeframe[currentTimeframe];
          if (
            timeframeView &&
            Number.isFinite(Number(timeframeView.from)) &&
            Number.isFinite(Number(timeframeView.to))
          ) {
            pendingRestoreLogicalRange = {
              from: Number(timeframeView.from),
              to: Number(timeframeView.to),
            };
          }
        }
      } catch (_error) {
      }

      const horizontalLineColor = "#ffd166";

      const readThemeColor = (variableName, fallback) => {
        const colorValue = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        return colorValue || fallback;
      };

      const getChartThemeColors = () => ({
        background: readThemeColor("--panel", "#151925"),
        border: readThemeColor("--border", "#2b3345"),
        text: readThemeColor("--muted", "#9aa5bd"),
      });

      let chartThemeColors = getChartThemeColors();

      const chart = LightweightCharts.createChart(chartElement, {
        width: chartElement.clientWidth,
        height: chartElement.clientHeight,
        layout: {
          background: { color: chartThemeColors.background },
          textColor: chartThemeColors.text,
        },
        grid: {
          vertLines: { color: "rgba(0,0,0,0)" },
          horzLines: { color: "rgba(0,0,0,0)" },
        },
        rightPriceScale: {
          visible: true,
          borderColor: chartThemeColors.border,
        },
        timeScale: {
          borderColor: chartThemeColors.border,
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
        handleScroll: {
          pressedMouseMove: true,
          mouseWheel: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
      });

      const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
        priceScaleId: "price",
        upColor: "#29b37d",
        downColor: "#cf5f6b",
        wickUpColor: "#8794b6",
        wickDownColor: "#8794b6",
        borderVisible: false,
        lastValueVisible: false,
      });

      const bbUpperSeries = chart.addSeries(LightweightCharts.LineSeries, {
        priceScaleId: "price",
        color: "#5fa8ff",
        lineWidth: 2,
        priceLineVisible: false,
      });

      const bbMiddleSeries = chart.addSeries(LightweightCharts.LineSeries, {
        priceScaleId: "price",
        color: "#f6c23e",
        lineWidth: 2,
        priceLineVisible: false,
      });

      const bbLowerSeries = chart.addSeries(LightweightCharts.LineSeries, {
        priceScaleId: "price",
        color: "#5fa8ff",
        lineWidth: 2,
        priceLineVisible: false,
      });

      chart.priceScale("price").applyOptions({
        visible: true,
        autoScale: true,
        borderColor: chartThemeColors.border,
        ticksVisible: true,
        alignLabels: false,
        entireTextOnly: false,
        minimumWidth: 64,
        scaleMargins: {
          top: 0.02,
          bottom: 0.02,
        },
      });

      const stochKSeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: "#7dd3fc",
        lineWidth: 2,
        priceScaleId: "stoch",
        priceLineVisible: false,
        lastValueVisible: true,
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: 0,
            maxValue: 100,
          },
        }),
      });

      const stochDSeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: "#f59e0b",
        lineWidth: 2,
        priceScaleId: "stoch",
        priceLineVisible: false,
        lastValueVisible: true,
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: 0,
            maxValue: 100,
          },
        }),
      });

      const stochOverboughtSeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: "rgba(255, 255, 255, 1)",
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        priceScaleId: "stoch",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const stochOversoldSeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: "rgba(255, 255, 255, 1)",
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        priceScaleId: "stoch",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      chart.priceScale("stoch").applyOptions({
        visible: true,
        autoScale: true,
        borderColor: chartThemeColors.border,
        ticksVisible: true,
        minimumWidth: 58,
        scaleMargins: {
          top: 0,
          bottom: 0.8,
        },
      });

      const rsiSeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: "#a78bfa",
        lineWidth: 2,
        priceScaleId: "rsi",
        priceLineVisible: false,
        lastValueVisible: true,
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: 0,
            maxValue: 100,
          },
        }),
      });

      const rsiOverboughtSeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: "rgba(255, 255, 255, 1)",
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        priceScaleId: "rsi",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const rsiOversoldSeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: "rgba(255, 255, 255, 1)",
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        priceScaleId: "rsi",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      chart.priceScale("rsi").applyOptions({
        visible: true,
        autoScale: true,
        borderColor: chartThemeColors.border,
        ticksVisible: true,
        minimumWidth: 58,
        scaleMargins: {
          top: 0,
          bottom: 0.8,
        },
      });

      const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "volume",
        base: 0,
        color: "rgba(143, 159, 187, 0.6)",
        priceLineVisible: false,
        lastValueVisible: false,
      });

      chart.priceScale("volume").applyOptions({
        visible: true,
        autoScale: true,
        borderColor: chartThemeColors.border,
        ticksVisible: true,
        minimumWidth: 64,
        scaleMargins: {
          top: 0.75,
          bottom: 0,
        },
      });

      try {
        const savedChartSplitRatio = Number(localStorage.getItem(chartSplitStorageKey));
        if (!Number.isNaN(savedChartSplitRatio)) {
          chartSplitRatio = clamp(savedChartSplitRatio, 0, 1);
          lastVolumeSplitRatio = chartSplitRatio;
        }
      } catch (_error) {
      }

      try {
        const savedStochHeightRatio = Number(localStorage.getItem(stochSplitStorageKey));
        if (!Number.isNaN(savedStochHeightRatio)) {
          stochHeightRatio = clamp(savedStochHeightRatio, 0, 1);
          lastStochHeightRatio = stochHeightRatio;
        }
      } catch (_error) {
      }

      try {
        const savedRsiHeightRatio = Number(localStorage.getItem(rsiSplitStorageKey));
        if (!Number.isNaN(savedRsiHeightRatio)) {
          rsiHeightRatio = clamp(savedRsiHeightRatio, 0, 1);
          lastRsiHeightRatio = rsiHeightRatio;
        }
      } catch (_error) {
      }

      const getVolumeHeightRatio = () => clamp(1 - chartSplitRatio, minVisiblePaneHeightRatio, 1 - minVisiblePaneHeightRatio);

      const getStochHeightRatio = () => clamp(stochHeightRatio, minVisiblePaneHeightRatio, 1 - minVisiblePaneHeightRatio);

      const getRsiHeightRatio = () => clamp(rsiHeightRatio, minVisiblePaneHeightRatio, 1 - minVisiblePaneHeightRatio);

      const getPaneMaxHeightRatio = (paneName) => {
        const otherVisibleCount =
          1 +
          (paneName !== "volume" && indicatorState.volume ? 1 : 0) +
          (paneName !== "stoch" && indicatorState.stoch ? 1 : 0) +
          (paneName !== "rsi" && indicatorState.rsi ? 1 : 0);
        return Math.max(minVisiblePaneHeightRatio, 1 - otherVisibleCount * minVisiblePaneHeightRatio);
      };

      const normalizePersistedPaneRatios = () => {
        let volumeHeight = indicatorState.volume
          ? clamp(getVolumeHeightRatio(), minVisiblePaneHeightRatio, getPaneMaxHeightRatio("volume"))
          : 0;
        let stochHeight = indicatorState.stoch
          ? clamp(getStochHeightRatio(), minVisiblePaneHeightRatio, getPaneMaxHeightRatio("stoch"))
          : 0;
        let rsiHeight = indicatorState.rsi
          ? clamp(getRsiHeightRatio(), minVisiblePaneHeightRatio, getPaneMaxHeightRatio("rsi"))
          : 0;

        let candleHeight = 1 - volumeHeight - stochHeight - rsiHeight;
        if (candleHeight < minVisiblePaneHeightRatio) {
          let deficit = minVisiblePaneHeightRatio - candleHeight;

          const reducibleVolume = Math.max(0, volumeHeight - minVisiblePaneHeightRatio);
          if (reducibleVolume > 0) {
            const reduction = Math.min(reducibleVolume, deficit);
            volumeHeight -= reduction;
            deficit -= reduction;
          }

          const reducibleStoch = Math.max(0, stochHeight - minVisiblePaneHeightRatio);
          if (reducibleStoch > 0 && deficit > 0) {
            const reduction = Math.min(reducibleStoch, deficit);
            stochHeight -= reduction;
            deficit -= reduction;
          }

          const reducibleRsi = Math.max(0, rsiHeight - minVisiblePaneHeightRatio);
          if (reducibleRsi > 0 && deficit > 0) {
            const reduction = Math.min(reducibleRsi, deficit);
            rsiHeight -= reduction;
            deficit -= reduction;
          }
        }

        if (indicatorState.volume) {
          chartSplitRatio = 1 - volumeHeight;
          lastVolumeSplitRatio = chartSplitRatio;
          try {
            localStorage.setItem(chartSplitStorageKey, String(chartSplitRatio));
          } catch (_error) {
          }
        }

        if (indicatorState.stoch) {
          stochHeightRatio = stochHeight;
          lastStochHeightRatio = stochHeight;
          try {
            localStorage.setItem(stochSplitStorageKey, String(stochHeightRatio));
          } catch (_error) {
          }
        }

        if (indicatorState.rsi) {
          rsiHeightRatio = rsiHeight;
          lastRsiHeightRatio = rsiHeight;
          try {
            localStorage.setItem(rsiSplitStorageKey, String(rsiHeightRatio));
          } catch (_error) {
          }
        }
      };

      normalizePersistedPaneRatios();

      const computePaneLayout = () => {
        const activeOrder = paneOrder.filter((pane) => pane === "candle" || indicatorState[pane]);
        if (!activeOrder.includes("candle")) {
          activeOrder.push("candle");
        }

        let volumeHeight = indicatorState.volume
          ? clamp(getVolumeHeightRatio(), minVisiblePaneHeightRatio, getPaneMaxHeightRatio("volume"))
          : 0;
        let stochHeight = indicatorState.stoch
          ? clamp(getStochHeightRatio(), minVisiblePaneHeightRatio, getPaneMaxHeightRatio("stoch"))
          : 0;
        let rsiHeight = indicatorState.rsi
          ? clamp(getRsiHeightRatio(), minVisiblePaneHeightRatio, getPaneMaxHeightRatio("rsi"))
          : 0;
        let candleHeight = 1 - volumeHeight - stochHeight - rsiHeight;

        const minCandleHeight = minVisiblePaneHeightRatio;
        if (candleHeight < minCandleHeight) {
          let deficit = minCandleHeight - candleHeight;
          const reducibleVolume = Math.max(0, volumeHeight - minVisiblePaneHeightRatio);
          const reducibleStoch = Math.max(0, stochHeight - minVisiblePaneHeightRatio);
          const reducibleRsi = Math.max(0, rsiHeight - minVisiblePaneHeightRatio);
          const reducibleTotal = reducibleVolume + reducibleStoch + reducibleRsi;

          if (reducibleTotal > 0) {
            if (reducibleVolume > 0) {
              const reduction = Math.min(reducibleVolume, deficit * (reducibleVolume / reducibleTotal));
              volumeHeight -= reduction;
              deficit -= reduction;
            }

            if (reducibleStoch > 0 && deficit > 0) {
              const reduction = Math.min(reducibleStoch, deficit);
              stochHeight -= reduction;
              deficit -= reduction;
            }

            if (reducibleRsi > 0 && deficit > 0) {
              const reduction = Math.min(reducibleRsi, deficit);
              rsiHeight -= reduction;
              deficit -= reduction;
            }
          }

          candleHeight = 1 - volumeHeight - stochHeight - rsiHeight;
        }

        const normalizedHeights = {
          candle: Math.max(0, candleHeight),
          stoch: Math.max(0, stochHeight),
          rsi: Math.max(0, rsiHeight),
          volume: Math.max(0, volumeHeight),
        };

        if (indicatorState.volume) {
          chartSplitRatio = 1 - normalizedHeights.volume;
          lastVolumeSplitRatio = chartSplitRatio;
        }

        if (indicatorState.stoch) {
          stochHeightRatio = normalizedHeights.stoch;
          lastStochHeightRatio = normalizedHeights.stoch;
        }

        if (indicatorState.rsi) {
          rsiHeightRatio = normalizedHeights.rsi;
          lastRsiHeightRatio = normalizedHeights.rsi;
        }

        let cursor = 0;
        const nextLayout = {};
        activeOrder.forEach((pane) => {
          const paneHeight = normalizedHeights[pane] || 0;
          const top = cursor;
          const bottom = cursor + paneHeight;
          nextLayout[pane] = { top, bottom, height: paneHeight };
          cursor = bottom;
        });

        paneLayout = nextLayout;
        visiblePaneOrder = activeOrder;
      };

      const renderPaneReorderHandles = () => {
        if (!paneReorderOverlayElement) {
          return;
        }

        paneReorderOverlayElement.innerHTML = "";

        visiblePaneOrder.forEach((paneName) => {
          const segment = paneLayout[paneName];
          if (!segment || segment.height <= 0) {
            return;
          }

          const paneLabelByName = {
            candle: "Price",
            stoch: "Stoch",
            rsi: "RSI",
            volume: "Volume",
          };
          const paneLabel = paneLabelByName[paneName] || paneName;
          const handleButton = document.createElement("button");
          handleButton.type = "button";
          handleButton.className = "pane-reorder-handle";
          handleButton.dataset.pane = paneName;
          handleButton.style.top = `${((segment.top + segment.bottom) / 2) * 100}%`;
          handleButton.title = `Reorder ${paneLabel} pane`;
          handleButton.setAttribute("aria-label", `Reorder ${paneLabel} pane`);

          const icon = document.createElement("span");
          icon.className = "pane-reorder-icon";
          icon.setAttribute("aria-hidden", "true");
          handleButton.appendChild(icon);

          paneReorderOverlayElement.appendChild(handleButton);
        });
      };

      const clearPaneScaleOverlay = () => {
        if (paneScaleOverlayElement) {
          paneScaleOverlayElement.innerHTML = "";
        }
      };

      const renderPaneScaleOverlay = () => {
        if (!paneScaleOverlayElement || !chartCanvas) {
          return;
        }

        clearPaneScaleOverlay();

        const canvasHeight = chartCanvas.clientHeight;
        if (!canvasHeight) {
          return;
        }

        const timeAxisSafeZonePx = 22;
        const usableBottomPx = Math.max(0, canvasHeight - timeAxisSafeZonePx);
        const mapPaneSegment = (segment) => {
          if (!segment) {
            return null;
          }

          return {
            top: segment.top * usableBottomPx,
            bottom: segment.bottom * usableBottomPx,
            height: segment.height * usableBottomPx,
          };
        };

        const labelHeightPx = 14;
        const maxLabelTopPx = Math.max(0, canvasHeight - labelHeightPx - timeAxisSafeZonePx);
        const dividerAvoidancePx = 10;
        const dividerClearancePx = 10;
        const dividerPositionsPx = [];

        [stochDividerElement, rsiDividerElement, scaleDividerElement].forEach((dividerElement) => {
          if (!dividerElement || dividerElement.classList.contains("is-hidden")) {
            return;
          }

          const topValue = dividerElement.style.top || "";
          if (!topValue) {
            return;
          }
          
          try {
            const topPercent = Number.parseFloat(topValue);
            if (!Number.isFinite(topPercent) || topPercent < 0 || topPercent > 100) {
              return;
            }

            dividerPositionsPx.push((topPercent / 100) * canvasHeight);
          } catch (_e) {
            // Skip invalid dividers
            return;
          }
        });

        const resolveDividerCollision = (labelTopPx, paneMinTopPx, paneMaxTopPx) => {
          let adjustedTop = Math.max(paneMinTopPx, Math.min(paneMaxTopPx, labelTopPx));

          dividerPositionsPx.forEach((dividerY) => {
            const labelCenter = adjustedTop + labelHeightPx / 2;
            if (Math.abs(labelCenter - dividerY) > dividerAvoidancePx) {
              return;
            }

            if (labelCenter < dividerY) {
              adjustedTop = dividerY + dividerClearancePx;
            } else {
              adjustedTop = dividerY - dividerClearancePx - labelHeightPx;
            }
          });

          return Math.max(paneMinTopPx, Math.min(paneMaxTopPx, adjustedTop));
        };

        const addLabel = (
          text,
          yPositionPx,
          paneTopPx,
          paneBottomPx,
          className = "pane-scale-label",
          options = {},
        ) => {
          const {
            avoidDividerCollision = true,
            labelHeightPx: customLabelHeightPx = null,
            subText = null,
          } = options;
          const label = document.createElement("div");
          label.className = className;
          if (subText === null || subText === undefined) {
            label.textContent = text;
          } else {
            const mainSpan = document.createElement("span");
            mainSpan.className = "pane-scale-label-main";
            mainSpan.textContent = text;
            const subSpan = document.createElement("span");
            subSpan.className = "pane-scale-label-sub";
            subSpan.textContent = subText;
            label.appendChild(mainSpan);
            label.appendChild(subSpan);
          }

          const effectiveLabelHeightPx = Number.isFinite(Number(customLabelHeightPx))
            ? Number(customLabelHeightPx)
            : labelHeightPx;
          const paneMinTopPx = Math.max(0, paneTopPx);
          const paneMaxTopPx = Math.max(
            paneMinTopPx,
            Math.min(maxLabelTopPx, paneBottomPx - effectiveLabelHeightPx),
          );
          const resolvedTop = avoidDividerCollision
            ? resolveDividerCollision(yPositionPx, paneMinTopPx, paneMaxTopPx)
            : Math.max(paneMinTopPx, Math.min(paneMaxTopPx, yPositionPx));
          label.style.top = `${resolvedTop}px`;
          paneScaleOverlayElement.appendChild(label);
        };

        const addPriorityPriceLabel = (text, price, className, options = {}) => {
          const {
            subText = null,
            labelHeightPx: priorityLabelHeightPx = null,
            yOffsetPx = 7,
          } = options;
          const numericPrice = Number(price);
          if (!Number.isFinite(numericPrice)) {
            return;
          }

          const yCoordinate = candleSeries.priceToCoordinate(numericPrice);
          if (!Number.isFinite(Number(yCoordinate))) {
            return;
          }

          addLabel(
            text,
            Number(yCoordinate) - Number(yOffsetPx),
            candleSegment.top,
            candleSegment.top + candleSegment.height,
            `pane-scale-label pane-scale-label--priority ${className}`,
            {
              avoidDividerCollision: false,
              labelHeightPx: priorityLabelHeightPx,
              subText,
            },
          );
        };

        const formatPriceScaleValue = (value, options = {}) => {
          const { precision = null } = options;
          const numericValue = Number(value);
          if (!Number.isFinite(numericValue)) {
            return "-";
          }

          if (Number.isInteger(precision) && precision >= 0) {
            return numericValue.toFixed(precision);
          }

          const absolute = Math.abs(numericValue);
          if (absolute >= 1) {
            return numericValue.toFixed(2);
          }

          return numericValue.toFixed(4);
        };

        const getNiceTickStep = (range, targetTickCount) => {
          if (!Number.isFinite(range) || range <= 0) {
            return 1;
          }

          const safeTarget = Math.max(2, Number(targetTickCount) || 2);
          const roughStep = range / safeTarget;
          const exponent = Math.floor(Math.log10(roughStep));
          const magnitude = 10 ** exponent;
          const normalized = roughStep / magnitude;
          const candidates = [1, 1.5, 2, 2.5, 5, 10];
          const selected = candidates.find((candidate) => normalized <= candidate) || 10;
          return selected * magnitude;
        };

        const buildPriceScaleTicks = (minValue, maxValue, targetTickCount) => {
          const lower = Number(minValue);
          const upper = Number(maxValue);

          if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
            return [];
          }

          const min = Math.min(lower, upper);
          const max = Math.max(lower, upper);
          const range = max - min;
          if (!Number.isFinite(range) || range <= 0) {
            return [min];
          }

          const step = getNiceTickStep(range, targetTickCount);
          if (!Number.isFinite(step) || step <= 0) {
            return [min, max];
          }

          const firstTick = Math.ceil(min / step) * step;
          const ticks = [];
          const epsilon = step * 0.001;

          for (let value = firstTick; value <= max + epsilon; value += step) {
            ticks.push(Number(value.toPrecision(12)));
          }

          if (ticks.length < 2) {
            ticks.unshift(min);
            ticks.push(max);
          }

          return ticks;
        };

        const candleSegment = mapPaneSegment(paneLayout.candle);
        if (candleSegment && candleSegment.height > 0 && chartData.length > 0) {
          const topPx = candleSegment.top;
          const segmentHeight = candleSegment.height;
          const labelCount = 7;

          for (let index = 0; index < labelCount; index += 1) {
            const ratio = labelCount === 1 ? 0 : index / (labelCount - 1);
            const yCoordinate = topPx + (ratio * segmentHeight);
            const priceValue = candleSeries.coordinateToPrice(yCoordinate);
            if (!Number.isFinite(Number(priceValue))) {
              continue;
            }

            addLabel(
              formatPriceScaleValue(priceValue, { precision: 2 }),
              yCoordinate - 7,
              topPx,
              topPx + segmentHeight,
              "pane-scale-label pane-scale-label--price-scale",
              { avoidDividerCollision: false },
            );
          }

          const latestCandle = chartData[chartData.length - 1] || null;
          if (latestCandle && Number.isFinite(Number(latestCandle.close))) {
            const latestOpen = Number(latestCandle.open);
            const latestClose = Number(latestCandle.close);
            const isUpCandle = !Number.isFinite(latestOpen) || latestClose >= latestOpen;
            const nextTone = isUpCandle ? "up" : "down";
            const nextPriceLineColor = isUpCandle ? "#29b37d" : "#cf5f6b";

            if (currentPriceLineTone !== nextTone) {
              candleSeries.applyOptions({
                priceLineColor: nextPriceLineColor,
                priceLineStyle: LightweightCharts.LineStyle.Dashed,
              });
              currentPriceLineTone = nextTone;
            }

            addPriorityPriceLabel(
              formatPriceScaleValue(latestCandle.close, { precision: 2 }),
              latestCandle.close,
              isUpCandle
                ? "pane-scale-label--price-current pane-scale-label--price-up"
                : "pane-scale-label--price-current pane-scale-label--price-down",
              {
                subText: getCurrentCandleCountdownText(),
                labelHeightPx: 24,
                yOffsetPx: 12,
              },
            );
          }

          drawnLineSeries.forEach((lineEntry) => {
            if (!lineEntry || lineEntry.removed) {
              return;
            }

            if (!isHorizontalLineInCandlePane(lineEntry)) {
              return;
            }

            const linePrice = Number(lineEntry.price);
            if (!Number.isFinite(linePrice)) {
              return;
            }

            const isSelectedHorizontalLine = selectedHorizontalLineEntry === lineEntry;
            addPriorityPriceLabel(
              `H ${formatPriceScaleValue(linePrice, { precision: 2 })}`,
              linePrice,
              isSelectedHorizontalLine
                ? "pane-scale-label--horizontal-current pane-scale-label--horizontal-selected"
                : "pane-scale-label--horizontal-current",
            );
          });
        }

        const stochSegment = mapPaneSegment(paneLayout.stoch);
        if (indicatorState.stoch && stochSegment && stochSegment.height > 0) {
          const topPx = stochSegment.top;
          const segmentHeight = stochSegment.height;
          [80, 50, 20].forEach((value) => {
            const y = topPx + ((100 - value) / 100) * segmentHeight;
            addLabel(String(value), y - 7, topPx, topPx + segmentHeight);
          });

          const effectiveHoverTime = hoveredCandleTime ?? (chartData[chartData.length - 1]?.time ?? null);
          const hoveredK = effectiveHoverTime !== null ? stochKByTime.get(Number(effectiveHoverTime)) : null;
          const hoveredD = effectiveHoverTime !== null ? stochDByTime.get(Number(effectiveHoverTime)) : null;

          let kLabelY = null;
          let dLabelY = null;

          if (Number.isFinite(hoveredK)) {
            kLabelY = topPx + ((100 - Number(hoveredK)) / 100) * segmentHeight - 7;
          }

          if (Number.isFinite(hoveredD)) {
            dLabelY = topPx + ((100 - Number(hoveredD)) / 100) * segmentHeight - 7;
          }

          if (kLabelY !== null && dLabelY !== null && Math.abs(kLabelY - dLabelY) < 14) {
            const separationPx = 8;
            if (kLabelY <= dLabelY) {
              kLabelY -= separationPx;
              dLabelY += separationPx;
            } else {
              kLabelY += separationPx;
              dLabelY -= separationPx;
            }
          }

          if (Number.isFinite(hoveredK)) {
            addLabel(
              `K ${Number(hoveredK).toFixed(2)}`,
              kLabelY,
              topPx,
              topPx + segmentHeight,
              "pane-scale-label pane-scale-label--stoch-k-current",
            );
          }

          if (Number.isFinite(hoveredD)) {
            addLabel(
              `D ${Number(hoveredD).toFixed(2)}`,
              dLabelY,
              topPx,
              topPx + segmentHeight,
              "pane-scale-label pane-scale-label--stoch-d-current",
            );
          }
        }

        const volumeSegment = mapPaneSegment(paneLayout.volume);
        if (indicatorState.volume && volumeSegment && volumeSegment.height > 0) {
          const topPx = volumeSegment.top;
          const segmentHeight = volumeSegment.height;
          const volumeValues = allCandles.map((candle) => Number(candle.volume || 0));
          const maxVolume = volumeValues.length ? Math.max(...volumeValues, 0) : 0;
          const midVolume = maxVolume / 2;

          addLabel(formatCompactVolume(maxVolume), topPx - 7, topPx, topPx + segmentHeight);
          addLabel(formatCompactVolume(midVolume), topPx + segmentHeight / 2 - 7, topPx, topPx + segmentHeight);
          addLabel(formatCompactVolume(0), topPx + segmentHeight - 7, topPx, topPx + segmentHeight);
        }

        const rsiSegment = mapPaneSegment(paneLayout.rsi);
        if (indicatorState.rsi && rsiSegment && rsiSegment.height > 0) {
          const topPx = rsiSegment.top;
          const segmentHeight = rsiSegment.height;
          [70, 50, 30].forEach((value) => {
            const y = topPx + ((100 - value) / 100) * segmentHeight;
            addLabel(String(value), y - 7, topPx, topPx + segmentHeight);
          });

          const effectiveHoverTime = hoveredCandleTime ?? (chartData[chartData.length - 1]?.time ?? null);
          const hoveredRsi = effectiveHoverTime !== null ? rsiByTime.get(Number(effectiveHoverTime)) : null;
          if (Number.isFinite(hoveredRsi)) {
            const rsiLabelY = topPx + ((100 - Number(hoveredRsi)) / 100) * segmentHeight - 7;
            addLabel(
              `RSI ${Number(hoveredRsi).toFixed(2)}`,
              rsiLabelY,
              topPx,
              topPx + segmentHeight,
              "pane-scale-label pane-scale-label--rsi-current",
            );
          }
        }
      };

      const reorderPaneByPointer = (clientY) => {
        if (!draggedPaneName || !chartCanvas || !visiblePaneOrder.includes(draggedPaneName)) {
          return;
        }

        const canvasRect = chartCanvas.getBoundingClientRect();
        if (canvasRect.height <= 0) {
          return;
        }

        const pointerRatio = clamp((clientY - canvasRect.top) / canvasRect.height, 0, 1);
        const visibleWithoutDragged = visiblePaneOrder.filter((paneName) => paneName !== draggedPaneName);

        let insertIndex = visibleWithoutDragged.length;
        for (let index = 0; index < visibleWithoutDragged.length; index += 1) {
          const paneName = visibleWithoutDragged[index];
          const segment = paneLayout[paneName];
          const mid = segment ? (segment.top + segment.bottom) / 2 : 1;
          if (pointerRatio < mid) {
            insertIndex = index;
            break;
          }
        }

        const baseOrder = paneOrder.filter((paneName) => paneName !== draggedPaneName);
        const anchorPane = visibleWithoutDragged[insertIndex] || null;
        let targetIndex = baseOrder.length;

        if (anchorPane) {
          targetIndex = baseOrder.indexOf(anchorPane);
        } else {
          const lastVisiblePane = visibleWithoutDragged[visibleWithoutDragged.length - 1] || null;
          if (lastVisiblePane) {
            targetIndex = baseOrder.indexOf(lastVisiblePane) + 1;
          }
        }

        const nextOrder = [...baseOrder];
        nextOrder.splice(Math.max(0, targetIndex), 0, draggedPaneName);

        if (nextOrder.join("|") !== paneOrder.join("|")) {
          paneOrder = nextOrder;
          applyChartSplit();
          renderFvgOverlay();
          updateScaleDividerLabel(false);
          updateStochDividerLabel(false);
          updateRsiDividerLabel(false);
        }
      };

      const updateDividerForPane = (paneName, dividerElement, labelElements, labelPrefix) => {
        if (!dividerElement || !labelElements || labelElements.length === 0) {
          return;
        }

        const segment = renderedPaneLayout[paneName] || paneLayout[paneName];
        const paneIndex = visiblePaneOrder.indexOf(paneName);
        if (!segment || paneIndex === -1 || visiblePaneOrder.length < 2) {
          dividerElement.classList.add("is-hidden");
          labelElements.forEach((labelElement) => labelElement.classList.remove("is-visible"));
          return;
        }

        const boundaryRatio = paneIndex === 0 ? segment.bottom : segment.top;
        dividerElement.style.top = `${boundaryRatio * 100}%`;
        dividerElement.dataset.pane = paneName;
        dividerElement.dataset.boundary = paneIndex === 0 ? "bottom" : "top";
        dividerElement.classList.remove("is-hidden");

        const percentage = Math.round(segment.height * 100);
        labelElements.forEach((labelElement) => {
          labelElement.textContent = `${labelPrefix} ${percentage}%`;
          labelElement.style.top = `${boundaryRatio * 100}%`;
        });
      };

      const applyChartSplit = () => {
        computePaneLayout();

        const candleSegment = paneLayout.candle || { top: 0, bottom: 1 };
        const volumeSegment = paneLayout.volume || null;
        const stochSegment = paneLayout.stoch || null;
        const rsiSegment = paneLayout.rsi || null;
        const paneTopPaddingRatio = 0.006;

        const normalizedCandleSegment = {
          top: candleSegment.top,
          bottom: candleSegment.bottom,
          height: Math.max(0, candleSegment.bottom - candleSegment.top),
        };
        const normalizedVolumeSegment = volumeSegment
          ? {
              top: volumeSegment.top,
              bottom: volumeSegment.bottom,
              height: Math.max(0, volumeSegment.bottom - volumeSegment.top),
            }
          : null;
        const normalizedStochSegment = stochSegment
          ? {
              top: stochSegment.top,
              bottom: stochSegment.bottom,
              height: Math.max(0, stochSegment.bottom - stochSegment.top),
            }
          : null;
        const normalizedRsiSegment = rsiSegment
          ? {
              top: rsiSegment.top,
              bottom: rsiSegment.bottom,
              height: Math.max(0, rsiSegment.bottom - rsiSegment.top),
            }
          : null;

        renderedPaneLayout = {
          candle: normalizedCandleSegment,
          stoch: normalizedStochSegment,
          rsi: normalizedRsiSegment,
          volume: normalizedVolumeSegment,
        };

        const getPaddedSegment = (segment) => {
          if (!segment || segment.height <= 0) {
            return null;
          }

          const maxTopPadding = Math.max(0, segment.height - 0.001);
          const topPadding = Math.min(paneTopPaddingRatio, maxTopPadding);
          return {
            top: segment.top + topPadding,
            bottom: segment.bottom,
          };
        };

        const paddedVolumeSegment = getPaddedSegment(normalizedVolumeSegment);
        const paddedStochSegment = getPaddedSegment(normalizedStochSegment);
        const paddedRsiSegment = getPaddedSegment(normalizedRsiSegment);

        const canvasHeightPx = Math.max(1, chartCanvas ? chartCanvas.clientHeight : chartElement.clientHeight);
        const timeScaleApi = chart.timeScale();
        const timeScaleHeightPx =
          timeScaleApi && typeof timeScaleApi.height === "function"
            ? Math.max(0, Number(timeScaleApi.height()) || 0)
            : 0;
        const drawableHeightPx = Math.max(1, canvasHeightPx - timeScaleHeightPx);

        const toScaleMarginTop = (ratio) => {
          const topPx = clamp(ratio, 0, 1) * canvasHeightPx;
          return clamp(topPx / drawableHeightPx, 0, 1);
        };

        const toScaleMarginBottom = (ratio) => {
          const bottomPx = clamp(ratio, 0, 1) * canvasHeightPx;
          return clamp(bottomPx / drawableHeightPx, 0, 1);
        };

        const getScaleMargins = (segment) => {
          if (!segment) {
            return { top: 1, bottom: 0 };
          }

          const topMargin = toScaleMarginTop(segment.top);
          const bottomMargin = toScaleMarginBottom(1 - segment.bottom);
          const overflow = topMargin + bottomMargin - 1;

          if (overflow <= 0) {
            return { top: topMargin, bottom: bottomMargin };
          }

          return {
            top: clamp(topMargin - overflow / 2, 0, 1),
            bottom: clamp(bottomMargin - overflow / 2, 0, 1),
          };
        };

        const candleScaleMargins = getScaleMargins(normalizedCandleSegment);
        const volumeScaleMargins = getScaleMargins(paddedVolumeSegment);
        const stochScaleMargins = getScaleMargins(paddedStochSegment);
        const rsiScaleMargins = getScaleMargins(paddedRsiSegment);

        candleSeries.priceScale().applyOptions({
          scaleMargins: candleScaleMargins,
        });

        chart.priceScale("volume").applyOptions({
          visible: Boolean(normalizedVolumeSegment),
          autoScale: true,
          borderColor: chartThemeColors.border,
          borderVisible: false,
          ticksVisible: true,
          minimumWidth: 64,
          scaleMargins: volumeScaleMargins,
        });

        chart.priceScale("stoch").applyOptions({
          visible: Boolean(normalizedStochSegment),
          autoScale: true,
          borderColor: chartThemeColors.border,
          borderVisible: false,
          ticksVisible: true,
          minimumWidth: 58,
          scaleMargins: stochScaleMargins,
        });

        chart.priceScale("rsi").applyOptions({
          visible: Boolean(normalizedRsiSegment),
          autoScale: true,
          borderColor: chartThemeColors.border,
          borderVisible: false,
          ticksVisible: true,
          minimumWidth: 58,
          scaleMargins: rsiScaleMargins,
        });

        updateDividerForPane("stoch", stochDividerElement, stochDividerLabelElements, "Stoch");
        updateDividerForPane("rsi", rsiDividerElement, rsiDividerLabelElements, "RSI");
        updateDividerForPane("volume", scaleDividerElement, scaleDividerLabelElements, "Volume");

        if (indicatorState.volume) {
          localStorage.setItem(chartSplitStorageKey, String(chartSplitRatio));
        }

        if (indicatorState.stoch) {
          localStorage.setItem(stochSplitStorageKey, String(stochHeightRatio));
        }

        if (indicatorState.rsi) {
          localStorage.setItem(rsiSplitStorageKey, String(rsiHeightRatio));
        }

        localStorage.setItem(paneOrderStorageKey, JSON.stringify(paneOrder));
        renderPaneReorderHandles();
        renderPaneScaleOverlay();
        hidePriceHoverGuide();
      };

      const updateChartSplitFromClientY = (clientY) => {
        if (!chartCanvas) {
          return;
        }

        const canvasRect = chartCanvas.getBoundingClientRect();
        if (canvasRect.height <= 0) {
          return;
        }

        const nextRatio = (clientY - canvasRect.top) / canvasRect.height;
        const dividerBoundary = scaleDividerElement ? scaleDividerElement.dataset.boundary : "top";
        const volumeSegment = paneLayout.volume;
        if (!volumeSegment) {
          return;
        }

        let nextHeight = volumeSegment.height;
        if (dividerBoundary === "top") {
          nextHeight = volumeSegment.bottom - nextRatio;
        } else {
          nextHeight = nextRatio - volumeSegment.top;
        }

        const maxHeight = getPaneMaxHeightRatio("volume");
        const clampedHeight = clamp(nextHeight, minVisiblePaneHeightRatio, maxHeight);
        chartSplitRatio = 1 - clampedHeight;
        applyChartSplit();
      };

      const updateStochSplitFromClientY = (clientY) => {
        if (!chartCanvas) {
          return;
        }

        const canvasRect = chartCanvas.getBoundingClientRect();
        if (canvasRect.height <= 0) {
          return;
        }

        const nextRatio = (clientY - canvasRect.top) / canvasRect.height;
        const dividerBoundary = stochDividerElement ? stochDividerElement.dataset.boundary : "top";
        const stochSegment = paneLayout.stoch;
        if (!stochSegment) {
          return;
        }

        let nextHeight = stochHeightRatio;
        if (dividerBoundary === "top") {
          nextHeight = stochSegment.bottom - nextRatio;
        } else {
          nextHeight = nextRatio - stochSegment.top;
        }

        const maxHeight = getPaneMaxHeightRatio("stoch");
        stochHeightRatio = clamp(nextHeight, minVisiblePaneHeightRatio, maxHeight);
        applyChartSplit();
      };

      const updateRsiSplitFromClientY = (clientY) => {
        if (!chartCanvas) {
          return;
        }

        const canvasRect = chartCanvas.getBoundingClientRect();
        if (canvasRect.height <= 0) {
          return;
        }

        const nextRatio = (clientY - canvasRect.top) / canvasRect.height;
        const dividerBoundary = rsiDividerElement ? rsiDividerElement.dataset.boundary : "top";
        const rsiSegment = paneLayout.rsi;
        if (!rsiSegment) {
          return;
        }

        let nextHeight = rsiHeightRatio;
        if (dividerBoundary === "top") {
          nextHeight = rsiSegment.bottom - nextRatio;
        } else {
          nextHeight = nextRatio - rsiSegment.top;
        }

        const maxHeight = getPaneMaxHeightRatio("rsi");
        rsiHeightRatio = clamp(nextHeight, minVisiblePaneHeightRatio, maxHeight);
        applyChartSplit();
      };

      const updateScaleDividerLabel = (isVisible) => {
        if (scaleDividerLabelElements.length === 0) {
          return;
        }

        if (!indicatorState.volume) {
          scaleDividerLabelElements.forEach((labelElement) => labelElement.classList.remove("is-visible"));
          return;
        }

        const volumePercent = Math.round((paneLayout.volume?.height || getVolumeHeightRatio()) * 100);
        scaleDividerLabelElements.forEach((labelElement) => {
          labelElement.textContent = `Volume ${volumePercent}%`;
          if (scaleDividerElement) {
            labelElement.style.top = scaleDividerElement.style.top;
          }
          labelElement.classList.toggle("is-visible", isVisible);
        });
      };

      const updateStochDividerLabel = (isVisible) => {
        if (stochDividerLabelElements.length === 0) {
          return;
        }

        if (!indicatorState.stoch) {
          stochDividerLabelElements.forEach((labelElement) => labelElement.classList.remove("is-visible"));
          return;
        }

        const stochPercent = Math.round((paneLayout.stoch?.height || getStochHeightRatio()) * 100);
        stochDividerLabelElements.forEach((labelElement) => {
          labelElement.textContent = `Stoch ${stochPercent}%`;
          if (stochDividerElement) {
            labelElement.style.top = stochDividerElement.style.top;
          }
          labelElement.classList.toggle("is-visible", isVisible);
        });
      };

      const updateRsiDividerLabel = (isVisible) => {
        if (rsiDividerLabelElements.length === 0) {
          return;
        }

        if (!indicatorState.rsi) {
          rsiDividerLabelElements.forEach((labelElement) => labelElement.classList.remove("is-visible"));
          return;
        }

        const rsiPercent = Math.round((paneLayout.rsi?.height || getRsiHeightRatio()) * 100);
        rsiDividerLabelElements.forEach((labelElement) => {
          labelElement.textContent = `RSI ${rsiPercent}%`;
          if (rsiDividerElement) {
            labelElement.style.top = rsiDividerElement.style.top;
          }
          labelElement.classList.toggle("is-visible", isVisible);
        });
      };

      if (paneReorderOverlayElement) {
        const stopPaneReorderDrag = () => {
          if (!draggedPaneName) {
            return;
          }

          draggedPaneName = null;
          paneReorderOverlayElement.querySelectorAll(".pane-reorder-handle").forEach((handle) => {
            handle.classList.remove("is-dragging");
          });
          document.body.classList.remove("is-dragging-pane-order");
        };

        paneReorderOverlayElement.addEventListener("mousedown", (event) => {
          const handle = event.target.closest(".pane-reorder-handle");
          if (!handle) {
            return;
          }

          event.preventDefault();
          draggedPaneName = handle.dataset.pane || null;
          if (!draggedPaneName) {
            return;
          }

          document.body.classList.add("is-dragging-pane-order");
          handle.classList.add("is-dragging");
          reorderPaneByPointer(event.clientY);
        });

        window.addEventListener("mousemove", (event) => {
          if (!draggedPaneName) {
            return;
          }

          reorderPaneByPointer(event.clientY);
        });

        window.addEventListener("mouseup", stopPaneReorderDrag);
        window.addEventListener("mouseleave", stopPaneReorderDrag);
      }

      if (scaleDividerElement) {
        const stopDividerDrag = () => {
          if (!isDraggingScaleDivider) {
            return;
          }

          isDraggingScaleDivider = false;
          document.body.classList.remove("is-dragging-scale-divider");
          updateScaleDividerLabel(false);
        };

        scaleDividerElement.addEventListener("mousedown", (event) => {
          if (!indicatorState.volume) {
            return;
          }

          event.preventDefault();
          isDraggingScaleDivider = true;
          document.body.classList.add("is-dragging-scale-divider");
          updateChartSplitFromClientY(event.clientY);
          updateScaleDividerLabel(true);
        });

        window.addEventListener("mousemove", (event) => {
          if (!isDraggingScaleDivider) {
            return;
          }

          updateChartSplitFromClientY(event.clientY);
          updateScaleDividerLabel(true);
        });

        window.addEventListener("mouseup", stopDividerDrag);
        window.addEventListener("mouseleave", stopDividerDrag);
      }

      if (stochDividerElement) {
        const stopStochDividerDrag = () => {
          if (!isDraggingStochDivider) {
            return;
          }

          isDraggingStochDivider = false;
          document.body.classList.remove("is-dragging-scale-divider");
          updateStochDividerLabel(false);
        };

        stochDividerElement.addEventListener("mousedown", (event) => {
          if (!indicatorState.stoch) {
            return;
          }

          event.preventDefault();
          isDraggingStochDivider = true;
          document.body.classList.add("is-dragging-scale-divider");
          updateStochSplitFromClientY(event.clientY);
          updateStochDividerLabel(true);
        });

        window.addEventListener("mousemove", (event) => {
          if (!isDraggingStochDivider) {
            return;
          }

          updateStochSplitFromClientY(event.clientY);
          updateStochDividerLabel(true);
        });

        window.addEventListener("mouseup", stopStochDividerDrag);
        window.addEventListener("mouseleave", stopStochDividerDrag);
      }

      if (rsiDividerElement) {
        const stopRsiDividerDrag = () => {
          if (!isDraggingRsiDivider) {
            return;
          }

          isDraggingRsiDivider = false;
          document.body.classList.remove("is-dragging-scale-divider");
          updateRsiDividerLabel(false);
        };

        rsiDividerElement.addEventListener("mousedown", (event) => {
          if (!indicatorState.rsi) {
            return;
          }

          event.preventDefault();
          isDraggingRsiDivider = true;
          document.body.classList.add("is-dragging-scale-divider");
          updateRsiSplitFromClientY(event.clientY);
          updateRsiDividerLabel(true);
        });

        window.addEventListener("mousemove", (event) => {
          if (!isDraggingRsiDivider) {
            return;
          }

          updateRsiSplitFromClientY(event.clientY);
          updateRsiDividerLabel(true);
        });

        window.addEventListener("mouseup", stopRsiDividerDrag);
        window.addEventListener("mouseleave", stopRsiDividerDrag);
      }

      if (chartOrderPreviewElement) {
        const stopChartOrderPreviewDrag = () => {
          if (!isDraggingChartOrderPreview) {
            return;
          }

          isDraggingChartOrderPreview = false;
          chartOrderPreviewElement.classList.remove("is-dragging");
          document.body.classList.remove("is-dragging-order-preview");
        };

        chartOrderPreviewElement.addEventListener("mousedown", (event) => {
          if (event.target instanceof Element && event.target.closest("#chart-order-preview-clear-btn")) {
            return;
          }

          if (!chartOrderPreviewElement.classList.contains("is-visible")) {
            return;
          }

          event.preventDefault();
          isDraggingChartOrderPreview = true;
          chartOrderPreviewElement.classList.add("is-dragging");
          document.body.classList.add("is-dragging-order-preview");
          updateOrderPriceFromPreviewDrag(event.clientY);
        });

        window.addEventListener("mousemove", (event) => {
          if (!isDraggingChartOrderPreview) {
            return;
          }

          updateOrderPriceFromPreviewDrag(event.clientY);
        });

        window.addEventListener("mouseup", stopChartOrderPreviewDrag);
        window.addEventListener("mouseleave", stopChartOrderPreviewDrag);
      }

      if (chartOrderPreviewClearButtonElement && orderPriceInputElement) {
        chartOrderPreviewClearButtonElement.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });

        chartOrderPreviewClearButtonElement.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (String(orderPriceInputElement.value || "").trim() === "") {
            return;
          }

          orderPriceInputElement.value = "";
          orderPriceInputElement.dispatchEvent(new Event("input", { bubbles: true }));
          renderChartOrderPreview();
        });
      }

      if (chartStopPreviewElement) {
        const stopChartStopPreviewDrag = () => {
          if (!isDraggingChartStopPreview) {
            return;
          }

          isDraggingChartStopPreview = false;
          chartStopPreviewElement.classList.remove("is-dragging");
          document.body.classList.remove("is-dragging-order-preview");
        };

        chartStopPreviewElement.addEventListener("mousedown", (event) => {
          if (!chartStopPreviewElement.classList.contains("is-visible") || !isStopOrderTypeSelected()) {
            return;
          }

          event.preventDefault();
          isDraggingChartStopPreview = true;
          chartStopPreviewElement.classList.add("is-dragging");
          document.body.classList.add("is-dragging-order-preview");
          updateStopPriceFromPreviewDrag(event.clientY);
        });

        window.addEventListener("mousemove", (event) => {
          if (!isDraggingChartStopPreview) {
            return;
          }

          updateStopPriceFromPreviewDrag(event.clientY);
        });

        window.addEventListener("mouseup", stopChartStopPreviewDrag);
        window.addEventListener("mouseleave", stopChartStopPreviewDrag);
      }

      const fvgZoneSeries = [];
      const smcGuideSeries = [];
      let currentFvgZones = [];
      let currentSmcZones = [];
      let currentSmcLabels = [];
      const fvgDisplayLengthCandles = 20;
      const fvgMinGapPercent = 0.3;

      const clearFvgOverlay = () => {
        if (fvgOverlayElement) {
          fvgOverlayElement.innerHTML = "";
        }
      };

      const clearSmcOverlay = () => {
        if (smcOverlayElement) {
          smcOverlayElement.innerHTML = "";
        }
      };

      const clearSmcGuideSeries = () => {
        while (smcGuideSeries.length > 0) {
          const lineSeries = smcGuideSeries.pop();
          chart.removeSeries(lineSeries);
        }
      };

      const clearFvgZoneSeries = () => {
        while (fvgZoneSeries.length > 0) {
          const zone = fvgZoneSeries.pop();
          chart.removeSeries(zone.upperSeries);
          chart.removeSeries(zone.lowerSeries);
        }

        currentFvgZones = [];
        clearFvgOverlay();
      };

      const renderFvgOverlay = () => {
        if (!fvgOverlayElement) {
          return;
        }

        clearFvgOverlay();

        if (!indicatorState.fvg || currentFvgZones.length === 0) {
          return;
        }

        currentFvgZones.forEach((zone) => {
          const startX = chart.timeScale().timeToCoordinate(zone.startTime);
          const endX = chart.timeScale().timeToCoordinate(zone.endTime);
          const upperY = candleSeries.priceToCoordinate(zone.upper);
          const lowerY = candleSeries.priceToCoordinate(zone.lower);

          if (
            startX === null ||
            endX === null ||
            upperY === null ||
            lowerY === null ||
            Number.isNaN(startX) ||
            Number.isNaN(endX) ||
            Number.isNaN(upperY) ||
            Number.isNaN(lowerY)
          ) {
            return;
          }

          const left = Math.min(startX, endX);
          const width = Math.max(1, Math.abs(endX - startX));
          const top = Math.min(upperY, lowerY);
          const height = Math.max(1, Math.abs(lowerY - upperY));

          const zoneElement = document.createElement("div");
          zoneElement.className = zone.isBullish ? "fvg-zone fvg-zone--bull" : "fvg-zone fvg-zone--bear";
          zoneElement.style.left = `${left}px`;
          zoneElement.style.top = `${top}px`;
          zoneElement.style.width = `${width}px`;
          zoneElement.style.height = `${height}px`;
          fvgOverlayElement.appendChild(zoneElement);
        });
      };

      const renderSmcOverlay = () => {
        if (!smcOverlayElement) {
          return;
        }

        clearSmcOverlay();

        if (!indicatorState.smc || (currentSmcZones.length === 0 && currentSmcLabels.length === 0)) {
          return;
        }

        const chartCanvasWidth = chartCanvas ? chartCanvas.clientWidth : 0;
        const rightScaleReservePx = 66;
        const maxDrawableRightPx = Math.max(0, chartCanvasWidth - rightScaleReservePx);

        currentSmcZones.forEach((zone) => {
          const startX = chart.timeScale().timeToCoordinate(zone.startTime);
          const endX = chart.timeScale().timeToCoordinate(zone.endTime);
          const upperY = candleSeries.priceToCoordinate(zone.upper);
          const lowerY = candleSeries.priceToCoordinate(zone.lower);

          if (
            startX === null ||
            endX === null ||
            upperY === null ||
            lowerY === null ||
            Number.isNaN(startX) ||
            Number.isNaN(endX) ||
            Number.isNaN(upperY) ||
            Number.isNaN(lowerY)
          ) {
            return;
          }

          const rawLeft = Math.min(startX, endX);
          const rawRight = Math.max(startX, endX);
          const left = Math.max(0, rawLeft);
          const right = Math.min(maxDrawableRightPx, rawRight);
          const width = Math.max(0, right - left);
          const top = Math.min(upperY, lowerY);
          const height = Math.max(1, Math.abs(lowerY - upperY));

          if (width <= 0) {
            return;
          }

          const zoneElement = document.createElement("div");
          zoneElement.className = zone.isBullish ? "smc-zone smc-zone--bull" : "smc-zone smc-zone--bear";
          zoneElement.style.left = `${left}px`;
          zoneElement.style.top = `${top}px`;
          zoneElement.style.width = `${width}px`;
          zoneElement.style.height = `${height}px`;
          smcOverlayElement.appendChild(zoneElement);
        });

        currentSmcLabels.forEach((label) => {
          const startX = chart.timeScale().timeToCoordinate(label.startTime);
          const endX = chart.timeScale().timeToCoordinate(label.endTime);
          const y = candleSeries.priceToCoordinate(label.price);

          if (
            startX === null ||
            endX === null ||
            y === null ||
            Number.isNaN(startX) ||
            Number.isNaN(endX) ||
            Number.isNaN(y)
          ) {
            return;
          }

          const midpointX = (startX + endX) / 2;
          const clampedX = Math.max(0, Math.min(maxDrawableRightPx, midpointX));

          const labelElement = document.createElement("div");
          labelElement.className = "smc-structure-label";
          labelElement.textContent = label.text;
          labelElement.style.left = `${clampedX}px`;
          labelElement.style.top = `${y}px`;
          labelElement.style.color = label.color;
          smcOverlayElement.appendChild(labelElement);
        });
      };

      const renderSmcGuides = (guides) => {
        clearSmcGuideSeries();

        if (!indicatorState.smc || !guides) {
          return;
        }

        const buildGuideSeries = (guide, style) => {
          const series = chart.addSeries(LightweightCharts.LineSeries, {
            priceScaleId: "price",
            color: guide.color,
            lineWidth: style === "dashed" ? 1 : 2,
            lineStyle: style === "dashed" ? LightweightCharts.LineStyle.Dashed : LightweightCharts.LineStyle.Solid,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });

          series.setData([
            { time: guide.startTime, value: guide.price },
            { time: guide.endTime, value: guide.price },
          ]);

          smcGuideSeries.push(series);
        };

        guides.dashed.forEach((guide) => buildGuideSeries(guide, "dashed"));
        guides.solid.forEach((guide) => buildGuideSeries(guide, "solid"));
      };

      // Debounce overlay rendering to prevent excessive DOM mutations during rapid updates
      const scheduleOverlayRender = () => {
        if (pendingOverlayRenderTimerId !== null) {
          return; // Already scheduled
        }
        pendingOverlayRenderTimerId = window.setTimeout(() => {
          pendingOverlayRenderTimerId = null;
          renderFvgOverlay();
          renderSmcOverlay();
        }, 50); // Debounce 50ms to batch rapid render calls
      };

      const syncChartViewportSize = () => {
        const nextWidth = chartElement ? chartElement.clientWidth : 0;
        const nextHeight = chartElement ? chartElement.clientHeight : 0;

        if (nextWidth <= 0 || nextHeight <= 0) {
          return false;
        }

        if (nextWidth === lastAppliedChartWidth && nextHeight === lastAppliedChartHeight) {
          return false;
        }

        lastAppliedChartWidth = nextWidth;
        lastAppliedChartHeight = nextHeight;
        chart.applyOptions({
          width: nextWidth,
          height: nextHeight,
        });
        return true;
      };

      const chartResizeObserver = new ResizeObserver(() => {
        syncChartViewportSize();
        applyChartSplit();
        renderFvgOverlay();
        renderSmcOverlay();
        renderChartOrderPreview();
        renderDynamicPriceScaleLines();
        renderPaneScaleOverlay();
        renderSelectedHorizontalLineHandle();
        renderSelectedTrendLineHandles();
        updateScrollToRecentButtonVisibility();
      });
      chartResizeObserver.observe(chartElement);

      let paneScaleOverlayRafId = null;
      const schedulePaneScaleOverlayRender = () => {
        if (paneScaleOverlayRafId !== null) {
          return;
        }

        paneScaleOverlayRafId = window.requestAnimationFrame(() => {
          paneScaleOverlayRafId = null;
          drawnLineSeries.forEach((lineEntry) => {
            applyHorizontalLineVisualState(lineEntry);
          });
          renderChartOrderPreview();
          renderDynamicPriceScaleLines();
          renderPaneScaleOverlay();
          renderSelectedHorizontalLineHandle();
          renderSelectedTrendLineHandles();
        });
      };

      // Throttle wheel events to improve zoom performance
      let wheelEventThrottleTimeoutId = null;
      const throttledSchedulePaneScaleOverlayRender = () => {
        if (wheelEventThrottleTimeoutId !== null) {
          return;
        }
        schedulePaneScaleOverlayRender();
        wheelEventThrottleTimeoutId = window.setTimeout(() => {
          wheelEventThrottleTimeoutId = null;
        }, 50);
      };

      chartElement.addEventListener("wheel", () => {
        throttledSchedulePaneScaleOverlayRender();
      }, { passive: true });

      const getPriceScaleRange = () => {
        const priceScaleApi = chart.priceScale("price");
        const visibleRange = priceScaleApi.getVisibleRange();
        const from = Number(visibleRange?.from);
        const to = Number(visibleRange?.to);
        if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
           // Fallback: derive range from visible coordinates when autoscale is active
           const candleSegment = renderedPaneLayout.candle || paneLayout.candle || null;
           const chartRect = chartElement.getBoundingClientRect();
           if (!candleSegment || chartRect.height <= 2) return null;
           const topY = clamp(Number(candleSegment.top) * chartRect.height + 2, 1, chartRect.height - 1);
           const bottomY = clamp(Number(candleSegment.bottom) * chartRect.height - 2, 1, chartRect.height - 1);
           const topPrice = Number(candleSeries.coordinateToPrice(topY));
           const bottomPrice = Number(candleSeries.coordinateToPrice(bottomY));
           if (!Number.isFinite(topPrice) || !Number.isFinite(bottomPrice) || topPrice === bottomPrice) return null;
           return { from: Math.min(topPrice, bottomPrice), to: Math.max(topPrice, bottomPrice) };
        }
        return { from, to };
      };

      const getPriceFromClientY = (clientY) => {
        const chartRect = chartElement.getBoundingClientRect();
        const y = clamp(Number(clientY) - chartRect.top, 1, chartRect.height - 1);
        const value = Number(candleSeries.coordinateToPrice(y));
        return Number.isFinite(value) ? value : null;
      };

      const setManualPriceScaleRange = (nextRange) => {
        const from = Number(nextRange?.from);
        const to = Number(nextRange?.to);
        if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
          return;
        }
        const priceScaleApi = chart.priceScale("price");
        priceScaleApi.setAutoScale(false);
        priceScaleApi.setVisibleRange({ from, to });
        scheduleVisibleRangeRender();
      };

      const resetAutomaticPriceScale = () => {
        const priceScaleApi = chart.priceScale("price");
        priceScaleApi.setAutoScale(true);
        scheduleVisibleRangeRender();
      };

      const zoomManualPriceScaleAtPoint = (clientY, deltaY) => {
        const visibleRange = getPriceScaleRange();
        if (!visibleRange) {
          return;
        }

        const normalizedDelta = Number(deltaY);
        if (!Number.isFinite(normalizedDelta) || normalizedDelta === 0) {
          return;
        }

        // Convert wheel delta into bounded zoom steps so trackpads and mice both feel responsive.
        const zoomSteps = clamp(normalizedDelta / 100, -6, 6);
        const zoomFactor = Math.pow(1.08, zoomSteps);
        const centerPrice = getPriceFromClientY(clientY) ?? ((visibleRange.from + visibleRange.to) / 2);
        const nextFrom = centerPrice - ((centerPrice - visibleRange.from) * zoomFactor);
        const nextTo = centerPrice + ((visibleRange.to - centerPrice) * zoomFactor);

        if (Number.isFinite(nextFrom) && Number.isFinite(nextTo) && nextTo > nextFrom) {
          setManualPriceScaleRange({ from: nextFrom, to: nextTo });
        }
      };

      if (priceLabelInteractionPanelElement) {
        let pendingPriceScaleWheelDelta = 0;
        let pendingPriceScaleWheelClientY = null;
        let priceScaleWheelFlushTimerId = null;
        const PRICE_SCALE_WHEEL_FLUSH_MS = 150;

        const flushPriceScaleWheelZoom = () => {
          priceScaleWheelFlushTimerId = null;

          const deltaToApply = pendingPriceScaleWheelDelta;
          const clientYToApply = pendingPriceScaleWheelClientY;
          pendingPriceScaleWheelDelta = 0;
          pendingPriceScaleWheelClientY = null;

          if (!Number.isFinite(deltaToApply) || deltaToApply === 0) {
            return;
          }

          // Mark as interacting
          isPriceScaleWheelInteracting = true;
          if (priceScaleWheelIdleTimerId !== null) {
            clearTimeout(priceScaleWheelIdleTimerId);
            priceScaleWheelIdleTimerId = null;
          }
          // Cancel pending overlay projection to avoid race condition
          if (overlayProjectionTimerId !== null) {
            clearTimeout(overlayProjectionTimerId);
            overlayProjectionTimerId = null;
          }
          zoomManualPriceScaleAtPoint(clientYToApply, deltaToApply);
          throttledSchedulePaneScaleOverlayRender();
          // Start idle timer to end interaction after 200ms
          priceScaleWheelIdleTimerId = window.setTimeout(() => {
            isPriceScaleWheelInteracting = false;
            priceScaleWheelIdleTimerId = null;
            // Force all overlays to render after idle
            scheduleOverlayRender();
            renderPaneScaleOverlay();
          }, 200);
        };

        priceLabelInteractionPanelElement.addEventListener("wheel", (event) => {
          event.preventDefault();
          event.stopPropagation();

          pendingPriceScaleWheelDelta += Number(event.deltaY) || 0;
          pendingPriceScaleWheelClientY = Number(event.clientY);
          if (priceScaleWheelFlushTimerId === null) {
            priceScaleWheelFlushTimerId = window.setTimeout(flushPriceScaleWheelZoom, PRICE_SCALE_WHEEL_FLUSH_MS);
          }
        }, { passive: false });

        priceLabelInteractionPanelElement.addEventListener("mousedown", (event) => {
          if (event.button !== 0) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          isDraggingPriceScale = true;
          priceScaleDragStartRange = getPriceScaleRange();
          priceScaleDragStartPrice = getPriceFromClientY(event.clientY);
          priceScaleDragStartClientY = Number(event.clientY);
          priceLabelInteractionPanelElement.classList.add("is-dragging");
        });

        priceLabelInteractionPanelElement.addEventListener("dblclick", (event) => {
          event.preventDefault();
          event.stopPropagation();
          isDraggingPriceScale = false;
          priceScaleDragStartRange = null;
          priceScaleDragStartPrice = null;
          priceScaleDragStartClientY = null;
          priceLabelInteractionPanelElement.classList.remove("is-dragging");
          resetAutomaticPriceScale();
          schedulePaneScaleOverlayRender();
        });
      }

      window.addEventListener("mousemove", (event) => {
        if (!isDraggingPriceScale) {
          return;
        }

        const dragStartRange = priceScaleDragStartRange;
        const dragStartPrice = priceScaleDragStartPrice;
        const dragStartClientY = priceScaleDragStartClientY;
        const dragCurrentClientY = Number(event.clientY);
        if (dragStartRange && Number.isFinite(dragStartPrice) && Number.isFinite(dragStartClientY) && Number.isFinite(dragCurrentClientY)) {
          const pixelDelta = dragCurrentClientY - dragStartClientY;
          const zoomFactor = Math.pow(1.08, pixelDelta / 48);
          const nextFrom = dragStartPrice - ((dragStartPrice - dragStartRange.from) * zoomFactor);
          const nextTo = dragStartPrice + ((dragStartRange.to - dragStartPrice) * zoomFactor);

          if (Number.isFinite(nextFrom) && Number.isFinite(nextTo) && nextTo > nextFrom) {
            setManualPriceScaleRange({
              from: nextFrom,
              to: nextTo,
            });
          }
          schedulePaneScaleOverlayRender();
        }
      });

      window.addEventListener("mouseup", () => {
        if (!isDraggingPriceScale) {
          return;
        }

        isDraggingPriceScale = false;
        priceScaleDragStartRange = null;
        priceScaleDragStartPrice = null;
        priceScaleDragStartClientY = null;
        priceLabelInteractionPanelElement?.classList.remove("is-dragging");
        schedulePaneScaleOverlayRender();
      });

      chartElement.addEventListener("pointermove", (event) => {
        if (event.buttons !== 0) {
          schedulePaneScaleOverlayRender();
        }
      });

      chartElement.addEventListener("pointerup", () => {
        schedulePaneScaleOverlayRender();
      });

      // Native price-scale interactions are handled by Lightweight Charts via
      // handleScale/handleScroll options configured at chart creation time.

      chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        scheduleVisibleRangeRender();
      });

      const CHART_VIEW_STORAGE_DEBOUNCE_MS = 250;
      const OVERLAY_PROJECTION_THROTTLE_MS = 120;
      let visibleRangeRenderRafId = null;
      let chartViewStorageTimerId = null;
      let overlayProjectionTimerId = null;

      const persistChartViewToStorage = () => {
        try {
          localStorage.setItem(chartViewStorageKey, JSON.stringify(savedChartViewByTimeframe));
        } catch (_error) {
        }
      };

      const scheduleVisibleRangeRender = () => {
        if (visibleRangeRenderRafId !== null) {
          return;
        }

        visibleRangeRenderRafId = window.requestAnimationFrame(() => {
          visibleRangeRenderRafId = null;
          // Skip overlay render if price-scale wheel is active to avoid race condition
          if (!isPriceScaleWheelInteracting) {
            if (overlayProjectionTimerId === null) {
              overlayProjectionTimerId = window.setTimeout(() => {
                overlayProjectionTimerId = null;
                scheduleOverlayRender();
              }, OVERLAY_PROJECTION_THROTTLE_MS);
            }
          }
          schedulePaneScaleOverlayRender();
          updateScrollToRecentButtonVisibility();
        });
      };

      const scheduleChartViewStoragePersist = () => {
        if (chartViewStorageTimerId) {
          window.clearTimeout(chartViewStorageTimerId);
        }

        chartViewStorageTimerId = window.setTimeout(() => {
          chartViewStorageTimerId = null;
          persistChartViewToStorage();
        }, CHART_VIEW_STORAGE_DEBOUNCE_MS);
      };

      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (!range || !Number.isFinite(Number(range.from)) || !Number.isFinite(Number(range.to))) {
          return;
        }

        savedChartViewByTimeframe[getChartViewKey()] = {
          from: Number(range.from),
          to: Number(range.to),
        };

        scheduleChartViewStoragePersist();
      });

      window.addEventListener("beforeunload", () => {
        if (chartViewStorageTimerId) {
          window.clearTimeout(chartViewStorageTimerId);
          chartViewStorageTimerId = null;
        }

        persistChartViewToStorage();
      });

      const formatValue = (value) => (value === null || value === undefined ? "-" : String(value));
      const formatCompactVolume = (value) => {
        if (value === null || value === undefined || Number.isNaN(Number(value))) {
          return "-";
        }

        const number = Number(value);
        const absolute = Math.abs(number);

        if (absolute >= 1_000_000) {
          return `${(number / 1_000_000).toFixed(2)}M`;
        }
        if (absolute >= 1_000) {
          return `${(number / 1_000).toFixed(2)}k`;
        }
        return number.toFixed(2);
      };

      const setRefreshStatus = (text, state) => {
        if (!refreshStatusElement) {
          return;
        }

        refreshStatusElement.textContent = text;
        refreshStatusElement.classList.remove("is-live", "is-updating", "is-error");
        refreshStatusElement.classList.add(state);
      };

      const formatUpdatingStatusText = (itemLabel) => {
        const normalizedLabel = String(itemLabel || "").trim();
        if (!normalizedLabel) {
          return "Updating...";
        }

        return `Updating ${normalizedLabel}`;
      };

      const beginExchangeRetrievalRequest = () => {
        pendingExchangeRetrievalRequests += 1;
        if (pendingExchangeRetrievalRequests !== 1) {
          return;
        }

        exchangeRetrievalStatusShown = false;
        if (exchangeRetrievalStatusTimerId) {
          window.clearTimeout(exchangeRetrievalStatusTimerId);
          exchangeRetrievalStatusTimerId = null;
        }

        exchangeRetrievalStatusTimerId = window.setTimeout(() => {
          exchangeRetrievalStatusTimerId = null;
          if (pendingExchangeRetrievalRequests > 0) {
            exchangeRetrievalStatusShown = true;
            setRefreshStatus(EXCHANGE_RETRIEVAL_STATUS_TEXT, "is-updating");
          }
        }, EXCHANGE_RETRIEVAL_STATUS_DELAY_MS);
      };

      const endExchangeRetrievalRequest = () => {
        pendingExchangeRetrievalRequests = Math.max(0, pendingExchangeRetrievalRequests - 1);
        if (pendingExchangeRetrievalRequests > 0) {
          return;
        }

        if (exchangeRetrievalStatusTimerId) {
          window.clearTimeout(exchangeRetrievalStatusTimerId);
          exchangeRetrievalStatusTimerId = null;
        }

        if (
          exchangeRetrievalStatusShown
          && refreshStatusElement
          && String(refreshStatusElement.textContent || "").trim() === EXCHANGE_RETRIEVAL_STATUS_TEXT
        ) {
          setRefreshStatus("Live", "is-live");
        }

        exchangeRetrievalStatusShown = false;
      };

      const fetchWithExchangeRetrievalStatus = async (resource, init) => {
        beginExchangeRetrievalRequest();
        try {
          return await fetch(resource, init);
        } finally {
          endExchangeRetrievalRequest();
        }
      };

      const formatPriceGuideValue = (value) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return "-";
        }

        if (Math.abs(numericValue) >= 1000) {
          return numericValue.toFixed(0);
        }

        return numericValue.toFixed(2);
      };

      const hidePriceHoverGuide = () => {
        if (priceHoverGuideLineElement) {
          priceHoverGuideLineElement.classList.remove("is-visible");
        }
        if (priceHoverGuideLabelElement) {
          priceHoverGuideLabelElement.classList.remove("is-visible");
        }
      };

      const renderSelectedHorizontalLineHandle = () => {
        if (!horizontalLineSelectionHandleElement || !chartCanvas) {
          return;
        }

        if (!selectedHorizontalLineEntry || selectedHorizontalLineEntry.removed || drawLineMode) {
          horizontalLineSelectionHandleElement.classList.remove("is-visible");
          return;
        }

        const selectedPrice = Number(selectedHorizontalLineEntry.price);
        if (!Number.isFinite(selectedPrice) || selectedPrice <= 0) {
          horizontalLineSelectionHandleElement.classList.remove("is-visible");
          return;
        }

        const yCoordinate = candleSeries.priceToCoordinate(selectedPrice);
        if (!Number.isFinite(Number(yCoordinate))) {
          horizontalLineSelectionHandleElement.classList.remove("is-visible");
          return;
        }

        if (!isYCoordinateInCandlePane(yCoordinate)) {
          horizontalLineSelectionHandleElement.classList.remove("is-visible");
          return;
        }

        const canvasHeight = chartCanvas.clientHeight;
        const canvasWidth = chartCanvas.clientWidth;
        if (canvasHeight <= 0 || canvasWidth <= 0) {
          horizontalLineSelectionHandleElement.classList.remove("is-visible");
          return;
        }

        const candlePaneBounds = resolveCandlePaneBoundsPx();
        if (!candlePaneBounds) {
          horizontalLineSelectionHandleElement.classList.remove("is-visible");
          return;
        }

        const rightScaleReservePx = 66;
        const maxDrawableRightPx = Math.max(0, canvasWidth - rightScaleReservePx);
        const handleX = Math.max(10, maxDrawableRightPx / 2);
        const handleY = Number(yCoordinate);

        horizontalLineSelectionHandleElement.style.left = `${handleX}px`;
        horizontalLineSelectionHandleElement.style.top = `${handleY}px`;
        horizontalLineSelectionHandleElement.classList.add("is-visible");
      };

      const renderSelectedTrendLineHandles = () => {
        if (!trendLineStartHandleElement || !trendLineEndHandleElement || !chartCanvas) {
          return;
        }

        const hideHandles = () => {
          trendLineStartHandleElement.classList.remove("is-visible");
          trendLineEndHandleElement.classList.remove("is-visible");
        };

        if (!selectedTrendLineEntry || selectedTrendLineEntry.removed || drawLineMode) {
          hideHandles();
          return;
        }

        const startX = chart.timeScale().timeToCoordinate(Number(selectedTrendLineEntry.startTime));
        const endX = chart.timeScale().timeToCoordinate(Number(selectedTrendLineEntry.endTime));
        const startY = candleSeries.priceToCoordinate(Number(selectedTrendLineEntry.startPrice));
        const endY = candleSeries.priceToCoordinate(Number(selectedTrendLineEntry.endPrice));

        if (![startX, endX, startY, endY].every((value) => Number.isFinite(Number(value)))) {
          hideHandles();
          return;
        }

        if (!isYCoordinateInCandlePane(Number(startY)) || !isYCoordinateInCandlePane(Number(endY))) {
          hideHandles();
          return;
        }

        trendLineStartHandleElement.style.left = `${Number(startX)}px`;
        trendLineStartHandleElement.style.top = `${Number(startY)}px`;
        trendLineEndHandleElement.style.left = `${Number(endX)}px`;
        trendLineEndHandleElement.style.top = `${Number(endY)}px`;
        trendLineStartHandleElement.classList.add("is-visible");
        trendLineEndHandleElement.classList.add("is-visible");
      };

      const updateTrendLineEntryEndpoint = (lineEntry, endpoint, point) => {
        if (!lineEntry || lineEntry.removed || !point) {
          return false;
        }

        const nextTime = Number(point.time);
        const nextPrice = Number(point.price);
        if (!Number.isFinite(nextTime) || !Number.isFinite(nextPrice) || nextPrice <= 0) {
          return false;
        }

        if (endpoint === "start") {
          lineEntry.startTime = nextTime;
          lineEntry.startPrice = nextPrice;
        } else if (endpoint === "end") {
          lineEntry.endTime = nextTime;
          lineEntry.endPrice = nextPrice;
        } else {
          return false;
        }

        lineEntry.series.setData([
          { time: Number(lineEntry.startTime), value: Number(lineEntry.startPrice) },
          { time: Number(lineEntry.endTime), value: Number(lineEntry.endPrice) },
        ]);
        applyTrendLineVisualState(lineEntry);
        renderSelectedTrendLineHandles();
        return true;
      };

      const updateTrendLineEntryByDrag = (lineEntry, state, pointerX, pointerY) => {
        if (!lineEntry || lineEntry.removed || !state) {
          return false;
        }

        const nextPointerX = Number(pointerX);
        const nextPointerY = Number(pointerY);
        if (!Number.isFinite(nextPointerX) || !Number.isFinite(nextPointerY)) {
          return false;
        }

        const dx = nextPointerX - Number(state.pointerX);
        const dy = nextPointerY - Number(state.pointerY);

        const candlePaneBounds = resolveCandlePaneBoundsPx();
        if (!candlePaneBounds) {
          return false;
        }

        const clampYToPane = (value) => clamp(Number(value), candlePaneBounds.top, candlePaneBounds.bottom);

        const nextStartX = Number(state.startX) + dx;
        const nextEndX = Number(state.endX) + dx;
        const nextStartY = clampYToPane(Number(state.startY) + dy);
        const nextEndY = clampYToPane(Number(state.endY) + dy);

        const nextStartTime = resolveTimeFromXCoordinate(nextStartX);
        const nextEndTime = resolveTimeFromXCoordinate(nextEndX);
        const nextStartPrice = Number(candleSeries.coordinateToPrice(nextStartY));
        const nextEndPrice = Number(candleSeries.coordinateToPrice(nextEndY));

        if (!Number.isFinite(nextStartTime) || !Number.isFinite(nextEndTime)) {
          return false;
        }

        if (!Number.isFinite(nextStartPrice) || !Number.isFinite(nextEndPrice) || nextStartPrice <= 0 || nextEndPrice <= 0) {
          return false;
        }

        lineEntry.startTime = nextStartTime;
        lineEntry.endTime = nextEndTime;
        lineEntry.startPrice = nextStartPrice;
        lineEntry.endPrice = nextEndPrice;
        lineEntry.series.setData([
          { time: Number(lineEntry.startTime), value: Number(lineEntry.startPrice) },
          { time: Number(lineEntry.endTime), value: Number(lineEntry.endPrice) },
        ]);

        applyTrendLineVisualState(lineEntry);
        renderSelectedTrendLineHandles();
        return true;
      };

      const updatePriceHoverGuide = (param) => {
        if (!priceHoverGuideLineElement || !priceHoverGuideLabelElement || !priceHoverGuideValueElement || !chartCanvas) {
          return;
        }

        if (!param || !param.point || !param.time) {
          hidePriceHoverGuide();
          return;
        }

        const yCoordinate = Number(param.point.y);
        if (!Number.isFinite(yCoordinate)) {
          hidePriceHoverGuide();
          return;
        }

        const canvasHeight = chartCanvas.clientHeight;
        const canvasWidth = chartCanvas.clientWidth;
        if (canvasHeight <= 0 || canvasWidth <= 0) {
          hidePriceHoverGuide();
          return;
        }

        const candlePaneBounds = resolveCandlePaneBoundsPx();
        if (!candlePaneBounds) {
          hidePriceHoverGuide();
          return;
        }

        const candleTopPx = candlePaneBounds.top;
        const candleBottomPx = candlePaneBounds.bottom;

        if (yCoordinate < candleTopPx || yCoordinate > candleBottomPx) {
          hidePriceHoverGuide();
          return;
        }

        const hoverPrice = candleSeries.coordinateToPrice(yCoordinate);
        if (!Number.isFinite(Number(hoverPrice))) {
          hidePriceHoverGuide();
          return;
        }

        const rightScaleReservePx = 66;
        const maxDrawableRightPx = Math.max(0, canvasWidth - rightScaleReservePx);

        priceHoverGuideLineElement.style.top = `${yCoordinate}px`;
        priceHoverGuideLineElement.style.left = "0px";
        priceHoverGuideLineElement.style.width = `${maxDrawableRightPx}px`;
        priceHoverGuideLineElement.classList.add("is-visible");

        priceHoverGuideValueElement.textContent = formatPriceGuideValue(hoverPrice);
        priceHoverGuideLabelElement.style.top = `${yCoordinate}px`;
        priceHoverGuideLabelElement.classList.add("is-visible");
      };

      const updateScrollToRecentButtonVisibility = () => {
        if (!scrollToRecentButtonElement) {
          return;
        }

        const scrollPosition = Number(chart.timeScale().scrollPosition());
        const isAwayFromLatest = Number.isFinite(scrollPosition) && scrollPosition < -3;
        scrollToRecentButtonElement.classList.toggle("is-visible", isAwayFromLatest);
      };

      const applyOrderAmountInputConstraints = (marketData) => {
        if (!orderAmountInputElement || !orderTotalInputElement || !orderPriceInputElement) {
          return;
        }

        const nextStep = marketData?.amount_step;
        const nextMin = marketData?.amount_min;
        const nextTotalMin = marketData?.total_min;
        const nextPriceMin = marketData?.price_min;
        const nextPriceMax = marketData?.price_max;
        const nextPriceStep = marketData?.price_step;
        const nextAmountPrecision = marketData?.amount_precision;
        const nextPricePrecision = marketData?.price_precision;

        const hasStep = typeof nextStep === "string" && nextStep.trim().length > 0;
        const hasMin = typeof nextMin === "string" && nextMin.trim().length > 0;
        const hasTotalMin = typeof nextTotalMin === "string" && nextTotalMin.trim().length > 0;
        const hasPriceMin = typeof nextPriceMin === "string" && nextPriceMin.trim().length > 0;
        const hasPriceMax = typeof nextPriceMax === "string" && nextPriceMax.trim().length > 0;
        const hasPriceStep = typeof nextPriceStep === "string" && nextPriceStep.trim().length > 0;
        const hasAmountPrecision = typeof nextAmountPrecision === "string" && nextAmountPrecision.trim().length > 0;
        const hasPricePrecision = typeof nextPricePrecision === "string" && nextPricePrecision.trim().length > 0;
        if (!hasStep && !hasMin && !hasTotalMin && !hasPriceMin && !hasPriceMax && !hasPriceStep && !hasAmountPrecision && !hasPricePrecision) {
          return;
        }

        if (hasStep) {
          orderAmountInputElement.setAttribute("step", nextStep);
        }

        if (hasAmountPrecision) {
          orderAmountInputElement.dataset.amountPrecision = nextAmountPrecision;
        }

        if (hasMin) {
          orderAmountInputElement.setAttribute("min", nextMin);
        }

        if (hasTotalMin) {
          orderTotalInputElement.setAttribute("min", nextTotalMin);
        }

        if (hasPriceMin) {
          orderPriceInputElement.setAttribute("min", nextPriceMin);
          if (orderStopPriceInputElement) {
            orderStopPriceInputElement.setAttribute("min", nextPriceMin);
          }
        }

        if (hasPriceMax) {
          orderPriceInputElement.setAttribute("max", nextPriceMax);
          if (orderStopPriceInputElement) {
            orderStopPriceInputElement.setAttribute("max", nextPriceMax);
          }
        }

        if (hasPriceStep) {
          orderPriceInputElement.setAttribute("step", nextPriceStep);
          if (orderStopPriceInputElement) {
            orderStopPriceInputElement.setAttribute("step", nextPriceStep);
          }
        }

        if (hasPricePrecision) {
          orderPriceInputElement.dataset.pricePrecision = nextPricePrecision;
          if (orderStopPriceInputElement) {
            orderStopPriceInputElement.dataset.pricePrecision = nextPricePrecision;
          }
        }

        validateOrderPriceLimits();
        validateStopPriceLimits();
        validateOrderAmountMinimum();
        validateOrderTotalMinimum();
      };

      const setActiveTimeframeButton = (timeframe) => {
        timeframeButtonElements.forEach((button) => {
          button.classList.toggle("is-active", button.dataset.timeframe === timeframe);
        });

        if (timeframeLabelElement) {
          timeframeLabelElement.textContent = timeframe;
        }
      };

      let isSyncingOrderInputs = false;

      const parseOrderInputNumber = (inputElement) => {
        if (!inputElement) {
          return Number.NaN;
        }

        const rawValue = String(inputElement.value || "").replace(/,/g, "").trim();
        if (!rawValue) {
          return Number.NaN;
        }

        const parsed = Number(rawValue);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
      };

      const parseMarketPriceValue = (rawValue) => {
        if (typeof rawValue !== "string") {
          return Number.NaN;
        }

        const normalizedValue = rawValue.replace(/,/g, "").trim();
        if (!normalizedValue || normalizedValue === "-") {
          return Number.NaN;
        }

        return Number.parseFloat(normalizedValue);
      };

      const formatOrderInputNumber = (value) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return "";
        }

        const fixed = numericValue.toFixed(12);
        return fixed.replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
      };

      const getDecimalPlacesFromValue = (value) => {
        const rawValue = String(value || "").trim();
        if (!rawValue) {
          return 0;
        }

        const normalizedValue = rawValue.toLowerCase();
        if (normalizedValue.includes("e-")) {
          const exponentPart = Number(normalizedValue.split("e-")[1]);
          return Number.isFinite(exponentPart) && exponentPart > 0 ? Math.min(12, Math.floor(exponentPart)) : 0;
        }

        const decimalPart = normalizedValue.split(".")[1] || "";
        return Math.min(12, decimalPart.replace(/0+$/, "").length);
      };

      const formatNumberWithDecimals = (value, decimals) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return "";
        }

        const safeDecimals = Number.isFinite(decimals) ? Math.min(12, Math.max(0, Number(decimals))) : 12;
        const fixed = numericValue.toFixed(safeDecimals);
        if (safeDecimals === 0) {
          return fixed;
        }

        return fixed.replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
      };

      const getQuoteCurrencyFromSymbol = (symbol) => {
        if (typeof symbol !== "string" || symbol.trim().length === 0) {
          return "";
        }

        if (symbol.includes("/")) {
          const parts = symbol.split("/");
          return String(parts[parts.length - 1] || "").trim().toUpperCase();
        }

        const knownQuoteCurrencies = ["USDT", "USDC", "BUSD", "BTC", "ETH", "EUR", "USD", "GBP", "JPY"];
        const upperSymbol = symbol.toUpperCase();
        const matchedQuote = knownQuoteCurrencies.find((quote) => upperSymbol.endsWith(quote));
        return matchedQuote || "";
      };

      const getBaseCurrencyFromSymbol = (symbol) => {
        if (typeof symbol !== "string" || symbol.trim().length === 0) {
          return "";
        }

        if (symbol.includes("/")) {
          const parts = symbol.split("/");
          return String(parts[0] || "").trim().toUpperCase();
        }

        const quoteCurrency = getQuoteCurrencyFromSymbol(symbol);
        const upperSymbol = symbol.toUpperCase();
        if (quoteCurrency && upperSymbol.endsWith(quoteCurrency)) {
          return upperSymbol.slice(0, upperSymbol.length - quoteCurrency.length);
        }

        return "";
      };

      const normalizeTimeframeOptions = (timeframes) => Array.from(new Set(
        (Array.isArray(timeframes) ? timeframes : [])
          .map((timeframe) => String(timeframe || "").trim())
          .filter(Boolean),
      ));

      const normalizeQuoteCurrencyOptions = (quoteCurrencies) => Array.from(new Set(
        (Array.isArray(quoteCurrencies) ? quoteCurrencies : [])
          .map((quoteCurrency) => String(quoteCurrency || "").trim().toUpperCase())
          .filter(Boolean),
      ));

      const normalizeSupportedSymbolOptions = (supportedSymbols) => (Array.isArray(supportedSymbols) ? supportedSymbols : [])
        .map((item) => {
          if (typeof item === "string") {
            const symbol = item.trim();
            if (!symbol) {
              return null;
            }

            return {
              symbol,
              display_symbol: symbol.replace("/", ""),
              quote: getQuoteCurrencyFromSymbol(symbol),
              quote_volume_24h_usdt: null,
              quote_volume_24h_usdt_compact: "-",
              quote_volume_24h_currency: getQuoteCurrencyFromSymbol(symbol),
            };
          }

          if (item && typeof item === "object") {
            const symbol = String(item.symbol || "").trim();
            if (!symbol) {
              return null;
            }

            const displaySymbol = String(item.display_symbol || symbol.replace("/", "")).trim();
            const quoteVolumeUsdt = Number(item.quote_volume_24h_usdt);
            const quoteVolumeCompactCandidate = String(item.quote_volume_24h_usdt_compact || "").trim();
            const quoteVolumeCompact = quoteVolumeCompactCandidate
              || (Number.isFinite(quoteVolumeUsdt) && quoteVolumeUsdt > 0 ? formatCompactVolume(quoteVolumeUsdt) : "-");
            return {
              symbol,
              display_symbol: displaySymbol || symbol.replace("/", ""),
              quote: getQuoteCurrencyFromSymbol(symbol),
              quote_volume_24h_usdt: Number.isFinite(quoteVolumeUsdt) && quoteVolumeUsdt > 0 ? quoteVolumeUsdt : null,
              quote_volume_24h_usdt_compact: quoteVolumeCompact,
              quote_volume_24h_currency: String(item.quote_volume_24h_currency || getQuoteCurrencyFromSymbol(symbol) || "").trim().toUpperCase(),
            };
          }

          return null;
        })
        .filter(Boolean);

      const mergeSupportedSymbolOptionsBySymbol = (incomingSymbols, existingSymbols) => {
        const normalizedIncoming = normalizeSupportedSymbolOptions(incomingSymbols);
        const normalizedExisting = normalizeSupportedSymbolOptions(existingSymbols);
        if (!normalizedIncoming.length) {
          return normalizedIncoming;
        }

        const existingBySymbol = new Map(
          normalizedExisting
            .filter((item) => typeof item?.symbol === "string" && item.symbol)
            .map((item) => [item.symbol, item]),
        );

        return normalizedIncoming.map((item) => {
          const previousItem = existingBySymbol.get(item.symbol);
          if (!previousItem) {
            return item;
          }

          const hasIncomingVolume = Number.isFinite(Number(item.quote_volume_24h_usdt))
            && Number(item.quote_volume_24h_usdt) > 0;
          if (hasIncomingVolume) {
            return item;
          }

          const hasPreviousVolume = Number.isFinite(Number(previousItem.quote_volume_24h_usdt))
            && Number(previousItem.quote_volume_24h_usdt) > 0;
          if (!hasPreviousVolume) {
            return item;
          }

          return {
            ...item,
            quote_volume_24h_usdt: previousItem.quote_volume_24h_usdt,
            quote_volume_24h_usdt_compact: previousItem.quote_volume_24h_usdt_compact || item.quote_volume_24h_usdt_compact,
            quote_volume_24h_currency: previousItem.quote_volume_24h_currency || item.quote_volume_24h_currency,
          };
        });
      };

      const countSymbolOptionsWithVolume = (symbolOptions) => normalizeSupportedSymbolOptions(symbolOptions)
        .reduce((count, item) => {
          const numericVolume = Number(item?.quote_volume_24h_usdt);
          return Number.isFinite(numericVolume) && numericVolume > 0 ? count + 1 : count;
        }, 0);

      const formatPairVolumeLabel = (symbolOption) => {
        const volumeValue = Number(symbolOption?.quote_volume_24h_usdt);
        if (Number.isFinite(volumeValue) && volumeValue > 0) {
          const quoteCurrency = String(symbolOption?.quote_volume_24h_currency || symbolOption?.quote || getQuoteCurrencyFromSymbol(symbolOption?.symbol) || "").trim().toUpperCase();
          return `${Math.round(volumeValue).toLocaleString("en-US")}${quoteCurrency ? ` ${quoteCurrency}` : ""}`;
        }

        return "-";
      };

      availableSymbolsByExchange[currentExchangeKey] = normalizeSupportedSymbolOptions(
        Array.from(pairSelectorMenuElement?.querySelectorAll("[data-symbol]") || []).map((button) => ({
          symbol: button.dataset.symbol,
          display_symbol: (button.textContent || "").trim(),
          quote_volume_24h_usdt: button.dataset.symbolVolume24hUsdt,
          quote_volume_24h_usdt_compact: button.dataset.symbolVolume24hUsdtCompact,
          quote_volume_24h_currency: button.dataset.symbolVolume24hCurrency,
        })),
      );

      cacheChartContext(getChartContextKey(), allCandles, {
        symbol: currentSymbol,
        display_symbol: currentDisplaySymbol,
        exchange_key: currentExchangeKey,
        exchange: currentExchangeLabel,
        timeframe: currentTimeframe,
        supported_symbols: availableSymbolsByExchange[currentExchangeKey],
        supported_timeframes: Array.from(validTimeframes),
        supported_quote_currencies: Array.from(validQuoteCurrencies),
        amount_step: bootstrap.market_data?.amount_step,
        amount_min: bootstrap.market_data?.amount_min,
        total_min: bootstrap.market_data?.total_min,
        price_min: bootstrap.market_data?.price_min,
        price_max: bootstrap.market_data?.price_max,
        price_step: bootstrap.market_data?.price_step,
        amount_precision: bootstrap.market_data?.amount_precision,
        price_precision: bootstrap.market_data?.price_precision,
        last: bootstrap.market_data?.last,
        bid: bootstrap.market_data?.bid,
        ask: bootstrap.market_data?.ask,
        high: bootstrap.market_data?.high,
        low: bootstrap.market_data?.low,
        quote_volume: bootstrap.market_data?.quote_volume,
        quote_volume_compact: bootstrap.market_data?.quote_volume_compact,
        timestamp: bootstrap.market_data?.timestamp,
        timestamp_unix: bootstrap.market_data?.timestamp_unix,
        error: bootstrap.market_data?.error,
      });

      const cacheSettingsOptionsForExchange = (exchangeKey, options = {}) => {
        if (!validExchangeKeys.has(exchangeKey)) {
          return;
        }

        if (Array.isArray(options.supported_timeframes)) {
          const normalizedTimeframes = normalizeTimeframeOptions(options.supported_timeframes);
          if (normalizedTimeframes.length > 0) {
            availableTimeframesByExchange[exchangeKey] = normalizedTimeframes;
          }
        }

        if (Array.isArray(options.supported_quote_currencies)) {
          const normalizedQuoteCurrencies = normalizeQuoteCurrencyOptions(options.supported_quote_currencies);
          if (normalizedQuoteCurrencies.length > 0) {
            availableQuoteCurrenciesByExchange[exchangeKey] = normalizedQuoteCurrencies;
          }
        }

        if (Array.isArray(options.supported_symbols)) {
          const previousSymbols = availableSymbolsByExchange[exchangeKey];
          availableSymbolsByExchange[exchangeKey] = mergeSupportedSymbolOptionsBySymbol(
            options.supported_symbols,
            previousSymbols,
          );
        }
      };

      const persistEnabledPairs = () => {
        try {
          localStorage.setItem(enabledPairsStorageKey, JSON.stringify(enabledPairsByExchange));
        } catch (_error) {
        }
      };

      const ensureEnabledPairsForExchange = (exchangeKey, visiblePairSymbols = []) => {
        const availableSymbols = getSymbolOptionsForExchange(exchangeKey)
          .map((item) => item.symbol)
          .filter(Boolean);
        if (availableSymbols.length === 0) {
          const configured = enabledPairsByExchange[exchangeKey];
          if (Array.isArray(configured)) {
            return new Set(configured.filter(Boolean));
          }
          return new Set();
        }

        const enabledSet = getEnabledPairsForExchange(exchangeKey);
        const visibleCandidates = Array.isArray(visiblePairSymbols) ? visiblePairSymbols.filter(Boolean) : [];
        if (enabledSet.size === 0) {
          const fallbackPair = getDefaultEnabledPairForExchange(exchangeKey, visibleCandidates.length > 0 ? visibleCandidates : availableSymbols);
          if (fallbackPair) {
            enabledSet.add(fallbackPair);
          }
        }

        enabledPairsByExchange[exchangeKey] = Array.from(enabledSet);
        return new Set(enabledSet);
      };

      const applyEnabledPairsToUI = () => {
        const activeSettingsPairs = getEnabledPairsForExchange(activeSettingsExchangeKey);
        const isSettingsExchangeEnabled = enabledExchangeKeys.has(activeSettingsExchangeKey);

        settingsPairToggleElements.forEach((checkbox) => {
          const symbol = checkbox.dataset.settingsEnabledPair;
          const isEnabled = activeSettingsPairs.has(symbol);
          checkbox.checked = isEnabled;
          checkbox.disabled = !isSettingsExchangeEnabled;
        });

        if (settingsTogglePairsButtonElement) {
          const areAllEnabled = validSettingsPairs.size > 0 && activeSettingsPairs.size === validSettingsPairs.size;
          settingsTogglePairsButtonElement.textContent = areAllEnabled ? "☑" : "☐";
          settingsTogglePairsButtonElement.setAttribute("aria-label", areAllEnabled ? "Disable all pairs" : "Enable all pairs");
          settingsTogglePairsButtonElement.title = areAllEnabled ? "Disable all pairs" : "Enable all pairs";
          settingsTogglePairsButtonElement.disabled = !isSettingsExchangeEnabled || validSettingsPairs.size === 0;
        }

        sortSettingsOptionRows(settingsPairsListElement, "[data-settings-enabled-pair]", {
          prioritizeChecked: true,
          getSortValue: (_labelText, rowElement) => {
            const rawSortValue = rowElement?.dataset?.settingsPairVolumeSort;
            const numericSortValue = Number(rawSortValue);
            return Number.isFinite(numericSortValue)
              ? numericSortValue
              : Number.POSITIVE_INFINITY;
          },
          getTieBreakValue: (_labelText, rowElement) => String(rowElement?.title || "").toLowerCase(),
        });
      };

      const setEnabledPairs = (pairs, options = {}) => {
        const targetExchangeKey = validExchangeKeys.has(options.exchangeKey)
          ? options.exchangeKey
          : currentExchangeKey;
        const allowEmpty = options.allowEmpty === true;
        const availableSymbols = new Set(
          getFilteredPairOptionsForExchange(targetExchangeKey)
            .map((item) => item.symbol)
            .filter(Boolean),
        );
        const nextEnabledPairs = new Set(
          (Array.isArray(pairs) ? pairs : []).filter((symbol) => availableSymbols.has(symbol)),
        );

        if (!allowEmpty && nextEnabledPairs.size === 0) {
          const fallbackPair = getDefaultEnabledPairForExchange(targetExchangeKey, Array.from(availableSymbols));
          if (fallbackPair) {
            nextEnabledPairs.add(fallbackPair);
          }
        }

        enabledPairsByExchange[targetExchangeKey] = Array.from(nextEnabledPairs);

        let didChangeCurrentSymbol = false;
        if (targetExchangeKey === currentExchangeKey) {
          enabledPairs = nextEnabledPairs;
          didChangeCurrentSymbol = applyPairSelectorQuoteCurrencyFilter();
        }

        persistEnabledPairs();
        renderSettingsPairsForExchange(activeSettingsExchangeKey);
        applyEnabledPairsToUI();

        if (targetExchangeKey === currentExchangeKey && didChangeCurrentSymbol && options.refresh !== false) {
          pendingRestoreLogicalRange = null;
          hasFitContent = false;
          setLoadingTimeframeButton(currentTimeframe);
          refreshChartData({ priority: true, showUpdatingStatus: true, updatingLabel: "pairs" });
          scheduleNextRefresh();
        }
      };

      const toggleAllPairsForActiveExchange = () => {
        if (!validSettingsPairs.size) {
          return;
        }

        const currentEnabledPairs = getEnabledPairsForExchange(activeSettingsExchangeKey);
        const areAllEnabled = currentEnabledPairs.size === validSettingsPairs.size;
        const nextSelection = areAllEnabled
          ? [getDefaultEnabledPairForExchange(activeSettingsExchangeKey, Array.from(validSettingsPairs))]
          : Array.from(validSettingsPairs);
        setEnabledPairs(nextSelection, { exchangeKey: activeSettingsExchangeKey });
      };

      const renderSettingsPairsForExchange = (exchangeKey) => {
        if (!settingsPairsListElement) {
          return;
        }

        const filteredPairs = getFilteredPairOptionsForExchange(exchangeKey);

        validSettingsPairs = new Set(filteredPairs.map((item) => item.symbol));
        const enabledPairsForExchange = ensureEnabledPairsForExchange(exchangeKey, Array.from(validSettingsPairs));

        settingsPairsListElement.innerHTML = "";
        if (!filteredPairs.length) {
          const emptyLabel = document.createElement("label");
          emptyLabel.className = "settings-exchange-option settings-exchange-option--inline";
          emptyLabel.textContent = "No pairs for selected quote currencies";
          settingsPairsListElement.appendChild(emptyLabel);
          settingsPairToggleElements = [];
          return;
        }

        const fragment = document.createDocumentFragment();
        filteredPairs.forEach((item) => {
          const optionLabelElement = document.createElement("label");
          optionLabelElement.className = "settings-exchange-option settings-exchange-option--inline";
          const checkboxId = `settings-pair-${item.symbol.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
          optionLabelElement.setAttribute("for", checkboxId);
          optionLabelElement.title = item.symbol;
          const pairVolumeSortValue = Number(item.quote_volume_24h_usdt);
          optionLabelElement.dataset.settingsPairVolumeSort = Number.isFinite(pairVolumeSortValue) && pairVolumeSortValue > 0
            ? String(-pairVolumeSortValue)
            : "";

          const checkboxElement = document.createElement("input");
          checkboxElement.id = checkboxId;
          checkboxElement.type = "checkbox";
          checkboxElement.dataset.settingsEnabledPair = item.symbol;
          checkboxElement.checked = enabledPairsForExchange.has(item.symbol);

          const labelTextElement = document.createElement("span");
          labelTextElement.className = "settings-pair-label";
          labelTextElement.textContent = item.display_symbol;

          const volumeTextElement = document.createElement("span");
          volumeTextElement.className = "settings-pair-volume";
          volumeTextElement.textContent = formatPairVolumeLabel(item);

          optionLabelElement.appendChild(checkboxElement);
          optionLabelElement.appendChild(labelTextElement);
          optionLabelElement.appendChild(volumeTextElement);
          fragment.appendChild(optionLabelElement);
        });

        settingsPairsListElement.appendChild(fragment);
        settingsPairToggleElements = Array.from(settingsPairsListElement.querySelectorAll("[data-settings-enabled-pair]"));
      };

      const applyCachedSettingsOptionsForExchange = (exchangeKey) => {
        const cachedTimeframes = availableTimeframesByExchange[exchangeKey];
        if (Array.isArray(cachedTimeframes) && cachedTimeframes.length > 0) {
          renderSettingsTimeframeOptions(cachedTimeframes);
        }

        const cachedQuoteCurrencies = availableQuoteCurrenciesByExchange[exchangeKey];
        if (Array.isArray(cachedQuoteCurrencies) && cachedQuoteCurrencies.length > 0) {
          renderSettingsQuoteCurrencyOptions(cachedQuoteCurrencies);
        }

        renderSettingsPairsForExchange(exchangeKey);
      };

      const clearSettingsOptionsUI = () => {
        const timeframeGroupElement = settingsExchangeTimeframesPanelElement?.querySelector("[aria-label='Timeframes options']") || null;
        const quoteCurrencyGroupElement = settingsExchangeTimeframesPanelElement?.querySelector("[aria-label='Quote currency options']") || null;

        if (timeframeGroupElement) {
          timeframeGroupElement.innerHTML = "";
        }
        if (quoteCurrencyGroupElement) {
          quoteCurrencyGroupElement.innerHTML = "";
        }
        if (settingsPairsListElement) {
          settingsPairsListElement.innerHTML = "";
        }

        settingsTimeframeToggleElements = [];
        settingsQuoteCurrencyToggleElements = [];
        settingsPairToggleElements = [];
        validTimeframes = new Set();
        validQuoteCurrencies = new Set();
        validSettingsPairs = new Set();
      };

      const loadSettingsOptionsForExchange = async (exchangeKey, options = {}) => {
        if (!validExchangeKeys.has(exchangeKey)) {
          return;
        }

        const forceReload = options.forceReload === true;

        const hasCachedTimeframes = Array.isArray(availableTimeframesByExchange[exchangeKey])
          && availableTimeframesByExchange[exchangeKey].length > 0;
        const hasCachedQuoteCurrencies = Array.isArray(availableQuoteCurrenciesByExchange[exchangeKey])
          && availableQuoteCurrenciesByExchange[exchangeKey].length > 0;
        const hasCachedSymbols = Array.isArray(availableSymbolsByExchange[exchangeKey])
          && availableSymbolsByExchange[exchangeKey].length > 0;
        const hasCachedSymbolVolumes = countSymbolOptionsWithVolume(availableSymbolsByExchange[exchangeKey]) > 0;
        if (!forceReload && hasCachedTimeframes && hasCachedQuoteCurrencies && hasCachedSymbols && hasCachedSymbolVolumes) {
          return;
        }

        const shouldShowUpdatingStatus = options.showUpdatingStatus === true;
        if (shouldShowUpdatingStatus) {
          setRefreshStatus(formatUpdatingStatusText(options.updatingLabel || "exchange settings"), "is-updating");
        }

        const requestId = ++settingsOptionsRequestId;
        try {
          const query = new URLSearchParams({ exchange: exchangeKey });
          const response = await fetchWithExchangeRetrievalStatus(`/api/exchange-settings-options?${query.toString()}`, { cache: "no-store" });
          if (!response.ok) {
            return;
          }

          const payload = await response.json();
          const payloadExchangeKey = String(payload?.exchange_key || exchangeKey);
          if (!validExchangeKeys.has(payloadExchangeKey)) {
            return;
          }

          cacheSettingsOptionsForExchange(payloadExchangeKey, payload);

          if (activeSettingsExchangeKey === payloadExchangeKey && requestId === settingsOptionsRequestId) {
            applyCachedSettingsOptionsForExchange(payloadExchangeKey);
            applyEnabledTimeframesToUI();
            applyEnabledQuoteCurrenciesToUI();
          }
        } catch (_error) {
        } finally {
          if (shouldShowUpdatingStatus) {
            setRefreshStatus("Live", "is-live");
          }
        }
      };

      const renderPairSelectorMenuOptions = (supportedSymbols) => {
        if (!pairSelectorMenuElement) {
          return;
        }

        const normalizedSymbolOptions = normalizeSupportedSymbolOptions(supportedSymbols);

        if (normalizedSymbolOptions.length === 0) {
          return;
        }

        const fragment = document.createDocumentFragment();
        normalizedSymbolOptions.forEach((item) => {
          const symbolButton = document.createElement("button");
          symbolButton.type = "button";
          symbolButton.className = "market-selector-menu-item";
          symbolButton.dataset.symbol = item.symbol;
          symbolButton.dataset.symbolQuote = getQuoteCurrencyFromSymbol(item.symbol);
          symbolButton.dataset.symbolVolume24hUsdt = item.quote_volume_24h_usdt || "";
          symbolButton.dataset.symbolVolume24hUsdtCompact = item.quote_volume_24h_usdt_compact || "-";
          symbolButton.dataset.symbolVolume24hCurrency = item.quote_volume_24h_currency || getQuoteCurrencyFromSymbol(item.symbol) || "";
          symbolButton.setAttribute("role", "menuitem");
          symbolButton.textContent = item.display_symbol;
          fragment.appendChild(symbolButton);
        });

        pairSelectorMenuElement.innerHTML = "";
        pairSelectorMenuElement.appendChild(fragment);
        validSymbols = new Set(normalizedSymbolOptions.map((item) => item.symbol));
        availableSymbolsByExchange[currentExchangeKey] = normalizedSymbolOptions;
      };

      const renderSettingsQuoteCurrencyOptions = (quoteCurrencies) => {
        const quoteCurrencyGroupElement = settingsExchangeTimeframesPanelElement?.querySelector("[aria-label='Quote currency options']");
        if (!quoteCurrencyGroupElement) {
          return;
        }

        const normalizedQuoteCurrencies = normalizeQuoteCurrencyOptions(quoteCurrencies);

        if (normalizedQuoteCurrencies.length === 0) {
          return;
        }

        const fragment = document.createDocumentFragment();
        normalizedQuoteCurrencies.forEach((quoteCurrency) => {
          const safeIdPart = quoteCurrency.replace(/[^a-zA-Z0-9_-]/g, "-");
          const checkboxId = `settings-quote-currency-${safeIdPart}`;
          const optionLabelElement = document.createElement("label");
          optionLabelElement.className = "settings-exchange-option";
          optionLabelElement.setAttribute("for", checkboxId);

          const checkboxElement = document.createElement("input");
          checkboxElement.id = checkboxId;
          checkboxElement.type = "checkbox";
          checkboxElement.dataset.settingsEnabledQuoteCurrency = quoteCurrency;
          checkboxElement.checked = true;

          const labelTextElement = document.createElement("span");
          labelTextElement.textContent = quoteCurrency;

          optionLabelElement.appendChild(checkboxElement);
          optionLabelElement.appendChild(labelTextElement);
          fragment.appendChild(optionLabelElement);
        });

        quoteCurrencyGroupElement.innerHTML = "";
        quoteCurrencyGroupElement.appendChild(fragment);
        settingsQuoteCurrencyToggleElements = Array.from(quoteCurrencyGroupElement.querySelectorAll("[data-settings-enabled-quote-currency]"));
        validQuoteCurrencies = new Set(
          settingsQuoteCurrencyToggleElements.map((checkbox) => checkbox.dataset.settingsEnabledQuoteCurrency).filter(Boolean),
        );
      };

      const renderSettingsTimeframeOptions = (timeframes) => {
        const timeframeGroupElement = settingsExchangeTimeframesPanelElement?.querySelector("[aria-label='Timeframes options']");
        if (!timeframeGroupElement) {
          return;
        }

        const normalizedTimeframes = normalizeTimeframeOptions(timeframes);

        if (normalizedTimeframes.length === 0) {
          return;
        }

        const fragment = document.createDocumentFragment();
        normalizedTimeframes.forEach((timeframe) => {
          const safeIdPart = timeframe.replace(/[^a-zA-Z0-9_-]/g, "-");
          const checkboxId = `settings-timeframe-${safeIdPart}`;
          const optionLabelElement = document.createElement("label");
          optionLabelElement.className = "settings-exchange-option";
          optionLabelElement.setAttribute("for", checkboxId);

          const checkboxElement = document.createElement("input");
          checkboxElement.id = checkboxId;
          checkboxElement.type = "checkbox";
          checkboxElement.dataset.settingsEnabledTimeframe = timeframe;
          checkboxElement.checked = true;

          const labelTextElement = document.createElement("span");
          labelTextElement.textContent = timeframe;

          optionLabelElement.appendChild(checkboxElement);
          optionLabelElement.appendChild(labelTextElement);
          fragment.appendChild(optionLabelElement);
        });

        timeframeGroupElement.innerHTML = "";
        timeframeGroupElement.appendChild(fragment);
        settingsTimeframeToggleElements = Array.from(timeframeGroupElement.querySelectorAll("[data-settings-enabled-timeframe]"));
        validTimeframes = new Set(
          settingsTimeframeToggleElements.map((checkbox) => checkbox.dataset.settingsEnabledTimeframe).filter(Boolean),
        );
      };

      const applyPairSelectorQuoteCurrencyFilter = (options = {}) => {
        if (!pairSelectorMenuElement) {
          return false;
        }

        const selectedQuoteCurrencies = enabledQuoteCurrencies.size > 0
          ? enabledQuoteCurrencies
          : getEnabledQuoteCurrenciesForExchange(currentExchangeKey);
        const selectedPairs = enabledPairs.size > 0
          ? enabledPairs
          : getEnabledPairsForExchange(currentExchangeKey);
        const symbolButtonElements = Array.from(pairSelectorMenuElement.querySelectorAll("[data-symbol]"));

        symbolButtonElements.forEach((button) => {
          const symbolQuote = (button.dataset.symbolQuote || getQuoteCurrencyFromSymbol(button.dataset.symbol || "")).toUpperCase();
          const hiddenByQuote = selectedQuoteCurrencies.size > 0 && !selectedQuoteCurrencies.has(symbolQuote);
          const hiddenByPair = selectedPairs.size > 0 && !selectedPairs.has(button.dataset.symbol || "");
          button.hidden = hiddenByQuote || hiddenByPair;
        });

        const visibleSymbols = symbolButtonElements
          .filter((button) => !button.hidden)
          .map((button) => button.dataset.symbol)
          .filter(Boolean);
        validSymbols = new Set(visibleSymbols);

        const shouldSyncCurrentSymbol = options.syncCurrentSymbol !== false;
        if (!shouldSyncCurrentSymbol || visibleSymbols.length === 0) {
          setActiveSelectorMenuItem(pairSelectorMenuElement, "data-symbol", currentSymbol);
          return false;
        }

        if (validSymbols.has(currentSymbol)) {
          setActiveSelectorMenuItem(pairSelectorMenuElement, "data-symbol", currentSymbol);
          return false;
        }

        const nextSymbol = visibleSymbols[0];
        if (!nextSymbol) {
          setActiveSelectorMenuItem(pairSelectorMenuElement, "data-symbol", currentSymbol);
          return false;
        }

        currentSymbol = nextSymbol;
        currentDisplaySymbol = nextSymbol.replace("/", "");
        if (pairSelectorButtonElement) {
          pairSelectorButtonElement.textContent = currentDisplaySymbol;
        }

        if (options.persistSymbol !== false) {
          localStorage.setItem(symbolStorageKey, currentSymbol);
          setPreferenceCookie("trade_wijs_symbol", currentSymbol);
        }

        setActiveSelectorMenuItem(pairSelectorMenuElement, "data-symbol", currentSymbol);
        updateOrderInputQuoteCurrency();
        return true;
      };

      const updateOrderInputQuoteCurrency = () => {
        const quoteCurrency = getQuoteCurrencyFromSymbol(currentSymbol);
        const baseCurrency = getBaseCurrencyFromSymbol(currentSymbol);

        if (baseCurrency && orderAmountBaseElement) {
          orderAmountBaseElement.textContent = baseCurrency;
        }

        if (quoteCurrency) {
          [orderStopPriceQuoteElement, orderPriceQuoteElement, orderTotalQuoteElement].forEach((suffixElement) => {
            if (suffixElement) {
              suffixElement.textContent = quoteCurrency;
            }
          });
        }
      };

      const isStopLimitOrderTypeSelected = () => Boolean(orderTypeStopLimitElement?.checked);
      const isMarketOrderTypeSelected = () => Boolean(orderTypeMarketElement?.checked);
      const isStopMarketOrderTypeSelected = () => Boolean(orderTypeStopMarketElement?.checked);
      const isStopOrderTypeSelected = () => isStopLimitOrderTypeSelected() || isStopMarketOrderTypeSelected();
      const isLimitPriceRequiredOrderTypeSelected = () => !isMarketOrderTypeSelected() && !isStopMarketOrderTypeSelected();

      const getSelectedOrderTypeValue = () => {
        if (isStopLimitOrderTypeSelected()) {
          return "stop_limit";
        }

        if (isMarketOrderTypeSelected()) {
          return "market";
        }

        if (isStopMarketOrderTypeSelected()) {
          return "stop_market";
        }

        if (Boolean(orderTypeOcoElement?.checked)) {
          return "oco";
        }

        return "limit";
      };

      const getEffectiveOrderPriceValue = () => {
        if (isLimitPriceRequiredOrderTypeSelected()) {
          return parseOrderInputNumber(orderPriceInputElement);
        }

        const sideAwarePrice = activeOrderSide === "sell"
          ? parseMarketPriceValue(valueBidElement?.textContent || "")
          : parseMarketPriceValue(valueAskElement?.textContent || "");
        if (Number.isFinite(sideAwarePrice) && sideAwarePrice > 0) {
          return sideAwarePrice;
        }

        const fallbackLastPrice = parseMarketPriceValue(valueLastElement?.textContent || "");
        if (Number.isFinite(fallbackLastPrice) && fallbackLastPrice > 0) {
          return fallbackLastPrice;
        }

        return Number.NaN;
      };

      const renderOrderValueLocks = () => {
        const isAmountLocked = lockedOrderValueField === "amount";
        const isTotalLocked = lockedOrderValueField === "total";

        if (orderAmountLockButtonElement) {
          orderAmountLockButtonElement.textContent = isAmountLocked ? "🔒" : "🔓";
          orderAmountLockButtonElement.classList.toggle("is-locked", isAmountLocked);
          orderAmountLockButtonElement.setAttribute("aria-pressed", isAmountLocked ? "true" : "false");
          orderAmountLockButtonElement.setAttribute("aria-label", isAmountLocked ? "Amount locked" : "Amount unlocked");
          orderAmountLockButtonElement.title = isAmountLocked ? "Amount locked" : "Amount unlocked";
        }

        if (orderTotalLockButtonElement) {
          orderTotalLockButtonElement.textContent = isTotalLocked ? "🔒" : "🔓";
          orderTotalLockButtonElement.classList.toggle("is-locked", isTotalLocked);
          orderTotalLockButtonElement.setAttribute("aria-pressed", isTotalLocked ? "true" : "false");
          orderTotalLockButtonElement.setAttribute("aria-label", isTotalLocked ? "Total locked" : "Total unlocked");
          orderTotalLockButtonElement.title = isTotalLocked ? "Total locked" : "Total unlocked";
        }
      };

      const setLockedOrderValueField = (fieldName) => {
        lockedOrderValueField = fieldName === "amount" ? "amount" : "total";
        renderOrderValueLocks();
      };

      const closePlaceOrderModal = () => {
        if (!placeOrderModalElement) {
          return;
        }

        placeOrderModalElement.classList.remove("is-visible");
        placeOrderModalElement.setAttribute("aria-hidden", "true");
      };

      const formatPaperTradeNumber = (value, digits = 8) => {
        const parsedValue = Number(value);
        if (!Number.isFinite(parsedValue)) {
          return "-";
        }

        const precision = Math.max(0, Math.min(12, Number(digits) || 8));
        return parsedValue.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: precision,
        });
      };

      const formatPaperTradeTimestamp = (value) => {
        const timestampText = String(value || "").trim();
        if (!timestampText) {
          return "-";
        }

        // If already in UTC format (YYYY-MM-DD HH:MM:SS UTC), return as-is
        if (timestampText.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/)) {
          return timestampText;
        }

        // Parse and convert to ISO 8601 format with UTC timezone
        const parsedDate = new Date(timestampText.replace(" UTC", "Z"));
        if (Number.isNaN(parsedDate.getTime())) {
          return timestampText;
        }

        // Return in unambiguous format: YYYY-MM-DD HH:MM:SS UTC
        const isoString = parsedDate.toISOString();
        return isoString.replace('T', ' ').slice(0, 19) + ' UTC';
      };

      const parsePaperTradeTimestampToUnixSeconds = (value) => {
        if (value === null || value === undefined) {
          return null;
        }

        if (typeof value === "number" && Number.isFinite(value)) {
          return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
        }

        const timestampText = String(value).trim();
        if (!timestampText) {
          return null;
        }

        if (/^\d+$/.test(timestampText)) {
          const numeric = Number(timestampText);
          if (!Number.isFinite(numeric)) {
            return null;
          }
          return numeric > 1_000_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric);
        }

        const parsedDate = new Date(timestampText.replace(" UTC", "Z").replace(" ", "T"));
        if (Number.isNaN(parsedDate.getTime())) {
          return null;
        }

        return Math.floor(parsedDate.getTime() / 1000);
      };

      const toTimeframeBucketTime = (unixSeconds) => {
        const normalizedUnixSeconds = Number(unixSeconds);
        if (!Number.isFinite(normalizedUnixSeconds) || normalizedUnixSeconds <= 0) {
          return null;
        }

        const timeframeSeconds = Math.max(60, getTimeframeDurationSeconds(currentTimeframe));
        return Math.floor(normalizedUnixSeconds / timeframeSeconds) * timeframeSeconds;
      };

      const hidePaperTradeMarkerTooltip = () => {
        if (!chartMarkerTooltipElement) {
          return;
        }

        chartMarkerTooltipElement.classList.remove("is-visible");
        chartMarkerTooltipElement.textContent = "";
      };

      const showPaperTradeMarkerTooltip = (param) => {
        if (!chartMarkerTooltipElement || !chartCanvas || !param || !param.point) {
          hidePaperTradeMarkerTooltip();
          return;
        }

        const hoveredTime = Number(param.time);
        if (!Number.isFinite(hoveredTime)) {
          hidePaperTradeMarkerTooltip();
          return;
        }

        const markerEntries = paperTradeMarkerDetailsByTime.get(hoveredTime);
        if (!Array.isArray(markerEntries) || markerEntries.length === 0) {
          hidePaperTradeMarkerTooltip();
          return;
        }

        const tooltipRows = markerEntries.slice(0, 4).map((entry) => {
          const sideLabel = entry.side === "buy" ? "BUY" : "SELL";
          const amountLabel = formatPaperTradeNumber(entry.amount, 8);
          const priceLabel = formatPaperTradeNumber(entry.price, 8);
          const filledAtLabel = formatPaperTradeTimestamp(entry.filledAt);
          const orderIdLabel = entry.id !== null && entry.id !== undefined ? `#${entry.id}` : "#?";
          return `${sideLabel} ${orderIdLabel} ${amountLabel} @ ${priceLabel} | ${filledAtLabel}`;
        });

        const remainingCount = markerEntries.length - tooltipRows.length;
        if (remainingCount > 0) {
          tooltipRows.push(`+${remainingCount} more fills`);
        }

        chartMarkerTooltipElement.textContent = tooltipRows.join("\n");
        chartMarkerTooltipElement.classList.add("is-visible");

        const canvasWidth = chartCanvas.clientWidth;
        const canvasHeight = chartCanvas.clientHeight;
        if (canvasWidth <= 0 || canvasHeight <= 0) {
          hidePaperTradeMarkerTooltip();
          return;
        }

        const tooltipRect = chartMarkerTooltipElement.getBoundingClientRect();
        const tooltipWidth = Math.ceil(tooltipRect.width || 220);
        const tooltipHeight = Math.ceil(tooltipRect.height || 56);

        const baseX = Number(param.point.x) + 14;
        const baseY = Number(param.point.y) + 14;
        const clampedX = clamp(baseX, 8, Math.max(8, canvasWidth - tooltipWidth - 8));
        const clampedY = clamp(baseY, 8, Math.max(8, canvasHeight - tooltipHeight - 8));

        chartMarkerTooltipElement.style.left = `${clampedX}px`;
        chartMarkerTooltipElement.style.top = `${clampedY}px`;
      };

      const applyCandleSeriesMarkers = (markers) => {
        const safeMarkers = Array.isArray(markers) ? markers : [];
        if (!candleSeries) {
          return;
        }

        if (typeof candleSeries.setMarkers === "function") {
          candleSeries.setMarkers(safeMarkers);
          return;
        }

        if (window.LightweightCharts && typeof window.LightweightCharts.createSeriesMarkers === "function") {
          if (!candleSeriesMarkersPrimitive) {
            candleSeriesMarkersPrimitive = window.LightweightCharts.createSeriesMarkers(candleSeries, safeMarkers);
            return;
          }

          if (typeof candleSeriesMarkersPrimitive.setMarkers === "function") {
            candleSeriesMarkersPrimitive.setMarkers(safeMarkers);
            return;
          }

          candleSeriesMarkersPrimitive = window.LightweightCharts.createSeriesMarkers(candleSeries, safeMarkers);
        }
      };

      const updatePaperTradeOrderMarkers = (paperState) => {
        try {
          paperTradeMarkerDetailsByTime.clear();

          if (!paperState || typeof paperState !== "object") {
            hidePaperTradeMarkerTooltip();
            applyCandleSeriesMarkers([]);
            return;
          }

          const markers = [];

          // Show only filled executions as TradingView-like buy/sell markers.
          const closedOrders = Array.isArray(paperState.closed_orders) ? paperState.closed_orders : [];
          closedOrders.forEach((order) => {
            const side = String(order?.side || "").toLowerCase();
            const status = String(order?.status || "").toLowerCase();
            if (status !== "filled") {
              return;
            }

            if (side !== "buy" && side !== "sell") {
              return;
            }

            const unixSeconds = parsePaperTradeTimestampToUnixSeconds(order?.filled_at || order?.timestamp);
            const bucketTime = toTimeframeBucketTime(unixSeconds);
            if (bucketTime === null) {
              return;
            }

            const amount = Number(order?.amount || 0);
            const price = Number(order?.price || 0);
            const filledAt = order?.filled_at || order?.timestamp;
            const sideIsBuy = side === "buy";
            const markerText = sideIsBuy ? "B" : "S";
            const markerColor = sideIsBuy ? "#22ab94" : "#f6465d";

            markers.push({
              time: bucketTime,
              position: sideIsBuy ? "belowBar" : "aboveBar",
              color: markerColor,
              shape: sideIsBuy ? "arrowUp" : "arrowDown",
              text: markerText,
              title: `${markerText} #${order?.id || "?"} ${formatPaperTradeNumber(amount, 8)} @ ${formatPaperTradeNumber(price, 8)}`,
            });

            if (!paperTradeMarkerDetailsByTime.has(bucketTime)) {
              paperTradeMarkerDetailsByTime.set(bucketTime, []);
            }
            paperTradeMarkerDetailsByTime.get(bucketTime).push({
              id: order?.id,
              side,
              amount,
              price,
              filledAt,
            });
          });

          const sortedMarkers = markers.sort((left, right) => Number(left.time) - Number(right.time));

          // Set markers on the candle series.
          applyCandleSeriesMarkers(sortedMarkers);
        } catch (error) {
          console.error("Error in updatePaperTradeOrderMarkers:", error);
        }
      };

      const renderPaperTradeState = (paperState) => {
        if (!paperState || typeof paperState !== "object") {
          currentPaperTradeState = null;
          return;
        }

        currentPaperTradeState = paperState;

        const symbol = String(paperState.symbol || currentSymbol || "");
        const parts = symbol.split("/");
        const baseCurrency = parts[0] || "BASE";
        const quoteCurrency = parts[1] || "QUOTE";

        const balances = paperState.balances && typeof paperState.balances === "object"
          ? paperState.balances
          : {};
        const baseBalance = Number(balances[baseCurrency]);
        const quoteBalance = Number(balances[quoteCurrency]);

        if (paperTradeBalanceElement) {
          paperTradeBalanceElement.textContent = `Balance: ${formatPaperTradeNumber(baseBalance)} ${baseCurrency} | ${formatPaperTradeNumber(quoteBalance, 2)} ${quoteCurrency}`;
        }

        const position = paperState.position && typeof paperState.position === "object"
          ? paperState.position
          : {};
        if (paperTradePositionElement) {
          const sizeValue = formatPaperTradeNumber(position.size, 8);
          const avgEntryValue = formatPaperTradeNumber(position.avg_entry_price, 8);
          const realizedPnlValue = formatPaperTradeNumber(position.realized_pnl_quote, 4);
          paperTradePositionElement.textContent = `Position: ${sizeValue} ${baseCurrency} | Avg. entry: ${avgEntryValue} | Realized PnL: ${realizedPnlValue} ${quoteCurrency}`;
        }

        // Render open orders
        if (paperTradeOpenOrdersListElement) {
          const openOrders = Array.isArray(paperState.open_orders) ? paperState.open_orders : [];
          if (openOrders.length === 0) {
            paperTradeOpenOrdersListElement.textContent = "No open orders.";
          } else {
            const orderRows = openOrders.map((order) => {
              const orderId = order?.id || "?";
              const side = String(order?.side || "").toUpperCase();
              const type = String(order?.type || "").toUpperCase();
              const amount = formatPaperTradeNumber(order?.amount, 8);
              const price = formatPaperTradeNumber(order?.price, 8);
              const status = String(order?.status || "pending").toUpperCase();
              return `#${orderId} ${side} ${type} ${amount} @ ${price} [${status}]`;
            });
            paperTradeOpenOrdersListElement.textContent = orderRows.join("\n");
          }
        }

        // Render closed orders
        if (paperTradeClosedOrdersListElement) {
          const closedOrders = Array.isArray(paperState.closed_orders) ? paperState.closed_orders.slice(-5).reverse() : [];
          if (closedOrders.length === 0) {
            paperTradeClosedOrdersListElement.textContent = "No filled or cancelled orders yet.";
          } else {
            const orderRows = closedOrders.map((order) => {
              const orderId = order?.id || "?";
              const normalizedSide = String(order?.side || "").trim().toLowerCase();
              const side = normalizedSide.toUpperCase();
              const sideIcon = normalizedSide === "buy" ? "↑" : normalizedSide === "sell" ? "↓" : "•";
              const type = String(order?.type || "").toUpperCase();
              const amount = formatPaperTradeNumber(order?.amount, 8);
              const price = formatPaperTradeNumber(order?.price, 8);
              const status = String(order?.status || "filled").toUpperCase();
              if (status === "FILLED") {
                const filledAt = formatPaperTradeTimestamp(order?.filled_at || order?.timestamp);
                return `${sideIcon} #${orderId} ${side} ${type} ${amount} @ ${price} [${status}] | Filled at: ${filledAt}`;
              }
              return `${sideIcon} #${orderId} ${side} ${type} ${amount} @ ${price} [${status}]`;
            });
            paperTradeClosedOrdersListElement.textContent = orderRows.join("\n");
          }
        }

        // Update chart markers for orders
        updatePaperTradeOrderMarkers(paperState);
      };

      const refreshPaperTradeState = async () => {
        const requestId = ++paperTradeStateRequestId;
        try {
          const query = new URLSearchParams({
            exchange: currentExchangeKey,
            symbol: currentSymbol,
          });

          const response = await fetch(`/api/paper-trade/state?${query.toString()}`, { cache: "no-store" });
          if (!response.ok || requestId !== paperTradeStateRequestId) {
            return;
          }

          const payload = await response.json();
          if (requestId !== paperTradeStateRequestId) {
            return;
          }

          renderPaperTradeState(payload);
        } catch (_error) {
          if (paperTradeBalanceElement) {
            paperTradeBalanceElement.textContent = "Balance unavailable";
          }
          if (paperTradePositionElement) {
            paperTradePositionElement.textContent = "Position unavailable";
          }
        }
      };

      const submitPaperOrder = async () => {
        if (isSubmittingPaperOrder) {
          return;
        }

        isSubmittingPaperOrder = true;
        const payload = buildPlaceOrderPayload();

        if (orderActionStatusElement) {
          orderActionStatusElement.textContent = "Placing paper order...";
        }

        try {
          const response = await fetch("/api/paper-trade/order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const responsePayload = await response.json();
          if (!response.ok) {
            const errorMessage = String(responsePayload?.error || "Paper order failed");
            if (orderActionStatusElement) {
              orderActionStatusElement.textContent = errorMessage;
            }
            openPlaceOrderPayloadModal(responsePayload, "Paper order error");
            return;
          }

          if (responsePayload?.state) {
            renderPaperTradeState(responsePayload.state);
          }

          if (orderActionStatusElement) {
            const orderId = responsePayload?.order?.id;
            orderActionStatusElement.textContent = Number.isFinite(Number(orderId))
              ? `Paper order #${orderId} filled`
              : "Paper order filled";
          }

          openPlaceOrderPayloadModal(responsePayload, "Paper order response");
        } catch (_error) {
          if (orderActionStatusElement) {
            orderActionStatusElement.textContent = "Paper order failed due to a network error";
          }
        } finally {
          isSubmittingPaperOrder = false;
        }
      };

      const resetPaperTradeState = async (options = {}) => {
        const resetAll = options.resetAll === true;
        const confirmMessage = resetAll
          ? "Reset all paper trading state for all exchanges?"
          : `Reset paper trading state for ${currentExchangeKey}?`;

        if (!window.confirm(confirmMessage)) {
          return;
        }

        if (orderActionStatusElement) {
          orderActionStatusElement.textContent = resetAll
            ? "Resetting all paper state..."
            : `Resetting paper state for ${currentExchangeKey}...`;
        }

        try {
          const response = await fetch("/api/paper-trade/reset", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              exchange: currentExchangeKey,
              reset_all: resetAll,
            }),
          });

          const payload = await response.json();
          if (!response.ok) {
            if (orderActionStatusElement) {
              orderActionStatusElement.textContent = String(payload?.error || "Reset failed");
            }
            return;
          }

          if (orderActionStatusElement) {
            orderActionStatusElement.textContent = String(payload?.message || "Paper state reset");
          }

          await refreshPaperTradeState();
        } catch (_error) {
          if (orderActionStatusElement) {
            orderActionStatusElement.textContent = "Reset failed due to a network error";
          }
        }
      };

      const buildPlaceOrderPayload = () => {
        const orderType = getSelectedOrderTypeValue();
        const payload = {
          exchange: currentExchangeKey,
          symbol: currentSymbol,
          side: activeOrderSide === "sell" ? "sell" : "buy",
          type: orderType,
          amount: parseOrderInputNumber(orderAmountInputElement),
        };

        const totalValue = parseOrderInputNumber(orderTotalInputElement);
        if (Number.isFinite(totalValue) && totalValue > 0) {
          payload.total = totalValue;
        }

        const limitPriceValue = parseOrderInputNumber(orderPriceInputElement);
        const stopPriceValue = parseOrderInputNumber(orderStopPriceInputElement);

        if ((orderType === "limit" || orderType === "stop_limit" || orderType === "oco") && Number.isFinite(limitPriceValue) && limitPriceValue > 0) {
          payload.price = limitPriceValue;
        }

        if ((orderType === "stop_limit" || orderType === "stop_market") && Number.isFinite(stopPriceValue) && stopPriceValue > 0) {
          payload.stop_price = stopPriceValue;
        }

        return payload;
      };

      const openPlaceOrderPayloadModal = (payloadOverride = null, modalTitle = "Order payload") => {
        if (!placeOrderModalElement || !placeOrderModalPayloadElement) {
          return;
        }

        const payload = payloadOverride && typeof payloadOverride === "object"
          ? payloadOverride
          : buildPlaceOrderPayload();
        if (placeOrderModalTitleElement) {
          placeOrderModalTitleElement.textContent = modalTitle;
        }
        placeOrderModalPayloadElement.textContent = JSON.stringify(payload, null, 2);
        placeOrderModalElement.classList.add("is-visible");
        placeOrderModalElement.setAttribute("aria-hidden", "false");
      };

      const applyOrderTypeInputsVisibility = () => {
        if (!orderStopPriceGroupElement || !orderPriceFieldElement || !orderPriceFillActionsElement) {
          return;
        }

        const isStopSelected = isStopOrderTypeSelected();
        const isPriceRequired = isLimitPriceRequiredOrderTypeSelected();

        orderStopPriceGroupElement.classList.toggle("is-visible", isStopSelected);
        orderStopPriceGroupElement.setAttribute("aria-hidden", isStopSelected ? "false" : "true");
        orderPriceFieldElement.classList.toggle("is-hidden", !isPriceRequired);
        orderPriceFillActionsElement.classList.toggle("is-hidden", !isPriceRequired);
        orderPriceFieldElement.setAttribute("aria-hidden", isPriceRequired ? "false" : "true");
        orderPriceFillActionsElement.setAttribute("aria-hidden", isPriceRequired ? "false" : "true");
      };

      const hideChartOrderPreview = () => {
        if (!chartOrderPreviewElement) {
          return;
        }

        chartOrderPreviewElement.classList.remove("is-visible", "is-buy", "is-sell", "is-warning");
        chartOrderPreviewElement.setAttribute("aria-hidden", "true");
        if (chartOrderPreviewHelpElement) {
          chartOrderPreviewHelpElement.textContent = "";
        }

        if (chartOrderPreviewLineElement) {
          chartOrderPreviewLineElement.classList.remove("is-visible", "is-buy", "is-sell");
          chartOrderPreviewLineElement.setAttribute("aria-hidden", "true");
        }

        if (chartStopPreviewElement) {
          chartStopPreviewElement.classList.remove("is-visible", "is-buy", "is-sell", "is-warning");
          chartStopPreviewElement.setAttribute("aria-hidden", "true");
          if (chartStopPreviewHelpElement) {
            chartStopPreviewHelpElement.textContent = "";
          }
        }

        if (chartStopPreviewLineElement) {
          chartStopPreviewLineElement.classList.remove("is-visible", "is-buy", "is-sell");
          chartStopPreviewLineElement.setAttribute("aria-hidden", "true");
        }
      };

      const renderChartOrderPreview = () => {
        if (
          !chartOrderPreviewElement
          || !chartOrderPreviewSideElement
          || !chartOrderPreviewDetailsElement
          || !chartCanvas
          || !orderPriceInputElement
          || !orderAmountInputElement
          || !orderTotalInputElement
          || !orderActionButtonElements.length
        ) {
          return;
        }

        const hasEnabledAction = orderActionButtonElements.some((buttonElement) => !buttonElement.disabled);
        if (!hasEnabledAction) {
          hideChartOrderPreview();
          return;
        }

        const amountValue = parseOrderInputNumber(orderAmountInputElement);
        const totalValue = parseOrderInputNumber(orderTotalInputElement);
        if (
          !Number.isFinite(amountValue)
          || amountValue <= 0
          || !Number.isFinite(totalValue)
          || totalValue <= 0
        ) {
          hideChartOrderPreview();
          return;
        }

        const candlePaneBounds = resolveCandlePaneBoundsPx();
        if (!candlePaneBounds) {
          hideChartOrderPreview();
          return;
        }

        const side = activeOrderSide === "sell" ? "sell" : "buy";
        const canvasWidth = chartCanvas.clientWidth;
        const rightScaleReservePx = 66;
        const maxDrawableRightPx = Math.max(0, canvasWidth - rightScaleReservePx);

        if (isLimitPriceRequiredOrderTypeSelected()) {
          const priceValue = parseOrderInputNumber(orderPriceInputElement);
          if (!Number.isFinite(priceValue) || priceValue <= 0) {
            hideChartOrderPreview();
            return;
          }

          const yCoordinate = candleSeries.priceToCoordinate(priceValue);
          if (!Number.isFinite(Number(yCoordinate)) || yCoordinate < candlePaneBounds.top || yCoordinate > candlePaneBounds.bottom) {
            hideChartOrderPreview();
            return;
          }

          const isStopLimitOrder = isStopLimitOrderTypeSelected();
          const askPriceValue = parseMarketPriceValue(valueAskElement?.textContent || "");
          const bidPriceValue = parseMarketPriceValue(valueBidElement?.textContent || "");
          const warningMessages = [];
          if (!isStopLimitOrder) {
            if (side === "buy" && Number.isFinite(askPriceValue) && priceValue > askPriceValue) {
              warningMessages.push("Order price is above ask price");
            } else if (side === "sell" && Number.isFinite(bidPriceValue) && priceValue < bidPriceValue) {
              warningMessages.push("Order price is below bid price");
            }
          }

          if (isStopLimitOrder && orderStopPriceInputElement) {
            const stopPriceValue = parseOrderInputNumber(orderStopPriceInputElement);
            if (Number.isFinite(stopPriceValue) && stopPriceValue > 0) {
              if (side === "buy" && priceValue < stopPriceValue) {
                warningMessages.push("Order price is below stop price");
              } else if (side === "sell" && priceValue > stopPriceValue) {
                warningMessages.push("Order price is above stop price");
              }
            }
          }

          const orderPreviewWarning = warningMessages.join(" | ");

          chartOrderPreviewElement.classList.remove("is-buy", "is-sell", "is-warning");
          chartOrderPreviewElement.classList.add(side === "sell" ? "is-sell" : "is-buy", "is-visible");
          chartOrderPreviewElement.classList.toggle("is-warning", orderPreviewWarning.length > 0);
          chartOrderPreviewElement.style.top = `${Math.round(yCoordinate)}px`;
          chartOrderPreviewElement.setAttribute("aria-hidden", "false");
          chartOrderPreviewSideElement.textContent = side === "sell" ? "Sell" : "Buy";
          chartOrderPreviewDetailsElement.textContent = `${formatOrderAmountInputValue(amountValue)} • ${formatOrderTotalInputValue(totalValue)}`;
          if (chartOrderPreviewHelpElement) {
            chartOrderPreviewHelpElement.textContent = orderPreviewWarning;
          }

          if (chartOrderPreviewLineElement) {
            chartOrderPreviewLineElement.classList.remove("is-buy", "is-sell");
            chartOrderPreviewLineElement.classList.add(side === "sell" ? "is-sell" : "is-buy", "is-visible");
            chartOrderPreviewLineElement.style.top = `${Math.round(yCoordinate)}px`;
            chartOrderPreviewLineElement.style.left = "0px";
            chartOrderPreviewLineElement.style.width = `${maxDrawableRightPx}px`;
            chartOrderPreviewLineElement.setAttribute("aria-hidden", "false");
          }
        } else {
          chartOrderPreviewElement.classList.remove("is-visible", "is-buy", "is-sell", "is-warning");
          chartOrderPreviewElement.setAttribute("aria-hidden", "true");
          if (chartOrderPreviewHelpElement) {
            chartOrderPreviewHelpElement.textContent = "";
          }
          if (chartOrderPreviewLineElement) {
            chartOrderPreviewLineElement.classList.remove("is-visible", "is-buy", "is-sell");
            chartOrderPreviewLineElement.setAttribute("aria-hidden", "true");
          }
        }

        if (!isStopOrderTypeSelected() || !chartStopPreviewElement || !chartStopPreviewDetailsElement || !orderStopPriceInputElement) {
          if (chartStopPreviewElement) {
            chartStopPreviewElement.classList.remove("is-visible", "is-buy", "is-sell", "is-warning");
            chartStopPreviewElement.setAttribute("aria-hidden", "true");
            if (chartStopPreviewHelpElement) {
              chartStopPreviewHelpElement.textContent = "";
            }
          }
          if (chartStopPreviewLineElement) {
            chartStopPreviewLineElement.classList.remove("is-visible", "is-buy", "is-sell");
            chartStopPreviewLineElement.setAttribute("aria-hidden", "true");
          }
          return;
        }

        const stopPriceValue = parseOrderInputNumber(orderStopPriceInputElement);
        if (!Number.isFinite(stopPriceValue) || stopPriceValue <= 0 || orderStopPriceInputElement.classList.contains("is-below-min")) {
          chartStopPreviewElement.classList.remove("is-visible", "is-buy", "is-sell", "is-warning");
          chartStopPreviewElement.setAttribute("aria-hidden", "true");
          if (chartStopPreviewHelpElement) {
            chartStopPreviewHelpElement.textContent = "";
          }
          if (chartStopPreviewLineElement) {
            chartStopPreviewLineElement.classList.remove("is-visible", "is-buy", "is-sell");
            chartStopPreviewLineElement.setAttribute("aria-hidden", "true");
          }
          return;
        }

        const stopYCoordinate = candleSeries.priceToCoordinate(stopPriceValue);
        if (!Number.isFinite(Number(stopYCoordinate)) || stopYCoordinate < candlePaneBounds.top || stopYCoordinate > candlePaneBounds.bottom) {
          chartStopPreviewElement.classList.remove("is-visible", "is-buy", "is-sell", "is-warning");
          chartStopPreviewElement.setAttribute("aria-hidden", "true");
          if (chartStopPreviewHelpElement) {
            chartStopPreviewHelpElement.textContent = "";
          }
          if (chartStopPreviewLineElement) {
            chartStopPreviewLineElement.classList.remove("is-visible", "is-buy", "is-sell");
            chartStopPreviewLineElement.setAttribute("aria-hidden", "true");
          }
          return;
        }

        const stopWarningMessages = [];
        const askPriceValue = parseMarketPriceValue(valueAskElement?.textContent || "");
        const bidPriceValue = parseMarketPriceValue(valueBidElement?.textContent || "");
        if (side === "sell" && Number.isFinite(bidPriceValue) && stopPriceValue > bidPriceValue) {
          stopWarningMessages.push("Stop price is above bid price");
        } else if (side === "buy" && Number.isFinite(askPriceValue) && stopPriceValue < askPriceValue) {
          stopWarningMessages.push("Stop price is below ask price");
        }
        const stopPreviewWarning = stopWarningMessages.join(" | ");

        chartStopPreviewElement.classList.remove("is-buy", "is-sell", "is-warning");
        chartStopPreviewElement.classList.add(side === "sell" ? "is-sell" : "is-buy", "is-visible");
        chartStopPreviewElement.classList.toggle("is-warning", stopPreviewWarning.length > 0);
        chartStopPreviewElement.style.top = `${Math.round(stopYCoordinate)}px`;
        chartStopPreviewElement.setAttribute("aria-hidden", "false");
        chartStopPreviewDetailsElement.textContent = formatOrderPriceInputValue(stopPriceValue);
        if (chartStopPreviewHelpElement) {
          chartStopPreviewHelpElement.textContent = stopPreviewWarning;
        }

        if (chartStopPreviewLineElement) {
          chartStopPreviewLineElement.classList.remove("is-buy", "is-sell");
          chartStopPreviewLineElement.classList.add(side === "sell" ? "is-sell" : "is-buy", "is-visible");
          chartStopPreviewLineElement.style.top = `${Math.round(stopYCoordinate)}px`;
          chartStopPreviewLineElement.style.left = "0px";
          chartStopPreviewLineElement.style.width = `${maxDrawableRightPx}px`;
          chartStopPreviewLineElement.setAttribute("aria-hidden", "false");
        }
      };

      const updateOrderPriceFromPreviewDrag = (clientY) => {
        if (!orderPriceInputElement || !chartCanvas || !isLimitPriceRequiredOrderTypeSelected()) {
          return;
        }

        const canvasRect = chartCanvas.getBoundingClientRect();
        const candlePaneBounds = resolveCandlePaneBoundsPx();
        if (!candlePaneBounds || canvasRect.height <= 0) {
          return;
        }

        const yInCanvas = Number(clientY) - canvasRect.top;
        const clampedY = clamp(yInCanvas, candlePaneBounds.top, candlePaneBounds.bottom);
        const rawPrice = Number(candleSeries.coordinateToPrice(clampedY));
        const nextPrice = snapOrderPriceToTick(rawPrice);
        if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
          return;
        }

        const formattedPrice = formatOrderPriceInputValue(nextPrice);
        if (!formattedPrice) {
          return;
        }

        if (String(orderPriceInputElement.value || "").trim() === formattedPrice) {
          return;
        }

        orderPriceInputElement.value = formattedPrice;
        orderPriceInputElement.dispatchEvent(new Event("input", { bubbles: true }));
      };

      const updateStopPriceFromPreviewDrag = (clientY) => {
        if (!orderStopPriceInputElement || !chartCanvas || !isStopOrderTypeSelected()) {
          return;
        }

        const canvasRect = chartCanvas.getBoundingClientRect();
        const candlePaneBounds = resolveCandlePaneBoundsPx();
        if (!candlePaneBounds || canvasRect.height <= 0) {
          return;
        }

        const yInCanvas = Number(clientY) - canvasRect.top;
        const clampedY = clamp(yInCanvas, candlePaneBounds.top, candlePaneBounds.bottom);
        const rawPrice = Number(candleSeries.coordinateToPrice(clampedY));
        const nextPrice = snapOrderPriceToTick(rawPrice);
        if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
          return;
        }

        const formattedPrice = formatOrderPriceInputValue(nextPrice);
        if (!formattedPrice) {
          return;
        }

        if (String(orderStopPriceInputElement.value || "").trim() === formattedPrice) {
          return;
        }

        orderStopPriceInputElement.value = formattedPrice;
        orderStopPriceInputElement.dispatchEvent(new Event("input", { bubbles: true }));
      };

      const getOrderAmountStepValue = () => {
        if (!orderAmountInputElement) {
          return Number.NaN;
        }

        const stepAttribute = String(orderAmountInputElement.getAttribute("step") || "").trim();
        if (!stepAttribute || stepAttribute.toLowerCase() === "any") {
          return Number.NaN;
        }

        const parsedStep = Number(stepAttribute);
        return Number.isFinite(parsedStep) && parsedStep > 0 ? parsedStep : Number.NaN;
      };

      const getOrderAmountPrecisionValue = () => {
        if (!orderAmountInputElement) {
          return Number.NaN;
        }

        const precisionAttribute = String(orderAmountInputElement.dataset.amountPrecision || "").trim();
        if (!precisionAttribute) {
          return Number.NaN;
        }

        const parsedPrecision = Number(precisionAttribute);
        return Number.isFinite(parsedPrecision) && parsedPrecision >= 0 ? parsedPrecision : Number.NaN;
      };

      const getOrderAmountMinValue = () => {
        if (!orderAmountInputElement) {
          return Number.NaN;
        }

        const minAttribute = String(orderAmountInputElement.getAttribute("min") || "").trim();
        if (!minAttribute) {
          return Number.NaN;
        }

        const parsedMin = Number(minAttribute);
        return Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : Number.NaN;
      };

      const getOrderPriceMinValue = () => {
        if (!orderPriceInputElement) {
          return Number.NaN;
        }

        const minAttribute = String(orderPriceInputElement.getAttribute("min") || "").trim();
        if (!minAttribute) {
          return Number.NaN;
        }

        const parsedMin = Number(minAttribute);
        return Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : Number.NaN;
      };

      const getOrderPriceMaxValue = () => {
        if (!orderPriceInputElement) {
          return Number.NaN;
        }

        const maxAttribute = String(orderPriceInputElement.getAttribute("max") || "").trim();
        if (!maxAttribute) {
          return Number.NaN;
        }

        const parsedMax = Number(maxAttribute);
        return Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : Number.NaN;
      };

      const getOrderPriceStepValue = () => {
        if (!orderPriceInputElement) {
          return Number.NaN;
        }

        const stepAttribute = String(orderPriceInputElement.getAttribute("step") || "").trim();
        if (!stepAttribute || stepAttribute.toLowerCase() === "any") {
          return Number.NaN;
        }

        const parsedStep = Number(stepAttribute);
        return Number.isFinite(parsedStep) && parsedStep > 0 ? parsedStep : Number.NaN;
      };

      const getOrderPricePrecisionValue = () => {
        if (!orderPriceInputElement) {
          return Number.NaN;
        }

        const precisionAttribute = String(orderPriceInputElement.dataset.pricePrecision || "").trim();
        if (!precisionAttribute) {
          return Number.NaN;
        }

        const parsedPrecision = Number(precisionAttribute);
        return Number.isFinite(parsedPrecision) && parsedPrecision >= 0 ? parsedPrecision : Number.NaN;
      };

      const getOrderPriceDisplayDecimals = () => {
        const precisionValue = getOrderPricePrecisionValue();
        if (Number.isInteger(precisionValue) && precisionValue >= 0) {
          return Math.min(12, Number(precisionValue));
        }

        const stepValue = getOrderPriceStepValue();
        if (Number.isFinite(stepValue) && stepValue > 0) {
          return getDecimalPlacesFromValue(stepValue);
        }

        return 8;
      };

      const formatOrderPriceInputValue = (value) => formatNumberWithDecimals(value, getOrderPriceDisplayDecimals());

      const getOrderAmountDisplayDecimals = () => {
        const precisionValue = getOrderAmountPrecisionValue();
        if (Number.isInteger(precisionValue) && precisionValue >= 0) {
          return Math.min(12, Number(precisionValue));
        }

        if (Number.isFinite(precisionValue) && precisionValue > 0) {
          return getDecimalPlacesFromValue(precisionValue);
        }

        const stepValue = getOrderAmountStepValue();
        if (Number.isFinite(stepValue) && stepValue > 0) {
          return getDecimalPlacesFromValue(stepValue);
        }

        return 8;
      };

      const formatOrderAmountInputValue = (value) => formatNumberWithDecimals(value, getOrderAmountDisplayDecimals());

      const getOrderTotalDisplayDecimals = () => {
        const nextDecimals = getOrderPriceDisplayDecimals() + getOrderAmountDisplayDecimals();
        return Math.min(12, Math.max(2, nextDecimals));
      };

      const formatOrderTotalInputValue = (value) => formatNumberWithDecimals(value, getOrderTotalDisplayDecimals());

      const getDefaultOrderTotalAutofillValue = () => {
        const minTotalValue = getOrderTotalMinValue();
        if (Number.isFinite(minTotalValue) && minTotalValue > 0) {
          return minTotalValue;
        }

        return 1;
      };

      const normalizeValueByPrecision = (value, precisionValue) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue <= 0 || !Number.isFinite(precisionValue) || precisionValue < 0) {
          return numericValue;
        }

        if (Number.isInteger(precisionValue) && precisionValue >= 0) {
          const decimals = Math.min(12, Number(precisionValue));
          return Number(numericValue.toFixed(decimals));
        }

        if (precisionValue > 0) {
          return Math.round(numericValue / precisionValue) * precisionValue;
        }

        return numericValue;
      };

      const getStopPriceMinValue = () => {
        if (!orderStopPriceInputElement) {
          return Number.NaN;
        }

        const minAttribute = String(orderStopPriceInputElement.getAttribute("min") || "").trim();
        if (!minAttribute) {
          return Number.NaN;
        }

        const parsedMin = Number(minAttribute);
        return Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : Number.NaN;
      };

      const getStopPriceMaxValue = () => {
        if (!orderStopPriceInputElement) {
          return Number.NaN;
        }

        const maxAttribute = String(orderStopPriceInputElement.getAttribute("max") || "").trim();
        if (!maxAttribute) {
          return Number.NaN;
        }

        const parsedMax = Number(maxAttribute);
        return Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : Number.NaN;
      };

      const snapOrderPriceToTick = (priceValue) => {
        const numericPrice = Number(priceValue);
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
          return Number.NaN;
        }

        const precisionValue = getOrderPricePrecisionValue();
        const stepValue = getOrderPriceStepValue();
        const minPriceValue = getOrderPriceMinValue();
        const maxPriceValue = getOrderPriceMaxValue();

        const precisionRoundedValue = normalizeValueByPrecision(numericPrice, precisionValue);
        const basePriceValue = Number.isFinite(precisionRoundedValue) && precisionRoundedValue > 0
          ? precisionRoundedValue
          : numericPrice;

        if (!Number.isFinite(stepValue)) {
          if (Number.isFinite(minPriceValue) && basePriceValue < minPriceValue) {
            return minPriceValue;
          }
          if (Number.isFinite(maxPriceValue) && basePriceValue > maxPriceValue) {
            return maxPriceValue;
          }
          return basePriceValue;
        }

        const snapOrigin = Number.isFinite(minPriceValue) ? minPriceValue : 0;
        let snappedPrice = Math.round((basePriceValue - snapOrigin) / stepValue) * stepValue + snapOrigin;
        snappedPrice = normalizeValueByPrecision(snappedPrice, precisionValue);

        if (Number.isFinite(minPriceValue) && snappedPrice < minPriceValue) {
          snappedPrice = minPriceValue;
        }
        if (Number.isFinite(maxPriceValue) && snappedPrice > maxPriceValue) {
          snappedPrice = maxPriceValue;
        }

        return snappedPrice;
      };

      const getOrderTotalMinValue = () => {
        if (!orderTotalInputElement) {
          return Number.NaN;
        }

        const minAttribute = String(orderTotalInputElement.getAttribute("min") || "").trim();
        if (!minAttribute) {
          return Number.NaN;
        }

        const parsedMin = Number(minAttribute);
        return Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : Number.NaN;
      };

      const updateOrderActionButtonsState = () => {
        if (!orderActionButtonElements.length) {
          return;
        }

        const isStopSelected = isStopOrderTypeSelected();
        const isPriceRequired = isLimitPriceRequiredOrderTypeSelected();

        const hasEmptyRequiredField = [
          orderAmountInputElement,
          orderTotalInputElement,
          ...(isPriceRequired ? [orderPriceInputElement] : []),
          ...(isStopSelected ? [orderStopPriceInputElement] : []),
        ].some((inputElement) => String(inputElement?.value || "").trim().length === 0);

        const hasOrderInputError = [
          orderAmountInputElement,
          orderTotalInputElement,
          ...(isPriceRequired ? [orderPriceInputElement] : []),
          ...(isStopSelected ? [orderStopPriceInputElement] : []),
        ].some((inputElement) => inputElement?.classList.contains("is-below-min"));

        const shouldDisableOrderActions = hasEmptyRequiredField || hasOrderInputError;

        if (orderActionStatusElement) {
          if (hasEmptyRequiredField) {
            if (isStopSelected && isPriceRequired) {
              orderActionStatusElement.textContent = "Fill in Stop price, Order price, Amount, and Total";
            } else if (isStopSelected) {
              orderActionStatusElement.textContent = "Fill in Stop price, Amount, and Total";
            } else if (isPriceRequired) {
              orderActionStatusElement.textContent = "Fill in Order price, Amount, and Total";
            } else {
              orderActionStatusElement.textContent = "Fill in Amount and Total";
            }
          } else if (hasOrderInputError) {
            orderActionStatusElement.textContent = "Correct the invalid order values";
          } else {
            orderActionStatusElement.textContent = "";
          }
        }

        orderActionButtonElements.forEach((buttonElement) => {
          buttonElement.disabled = shouldDisableOrderActions;
          buttonElement.setAttribute("aria-disabled", shouldDisableOrderActions ? "true" : "false");
        });

        if (placeOrderButtonElement) {
          placeOrderButtonElement.disabled = shouldDisableOrderActions;
          placeOrderButtonElement.setAttribute("aria-disabled", shouldDisableOrderActions ? "true" : "false");
        }

        renderChartOrderPreview();
      };

      const setOrderActionSide = (side) => {
        if (!orderBuyButtonElement || !orderSellButtonElement) {
          return;
        }

        const isSellSide = side === "sell";
        activeOrderSide = isSellSide ? "sell" : "buy";
        orderBuyButtonElement.classList.toggle("is-muted", isSellSide);
        orderSellButtonElement.classList.toggle("is-muted", !isSellSide);

        if (placeOrderButtonElement) {
          placeOrderButtonElement.classList.toggle("is-buy", !isSellSide);
          placeOrderButtonElement.classList.toggle("is-sell", isSellSide);
        }

        renderChartOrderPreview();
      };

      const validateOrderAmountMinimum = () => {
        if (!orderAmountInputElement) {
          return false;
        }

        const amountValue = parseOrderInputNumber(orderAmountInputElement);
        const minValue = getOrderAmountMinValue();
        const isBelowMinimum = (
          Number.isFinite(amountValue)
          && amountValue > 0
          && Number.isFinite(minValue)
          && minValue > 0
          && amountValue < minValue
        );

        orderAmountInputElement.classList.toggle("is-below-min", isBelowMinimum);
        orderAmountInputElement.setAttribute("aria-invalid", isBelowMinimum ? "true" : "false");
        updateOrderActionButtonsState();
        return isBelowMinimum;
      };

      const validateOrderPriceLimits = () => {
        if (!orderPriceInputElement) {
          return false;
        }

        if (!isLimitPriceRequiredOrderTypeSelected()) {
          orderPriceInputElement.classList.remove("is-below-min");
          orderPriceInputElement.setAttribute("aria-invalid", "false");
          return false;
        }

        const priceValue = parseOrderInputNumber(orderPriceInputElement);
        const minPriceValue = getOrderPriceMinValue();
        const maxPriceValue = getOrderPriceMaxValue();

        const isBelowMinimum = (
          Number.isFinite(priceValue)
          && priceValue > 0
          && Number.isFinite(minPriceValue)
          && minPriceValue > 0
          && priceValue < minPriceValue
        );

        const isAboveMaximum = (
          Number.isFinite(priceValue)
          && priceValue > 0
          && Number.isFinite(maxPriceValue)
          && maxPriceValue > 0
          && priceValue > maxPriceValue
        );

        const isOutsideLimits = isBelowMinimum || isAboveMaximum;
        orderPriceInputElement.classList.toggle("is-below-min", isOutsideLimits);
        orderPriceInputElement.setAttribute("aria-invalid", isOutsideLimits ? "true" : "false");
        updateOrderActionButtonsState();
        return isOutsideLimits;
      };

      const validateStopPriceLimits = () => {
        if (!orderStopPriceInputElement) {
          return false;
        }

        if (!isStopOrderTypeSelected()) {
          orderStopPriceInputElement.classList.remove("is-below-min");
          orderStopPriceInputElement.setAttribute("aria-invalid", "false");
          return false;
        }

        const stopPriceValue = parseOrderInputNumber(orderStopPriceInputElement);
        const minPriceValue = getStopPriceMinValue();
        const maxPriceValue = getStopPriceMaxValue();

        const isBelowMinimum = (
          Number.isFinite(stopPriceValue)
          && stopPriceValue > 0
          && Number.isFinite(minPriceValue)
          && minPriceValue > 0
          && stopPriceValue < minPriceValue
        );

        const isAboveMaximum = (
          Number.isFinite(stopPriceValue)
          && stopPriceValue > 0
          && Number.isFinite(maxPriceValue)
          && maxPriceValue > 0
          && stopPriceValue > maxPriceValue
        );

        const isOutsideLimits = isBelowMinimum || isAboveMaximum;
        orderStopPriceInputElement.classList.toggle("is-below-min", isOutsideLimits);
        orderStopPriceInputElement.setAttribute("aria-invalid", isOutsideLimits ? "true" : "false");
        updateOrderActionButtonsState();
        return isOutsideLimits;
      };

      const validateOrderTotalMinimum = () => {
        if (!orderTotalInputElement) {
          return false;
        }

        const totalValue = parseOrderInputNumber(orderTotalInputElement);
        const minCostValue = getOrderTotalMinValue();
        const isBelowMinimum = (
          Number.isFinite(totalValue)
          && totalValue > 0
          && Number.isFinite(minCostValue)
          && minCostValue > 0
          && totalValue < minCostValue
        );

        orderTotalInputElement.classList.toggle("is-below-min", isBelowMinimum);
        orderTotalInputElement.setAttribute("aria-invalid", isBelowMinimum ? "true" : "false");
        updateOrderActionButtonsState();
        return isBelowMinimum;
      };

      const alignAmountToStep = (amountValue) => {
        const numericAmount = Number(amountValue);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
          return Number.NaN;
        }

        const precisionValue = getOrderAmountPrecisionValue();
        const precisionRoundedAmount = normalizeValueByPrecision(numericAmount, precisionValue);
        const baseAmountValue = Number.isFinite(precisionRoundedAmount) && precisionRoundedAmount > 0
          ? precisionRoundedAmount
          : numericAmount;

        const stepValue = getOrderAmountStepValue();
        if (!Number.isFinite(stepValue)) {
          return baseAmountValue;
        }

        const steppedAmount = Math.round(baseAmountValue / stepValue) * stepValue;
        const normalizedSteppedAmount = normalizeValueByPrecision(steppedAmount, precisionValue);
        return normalizedSteppedAmount > 0 ? normalizedSteppedAmount : stepValue;
      };

      const updateOrderTotalFromAmount = () => {
        if (!orderPriceInputElement || !orderAmountInputElement || !orderTotalInputElement || isSyncingOrderInputs) {
          return;
        }

        if (isLimitPriceRequiredOrderTypeSelected() && validateOrderPriceLimits()) {
          return;
        }

        const isBelowMinimum = validateOrderAmountMinimum();
        if (isBelowMinimum) {
          return;
        }

        const priceValue = getEffectiveOrderPriceValue();
        const amountValue = parseOrderInputNumber(orderAmountInputElement);
        if (!Number.isFinite(priceValue) || priceValue <= 0 || !Number.isFinite(amountValue) || amountValue <= 0) {
          return;
        }

        const nextTotalValue = priceValue * amountValue;
        if (!Number.isFinite(nextTotalValue)) {
          return;
        }

        isSyncingOrderInputs = true;
        orderTotalInputElement.value = formatOrderTotalInputValue(nextTotalValue);
        isSyncingOrderInputs = false;
        validateOrderTotalMinimum();
      };

      const updateOrderAmountFromTotal = () => {
        if (!orderPriceInputElement || !orderAmountInputElement || !orderTotalInputElement || isSyncingOrderInputs) {
          return;
        }

        if (isLimitPriceRequiredOrderTypeSelected() && validateOrderPriceLimits()) {
          return;
        }

        validateOrderTotalMinimum();

        const priceValue = getEffectiveOrderPriceValue();
        const totalValue = parseOrderInputNumber(orderTotalInputElement);
        if (!Number.isFinite(priceValue) || priceValue <= 0 || !Number.isFinite(totalValue) || totalValue < 0) {
          return;
        }

        const calculatedAmountValue = totalValue / priceValue;
        const nextAmountValue = alignAmountToStep(calculatedAmountValue);
        if (!Number.isFinite(nextAmountValue)) {
          return;
        }

        isSyncingOrderInputs = true;
        orderAmountInputElement.value = formatOrderAmountInputValue(nextAmountValue);
        isSyncingOrderInputs = false;
        validateOrderAmountMinimum();
        validateOrderTotalMinimum();
      };

      const hideSelectorMenus = () => {
        activeSelectorMenu = null;

        if (pairSelectorMenuElement) {
          pairSelectorMenuElement.classList.remove("is-visible");
        }
        if (exchangeSelectorMenuElement) {
          exchangeSelectorMenuElement.classList.remove("is-visible");
        }
        if (pairSelectorButtonElement) {
          pairSelectorButtonElement.setAttribute("aria-expanded", "false");
        }
        if (exchangeSelectorButtonElement) {
          exchangeSelectorButtonElement.setAttribute("aria-expanded", "false");
        }
      };

      const createMarketTabId = () => `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const persistMarketTabs = () => {
        try {
          localStorage.setItem(marketTabsStorageKey, JSON.stringify(marketTabs));
          localStorage.setItem(activeMarketTabStorageKey, activeMarketTabId || "");
        } catch (_error) {
        }
      };

      const buildMarketTabLabel = (tabItem) => {
        const exchangeLabel = getExchangeLabelByKey(tabItem?.exchangeKey) || String(tabItem?.exchangeKey || "").toUpperCase();
        const displaySymbol = String(tabItem?.symbol || "").replace("/", "");
        const timeframe = String(tabItem?.timeframe || "");
        return `${exchangeLabel} ${displaySymbol} ${timeframe}`.trim();
      };

      const normalizeMarketTabContext = (tabItem) => {
        const requestedExchangeKey = validExchangeKeys.has(tabItem?.exchangeKey)
          ? tabItem.exchangeKey
          : currentExchangeKey;

        const availableTimeframes = Array.from(getEnabledTimeframesForExchange(requestedExchangeKey));
        const requestedTimeframe = String(tabItem?.timeframe || "");
        const resolvedTimeframe = availableTimeframes.includes(requestedTimeframe)
          ? requestedTimeframe
          : (availableTimeframes[0] || currentTimeframe);

        const symbolOptions = getFilteredPairOptionsForExchange(requestedExchangeKey);
        const availableSymbols = symbolOptions.map((item) => item.symbol).filter(Boolean);
        const requestedSymbol = String(tabItem?.symbol || "");
        const resolvedSymbol = availableSymbols.includes(requestedSymbol)
          ? requestedSymbol
          : (availableSymbols[0] || currentSymbol);

        return {
          id: String(tabItem?.id || createMarketTabId()),
          exchangeKey: requestedExchangeKey,
          symbol: resolvedSymbol,
          timeframe: resolvedTimeframe,
        };
      };

      const renderMarketTabs = () => {
        if (!marketTabsElement) {
          return;
        }

        marketTabsElement.innerHTML = "";
        const fragment = document.createDocumentFragment();

        marketTabs.forEach((tabItem) => {
          const tabButton = document.createElement("button");
          tabButton.type = "button";
          tabButton.className = "market-tab";
          tabButton.dataset.marketTabId = tabItem.id;
          tabButton.setAttribute("role", "tab");
          tabButton.setAttribute("aria-selected", tabItem.id === activeMarketTabId ? "true" : "false");
          tabButton.classList.toggle("is-active", tabItem.id === activeMarketTabId);
          tabButton.title = buildMarketTabLabel(tabItem);

          const labelElement = document.createElement("span");
          labelElement.className = "market-tab-label";
          labelElement.textContent = buildMarketTabLabel(tabItem);

          const closeButton = document.createElement("span");
          closeButton.className = "market-tab-close";
          closeButton.dataset.marketTabCloseId = tabItem.id;
          closeButton.setAttribute("role", "button");
          closeButton.setAttribute("tabindex", "0");
          closeButton.setAttribute("aria-label", "Close tab");
          closeButton.title = "Close tab";
          closeButton.textContent = "×";

          tabButton.appendChild(labelElement);
          tabButton.appendChild(closeButton);
          fragment.appendChild(tabButton);
        });

        marketTabsElement.appendChild(fragment);
      };

      const syncActiveMarketTabFromCurrentContext = () => {
        const activeTab = marketTabs.find((tabItem) => tabItem.id === activeMarketTabId);
        if (!activeTab) {
          return;
        }

        activeTab.exchangeKey = currentExchangeKey;
        activeTab.symbol = currentSymbol;
        activeTab.timeframe = currentTimeframe;
        renderMarketTabs();
        persistMarketTabs();
      };

      const activateMarketTab = (tabId, options = {}) => {
        const activeTab = marketTabs.find((tabItem) => tabItem.id === tabId);
        if (!activeTab) {
          return;
        }

        const normalizedTab = normalizeMarketTabContext(activeTab);
        activeTab.exchangeKey = normalizedTab.exchangeKey;
        activeTab.symbol = normalizedTab.symbol;
        activeTab.timeframe = normalizedTab.timeframe;

        activeMarketTabId = activeTab.id;

        currentExchangeKey = activeTab.exchangeKey;
        currentExchangeLabel = getExchangeLabelByKey(currentExchangeKey) || currentExchangeLabel;
        enabledTimeframes = getEnabledTimeframesForExchange(currentExchangeKey);
        enabledQuoteCurrencies = getEnabledQuoteCurrenciesForExchange(currentExchangeKey);
        enabledPairs = getEnabledPairsForExchange(currentExchangeKey);
        applyEnabledTimeframesToUI();
        applyEnabledQuoteCurrenciesToUI();
        applyEnabledPairsToUI();
        syncSettingsExchangeWithCurrentExchange();

        localStorage.setItem(exchangeStorageKey, currentExchangeKey);
        setPreferenceCookie("trade_wijs_exchange", currentExchangeKey);

        const exchangeSymbolOptions = getSymbolOptionsForExchange(currentExchangeKey);
        if (exchangeSymbolOptions.length > 0) {
          renderPairSelectorMenuOptions(exchangeSymbolOptions);
        }

        applyPairSelectorQuoteCurrencyFilter({ syncCurrentSymbol: false, persistSymbol: false });

        const visibleSymbols = Array.from(pairSelectorMenuElement?.querySelectorAll("[data-symbol]") || [])
          .filter((button) => !button.hidden)
          .map((button) => button.dataset.symbol)
          .filter(Boolean);
        if (visibleSymbols.includes(activeTab.symbol)) {
          currentSymbol = activeTab.symbol;
        } else if (visibleSymbols.length > 0) {
          currentSymbol = visibleSymbols[0];
        }

        currentDisplaySymbol = String(currentSymbol || "").replace("/", "");
        localStorage.setItem(symbolStorageKey, currentSymbol);
        setPreferenceCookie("trade_wijs_symbol", currentSymbol);

        const availableTimeframes = Array.from(enabledTimeframes);
        if (availableTimeframes.includes(activeTab.timeframe)) {
          currentTimeframe = activeTab.timeframe;
        } else if (availableTimeframes.length > 0) {
          currentTimeframe = availableTimeframes[0];
        }

        localStorage.setItem(timeframeStorageKey, currentTimeframe);
        setPreferenceCookie("trade_wijs_timeframe", currentTimeframe);

        if (pairSelectorButtonElement) {
          pairSelectorButtonElement.textContent = currentDisplaySymbol;
        }
        if (exchangeSelectorButtonElement) {
          exchangeSelectorButtonElement.textContent = currentExchangeLabel;
        }
        if (timeframeLabelElement) {
          timeframeLabelElement.textContent = currentTimeframe;
        }

        setActiveSelectorMenuItem(pairSelectorMenuElement, "data-symbol", currentSymbol);
        setActiveSelectorMenuItem(exchangeSelectorMenuElement, "data-exchange", currentExchangeKey);
        setActiveTimeframeButton(currentTimeframe);
        updateOrderInputQuoteCurrency();

        activeTab.exchangeKey = currentExchangeKey;
        activeTab.symbol = currentSymbol;
        activeTab.timeframe = currentTimeframe;

        renderMarketTabs();
        persistMarketTabs();

        if (options.refresh !== false) {
          pendingRestoreLogicalRange = null;
          const chartView =
            savedChartViewByTimeframe[getChartViewKey(currentTimeframe, currentExchangeKey, currentSymbol)]
            || savedChartViewByTimeframe[currentTimeframe];
          if (
            chartView
            && Number.isFinite(Number(chartView.from))
            && Number.isFinite(Number(chartView.to))
          ) {
            pendingRestoreLogicalRange = {
              from: Number(chartView.from),
              to: Number(chartView.to),
            };
          }
          hasFitContent = false;
          const requestedContextKey = getChartContextKey(currentExchangeKey, currentSymbol, currentTimeframe);
          const restoredFromCache = restoreChartContextFromCache(requestedContextKey);
          const skipImmediateRefresh = restoredFromCache && isChartContextCacheFresh(requestedContextKey, 5000);
          if (!restoredFromCache) {
            setLoadingTimeframeButton(currentTimeframe);
          }
          if (!skipImmediateRefresh) {
            refreshChartData({ priority: true, showUpdatingStatus: !restoredFromCache });
          }
          scheduleNextRefresh();
        }
      };

      const addMarketTab = (tabContext, options = {}) => {
        const nextTab = normalizeMarketTabContext({
          id: createMarketTabId(),
          exchangeKey: tabContext?.exchangeKey || currentExchangeKey,
          symbol: tabContext?.symbol || currentSymbol,
          timeframe: tabContext?.timeframe || currentTimeframe,
        });

        marketTabs.push(nextTab);
        if (marketTabs.length > 8) {
          marketTabs = marketTabs.slice(-8);
        }

        activeMarketTabId = nextTab.id;
        renderMarketTabs();
        persistMarketTabs();

        if (options.activate !== false) {
          activateMarketTab(nextTab.id, { refresh: options.refresh !== false });
        }
      };

      const closeMarketTab = (tabId) => {
        if (marketTabs.length <= 1) {
          return;
        }

        const closingIndex = marketTabs.findIndex((tabItem) => tabItem.id === tabId);
        if (closingIndex === -1) {
          return;
        }

        const wasActive = marketTabs[closingIndex].id === activeMarketTabId;
        marketTabs.splice(closingIndex, 1);

        if (!wasActive) {
          renderMarketTabs();
          persistMarketTabs();
          return;
        }

        const fallbackTab = marketTabs[Math.max(0, closingIndex - 1)] || marketTabs[0] || null;
        if (!fallbackTab) {
          return;
        }

        activeMarketTabId = fallbackTab.id;
        renderMarketTabs();
        persistMarketTabs();
        activateMarketTab(fallbackTab.id, { refresh: true });
      };

      const initializeMarketTabs = () => {
        let storedTabs = [];
        let storedActiveTabId = "";

        try {
          const parsedTabs = JSON.parse(localStorage.getItem(marketTabsStorageKey) || "[]");
          if (Array.isArray(parsedTabs)) {
            storedTabs = parsedTabs;
          }
          storedActiveTabId = String(localStorage.getItem(activeMarketTabStorageKey) || "");
        } catch (_error) {
          storedTabs = [];
          storedActiveTabId = "";
        }

        const normalizedTabs = storedTabs
          .map((tabItem) => normalizeMarketTabContext(tabItem))
          .filter((tabItem) => tabItem && tabItem.id);

        marketTabs = normalizedTabs.length > 0
          ? normalizedTabs
          : [normalizeMarketTabContext({
            id: createMarketTabId(),
            exchangeKey: currentExchangeKey,
            symbol: currentSymbol,
            timeframe: currentTimeframe,
          })];

        const hasStoredActiveTab = marketTabs.some((tabItem) => tabItem.id === storedActiveTabId);
        activeMarketTabId = hasStoredActiveTab ? storedActiveTabId : marketTabs[0].id;

        activateMarketTab(activeMarketTabId, { refresh: false });
      };

      const toggleSelectorMenu = (menuName) => {
        const nextMenu = activeSelectorMenu === menuName ? null : menuName;
        hideSelectorMenus();

        if (!nextMenu) {
          return;
        }

        activeSelectorMenu = nextMenu;
        if (nextMenu === "pair") {
          pairSelectorMenuElement?.classList.add("is-visible");
          pairSelectorButtonElement?.setAttribute("aria-expanded", "true");
        }
        if (nextMenu === "exchange") {
          exchangeSelectorMenuElement?.classList.add("is-visible");
          exchangeSelectorButtonElement?.setAttribute("aria-expanded", "true");
        }
      };

      const setActiveSelectorMenuItem = (menuElement, attributeName, value) => {
        if (!menuElement) {
          return;
        }

        const selector = `[${attributeName}]`;
        Array.from(menuElement.querySelectorAll(selector)).forEach((button) => {
          const isActive = button.getAttribute(attributeName) === value;
          button.classList.toggle("is-active", isActive);
        });
      };

      const setDrawLineMode = (enabled, tool = "horizontal") => {
        drawLineMode = enabled;
        activeDrawTool = enabled ? (tool === "trend" ? "trend" : "horizontal") : null;
        const drawCaptureOverlay = ensureDrawCaptureOverlayElement();

        if (enabled) {
          hideHorizontalLineContextMenu();
          hideTrendLineContextMenu();
          setSelectedHorizontalLine(null);
          setSelectedTrendLine(null);
          if (refreshTimerId) {
            clearTimeout(refreshTimerId);
            refreshTimerId = null;
          }

          if (drawCaptureOverlay) {
            drawCaptureOverlay.style.display = "block";
            drawCaptureOverlay.style.pointerEvents = "auto";
            drawCaptureOverlay.dataset.previewVisible = "true";
          }
          if (chartCanvas) {
            chartCanvas.dataset.previewVisible = "true";
          }

          if (activeDrawTool === "horizontal") {
            clearTrendLineHoverPreview();
            const latestBar = chartData[chartData.length - 1] || null;
            const latestPrice = latestBar ? Number(latestBar.close) : NaN;
            if (Number.isFinite(latestPrice) && latestPrice > 0) {
              updateHorizontalLineHoverPreview({ price: latestPrice });
            }
          } else {
            clearHorizontalLineHoverPreview();
            trendDrawAnchorPoint = null;
          }
        }

        if (!enabled) {
          hideHorizontalLineContextMenu();
          hideTrendLineContextMenu();
          clearHorizontalLineHoverPreview();
          clearTrendLineHoverPreview();

          if (drawCaptureOverlay) {
            drawCaptureOverlay.style.pointerEvents = "none";
            drawCaptureOverlay.style.display = "none";
            drawCaptureOverlay.dataset.previewVisible = "false";
          }
          if (chartCanvas) {
            chartCanvas.dataset.previewVisible = "false";
          }

          if (Array.isArray(deferredCandlesForRedraw) && deferredCandlesForRedraw.length > 0) {
            allCandles = deferredCandlesForRedraw;
            deferredCandlesForRedraw = null;
            if (deferredMarketDataForRefresh) {
              refreshMarketInfo(deferredMarketDataForRefresh);
              deferredMarketDataForRefresh = null;
            }
            redrawChart();
          }
          scheduleNextRefresh();
        }

        if (drawLineButtonElement) {
          drawLineButtonElement.classList.toggle("is-active", enabled && activeDrawTool === "horizontal");
        }

        if (trendLineButtonElement) {
          trendLineButtonElement.classList.toggle("is-active", enabled && activeDrawTool === "trend");
        }

        renderSelectedHorizontalLineHandle();
        renderSelectedTrendLineHandles();
      };

      const clearHorizontalLineHoverPreview = () => {
        if (!drawHoverPreviewLine) {
          const drawCaptureOverlay = ensureDrawCaptureOverlayElement();
          if (drawCaptureOverlay) {
            drawCaptureOverlay.dataset.previewVisible = "false";
          }
          if (chartCanvas) {
            chartCanvas.dataset.previewVisible = "false";
          }
          return;
        }

        candleSeries.removePriceLine(drawHoverPreviewLine);
        drawHoverPreviewLine = null;
        const drawCaptureOverlay = ensureDrawCaptureOverlayElement();
        if (drawCaptureOverlay) {
          drawCaptureOverlay.dataset.previewVisible = "false";
        }
        if (chartCanvas) {
          chartCanvas.dataset.previewVisible = "false";
        }
      };

      const updateHorizontalLineHoverPreview = (point) => {
        const nextPrice = Number(point?.price);
        if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
          clearHorizontalLineHoverPreview();
          return;
        }

        if (!drawHoverPreviewLine) {
          drawHoverPreviewLine = candleSeries.createPriceLine({
            price: nextPrice,
            color: "rgba(255, 209, 102, 0.75)",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            axisLabelVisible: false,
            title: "H",
          });
          const drawCaptureOverlay = ensureDrawCaptureOverlayElement();
          if (drawCaptureOverlay) {
            drawCaptureOverlay.dataset.previewVisible = "true";
          }
          if (chartCanvas) {
            chartCanvas.dataset.previewVisible = "true";
          }
          return;
        }

        drawHoverPreviewLine.applyOptions({
          price: nextPrice,
        });
        const drawCaptureOverlay = ensureDrawCaptureOverlayElement();
        if (drawCaptureOverlay) {
          drawCaptureOverlay.dataset.previewVisible = "true";
        }
        if (chartCanvas) {
          chartCanvas.dataset.previewVisible = "true";
        }
      };

      const clearDynamicPriceScaleLines = () => {
        while (dynamicPriceScaleLines.length > 0) {
          const line = dynamicPriceScaleLines.pop();
          if (!line) {
            continue;
          }

          try {
            candleSeries.removePriceLine(line);
          } catch (_error) {
          }
        }
      };

      const renderDynamicPriceScaleLines = () => {
        clearDynamicPriceScaleLines();
        // Helper candle price-scale labels disabled.
        // Only native (light gray) price scale labels should remain visible.
      };

      const setIndicatorButtonState = () => {
        indicatorButtonElements.forEach((button) => {
          const indicatorName = button.dataset.indicator;
          const isActive = Boolean(indicatorState[indicatorName]);
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });

        localStorage.setItem(indicatorStorageKey, JSON.stringify(indicatorState));
      };

      const setRightPanelTab = (panelName) => {
        const panelElementsByName = {
          order: panelOrderElement,
          watchlist: panelWatchlistElement,
          signals: panelSignalsElement,
        };

        Object.keys(panelElementsByName).forEach((name) => {
          const panelElement = panelElementsByName[name];
          if (!panelElement) {
            return;
          }

          panelElement.classList.toggle("is-active", name === panelName);
        });

        panelTabButtons.forEach((button) => {
          const isActive = button.dataset.panel === panelName;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
        });
      };

      const renderChartViewport = () => {
        if (!rightPanelElement || !chartElement) {
          return;
        }

        window.requestAnimationFrame(() => {
          syncChartViewportSize();
          applyChartSplit();
          renderFvgOverlay();
          renderSmcOverlay();
          renderDynamicPriceScaleLines();
          renderPaneScaleOverlay();
          renderSelectedHorizontalLineHandle();
          renderSelectedTrendLineHandles();
          updateScrollToRecentButtonVisibility();
        });
      };

      const schedulePostPaintTask = (callback) => {
        window.requestAnimationFrame(() => {
          window.setTimeout(callback, 0);
        });
      };

      const setAppViewMode = (mode) => {
        currentAppViewMode = mode === "settings" ? "settings" : "trade";
        pendingAppViewModeTaskToken += 1;
        const taskToken = pendingAppViewModeTaskToken;

        if (appShellElement) {
          appShellElement.classList.toggle("is-settings-mode", currentAppViewMode === "settings");
        }

        leftMenuButtonElements.forEach((button) => {
          const buttonView = button.dataset.view;
          const isActive = buttonView === currentAppViewMode;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });

        try {
          localStorage.setItem(appViewModeStorageKey, currentAppViewMode);
        } catch (_error) {
        }

        schedulePostPaintTask(() => {
          if (taskToken !== pendingAppViewModeTaskToken) {
            return;
          }

          if (currentAppViewMode === "trade") {
            renderChartViewport();
            return;
          }

          if (activeSettingsCategory === "exchanges") {
            syncSettingsExchangeWithCurrentExchange();
          }
        });
      };

      const setSettingsExchangeTab = (exchangeKey) => {
        const nextExchangeKey = validExchangeKeys.has(exchangeKey) ? exchangeKey : currentExchangeKey;
        activeSettingsExchangeKey = nextExchangeKey;

        const hasCachedTimeframes = Array.isArray(availableTimeframesByExchange[activeSettingsExchangeKey])
          && availableTimeframesByExchange[activeSettingsExchangeKey].length > 0;
        const hasCachedQuoteCurrencies = Array.isArray(availableQuoteCurrenciesByExchange[activeSettingsExchangeKey])
          && availableQuoteCurrenciesByExchange[activeSettingsExchangeKey].length > 0;
        const hasCachedSymbols = Array.isArray(availableSymbolsByExchange[activeSettingsExchangeKey])
          && availableSymbolsByExchange[activeSettingsExchangeKey].length > 0;
        const hasCachedSettingsOptions = hasCachedTimeframes && hasCachedQuoteCurrencies && hasCachedSymbols;

        if (!hasCachedSettingsOptions) {
          clearSettingsOptionsUI();
        }

        settingsExchangeTabElements.forEach((button) => {
          const isActive = button.dataset.settingsExchange === activeSettingsExchangeKey;
          button.classList.toggle("is-active", isActive);
        });

        const selectedExchangeButton = settingsExchangeTabElements.find(
          (button) => button.dataset.settingsExchange === activeSettingsExchangeKey,
        );
        if (settingsExchangeLabelElement) {
          settingsExchangeLabelElement.textContent = (selectedExchangeButton?.textContent || "").trim();
        }

        const settingsForExchange = exchangeApiSettings[activeSettingsExchangeKey] || {};
        if (settingsApiKeyElement) {
          settingsApiKeyElement.value = settingsForExchange.apiKey || "";
        }
        if (settingsApiSecretElement) {
          settingsApiSecretElement.value = settingsForExchange.apiSecret || "";
        }
        if (settingsApiPassphraseElement) {
          settingsApiPassphraseElement.value = settingsForExchange.passphrase || "";
        }

        if (settingsSaveStatusElement) {
          settingsSaveStatusElement.textContent = "";
        }

        applyCachedSettingsOptionsForExchange(activeSettingsExchangeKey);
        applyEnabledTimeframesToUI();
        applyEnabledQuoteCurrenciesToUI();
        applySettingsExchangeEditableState();
        loadSettingsOptionsForExchange(activeSettingsExchangeKey, {
          showUpdatingStatus: currentAppViewMode === "settings",
          updatingLabel: "exchange settings",
        });

        try {
          localStorage.setItem(settingsExchangeStorageKey, activeSettingsExchangeKey);
        } catch (_error) {
        }
      };

      const applySettingsExchangeEditableState = () => {
        const isSettingsExchangeEnabled = enabledExchangeKeys.has(activeSettingsExchangeKey);

        if (settingsApiKeyElement) {
          settingsApiKeyElement.disabled = !isSettingsExchangeEnabled;
        }
        if (settingsApiSecretElement) {
          settingsApiSecretElement.disabled = !isSettingsExchangeEnabled;
        }
        if (settingsApiPassphraseElement) {
          settingsApiPassphraseElement.disabled = !isSettingsExchangeEnabled;
        }
        if (settingsSaveButtonElement) {
          settingsSaveButtonElement.disabled = !isSettingsExchangeEnabled;
        }
        if (settingsToggleTimeframesButtonElement) {
          settingsToggleTimeframesButtonElement.disabled = !isSettingsExchangeEnabled;
        }
        if (settingsToggleQuoteCurrenciesButtonElement) {
          settingsToggleQuoteCurrenciesButtonElement.disabled = !isSettingsExchangeEnabled;
        }
        if (settingsTogglePairsButtonElement) {
          settingsTogglePairsButtonElement.disabled = !isSettingsExchangeEnabled;
        }

        if (settingsActionsElement) {
          settingsActionsElement.setAttribute("aria-disabled", isSettingsExchangeEnabled ? "false" : "true");
        }
        if (settingsExchangeTimeframesPanelElement) {
          settingsExchangeTimeframesPanelElement.setAttribute("aria-disabled", isSettingsExchangeEnabled ? "false" : "true");
        }
      };

      const syncSettingsExchangeWithCurrentExchange = () => {
        if (!validExchangeKeys.has(currentExchangeKey)) {
          return;
        }

        if (currentAppViewMode !== "settings") {
          activeSettingsExchangeKey = currentExchangeKey;
          try {
            localStorage.setItem(settingsExchangeStorageKey, activeSettingsExchangeKey);
          } catch (_error) {
          }
          return;
        }

        setSettingsExchangeTab(currentExchangeKey);
      };

      const persistEnabledExchanges = () => {
        try {
          localStorage.setItem(enabledExchangesStorageKey, JSON.stringify(Array.from(enabledExchangeKeys)));
        } catch (_error) {
        }
      };

      const getExchangeLabelByKey = (exchangeKey) => {
        const exchangeMenuItem = exchangeSelectorMenuItemElements.find((item) => item.dataset.exchange === exchangeKey);
        return (exchangeMenuItem?.dataset.exchangeLabel || exchangeMenuItem?.textContent || "").trim();
      };

      const sortSettingsExchangeRows = () => {
        if (!settingsExchangesListElement) {
          return;
        }

        const exchangeRows = Array.from(settingsExchangesListElement.querySelectorAll("[data-settings-exchange-row]"));
        exchangeRows.sort((leftRow, rightRow) => {
          const leftCheckbox = leftRow.querySelector("[data-settings-enabled-exchange]");
          const rightCheckbox = rightRow.querySelector("[data-settings-enabled-exchange]");
          const leftChecked = Boolean(leftCheckbox?.checked);
          const rightChecked = Boolean(rightCheckbox?.checked);

          if (leftChecked !== rightChecked) {
            return leftChecked ? -1 : 1;
          }

          const leftLabel = (leftRow.querySelector("[data-settings-exchange]")?.textContent || "").trim().toLowerCase();
          const rightLabel = (rightRow.querySelector("[data-settings-exchange]")?.textContent || "").trim().toLowerCase();
          return leftLabel.localeCompare(rightLabel);
        });

        exchangeRows.forEach((rowElement) => {
          settingsExchangesListElement.appendChild(rowElement);
        });
      };

      const parseTimeframeToMinutes = (timeframe) => {
        const value = String(timeframe || "").trim();
        const match = value.match(/^(\d+)([a-zA-Z]+)$/);
        if (!match) {
          return Number.POSITIVE_INFINITY;
        }

        const amount = Number.parseInt(match[1], 10);
        const originalUnit = match[2];
        if (!Number.isFinite(amount) || amount <= 0) {
          return Number.POSITIVE_INFINITY;
        }

        if (originalUnit === "m") {
          return amount;
        }
        if (originalUnit === "h") {
          return amount * 60;
        }
        if (originalUnit === "d") {
          return amount * 1440;
        }
        if (originalUnit === "w") {
          return amount * 10080;
        }
        if (originalUnit === "M" || originalUnit === "mo" || originalUnit === "mon") {
          return amount * 43200;
        }

        return Number.POSITIVE_INFINITY;
      };

      const sortSettingsOptionRows = (containerElement, checkboxSelector, options = {}) => {
        if (!containerElement) {
          return;
        }

        const prioritizeChecked = options.prioritizeChecked !== false;

        const getSortValue = typeof options.getSortValue === "function"
          ? options.getSortValue
          : (labelText) => String(labelText || "").trim().toLowerCase();

        const getTieBreakValue = typeof options.getTieBreakValue === "function"
          ? options.getTieBreakValue
          : (labelText) => String(labelText || "").trim().toLowerCase();

        const optionRows = Array.from(containerElement.querySelectorAll("label"));
        optionRows.sort((leftRow, rightRow) => {
          const leftCheckbox = leftRow.querySelector(checkboxSelector);
          const rightCheckbox = rightRow.querySelector(checkboxSelector);
          const leftChecked = Boolean(leftCheckbox?.checked);
          const rightChecked = Boolean(rightCheckbox?.checked);

          if (prioritizeChecked && leftChecked !== rightChecked) {
            return leftChecked ? -1 : 1;
          }

          const leftLabelRaw = (leftRow.querySelector("span")?.textContent || leftRow.textContent || "").trim();
          const rightLabelRaw = (rightRow.querySelector("span")?.textContent || rightRow.textContent || "").trim();
          const leftLabel = leftLabelRaw.toLowerCase();
          const rightLabel = rightLabelRaw.toLowerCase();
          const leftSortValue = getSortValue(leftLabelRaw, leftRow);
          const rightSortValue = getSortValue(rightLabelRaw, rightRow);

          const leftNumber = Number(leftSortValue);
          const rightNumber = Number(rightSortValue);
          const bothNumeric = Number.isFinite(leftNumber) && Number.isFinite(rightNumber);
          if (bothNumeric && leftNumber !== rightNumber) {
            return leftNumber - rightNumber;
          }

          if (String(leftSortValue) !== String(rightSortValue)) {
            return String(leftSortValue).localeCompare(String(rightSortValue));
          }

          const leftTieBreakValue = String(getTieBreakValue(leftLabelRaw, leftRow) || "").trim().toLowerCase();
          const rightTieBreakValue = String(getTieBreakValue(rightLabelRaw, rightRow) || "").trim().toLowerCase();
          if (leftTieBreakValue !== rightTieBreakValue) {
            return leftTieBreakValue.localeCompare(rightTieBreakValue);
          }

          return leftLabel.localeCompare(rightLabel);
        });

        optionRows.forEach((rowElement) => {
          containerElement.appendChild(rowElement);
        });
      };

      const applyEnabledExchangesToUI = () => {
        const previousExchangeKey = currentExchangeKey;

        exchangeSelectorMenuItemElements.forEach((button) => {
          const exchangeKey = button.dataset.exchange;
          button.hidden = !enabledExchangeKeys.has(exchangeKey);
        });

        settingsExchangeToggleElements.forEach((checkbox) => {
          checkbox.checked = enabledExchangeKeys.has(checkbox.dataset.settingsEnabledExchange);
        });
        sortSettingsExchangeRows();

        if (!enabledExchangeKeys.has(currentExchangeKey)) {
          const fallbackExchangeKey = Array.from(enabledExchangeKeys)[0] || currentExchangeKey;
          currentExchangeKey = fallbackExchangeKey;
          localStorage.setItem(exchangeStorageKey, currentExchangeKey);
          setPreferenceCookie("trade_wijs_exchange", currentExchangeKey);
        }

        if (currentExchangeKey !== previousExchangeKey) {
          enabledTimeframes = getEnabledTimeframesForExchange(currentExchangeKey);
          enabledQuoteCurrencies = getEnabledQuoteCurrenciesForExchange(currentExchangeKey);
          enabledPairs = getEnabledPairsForExchange(currentExchangeKey);
        }

        applyEnabledTimeframesToUI();
        applyEnabledQuoteCurrenciesToUI();

        if (exchangeSelectorButtonElement) {
          exchangeSelectorButtonElement.textContent = getExchangeLabelByKey(currentExchangeKey);
        }
        setActiveSelectorMenuItem(exchangeSelectorMenuElement, "data-exchange", currentExchangeKey);
        applySettingsExchangeEditableState();
      };

      const setEnabledExchanges = (exchangeKeys, options = {}) => {
        const nextEnabledExchangeKeys = new Set(
          (Array.isArray(exchangeKeys) ? exchangeKeys : []).filter((exchangeKey) => validExchangeKeys.has(exchangeKey)),
        );

        if (nextEnabledExchangeKeys.size === 0) {
          const fallbackExchangeKey = currentExchangeKey && validExchangeKeys.has(currentExchangeKey)
            ? currentExchangeKey
            : Array.from(validExchangeKeys)[0];
          if (fallbackExchangeKey) {
            nextEnabledExchangeKeys.add(fallbackExchangeKey);
          }
        }

        const previousExchangeKey = currentExchangeKey;
        enabledExchangeKeys = nextEnabledExchangeKeys;

        const pruneExchangeScopedState = (sourceObject) => {
          const pruned = {};
          Object.keys(sourceObject || {}).forEach((exchangeKey) => {
            if (enabledExchangeKeys.has(exchangeKey)) {
              pruned[exchangeKey] = sourceObject[exchangeKey];
            }
          });
          return pruned;
        };

        enabledTimeframesByExchange = pruneExchangeScopedState(enabledTimeframesByExchange);
        enabledQuoteCurrenciesByExchange = pruneExchangeScopedState(enabledQuoteCurrenciesByExchange);
        enabledPairsByExchange = pruneExchangeScopedState(enabledPairsByExchange);
        exchangeApiSettings = pruneExchangeScopedState(exchangeApiSettings);

        persistEnabledExchanges();
        persistEnabledTimeframes();
        persistEnabledQuoteCurrencies();
        persistEnabledPairs();
        try {
          localStorage.setItem(exchangeApiSettingsStorageKey, JSON.stringify(exchangeApiSettings));
        } catch (_error) {
        }

        applyEnabledExchangesToUI();

        if (currentExchangeKey !== previousExchangeKey && options.refresh !== false) {
          pendingRestoreLogicalRange = null;
          hasFitContent = false;
          setLoadingTimeframeButton(currentTimeframe);
          refreshChartData({ priority: true, showUpdatingStatus: true, updatingLabel: "exchanges" });
          scheduleNextRefresh();
        }
      };

      const persistEnabledTimeframes = () => {
        try {
          localStorage.setItem(enabledTimeframesStorageKey, JSON.stringify(enabledTimeframesByExchange));
        } catch (_error) {
        }
      };

      const persistEnabledQuoteCurrencies = () => {
        try {
          localStorage.setItem(enabledQuoteCurrenciesStorageKey, JSON.stringify(enabledQuoteCurrenciesByExchange));
        } catch (_error) {
        }
      };

      const applyEnabledTimeframesToUI = () => {
        const timeframeGroupElement = settingsExchangeTimeframesPanelElement?.querySelector("[aria-label='Timeframes options']") || null;

        timeframeButtonElements.forEach((button) => {
          const timeframe = button.dataset.timeframe;
          button.hidden = !enabledTimeframes.has(timeframe);
        });

        const activeSettingsTimeframes = getEnabledTimeframesForExchange(activeSettingsExchangeKey);
        const isSettingsExchangeEnabled = enabledExchangeKeys.has(activeSettingsExchangeKey);
        settingsTimeframeToggleElements.forEach((checkbox) => {
          const timeframe = checkbox.dataset.settingsEnabledTimeframe;
          const isEnabled = activeSettingsTimeframes.has(timeframe);
          checkbox.checked = isEnabled;
          checkbox.disabled = !isSettingsExchangeEnabled;
        });
        sortSettingsOptionRows(timeframeGroupElement, "[data-settings-enabled-timeframe]", {
          getSortValue: (timeframeLabel) => parseTimeframeToMinutes(timeframeLabel),
        });

        if (!enabledTimeframes.has(currentTimeframe)) {
          const fallbackTimeframe = Array.from(enabledTimeframes)[0];
          if (fallbackTimeframe) {
            currentTimeframe = fallbackTimeframe;
            localStorage.setItem(timeframeStorageKey, currentTimeframe);
            setPreferenceCookie("trade_wijs_timeframe", currentTimeframe);
          }
        }

        setActiveTimeframeButton(currentTimeframe);

        if (settingsToggleTimeframesButtonElement) {
          const areAllEnabled = validTimeframes.size > 0 && activeSettingsTimeframes.size === validTimeframes.size;
          settingsToggleTimeframesButtonElement.textContent = areAllEnabled ? "☑" : "☐";
          settingsToggleTimeframesButtonElement.setAttribute("aria-label", areAllEnabled ? "Disable all timeframes" : "Enable all timeframes");
          settingsToggleTimeframesButtonElement.title = areAllEnabled ? "Disable all timeframes" : "Enable all timeframes";
        }
      };

      const applyEnabledQuoteCurrenciesToUI = () => {
        const quoteCurrencyGroupElement = settingsExchangeTimeframesPanelElement?.querySelector("[aria-label='Quote currency options']") || null;

        const activeSettingsQuoteCurrencies = getEnabledQuoteCurrenciesForExchange(activeSettingsExchangeKey);
        const isSettingsExchangeEnabled = enabledExchangeKeys.has(activeSettingsExchangeKey);

        settingsQuoteCurrencyToggleElements.forEach((checkbox) => {
          const quoteCurrency = checkbox.dataset.settingsEnabledQuoteCurrency;
          const isEnabled = activeSettingsQuoteCurrencies.has(quoteCurrency);
          checkbox.checked = isEnabled;
          checkbox.disabled = !isSettingsExchangeEnabled;
        });
        sortSettingsOptionRows(quoteCurrencyGroupElement, "[data-settings-enabled-quote-currency]");

        if (settingsToggleQuoteCurrenciesButtonElement) {
          const areAllEnabled = validQuoteCurrencies.size > 0 && activeSettingsQuoteCurrencies.size === validQuoteCurrencies.size;
          settingsToggleQuoteCurrenciesButtonElement.textContent = areAllEnabled ? "☑" : "☐";
          settingsToggleQuoteCurrenciesButtonElement.setAttribute("aria-label", areAllEnabled ? "Disable all quote currencies" : "Enable all quote currencies");
          settingsToggleQuoteCurrenciesButtonElement.title = areAllEnabled ? "Disable all quote currencies" : "Enable all quote currencies";
        }

        renderSettingsPairsForExchange(activeSettingsExchangeKey);
        applyEnabledPairsToUI();
      };

      const setEnabledTimeframes = (timeframes, options = {}) => {
        const targetExchangeKey = validExchangeKeys.has(options.exchangeKey)
          ? options.exchangeKey
          : currentExchangeKey;
        const allowEmpty = options.allowEmpty === true;
        const nextEnabledTimeframes = new Set(
          (Array.isArray(timeframes) ? timeframes : []).filter((timeframe) => validTimeframes.has(timeframe)),
        );

        if (!allowEmpty && nextEnabledTimeframes.size === 0) {
          const fallbackTimeframe = targetExchangeKey === currentExchangeKey && currentTimeframe && validTimeframes.has(currentTimeframe)
            ? currentTimeframe
            : Array.from(validTimeframes)[0];
          if (fallbackTimeframe) {
            nextEnabledTimeframes.add(fallbackTimeframe);
          }
        }

        enabledTimeframesByExchange[targetExchangeKey] = Array.from(nextEnabledTimeframes);

        const previousTimeframe = currentTimeframe;
        if (targetExchangeKey === currentExchangeKey) {
          enabledTimeframes = nextEnabledTimeframes;
        }
        persistEnabledTimeframes();
        applyEnabledTimeframesToUI();

        if (targetExchangeKey === currentExchangeKey && currentTimeframe !== previousTimeframe && options.refresh !== false) {
          const savedView =
            savedChartViewByTimeframe[getChartViewKey(currentTimeframe)] ||
            savedChartViewByTimeframe[currentTimeframe];
          if (
            savedView &&
            Number.isFinite(Number(savedView.from)) &&
            Number.isFinite(Number(savedView.to))
          ) {
            pendingRestoreLogicalRange = {
              from: Number(savedView.from),
              to: Number(savedView.to),
            };
          } else {
            pendingRestoreLogicalRange = null;
            hasFitContent = false;
          }

          setLoadingTimeframeButton(currentTimeframe);
          refreshChartData({ priority: true, showUpdatingStatus: true, updatingLabel: "timeframes" });
          scheduleNextRefresh();
        }
      };

      const toggleAllTimeframesForActiveExchange = () => {
        if (!validTimeframes.size) {
          return;
        }

        const currentEnabledTimeframes = getEnabledTimeframesForExchange(activeSettingsExchangeKey);
        const areAllEnabled = currentEnabledTimeframes.size === validTimeframes.size;
        const nextSelection = areAllEnabled
          ? (validTimeframes.has("1m") ? ["1m"] : [Array.from(validTimeframes)[0]])
          : Array.from(validTimeframes);
        setEnabledTimeframes(nextSelection, { exchangeKey: activeSettingsExchangeKey });
      };

      const setEnabledQuoteCurrencies = (quoteCurrencies, options = {}) => {
        const targetExchangeKey = validExchangeKeys.has(options.exchangeKey)
          ? options.exchangeKey
          : currentExchangeKey;
        const allowEmpty = options.allowEmpty === true;
        const nextEnabledQuoteCurrencies = new Set(
          (Array.isArray(quoteCurrencies) ? quoteCurrencies : []).filter((quoteCurrency) => validQuoteCurrencies.has(quoteCurrency)),
        );

        if (!allowEmpty && nextEnabledQuoteCurrencies.size === 0) {
          const fallbackQuoteCurrency = Array.from(validQuoteCurrencies)[0];
          if (fallbackQuoteCurrency) {
            nextEnabledQuoteCurrencies.add(fallbackQuoteCurrency);
          }
        }

        enabledQuoteCurrenciesByExchange[targetExchangeKey] = Array.from(nextEnabledQuoteCurrencies);

        const filteredPairSymbols = getFilteredPairOptionsForExchange(targetExchangeKey)
          .map((item) => item.symbol)
          .filter(Boolean);
        const filteredPairSymbolSet = new Set(filteredPairSymbols);
        const previouslyEnabledPairs = getEnabledPairsForExchange(targetExchangeKey);
        const nextEnabledPairs = new Set(
          Array.from(previouslyEnabledPairs).filter((symbol) => filteredPairSymbolSet.has(symbol)),
        );

        if (nextEnabledPairs.size === 0 && filteredPairSymbols.length > 0) {
          const fallbackPair = getDefaultEnabledPairForExchange(targetExchangeKey, filteredPairSymbols);
          if (fallbackPair) {
            nextEnabledPairs.add(fallbackPair);
          }
        }

        enabledPairsByExchange[targetExchangeKey] = Array.from(nextEnabledPairs);

        let didChangeCurrentSymbol = false;
        if (targetExchangeKey === currentExchangeKey) {
          enabledQuoteCurrencies = nextEnabledQuoteCurrencies;
          enabledPairs = nextEnabledPairs;
          didChangeCurrentSymbol = applyPairSelectorQuoteCurrencyFilter();
        }

        persistEnabledQuoteCurrencies();
        persistEnabledPairs();
        applyEnabledQuoteCurrenciesToUI();

        if (
          targetExchangeKey === activeSettingsExchangeKey
          && currentAppViewMode === "settings"
          && !didChangeCurrentSymbol
        ) {
          loadSettingsOptionsForExchange(targetExchangeKey, {
            forceReload: true,
            showUpdatingStatus: true,
            updatingLabel: "24h volumes",
          });
        }

        if (targetExchangeKey === currentExchangeKey && didChangeCurrentSymbol && options.refresh !== false) {
          pendingRestoreLogicalRange = null;
          hasFitContent = false;
          setLoadingTimeframeButton(currentTimeframe);
          refreshChartData({ priority: true, showUpdatingStatus: true, updatingLabel: "quote currencies" });
          scheduleNextRefresh();
        }
      };

      const toggleAllQuoteCurrenciesForActiveExchange = () => {
        if (!validQuoteCurrencies.size) {
          return;
        }

        const currentEnabledQuoteCurrencies = getEnabledQuoteCurrenciesForExchange(activeSettingsExchangeKey);
        const areAllEnabled = currentEnabledQuoteCurrencies.size === validQuoteCurrencies.size;
        const nextSelection = areAllEnabled
          ? (validQuoteCurrencies.has("USDT") ? ["USDT"] : [Array.from(validQuoteCurrencies)[0]])
          : Array.from(validQuoteCurrencies);
        setEnabledQuoteCurrencies(nextSelection, { exchangeKey: activeSettingsExchangeKey });
      };

      const persistEnabledIndicators = () => {
        try {
          localStorage.setItem(enabledIndicatorsStorageKey, JSON.stringify(Array.from(enabledIndicators)));
        } catch (_error) {
        }
      };

      const persistEnabledTools = () => {
        try {
          localStorage.setItem(enabledToolsStorageKey, JSON.stringify(Array.from(enabledTools)));
        } catch (_error) {
        }
      };

      const applyEnabledIndicatorsToUI = () => {
        let shouldRedraw = false;

        indicatorButtonElements.forEach((button) => {
          const indicatorName = button.dataset.indicator;
          const isEnabled = enabledIndicators.has(indicatorName);
          button.hidden = !isEnabled;

          if (!isEnabled && indicatorState[indicatorName]) {
            indicatorState[indicatorName] = false;
            shouldRedraw = true;
          }
        });

        const enabledIndicatorCount = enabledIndicators.size;
        settingsIndicatorToggleElements.forEach((checkbox) => {
          const indicatorName = checkbox.dataset.settingsEnabledIndicator;
          const isEnabled = enabledIndicators.has(indicatorName);
          checkbox.checked = isEnabled;
          checkbox.disabled = isEnabled && enabledIndicatorCount === 1;
        });

        setIndicatorButtonState();
        if (shouldRedraw) {
          redrawChart();
          applyChartSplit();
          updateScaleDividerLabel(false);
          updateStochDividerLabel(false);
          updateRsiDividerLabel(false);
        }
      };

      const setEnabledIndicators = (indicators) => {
        const nextEnabledIndicators = new Set(
          (Array.isArray(indicators) ? indicators : []).filter((indicatorName) => validIndicators.has(indicatorName)),
        );

        if (nextEnabledIndicators.size === 0) {
          const fallbackIndicatorName = Array.from(validIndicators)[0];
          if (fallbackIndicatorName) {
            nextEnabledIndicators.add(fallbackIndicatorName);
          }
        }

        enabledIndicators = nextEnabledIndicators;
        persistEnabledIndicators();
        applyEnabledIndicatorsToUI();
      };

      const applyEnabledToolsToUI = () => {
        const toolButtonByName = {
          "horizontal-line": drawLineButtonElement,
          "trend-line": trendLineButtonElement,
        };

        Object.keys(toolButtonByName).forEach((toolName) => {
          const buttonElement = toolButtonByName[toolName];
          if (!buttonElement) {
            return;
          }

          const isEnabled = enabledTools.has(toolName);
          buttonElement.classList.toggle("is-hidden-by-settings", !isEnabled);
        });

        const enabledToolCount = enabledTools.size;
        settingsToolToggleElements.forEach((checkbox) => {
          const toolName = checkbox.dataset.settingsEnabledTool;
          const isEnabled = enabledTools.has(toolName);
          checkbox.checked = isEnabled;
          checkbox.disabled = isEnabled && enabledToolCount === 1;
        });

        const activeToolName = activeDrawTool === "trend" ? "trend-line" : "horizontal-line";
        if (drawLineMode && !enabledTools.has(activeToolName)) {
          setDrawLineMode(false);
          setRefreshStatus("Live", "is-live");
        }
      };

      const setEnabledTools = (tools) => {
        const nextEnabledTools = new Set(
          (Array.isArray(tools) ? tools : []).filter((toolName) => validTools.has(toolName)),
        );

        if (nextEnabledTools.size === 0) {
          const fallbackTool = Array.from(validTools)[0];
          if (fallbackTool) {
            nextEnabledTools.add(fallbackTool);
          }
        }

        enabledTools = nextEnabledTools;
        persistEnabledTools();
        applyEnabledToolsToUI();
      };

      const setSettingsCategory = (category) => {
        activeSettingsCategory = category === "general" ? "general" : "exchanges";

        settingsCategoryTabElements.forEach((button) => {
          const isActive = button.dataset.settingsCategory === activeSettingsCategory;
          button.classList.toggle("is-active", isActive);
          if (isActive) {
            button.setAttribute("aria-current", "page");
          } else {
            button.removeAttribute("aria-current");
          }
        });

        settingsCategorySectionElements.forEach((section) => {
          const isActive = section.dataset.settingsCategorySection === activeSettingsCategory;
          section.classList.toggle("is-active", isActive);
        });

        settingsMiddleSectionElements.forEach((section) => {
          const isActive = section.dataset.settingsMiddleSection === activeSettingsCategory;
          section.classList.toggle("is-active", isActive);
        });

        const isExchangesCategory = activeSettingsCategory === "exchanges";
        if (settingsActionsElement) {
          settingsActionsElement.style.display = isExchangesCategory ? "inline-flex" : "none";
        }
        if (settingsExchangeTimeframesPanelElement) {
          settingsExchangeTimeframesPanelElement.style.display = isExchangesCategory ? "block" : "none";
        }
        if (settingsExchangeLabelElement) {
          settingsExchangeLabelElement.style.display = isExchangesCategory ? "block" : "none";
        }
        if (settingsSaveStatusElement) {
          settingsSaveStatusElement.textContent = "";
        }

        try {
          localStorage.setItem(settingsCategoryStorageKey, activeSettingsCategory);
        } catch (_error) {
        }
      };

      const setSettingsGeneralItem = (item) => {
        if (item === "display") {
          activeSettingsGeneralItem = "display";
        } else if (item === "tools") {
          activeSettingsGeneralItem = "tools";
        } else if (item === "factory-reset") {
          activeSettingsGeneralItem = "factory-reset";
        } else {
          activeSettingsGeneralItem = "indicators";
        }

        settingsGeneralItemTabElements.forEach((button) => {
          const isActive = button.dataset.settingsGeneralItem === activeSettingsGeneralItem;
          button.classList.toggle("is-active", isActive);
          if (isActive) {
            button.setAttribute("aria-current", "page");
          } else {
            button.removeAttribute("aria-current");
          }
        });

        settingsGeneralSectionElements.forEach((section) => {
          const isActive = section.dataset.settingsGeneralSection === activeSettingsGeneralItem;
          section.classList.toggle("is-active", isActive);
        });

        if (settingsSaveStatusElement) {
          settingsSaveStatusElement.textContent = "";
        }

        try {
          localStorage.setItem(settingsGeneralItemStorageKey, activeSettingsGeneralItem);
        } catch (_error) {
        }
      };

      const applyDisplayTheme = (theme, options = {}) => {
        const nextTheme = theme === "light" ? "light" : "dark";
        const shouldPersist = options.persist !== false;
        activeDisplayTheme = nextTheme;

        document.documentElement.dataset.theme = nextTheme;
        chartThemeColors = getChartThemeColors();

        chart.applyOptions({
          layout: {
            background: { color: chartThemeColors.background },
            textColor: chartThemeColors.text,
          },
          rightPriceScale: {
            borderColor: chartThemeColors.border,
          },
          timeScale: {
            borderColor: chartThemeColors.border,
          },
        });

        chart.priceScale("price").applyOptions({ borderColor: chartThemeColors.border });
        chart.priceScale("volume").applyOptions({ borderColor: chartThemeColors.border });
        chart.priceScale("stoch").applyOptions({ borderColor: chartThemeColors.border });
        chart.priceScale("rsi").applyOptions({ borderColor: chartThemeColors.border });
        applyChartSplit();

        settingsDisplayThemeRadioElements.forEach((radioElement) => {
          radioElement.checked = radioElement.value === nextTheme;
        });

        if (shouldPersist) {
          try {
            localStorage.setItem(displayThemeStorageKey, nextTheme);
          } catch (_error) {
          }
        }
      };

      const setRightPanelCollapsed = (collapsed) => {
        isRightPanelCollapsed = collapsed;

        if (appShellElement) {
          appShellElement.classList.toggle("is-right-panel-collapsed", isRightPanelCollapsed);
        }

        if (rightPanelToggleButtonElement) {
          rightPanelToggleButtonElement.setAttribute("aria-expanded", isRightPanelCollapsed ? "false" : "true");
          rightPanelToggleButtonElement.setAttribute(
            "aria-label",
            isRightPanelCollapsed ? "Expand right panel" : "Collapse right panel",
          );
        }

        try {
          localStorage.setItem(rightPanelCollapseStorageKey, String(isRightPanelCollapsed));
        } catch (_error) {
        }

        renderChartViewport();
      };

      const setMarketInfoCollapsed = (collapsed) => {
        isMarketInfoCollapsed = collapsed;

        if (marketInfoSectionElement) {
          marketInfoSectionElement.classList.toggle("is-collapsed", isMarketInfoCollapsed);
        }

        if (marketInfoToggleButtonElement) {
          marketInfoToggleButtonElement.setAttribute("aria-expanded", isMarketInfoCollapsed ? "false" : "true");
          marketInfoToggleButtonElement.setAttribute(
            "aria-label",
            isMarketInfoCollapsed ? "Expand info panel" : "Collapse info panel",
          );
        }

        const showError = !isMarketInfoCollapsed && marketInfoHasError;
        const showGrid = !isMarketInfoCollapsed;

        if (marketErrorElement) {
          marketErrorElement.style.display = showError ? "block" : "none";
        }

        if (marketInfoGridElement) {
          marketInfoGridElement.style.display = showGrid ? "grid" : "none";
        }

        if (marketUpdatedElement) {
          marketUpdatedElement.style.display = showGrid ? "block" : "none";
        }

        try {
          localStorage.setItem(marketInfoCollapseStorageKey, String(isMarketInfoCollapsed));
        } catch (_error) {
        }
      };

      const getNextRefreshDelayMs = (timeframe) => {
        const timeframeSeconds = getTimeframeDurationSeconds(timeframe);
        const estimatedServerNowSeconds = getEstimatedServerNowSeconds();
        const currentBucketOpenTime = Math.floor(estimatedServerNowSeconds / timeframeSeconds) * timeframeSeconds;
        const nextBucketOpenTime = currentBucketOpenTime + timeframeSeconds;
        const secondsUntilNextBucket = Math.max(1, nextBucketOpenTime - estimatedServerNowSeconds);
        const boundaryDelayMs = (secondsUntilNextBucket * 1000) + 250;
        const safetyDelayMs = timeframeSeconds <= 300 ? 15000 : 60000;

        return Math.max(1000, Math.min(boundaryDelayMs, safetyDelayMs));
      };

      const scheduleNextRefresh = () => {
        if (refreshTimerId) {
          clearTimeout(refreshTimerId);
        }

        refreshTimerId = setTimeout(async () => {
          await refreshChartData();
          scheduleNextRefresh();
        }, getNextRefreshDelayMs(currentTimeframe));
      };

      const queuePriorityRefresh = (options = {}) => {
        pendingPriorityRefresh = true;
        if (options.showUpdatingStatus === true) {
          pendingPriorityRefreshShowUpdating = true;
          pendingPriorityRefreshLabel = options.updatingLabel || pendingPriorityRefreshLabel;
        }
      };

      const flushPendingPriorityRefresh = () => {
        if (!pendingPriorityRefresh) {
          return;
        }

        const showUpdatingStatus = pendingPriorityRefreshShowUpdating;
        const updatingLabel = pendingPriorityRefreshLabel;
        pendingPriorityRefresh = false;
        pendingPriorityRefreshShowUpdating = false;
        pendingPriorityRefreshLabel = null;
        refreshChartData({
          priority: true,
          showUpdatingStatus,
          updatingLabel,
        });
      };

      const setLoadingTimeframeButton = (timeframe) => {
        loadingTimeframe = timeframe;
        timeframeButtonElements.forEach((button) => {
          button.classList.toggle("is-loading", timeframe !== null && button.dataset.timeframe === timeframe);
        });
      };

      const toChartData = (candles) =>
        candles.map((candle) => ({
          time: Number(candle.time),
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        }));

      const calculateBollingerBands = (seriesData, period = 20, multiplier = 2) => {
        const upper = [];
        const middle = [];
        const lower = [];
        const closes = seriesData.map((point) => Number(point.close));

        for (let index = period - 1; index < seriesData.length; index += 1) {
          const windowStart = index - period + 1;
          const windowValues = closes.slice(windowStart, index + 1);
          const mean = windowValues.reduce((sum, value) => sum + value, 0) / period;
          const variance = windowValues.reduce((sum, value) => {
            const delta = value - mean;
            return sum + delta * delta;
          }, 0) / period;
          const stdDev = Math.sqrt(variance);
          const time = seriesData[index].time;

          middle.push({ time, value: mean });
          upper.push({ time, value: mean + multiplier * stdDev });
          lower.push({ time, value: mean - multiplier * stdDev });
        }

        return { upper, middle, lower };
      };

      const calculateVolume = (sourceCandles) =>
        sourceCandles.map((candle) => ({
          time: Number(candle.time),
          value: Number(candle.volume || 0),
          color:
            Number(candle.close) >= Number(candle.open)
              ? "rgba(41, 179, 125, 0.55)"
              : "rgba(207, 95, 107, 0.55)",
        }));

      const calculateStochastic = (seriesData, kPeriod = 14, kSmoothing = 3, dPeriod = 3) => {
        if (seriesData.length < kPeriod) {
          return { k: [], d: [] };
        }

        const rawK = [];

        for (let index = kPeriod - 1; index < seriesData.length; index += 1) {
          const window = seriesData.slice(index - kPeriod + 1, index + 1);
          const highestHigh = window.reduce((maxValue, point) => Math.max(maxValue, Number(point.high)), Number.NEGATIVE_INFINITY);
          const lowestLow = window.reduce((minValue, point) => Math.min(minValue, Number(point.low)), Number.POSITIVE_INFINITY);
          const closeValue = Number(seriesData[index].close);
          const range = highestHigh - lowestLow;
          const stochasticKRaw = range === 0 ? 50 : ((closeValue - lowestLow) / range) * 100;
          const stochasticK = clamp(stochasticKRaw, 0, 100);

          rawK.push({
            time: Number(seriesData[index].time),
            value: stochasticK,
          });
        }

        const smoothSeries = (source, period) => {
          const output = [];
          let rollingSum = 0;

          for (let index = 0; index < source.length; index += 1) {
            rollingSum += source[index].value;
            if (index >= period) {
              rollingSum -= source[index - period].value;
            }
            if (index >= period - 1) {
              output.push({
                time: source[index].time,
                value: rollingSum / period,
              });
            }
          }

          return output;
        };

        const kLine = smoothSeries(rawK, kSmoothing);
        const dLine = smoothSeries(kLine, dPeriod);
        return { k: kLine, d: dLine };
      };

      const calculateRsi = (seriesData, period = 14) => {
        if (seriesData.length <= period) {
          return [];
        }

        const closes = seriesData.map((point) => Number(point.close));
        let gainSum = 0;
        let lossSum = 0;

        for (let index = 1; index <= period; index += 1) {
          const delta = closes[index] - closes[index - 1];
          if (delta >= 0) {
            gainSum += delta;
          } else {
            lossSum += Math.abs(delta);
          }
        }

        let averageGain = gainSum / period;
        let averageLoss = lossSum / period;
        const rsiSeriesData = [];

        const computeRsiValue = () => {
          if (averageLoss === 0) {
            return 100;
          }

          const relativeStrength = averageGain / averageLoss;
          return 100 - 100 / (1 + relativeStrength);
        };

        rsiSeriesData.push({
          time: seriesData[period].time,
          value: computeRsiValue(),
        });

        for (let index = period + 1; index < seriesData.length; index += 1) {
          const delta = closes[index] - closes[index - 1];
          const gain = Math.max(delta, 0);
          const loss = Math.max(-delta, 0);

          averageGain = ((averageGain * (period - 1)) + gain) / period;
          averageLoss = ((averageLoss * (period - 1)) + loss) / period;

          rsiSeriesData.push({
            time: seriesData[index].time,
            value: computeRsiValue(),
          });
        }

        return rsiSeriesData;
      };

      const calculateSmcSignals = (seriesData, swingLookback = 2) => {
        if (seriesData.length < swingLookback * 2 + 1) {
          return { dashed: [], solid: [], zones: [], labels: [] };
        }

        const smcMaxZoneCandles = 200;

        const candleTouchesZone = (candle, lower, upper) => {
          const values = [candle.open, candle.close, candle.high, candle.low].map((value) => Number(value));
          return values.some((value) => Number.isFinite(value) && value >= lower && value <= upper);
        };

        const resolveSmcZoneEndIndex = (zoneStartIndex, lower, upper) => {
          const maxEndIndex = Math.min(seriesData.length - 1, zoneStartIndex + smcMaxZoneCandles - 1);
          const firstTouchCheckIndex = Math.min(maxEndIndex, zoneStartIndex + 3);

          for (let index = firstTouchCheckIndex; index <= maxEndIndex; index += 1) {
            if (candleTouchesZone(seriesData[index], lower, upper)) {
              return index;
            }
          }

          return maxEndIndex;
        };

        const swingHighs = [];
        const swingLows = [];

        for (let index = swingLookback; index < seriesData.length - swingLookback; index += 1) {
          const point = seriesData[index];
          const high = Number(point.high);
          const low = Number(point.low);

          let isSwingHigh = true;
          let isSwingLow = true;

          for (let offset = 1; offset <= swingLookback; offset += 1) {
            const left = seriesData[index - offset];
            const right = seriesData[index + offset];

            if (high < Number(left.high) || high <= Number(right.high)) {
              isSwingHigh = false;
            }

            if (low > Number(left.low) || low >= Number(right.low)) {
              isSwingLow = false;
            }
          }

          if (isSwingHigh) {
            swingHighs.push({ index, price: high });
          }

          if (isSwingLow) {
            swingLows.push({ index, price: low });
          }
        }

        let highPointer = 0;
        let lowPointer = 0;
        let activeSwingHigh = null;
        let activeSwingLow = null;
        let lastBrokenHighIndex = -1;
        let lastBrokenLowIndex = -1;
        let structureBias = null;

        const dashed = [];
        const solid = [];
        const zones = [];
        const labels = [];

        const findOrderBlockCandle = (fromIndex, direction, lookback = 8) => {
          const minIndex = Math.max(0, fromIndex - lookback);
          for (let index = fromIndex; index >= minIndex; index -= 1) {
            const candle = seriesData[index];
            const open = Number(candle.open);
            const close = Number(candle.close);
            const isBearish = close < open;
            const isBullish = close > open;

            if (direction === "bullish" && isBearish) {
              return { index, candle };
            }

            if (direction === "bearish" && isBullish) {
              return { index, candle };
            }
          }

          return null;
        };

        for (let index = 0; index < seriesData.length; index += 1) {
          while (highPointer < swingHighs.length && swingHighs[highPointer].index < index) {
            activeSwingHigh = swingHighs[highPointer];
            highPointer += 1;
          }

          while (lowPointer < swingLows.length && swingLows[lowPointer].index < index) {
            activeSwingLow = swingLows[lowPointer];
            lowPointer += 1;
          }

          const candle = seriesData[index];
          const close = Number(candle.close);

          if (activeSwingHigh && close > activeSwingHigh.price && activeSwingHigh.index !== lastBrokenHighIndex) {
            const isChoch = structureBias === "bearish";
            const swingTime = seriesData[activeSwingHigh.index].time;
            const structureText = isChoch ? "CHoCH" : "BOS";
            const structureColor = isChoch ? "#a78bfa" : "#5fa8ff";

            dashed.push({
              startTime: swingTime,
              endTime: candle.time,
              price: activeSwingHigh.price,
              color: "rgba(95, 168, 255, 0.65)",
            });

            solid.push({
              startTime: swingTime,
              endTime: candle.time,
              price: activeSwingHigh.price,
              color: structureColor,
            });

            labels.push({
              startTime: swingTime,
              endTime: candle.time,
              price: activeSwingHigh.price,
              text: structureText,
              color: structureColor,
            });

            const orderBlock = findOrderBlockCandle(index - 1, "bullish");
            if (orderBlock) {
              const firstCandle = seriesData[orderBlock.index];
              const secondCandle = seriesData[Math.min(seriesData.length - 1, orderBlock.index + 1)];
              const obOpen = Number(orderBlock.candle.open);
              const obClose = Number(orderBlock.candle.close);
              const zoneUpper = Math.max(obOpen, obClose);
              const zoneLower = Math.min(Number(firstCandle.low), Number(secondCandle.low));
              const zoneEndIndex = resolveSmcZoneEndIndex(orderBlock.index, zoneLower, zoneUpper);
              zones.push({
                isBullish: true,
                startTime: Number(orderBlock.candle.time),
                endTime: Number(seriesData[zoneEndIndex].time),
                upper: zoneUpper,
                lower: zoneLower,
              });
            }

            structureBias = "bullish";
            lastBrokenHighIndex = activeSwingHigh.index;
          }

          if (activeSwingLow && close < activeSwingLow.price && activeSwingLow.index !== lastBrokenLowIndex) {
            const isChoch = structureBias === "bullish";
            const swingTime = seriesData[activeSwingLow.index].time;
            const structureText = isChoch ? "CHoCH" : "BOS";
            const structureColor = isChoch ? "#a78bfa" : "#cf5f6b";

            dashed.push({
              startTime: swingTime,
              endTime: candle.time,
              price: activeSwingLow.price,
              color: "rgba(207, 95, 107, 0.65)",
            });

            solid.push({
              startTime: swingTime,
              endTime: candle.time,
              price: activeSwingLow.price,
              color: structureColor,
            });

            labels.push({
              startTime: swingTime,
              endTime: candle.time,
              price: activeSwingLow.price,
              text: structureText,
              color: structureColor,
            });

            const orderBlock = findOrderBlockCandle(index - 1, "bearish");
            if (orderBlock) {
              const firstCandle = seriesData[orderBlock.index];
              const secondCandle = seriesData[Math.min(seriesData.length - 1, orderBlock.index + 1)];
              const obOpen = Number(orderBlock.candle.open);
              const obClose = Number(orderBlock.candle.close);
              const zoneUpper = Math.max(Number(firstCandle.high), Number(secondCandle.high));
              const zoneLower = Math.min(obOpen, obClose);
              const zoneEndIndex = resolveSmcZoneEndIndex(orderBlock.index, zoneLower, zoneUpper);
              zones.push({
                isBullish: false,
                startTime: Number(orderBlock.candle.time),
                endTime: Number(seriesData[zoneEndIndex].time),
                upper: zoneUpper,
                lower: zoneLower,
              });
            }

            structureBias = "bearish";
            lastBrokenLowIndex = activeSwingLow.index;
          }
        }

        return {
          dashed: dashed.slice(-40),
          solid: solid.slice(-40),
          zones: zones.slice(-30),
          labels: labels.slice(-40),
        };
      };

      const buildFvgZones = (seriesData, maxZones = 30) => {
        const zones = [];

        const candleTouchesZone = (candle, lower, upper) => {
          const values = [candle.open, candle.close, candle.high, candle.low].map((value) => Number(value));
          return values.some((value) => Number.isFinite(value) && value >= lower && value <= upper);
        };

        const resolveFvgEndIndex = (startIndex, creatorIndex, lower, upper) => {
          const firstCheckIndex = creatorIndex + 1;
          const maxEndIndex = Math.min(seriesData.length - 1, creatorIndex + fvgDisplayLengthCandles);

          for (let index = firstCheckIndex; index <= maxEndIndex; index += 1) {
            if (candleTouchesZone(seriesData[index], lower, upper)) {
              return index;
            }
          }

          return maxEndIndex;
        };

        for (let index = 2; index < seriesData.length; index += 1) {
          const current = seriesData[index];
          const twoBack = seriesData[index - 2];

          if (current.low > twoBack.high) {
            const lower = Number(twoBack.high);
            const upper = Number(current.low);
            const gapPercent = lower > 0 ? ((upper - lower) / lower) * 100 : 0;
            if (gapPercent < fvgMinGapPercent) {
              continue;
            }
            const startIndex = index - 1;
            const endIndex = resolveFvgEndIndex(startIndex, index, lower, upper);

            zones.push({
              isBullish: true,
              startTime: Number(seriesData[startIndex].time),
              endTime: Number(seriesData[endIndex].time),
              upper,
              lower,
            });
            continue;
          }

          if (current.high < twoBack.low) {
            const lower = Number(current.high);
            const upper = Number(twoBack.low);
            const gapPercent = lower > 0 ? ((upper - lower) / lower) * 100 : 0;
            if (gapPercent < fvgMinGapPercent) {
              continue;
            }
            const startIndex = index - 1;
            const endIndex = resolveFvgEndIndex(startIndex, index, lower, upper);

            zones.push({
              isBullish: false,
              startTime: Number(seriesData[startIndex].time),
              endTime: Number(seriesData[endIndex].time),
              upper,
              lower,
            });
          }
        }

        return zones.slice(-maxZones);
      };

      const renderFvgZones = (seriesData) => {
        clearFvgZoneSeries();

        if (!indicatorState.fvg || seriesData.length < 3) {
          return;
        }

        const zones = buildFvgZones(seriesData);
        currentFvgZones = zones;

        zones.forEach((zone) => {
          const zoneColor = zone.isBullish ? "rgba(41, 179, 125, 0.3)" : "rgba(207, 95, 107, 0.3)";

          const upperSeries = chart.addSeries(LightweightCharts.LineSeries, {
            priceScaleId: "price",
            color: zoneColor,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });

          const lowerSeries = chart.addSeries(LightweightCharts.LineSeries, {
            priceScaleId: "price",
            color: zoneColor,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });

          upperSeries.setData([
            { time: zone.startTime, value: zone.upper },
            { time: zone.endTime, value: zone.upper },
          ]);

          lowerSeries.setData([
            { time: zone.startTime, value: zone.lower },
            { time: zone.endTime, value: zone.lower },
          ]);

          fvgZoneSeries.push({ upperSeries, lowerSeries });
        });

        renderFvgOverlay();
      };

      const getNearestCandleTime = (xCoordinate) => {
        if (!chartData.length) {
          return null;
        }

        const logical = chart.timeScale().coordinateToLogical(xCoordinate);
        if (logical === null) {
          return chartData[chartData.length - 1].time;
        }

        const index = Math.max(0, Math.min(chartData.length - 1, Math.round(logical)));
        return chartData[index].time;
      };

      const resolveFallbackPriceFromNearestCandle = (xCoordinate) => {
        if (!chartData.length) {
          return null;
        }

        const nearestTime = getNearestCandleTime(xCoordinate);
        if (!nearestTime) {
          return null;
        }

        const nearestBar = chartData.find((bar) => Number(bar.time) === Number(nearestTime));
        if (!nearestBar) {
          return null;
        }

        const fallbackPrice = Number(nearestBar.close);
        return Number.isFinite(fallbackPrice) && fallbackPrice > 0 ? fallbackPrice : null;
      };

      const resolveCandlePaneBoundsPx = () => {
        if (!chartCanvas) {
          return null;
        }

        const candleSegment = renderedPaneLayout.candle || paneLayout.candle;
        if (!candleSegment) {
          return null;
        }

        const canvasHeight = Number(chartCanvas.clientHeight || 0);
        if (!Number.isFinite(canvasHeight) || canvasHeight <= 0) {
          return null;
        }

        const timeScaleApi = chart.timeScale();
        const timeScaleHeightPx =
          timeScaleApi && typeof timeScaleApi.height === "function"
            ? Math.max(0, Number(timeScaleApi.height()) || 0)
            : 0;
        const drawableHeightPx = Math.max(0, canvasHeight - timeScaleHeightPx);
        const topPx = Number(candleSegment.top) * drawableHeightPx;
        const bottomPx = Number(candleSegment.bottom) * drawableHeightPx;

        if (!Number.isFinite(topPx) || !Number.isFinite(bottomPx) || bottomPx <= topPx) {
          return null;
        }

        return {
          top: topPx,
          bottom: bottomPx,
        };
      };

      const isYCoordinateInCandlePane = (yCoordinate) => {
        const numericY = Number(yCoordinate);
        if (!Number.isFinite(numericY)) {
          return false;
        }

        const candlePaneBounds = resolveCandlePaneBoundsPx();
        if (!candlePaneBounds) {
          return true;
        }

        return numericY >= candlePaneBounds.top && numericY <= candlePaneBounds.bottom;
      };

      const isHorizontalLineInCandlePane = (lineEntry) => {
        if (!lineEntry || lineEntry.removed) {
          return false;
        }

        const linePrice = Number(lineEntry.price);
        if (!Number.isFinite(linePrice) || linePrice <= 0) {
          return false;
        }

        const yCoordinate = candleSeries.priceToCoordinate(linePrice);
        return isYCoordinateInCandlePane(yCoordinate);
      };

      const resolveScreenPointFromCanvasClick = (event) => {
        if (!chartCanvas) {
          return null;
        }

        const canvasRect = chartCanvas.getBoundingClientRect();
        const xCoordinate = Number(event.clientX - canvasRect.left);
        const yCoordinate = Number(event.clientY - canvasRect.top);

        if (!Number.isFinite(xCoordinate) || !Number.isFinite(yCoordinate)) {
          return null;
        }

        if (xCoordinate < 0 || yCoordinate < 0 || xCoordinate > canvasRect.width || yCoordinate > canvasRect.height) {
          return null;
        }

        if (!isYCoordinateInCandlePane(yCoordinate)) {
          return null;
        }

        const price = candleSeries.coordinateToPrice(yCoordinate);
        let normalizedPrice = Number(price);

        const chartHigh = chartData.length ? Math.max(...chartData.map((bar) => Number(bar.high))) : NaN;
        const chartLow = chartData.length ? Math.min(...chartData.map((bar) => Number(bar.low))) : NaN;
        const looksOutOfRange =
          Number.isFinite(chartLow) && Number.isFinite(chartHigh) &&
          (normalizedPrice < chartLow * 0.5 || normalizedPrice > chartHigh * 1.5);

        if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0 || looksOutOfRange) {
          const fallbackPrice = resolveFallbackPriceFromNearestCandle(xCoordinate);
          if (!Number.isFinite(fallbackPrice)) {
            return null;
          }
          normalizedPrice = Number(fallbackPrice);
        }

        return {
          xCoordinate,
          yCoordinate,
          price: normalizedPrice,
        };
      };

      const ensureDrawCaptureOverlayElement = () => {
        if (drawCaptureOverlayElement || !chartCanvas) {
          return drawCaptureOverlayElement;
        }

        drawCaptureOverlayElement = document.createElement("div");
        drawCaptureOverlayElement.id = "draw-capture-overlay";
        drawCaptureOverlayElement.style.position = "absolute";
        drawCaptureOverlayElement.style.inset = "0";
        drawCaptureOverlayElement.style.zIndex = "9";
        drawCaptureOverlayElement.style.display = "none";
        drawCaptureOverlayElement.style.pointerEvents = "none";
        drawCaptureOverlayElement.style.cursor = "crosshair";
        drawCaptureOverlayElement.dataset.previewVisible = "false";
        drawCaptureOverlayElement.dataset.horizontalLineCount = "0";
        drawCaptureOverlayElement.dataset.trendLineCount = "0";
        chartCanvas.appendChild(drawCaptureOverlayElement);

        return drawCaptureOverlayElement;
      };

      const syncHorizontalLineTestMeta = () => {
        const drawCaptureOverlay = ensureDrawCaptureOverlayElement();
        if (!drawCaptureOverlay) {
          return;
        }

        drawCaptureOverlay.dataset.horizontalLineCount = String(drawnLineSeries.length);
        if (chartCanvas) {
          chartCanvas.dataset.horizontalLineCount = String(drawnLineSeries.length);
        }
      };

      const syncTrendLineTestMeta = () => {
        const drawCaptureOverlay = ensureDrawCaptureOverlayElement();
        if (!drawCaptureOverlay) {
          return;
        }

        drawCaptureOverlay.dataset.trendLineCount = String(drawnTrendLineSeries.length);
        if (chartCanvas) {
          chartCanvas.dataset.trendLineCount = String(drawnTrendLineSeries.length);
        }
      };

      const hideHorizontalLineContextMenu = () => {
        contextMenuHorizontalLineEntry = null;
        if (!horizontalLineContextMenuElement) {
          return;
        }

        horizontalLineContextMenuElement.classList.remove("is-visible");
      };

      const ensureHorizontalLineContextMenuElement = () => {
        if (horizontalLineContextMenuElement || !chartCanvas) {
          return horizontalLineContextMenuElement;
        }

        const menuElement = document.createElement("div");
        menuElement.className = "horizontal-line-context-menu";
        menuElement.setAttribute("role", "menu");

        const duplicateButton = document.createElement("button");
        duplicateButton.type = "button";
        duplicateButton.className = "horizontal-line-context-menu__item";
        duplicateButton.dataset.action = "duplicate";
        duplicateButton.textContent = "Duplicate line";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "horizontal-line-context-menu__item horizontal-line-context-menu__item--danger";
        deleteButton.dataset.action = "delete";
        deleteButton.textContent = "Delete line";

        menuElement.appendChild(duplicateButton);
        menuElement.appendChild(deleteButton);
        chartCanvas.appendChild(menuElement);
        horizontalLineContextMenuElement = menuElement;

        menuElement.addEventListener("mousedown", (event) => {
          event.stopPropagation();
        });

        menuElement.addEventListener("click", (event) => {
          const actionButton = event.target.closest(".horizontal-line-context-menu__item");
          if (!actionButton || !contextMenuHorizontalLineEntry || contextMenuHorizontalLineEntry.removed) {
            hideHorizontalLineContextMenu();
            return;
          }

          if (actionButton.dataset.action === "duplicate") {
            setSelectedHorizontalLine(contextMenuHorizontalLineEntry);
            if (duplicateSelectedHorizontalLine()) {
              setRefreshStatus("Horizontal line duplicated", "is-updating");
              window.setTimeout(() => {
                setRefreshStatus("Live", "is-live");
              }, 700);
            }
          }

          if (actionButton.dataset.action === "delete") {
            const lineToRemove = contextMenuHorizontalLineEntry;
            removeHorizontalLineEntry(lineToRemove);
            removeUndoActionsForLineEntry(lineToRemove);
            setRefreshStatus("Horizontal line removed", "is-updating");
            window.setTimeout(() => {
              setRefreshStatus("Live", "is-live");
            }, 700);
          }

          hideHorizontalLineContextMenu();
        });

        return horizontalLineContextMenuElement;
      };

      const showHorizontalLineContextMenu = (lineEntry, event) => {
        if (!lineEntry || lineEntry.removed || !chartCanvas) {
          hideHorizontalLineContextMenu();
          return;
        }

        const menuElement = ensureHorizontalLineContextMenuElement();
        if (!menuElement) {
          return;
        }

        const canvasRect = chartCanvas.getBoundingClientRect();
        const relativeX = event.clientX - canvasRect.left;
        const relativeY = event.clientY - canvasRect.top;

        menuElement.classList.add("is-visible");
        const menuWidth = menuElement.offsetWidth || 156;
        const menuHeight = menuElement.offsetHeight || 76;
        const maxLeft = Math.max(8, canvasRect.width - menuWidth - 8);
        const maxTop = Math.max(8, canvasRect.height - menuHeight - 8);

        const left = clamp(relativeX, 8, maxLeft);
        const top = clamp(relativeY, 8, maxTop);

        menuElement.style.left = `${left}px`;
        menuElement.style.top = `${top}px`;
        contextMenuHorizontalLineEntry = lineEntry;
      };

      const hideTrendLineContextMenu = () => {
        contextMenuTrendLineEntry = null;
        if (!trendLineContextMenuElement) {
          return;
        }

        trendLineContextMenuElement.classList.remove("is-visible");
      };

      const ensureTrendLineContextMenuElement = () => {
        if (trendLineContextMenuElement || !chartCanvas) {
          return trendLineContextMenuElement;
        }

        const menuElement = document.createElement("div");
        menuElement.className = "horizontal-line-context-menu";
        menuElement.setAttribute("role", "menu");

        const duplicateButton = document.createElement("button");
        duplicateButton.type = "button";
        duplicateButton.className = "horizontal-line-context-menu__item";
        duplicateButton.dataset.action = "duplicate";
        duplicateButton.textContent = "Duplicate line";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "horizontal-line-context-menu__item horizontal-line-context-menu__item--danger";
        deleteButton.dataset.action = "delete";
        deleteButton.textContent = "Delete line";

        menuElement.appendChild(duplicateButton);
        menuElement.appendChild(deleteButton);
        chartCanvas.appendChild(menuElement);
        trendLineContextMenuElement = menuElement;

        menuElement.addEventListener("mousedown", (event) => {
          event.stopPropagation();
        });

        menuElement.addEventListener("click", (event) => {
          const actionButton = event.target.closest(".horizontal-line-context-menu__item");
          if (!actionButton || !contextMenuTrendLineEntry || contextMenuTrendLineEntry.removed) {
            hideTrendLineContextMenu();
            return;
          }

          if (actionButton.dataset.action === "duplicate") {
            setSelectedTrendLine(contextMenuTrendLineEntry);
            if (duplicateSelectedTrendLine()) {
              setRefreshStatus("Trend line duplicated", "is-updating");
              window.setTimeout(() => {
                setRefreshStatus("Live", "is-live");
              }, 700);
            }
          }

          if (actionButton.dataset.action === "delete") {
            const lineToRemove = contextMenuTrendLineEntry;
            removeTrendLineEntry(lineToRemove);
            removeUndoActionsForTrendLineEntry(lineToRemove);
            setRefreshStatus("Trend line removed", "is-updating");
            window.setTimeout(() => {
              setRefreshStatus("Live", "is-live");
            }, 700);
          }

          hideTrendLineContextMenu();
        });

        return trendLineContextMenuElement;
      };

      const showTrendLineContextMenu = (lineEntry, event) => {
        if (!lineEntry || lineEntry.removed || !chartCanvas) {
          hideTrendLineContextMenu();
          return;
        }

        const menuElement = ensureTrendLineContextMenuElement();
        if (!menuElement) {
          return;
        }

        const canvasRect = chartCanvas.getBoundingClientRect();
        const relativeX = event.clientX - canvasRect.left;
        const relativeY = event.clientY - canvasRect.top;

        menuElement.classList.add("is-visible");
        const menuWidth = menuElement.offsetWidth || 156;
        const menuHeight = menuElement.offsetHeight || 76;
        const maxLeft = Math.max(8, canvasRect.width - menuWidth - 8);
        const maxTop = Math.max(8, canvasRect.height - menuHeight - 8);

        const left = clamp(relativeX, 8, maxLeft);
        const top = clamp(relativeY, 8, maxTop);

        menuElement.style.left = `${left}px`;
        menuElement.style.top = `${top}px`;
        contextMenuTrendLineEntry = lineEntry;
      };

      const hideCandleOrderContextMenu = () => {
        contextMenuCandleOrderPoint = null;
        if (!candleOrderContextMenuElement) {
          return;
        }

        candleOrderContextMenuElement.classList.remove("is-visible");
      };

      const prepareOrderFromCandleContextMenu = (point, side) => {
        const normalizedPrice = snapOrderPriceToTick(Number(point?.price));
        if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
          return false;
        }

        const formattedPrice = formatOrderPriceInputValue(normalizedPrice);
        if (!formattedPrice) {
          return false;
        }

        setRightPanelTab("order");
        setOrderActionSide(side === "sell" ? "sell" : "buy");

        if (orderPriceInputElement) {
          if (orderTotalInputElement && String(orderTotalInputElement.value || "").trim().length === 0) {
            const defaultTotalValue = getDefaultOrderTotalAutofillValue();
            const formattedTotalValue = formatOrderTotalInputValue(defaultTotalValue);
            if (formattedTotalValue) {
              orderTotalInputElement.value = formattedTotalValue;
            }
          }

          if (String(orderPriceInputElement.value || "").trim() !== formattedPrice) {
            orderPriceInputElement.value = formattedPrice;
            orderPriceInputElement.dispatchEvent(new Event("input", { bubbles: true }));
          } else {
            renderChartOrderPreview();
          }
        }

        setRefreshStatus(side === "sell" ? "Sell order prepared" : "Buy order prepared", "is-updating");
        window.setTimeout(() => {
          setRefreshStatus("Live", "is-live");
        }, 700);

        return true;
      };

      const ensureCandleOrderContextMenuElement = () => {
        if (candleOrderContextMenuElement || !chartCanvas) {
          return candleOrderContextMenuElement;
        }

        const menuElement = document.createElement("div");
        menuElement.className = "horizontal-line-context-menu";
        menuElement.setAttribute("role", "menu");

        const createBuyButton = document.createElement("button");
        createBuyButton.type = "button";
        createBuyButton.className = "horizontal-line-context-menu__item";
        createBuyButton.dataset.action = "create-buy-order";
        createBuyButton.textContent = "Create Buy Order";

        const createSellButton = document.createElement("button");
        createSellButton.type = "button";
        createSellButton.className = "horizontal-line-context-menu__item";
        createSellButton.dataset.action = "create-sell-order";
        createSellButton.textContent = "Create Sell Order";

        menuElement.appendChild(createBuyButton);
        menuElement.appendChild(createSellButton);
        chartCanvas.appendChild(menuElement);
        candleOrderContextMenuElement = menuElement;

        menuElement.addEventListener("mousedown", (event) => {
          event.stopPropagation();
        });

        menuElement.addEventListener("click", (event) => {
          const actionButton = event.target.closest(".horizontal-line-context-menu__item");
          if (!actionButton || !contextMenuCandleOrderPoint) {
            hideCandleOrderContextMenu();
            return;
          }

          if (actionButton.dataset.action === "create-buy-order") {
            prepareOrderFromCandleContextMenu(contextMenuCandleOrderPoint, "buy");
          }

          if (actionButton.dataset.action === "create-sell-order") {
            prepareOrderFromCandleContextMenu(contextMenuCandleOrderPoint, "sell");
          }

          hideCandleOrderContextMenu();
        });

        return candleOrderContextMenuElement;
      };

      const showCandleOrderContextMenu = (point, event) => {
        if (!point || !chartCanvas) {
          hideCandleOrderContextMenu();
          return;
        }

        const menuElement = ensureCandleOrderContextMenuElement();
        if (!menuElement) {
          return;
        }

        const canvasRect = chartCanvas.getBoundingClientRect();
        const relativeX = event.clientX - canvasRect.left;
        const relativeY = event.clientY - canvasRect.top;

        menuElement.classList.add("is-visible");
        const menuWidth = menuElement.offsetWidth || 170;
        const menuHeight = menuElement.offsetHeight || 76;
        const maxLeft = Math.max(8, canvasRect.width - menuWidth - 8);
        const maxTop = Math.max(8, canvasRect.height - menuHeight - 8);

        const left = clamp(relativeX, 8, maxLeft);
        const top = clamp(relativeY, 8, maxTop);

        menuElement.style.left = `${left}px`;
        menuElement.style.top = `${top}px`;
        contextMenuCandleOrderPoint = {
          price: Number(point.price),
        };
      };

      const applyHorizontalLineVisualState = (lineEntry) => {
        if (!lineEntry || lineEntry.removed || !lineEntry.priceLine) {
          return;
        }

        const isSelected = selectedHorizontalLineEntry === lineEntry;
        const isVisibleInCandlePane = isHorizontalLineInCandlePane(lineEntry);
        lineEntry.priceLine.applyOptions({
          color: isSelected ? "#ffe08a" : horizontalLineColor,
          lineWidth: isSelected ? 4 : 3,
          lineStyle: LightweightCharts.LineStyle.Solid,
          lineVisible: isVisibleInCandlePane,
        });
      };

      const setSelectedHorizontalLine = (lineEntry) => {
        if (selectedHorizontalLineEntry === lineEntry) {
          return;
        }

        const previousSelection = selectedHorizontalLineEntry;
        selectedHorizontalLineEntry = lineEntry || null;

        if (previousSelection) {
          applyHorizontalLineVisualState(previousSelection);
        }
        if (selectedHorizontalLineEntry) {
          applyHorizontalLineVisualState(selectedHorizontalLineEntry);
        }

        renderPaneScaleOverlay();
        renderSelectedHorizontalLineHandle();
      };

      const applyTrendLineVisualState = (lineEntry) => {
        if (!lineEntry || lineEntry.removed || !lineEntry.series) {
          return;
        }

        const isSelected = selectedTrendLineEntry === lineEntry;
        lineEntry.series.applyOptions({
          color: isSelected ? "#ffe08a" : horizontalLineColor,
          lineWidth: isSelected ? 4 : 3,
          lineStyle: LightweightCharts.LineStyle.Solid,
        });
      };

      const setSelectedTrendLine = (lineEntry) => {
        if (selectedTrendLineEntry === lineEntry) {
          return;
        }

        const previousSelection = selectedTrendLineEntry;
        selectedTrendLineEntry = lineEntry || null;

        if (previousSelection) {
          applyTrendLineVisualState(previousSelection);
        }
        if (selectedTrendLineEntry) {
          applyTrendLineVisualState(selectedTrendLineEntry);
        }

        renderSelectedTrendLineHandles();
      };

      const createTrendLineEntry = (startPoint, endPoint) => {
        const startTime = Number(startPoint?.time);
        const endTime = Number(endPoint?.time);
        const startPrice = Number(startPoint?.price);
        const endPrice = Number(endPoint?.price);

        if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || !Number.isFinite(startPrice) || !Number.isFinite(endPrice)) {
          return null;
        }

        const trendSeries = chart.addSeries(LightweightCharts.LineSeries, {
          priceScaleId: "price",
          color: horizontalLineColor,
          lineWidth: 3,
          lineStyle: LightweightCharts.LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        trendSeries.setData([
          { time: startTime, value: startPrice },
          { time: endTime, value: endPrice },
        ]);

        return {
          series: trendSeries,
          startTime,
          startPrice,
          endTime,
          endPrice,
          removed: false,
        };
      };

      const persistTrendLines = () => {
        try {
          const persistedLines = drawnTrendLineSeries
            .filter((lineEntry) => lineEntry && !lineEntry.removed)
            .map((lineEntry) => ({
              startTime: Number(lineEntry.startTime),
              startPrice: Number(lineEntry.startPrice),
              endTime: Number(lineEntry.endTime),
              endPrice: Number(lineEntry.endPrice),
            }))
            .filter((lineEntry) => (
              Number.isFinite(lineEntry.startTime)
              && Number.isFinite(lineEntry.endTime)
              && Number.isFinite(lineEntry.startPrice)
              && Number.isFinite(lineEntry.endPrice)
            ))
            .slice(-maxTrendLines);
          localStorage.setItem(trendLineStorageKey, JSON.stringify(persistedLines));
        } catch (_error) {
        }
      };

      const restoreTrendLines = () => {
        let storedLines = [];

        try {
          const savedValue = JSON.parse(localStorage.getItem(trendLineStorageKey) || "[]");
          if (Array.isArray(savedValue)) {
            storedLines = savedValue;
          }
        } catch (_error) {
          storedLines = [];
        }

        if (!storedLines.length) {
          return;
        }

        storedLines.slice(-maxTrendLines).forEach((storedLine) => {
          const restoredEntry = createTrendLineEntry(
            { time: Number(storedLine?.startTime), price: Number(storedLine?.startPrice) },
            { time: Number(storedLine?.endTime), price: Number(storedLine?.endPrice) },
          );
          if (restoredEntry) {
            drawnTrendLineSeries.push(restoredEntry);
          }
        });

        drawnTrendLineSeries.forEach((lineEntry) => {
          applyTrendLineVisualState(lineEntry);
        });

        syncTrendLineTestMeta();
      };

      const clearTrendLineHoverPreview = () => {
        trendDrawAnchorPoint = null;
        if (!drawTrendPreviewSeries) {
          return;
        }

        chart.removeSeries(drawTrendPreviewSeries);
        drawTrendPreviewSeries = null;
      };

      const updateTrendLineHoverPreview = (startPoint, endPoint) => {
        const startTime = Number(startPoint?.time);
        const startPrice = Number(startPoint?.price);
        const endTime = Number(endPoint?.time);
        const endPrice = Number(endPoint?.price);

        if (!Number.isFinite(startTime) || !Number.isFinite(startPrice) || !Number.isFinite(endTime) || !Number.isFinite(endPrice)) {
          return;
        }

        if (!drawTrendPreviewSeries) {
          drawTrendPreviewSeries = chart.addSeries(LightweightCharts.LineSeries, {
            priceScaleId: "price",
            color: "rgba(255, 209, 102, 0.75)",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
        }

        drawTrendPreviewSeries.setData([
          { time: startTime, value: startPrice },
          { time: endTime, value: endPrice },
        ]);
      };

      const resolveTimeFromXCoordinate = (xCoordinate) => {
        const numericCoordinate = Number(xCoordinate);
        if (!Number.isFinite(numericCoordinate) || !Array.isArray(chartData) || chartData.length === 0) {
          return Number.NaN;
        }

        const logical = chart.timeScale().coordinateToLogical(numericCoordinate);
        const logicalIndex = Math.round(Number(logical));
        if (Number.isFinite(logicalIndex)) {
          const safeIndex = Math.max(0, Math.min(chartData.length - 1, logicalIndex));
          const resolvedTime = Number(chartData[safeIndex]?.time);
          if (Number.isFinite(resolvedTime)) {
            return resolvedTime;
          }
        }

        const fallbackTime = Number(chartData[chartData.length - 1]?.time);
        return Number.isFinite(fallbackTime) ? fallbackTime : Number.NaN;
      };

      const resolveTrendPointFromCanvasClick = (event) => {
        const point = resolveScreenPointFromCanvasClick(event);
        if (!point) {
          return null;
        }

        const resolvedTime = resolveTimeFromXCoordinate(point.xCoordinate);
        if (!Number.isFinite(resolvedTime)) {
          return null;
        }

        return {
          ...point,
          time: resolvedTime,
        };
      };

      const getPointToSegmentDistancePx = (point, startPoint, endPoint) => {
        const px = Number(point?.x);
        const py = Number(point?.y);
        const x1 = Number(startPoint?.x);
        const y1 = Number(startPoint?.y);
        const x2 = Number(endPoint?.x);
        const y2 = Number(endPoint?.y);

        if (![px, py, x1, y1, x2, y2].every((value) => Number.isFinite(value))) {
          return Number.POSITIVE_INFINITY;
        }

        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = (dx * dx) + (dy * dy);

        if (lengthSquared <= 0) {
          return Math.hypot(px - x1, py - y1);
        }

        const t = clamp((((px - x1) * dx) + ((py - y1) * dy)) / lengthSquared, 0, 1);
        const closestX = x1 + (t * dx);
        const closestY = y1 + (t * dy);
        return Math.hypot(px - closestX, py - closestY);
      };

      const findNearestTrendLineEntry = (clickedPoint) => {
        if (!clickedPoint || !chartCanvas) {
          return null;
        }

        const targetX = Number(clickedPoint.xCoordinate);
        const targetY = Number(clickedPoint.yCoordinate);
        if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
          return null;
        }

        let nearestLine = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        drawnTrendLineSeries.forEach((lineEntry) => {
          if (!lineEntry || lineEntry.removed) {
            return;
          }

          const startX = chart.timeScale().timeToCoordinate(Number(lineEntry.startTime));
          const endX = chart.timeScale().timeToCoordinate(Number(lineEntry.endTime));
          const startY = candleSeries.priceToCoordinate(Number(lineEntry.startPrice));
          const endY = candleSeries.priceToCoordinate(Number(lineEntry.endPrice));

          if (![startX, endX, startY, endY].every((value) => Number.isFinite(Number(value)))) {
            return;
          }

          const distance = getPointToSegmentDistancePx(
            { x: targetX, y: targetY },
            { x: Number(startX), y: Number(startY) },
            { x: Number(endX), y: Number(endY) },
          );

          if (distance > trendLineSelectionTolerancePx || distance >= nearestDistance) {
            return;
          }

          nearestDistance = distance;
          nearestLine = lineEntry;
        });

        return nearestLine;
      };

      const getHorizontalLineSelectionTolerance = (linePrice) => {
        const numericPrice = Number(linePrice);
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
          return 0;
        }

        const yCoordinate = candleSeries.priceToCoordinate(numericPrice);
        if (!Number.isFinite(Number(yCoordinate))) {
          return Math.max(0.5, Math.abs(numericPrice) * 0.001);
        }

        const upperPrice = candleSeries.coordinateToPrice(Number(yCoordinate) - horizontalLineSelectionTolerancePx);
        const lowerPrice = candleSeries.coordinateToPrice(Number(yCoordinate) + horizontalLineSelectionTolerancePx);
        const derivedTolerance = Math.abs(Number(upperPrice) - Number(lowerPrice)) / 2;
        if (Number.isFinite(derivedTolerance) && derivedTolerance > 0) {
          return derivedTolerance;
        }

        return Math.max(0.5, Math.abs(numericPrice) * 0.001);
      };

      const findNearestHorizontalLineEntry = (targetPrice) => {
        const numericTarget = Number(targetPrice);
        if (!Number.isFinite(numericTarget)) {
          return null;
        }

        let nearestLine = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        drawnLineSeries.forEach((lineEntry) => {
          if (!lineEntry || lineEntry.removed) {
            return;
          }

          if (!isHorizontalLineInCandlePane(lineEntry)) {
            return;
          }

          const linePrice = Number(lineEntry.price);
          if (!Number.isFinite(linePrice)) {
            return;
          }

          const tolerance = getHorizontalLineSelectionTolerance(linePrice);
          const distance = Math.abs(linePrice - numericTarget);
          if (distance > tolerance || distance >= nearestDistance) {
            return;
          }

          nearestDistance = distance;
          nearestLine = lineEntry;
        });

        return nearestLine;
      };

      const createHorizontalLineEntry = (price) => {
        const linePrice = Number(price);
        if (!Number.isFinite(linePrice) || linePrice <= 0) {
          return null;
        }

        const horizontalPriceLine = candleSeries.createPriceLine({
          price: linePrice,
          color: horizontalLineColor,
          lineWidth: 3,
          lineStyle: LightweightCharts.LineStyle.Solid,
          axisLabelVisible: false,
          title: "H",
        });

        return {
          priceLine: horizontalPriceLine,
          price: linePrice,
          removed: false,
        };
      };

      const persistHorizontalLines = () => {
        try {
          const persistedPrices = drawnLineSeries
            .filter((lineEntry) => lineEntry && !lineEntry.removed)
            .map((lineEntry) => Number(lineEntry.price))
            .filter((price) => Number.isFinite(price) && price > 0)
            .slice(-maxHorizontalLines);
          localStorage.setItem(horizontalLineStorageKey, JSON.stringify(persistedPrices));
        } catch (_error) {
        }
      };

      const restoreHorizontalLines = () => {
        let storedLines = [];

        try {
          const savedValue = JSON.parse(localStorage.getItem(horizontalLineStorageKey) || "[]");
          if (Array.isArray(savedValue)) {
            storedLines = savedValue;
          }
        } catch (_error) {
          storedLines = [];
        }

        if (!storedLines.length) {
          return;
        }

        storedLines.slice(-maxHorizontalLines).forEach((storedPrice) => {
          const linePrice = Number(storedPrice);
          if (!Number.isFinite(linePrice) || linePrice <= 0) {
            return;
          }

          const restoredEntry = createHorizontalLineEntry(linePrice);
          if (restoredEntry) {
            drawnLineSeries.push(restoredEntry);
          }
        });

        drawnLineSeries.forEach((lineEntry) => {
          applyHorizontalLineVisualState(lineEntry);
        });

        syncHorizontalLineTestMeta();
        renderPaneScaleOverlay();
      };

      const duplicateSelectedHorizontalLine = () => {
        if (!selectedHorizontalLineEntry || selectedHorizontalLineEntry.removed) {
          return false;
        }

        const selectedPrice = Number(selectedHorizontalLineEntry.price);
        if (!Number.isFinite(selectedPrice)) {
          return false;
        }

        const selectedY = candleSeries.priceToCoordinate(selectedPrice);
        const shiftedY = Number(selectedY) - 20;
        const shiftedPrice = candleSeries.coordinateToPrice(shiftedY);
        let duplicatePrice = Number(shiftedPrice);
        if (!Number.isFinite(duplicatePrice) || duplicatePrice <= 0) {
          duplicatePrice = selectedPrice * 1.001;
        }

        const duplicateEntry = createHorizontalLineEntry(duplicatePrice);
        if (!duplicateEntry) {
          return false;
        }

        drawnLineSeries.push(duplicateEntry);
        setSelectedHorizontalLine(duplicateEntry);
        syncHorizontalLineTestMeta();
        persistHorizontalLines();
        renderPaneScaleOverlay();

        pushUndoAction({
          type: "horizontal-line",
          lineEntry: duplicateEntry,
          undo: () => {
            removeHorizontalLineEntry(duplicateEntry);
          },
        });

        if (drawnLineSeries.length > maxHorizontalLines) {
          const oldestLineEntry = drawnLineSeries[0];
          removeHorizontalLineEntry(oldestLineEntry);
          removeUndoActionsForLineEntry(oldestLineEntry);
        }

        return true;
      };

      const duplicateSelectedTrendLine = () => {
        if (!selectedTrendLineEntry || selectedTrendLineEntry.removed) {
          return false;
        }

        const startY = candleSeries.priceToCoordinate(Number(selectedTrendLineEntry.startPrice));
        const endY = candleSeries.priceToCoordinate(Number(selectedTrendLineEntry.endPrice));

        const shiftedStartPrice = candleSeries.coordinateToPrice(Number(startY) - 20);
        const shiftedEndPrice = candleSeries.coordinateToPrice(Number(endY) - 20);

        let duplicateStartPrice = Number(shiftedStartPrice);
        let duplicateEndPrice = Number(shiftedEndPrice);

        if (!Number.isFinite(duplicateStartPrice) || duplicateStartPrice <= 0) {
          duplicateStartPrice = Number(selectedTrendLineEntry.startPrice) * 1.001;
        }
        if (!Number.isFinite(duplicateEndPrice) || duplicateEndPrice <= 0) {
          duplicateEndPrice = Number(selectedTrendLineEntry.endPrice) * 1.001;
        }

        const duplicateEntry = createTrendLineEntry(
          { time: Number(selectedTrendLineEntry.startTime), price: duplicateStartPrice },
          { time: Number(selectedTrendLineEntry.endTime), price: duplicateEndPrice },
        );
        if (!duplicateEntry) {
          return false;
        }

        drawnTrendLineSeries.push(duplicateEntry);
        setSelectedTrendLine(duplicateEntry);
        syncTrendLineTestMeta();
        persistTrendLines();

        pushUndoAction({
          type: "trend-line",
          lineEntry: duplicateEntry,
          undo: () => {
            removeTrendLineEntry(duplicateEntry);
          },
        });

        if (drawnTrendLineSeries.length > maxTrendLines) {
          const oldestLineEntry = drawnTrendLineSeries[0];
          removeTrendLineEntry(oldestLineEntry);
          removeUndoActionsForTrendLineEntry(oldestLineEntry);
        }

        return true;
      };

      const updateUndoButtonState = () => {
        if (!undoButtonElement) {
          return;
        }

        undoButtonElement.disabled = drawingUndoStack.length === 0;
      };

      const serializeUndoAction = (undoAction) => {
        if (!undoAction || !undoAction.lineEntry) {
          return null;
        }

        if (undoAction.type === "horizontal-line") {
          const linePrice = Number(undoAction.lineEntry.price);
          if (!Number.isFinite(linePrice) || linePrice <= 0) {
            return null;
          }

          return {
            type: "horizontal-line",
            price: linePrice,
          };
        }

        if (undoAction.type === "trend-line") {
          const startTime = Number(undoAction.lineEntry.startTime);
          const startPrice = Number(undoAction.lineEntry.startPrice);
          const endTime = Number(undoAction.lineEntry.endTime);
          const endPrice = Number(undoAction.lineEntry.endPrice);
          if (!Number.isFinite(startTime) || !Number.isFinite(startPrice) || !Number.isFinite(endTime) || !Number.isFinite(endPrice)) {
            return null;
          }

          return {
            type: "trend-line",
            startTime,
            startPrice,
            endTime,
            endPrice,
          };
        }

        return null;
      };

      const persistDrawingUndoStack = () => {
        try {
          const persistedUndoActions = drawingUndoStack
            .map((undoAction) => serializeUndoAction(undoAction))
            .filter((undoAction) => undoAction);
          localStorage.setItem(drawingUndoStackStorageKey, JSON.stringify(persistedUndoActions));
        } catch (_error) {
        }
      };

      const buildUndoActionForLineEntry = (type, lineEntry) => {
        if (!lineEntry || lineEntry.removed) {
          return null;
        }

        if (type === "horizontal-line") {
          return {
            type,
            lineEntry,
            undo: () => {
              removeHorizontalLineEntry(lineEntry);
            },
          };
        }

        if (type === "trend-line") {
          return {
            type,
            lineEntry,
            undo: () => {
              removeTrendLineEntry(lineEntry);
            },
          };
        }

        return null;
      };

      const restoreDrawingUndoStack = () => {
        let storedUndoActions = [];

        try {
          const savedValue = JSON.parse(localStorage.getItem(drawingUndoStackStorageKey) || "[]");
          if (Array.isArray(savedValue)) {
            storedUndoActions = savedValue;
          }
        } catch (_error) {
          storedUndoActions = [];
        }

        if (!storedUndoActions.length) {
          persistDrawingUndoStack();
          return;
        }

        drawingUndoStack.length = 0;

        const availableHorizontalLines = drawnLineSeries.filter((lineEntry) => lineEntry && !lineEntry.removed);
        const availableTrendLines = drawnTrendLineSeries.filter((lineEntry) => lineEntry && !lineEntry.removed);

        storedUndoActions.forEach((storedUndoAction) => {
          if (storedUndoAction?.type === "horizontal-line") {
            const targetPrice = Number(storedUndoAction.price);
            const matchedIndex = availableHorizontalLines.findIndex((lineEntry) => Number(lineEntry.price) === targetPrice);
            if (matchedIndex === -1) {
              return;
            }

            const matchedLineEntry = availableHorizontalLines.splice(matchedIndex, 1)[0];
            const rebuiltUndoAction = buildUndoActionForLineEntry("horizontal-line", matchedLineEntry);
            if (rebuiltUndoAction) {
              drawingUndoStack.push(rebuiltUndoAction);
            }
            return;
          }

          if (storedUndoAction?.type === "trend-line") {
            const targetStartTime = Number(storedUndoAction.startTime);
            const targetStartPrice = Number(storedUndoAction.startPrice);
            const targetEndTime = Number(storedUndoAction.endTime);
            const targetEndPrice = Number(storedUndoAction.endPrice);

            const matchedIndex = availableTrendLines.findIndex((lineEntry) => (
              Number(lineEntry.startTime) === targetStartTime
              && Number(lineEntry.startPrice) === targetStartPrice
              && Number(lineEntry.endTime) === targetEndTime
              && Number(lineEntry.endPrice) === targetEndPrice
            ));

            if (matchedIndex === -1) {
              return;
            }

            const matchedLineEntry = availableTrendLines.splice(matchedIndex, 1)[0];
            const rebuiltUndoAction = buildUndoActionForLineEntry("trend-line", matchedLineEntry);
            if (rebuiltUndoAction) {
              drawingUndoStack.push(rebuiltUndoAction);
            }
          }
        });

        persistDrawingUndoStack();
      };

      const pushUndoAction = (undoAction) => {
        if (!undoAction || typeof undoAction.undo !== "function") {
          return;
        }

        drawingUndoStack.push(undoAction);
        updateUndoButtonState();
        persistDrawingUndoStack();
      };

      const undoLastDrawingAction = () => {
        const undoAction = drawingUndoStack.pop();
        if (!undoAction) {
          return false;
        }

        undoAction.undo();
        updateUndoButtonState();
        persistDrawingUndoStack();
        return true;
      };

      const isEditableTarget = (target) => {
        if (!target || !(target instanceof HTMLElement)) {
          return false;
        }

        if (target.isContentEditable) {
          return true;
        }

        const tagName = target.tagName.toLowerCase();
        return tagName === "input" || tagName === "textarea" || tagName === "select";
      };

      const updateOHLCDisplay = (barData, barVolume = null) => {
        if (!ohlcOpenElement || !ohlcHighElement || !ohlcLowElement || !ohlcCloseElement || !ohlcBarVolumeElement) {
          return;
        }

        const ohlcValueElements = [
          ohlcOpenElement,
          ohlcHighElement,
          ohlcLowElement,
          ohlcCloseElement,
          ohlcBarVolumeElement,
        ];

        const setOhlcValueTone = (tone) => {
          ohlcValueElements.forEach((element) => {
            element.classList.remove("ohlc-value--up", "ohlc-value--down");
            if (tone) {
              element.classList.add(tone);
            }
          });
        };

        if (!barData) {
          ohlcOpenElement.textContent = "-";
          ohlcHighElement.textContent = "-";
          ohlcLowElement.textContent = "-";
          ohlcCloseElement.textContent = "-";
          ohlcBarVolumeElement.textContent = "-";
          setOhlcValueTone(null);
          return;
        }

        const openValue = Number(barData.open);
        const closeValue = Number(barData.close);
        const valueTone = closeValue >= openValue ? "ohlc-value--up" : "ohlc-value--down";

        ohlcOpenElement.textContent = openValue.toFixed(2);
        ohlcHighElement.textContent = Number(barData.high).toFixed(2);
        ohlcLowElement.textContent = Number(barData.low).toFixed(2);
        ohlcCloseElement.textContent = closeValue.toFixed(2);
        ohlcBarVolumeElement.textContent = formatCompactVolume(barVolume);
        setOhlcValueTone(valueTone);
      };

      const applyLiveCurrentPriceToLatestCandle = (nextPrice) => {
        const normalizedPrice = Number(nextPrice);
        if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0 || chartData.length === 0 || allCandles.length === 0) {
          return;
        }

        const timeframeSeconds = getTimeframeDurationSeconds(currentTimeframe);
        const estimatedServerNow = getEstimatedServerNowSeconds();
        const currentBucketOpenTime = Math.floor(estimatedServerNow / timeframeSeconds) * timeframeSeconds;

        const latestChartBar = chartData[chartData.length - 1];
        if (!latestChartBar) {
          return;
        }

        const latestBarTime = Number(latestChartBar.time);
        if (Number.isFinite(latestBarTime) && Number.isFinite(currentBucketOpenTime) && currentBucketOpenTime > latestBarTime) {
          const previousClose = Number(latestChartBar.close);
          const newOpen = Number.isFinite(previousClose) ? previousClose : normalizedPrice;
          const newLiveBar = {
            time: currentBucketOpenTime,
            open: newOpen,
            high: Math.max(newOpen, normalizedPrice),
            low: Math.min(newOpen, normalizedPrice),
            close: normalizedPrice,
          };

          chartData.push(newLiveBar);
          candleSeries.update(newLiveBar);

          const previousRawClose = Number(allCandles[allCandles.length - 1]?.close);
          const rawOpen = Number.isFinite(previousRawClose) ? previousRawClose : normalizedPrice;
          allCandles.push({
            time: currentBucketOpenTime,
            open: rawOpen,
            high: Math.max(rawOpen, normalizedPrice),
            low: Math.min(rawOpen, normalizedPrice),
            close: normalizedPrice,
            volume: 0,
            direction: normalizedPrice >= rawOpen ? "up" : "down",
          });

          candleVolumeByTime.set(currentBucketOpenTime, 0);

          if (allCandles.length > (renderCandleLimit * 2)) {
            allCandles = allCandles.slice(-renderCandleLimit);
          }

          updateCountdownAnchor();
          renderPaneScaleOverlay();
          return;
        }

        const updatedChartBar = {
          ...latestChartBar,
          close: normalizedPrice,
          high: Math.max(Number(latestChartBar.high), normalizedPrice),
          low: Math.min(Number(latestChartBar.low), normalizedPrice),
        };

        chartData[chartData.length - 1] = updatedChartBar;
        candleSeries.update(updatedChartBar);

        const latestRawCandle = allCandles[allCandles.length - 1];
        if (latestRawCandle) {
          latestRawCandle.close = updatedChartBar.close;
          latestRawCandle.high = updatedChartBar.high;
          latestRawCandle.low = updatedChartBar.low;
          latestRawCandle.direction = updatedChartBar.close >= Number(latestRawCandle.open) ? "up" : "down";
        }

        const isHoveringLatest = hoveredCandleTime === null || hoveredCandleTime === Number(updatedChartBar.time);
        if (isHoveringLatest) {
          const latestVolume = candleVolumeByTime.get(Number(updatedChartBar.time)) ?? null;
          updateOHLCDisplay(updatedChartBar, latestVolume);
        }

        renderPaneScaleOverlay();
      };

      const getLatestDisplayedClosePrice = () => {
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return NaN;
        }

        return Number(chartData[chartData.length - 1]?.close);
      };

      const refreshLiveQuote = async () => {
        if (liveQuoteRequestInFlight || drawLineMode) {
          return;
        }

        const requestedTimeframe = currentTimeframe;
        const requestedSymbol = currentSymbol;
        const requestedExchangeKey = currentExchangeKey;

        liveQuoteRequestInFlight = true;
        try {
          const query = new URLSearchParams({
            timeframe: requestedTimeframe,
            symbol: requestedSymbol,
            exchange: requestedExchangeKey,
          });
          const response = await fetchWithExchangeRetrievalStatus(`/api/market-quote?${query.toString()}`, { cache: "no-store" });
          if (!response.ok) {
            return;
          }

          const payload = await response.json();
          const marketData = payload?.market_data;
          if (!marketData || marketData.error) {
            return;
          }

          const hasSelectionChanged = (
            currentTimeframe !== requestedTimeframe
            || currentSymbol !== requestedSymbol
            || currentExchangeKey !== requestedExchangeKey
          );
          if (hasSelectionChanged) {
            return;
          }

          const responseExchangeKey = String(marketData.exchange_key || "");
          const responseSymbol = String(marketData.symbol || "");
          const responseTimeframe = String(marketData.timeframe || "");
          if (
            responseExchangeKey !== requestedExchangeKey
            || responseSymbol !== requestedSymbol
            || responseTimeframe !== requestedTimeframe
          ) {
            return;
          }

          const nextCurrentPrice = Number.isFinite(Number(marketData.last))
            ? Number(marketData.last)
            : Number(marketData.ask);

          if (!Number.isFinite(nextCurrentPrice) || nextCurrentPrice <= 0) {
            refreshMarketInfo(marketData);
            return;
          }

          const previousDisplayedClose = getLatestDisplayedClosePrice();

          refreshMarketInfo(marketData);

          if (
            !Number.isFinite(previousDisplayedClose)
            || Math.abs(nextCurrentPrice - previousDisplayedClose) > 1e-9
            || !Number.isFinite(lastObservedCurrentPrice)
            || Math.abs(nextCurrentPrice - lastObservedCurrentPrice) > 1e-9
          ) {
            lastObservedCurrentPrice = nextCurrentPrice;
            applyLiveCurrentPriceToLatestCandle(nextCurrentPrice);
          }
        } catch (_error) {
        } finally {
          liveQuoteRequestInFlight = false;
        }
      };

      const redrawChart = () => {
        const renderCandles = allCandles.slice(-renderCandleLimit);
        chartData = toChartData(renderCandles);
        candleVolumeByTime = new Map(renderCandles.map((candle) => [Number(candle.time), Number(candle.volume || 0)]));
        if (!chartData.length) {
          clearDynamicPriceScaleLines();
          clearFvgZoneSeries();
          clearSmcGuideSeries();
          clearSmcOverlay();
          clearPaneScaleOverlay();
          hideChartOrderPreview();
          updateOHLCDisplay(null);
          return;
        }

        const bollingerBands = calculateBollingerBands(chartData, 20, 2);
        const smcSignals = calculateSmcSignals(chartData, 2);
        const stochastic = calculateStochastic(chartData, 14, 3, 3);
        const rsi = calculateRsi(chartData, 14);
        stochKByTime = new Map(stochastic.k.map((point) => [Number(point.time), Number(point.value)]));
        stochDByTime = new Map(stochastic.d.map((point) => [Number(point.time), Number(point.value)]));
        rsiByTime = new Map(rsi.map((point) => [Number(point.time), Number(point.value)]));

        candleSeries.setData(chartData);
        bbUpperSeries.setData(indicatorState.bb ? bollingerBands.upper : []);
        bbMiddleSeries.setData(indicatorState.bb ? bollingerBands.middle : []);
        bbLowerSeries.setData(indicatorState.bb ? bollingerBands.lower : []);
        currentSmcZones = indicatorState.smc ? smcSignals.zones : [];
        currentSmcLabels = indicatorState.smc ? smcSignals.labels : [];
        renderSmcGuides(indicatorState.smc ? smcSignals : null);
        stochKSeries.setData(indicatorState.stoch ? stochastic.k : []);
        stochDSeries.setData(indicatorState.stoch ? stochastic.d : []);
        rsiSeries.setData(indicatorState.rsi ? rsi : []);
        if (indicatorState.stoch && chartData.length > 1) {
          const firstTime = chartData[0].time;
          const lastTime = chartData[chartData.length - 1].time;
          stochOverboughtSeries.setData([
            { time: firstTime, value: 80 },
            { time: lastTime, value: 80 },
          ]);
          stochOversoldSeries.setData([
            { time: firstTime, value: 20 },
            { time: lastTime, value: 20 },
          ]);
        } else {
          stochOverboughtSeries.setData([]);
          stochOversoldSeries.setData([]);
        }

        if (indicatorState.rsi && chartData.length > 1) {
          const firstTime = chartData[0].time;
          const lastTime = chartData[chartData.length - 1].time;
          rsiOverboughtSeries.setData([
            { time: firstTime, value: 70 },
            { time: lastTime, value: 70 },
          ]);
          rsiOversoldSeries.setData([
            { time: firstTime, value: 30 },
            { time: lastTime, value: 30 },
          ]);
        } else {
          rsiOverboughtSeries.setData([]);
          rsiOversoldSeries.setData([]);
        }

        volumeSeries.setData(indicatorState.volume ? calculateVolume(renderCandles) : []);
        updatePaperTradeOrderMarkers(currentPaperTradeState);
        renderFvgZones(chartData);
        updateCountdownAnchor();
          const latestBar = chartData[chartData.length - 1];
          const latestVolume = latestBar ? candleVolumeByTime.get(Number(latestBar.time)) ?? null : null;
          updateOHLCDisplay(latestBar, latestVolume);
        renderDynamicPriceScaleLines();

        if (!hasFitContent) {
          if (pendingRestoreLogicalRange) {
            chart.timeScale().setVisibleLogicalRange(pendingRestoreLogicalRange);
          } else {
            chart.timeScale().fitContent();
          }
          hasFitContent = true;
        }

        renderFvgOverlay();
        renderSmcOverlay();
        renderChartOrderPreview();
        renderPaneScaleOverlay();
        renderSelectedHorizontalLineHandle();
        renderSelectedTrendLineHandles();
      };

      chart.subscribeCrosshairMove((param) => {
        if (drawLineMode) {
          return;
        }

        if (!param || !param.point || !param.time) {
          hoveredCandleTime = null;
          hidePaperTradeMarkerTooltip();
          hidePriceHoverGuide();
          const latestBar = chartData[chartData.length - 1] || null;
          const latestVolume = latestBar ? candleVolumeByTime.get(Number(latestBar.time)) ?? null : null;
          updateOHLCDisplay(latestBar, latestVolume);
          renderPaneScaleOverlay();
          return;
        }

        const candleAtCrosshair = param.seriesData.get(candleSeries);
        if (!candleAtCrosshair) {
          hoveredCandleTime = null;
          hidePaperTradeMarkerTooltip();
          hidePriceHoverGuide();
          const latestBar = chartData[chartData.length - 1] || null;
          const latestVolume = latestBar ? candleVolumeByTime.get(Number(latestBar.time)) ?? null : null;
          updateOHLCDisplay(latestBar, latestVolume);
          renderPaneScaleOverlay();
          return;
        }

        const hoveredTime = Number(param.time);
        hoveredCandleTime = hoveredTime;
        updatePriceHoverGuide(param);
        const hoveredVolume = candleVolumeByTime.get(hoveredTime) ?? null;
        updateOHLCDisplay(candleAtCrosshair, hoveredVolume);
        showPaperTradeMarkerTooltip(param);
        renderPaneScaleOverlay();
      });

      const refreshMarketInfo = (marketData) => {
        if (!marketData) {
          return;
        }

        const previousSymbol = currentSymbol;
        const previousExchangeKey = currentExchangeKey;

        applyOrderAmountInputConstraints(marketData);

        const timestampUnix = Number(marketData.timestamp_unix);
        if (Number.isFinite(timestampUnix)) {
          latestServerTimestampSeconds = timestampUnix;
          latestServerTimestampSetAtMs = Date.now();
        }

        currentSymbol = marketData.symbol || currentSymbol;
        currentDisplaySymbol = marketData.display_symbol || currentDisplaySymbol;
        currentExchangeKey = marketData.exchange_key || currentExchangeKey;
        currentExchangeLabel = marketData.exchange || currentExchangeLabel;
        if (Array.isArray(marketData.supported_timeframes)) {
          const normalizedTimeframes = normalizeTimeframeOptions(marketData.supported_timeframes);
          cacheSettingsOptionsForExchange(currentExchangeKey, { supported_timeframes: normalizedTimeframes });
          if (activeSettingsExchangeKey === currentExchangeKey) {
            renderSettingsTimeframeOptions(normalizedTimeframes);
          }

          enabledTimeframes = getEnabledTimeframesForExchange(currentExchangeKey);
          if (enabledTimeframes.size === 0 && normalizedTimeframes.length > 0) {
            const defaultTimeframe = normalizedTimeframes.includes("1m") ? "1m" : normalizedTimeframes[0];
            if (defaultTimeframe) {
              setEnabledTimeframes([defaultTimeframe], {
                exchangeKey: currentExchangeKey,
                refresh: false,
              });
              enabledTimeframes = getEnabledTimeframesForExchange(currentExchangeKey);
            }
          }

          if (!enabledTimeframes.has(currentTimeframe) && enabledTimeframes.size > 0) {
            currentTimeframe = enabledTimeframes.has("1m") ? "1m" : Array.from(enabledTimeframes)[0];
            localStorage.setItem(timeframeStorageKey, currentTimeframe);
            setPreferenceCookie("trade_wijs_timeframe", currentTimeframe);
          }

          if (activeSettingsExchangeKey === currentExchangeKey) {
            applyEnabledTimeframesToUI();
          }
        }
        if (Array.isArray(marketData.supported_symbols)) {
          cacheSettingsOptionsForExchange(currentExchangeKey, { supported_symbols: marketData.supported_symbols });
          renderPairSelectorMenuOptions(getSymbolOptionsForExchange(currentExchangeKey));
          if (activeSettingsExchangeKey === currentExchangeKey) {
            renderSettingsPairsForExchange(currentExchangeKey);
          }

          enabledPairs = ensureEnabledPairsForExchange(
            currentExchangeKey,
            getFilteredPairOptionsForExchange(currentExchangeKey).map((item) => item.symbol),
          );
          persistEnabledPairs();
        }
        if (Array.isArray(marketData.supported_quote_currencies)) {
          const normalizedQuoteCurrencies = normalizeQuoteCurrencyOptions(marketData.supported_quote_currencies);
          cacheSettingsOptionsForExchange(currentExchangeKey, { supported_quote_currencies: normalizedQuoteCurrencies });
          if (activeSettingsExchangeKey === currentExchangeKey) {
            renderSettingsQuoteCurrencyOptions(normalizedQuoteCurrencies);
          }

          enabledQuoteCurrencies = getEnabledQuoteCurrenciesForExchange(currentExchangeKey);
          if (enabledQuoteCurrencies.size === 0 && normalizedQuoteCurrencies.length > 0) {
            const defaultQuoteCurrency = normalizedQuoteCurrencies.includes("USDT")
              ? "USDT"
              : (normalizedQuoteCurrencies.includes("USDC")
                ? "USDC"
                : (normalizedQuoteCurrencies.includes("EUR")
                  ? "EUR"
                  : normalizedQuoteCurrencies[0]));
            if (defaultQuoteCurrency) {
              setEnabledQuoteCurrencies([defaultQuoteCurrency], {
                exchangeKey: currentExchangeKey,
                refresh: false,
              });
            }
          } else if (activeSettingsExchangeKey === currentExchangeKey) {
            applyEnabledQuoteCurrenciesToUI();
          }
        }
        applyPairSelectorQuoteCurrencyFilter({ syncCurrentSymbol: false, persistSymbol: false });
        updateOrderInputQuoteCurrency();

        if (pairSelectorButtonElement) {
          pairSelectorButtonElement.textContent = currentDisplaySymbol;
        }
        if (exchangeSelectorButtonElement) {
          exchangeSelectorButtonElement.textContent = currentExchangeLabel;
        }
        if (timeframeLabelElement) {
          timeframeLabelElement.textContent = currentTimeframe;
        }

        setActiveSelectorMenuItem(pairSelectorMenuElement, "data-symbol", currentSymbol);
        setActiveSelectorMenuItem(exchangeSelectorMenuElement, "data-exchange", currentExchangeKey);
        applyEnabledTimeframesToUI();
        applyEnabledQuoteCurrenciesToUI();
        syncActiveMarketTabFromCurrentContext();

        if (marketTitleElement) {
          marketTitleElement.textContent = `${currentDisplaySymbol} Info`;
        }

        if (marketData.error) {
          marketInfoHasError = true;
          if (marketErrorElement) {
            marketErrorElement.textContent = `Unable to load market data: ${marketData.error}`;
          }
          setMarketInfoCollapsed(isMarketInfoCollapsed);
          return;
        }

        marketInfoHasError = false;
        if (marketUpdatedElement) {
          marketUpdatedElement.textContent = `Updated: ${marketData.timestamp || "Unknown"}`;
          const timestampUnix = Number(marketData.timestamp_unix);
          marketUpdatedElement.dataset.timestampUnix = Number.isFinite(timestampUnix) ? String(timestampUnix) : "";
        }
        setMarketInfoCollapsed(isMarketInfoCollapsed);

        if (valueLastElement) valueLastElement.textContent = formatValue(marketData.last);
        if (valueBidElement) valueBidElement.textContent = formatValue(marketData.bid);
        if (valueAskElement) valueAskElement.textContent = formatValue(marketData.ask);
        if (valueHighElement) valueHighElement.textContent = formatValue(marketData.high);
        if (valueLowElement) valueLowElement.textContent = formatValue(marketData.low);
        if (valueVolumeElement) valueVolumeElement.textContent = formatCompactVolume(marketData.quote_volume);
        if (ohlcVol24Element) ohlcVol24Element.textContent = formatCompactVolume(marketData.quote_volume);

        const currentPriceValue = Number.isFinite(Number(marketData.last))
          ? Number(marketData.last)
          : Number(marketData.ask);
        if (Number.isFinite(currentPriceValue) && currentPriceValue > 0) {
          lastObservedCurrentPrice = currentPriceValue;
        }

        if (previousSymbol !== currentSymbol || previousExchangeKey !== currentExchangeKey) {
          refreshPaperTradeState();
        }
      };

      const refreshChartData = async (options = {}) => {
        const isPriority = options.priority === true;
        const showUpdatingStatus = options.showUpdatingStatus === true;
        const updatingLabel = options.updatingLabel;

        if (!isPriority && drawLineMode) {
          return;
        }

        if (isRefreshing) {
          if (isPriority) {
            queuePriorityRefresh({ showUpdatingStatus, updatingLabel });
            if (showUpdatingStatus) {
              setRefreshStatus(formatUpdatingStatusText(updatingLabel), "is-updating");
            }
          }
          return;
        }

        isRefreshing = true;
        pendingPriorityRefresh = false;
        const requestId = ++refreshRequestCounter;
        const requestedTimeframe = currentTimeframe;
        const requestedChartContextKey = getChartContextKey(currentExchangeKey, currentSymbol, requestedTimeframe);
        const requestMode = forceFullChartRefresh || requestedChartContextKey !== lastChartContextKey ? "full" : "delta";
        setLoadingTimeframeButton(requestedTimeframe);
        if (showUpdatingStatus) {
          setRefreshStatus(formatUpdatingStatusText(updatingLabel), "is-updating");
        }

        try {
          const query = new URLSearchParams({
            timeframe: requestedTimeframe,
            symbol: currentSymbol,
            exchange: currentExchangeKey,
            mode: requestMode,
          });
          const response = await fetchWithExchangeRetrievalStatus(`/api/chart-data?${query.toString()}`, { cache: "no-store" });
          if (!response.ok) {
            setRefreshStatus("Retrying", "is-error");
            isRefreshing = false;
            setLoadingTimeframeButton(null);
            flushPendingPriorityRefresh();
            return;
          }

          const payload = await response.json();
          const payloadMode = payload.payload_mode === "delta" ? "delta" : "full";

          if (requestId !== refreshRequestCounter || requestedTimeframe !== currentTimeframe) {
            isRefreshing = false;
            setLoadingTimeframeButton(null);
            flushPendingPriorityRefresh();
            return;
          }

          const nextCandles = Array.isArray(payload.candles) ? payload.candles : [];

          if (payloadMode === "delta" && nextCandles.length === 0) {
            forceFullChartRefresh = true;
            isRefreshing = false;
            setLoadingTimeframeButton(null);
            refreshChartData({ priority: true });
            return;
          }

          if (payloadMode === "full" && nextCandles.length === 0) {
            refreshMarketInfo(payload.market_data);
            setRefreshStatus("Live", "is-live");
            isRefreshing = false;
            setLoadingTimeframeButton(null);
            flushPendingPriorityRefresh();
            return;
          }

          if (payloadMode === "delta") {
            if (!Array.isArray(allCandles) || allCandles.length === 0) {
              forceFullChartRefresh = true;
              isRefreshing = false;
              setLoadingTimeframeButton(null);
              refreshChartData({ priority: true });
              return;
            }

            const mergedCandles = Array.isArray(allCandles) ? allCandles.slice() : [];
            const candleIndexByTime = new Map();
            mergedCandles.forEach((candle, index) => {
              const candleTime = Number(candle?.time);
              if (Number.isFinite(candleTime)) {
                candleIndexByTime.set(candleTime, index);
              }
            });

            nextCandles.forEach((candle) => {
              const candleTime = Number(candle?.time);
              if (!Number.isFinite(candleTime)) {
                return;
              }

              const existingIndex = candleIndexByTime.get(candleTime);
              if (Number.isInteger(existingIndex)) {
                mergedCandles[existingIndex] = candle;
              } else {
                mergedCandles.push(candle);
                candleIndexByTime.set(candleTime, mergedCandles.length - 1);
              }
            });

            mergedCandles.sort((left, right) => Number(left?.time) - Number(right?.time));
            allCandles = mergedCandles.length > renderCandleLimit * 2 ? mergedCandles.slice(-renderCandleLimit * 2) : mergedCandles;
          } else {
            allCandles = nextCandles;
          }

          if (drawLineMode) {
            deferredCandlesForRedraw = allCandles;
            deferredMarketDataForRefresh = payload.market_data || null;
            setLoadingTimeframeButton(null);
            isRefreshing = false;
            return;
          }

          refreshMarketInfo(payload.market_data);
          redrawChart();
          cacheChartContext(requestedChartContextKey, allCandles, payload.market_data);
          const refreshedCurrentPrice = Number.isFinite(Number(payload.market_data?.last))
            ? Number(payload.market_data.last)
            : Number(payload.market_data?.ask);
          if (Number.isFinite(refreshedCurrentPrice) && refreshedCurrentPrice > 0) {
            applyLiveCurrentPriceToLatestCandle(refreshedCurrentPrice);
          }
          forceFullChartRefresh = false;
          lastChartContextKey = requestedChartContextKey;
          setRefreshStatus("Live", "is-live");
          setLoadingTimeframeButton(null);
        } catch (_error) {
          forceFullChartRefresh = true;
          setRefreshStatus("Retrying", "is-error");
          setLoadingTimeframeButton(null);
        }

        isRefreshing = false;
        flushPendingPriorityRefresh();
      };

      if (timeframeButtonsElement) {
        timeframeButtonsElement.addEventListener("click", (event) => {
          const button = event.target.closest(".timeframe-btn");
          if (!button) {
            return;
          }

          const nextTimeframe = button.dataset.timeframe;
          if (!nextTimeframe || nextTimeframe === currentTimeframe) {
            return;
          }

          currentTimeframe = nextTimeframe;
          localStorage.setItem(timeframeStorageKey, currentTimeframe);
          setPreferenceCookie("trade_wijs_timeframe", currentTimeframe);
          pendingRestoreLogicalRange = null;
          const timeframeView =
            savedChartViewByTimeframe[getChartViewKey(currentTimeframe)] ||
            savedChartViewByTimeframe[currentTimeframe];
          if (
            timeframeView &&
            Number.isFinite(Number(timeframeView.from)) &&
            Number.isFinite(Number(timeframeView.to))
          ) {
            pendingRestoreLogicalRange = {
              from: Number(timeframeView.from),
              to: Number(timeframeView.to),
            };
          }
          hasFitContent = false;
          setActiveTimeframeButton(currentTimeframe);
          syncActiveMarketTabFromCurrentContext();
          setLoadingTimeframeButton(currentTimeframe);
          refreshChartData({ priority: true, showUpdatingStatus: true });
          scheduleNextRefresh();
        });
      }

      if (pairSelectorButtonElement) {
        pairSelectorButtonElement.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleSelectorMenu("pair");
        });
      }

      if (exchangeSelectorButtonElement) {
        exchangeSelectorButtonElement.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleSelectorMenu("exchange");
        });
      }

      if (pairSelectorMenuElement) {
        pairSelectorMenuElement.addEventListener("click", (event) => {
          const button = event.target.closest("[data-symbol]");
          if (!button) {
            return;
          }

          const nextSymbol = button.dataset.symbol;
          if (!nextSymbol || !validSymbols.has(nextSymbol) || nextSymbol === currentSymbol) {
            hideSelectorMenus();
            return;
          }

          currentSymbol = nextSymbol;
          localStorage.setItem(symbolStorageKey, currentSymbol);
          setPreferenceCookie("trade_wijs_symbol", currentSymbol);
          setActiveSelectorMenuItem(pairSelectorMenuElement, "data-symbol", currentSymbol);
          if (pairSelectorButtonElement) {
            pairSelectorButtonElement.textContent = nextSymbol.replace("/", "");
          }
          pendingRestoreLogicalRange = null;
          hasFitContent = false;
          syncActiveMarketTabFromCurrentContext();

          hideSelectorMenus();
          setLoadingTimeframeButton(currentTimeframe);
          refreshChartData({ priority: true, showUpdatingStatus: true });
          scheduleNextRefresh();
        });
      }

      if (exchangeSelectorMenuElement) {
        exchangeSelectorMenuElement.addEventListener("click", (event) => {
          const button = event.target.closest("[data-exchange]");
          if (!button) {
            return;
          }

          const nextExchange = button.dataset.exchange;
          if (!nextExchange || !validExchangeKeys.has(nextExchange) || nextExchange === currentExchangeKey) {
            hideSelectorMenus();
            return;
          }

          currentExchangeKey = nextExchange;
          enabledTimeframes = getEnabledTimeframesForExchange(currentExchangeKey);
          enabledQuoteCurrencies = getEnabledQuoteCurrenciesForExchange(currentExchangeKey);
          enabledPairs = getEnabledPairsForExchange(currentExchangeKey);
          applyEnabledTimeframesToUI();
          applyEnabledQuoteCurrenciesToUI();
          syncSettingsExchangeWithCurrentExchange();
          localStorage.setItem(exchangeStorageKey, currentExchangeKey);
          setPreferenceCookie("trade_wijs_exchange", currentExchangeKey);
          setActiveSelectorMenuItem(exchangeSelectorMenuElement, "data-exchange", currentExchangeKey);
          if (exchangeSelectorButtonElement) {
            exchangeSelectorButtonElement.textContent = (button.textContent || "").trim();
          }
          pendingRestoreLogicalRange = null;
          hasFitContent = false;
          syncActiveMarketTabFromCurrentContext();

          hideSelectorMenus();
          setLoadingTimeframeButton(currentTimeframe);
          refreshChartData({ priority: true, showUpdatingStatus: true });
          scheduleNextRefresh();
        });
      }

      if (indicatorButtonsElement) {
        indicatorButtonsElement.addEventListener("click", (event) => {
          const button = event.target.closest(".indicator-btn");
          if (!button) {
            return;
          }

          const indicatorName = button.dataset.indicator;
          if (!indicatorName || !(indicatorName in indicatorState)) {
            return;
          }

          if (indicatorName === "volume") {
            if (indicatorState.volume) {
              lastVolumeSplitRatio = chartSplitRatio;
            } else {
              chartSplitRatio = clamp(lastVolumeSplitRatio, 0, 1);
            }
          }

          if (indicatorName === "stoch") {
            if (indicatorState.stoch) {
              lastStochHeightRatio = stochHeightRatio;
            } else {
              stochHeightRatio = clamp(lastStochHeightRatio, 0, 1);
            }
          }

          if (indicatorName === "rsi") {
            if (indicatorState.rsi) {
              lastRsiHeightRatio = rsiHeightRatio;
            } else {
              rsiHeightRatio = clamp(lastRsiHeightRatio, 0, 1);
            }
          }

          const wasIndicatorActive = Boolean(indicatorState[indicatorName]);
          indicatorState[indicatorName] = !indicatorState[indicatorName];
          setIndicatorButtonState();
          redrawChart();
          applyChartSplit();
          updateScaleDividerLabel(false);
          updateStochDividerLabel(false);
          updateRsiDividerLabel(false);

          const activeIndicatorCount = Object.values(indicatorState).filter(Boolean).length;
          if (wasIndicatorActive && activeIndicatorCount === 0) {
            refreshChartData({ priority: true, showUpdatingStatus: true });
          }
        });
      }

      settingsGeneralItemTabElements.forEach((button) => {
        button.addEventListener("click", () => {
          const nextItem = button.dataset.settingsGeneralItem;
          if (!nextItem || nextItem === activeSettingsGeneralItem) {
            return;
          }

          setSettingsGeneralItem(nextItem);
        });
      });

      settingsDisplayThemeRadioElements.forEach((radioElement) => {
        radioElement.addEventListener("change", () => {
          if (!radioElement.checked) {
            return;
          }

          applyDisplayTheme(radioElement.value, { persist: true });
        });
      });

      if (settingsFactoryResetButtonElement) {
        settingsFactoryResetButtonElement.addEventListener("click", () => {
          const shouldReset = window.confirm(
            "Factory Reset clears all locally saved Trade Wijs data. Continue?",
          );
          if (!shouldReset) {
            return;
          }

          if (settingsFactoryResetStatusElement) {
            settingsFactoryResetStatusElement.textContent = "Resetting...";
          }

          clearTradeWijsStoredState();
          const defaultExchangeKey = validExchangeKeys.has("bybit")
            ? "bybit"
            : (Array.from(validExchangeKeys)[0] || "");

          if (defaultExchangeKey) {
            const availableQuoteCurrencies = Array.isArray(availableQuoteCurrenciesByExchange[defaultExchangeKey])
              ? availableQuoteCurrenciesByExchange[defaultExchangeKey]
              : Array.from(validQuoteCurrencies);
            const defaultQuoteCurrency = availableQuoteCurrencies.includes("USDT")
              ? "USDT"
              : (availableQuoteCurrencies.includes("USDC")
                ? "USDC"
                : (availableQuoteCurrencies.includes("EUR")
                  ? "EUR"
                  : (availableQuoteCurrencies[0] || "")));

            try {
              localStorage.setItem(enabledExchangesStorageKey, JSON.stringify([defaultExchangeKey]));
              localStorage.setItem(exchangeStorageKey, defaultExchangeKey);
              localStorage.setItem(settingsExchangeStorageKey, defaultExchangeKey);
              localStorage.setItem(chartSplitStorageKey, String(1 - minVisiblePaneHeightRatio));
              localStorage.setItem(stochSplitStorageKey, String(minVisiblePaneHeightRatio));
              localStorage.setItem(rsiSplitStorageKey, String(minVisiblePaneHeightRatio));
              if (defaultQuoteCurrency) {
                localStorage.setItem(
                  enabledQuoteCurrenciesStorageKey,
                  JSON.stringify({ [defaultExchangeKey]: [defaultQuoteCurrency] }),
                );
              }
            } catch (_error) {
            }

            setPreferenceCookie("trade_wijs_exchange", defaultExchangeKey);
          }

          window.location.assign("/");
        });
      }

      const removeHorizontalLineEntry = (lineEntry) => {
        if (!lineEntry || lineEntry.removed) {
          return;
        }

        if (contextMenuHorizontalLineEntry === lineEntry) {
          hideHorizontalLineContextMenu();
        }
        if (selectedHorizontalLineEntry === lineEntry) {
          selectedHorizontalLineEntry = null;
        }
        candleSeries.removePriceLine(lineEntry.priceLine);
        lineEntry.removed = true;
        const lineIndex = drawnLineSeries.indexOf(lineEntry);
        if (lineIndex !== -1) {
          drawnLineSeries.splice(lineIndex, 1);
        }
        syncHorizontalLineTestMeta();
        persistHorizontalLines();
        renderPaneScaleOverlay();
        renderSelectedHorizontalLineHandle();
      };

      const removeUndoActionsForLineEntry = (lineEntry) => {
        for (let index = drawingUndoStack.length - 1; index >= 0; index -= 1) {
          const undoAction = drawingUndoStack[index];
          if (undoAction && undoAction.type === "horizontal-line" && undoAction.lineEntry === lineEntry) {
            drawingUndoStack.splice(index, 1);
          }
        }
        updateUndoButtonState();
        persistDrawingUndoStack();
      };

      const removeTrendLineEntry = (lineEntry) => {
        if (!lineEntry || lineEntry.removed) {
          return;
        }

        if (contextMenuTrendLineEntry === lineEntry) {
          hideTrendLineContextMenu();
        }

        if (selectedTrendLineEntry === lineEntry) {
          setSelectedTrendLine(null);
        }

        chart.removeSeries(lineEntry.series);
        lineEntry.removed = true;
        const lineIndex = drawnTrendLineSeries.indexOf(lineEntry);
        if (lineIndex !== -1) {
          drawnTrendLineSeries.splice(lineIndex, 1);
        }

        syncTrendLineTestMeta();
        persistTrendLines();
        renderSelectedTrendLineHandles();
      };

      const removeUndoActionsForTrendLineEntry = (lineEntry) => {
        for (let index = drawingUndoStack.length - 1; index >= 0; index -= 1) {
          const undoAction = drawingUndoStack[index];
          if (undoAction && undoAction.type === "trend-line" && undoAction.lineEntry === lineEntry) {
            drawingUndoStack.splice(index, 1);
          }
        }
        updateUndoButtonState();
        persistDrawingUndoStack();
      };

      const handleDrawLineClick = (clickedPoint) => {
        if (!clickedPoint) {
          return;
        }

        if (!Number.isFinite(Number(clickedPoint.price))) {
          return;
        }

        clearHorizontalLineHoverPreview();
        const lineEntry = createHorizontalLineEntry(clickedPoint.price);
        if (!lineEntry) {
          return;
        }
        drawnLineSeries.push(lineEntry);
        setSelectedHorizontalLine(lineEntry);
        syncHorizontalLineTestMeta();
        persistHorizontalLines();
        renderPaneScaleOverlay();

        pushUndoAction({
          type: "horizontal-line",
          lineEntry,
          undo: () => {
            removeHorizontalLineEntry(lineEntry);
          },
        });

        if (drawnLineSeries.length > maxHorizontalLines) {
          const oldestLineEntry = drawnLineSeries[0];
          removeHorizontalLineEntry(oldestLineEntry);
          removeUndoActionsForLineEntry(oldestLineEntry);
        }

        setDrawLineMode(false);
        setRefreshStatus("Live", "is-live");
      };

      const handleTrendLineClick = (clickedPoint) => {
        if (!clickedPoint) {
          return;
        }

        if (!trendDrawAnchorPoint) {
          trendDrawAnchorPoint = clickedPoint;
          updateTrendLineHoverPreview(trendDrawAnchorPoint, clickedPoint);
          setRefreshStatus("Click second point for trend line", "is-updating");
          return;
        }

        const trendLineEntry = createTrendLineEntry(trendDrawAnchorPoint, clickedPoint);
        if (!trendLineEntry) {
          return;
        }

        drawnTrendLineSeries.push(trendLineEntry);
        setSelectedTrendLine(trendLineEntry);
        syncTrendLineTestMeta();
        persistTrendLines();

        pushUndoAction({
          type: "trend-line",
          lineEntry: trendLineEntry,
          undo: () => {
            removeTrendLineEntry(trendLineEntry);
          },
        });

        if (drawnTrendLineSeries.length > maxTrendLines) {
          const oldestLineEntry = drawnTrendLineSeries[0];
          removeTrendLineEntry(oldestLineEntry);
          removeUndoActionsForTrendLineEntry(oldestLineEntry);
        }

        clearTrendLineHoverPreview();
        setDrawLineMode(false);
        setRefreshStatus("Live", "is-live");
      };

      const drawCaptureOverlay = ensureDrawCaptureOverlayElement();
      ensureHorizontalLineContextMenuElement();
        ensureTrendLineContextMenuElement();
        ensureCandleOrderContextMenuElement();
      if (drawCaptureOverlay) {
        drawCaptureOverlay.addEventListener("mousemove", (event) => {
          if (!drawLineMode) {
            return;
          }

          if (activeDrawTool === "horizontal") {
            const hoveredPoint = resolveScreenPointFromCanvasClick(event);
            updateHorizontalLineHoverPreview(hoveredPoint);
            return;
          }

          if (activeDrawTool === "trend" && trendDrawAnchorPoint) {
            const hoveredPoint = resolveTrendPointFromCanvasClick(event);
            if (hoveredPoint) {
              updateTrendLineHoverPreview(trendDrawAnchorPoint, hoveredPoint);
            }
          }
        });

        drawCaptureOverlay.addEventListener("mouseleave", () => {
          if (!drawLineMode) {
            return;
          }

          if (activeDrawTool === "horizontal") {
            clearHorizontalLineHoverPreview();
            return;
          }

          if (activeDrawTool === "trend" && trendDrawAnchorPoint) {
            updateTrendLineHoverPreview(trendDrawAnchorPoint, trendDrawAnchorPoint);
          }
        });

        drawCaptureOverlay.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (!drawLineMode) {
            return;
          }

          if (activeDrawTool === "horizontal") {
            const clickedPoint = resolveScreenPointFromCanvasClick(event);
            if (!clickedPoint) {
              setRefreshStatus("Click in main price pane", "is-error");
              window.setTimeout(() => {
                if (drawLineMode && activeDrawTool === "horizontal") {
                  setRefreshStatus("Click chart: horizontal line", "is-updating");
                } else {
                  setRefreshStatus("Live", "is-live");
                }
              }, 900);
              return;
            }

            handleDrawLineClick(clickedPoint);
            return;
          }

          if (activeDrawTool === "trend") {
            const clickedPoint = resolveTrendPointFromCanvasClick(event);
            if (!clickedPoint) {
              setRefreshStatus("Click in main price pane", "is-error");
              window.setTimeout(() => {
                if (drawLineMode && activeDrawTool === "trend") {
                  setRefreshStatus("Click chart: trend line", "is-updating");
                } else {
                  setRefreshStatus("Live", "is-live");
                }
              }, 900);
              return;
            }

            handleTrendLineClick(clickedPoint);
          }
        });
      }

      if (chartCanvas) {
        chartCanvas.addEventListener("mousedown", (event) => {
          if (drawLineMode || event.button !== 0) {
            return;
          }

          const trendEndpointHandle = event.target instanceof HTMLElement
            ? event.target.closest(".trend-line-endpoint-handle")
            : null;
          if (trendEndpointHandle && selectedTrendLineEntry && !selectedTrendLineEntry.removed) {
            const endpoint = trendEndpointHandle.getAttribute("data-endpoint");
            if (endpoint === "start" || endpoint === "end") {
              draggedTrendLineEndpoint = endpoint;
              didDragTrendLineEndpoint = false;
              event.preventDefault();
              event.stopPropagation();
              return;
            }
          }

          if (
            horizontalLineContextMenuElement
            && event.target instanceof Node
            && horizontalLineContextMenuElement.contains(event.target)
          ) {
            return;
          }

          if (
            trendLineContextMenuElement
            && event.target instanceof Node
            && trendLineContextMenuElement.contains(event.target)
          ) {
            return;
          }

          hideHorizontalLineContextMenu();
          hideTrendLineContextMenu();
          hideCandleOrderContextMenu();

          const clickedPoint = resolveScreenPointFromCanvasClick(event);
          if (!clickedPoint) {
            setSelectedHorizontalLine(null);
            setSelectedTrendLine(null);
            return;
          }

          const nearestLineEntry = findNearestHorizontalLineEntry(clickedPoint.price);
          if (nearestLineEntry) {
            setSelectedTrendLine(null);
            setSelectedHorizontalLine(nearestLineEntry);
            draggedHorizontalLineEntry = nearestLineEntry;
            isDraggingHorizontalLine = true;
            didDragHorizontalLine = false;
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          const nearestTrendLineEntry = findNearestTrendLineEntry(clickedPoint);
          if (!nearestTrendLineEntry) {
            setSelectedHorizontalLine(null);
            setSelectedTrendLine(null);
            return;
          }

          setSelectedHorizontalLine(null);
          setSelectedTrendLine(nearestTrendLineEntry);
          const startX = chart.timeScale().timeToCoordinate(Number(nearestTrendLineEntry.startTime));
          const endX = chart.timeScale().timeToCoordinate(Number(nearestTrendLineEntry.endTime));
          const startY = candleSeries.priceToCoordinate(Number(nearestTrendLineEntry.startPrice));
          const endY = candleSeries.priceToCoordinate(Number(nearestTrendLineEntry.endPrice));
          if ([startX, endX, startY, endY].every((value) => Number.isFinite(Number(value)))) {
            draggedTrendLineEntry = nearestTrendLineEntry;
            draggedTrendLineState = {
              pointerX: Number(clickedPoint.xCoordinate),
              pointerY: Number(clickedPoint.yCoordinate),
              startX: Number(startX),
              startY: Number(startY),
              endX: Number(endX),
              endY: Number(endY),
            };
            didDragTrendLine = false;
          }
          event.preventDefault();
          event.stopPropagation();
        });

        chartCanvas.addEventListener("mousemove", (event) => {
          if (draggedTrendLineEndpoint && selectedTrendLineEntry && !drawLineMode) {
            const hoveredPoint = resolveTrendPointFromCanvasClick(event);
            if (!hoveredPoint) {
              return;
            }

            const didUpdate = updateTrendLineEntryEndpoint(selectedTrendLineEntry, draggedTrendLineEndpoint, hoveredPoint);
            if (didUpdate) {
              didDragTrendLineEndpoint = true;
              event.preventDefault();
              event.stopPropagation();
            }
            return;
          }

          if (draggedTrendLineEntry && draggedTrendLineState && !drawLineMode) {
            const hoveredPoint = resolveScreenPointFromCanvasClick(event);
            if (!hoveredPoint) {
              return;
            }

            const didUpdate = updateTrendLineEntryByDrag(
              draggedTrendLineEntry,
              draggedTrendLineState,
              Number(hoveredPoint.xCoordinate),
              Number(hoveredPoint.yCoordinate),
            );
            if (didUpdate) {
              didDragTrendLine = true;
              event.preventDefault();
              event.stopPropagation();
            }
            return;
          }

          if (isDraggingHorizontalLine && draggedHorizontalLineEntry && !drawLineMode) {
            const hoveredPoint = resolveScreenPointFromCanvasClick(event);
            if (!hoveredPoint || !Number.isFinite(Number(hoveredPoint.price))) {
              return;
            }

            const nextPrice = Number(hoveredPoint.price);
            draggedHorizontalLineEntry.price = nextPrice;
            draggedHorizontalLineEntry.priceLine.applyOptions({
              price: nextPrice,
            });
            applyHorizontalLineVisualState(draggedHorizontalLineEntry);
            didDragHorizontalLine = true;
            renderPaneScaleOverlay();
            renderSelectedHorizontalLineHandle();
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          if (!drawLineMode) {
            return;
          }

          if (activeDrawTool === "horizontal") {
            const hoveredPoint = resolveScreenPointFromCanvasClick(event);
            updateHorizontalLineHoverPreview(hoveredPoint);
            return;
          }

          if (activeDrawTool === "trend" && trendDrawAnchorPoint) {
            const hoveredPoint = resolveTrendPointFromCanvasClick(event);
            if (hoveredPoint) {
              updateTrendLineHoverPreview(trendDrawAnchorPoint, hoveredPoint);
            }
          }
        });

        chartCanvas.addEventListener("mouseleave", () => {
          if (!drawLineMode) {
            return;
          }

          if (activeDrawTool === "horizontal") {
            clearHorizontalLineHoverPreview();
            return;
          }

          if (activeDrawTool === "trend" && trendDrawAnchorPoint) {
            updateTrendLineHoverPreview(trendDrawAnchorPoint, trendDrawAnchorPoint);
          }
        });

        chartCanvas.addEventListener("contextmenu", (event) => {
          if (drawLineMode) {
            return;
          }

          const clickedPoint = resolveScreenPointFromCanvasClick(event);
          if (!clickedPoint) {
            hideHorizontalLineContextMenu();
            hideTrendLineContextMenu();
            return;
          }

          const nearestLineEntry = findNearestHorizontalLineEntry(clickedPoint.price);
          if (nearestLineEntry) {
            event.preventDefault();
            event.stopPropagation();
            setSelectedTrendLine(null);
            setSelectedHorizontalLine(nearestLineEntry);
            hideTrendLineContextMenu();
            hideCandleOrderContextMenu();
            showHorizontalLineContextMenu(nearestLineEntry, event);
            return;
          }

          const nearestTrendLineEntry = findNearestTrendLineEntry(clickedPoint);
          if (nearestTrendLineEntry) {
            event.preventDefault();
            event.stopPropagation();
            setSelectedHorizontalLine(null);
            setSelectedTrendLine(nearestTrendLineEntry);
            hideHorizontalLineContextMenu();
            hideCandleOrderContextMenu();
            showTrendLineContextMenu(nearestTrendLineEntry, event);
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          hideHorizontalLineContextMenu();
          hideTrendLineContextMenu();
          setSelectedHorizontalLine(null);
          setSelectedTrendLine(null);
          showCandleOrderContextMenu(clickedPoint, event);
        });
      }

      window.addEventListener("click", (event) => {
        const clickTarget = event.target;

        if (activeSelectorMenu) {
          const clickedInsidePair = Boolean(clickTarget instanceof Node
            && (pairSelectorButtonElement?.contains(clickTarget) || pairSelectorMenuElement?.contains(clickTarget)));
          const clickedInsideExchange = Boolean(clickTarget instanceof Node
            && (exchangeSelectorButtonElement?.contains(clickTarget) || exchangeSelectorMenuElement?.contains(clickTarget)));

          if (!clickedInsidePair && !clickedInsideExchange) {
            hideSelectorMenus();
          }
        }

        const isHorizontalMenuVisible = Boolean(
          horizontalLineContextMenuElement && horizontalLineContextMenuElement.classList.contains("is-visible"),
        );
        const isTrendMenuVisible = Boolean(
          trendLineContextMenuElement && trendLineContextMenuElement.classList.contains("is-visible"),
        );
        const isCandleOrderMenuVisible = Boolean(
          candleOrderContextMenuElement && candleOrderContextMenuElement.classList.contains("is-visible"),
        );

        if (!isHorizontalMenuVisible && !isTrendMenuVisible && !isCandleOrderMenuVisible) {
          return;
        }

        if (isHorizontalMenuVisible && clickTarget instanceof Node && horizontalLineContextMenuElement.contains(clickTarget)) {
          return;
        }

        if (isTrendMenuVisible && clickTarget instanceof Node && trendLineContextMenuElement.contains(clickTarget)) {
          return;
        }

        if (isCandleOrderMenuVisible && clickTarget instanceof Node && candleOrderContextMenuElement.contains(clickTarget)) {
          return;
        }

        hideHorizontalLineContextMenu();
        hideTrendLineContextMenu();
        hideCandleOrderContextMenu();
      });

      window.addEventListener("mouseup", () => {
        if (draggedTrendLineEndpoint) {
          draggedTrendLineEndpoint = null;
          if (didDragTrendLineEndpoint) {
            didDragTrendLineEndpoint = false;
            persistTrendLines();
            renderSelectedTrendLineHandles();
            setRefreshStatus("Trend line updated", "is-updating");
            window.setTimeout(() => {
              setRefreshStatus("Live", "is-live");
            }, 700);
          }
        }

        if (draggedTrendLineEntry) {
          draggedTrendLineEntry = null;
          draggedTrendLineState = null;
          if (didDragTrendLine) {
            didDragTrendLine = false;
            persistTrendLines();
            renderSelectedTrendLineHandles();
            setRefreshStatus("Trend line moved", "is-updating");
            window.setTimeout(() => {
              setRefreshStatus("Live", "is-live");
            }, 700);
          }
        }

        if (!isDraggingHorizontalLine) {
          return;
        }

        isDraggingHorizontalLine = false;
        draggedHorizontalLineEntry = null;
        if (didDragHorizontalLine) {
          persistHorizontalLines();
          renderPaneScaleOverlay();
          renderSelectedHorizontalLineHandle();
          setRefreshStatus("Horizontal line moved", "is-updating");
          window.setTimeout(() => {
            setRefreshStatus("Live", "is-live");
          }, 700);
        }
      });

      window.addEventListener("keydown", (event) => {
        if (isEditableTarget(event.target)) {
          return;
        }

        if (event.ctrlKey && (event.key === "d" || event.key === "D")) {
          if (duplicateSelectedHorizontalLine()) {
            event.preventDefault();
            setRefreshStatus("Horizontal line duplicated", "is-updating");
            window.setTimeout(() => {
              setRefreshStatus("Live", "is-live");
            }, 700);
            return;
          }

          if (duplicateSelectedTrendLine()) {
            event.preventDefault();
            setRefreshStatus("Trend line duplicated", "is-updating");
            window.setTimeout(() => {
              setRefreshStatus("Live", "is-live");
            }, 700);
          }
          return;
        }

        if (event.key === "Escape") {
          if (placeOrderModalElement?.classList.contains("is-visible")) {
            closePlaceOrderModal();
            return;
          }

          if (activeSelectorMenu) {
            hideSelectorMenus();
          }

          if (drawLineMode) {
            setDrawLineMode(false);
            setRefreshStatus("Live", "is-live");
            return;
          }

          if (horizontalLineContextMenuElement?.classList.contains("is-visible")) {
            hideHorizontalLineContextMenu();
          }

          if (trendLineContextMenuElement?.classList.contains("is-visible")) {
            hideTrendLineContextMenu();
          }

          if (selectedHorizontalLineEntry) {
            setSelectedHorizontalLine(null);
          }
          if (selectedTrendLineEntry) {
            setSelectedTrendLine(null);
          }
          return;
        }

        if (event.key === "Backspace" || event.key === "Delete") {
          if (selectedHorizontalLineEntry) {
            const lineToRemove = selectedHorizontalLineEntry;
            removeHorizontalLineEntry(lineToRemove);
            removeUndoActionsForLineEntry(lineToRemove);
            event.preventDefault();
            setRefreshStatus("Horizontal line removed", "is-updating");
            window.setTimeout(() => {
              setRefreshStatus("Live", "is-live");
            }, 700);
            return;
          }

          if (selectedTrendLineEntry) {
            const lineToRemove = selectedTrendLineEntry;
            removeTrendLineEntry(lineToRemove);
            removeUndoActionsForTrendLineEntry(lineToRemove);
            event.preventDefault();
            setRefreshStatus("Trend line removed", "is-updating");
            window.setTimeout(() => {
              setRefreshStatus("Live", "is-live");
            }, 700);
            return;
          }

          const hasUndoneAction = undoLastDrawingAction();
          if (hasUndoneAction) {
            event.preventDefault();
            setRefreshStatus("Undo applied", "is-updating");
            window.setTimeout(() => {
              setRefreshStatus("Live", "is-live");
            }, 700);
          }
        }
      });

      if (undoButtonElement) {
        undoButtonElement.addEventListener("click", () => {
          const hasUndoneAction = undoLastDrawingAction();
          if (!hasUndoneAction) {
            return;
          }

          setRefreshStatus("Undo applied", "is-updating");
          window.setTimeout(() => {
            setRefreshStatus("Live", "is-live");
          }, 700);
        });
      }

      if (drawLineButtonElement) {
        drawLineButtonElement.addEventListener("click", () => {
          const nextMode = !(drawLineMode && activeDrawTool === "horizontal");
          setDrawLineMode(nextMode, "horizontal");
          if (nextMode) {
            setRefreshStatus("Click chart: horizontal line", "is-updating");
          } else {
            setRefreshStatus("Live", "is-live");
          }
        });
      }

      if (trendLineButtonElement) {
        trendLineButtonElement.addEventListener("click", () => {
          const nextMode = !(drawLineMode && activeDrawTool === "trend");
          setDrawLineMode(nextMode, "trend");
          if (nextMode) {
            setRefreshStatus("Click chart: trend line", "is-updating");
          } else {
            setRefreshStatus("Live", "is-live");
          }
        });
      }

      if (timeframeSettingsButtonElement) {
        timeframeSettingsButtonElement.addEventListener("click", () => {
          setSettingsCategory("exchanges");
          setSettingsExchangeTab(currentExchangeKey);
          setAppViewMode("settings");
        });
      }

      if (indicatorSettingsButtonElement) {
        indicatorSettingsButtonElement.addEventListener("click", () => {
          setSettingsCategory("general");
          setSettingsGeneralItem("indicators");
          setAppViewMode("settings");
        });
      }

      if (scrollToRecentButtonElement) {
        scrollToRecentButtonElement.addEventListener("click", () => {
          chart.timeScale().scrollToRealTime();
          updateScrollToRecentButtonVisibility();
        });
      }

      if (rightPanelTabsElement) {
        rightPanelTabsElement.addEventListener("click", (event) => {
          const button = event.target.closest(".panel-tab");
          if (!button) {
            return;
          }

          const panelName = button.dataset.panel;
          if (!panelName) {
            return;
          }

          setRightPanelTab(panelName);
        });
      }

      if (marketTabsElement) {
        marketTabsElement.addEventListener("click", (event) => {
          const closeButton = event.target.closest("[data-market-tab-close-id]");
          if (closeButton) {
            event.preventDefault();
            event.stopPropagation();
            closeMarketTab(String(closeButton.dataset.marketTabCloseId || ""));
            return;
          }

          const tabButton = event.target.closest("[data-market-tab-id]");
          if (!tabButton) {
            return;
          }

          const tabId = String(tabButton.dataset.marketTabId || "");
          if (!tabId || tabId === activeMarketTabId) {
            return;
          }

          activateMarketTab(tabId, { refresh: true });
        });
      }

      if (marketTabAddButtonElement) {
        marketTabAddButtonElement.addEventListener("click", () => {
          addMarketTab({
            exchangeKey: currentExchangeKey,
            symbol: currentSymbol,
            timeframe: currentTimeframe,
          }, {
            activate: true,
            refresh: false,
          });
        });
      }

      if (orderSellButtonElement) {
        orderSellButtonElement.addEventListener("click", () => {
          setOrderActionSide("sell");
        });
      }

      if (orderBuyButtonElement) {
        orderBuyButtonElement.addEventListener("click", () => {
          setOrderActionSide("buy");
        });
      }

      if (settingsToggleTimeframesButtonElement) {
        settingsToggleTimeframesButtonElement.addEventListener("click", () => {
          toggleAllTimeframesForActiveExchange();
          if (settingsSaveStatusElement) {
            settingsSaveStatusElement.textContent = "Timeframes updated";
          }
        });
      }

      if (settingsToggleQuoteCurrenciesButtonElement) {
        settingsToggleQuoteCurrenciesButtonElement.addEventListener("click", () => {
          toggleAllQuoteCurrenciesForActiveExchange();
          if (settingsSaveStatusElement) {
            settingsSaveStatusElement.textContent = "Quote currencies updated";
          }
        });
      }

      if (settingsTogglePairsButtonElement) {
        settingsTogglePairsButtonElement.addEventListener("click", () => {
          toggleAllPairsForActiveExchange();
          if (settingsSaveStatusElement) {
            settingsSaveStatusElement.textContent = "Pairs updated";
          }
        });
      }

      if (placeOrderButtonElement) {
        placeOrderButtonElement.addEventListener("click", () => {
          submitPaperOrder();
        });
      }

      if (paperTradeResetExchangeButtonElement) {
        paperTradeResetExchangeButtonElement.addEventListener("click", () => {
          resetPaperTradeState({ resetAll: false });
        });
      }

      if (paperTradeResetAllButtonElement) {
        paperTradeResetAllButtonElement.addEventListener("click", () => {
          resetPaperTradeState({ resetAll: true });
        });
      }

      if (placeOrderModalCloseButtonElement) {
        placeOrderModalCloseButtonElement.addEventListener("click", () => {
          closePlaceOrderModal();
        });
      }

      if (placeOrderModalElement) {
        placeOrderModalElement.addEventListener("click", (event) => {
          if (event.target === placeOrderModalElement) {
            closePlaceOrderModal();
          }
        });
      }

      if (orderPriceInputElement && orderFillButtonElements.length > 0) {
        const marketValueBySource = {
          bid: valueBidElement,
          ask: valueAskElement,
          last: valueLastElement,
        };

        orderFillButtonElements.forEach((button) => {
          button.addEventListener("click", () => {
            const source = button.dataset.orderFillSource;
            if (!source) {
              return;
            }

            const target = button.dataset.orderFillTarget === "stop" ? "stop" : "price";
            const targetInputElement = target === "stop" ? orderStopPriceInputElement : orderPriceInputElement;
            if (!targetInputElement) {
              return;
            }

            const sourceElement = marketValueBySource[source];
            const parsedValue = parseMarketPriceValue(sourceElement?.textContent || "");
            if (!Number.isFinite(parsedValue)) {
              return;
            }

            const snappedValue = snapOrderPriceToTick(parsedValue);
            const normalizedValue = Number.isFinite(snappedValue) ? snappedValue : parsedValue;
            const formattedValue = formatOrderPriceInputValue(normalizedValue);
            if (!formattedValue) {
              return;
            }

            if (String(targetInputElement.value || "").trim() === formattedValue) {
              return;
            }

            if (target === "price" && orderTotalInputElement && String(orderTotalInputElement.value || "").trim().length === 0) {
              const defaultTotalValue = getDefaultOrderTotalAutofillValue();
              const formattedTotalValue = formatOrderTotalInputValue(defaultTotalValue);
              if (formattedTotalValue) {
                orderTotalInputElement.value = formattedTotalValue;
              }
            }

            targetInputElement.value = formattedValue;
            targetInputElement.dispatchEvent(new Event("input", { bubbles: true }));
          });
        });
      }

      if (orderTypeInputElements.length > 0) {
        orderTypeInputElements.forEach((inputElement) => {
          inputElement.addEventListener("change", () => {
            applyOrderTypeInputsVisibility();
            validateOrderPriceLimits();
            validateStopPriceLimits();
            updateOrderTotalFromAmount();
            updateOrderActionButtonsState();
          });
        });
      }

      if (orderAmountLockButtonElement) {
        orderAmountLockButtonElement.addEventListener("click", () => {
          setLockedOrderValueField(lockedOrderValueField === "amount" ? "total" : "amount");
        });
      }

      if (orderTotalLockButtonElement) {
        orderTotalLockButtonElement.addEventListener("click", () => {
          setLockedOrderValueField(lockedOrderValueField === "total" ? "amount" : "total");
        });
      }

      if (orderAmountInputElement) {
        orderAmountInputElement.addEventListener("input", () => {
          validateOrderAmountMinimum();
          updateOrderTotalFromAmount();
        });

        orderAmountInputElement.addEventListener("blur", () => {
          const parsedAmount = parseOrderInputNumber(orderAmountInputElement);
          if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return;
          }

          const alignedAmount = alignAmountToStep(parsedAmount);
          const formattedAmount = formatOrderAmountInputValue(alignedAmount);
          if (!formattedAmount || String(orderAmountInputElement.value || "").trim() === formattedAmount) {
            return;
          }

          orderAmountInputElement.value = formattedAmount;
          orderAmountInputElement.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }

      if (orderPriceInputElement) {
        orderPriceInputElement.addEventListener("input", () => {
          if (lockedOrderValueField === "total") {
            updateOrderAmountFromTotal();
            return;
          }

          updateOrderTotalFromAmount();
        });

        orderPriceInputElement.addEventListener("blur", () => {
          if (!isLimitPriceRequiredOrderTypeSelected()) {
            return;
          }

          const parsedPrice = parseOrderInputNumber(orderPriceInputElement);
          if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            return;
          }

          const snappedPrice = snapOrderPriceToTick(parsedPrice);
          const formattedPrice = formatOrderPriceInputValue(snappedPrice);
          if (!formattedPrice || String(orderPriceInputElement.value || "").trim() === formattedPrice) {
            return;
          }

          orderPriceInputElement.value = formattedPrice;
          orderPriceInputElement.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }

      if (orderStopPriceInputElement) {
        orderStopPriceInputElement.addEventListener("input", () => {
          validateStopPriceLimits();
          renderChartOrderPreview();
        });

        orderStopPriceInputElement.addEventListener("blur", () => {
          const parsedStopPrice = parseOrderInputNumber(orderStopPriceInputElement);
          if (!Number.isFinite(parsedStopPrice) || parsedStopPrice <= 0) {
            return;
          }

          const snappedStopPrice = snapOrderPriceToTick(parsedStopPrice);
          const formattedStopPrice = formatOrderPriceInputValue(snappedStopPrice);
          if (!formattedStopPrice || String(orderStopPriceInputElement.value || "").trim() === formattedStopPrice) {
            return;
          }

          orderStopPriceInputElement.value = formattedStopPrice;
          orderStopPriceInputElement.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }

      if (orderTotalInputElement) {
        orderTotalInputElement.addEventListener("input", () => {
          updateOrderAmountFromTotal();
        });

        orderTotalInputElement.addEventListener("blur", () => {
          const parsedTotal = parseOrderInputNumber(orderTotalInputElement);
          if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
            return;
          }

          const formattedTotal = formatOrderTotalInputValue(parsedTotal);
          if (!formattedTotal || String(orderTotalInputElement.value || "").trim() === formattedTotal) {
            return;
          }

          orderTotalInputElement.value = formattedTotal;
          orderTotalInputElement.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }

      if (rightPanelToggleButtonElement) {
        rightPanelToggleButtonElement.addEventListener("click", () => {
          setRightPanelCollapsed(!isRightPanelCollapsed);
        });
      }

      if (leftMenuTradeButtonElement) {
        leftMenuTradeButtonElement.addEventListener("click", () => {
          setAppViewMode("trade");
        });
      }

      if (leftMenuSettingsButtonElement) {
        leftMenuSettingsButtonElement.addEventListener("click", () => {
          setAppViewMode("settings");
        });
      }

      if (settingsPanelElement) {
        const deferSettingsUpdate = (callback) => {
          window.requestAnimationFrame(() => {
            window.setTimeout(callback, 0);
          });
        };

        settingsPanelElement.addEventListener("click", (event) => {
          const categoryButton = event.target.closest("[data-settings-category]");
          if (categoryButton) {
            const category = categoryButton.dataset.settingsCategory;
            if (category) {
              setSettingsCategory(category);
            }
            return;
          }

          const tabButton = event.target.closest("[data-settings-exchange]");
          if (!tabButton) {
            return;
          }

          const exchangeKey = tabButton.dataset.settingsExchange;
          if (!exchangeKey) {
            return;
          }

          setSettingsExchangeTab(exchangeKey);
        });

        settingsPanelElement.addEventListener("change", (event) => {
          const checkbox = event.target.closest("[data-settings-enabled-exchange]");
          if (checkbox) {
            const selectedExchangeKeys = settingsExchangeToggleElements
              .filter((element) => element.checked)
              .map((element) => element.dataset.settingsEnabledExchange)
              .filter(Boolean);

            if (selectedExchangeKeys.length === 0) {
              checkbox.checked = true;
              if (settingsSaveStatusElement) {
                settingsSaveStatusElement.textContent = "Select at least one exchange";
              }
              return;
            }

            deferSettingsUpdate(() => {
              setEnabledExchanges(selectedExchangeKeys);
            });
            if (settingsSaveStatusElement) {
              settingsSaveStatusElement.textContent = "Exchanges updated";
            }
            return;
          }

          const timeframeCheckbox = event.target.closest("[data-settings-enabled-timeframe]");
          if (timeframeCheckbox) {
            const selectedTimeframes = settingsTimeframeToggleElements
              .filter((element) => element.checked)
              .map((element) => element.dataset.settingsEnabledTimeframe)
              .filter(Boolean);

            if (selectedTimeframes.length === 0) {
              timeframeCheckbox.checked = true;
              if (settingsSaveStatusElement) {
                settingsSaveStatusElement.textContent = "Select at least one timeframe";
              }
              return;
            }

            deferSettingsUpdate(() => {
              setEnabledTimeframes(selectedTimeframes, { exchangeKey: activeSettingsExchangeKey });
            });
            if (settingsSaveStatusElement) {
              settingsSaveStatusElement.textContent = "Timeframes updated";
            }
            return;
          }

          const quoteCurrencyCheckbox = event.target.closest("[data-settings-enabled-quote-currency]");
          if (quoteCurrencyCheckbox) {
            const selectedQuoteCurrencies = settingsQuoteCurrencyToggleElements
              .filter((element) => element.checked)
              .map((element) => element.dataset.settingsEnabledQuoteCurrency)
              .filter(Boolean);

            if (selectedQuoteCurrencies.length === 0) {
              quoteCurrencyCheckbox.checked = true;
              if (settingsSaveStatusElement) {
                settingsSaveStatusElement.textContent = "Select at least one quote currency";
              }
              return;
            }

            deferSettingsUpdate(() => {
              setEnabledQuoteCurrencies(selectedQuoteCurrencies, { exchangeKey: activeSettingsExchangeKey });
            });
            if (settingsSaveStatusElement) {
              settingsSaveStatusElement.textContent = "Quote currencies updated";
            }
            return;
          }

          const pairCheckbox = event.target.closest("[data-settings-enabled-pair]");
          if (pairCheckbox) {
            const selectedPairs = settingsPairToggleElements
              .filter((element) => element.checked)
              .map((element) => element.dataset.settingsEnabledPair)
              .filter(Boolean);

            if (selectedPairs.length === 0) {
              pairCheckbox.checked = true;
              if (settingsSaveStatusElement) {
                settingsSaveStatusElement.textContent = "Select at least one pair";
              }
              return;
            }

            deferSettingsUpdate(() => {
              setEnabledPairs(selectedPairs, { exchangeKey: activeSettingsExchangeKey });
            });
            if (settingsSaveStatusElement) {
              settingsSaveStatusElement.textContent = "Pairs updated";
            }
            return;
          }

          const indicatorCheckbox = event.target.closest("[data-settings-enabled-indicator]");
          if (indicatorCheckbox) {
            const selectedIndicators = settingsIndicatorToggleElements
              .filter((element) => element.checked)
              .map((element) => element.dataset.settingsEnabledIndicator)
              .filter(Boolean);

            if (selectedIndicators.length === 0) {
              indicatorCheckbox.checked = true;
              if (settingsSaveStatusElement) {
                settingsSaveStatusElement.textContent = "Select at least one indicator";
              }
              return;
            }

            deferSettingsUpdate(() => {
              setEnabledIndicators(selectedIndicators);
            });
            if (settingsSaveStatusElement) {
              settingsSaveStatusElement.textContent = "Indicators updated";
            }
            return;
          }

          const toolCheckbox = event.target.closest("[data-settings-enabled-tool]");
          if (toolCheckbox) {
            const selectedTools = settingsToolToggleElements
              .filter((element) => element.checked)
              .map((element) => element.dataset.settingsEnabledTool)
              .filter(Boolean);

            if (selectedTools.length === 0) {
              toolCheckbox.checked = true;
              if (settingsSaveStatusElement) {
                settingsSaveStatusElement.textContent = "Select at least one tool";
              }
              return;
            }

            deferSettingsUpdate(() => {
              setEnabledTools(selectedTools);
            });
            if (settingsSaveStatusElement) {
              settingsSaveStatusElement.textContent = "Tools updated";
            }
          }
        });
      }

      if (settingsSaveButtonElement) {
        settingsSaveButtonElement.addEventListener("click", () => {
          exchangeApiSettings[activeSettingsExchangeKey] = {
            apiKey: settingsApiKeyElement?.value || "",
            apiSecret: settingsApiSecretElement?.value || "",
            passphrase: settingsApiPassphraseElement?.value || "",
          };

          try {
            localStorage.setItem(exchangeApiSettingsStorageKey, JSON.stringify(exchangeApiSettings));
            if (settingsSaveStatusElement) {
              settingsSaveStatusElement.textContent = "Saved";
            }
          } catch (_error) {
            if (settingsSaveStatusElement) {
              settingsSaveStatusElement.textContent = "Save failed";
            }
          }
        });
      }

      if (marketInfoToggleButtonElement) {
        marketInfoToggleButtonElement.addEventListener("click", () => {
          setMarketInfoCollapsed(!isMarketInfoCollapsed);
        });
      }

      if (chartFooterElement) {
        chartFooterElement.style.justifyContent = "space-between";
      }

      if (currentPriceCountdownIntervalId === null) {
        currentPriceCountdownIntervalId = window.setInterval(() => {
          renderPaneScaleOverlay();
        }, 1000);
      }

      if (liveQuotePollIntervalId === null) {
        liveQuotePollIntervalId = window.setInterval(() => {
          refreshLiveQuote();
        }, LIVE_QUOTE_POLL_INTERVAL_MS);
      }

      window.addEventListener("beforeunload", () => {
        if (currentPriceCountdownIntervalId !== null) {
          window.clearInterval(currentPriceCountdownIntervalId);
          currentPriceCountdownIntervalId = null;
        }

        if (liveQuotePollIntervalId !== null) {
          window.clearInterval(liveQuotePollIntervalId);
          liveQuotePollIntervalId = null;
        }
      });

      redrawChart();
      restoreHorizontalLines();
      restoreTrendLines();
      restoreDrawingUndoStack();
      setSelectedHorizontalLine(null);
      setSelectedTrendLine(null);
      syncHorizontalLineTestMeta();
      syncTrendLineTestMeta();
      applyChartSplit();
      updateScaleDividerLabel(false);
      updateStochDividerLabel(false);
      updateRsiDividerLabel(false);
      applyEnabledTimeframesToUI();
      applyEnabledQuoteCurrenciesToUI();
      applyEnabledPairsToUI();
      applyPairSelectorQuoteCurrencyFilter({ syncCurrentSymbol: false, persistSymbol: false });
      initializeMarketTabs();
      applyEnabledIndicatorsToUI();
      applyEnabledToolsToUI();
      applyDisplayTheme(activeDisplayTheme, { persist: false });
      setActiveTimeframeButton(currentTimeframe);
      setIndicatorButtonState();
      setRightPanelTab("order");
      setRightPanelCollapsed(isRightPanelCollapsed);
      setMarketInfoCollapsed(isMarketInfoCollapsed);
      applyEnabledExchangesToUI();
      setSettingsExchangeTab(activeSettingsExchangeKey);
      setSettingsGeneralItem(activeSettingsGeneralItem);
      setSettingsCategory(activeSettingsCategory);
      setAppViewMode(currentAppViewMode);
      setDrawLineMode(false);
      updateUndoButtonState();
      setLoadingTimeframeButton(null);
      setRefreshStatus("Live", "is-live");
      updateScrollToRecentButtonVisibility();
      setOrderActionSide("buy");
      updateOrderInputQuoteCurrency();
      renderOrderValueLocks();
      applyOrderTypeInputsVisibility();
      validateStopPriceLimits();
      updateOrderActionButtonsState();
      refreshPaperTradeState();
      if (shouldInitialTimeframeRefresh) {
        refreshChartData({ priority: true });
      }
      scheduleNextRefresh();
    })();
