"""Trade wijs shared configuration constants."""

import ccxt

MAX_CANDLES = 5000
CACHE_TTL_SECONDS = 20
SYMBOL_VOLUME_CACHE_TTL_SECONDS = 120
EXCHANGE_CACHE_TTL_SECONDS = 300
DEFAULT_SUPPORTED_TIMEFRAMES = ("1m", "3m", "5m", "15m", "1h", "4h", "1d", "1w", "1M")
SUPPORTED_EXCHANGES = {
    exchange_id: {
        "label": exchange_id.replace("-", " ").replace("_", " ").title(),
        "ccxt_id": exchange_id,
    }
    for exchange_id in sorted(getattr(ccxt, "exchanges", []))
    if isinstance(exchange_id, str) and exchange_id
}
if "bybit" in SUPPORTED_EXCHANGES:
    SUPPORTED_EXCHANGES["bybit"]["label"] = "Bybit"
if "binance" in SUPPORTED_EXCHANGES:
    SUPPORTED_EXCHANGES["binance"]["label"] = "Binance"
if not SUPPORTED_EXCHANGES:
    SUPPORTED_EXCHANGES = {
        "bybit": {
            "label": "Bybit",
            "ccxt_id": "bybit",
        },
        "binance": {
            "label": "Binance",
            "ccxt_id": "binance",
        },
    }

DEFAULT_EXCHANGE_KEY = (
    "bybit"
    if "bybit" in SUPPORTED_EXCHANGES
    else next(iter(SUPPORTED_EXCHANGES.keys()))
)
DEFAULT_SUPPORTED_SYMBOLS = (
    "BTC/USDT",
    "BTC/USDC",
    "BTC/EUR",
    "ETH/USDT",
    "SOL/USDT",
)
DEFAULT_PRICE_MIN = 0.01
DEFAULT_PRICE_MAX = 1_000_000
MARKET_SNAPSHOT_MAX_AGE_SECONDS = 5
EXCHANGE_SETTINGS_MAX_AGE_SECONDS = 120
CHART_PAYLOAD_MAX_AGE_SECONDS = 15
