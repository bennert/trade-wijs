""" Trade wijs web app main module. """
from datetime import datetime, timezone
import math
import os
import re
import subprocess
import time
from urllib.parse import unquote

import ccxt
from flask import Flask, jsonify, make_response, render_template, request

from db_cache import (
    get_chart_payload,
    get_exchange_settings_payload,
    get_market_snapshot,
    is_enabled as is_db_cache_enabled,
    upsert_chart_payload,
    upsert_exchange_settings_payload,
    upsert_market_snapshot,
)

app = Flask(__name__)

MAX_CANDLES = 5000
CACHE_TTL_SECONDS = 20
_ohlcv_cache = {}
SYMBOL_VOLUME_CACHE_TTL_SECONDS = 120
_symbol_volume_cache = {}
EXCHANGE_CACHE_TTL_SECONDS = 300
_exchange_cache = {}
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
    SUPPORTED_EXCHANGES["bybit"]["label"] = "Bybit Global"
if "binance" in SUPPORTED_EXCHANGES:
    SUPPORTED_EXCHANGES["binance"]["label"] = "Binance"
if not SUPPORTED_EXCHANGES:
    SUPPORTED_EXCHANGES = {
        "bybit": {
            "label": "Bybit Global",
            "ccxt_id": "bybit",
        },
        "binance": {
            "label": "Binance",
            "ccxt_id": "binance",
        },
    }
DEFAULT_EXCHANGE_KEY = "bybit" if "bybit" in SUPPORTED_EXCHANGES else next(iter(SUPPORTED_EXCHANGES.keys()))
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


def _get_cached_exchange(exchange_key):
    selected_exchange_key = _normalize_exchange(exchange_key)
    selected_exchange = SUPPORTED_EXCHANGES[selected_exchange_key]
    now = time.monotonic()
    cached = _exchange_cache.get(selected_exchange_key)

    if cached and (now - cached["loaded_at"] < EXCHANGE_CACHE_TTL_SECONDS):
        return cached["exchange"]

    exchange_class = getattr(ccxt, selected_exchange["ccxt_id"])
    try:
        exchange = exchange_class({"enableRateLimit": True})
        exchange.load_markets()
    except (
        ccxt.RequestTimeout,
        ccxt.NetworkError,
        ccxt.ExchangeNotAvailable,
        ccxt.BadSymbol,
        ccxt.ExchangeError,
        OSError,
    ):
        # Keep serving with stale markets when a refresh fails.
        if cached:
            return cached["exchange"]
        raise

    _exchange_cache[selected_exchange_key] = {
        "loaded_at": now,
        "exchange": exchange,
    }
    return exchange


def _normalize_quote_currency_candidate(value):
    if not isinstance(value, str):
        return None

    token = value.strip().upper()
    if not token:
        return None

    # Drop CCXT derivatives suffixes like USDT:USDT and keep ticker-like characters only.
    token = token.split(":", 1)[0].strip()
    token = re.sub(r"[^A-Z0-9._-]", "", token)
    return token or None


def _extract_quote_currency_from_symbol(symbol):
    if not isinstance(symbol, str):
        return None

    normalized_symbol = symbol.strip().upper()
    if not normalized_symbol:
        return None

    if "/" in normalized_symbol:
        return _normalize_quote_currency_candidate(normalized_symbol.split("/", 1)[1])

    if "-" in normalized_symbol:
        return _normalize_quote_currency_candidate(normalized_symbol.rsplit("-", 1)[1])

    return None


def _extract_base_currency_from_symbol(symbol):
    if not isinstance(symbol, str):
        return None

    normalized_symbol = symbol.strip().upper()
    if not normalized_symbol:
        return None

    if "/" in normalized_symbol:
        return _normalize_quote_currency_candidate(normalized_symbol.split("/", 1)[0])

    if "-" in normalized_symbol:
        return _normalize_quote_currency_candidate(normalized_symbol.rsplit("-", 1)[0])

    return None


def _format_number_for_input(value):
    if value is None:
        return None

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    if not math.isfinite(number) or number <= 0:
        return None

    if number >= 1:
        return str(number).rstrip("0").rstrip(".")

    formatted = f"{number:.16f}".rstrip("0").rstrip(".")
    return formatted or None


