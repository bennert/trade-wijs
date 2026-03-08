"""Background worker to warm market snapshot cache."""

from __future__ import annotations

import time

import ccxt

from app import (
    DEFAULT_SUPPORTED_SYMBOLS,
    SUPPORTED_EXCHANGES,
    _build_supported_symbol_items,
    _fetch_symbol_quote_volume_usdt,
    _get_supported_quote_currencies,
    _get_supported_symbols,
    _get_supported_timeframes,
    _normalize_symbol,
)
from db_cache import (
    ensure_schema,
    is_enabled,
    upsert_exchange_settings_payload,
    upsert_market_snapshot,
)

POLL_SECONDS = 3
SETTINGS_REFRESH_SECONDS = 60


def build_market_data(exchange_key, exchange_label, timeframe, symbol, ticker):
    timestamp = ticker.get("timestamp")
    if timestamp:
        updated_at_unix = int(timestamp / 1000)
    else:
        updated_at_unix = int(time.time())

    quote_volume = ticker.get("quoteVolume")

    return {
        "symbol": symbol,
        "display_symbol": symbol.replace("/", ""),
        "exchange_key": exchange_key,
        "exchange": exchange_label,
        "timeframe": timeframe,
        "last": ticker.get("last"),
        "bid": ticker.get("bid"),
        "ask": ticker.get("ask"),
        "high": ticker.get("high"),
        "low": ticker.get("low"),
        "quote_volume": quote_volume,
        "quote_volume_compact": "-" if quote_volume is None else str(quote_volume),
        "timestamp": None,
        "timestamp_unix": updated_at_unix,
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


def run_once():
    timeframe = "1m"
    for exchange_key, metadata in SUPPORTED_EXCHANGES.items():
        exchange_class = getattr(ccxt, metadata["ccxt_id"])
        exchange = exchange_class({"enableRateLimit": True})
        exchange.load_markets()
        supported_symbols_set = set()
        for market in (exchange.markets or {}).values():
            if not isinstance(market, dict):
                continue
            market_symbol = market.get("symbol")
            if isinstance(market_symbol, str) and market_symbol:
                supported_symbols_set.add(market_symbol)
        supported_symbols = sorted(supported_symbols_set)

        for default_symbol in DEFAULT_SUPPORTED_SYMBOLS:
            symbol = _normalize_symbol(default_symbol, supported_symbols)
            ticker = exchange.fetch_ticker(symbol)
            market_data = build_market_data(
                exchange_key,
                metadata["label"],
                timeframe,
                symbol,
                ticker,
            )
            upsert_market_snapshot(exchange_key, symbol, timeframe, market_data)


def refresh_settings_payloads():
    for exchange_key, metadata in SUPPORTED_EXCHANGES.items():
        exchange_class = getattr(ccxt, metadata["ccxt_id"])
        exchange = exchange_class({"enableRateLimit": True})
        exchange.load_markets()

        supported_symbols = _get_supported_symbols(exchange)
        supported_timeframes = _get_supported_timeframes(exchange)
        supported_quote_currencies = _get_supported_quote_currencies(exchange, supported_symbols)
        symbol_volumes = _fetch_symbol_quote_volume_usdt(exchange, supported_symbols)

        payload = {
            "exchange_key": exchange_key,
            "supported_symbols": _build_supported_symbol_items(supported_symbols, symbol_volumes),
            "supported_timeframes": supported_timeframes,
            "supported_quote_currencies": supported_quote_currencies,
            "error": None,
        }
        upsert_exchange_settings_payload(exchange_key, payload)


if __name__ == "__main__":
    if not is_enabled():
        raise SystemExit("DATABASE_URL is not configured, worker cannot start")

    ensure_schema()
    next_settings_refresh_unix = 0
    while True:
        try:
            run_once()
            now_unix = int(time.time())
            if now_unix >= next_settings_refresh_unix:
                refresh_settings_payloads()
                next_settings_refresh_unix = now_unix + SETTINGS_REFRESH_SECONDS
        except (ccxt.BaseError, OSError, ValueError, TypeError):
            # Keep worker alive even if one cycle fails.
            pass
        time.sleep(POLL_SECONDS)
