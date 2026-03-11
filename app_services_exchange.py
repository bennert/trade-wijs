"""Exchange and symbol normalization helpers."""

import math
import re
import time

import ccxt

from app_services_config import (
    DEFAULT_EXCHANGE_KEY,
    DEFAULT_PRICE_MAX,
    DEFAULT_PRICE_MIN,
    DEFAULT_SUPPORTED_SYMBOLS,
    DEFAULT_SUPPORTED_TIMEFRAMES,
    EXCHANGE_CACHE_TTL_SECONDS,
    SUPPORTED_EXCHANGES,
)

_exchange_cache = {}


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

    if (
        price_step is None
        and min_price_value is not None
        and math.isfinite(min_price_value)
        and 0 < min_price_value < 1
    ):
        price_step = min_price_value

    amount_precision = None
    if (
        isinstance(precision_amount, (int, float))
        and math.isfinite(float(precision_amount))
        and float(precision_amount) >= 0
    ):
        amount_precision = float(precision_amount)

    price_precision = None
    if (
        isinstance(precision_price, (int, float))
        and math.isfinite(float(precision_price))
        and float(precision_price) >= 0
    ):
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
        filtered = [
            timeframe
            for timeframe in raw_timeframes.keys()
            if _is_valid_timeframe(timeframe)
        ]
        if filtered:
            return _sort_timeframe_values(filtered)

    return list(DEFAULT_SUPPORTED_TIMEFRAMES)


def _get_supported_quote_currencies(exchange, supported_symbols=None):
    markets = getattr(exchange, "markets", None)
    symbols = list(supported_symbols or [])
    if not isinstance(markets, dict):
        fallback_quote_currencies = {
            quote_currency
            for quote_currency in (
                _extract_quote_currency_from_symbol(symbol)
                for symbol in symbols
            )
            if quote_currency
        }
        return sorted(fallback_quote_currencies)

    quote_currencies = set()
    for market in markets.values():
        if not isinstance(market, dict):
            continue

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
