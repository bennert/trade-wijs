"""Compatibility layer aggregating split service modules."""

from app_services_config import (
    CHART_PAYLOAD_MAX_AGE_SECONDS as _CHART_PAYLOAD_MAX_AGE_SECONDS,
    DEFAULT_EXCHANGE_KEY as _DEFAULT_EXCHANGE_KEY,
    DEFAULT_PRICE_MAX as _DEFAULT_PRICE_MAX,
    DEFAULT_PRICE_MIN as _DEFAULT_PRICE_MIN,
    DEFAULT_SUPPORTED_SYMBOLS as _DEFAULT_SUPPORTED_SYMBOLS,
    DEFAULT_SUPPORTED_TIMEFRAMES as _DEFAULT_SUPPORTED_TIMEFRAMES,
    EXCHANGE_SETTINGS_MAX_AGE_SECONDS as _EXCHANGE_SETTINGS_MAX_AGE_SECONDS,
    MARKET_SNAPSHOT_MAX_AGE_SECONDS as _MARKET_SNAPSHOT_MAX_AGE_SECONDS,
    MAX_CANDLES as _MAX_CANDLES,
    SUPPORTED_EXCHANGES as _SUPPORTED_EXCHANGES,
)
from app_services_exchange import (
    _extract_base_currency_from_symbol,
    _extract_quote_currency_from_symbol,
    _format_number_for_input,
    _get_cached_exchange,
    _get_supported_quote_currencies,
    _get_supported_symbols,
    _get_supported_timeframes,
    _is_valid_timeframe,
    _normalize_exchange,
    _normalize_quote_currency_candidate,
    _normalize_symbol,
    _normalize_timeframe,
    _resolve_market_amount_constraints,
    _sort_timeframe_values,
    _timeframe_to_seconds,
)
from app_services_market import (
    _as_positive_finite_float,
    _build_candle_view,
    _build_fallback_candles,
    _build_supported_symbol_items,
    _count_symbols_with_24h_volume,
    _extract_volume_map_from_supported_symbols,
    _fetch_ohlcv_window,
    _fetch_symbol_quote_volume_usdt,
    _format_compact_volume,
    _get_cached_ohlcv,
    _get_git_version,
)

# Re-export shared constants for backward compatibility.
CHART_PAYLOAD_MAX_AGE_SECONDS = _CHART_PAYLOAD_MAX_AGE_SECONDS
DEFAULT_EXCHANGE_KEY = _DEFAULT_EXCHANGE_KEY
DEFAULT_PRICE_MAX = _DEFAULT_PRICE_MAX
DEFAULT_PRICE_MIN = _DEFAULT_PRICE_MIN
DEFAULT_SUPPORTED_SYMBOLS = _DEFAULT_SUPPORTED_SYMBOLS
DEFAULT_SUPPORTED_TIMEFRAMES = _DEFAULT_SUPPORTED_TIMEFRAMES
EXCHANGE_SETTINGS_MAX_AGE_SECONDS = _EXCHANGE_SETTINGS_MAX_AGE_SECONDS
MARKET_SNAPSHOT_MAX_AGE_SECONDS = _MARKET_SNAPSHOT_MAX_AGE_SECONDS
MAX_CANDLES = _MAX_CANDLES
SUPPORTED_EXCHANGES = _SUPPORTED_EXCHANGES

# Public aliases (non-underscore) while retaining legacy underscore names.
as_positive_finite_float = _as_positive_finite_float
build_candle_view = _build_candle_view
build_fallback_candles = _build_fallback_candles
build_supported_symbol_items = _build_supported_symbol_items
count_symbols_with_24h_volume = _count_symbols_with_24h_volume
extract_base_currency_from_symbol = _extract_base_currency_from_symbol
extract_quote_currency_from_symbol = _extract_quote_currency_from_symbol
extract_volume_map_from_supported_symbols = _extract_volume_map_from_supported_symbols
fetch_ohlcv_window = _fetch_ohlcv_window
fetch_symbol_quote_volume_usdt = _fetch_symbol_quote_volume_usdt
format_compact_volume = _format_compact_volume
format_number_for_input = _format_number_for_input
get_cached_exchange = _get_cached_exchange
get_cached_ohlcv = _get_cached_ohlcv
get_git_version = _get_git_version
get_supported_quote_currencies = _get_supported_quote_currencies
get_supported_symbols = _get_supported_symbols
get_supported_timeframes = _get_supported_timeframes
is_valid_timeframe = _is_valid_timeframe
normalize_exchange = _normalize_exchange
normalize_quote_currency_candidate = _normalize_quote_currency_candidate
normalize_symbol = _normalize_symbol
normalize_timeframe = _normalize_timeframe
resolve_market_amount_constraints = _resolve_market_amount_constraints
sort_timeframe_values = _sort_timeframe_values
timeframe_to_seconds = _timeframe_to_seconds
