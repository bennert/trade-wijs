"""Trade wijs payload builders."""
from datetime import datetime, timezone

import ccxt

from db_cache import (
    get_chart_payload,
    get_exchange_settings_payload,
    get_market_snapshot,
    is_enabled as is_db_cache_enabled,
    upsert_chart_payload,
    upsert_exchange_settings_payload,
    upsert_market_snapshot,
)

from app_services_config import (
    CHART_PAYLOAD_MAX_AGE_SECONDS,
    DEFAULT_SUPPORTED_SYMBOLS,
    DEFAULT_SUPPORTED_TIMEFRAMES,
    EXCHANGE_SETTINGS_MAX_AGE_SECONDS,
    MARKET_SNAPSHOT_MAX_AGE_SECONDS,
    MAX_CANDLES,
    SUPPORTED_EXCHANGES,
)
from app_services_exchange import (
    _get_cached_exchange,
    _get_supported_quote_currencies,
    _get_supported_symbols,
    _get_supported_timeframes,
    _normalize_exchange,
    _normalize_symbol,
    _normalize_timeframe,
    _resolve_market_amount_constraints,
)
from app_services_market import (
    _as_positive_finite_float,
    _build_candle_view,
    _build_fallback_candles,
    _build_supported_symbol_items,
    _count_symbols_with_24h_volume,
    _extract_volume_map_from_supported_symbols,
    _fetch_symbol_quote_volume_usdt,
    _format_compact_volume,
    _get_cached_ohlcv,
)


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
        supported_symbol.rsplit("/", 1)[-1].strip().upper()
        for supported_symbol in DEFAULT_SUPPORTED_SYMBOLS
        if isinstance(supported_symbol, str) and "/" in supported_symbol
    })
    selected_symbol = _normalize_symbol(symbol, supported_symbols)

    normalized_payload_mode = "delta" if str(payload_mode).lower() == "delta" else "full"

    if is_db_cache_enabled() and include_symbol_volumes is False and prefer_cached_chart:
        cache_lookup_symbol = (
            str(symbol).strip()
            if isinstance(symbol, str) and symbol.strip()
            else selected_symbol
        )
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
                    cached_settings_payload.get("supported_symbols")
                    if isinstance(cached_settings_payload, dict)
                    else None
                )
                if cached_volume_map:
                    for supported_symbol, cached_volume in cached_volume_map.items():
                        existing_volume = _as_positive_finite_float(
                            symbol_quote_volumes_usdt.get(supported_symbol)
                        )
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

    if (
        is_db_cache_enabled()
        and include_symbol_volumes is False
        and market_data.get("error") is None
    ):
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
            supported_symbol.rsplit("/", 1)[-1].strip().upper()
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
        "supported_symbols": _build_supported_symbol_items(
            supported_symbols,
            symbol_quote_volumes_usdt,
        ),
        "supported_timeframes": supported_timeframes,
        "supported_quote_currencies": supported_quote_currencies,
        "error": error,
    }

    if is_db_cache_enabled() and error is None:
        upsert_exchange_settings_payload(selected_exchange_key, payload)

    return payload
