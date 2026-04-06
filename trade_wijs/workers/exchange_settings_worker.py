"""Worker that refreshes exchange settings payload cache entries."""

from __future__ import annotations

import time

import ccxt

from app_services_config import SUPPORTED_EXCHANGES
from app_services_exchange import (
    _get_supported_quote_currencies,
    _get_supported_symbols,
    _get_supported_timeframes,
)
from app_services_market import (
    _build_supported_symbol_items,
    _fetch_symbol_quote_volume_usdt,
)
from db_cache import ensure_schema, is_enabled, upsert_exchange_settings_payload
from trade_wijs.workers.health_check import WorkerHealthChecker
from trade_wijs.workers.logging import (
    create_worker_logger,
    log_cycle_start,
    log_cycle_complete,
    log_cycle_error,
    log_worker_startup,
    log_worker_shutdown,
)

POLL_SECONDS = 60
WORKER_NAME = "exchange-settings"


def run_once():
    """Refresh exchange settings payloads for all supported exchanges."""
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


def main():
    """Run the exchange settings worker loop."""
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
            
            items_processed = len(SUPPORTED_EXCHANGES)
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
