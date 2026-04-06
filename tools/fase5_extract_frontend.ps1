$ErrorActionPreference = "Stop"

$templatePath = "templates/index.html"
$jsPath = "static/js/index-app.js"

if (!(Test-Path $templatePath)) {
    throw "Template file not found: $templatePath"
}

$null = New-Item -ItemType Directory -Path "static/js" -Force

$lines = Get-Content $templatePath

$candlesIndex = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '<script id="candles-data"') {
        $candlesIndex = $i
        break
    }
}
if ($candlesIndex -lt 0) {
    throw "Could not find candles-data script block"
}

$inlineStartIndex = -1
for ($i = $candlesIndex + 1; $i -lt $lines.Length; $i++) {
    if ($lines[$i].Trim() -eq "<script>") {
        $inlineStartIndex = $i
        break
    }
}
if ($inlineStartIndex -lt 0) {
    throw "Could not find inline script start after candles-data"
}

$inlineEndIndex = -1
for ($i = $inlineStartIndex + 1; $i -lt $lines.Length; $i++) {
    if ($lines[$i].Trim() -eq "</script>") {
        $inlineEndIndex = $i
        break
    }
}
if ($inlineEndIndex -lt 0) {
    throw "Could not find inline script end"
}

$scriptLines = $lines[($inlineStartIndex + 1)..($inlineEndIndex - 1)]
$scriptText = [string]::Join("`n", $scriptLines)

