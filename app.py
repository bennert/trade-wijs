""" Trade wijs web app main module. """
from datetime import datetime, timezone
import math
import os
import re
import subprocess
import time

import ccxt
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

MAX_CANDLES = 5000
CACHE_TTL_SECONDS = 20
_ohlcv_cache = {}
SUPPORTED_TIMEFRAMES = ("1m", "3m", "5m", "15m", "1h", "4h", "1d", "1w", "1M")


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


def _normalize_timeframe(value):
    if value in SUPPORTED_TIMEFRAMES:
        return value
    return "1m"


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
    since = exchange.milliseconds() - ((target_limit + 50) * timeframe_ms)
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
    cache_key = f"{symbol}:{timeframe}:{target_limit}"
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


def _fetch_chart_payload(timeframe=None):
    selected_timeframe = _normalize_timeframe(timeframe)
    market_data = {
        "symbol": "BTC/USDT",
        "display_symbol": "BTCUSDT",
        "exchange": "Bybit Global",
        "timeframe": selected_timeframe,
        "max_candles": MAX_CANDLES,
        "last": None,
        "bid": None,
        "ask": None,
        "high": None,
        "low": None,
        "quote_volume": None,
        "quote_volume_compact": "-",
        "timestamp": None,
        "error": None,
    }
    candles = []
    axis_levels = []
    footer_points = []

    try:
        exchange = ccxt.bybit({"enableRateLimit": True})
        ticker = exchange.fetch_ticker("BTC/USDT")
        ohlcv_rows = _get_cached_ohlcv(
            exchange,
            "BTC/USDT",
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
    except (
        ccxt.RequestTimeout,
        ccxt.NetworkError,
        ccxt.ExchangeNotAvailable,
        ccxt.BadSymbol,
        ccxt.ExchangeError,
        OSError,
    ) as error:
        market_data["error"] = str(error)
        candles = _build_fallback_candles(market_data["timeframe"], count=600)

    return {
        "market_data": market_data,
        "candles": candles,
        "axis_levels": axis_levels,
        "footer_points": footer_points,
    }


@app.route("/")
def index():
    """ Main page route. """
    payload = _fetch_chart_payload(request.args.get("timeframe"))
    payload["app_version"] = _get_git_version()
    return render_template("index.html", **payload)


@app.route("/api/chart-data")
def chart_data():
    """ API route for fetching chart data as JSON. """
    return jsonify(_fetch_chart_payload(request.args.get("timeframe")))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3175)
