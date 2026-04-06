"""Worker that warms chart payload cache entries."""

from __future__ import annotations

import time

import ccxt

from app_services_config import DEFAULT_SUPPORTED_SYMBOLS, SUPPORTED_EXCHANGES
from app_services_payloads import _fetch_chart_payload
from db_cache import ensure_schema, is_enabled
from trade_wijs.workers.health_check import WorkerHealthChecker
from trade_wijs.workers.logging import (
    create_worker_logger,
    log_cycle_start,
    log_cycle_complete,
    log_cycle_error,
    log_worker_startup,
    log_worker_shutdown,
)

POLL_SECONDS = 15
CHART_WARM_TIMEFRAMES = ("1m", "5m", "1h")
WORKER_NAME = "chart-warmer"


def run_once():
    """Warm chart payloads for all supported exchanges, symbols, and timeframes."""
    for exchange_key, _metadata in SUPPORTED_EXCHANGES.items():
        for symbol in DEFAULT_SUPPORTED_SYMBOLS:
            for timeframe in CHART_WARM_TIMEFRAMES:
                _fetch_chart_payload(
                    timeframe=timeframe,
                    exchange_key=exchange_key,
                    symbol=symbol,
                    include_symbol_volumes=False,
                    prefer_cached_chart=False,
                )


def main():
    """Run the chart warmer worker loop."""
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
            
            items_processed = (
                len(SUPPORTED_EXCHANGES) 
                * len(DEFAULT_SUPPORTED_SYMBOLS) 
                * len(CHART_WARM_TIMEFRAMES)
            )
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