def _resolve_market_amount_constraints(exchange, symbol):
    market = None

    try:
        market = exchange.market(symbol)
    except (KeyError, TypeError, ValueError, AttributeError):
        market = None

    if not market and isinstance(getattr(exchange, "markets", None), dict):
        market = exchange.markets.get(symbol)

    if not isinstance(market, dict):
        return None, None, None, None, None, None, None, None

    market_limits = market.get("limits") or {}
    limits_amount = market_limits.get("amount") or {}
    limits_cost = market_limits.get("cost") or {}
    limits_price = market_limits.get("price") or {}
    min_amount = limits_amount.get("min")
    min_cost = limits_cost.get("min")
    min_price = limits_price.get("min")
    max_price = limits_price.get("max")

    min_price_raw = min_price if isinstance(min_price, (int, float, str)) else None
    max_price_raw = max_price if isinstance(max_price, (int, float, str)) else None

    min_price_value = None
    if min_price_raw is not None:
        try:
            min_price_value = float(min_price_raw)
        except (TypeError, ValueError):
            min_price_value = None

    max_price_value = None
    if max_price_raw is not None:
        try:
            max_price_value = float(max_price_raw)
        except (TypeError, ValueError):
            max_price_value = None

    if min_price_value is None or not math.isfinite(min_price_value) or min_price_value <= 0:
        min_price_value = DEFAULT_PRICE_MIN

    if max_price_value is None or not math.isfinite(max_price_value) or max_price_value <= 0:
        max_price_value = DEFAULT_PRICE_MAX

    if max_price_value < min_price_value:
        max_price_value = max(min_price_value, DEFAULT_PRICE_MAX)

    precision_amount = (market.get("precision") or {}).get("amount")
    precision_price = (market.get("precision") or {}).get("price")
    precision_mode = getattr(exchange, "precisionMode", None)

    amount_step = None
    if precision_amount is not None:
        try:
            precision_value = float(precision_amount)
        except (TypeError, ValueError):
            precision_value = None

        if precision_value is not None and math.isfinite(precision_value) and precision_value > 0:
            if precision_mode == getattr(ccxt, "TICK_SIZE", object()):
                amount_step = precision_value
            elif precision_mode == getattr(ccxt, "DECIMAL_PLACES", object()):
                decimals = int(precision_value)
                if decimals >= 0:
                    amount_step = 10 ** (-decimals)
            else:
                if precision_value < 1:
                    amount_step = precision_value
                elif precision_value.is_integer() and int(precision_value) >= 0:
                    amount_step = 10 ** (-int(precision_value))

    if amount_step is None:
        min_candidate_raw = min_amount if isinstance(min_amount, (int, float, str)) else None
        min_candidate = None
        if min_candidate_raw is not None:
            try:
                min_candidate = float(min_candidate_raw)
            except (TypeError, ValueError):
                min_candidate = None
        if min_candidate is not None and math.isfinite(min_candidate) and min_candidate > 0:
            amount_step = min_candidate

    price_step = None
    if precision_price is not None:
        try:
            precision_value = float(precision_price)
        except (TypeError, ValueError):
            precision_value = None

        if precision_value is not None and math.isfinite(precision_value) and precision_value > 0:
            if precision_mode == getattr(ccxt, "TICK_SIZE", object()):
                price_step = precision_value
            elif precision_mode == getattr(ccxt, "DECIMAL_PLACES", object()):
                decimals = int(precision_value)
                if decimals >= 0:
                    price_step = 10 ** (-decimals)
            else:
                if precision_value < 1:
                    price_step = precision_value
                elif precision_value.is_integer() and int(precision_value) >= 0:
                    price_step = 10 ** (-int(precision_value))

    if price_step is None and min_price_value is not None and math.isfinite(min_price_value) and 0 < min_price_value < 1:
        price_step = min_price_value

    amount_precision = None
    if isinstance(precision_amount, (int, float)) and math.isfinite(float(precision_amount)) and float(precision_amount) >= 0:
        amount_precision = float(precision_amount)

    price_precision = None
    if isinstance(precision_price, (int, float)) and math.isfinite(float(precision_price)) and float(precision_price) >= 0:
        price_precision = float(precision_price)

    return (
        _format_number_for_input(amount_step),
        _format_number_for_input(min_amount),
        _format_number_for_input(min_cost),
        _format_number_for_input(min_price_value),
        _format_number_for_input(max_price_value),
        _format_number_for_input(price_step),
        _format_number_for_input(amount_precision),
        _format_number_for_input(price_precision),
    )


def _timeframe_to_seconds(timeframe):
    units = {
        "m": 60,
        "h": 3600,
        "d": 86400,
        "w": 604800,
        "M": 2592000,
    }
    if not timeframe or len(timeframe) < 2:
        return 60

    number = timeframe[:-1]
    unit = timeframe[-1]
    if not number.isdigit() or unit not in units:
        return 60

    return int(number) * units[unit]


def _build_fallback_candles(timeframe, count=600):
    safe_count = max(50, min(int(count), MAX_CANDLES))
    timeframe_seconds = _timeframe_to_seconds(timeframe)
    now_seconds = int(time.time())
    aligned_now = now_seconds - (now_seconds % timeframe_seconds)
    base_price = 100_000.0
    candles = []
    previous_close = base_price

    for bar_index in range(safe_count):
        bar_time = aligned_now - ((safe_count - bar_index - 1) * timeframe_seconds)
        wave_fast = math.sin(bar_index / 8) * 35
        wave_slow = math.sin(bar_index / 27) * 120
        drift = (bar_index / safe_count) * 60
        open_price = previous_close
        close_price = max(1.0, base_price + wave_fast + wave_slow + drift)
        high_price = max(open_price, close_price) + 18
        low_price = min(open_price, close_price) - 18
        volume = 200 + abs(math.sin(bar_index / 5) * 140)

        candles.append(
            {
                "x": round(3 + ((bar_index + 1) / (safe_count + 1)) * 94, 2),
                "time": bar_time,
                "wick_top": 0,
                "wick_height": 0,
                "body_top": 0,
                "body_height": 0,
                "open": round(open_price, 4),
                "high": round(high_price, 4),
                "low": round(low_price, 4),
                "close": round(close_price, 4),
                "volume": round(volume, 4),
                "direction": "up" if close_price >= open_price else "down",
                "timestamp": datetime.fromtimestamp(
                    bar_time, tz=timezone.utc
                ).strftime("%H:%M"),
            }
        )
        previous_close = close_price

    return candles


