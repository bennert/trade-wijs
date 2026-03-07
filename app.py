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

app = Flask(__name__)

MAX_CANDLES = 5000
CACHE_TTL_SECONDS = 20
_ohlcv_cache = {}
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
DEFAULT_SUPPORTED_SYMBOLS = ("BTC/USDT", "ETH/USDT", "SOL/USDT")
DEFAULT_PRICE_MIN = 0.01
DEFAULT_PRICE_MAX = 1_000_000


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


def _get_supported_quote_currencies(exchange):
    markets = getattr(exchange, "markets", None)
    if not isinstance(markets, dict):
        return []

    quote_currencies = set()
    for market in markets.values():
        if not isinstance(market, dict):
            continue

        quote_currency = market.get("quote")
        if isinstance(quote_currency, str) and quote_currency.strip():
            quote_currencies.add(quote_currency.strip().upper())
            continue

        symbol = market.get("symbol")
        if isinstance(symbol, str) and "/" in symbol:
            symbol_parts = symbol.split("/")
            fallback_quote = symbol_parts[-1].strip().upper()
            if fallback_quote:
                quote_currencies.add(fallback_quote)

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


def _fetch_chart_payload(timeframe=None, exchange_key=None, symbol=None):
    selected_exchange_key = _normalize_exchange(exchange_key)
    selected_exchange = SUPPORTED_EXCHANGES[selected_exchange_key]
    exchange_class = getattr(ccxt, selected_exchange["ccxt_id"])
    exchange = None
    supported_timeframes = list(DEFAULT_SUPPORTED_TIMEFRAMES)
    supported_symbols = list(DEFAULT_SUPPORTED_SYMBOLS)
    supported_quote_currencies = sorted({
        supported_symbol.split("/")[-1].strip().upper()
        for supported_symbol in DEFAULT_SUPPORTED_SYMBOLS
        if isinstance(supported_symbol, str) and "/" in supported_symbol
    })
    selected_symbol = _normalize_symbol(symbol, supported_symbols)
    amount_step = None
    amount_min = None
    total_min = None
    price_min = None
    price_max = None
    price_step = None
    amount_precision = None
    price_precision = None

    try:
        exchange = exchange_class({"enableRateLimit": True})
        exchange.load_markets()
        supported_symbols = _get_supported_symbols(exchange)
        supported_timeframes = _get_supported_timeframes(exchange)
        quote_currencies = _get_supported_quote_currencies(exchange)
        if quote_currencies:
            supported_quote_currencies = quote_currencies
        selected_symbol = _normalize_symbol(symbol, supported_symbols)
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
            {"symbol": supported_symbol, "display_symbol": supported_symbol.replace("/", "")}
            for supported_symbol in supported_symbols
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
            exchange = exchange_class({"enableRateLimit": True})
            exchange.load_markets()
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

    return {
        "market_data": market_data,
        "candles": candles,
        "axis_levels": axis_levels,
        "footer_points": footer_points,
    }


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

    try:
        exchange_class = getattr(ccxt, selected_exchange["ccxt_id"])
        exchange = exchange_class({"enableRateLimit": True})
        exchange.load_markets()
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
    return jsonify(
        _fetch_chart_payload(
            _decode_request_value(request.args.get("timeframe")),
            _decode_request_value(request.args.get("exchange")),
            _decode_request_value(request.args.get("symbol")),
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3175)
