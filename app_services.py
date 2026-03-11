"""Compatibility layer for trade wijs service modules."""

from app_services_payloads import (
    _fetch_chart_payload as fetch_chart_payload,
    _fetch_exchange_settings_options_payload as fetch_exchange_settings_options_payload,
    _fetch_market_quote_payload as fetch_market_quote_payload,
)
from app_services_shared import (
    _as_positive_finite_float as as_positive_finite_float,
    _build_candle_view as build_candle_view,
    _build_fallback_candles as build_fallback_candles,
    _build_supported_symbol_items as build_supported_symbol_items,
    _count_symbols_with_24h_volume as count_symbols_with_24h_volume,
    _extract_base_currency_from_symbol as extract_base_currency_from_symbol,
    _extract_quote_currency_from_symbol as extract_quote_currency_from_symbol,
    _extract_volume_map_from_supported_symbols as extract_volume_map_from_supported_symbols,
    _fetch_ohlcv_window as fetch_ohlcv_window,
    _fetch_symbol_quote_volume_usdt as fetch_symbol_quote_volume_usdt,
    _format_compact_volume as format_compact_volume,
    _format_number_for_input as format_number_for_input,
    _get_cached_exchange as get_cached_exchange,
    _get_cached_ohlcv as get_cached_ohlcv,
    _get_git_version as get_git_version,
    _get_supported_quote_currencies as get_supported_quote_currencies,
    _get_supported_symbols as get_supported_symbols,
    _get_supported_timeframes as get_supported_timeframes,
    _is_valid_timeframe as is_valid_timeframe,
    _normalize_exchange as normalize_exchange,
    _normalize_quote_currency_candidate as normalize_quote_currency_candidate,
    _normalize_symbol as normalize_symbol,
    _normalize_timeframe as normalize_timeframe,
    _resolve_market_amount_constraints as resolve_market_amount_constraints,
    _sort_timeframe_values as sort_timeframe_values,
    _timeframe_to_seconds as timeframe_to_seconds,
)

# Backwards-compatible aliases for legacy private-style imports.
_fetch_chart_payload = fetch_chart_payload
_fetch_exchange_settings_options_payload = fetch_exchange_settings_options_payload
_fetch_market_quote_payload = fetch_market_quote_payload
_as_positive_finite_float = as_positive_finite_float
_build_candle_view = build_candle_view
_build_fallback_candles = build_fallback_candles
_build_supported_symbol_items = build_supported_symbol_items
_count_symbols_with_24h_volume = count_symbols_with_24h_volume
_extract_base_currency_from_symbol = extract_base_currency_from_symbol
_extract_quote_currency_from_symbol = extract_quote_currency_from_symbol
_extract_volume_map_from_supported_symbols = extract_volume_map_from_supported_symbols
_fetch_ohlcv_window = fetch_ohlcv_window
_fetch_symbol_quote_volume_usdt = fetch_symbol_quote_volume_usdt
_format_compact_volume = format_compact_volume
_format_number_for_input = format_number_for_input
_get_cached_exchange = get_cached_exchange
_get_cached_ohlcv = get_cached_ohlcv
_get_git_version = get_git_version
_get_supported_quote_currencies = get_supported_quote_currencies
_get_supported_symbols = get_supported_symbols
_get_supported_timeframes = get_supported_timeframes
_is_valid_timeframe = is_valid_timeframe
_normalize_exchange = normalize_exchange
_normalize_quote_currency_candidate = normalize_quote_currency_candidate
_normalize_symbol = normalize_symbol
_normalize_timeframe = normalize_timeframe
_resolve_market_amount_constraints = resolve_market_amount_constraints
_sort_timeframe_values = sort_timeframe_values
_timeframe_to_seconds = timeframe_to_seconds