$scriptText = $scriptText.Replace('(function () {', @'
(function () {
      const bootstrapElement = document.getElementById("trade-wijs-bootstrap");
      const bootstrap = bootstrapElement ? JSON.parse(bootstrapElement.textContent || "{}") : {};
'@)

$scriptText = $scriptText.Replace('let currentTimeframe = {{ market_data.timeframe | tojson }};', 'let currentTimeframe = bootstrap.timeframe || "1m";')
$scriptText = $scriptText.Replace('let currentSymbol = {{ market_data.symbol | tojson }};', 'let currentSymbol = bootstrap.symbol || "BTC/USDT";')
$scriptText = $scriptText.Replace('let currentDisplaySymbol = {{ market_data.display_symbol | tojson }};', 'let currentDisplaySymbol = bootstrap.display_symbol || "BTCUSDT";')
$scriptText = $scriptText.Replace('let currentExchangeKey = {{ market_data.exchange_key | tojson }};', 'let currentExchangeKey = bootstrap.exchange_key || "binance";')
$scriptText = $scriptText.Replace('let currentExchangeLabel = {{ market_data.exchange | tojson }};', 'let currentExchangeLabel = bootstrap.exchange || "Binance";')
$scriptText = $scriptText.Replace('const horizontalLineStorageKey = "trade-wijs-horizontal-lines:{{ market_data.display_symbol|replace('' '', ''_'') }}";', 'const horizontalLineStorageKey = `trade-wijs-horizontal-lines:${bootstrap.display_symbol_storage_key || currentDisplaySymbol.replace(/\s+/g, "_")}`;')
$scriptText = $scriptText.Replace('const trendLineStorageKey = "trade-wijs-trend-lines:{{ market_data.display_symbol|replace('' '', ''_'') }}";', 'const trendLineStorageKey = `trade-wijs-trend-lines:${bootstrap.display_symbol_storage_key || currentDisplaySymbol.replace(/\s+/g, "_")}`;')
$scriptText = $scriptText.Replace('const drawingUndoStackStorageKey = "trade-wijs-drawing-undo-stack:{{ market_data.display_symbol|replace('' '', ''_'') }}";', 'const drawingUndoStackStorageKey = `trade-wijs-drawing-undo-stack:${bootstrap.display_symbol_storage_key || currentDisplaySymbol.replace(/\s+/g, "_")}`;')

$scriptText = $scriptText.Replace('amount_step: {{ (market_data.amount_step or '''') | tojson }},', 'amount_step: bootstrap.market_data?.amount_step,')
$scriptText = $scriptText.Replace('amount_min: {{ (market_data.amount_min if market_data.amount_min is not none else '''') | tojson }},', 'amount_min: bootstrap.market_data?.amount_min,')
$scriptText = $scriptText.Replace('total_min: {{ (market_data.total_min if market_data.total_min is not none else '''') | tojson }},', 'total_min: bootstrap.market_data?.total_min,')
$scriptText = $scriptText.Replace('price_min: {{ (market_data.price_min if market_data.price_min is not none else '''') | tojson }},', 'price_min: bootstrap.market_data?.price_min,')
$scriptText = $scriptText.Replace('price_max: {{ (market_data.price_max if market_data.price_max is not none else '''') | tojson }},', 'price_max: bootstrap.market_data?.price_max,')
$scriptText = $scriptText.Replace('price_step: {{ (market_data.price_step or '''') | tojson }},', 'price_step: bootstrap.market_data?.price_step,')
$scriptText = $scriptText.Replace('amount_precision: {{ (market_data.amount_precision if market_data.amount_precision is not none else '''') | tojson }},', 'amount_precision: bootstrap.market_data?.amount_precision,')
$scriptText = $scriptText.Replace('price_precision: {{ (market_data.price_precision if market_data.price_precision is not none else '''') | tojson }},', 'price_precision: bootstrap.market_data?.price_precision,')
$scriptText = $scriptText.Replace('last: {{ (market_data.last if market_data.last is not none else '''') | tojson }},', 'last: bootstrap.market_data?.last,')
$scriptText = $scriptText.Replace('bid: {{ (market_data.bid if market_data.bid is not none else '''') | tojson }},', 'bid: bootstrap.market_data?.bid,')
$scriptText = $scriptText.Replace('ask: {{ (market_data.ask if market_data.ask is not none else '''') | tojson }},', 'ask: bootstrap.market_data?.ask,')
$scriptText = $scriptText.Replace('high: {{ (market_data.high if market_data.high is not none else '''') | tojson }},', 'high: bootstrap.market_data?.high,')
$scriptText = $scriptText.Replace('low: {{ (market_data.low if market_data.low is not none else '''') | tojson }},', 'low: bootstrap.market_data?.low,')
$scriptText = $scriptText.Replace('quote_volume: {{ (market_data.quote_volume if market_data.quote_volume is not none else '''') | tojson }},', 'quote_volume: bootstrap.market_data?.quote_volume,')
$scriptText = $scriptText.Replace('quote_volume_compact: {{ (market_data.quote_volume_compact or '''') | tojson }},', 'quote_volume_compact: bootstrap.market_data?.quote_volume_compact,')
$scriptText = $scriptText.Replace('timestamp: {{ (market_data.timestamp or '''') | tojson }},', 'timestamp: bootstrap.market_data?.timestamp,')
$scriptText = $scriptText.Replace('timestamp_unix: {{ (market_data.timestamp_unix if market_data.timestamp_unix is not none else '''') | tojson }},', 'timestamp_unix: bootstrap.market_data?.timestamp_unix,')
$scriptText = $scriptText.Replace('error: {{ (market_data.error or '''') | tojson }},', 'error: bootstrap.market_data?.error,')

Set-Content -Path $jsPath -Value $scriptText -Encoding UTF8

$before = $lines[0..$candlesIndex]
$after = $lines[($inlineEndIndex + 1)..($lines.Length - 1)]

$injected = @(
'  <script id="trade-wijs-bootstrap" type="application/json">',
'    {{ {',
'      "timeframe": market_data.timeframe,',
'      "symbol": market_data.symbol,',
'      "display_symbol": market_data.display_symbol,',
'      "exchange_key": market_data.exchange_key,',
'      "exchange": market_data.exchange,',
'      "display_symbol_storage_key": market_data.display_symbol|replace(" ", "_"),',
'      "market_data": {',
'        "amount_step": (market_data.amount_step if market_data.amount_step is not none else ""),',
'        "amount_min": (market_data.amount_min if market_data.amount_min is not none else ""),',
'        "total_min": (market_data.total_min if market_data.total_min is not none else ""),',
'        "price_min": (market_data.price_min if market_data.price_min is not none else ""),',
'        "price_max": (market_data.price_max if market_data.price_max is not none else ""),',
'        "price_step": (market_data.price_step if market_data.price_step is not none else ""),',
'        "amount_precision": (market_data.amount_precision if market_data.amount_precision is not none else ""),',
'        "price_precision": (market_data.price_precision if market_data.price_precision is not none else ""),',
'        "last": (market_data.last if market_data.last is not none else ""),',
'        "bid": (market_data.bid if market_data.bid is not none else ""),',
'        "ask": (market_data.ask if market_data.ask is not none else ""),',
'        "high": (market_data.high if market_data.high is not none else ""),',
'        "low": (market_data.low if market_data.low is not none else ""),',
'        "quote_volume": (market_data.quote_volume if market_data.quote_volume is not none else ""),',
'        "quote_volume_compact": (market_data.quote_volume_compact if market_data.quote_volume_compact is not none else ""),',
'        "timestamp": (market_data.timestamp if market_data.timestamp is not none else ""),',
'        "timestamp_unix": (market_data.timestamp_unix if market_data.timestamp_unix is not none else ""),',
'        "error": (market_data.error if market_data.error is not none else "")',
'      }',
'    } | tojson }}',
'  </script>',
'  <script src="{{ url_for(''static'', filename=''js/index-app.js'') }}"></script>'
)

$newLines = @()
$newLines += $before
$newLines += $injected
$newLines += $after
Set-Content -Path $templatePath -Value $newLines -Encoding UTF8

Write-Host "Extracted inline script into $jsPath"
