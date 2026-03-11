"""Market rendering, volume and cache helpers."""
from datetime import datetime, timezone
import math
import os
import re
import subprocess
import time

import ccxt

from app_services_config import CACHE_TTL_SECONDS, MAX_CANDLES, SYMBOL_VOLUME_CACHE_TTL_SECONDS
from app_services_exchange import (
    _extract_base_currency_from_symbol,
    _extract_quote_currency_from_symbol,
    _timeframe_to_seconds,
)

_ohlcv_cache = {}
_symbol_volume_cache = {}


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
    usdt_symbols = [
        symbol
        for symbol in supported_symbols
        if isinstance(symbol, str) and symbol.strip()
    ]

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
                    (
                        (ticker.get("info") or {}).get("symbol")
                        if isinstance(ticker.get("info"), dict)
                        else None
                    ),
                    (
                        (ticker.get("info") or {}).get("market")
                        if isinstance(ticker.get("info"), dict)
                        else None
                    ),
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
                "quote_volume_24h_usdt_compact": (
                    _format_compact_volume(normalized_volume)
                    if normalized_volume
                    else "-"
                ),
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