def _is_valid_timeframe(value):
    if not isinstance(value, str):
        return False

    if len(value) < 2:
        return False

    number = value[:-1]
    unit = value[-1]
    return number.isdigit() and unit in {"m", "h", "d", "w", "M"}


def _sort_timeframe_values(timeframes):
    return sorted(
        timeframes,
        key=lambda timeframe: (_timeframe_to_seconds(timeframe), timeframe),
    )


def _get_supported_timeframes(exchange):
    raw_timeframes = getattr(exchange, "timeframes", None)
    if isinstance(raw_timeframes, dict):
        filtered = [timeframe for timeframe in raw_timeframes.keys() if _is_valid_timeframe(timeframe)]
        if filtered:
            return _sort_timeframe_values(filtered)

    return list(DEFAULT_SUPPORTED_TIMEFRAMES)


def _get_supported_quote_currencies(exchange, supported_symbols=None):
    markets = getattr(exchange, "markets", None)
    symbols = list(supported_symbols or [])
    if not isinstance(markets, dict):
        fallback_quote_currencies = {
            quote_currency
            for quote_currency in (_extract_quote_currency_from_symbol(symbol) for symbol in symbols)
            if quote_currency
        }
        return sorted(fallback_quote_currencies)

    quote_currencies = set()
    for market in markets.values():
        if not isinstance(market, dict):
            continue

        # Exchanges expose quote metadata under different keys.
        quote_candidates = (
            market.get("quote"),
            market.get("quoteId"),
            market.get("settle"),
            market.get("settleId"),
        )

        for candidate in quote_candidates:
            normalized_quote_currency = _normalize_quote_currency_candidate(candidate)
            if normalized_quote_currency:
                quote_currencies.add(normalized_quote_currency)

        symbol_quote_currency = _extract_quote_currency_from_symbol(market.get("symbol"))
        if symbol_quote_currency:
            quote_currencies.add(symbol_quote_currency)

    for symbol in symbols:
        symbol_quote_currency = _extract_quote_currency_from_symbol(symbol)
        if symbol_quote_currency:
            quote_currencies.add(symbol_quote_currency)

    return sorted(quote_currencies)


def _get_supported_symbols(exchange):
    markets = getattr(exchange, "markets", None)
    if not isinstance(markets, dict):
        return list(DEFAULT_SUPPORTED_SYMBOLS)

    supported_symbols = []
    for market in markets.values():
        if not isinstance(market, dict):
            continue

        symbol = market.get("symbol")
        if not isinstance(symbol, str):
            continue

        normalized_symbol = symbol.strip()
        if "/" not in normalized_symbol or not normalized_symbol:
            continue

        supported_symbols.append(normalized_symbol)

    if not supported_symbols:
        return list(DEFAULT_SUPPORTED_SYMBOLS)

    return sorted(set(supported_symbols))


def _normalize_timeframe(value, supported_timeframes=None):
    available = list(supported_timeframes or DEFAULT_SUPPORTED_TIMEFRAMES)
    if value in available:
        return value

    if "1m" in available:
        return "1m"

    return available[0] if available else "1m"


def _normalize_exchange(value):
    if value in SUPPORTED_EXCHANGES:
        return value
    return DEFAULT_EXCHANGE_KEY


def _normalize_symbol(value, supported_symbols=None):
    available_symbols = list(supported_symbols or DEFAULT_SUPPORTED_SYMBOLS)

    if value in available_symbols:
        return value

    if "BTC/USDT" in available_symbols:
        return "BTC/USDT"

    return available_symbols[0] if available_symbols else "BTC/USDT"


def _decode_request_value(value):
    if isinstance(value, str):
        return unquote(value)
    return value


def _format_compact_volume(value):
    if value is None:
        return "-"

    number = float(value)
    absolute = abs(number)

    if absolute >= 1_000_000:
        return f"{number / 1_000_000:.2f}M"
    if absolute >= 1_000:
        return f"{number / 1_000:.2f}k"
    return f"{number:.2f}"


