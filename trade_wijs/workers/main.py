"""Legacy combined worker that orchestrates all worker tasks."""

from __future__ import annotations

import time

import ccxt

from db_cache import ensure_schema, is_enabled
from trade_wijs.workers.chart_warmer_worker import run_once as warm_chart_payloads
from trade_wijs.workers.exchange_settings_worker import run_once as refresh_exchange_settings
from trade_wijs.workers.market_snapshot_worker import run_once as refresh_market_snapshots

POLL_SECONDS = 3
SETTINGS_REFRESH_SECONDS = 60
CHART_REFRESH_SECONDS = 15


def main():
    """Run the legacy combined worker loop."""
    if not is_enabled():
        raise SystemExit("DATABASE_URL is not configured, worker cannot start")

    ensure_schema()
    next_settings_refresh_unix = 0
    next_chart_refresh_unix = 0
    while True:
        try:
            refresh_market_snapshots()
            now_unix = int(time.time())
            if now_unix >= next_settings_refresh_unix:
                refresh_exchange_settings()
                next_settings_refresh_unix = now_unix + SETTINGS_REFRESH_SECONDS
            if now_unix >= next_chart_refresh_unix:
                warm_chart_payloads()
                next_chart_refresh_unix = now_unix + CHART_REFRESH_SECONDS
        except (ccxt.BaseError, OSError, ValueError, TypeError):
            pass
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
