"""Worker that refreshes market snapshot cache entries."""

from __future__ import annotations

import time

import ccxt

from app_services_config import DEFAULT_SUPPORTED_SYMBOLS, SUPPORTED_EXCHANGES
from app_services_exchange import _normalize_symbol
from db_cache import ensure_schema, is_enabled, upsert_market_snapshot
from trade_wijs.workers.health_check import WorkerHealthChecker
from trade_wijs.workers.logging import (
    create_worker_logger,
    log_cycle_start,
    log_cycle_complete,
    log_cycle_error,
    log_worker_startup,
    log_worker_shutdown,
)

POLL_SECONDS = 3
WORKER_NAME = "market-snapshots"


def build_market_data(exchange_key, exchange_label, timeframe, symbol, ticker):
    """Build a market data dictionary from ticker information."""
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
    """Refresh market snapshots for all supported exchanges and default symbols."""
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


def main():
    """Run the market snapshot worker loop."""
    logger = create_worker_logger(WORKER_NAME)
    health = WorkerHealthChecker(WORKER_NAME)
    
    if not is_enabled():
        log_worker_shutdown(logger, WORKER_NAME, "DATABASE_URL not configured")
        raise SystemExit("DATABASE_URL is not configured, worker cannot start")

    ensure_schema()
    log_worker_startup(logger, WORKER_NAME, POLL_SECONDS)
    
    cycle = 0
    while True:
        cycle += 1
        cycle_start = time.time()
        
        try:
            log_cycle_start(logger, cycle, WORKER_NAME)
            run_once()
            duration = time.time() - cycle_start
            
            # Count total symbols refreshed (exchanges * symbols)
            items_processed = len(SUPPORTED_EXCHANGES) * len(DEFAULT_SUPPORTED_SYMBOLS)
            log_cycle_complete(logger, cycle, WORKER_NAME, duration, items_processed)
            health.record_success()
        except (ccxt.BaseError, OSError, ValueError, TypeError) as error:
            duration = time.time() - cycle_start
            log_cycle_error(logger, cycle, WORKER_NAME, error, duration)
            health.record_failure(error)
            # Keep worker alive even if one cycle fails
        except Exception as error:
            duration = time.time() - cycle_start
            log_cycle_error(logger, cycle, WORKER_NAME, error, duration)
            health.record_failure(error)
            # Re-raise unexpected errors
            raise
        
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