def _as_positive_finite_float(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    if not math.isfinite(number) or number <= 0:
        return None

    return number


def _fetch_symbol_quote_volume_usdt(exchange, supported_symbols):
    exchange_id = getattr(exchange, "id", "exchange")
    cache_key = f"{exchange_id}:symbol-quote-volume"
    now = time.monotonic()
    cached = _symbol_volume_cache.get(cache_key)
    usdt_symbols = [symbol for symbol in supported_symbols if isinstance(symbol, str) and symbol.strip()]

    if not usdt_symbols:
        return {}

    usdt_symbol_set = set(usdt_symbols)

    def _normalize_symbol_token(value):
        if not isinstance(value, str):
            return ""
        return re.sub(r"[^A-Z0-9]", "", value.upper())

    normalized_symbol_lookup = {
        _normalize_symbol_token(symbol): symbol
        for symbol in usdt_symbols
    }

    markets_by_id = getattr(exchange, "markets_by_id", None)
    markets = getattr(exchange, "markets", None)

    def _resolve_supported_symbol(candidate):
        if not isinstance(candidate, str):
            return None

        if candidate in usdt_symbol_set:
            return candidate

        mapped_market = None
        if isinstance(markets_by_id, dict):
            mapped_market = markets_by_id.get(candidate)
            if isinstance(mapped_market, list):
                mapped_market = mapped_market[0] if mapped_market else None
            if isinstance(mapped_market, dict):
                mapped_symbol = mapped_market.get("symbol")
                if isinstance(mapped_symbol, str) and mapped_symbol in usdt_symbol_set:
                    return mapped_symbol

        if isinstance(markets, dict):
            market_entry = markets.get(candidate)
            if isinstance(market_entry, dict):
                market_symbol = market_entry.get("symbol")
                if isinstance(market_symbol, str) and market_symbol in usdt_symbol_set:
                    return market_symbol

        normalized = _normalize_symbol_token(candidate)
        return normalized_symbol_lookup.get(normalized)

    def _extract_quote_volume_from_ticker(ticker):
        if not isinstance(ticker, dict):
            return None

        quote_volume = _as_positive_finite_float(ticker.get("quoteVolume"))
        if quote_volume is not None:
            return quote_volume

        info = ticker.get("info")
        if isinstance(info, dict):
            for key in ("turnover24h", "quoteVolume", "quote_volume", "volCcy24h", "volumeQuote"):
                quote_volume = _as_positive_finite_float(info.get(key))
                if quote_volume is not None:
                    return quote_volume

        base_volume = _as_positive_finite_float(ticker.get("baseVolume"))
        last_price = _as_positive_finite_float(ticker.get("last"))
        if last_price is None:
            last_price = _as_positive_finite_float(ticker.get("close"))

        if base_volume is not None and last_price is not None:
            return base_volume * last_price

        return None

    if cached and (now - cached["fetched_at"] < SYMBOL_VOLUME_CACHE_TTL_SECONDS):
        cached_volumes = cached.get("volumes") or {}
        return {
            symbol: cached_volumes.get(symbol)
            for symbol in usdt_symbols
            if cached_volumes.get(symbol) is not None
        }

    volumes_by_symbol = {}
    tickers = {}

    try:
        tickers = exchange.fetch_tickers(list(usdt_symbols))
    except (TypeError, ccxt.ExchangeError, ccxt.NetworkError, ccxt.RequestTimeout, OSError):
        try:
            tickers = exchange.fetch_tickers()
        except (TypeError, ccxt.ExchangeError, ccxt.NetworkError, ccxt.RequestTimeout, OSError):
            tickers = {}

    if isinstance(tickers, dict):
        for key, ticker in tickers.items():
            candidate_symbols = []
            if isinstance(key, str):
                candidate_symbols.append(key)

            if isinstance(ticker, dict):
                for candidate in (
                    ticker.get("symbol"),
                    (ticker.get("info") or {}).get("symbol") if isinstance(ticker.get("info"), dict) else None,
                    (ticker.get("info") or {}).get("market") if isinstance(ticker.get("info"), dict) else None,
                ):
                    if isinstance(candidate, str):
                        candidate_symbols.append(candidate)

            resolved_symbol = None
            for candidate in candidate_symbols:
                resolved_symbol = _resolve_supported_symbol(candidate)
                if resolved_symbol:
                    break

            if not resolved_symbol:
                continue

            quote_volume = _extract_quote_volume_from_ticker(ticker)
            if quote_volume is None:
                continue

            existing_volume = _as_positive_finite_float(volumes_by_symbol.get(resolved_symbol))
            if existing_volume is None or quote_volume > existing_volume:
                volumes_by_symbol[resolved_symbol] = quote_volume

    if not volumes_by_symbol and cached:
        cached_volumes = cached.get("volumes") or {}
        return {
            symbol: cached_volumes.get(symbol)
            for symbol in usdt_symbols
            if cached_volumes.get(symbol) is not None
        }

    _symbol_volume_cache[cache_key] = {
        "fetched_at": now,
        "volumes": volumes_by_symbol,
    }

    return {
        symbol: volumes_by_symbol.get(symbol)
        for symbol in usdt_symbols
        if volumes_by_symbol.get(symbol) is not None
    }


def _build_supported_symbol_items(supported_symbols, quote_volumes_by_symbol=None):
    volumes = quote_volumes_by_symbol if isinstance(quote_volumes_by_symbol, dict) else {}
    items = []
    best_volume_by_pair = {}

    for symbol, volume_value in volumes.items():
        normalized_volume = _as_positive_finite_float(volume_value)
        if normalized_volume is None:
            continue

        base_currency = _extract_base_currency_from_symbol(symbol)
        quote_currency = _extract_quote_currency_from_symbol(symbol)
        if not base_currency or not quote_currency:
            continue

        pair_key = (base_currency, quote_currency)
        existing_best = best_volume_by_pair.get(pair_key)
        if existing_best is None or normalized_volume > existing_best:
            best_volume_by_pair[pair_key] = normalized_volume

    for supported_symbol in supported_symbols:
        volume_24h_usdt = volumes.get(supported_symbol)
        quote_currency = _extract_quote_currency_from_symbol(supported_symbol)
        if _as_positive_finite_float(volume_24h_usdt) is None:
            base_currency = _extract_base_currency_from_symbol(supported_symbol)
            if base_currency and quote_currency:
                volume_24h_usdt = best_volume_by_pair.get((base_currency, quote_currency))

        normalized_volume = _as_positive_finite_float(volume_24h_usdt)
        items.append(
            {
                "symbol": supported_symbol,
                "display_symbol": supported_symbol.replace("/", ""),
                "quote_volume_24h_usdt": normalized_volume,
                "quote_volume_24h_usdt_compact": _format_compact_volume(normalized_volume) if normalized_volume else "-",
                "quote_volume_24h_currency": quote_currency,
            }
        )

    return items


def _count_symbols_with_24h_volume(supported_symbols):
    if not isinstance(supported_symbols, list):
        return 0

    count = 0
    for item in supported_symbols:
        if not isinstance(item, dict):
            continue

        volume = _as_positive_finite_float(item.get("quote_volume_24h_usdt"))
        if volume is not None:
            count += 1

    return count


def _extract_volume_map_from_supported_symbols(supported_symbols):
    if not isinstance(supported_symbols, list):
        return {}

    volume_by_symbol = {}
    for item in supported_symbols:
        if not isinstance(item, dict):
            continue

        symbol = item.get("symbol")
        if not isinstance(symbol, str) or not symbol.strip():
            continue

        normalized_volume = _as_positive_finite_float(item.get("quote_volume_24h_usdt"))
        if normalized_volume is None:
            continue

        existing_volume = _as_positive_finite_float(volume_by_symbol.get(symbol))
        if existing_volume is None or normalized_volume > existing_volume:
            volume_by_symbol[symbol] = normalized_volume

    return volume_by_symbol


def _get_git_version():
    env_version = (os.getenv("APP_VERSION") or "").strip()
    if env_version:
        return env_version

    default_version = "0.0.0"
    default_commit = "unknown"
    resolved_version = default_version
    resolved_commit = default_commit

    try:
        result = subprocess.run(
            ["git", "tag", "--list", "--sort=-version:refname"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        pass
    else:
        for raw_tag in result.stdout.splitlines():
            match = re.search(r"(\d+\.\d+\.\d+)", raw_tag)
            if match:
                resolved_version = match.group(1)
                break

    try:
        commit_result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        pass
    else:
        commit_candidate = (commit_result.stdout or "").strip()
        if commit_candidate:
            resolved_commit = commit_candidate

    if resolved_commit == default_commit:
        return resolved_version

    return f"{resolved_version}+{resolved_commit}"


def _build_candle_view(ohlcv_rows):
    if not ohlcv_rows:
        return [], [], []

    lows = [float(row[3]) for row in ohlcv_rows]
    highs = [float(row[2]) for row in ohlcv_rows]
    min_low = min(lows)
    max_high = max(highs)
    price_range = max(max_high - min_low, 1e-9)

    candles = []
    total = len(ohlcv_rows)
    for candle_index, row in enumerate(ohlcv_rows):
        timestamp_ms, open_price, high_price, low_price, close_price, _volume = row

        body_top_price = max(float(open_price), float(close_price))
        body_bottom_price = min(float(open_price), float(close_price))

        wick_top = ((max_high - float(high_price)) / price_range) * 100
        wick_height = ((float(high_price) - float(low_price)) / price_range) * 100
        body_top = ((max_high - body_top_price) / price_range) * 100
        body_height = max(((body_top_price - body_bottom_price) / price_range) * 100, 0.8)
        x_position = 3 + ((candle_index + 1) / (total + 1)) * 94

        candles.append(
            {
                "x": round(x_position, 2),
                "time": int(timestamp_ms // 1000),
                "wick_top": round(wick_top, 2),
                "wick_height": round(wick_height, 2),
                "body_top": round(body_top, 2),
                "body_height": round(body_height, 2),
                "open": round(float(open_price), 4),
                "high": round(float(high_price), 4),
                "low": round(float(low_price), 4),
                "close": round(float(close_price), 4),
                "volume": round(float(_volume), 4),
                "direction": "up" if float(close_price) >= float(open_price) else "down",
                "timestamp": datetime.fromtimestamp(
                    timestamp_ms / 1000, tz=timezone.utc
                ).strftime("%H:%M"),
            }
        )

    axis_steps = 5
    axis_levels = []
    for step in range(axis_steps):
        level = max_high - ((max_high - min_low) * step / (axis_steps - 1))
        axis_levels.append(round(level, 2))

    footer_points = []
    footer_count = min(6, total)
    for slot in range(footer_count):
        row_index = int((slot * (total - 1)) / max(footer_count - 1, 1))
        footer_points.append(candles[row_index]["timestamp"])

    return candles, axis_levels, footer_points


def _fetch_ohlcv_window(exchange, symbol, timeframe, target_limit):
    timeframe_ms = exchange.parse_timeframe(timeframe) * 1000
    since = exchange.milliseconds() - (target_limit * timeframe_ms)
    rows_by_timestamp = {}

    while len(rows_by_timestamp) < target_limit:
        remaining = target_limit - len(rows_by_timestamp)
        batch_limit = min(1000, remaining)
        batch = exchange.fetch_ohlcv(
            symbol,
            timeframe=timeframe,
            since=since,
            limit=batch_limit,
        )

        if not batch:
            break

        for row in batch:
            rows_by_timestamp[row[0]] = row

        next_since = batch[-1][0] + timeframe_ms
        if next_since <= since:
            break

        since = next_since

    ordered_rows = [rows_by_timestamp[key] for key in sorted(rows_by_timestamp.keys())]
    return ordered_rows[-target_limit:]


def _get_cached_ohlcv(exchange, symbol, timeframe, target_limit):
    exchange_id = getattr(exchange, "id", "exchange")
    cache_key = f"{exchange_id}:{symbol}:{timeframe}:{target_limit}"
    now = time.monotonic()
    cached = _ohlcv_cache.get(cache_key)

    if cached and (now - cached["fetched_at"] < CACHE_TTL_SECONDS):
        return cached["rows"]

    rows = _fetch_ohlcv_window(exchange, symbol, timeframe, target_limit)
    _ohlcv_cache[cache_key] = {
        "fetched_at": now,
        "rows": rows,
    }
    return rows


def _fetch_chart_payload(
    timeframe=None,
    exchange_key=None,
    symbol=None,
    include_symbol_volumes=True,
    prefer_cached_chart=True,
    payload_mode="full",
):
    selected_exchange_key = _normalize_exchange(exchange_key)
    selected_exchange = SUPPORTED_EXCHANGES[selected_exchange_key]
    exchange = None
    supported_timeframes = list(DEFAULT_SUPPORTED_TIMEFRAMES)
    supported_symbols = list(DEFAULT_SUPPORTED_SYMBOLS)
    supported_quote_currencies = sorted({
        supported_symbol.split("/")[-1].strip().upper()
        for supported_symbol in DEFAULT_SUPPORTED_SYMBOLS
        if isinstance(supported_symbol, str) and "/" in supported_symbol
    })
    selected_symbol = _normalize_symbol(symbol, supported_symbols)

    normalized_payload_mode = "delta" if str(payload_mode).lower() == "delta" else "full"

    if is_db_cache_enabled() and include_symbol_volumes is False and prefer_cached_chart:
        cache_lookup_symbol = str(symbol).strip() if isinstance(symbol, str) and symbol.strip() else selected_symbol
        cached_chart_payload = get_chart_payload(
            selected_exchange_key,
            cache_lookup_symbol,
            _normalize_timeframe(timeframe, supported_timeframes),
            max_age_seconds=CHART_PAYLOAD_MAX_AGE_SECONDS,
            payload_mode=normalized_payload_mode,
        )
        if isinstance(cached_chart_payload, dict):
            return cached_chart_payload
    amount_step = None
    amount_min = None
    total_min = None
    price_min = None
    price_max = None
    price_step = None
    amount_precision = None
    price_precision = None
    symbol_quote_volumes_usdt = {}

    try:
        exchange = _get_cached_exchange(selected_exchange_key)
        supported_symbols = _get_supported_symbols(exchange)
        supported_timeframes = _get_supported_timeframes(exchange)
        quote_currencies = _get_supported_quote_currencies(exchange, supported_symbols)
        if quote_currencies:
            supported_quote_currencies = quote_currencies
        selected_symbol = _normalize_symbol(symbol, supported_symbols)
        if include_symbol_volumes:
            symbol_quote_volumes_usdt = _fetch_symbol_quote_volume_usdt(exchange, supported_symbols)
            if is_db_cache_enabled():
                cached_settings_payload = get_exchange_settings_payload(
                    selected_exchange_key,
                    max_age_seconds=EXCHANGE_SETTINGS_MAX_AGE_SECONDS,
                )
                cached_volume_map = _extract_volume_map_from_supported_symbols(
                    cached_settings_payload.get("supported_symbols") if isinstance(cached_settings_payload, dict) else None
                )
                if cached_volume_map:
                    for supported_symbol, cached_volume in cached_volume_map.items():
                        existing_volume = _as_positive_finite_float(symbol_quote_volumes_usdt.get(supported_symbol))
                        if existing_volume is None or cached_volume > existing_volume:
                            symbol_quote_volumes_usdt[supported_symbol] = cached_volume
        (
            amount_step,
            amount_min,
            total_min,
            price_min,
            price_max,
            price_step,
            amount_precision,
            price_precision,
        ) = _resolve_market_amount_constraints(exchange, selected_symbol)
    except (
        ccxt.RequestTimeout,
        ccxt.NetworkError,
        ccxt.ExchangeNotAvailable,
        ccxt.BadSymbol,
        ccxt.ExchangeError,
        OSError,
    ):
        supported_timeframes = list(DEFAULT_SUPPORTED_TIMEFRAMES)

    selected_timeframe = _normalize_timeframe(timeframe, supported_timeframes)

    market_data = {
        "symbol": selected_symbol,
        "display_symbol": selected_symbol.replace("/", ""),
        "exchange_key": selected_exchange_key,
        "exchange": selected_exchange["label"],
        "timeframe": selected_timeframe,
        "supported_exchanges": [
            {"key": key, "label": metadata["label"]}
            for key, metadata in SUPPORTED_EXCHANGES.items()
        ],
        "supported_symbols": [
            item
            for item in _build_supported_symbol_items(supported_symbols, symbol_quote_volumes_usdt)
        ],
        "supported_timeframes": supported_timeframes,
        "supported_quote_currencies": supported_quote_currencies,
        "max_candles": MAX_CANDLES,
        "last": None,
        "bid": None,
        "ask": None,
        "high": None,
        "low": None,
        "quote_volume": None,
        "quote_volume_compact": "-",
        "timestamp": None,
        "timestamp_unix": None,
        "amount_step": amount_step,
        "amount_min": amount_min,
        "total_min": total_min,
        "price_min": price_min,
        "price_max": price_max,
        "price_step": price_step,
        "amount_precision": amount_precision,
        "price_precision": price_precision,
        "error": None,
    }
    candles = []
    axis_levels = []
    footer_points = []

    try:
        if exchange is None:
            exchange = _get_cached_exchange(selected_exchange_key)
        if (
            market_data["amount_step"] is None
            and market_data["amount_min"] is None
            and market_data["total_min"] is None
            and market_data["price_min"] is None
            and market_data["price_max"] is None
            and market_data["price_step"] is None
            and market_data["amount_precision"] is None
            and market_data["price_precision"] is None
        ):
            (
                market_data["amount_step"],
                market_data["amount_min"],
                market_data["total_min"],
                market_data["price_min"],
                market_data["price_max"],
                market_data["price_step"],
                market_data["amount_precision"],
                market_data["price_precision"],
            ) = _resolve_market_amount_constraints(
                exchange,
                market_data["symbol"],
            )
        ticker = exchange.fetch_ticker(market_data["symbol"])
        ohlcv_rows = _get_cached_ohlcv(
            exchange,
            market_data["symbol"],
            market_data["timeframe"],
            market_data["max_candles"],
        )

        candles, axis_levels, footer_points = _build_candle_view(ohlcv_rows)

        market_data["last"] = ticker.get("last")
        market_data["bid"] = ticker.get("bid")
        market_data["ask"] = ticker.get("ask")
        market_data["high"] = ticker.get("high")
        market_data["low"] = ticker.get("low")
        market_data["quote_volume"] = ticker.get("quoteVolume")
        market_data["quote_volume_compact"] = _format_compact_volume(market_data["quote_volume"])

        timestamp = ticker.get("timestamp")
        if timestamp:
            updated_at = datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
        else:
            updated_at = datetime.now(tz=timezone.utc)

        market_data["timestamp"] = updated_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        market_data["timestamp_unix"] = int(updated_at.timestamp())
    except (
        ccxt.RequestTimeout,
        ccxt.NetworkError,
        ccxt.ExchangeNotAvailable,
        ccxt.BadSymbol,
        ccxt.ExchangeError,
        OSError,
    ) as error:
        market_data["error"] = str(error)
        market_data["timestamp_unix"] = int(datetime.now(tz=timezone.utc).timestamp())
        candles = _build_fallback_candles(
            market_data["timeframe"],
            count=market_data["max_candles"],
        )

    output_candles = candles
    output_axis_levels = axis_levels
    output_footer_points = footer_points
    if normalized_payload_mode == "delta":
        output_candles = candles[-3:]
        output_axis_levels = []
        output_footer_points = []

    payload = {
        "market_data": market_data,
        "candles": output_candles,
        "axis_levels": output_axis_levels,
        "footer_points": output_footer_points,
        "payload_mode": normalized_payload_mode,
    }

    if is_db_cache_enabled() and include_symbol_volumes is False and market_data.get("error") is None:
        upsert_chart_payload(
            selected_exchange_key,
            market_data.get("symbol") or selected_symbol,
            market_data.get("timeframe") or selected_timeframe,
            payload,
            payload_mode=normalized_payload_mode,
        )

    return payload


def _fetch_market_quote_payload(exchange_key=None, symbol=None, timeframe=None):
    selected_exchange_key = _normalize_exchange(exchange_key)
    selected_timeframe = _normalize_timeframe(timeframe)
    selected_exchange = SUPPORTED_EXCHANGES[selected_exchange_key]
    selected_symbol = _normalize_symbol(symbol, DEFAULT_SUPPORTED_SYMBOLS)

    market_data = {
        "symbol": selected_symbol,
        "display_symbol": selected_symbol.replace("/", ""),
        "exchange_key": selected_exchange_key,
        "exchange": selected_exchange["label"],
        "timeframe": selected_timeframe,
        "last": None,
        "bid": None,
        "ask": None,
        "high": None,
        "low": None,
        "quote_volume": None,
        "quote_volume_compact": "-",
        "timestamp": None,
        "timestamp_unix": int(datetime.now(tz=timezone.utc).timestamp()),
        "amount_step": None,
        "amount_min": None,
        "total_min": None,
        "price_min": None,
        "price_max": None,
        "price_step": None,
        "amount_precision": None,
        "price_precision": None,
        "error": None,
    }

    # Cache-first path: serve a fresh snapshot when available.
    requested_symbol = str(symbol).strip() if isinstance(symbol, str) else ""
    cache_lookup_symbol = requested_symbol or selected_symbol
    if is_db_cache_enabled() and cache_lookup_symbol:
        cached_market_data = get_market_snapshot(
            selected_exchange_key,
            cache_lookup_symbol,
            selected_timeframe,
            max_age_seconds=MARKET_SNAPSHOT_MAX_AGE_SECONDS,
        )
        if isinstance(cached_market_data, dict):
            return {"market_data": cached_market_data}

    try:
        exchange = _get_cached_exchange(selected_exchange_key)
        selected_symbol = _normalize_symbol(symbol, _get_supported_symbols(exchange))
        market_data["symbol"] = selected_symbol
        market_data["display_symbol"] = selected_symbol.replace("/", "")
        ticker = exchange.fetch_ticker(market_data["symbol"])

        market_data["last"] = ticker.get("last")
        market_data["bid"] = ticker.get("bid")
        market_data["ask"] = ticker.get("ask")
        market_data["high"] = ticker.get("high")
        market_data["low"] = ticker.get("low")
        market_data["quote_volume"] = ticker.get("quoteVolume")
        market_data["quote_volume_compact"] = _format_compact_volume(market_data["quote_volume"])

        timestamp = ticker.get("timestamp")
        if timestamp:
            updated_at = datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
        else:
            updated_at = datetime.now(tz=timezone.utc)

        market_data["timestamp"] = updated_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        market_data["timestamp_unix"] = int(updated_at.timestamp())

        if is_db_cache_enabled():
            upsert_market_snapshot(
                selected_exchange_key,
                market_data["symbol"],
                market_data["timeframe"],
                market_data,
            )
    except (
        ccxt.RequestTimeout,
        ccxt.NetworkError,
        ccxt.ExchangeNotAvailable,
        ccxt.BadSymbol,
        ccxt.ExchangeError,
        OSError,
    ) as error:
        market_data["error"] = str(error)

    return {
        "market_data": market_data,
    }


def _fetch_exchange_settings_options_payload(exchange_key=None):
    selected_exchange_key = _normalize_exchange(exchange_key)
    cached_settings_payload = None

    if is_db_cache_enabled():
        cached_settings_payload = get_exchange_settings_payload(
            selected_exchange_key,
            max_age_seconds=EXCHANGE_SETTINGS_MAX_AGE_SECONDS,
        )
        if isinstance(cached_settings_payload, dict):
            cached_supported_symbols = cached_settings_payload.get("supported_symbols")
            cached_volume_count = _count_symbols_with_24h_volume(cached_supported_symbols)
            if cached_volume_count > 0:
                return cached_settings_payload

    supported_symbols = list(DEFAULT_SUPPORTED_SYMBOLS)
    supported_timeframes = list(DEFAULT_SUPPORTED_TIMEFRAMES)
    supported_quote_currencies = sorted(
        {
            supported_symbol.split("/")[-1].strip().upper()
            for supported_symbol in DEFAULT_SUPPORTED_SYMBOLS
            if isinstance(supported_symbol, str) and "/" in supported_symbol
        }
    )
    symbol_quote_volumes_usdt = {}
    error = None

    try:
        exchange = _get_cached_exchange(selected_exchange_key)
        supported_symbols = _get_supported_symbols(exchange)
        supported_timeframes = _get_supported_timeframes(exchange)
        quote_currencies = _get_supported_quote_currencies(exchange, supported_symbols)
        if quote_currencies:
            supported_quote_currencies = quote_currencies
        symbol_quote_volumes_usdt = _fetch_symbol_quote_volume_usdt(exchange, supported_symbols)
    except (
        ccxt.RequestTimeout,
        ccxt.NetworkError,
        ccxt.ExchangeNotAvailable,
        ccxt.BadSymbol,
        ccxt.ExchangeError,
        OSError,
    ) as fetch_error:
        # If live refresh fails, return stale cache rather than dropping settings data.
        if isinstance(cached_settings_payload, dict):
            return cached_settings_payload
        error = str(fetch_error)

    payload = {
        "exchange_key": selected_exchange_key,
        "supported_symbols": _build_supported_symbol_items(supported_symbols, symbol_quote_volumes_usdt),
        "supported_timeframes": supported_timeframes,
        "supported_quote_currencies": supported_quote_currencies,
        "error": error,
    }

    if is_db_cache_enabled() and error is None:
        upsert_exchange_settings_payload(selected_exchange_key, payload)

    return payload


@app.route("/")
def index():
    """ Main page route. """
    requested_timeframe = _decode_request_value(
        request.args.get("timeframe") or request.cookies.get("trade_wijs_timeframe")
    )
    requested_exchange = _decode_request_value(
        request.args.get("exchange") or request.cookies.get("trade_wijs_exchange")
    )
    requested_symbol = _decode_request_value(
        request.args.get("symbol") or request.cookies.get("trade_wijs_symbol")
    )

    payload = _fetch_chart_payload(
        requested_timeframe,
        requested_exchange,
        requested_symbol,
    )
    payload["app_version"] = _get_git_version()

    response = make_response(render_template("index.html", **payload))
    cookie_ttl = 60 * 60 * 24 * 365
    response.set_cookie("trade_wijs_timeframe", payload["market_data"]["timeframe"], max_age=cookie_ttl, samesite="Lax")
    response.set_cookie("trade_wijs_exchange", payload["market_data"]["exchange_key"], max_age=cookie_ttl, samesite="Lax")
    response.set_cookie("trade_wijs_symbol", payload["market_data"]["symbol"], max_age=cookie_ttl, samesite="Lax")
    return response


@app.route("/api/chart-data")
def chart_data():
    """ API route for fetching chart data as JSON. """
    requested_mode = _decode_request_value(request.args.get("mode"))
    normalized_mode = "delta" if str(requested_mode).lower() == "delta" else "full"
    return jsonify(
        _fetch_chart_payload(
            _decode_request_value(request.args.get("timeframe")),
            _decode_request_value(request.args.get("exchange")),
            _decode_request_value(request.args.get("symbol")),
            include_symbol_volumes=False,
            payload_mode=normalized_mode,
        )
    )


@app.route("/api/market-quote")
def market_quote():
    """ API route for fetching lightweight market quote updates as JSON. """
    return jsonify(
        _fetch_market_quote_payload(
            _decode_request_value(request.args.get("exchange")),
            _decode_request_value(request.args.get("symbol")),
            _decode_request_value(request.args.get("timeframe")),
        )
    )


@app.route("/api/exchange-settings-options")
def exchange_settings_options():
    """ API route for fetching exchange-specific settings options as JSON. """
    return jsonify(
        _fetch_exchange_settings_options_payload(
            _decode_request_value(request.args.get("exchange")),
        )
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3175)
