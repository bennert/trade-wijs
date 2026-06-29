"""Database-backed cache helpers for market snapshots and settings payloads."""

from __future__ import annotations

import json
import os
import time
import importlib
from contextlib import contextmanager

try:
    _PSYCOPG2 = importlib.import_module("psycopg2")
except ModuleNotFoundError:  # pragma: no cover - handled gracefully at runtime
    _PSYCOPG2 = None

_DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
_STATE = {"schema_ready": False}


def is_enabled():
    """Checks if database cache is enabled.
    
    Requires DATABASE_URL environment variable and psycopg2 installed.
    """
    return bool(_DATABASE_URL) and _PSYCOPG2 is not None


@contextmanager
def _connection():
    if not is_enabled():
        raise RuntimeError("DATABASE_URL is not configured")
    if _PSYCOPG2 is None:
        raise RuntimeError("psycopg2 is not installed")

    connection = _PSYCOPG2.connect(_DATABASE_URL)
    try:
        yield connection
    finally:
        connection.close()


def ensure_schema():
    """Ensures the database schema is ready for use."""
    if _STATE["schema_ready"] or not is_enabled():
        return

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS market_snapshots (
                    exchange_key TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    timeframe TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    updated_at_unix BIGINT NOT NULL,
                    PRIMARY KEY (exchange_key, symbol, timeframe)
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS exchange_settings_cache (
                    exchange_key TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    updated_at_unix BIGINT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS chart_payload_cache_v2 (
                    exchange_key TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    timeframe TEXT NOT NULL,
                    payload_mode TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    updated_at_unix BIGINT NOT NULL,
                    PRIMARY KEY (exchange_key, symbol, timeframe, payload_mode)
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS paper_trading_state (
                    exchange_key TEXT PRIMARY KEY,
                    state_json TEXT NOT NULL,
                    updated_at_unix BIGINT NOT NULL
                )
                """
            )
        connection.commit()

    _STATE["schema_ready"] = True


def upsert_market_snapshot(exchange_key, symbol, timeframe, payload):
    """Inserts or updates a market snapshot in the database."""
    if not is_enabled() or not exchange_key or not symbol or not timeframe:
        return

    ensure_schema()
    updated_at_unix = int(time.time())
    payload_json = json.dumps(payload or {})

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO market_snapshots
                (exchange_key, symbol, timeframe, payload_json, updated_at_unix)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (exchange_key, symbol, timeframe)
                DO UPDATE SET
                    payload_json = EXCLUDED.payload_json,
                    updated_at_unix = EXCLUDED.updated_at_unix
                """,
                (exchange_key, symbol, timeframe, payload_json, updated_at_unix),
            )
        connection.commit()


def get_market_snapshot(exchange_key, symbol, timeframe, max_age_seconds=5):
    """Retrieves a market snapshot from database.
    
    Returns None if cached data is older than max_age_seconds.
    """
    if not is_enabled() or not exchange_key or not symbol or not timeframe:
        return None

    ensure_schema()

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT payload_json, updated_at_unix
                FROM market_snapshots
                WHERE exchange_key = %s AND symbol = %s AND timeframe = %s
                """,
                (exchange_key, symbol, timeframe),
            )
            row = cursor.fetchone()

    if not row:
        return None

    payload_json, updated_at_unix = row
    now_unix = int(time.time())
    age_seconds = now_unix - updated_at_unix
    if not isinstance(updated_at_unix, int) or age_seconds > int(max_age_seconds):
        return None

    try:
        payload = json.loads(payload_json)
    except (TypeError, ValueError):
        return None

    return payload if isinstance(payload, dict) else None


def upsert_exchange_settings_payload(exchange_key, payload):
    """Inserts or updates an exchange settings payload in the database."""
    if not is_enabled() or not exchange_key:
        return

    ensure_schema()
    updated_at_unix = int(time.time())
    payload_json = json.dumps(payload or {})

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO exchange_settings_cache (exchange_key, payload_json, updated_at_unix)
                VALUES (%s, %s, %s)
                ON CONFLICT (exchange_key)
                DO UPDATE SET
                    payload_json = EXCLUDED.payload_json,
                    updated_at_unix = EXCLUDED.updated_at_unix
                """,
                (exchange_key, payload_json, updated_at_unix),
            )
        connection.commit()


def get_exchange_settings_payload(exchange_key, max_age_seconds=120):
    """Retrieves an exchange settings payload from database.
    
    Returns None if cached data is older than max_age_seconds.
    """
    if not is_enabled() or not exchange_key:
        return None

    ensure_schema()

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT payload_json, updated_at_unix
                FROM exchange_settings_cache
                WHERE exchange_key = %s
                """,
                (exchange_key,),
            )
            row = cursor.fetchone()

    if not row:
        return None

    payload_json, updated_at_unix = row
    now_unix = int(time.time())
    age_seconds = now_unix - updated_at_unix
    if not isinstance(updated_at_unix, int) or age_seconds > int(
        max_age_seconds
    ):
        return None

    try:
        payload = json.loads(payload_json)
    except (TypeError, ValueError):
        return None

    return payload if isinstance(payload, dict) else None


def upsert_chart_payload(
    exchange_key, symbol, timeframe, payload, payload_mode="full"
):
    """Inserts or updates a chart payload in the database."""
    if not is_enabled() or not exchange_key or not symbol or not timeframe:
        return

    ensure_schema()
    updated_at_unix = int(time.time())
    payload_json = json.dumps(payload or {})

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO chart_payload_cache_v2
                (exchange_key, symbol, timeframe, payload_mode, payload_json,
                 updated_at_unix)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (exchange_key, symbol, timeframe, payload_mode)
                DO UPDATE SET
                    payload_json = EXCLUDED.payload_json,
                    updated_at_unix = EXCLUDED.updated_at_unix
                """,
                (
                    exchange_key,
                    symbol,
                    timeframe,
                    payload_mode,
                    payload_json,
                    updated_at_unix,
                ),
            )
        connection.commit()


def get_chart_payload(
    exchange_key,
    symbol,
    timeframe,
    max_age_seconds=15,
    payload_mode="full",
):
    """Retrieves a chart payload from database.
    
    Returns None if cached data is older than max_age_seconds.
    """
    if not is_enabled() or not exchange_key or not symbol or not timeframe:
        return None

    ensure_schema()

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT payload_json, updated_at_unix
                FROM chart_payload_cache_v2
                WHERE exchange_key = %s AND symbol = %s AND timeframe = %s
                  AND payload_mode = %s
                """,
                (exchange_key, symbol, timeframe, payload_mode),
            )
            row = cursor.fetchone()

    if not row:
        return None

    payload_json, updated_at_unix = row
    now_unix = int(time.time())
    age_seconds = now_unix - updated_at_unix
    if not isinstance(updated_at_unix, int) or age_seconds > int(
        max_age_seconds
    ):
        return None

    try:
        payload = json.loads(payload_json)
    except (TypeError, ValueError):
        return None

    return payload if isinstance(payload, dict) else None


def upsert_paper_trading_state(exchange_key, state_payload):
    """Inserts or updates paper trading state for one exchange."""
    if not is_enabled() or not exchange_key or not isinstance(state_payload, dict):
        return

    ensure_schema()
    updated_at_unix = int(time.time())
    payload_json = json.dumps(state_payload)

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO paper_trading_state (exchange_key, state_json, updated_at_unix)
                VALUES (%s, %s, %s)
                ON CONFLICT (exchange_key)
                DO UPDATE SET
                    state_json = EXCLUDED.state_json,
                    updated_at_unix = EXCLUDED.updated_at_unix
                """,
                (exchange_key, payload_json, updated_at_unix),
            )
        connection.commit()


def get_paper_trading_state(exchange_key):
    """Retrieves persisted paper trading state for one exchange."""
    if not is_enabled() or not exchange_key:
        return None

    ensure_schema()

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT state_json
                FROM paper_trading_state
                WHERE exchange_key = %s
                """,
                (exchange_key,),
            )
            row = cursor.fetchone()

    if not row:
        return None

    try:
        payload = json.loads(row[0])
    except (TypeError, ValueError):
        return None

    return payload if isinstance(payload, dict) else None


def delete_paper_trading_state(exchange_key):
    """Deletes persisted paper trading state for one exchange."""
    if not is_enabled() or not exchange_key:
        return

    ensure_schema()

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM paper_trading_state
                WHERE exchange_key = %s
                """,
                (exchange_key,),
            )
        connection.commit()


def delete_all_paper_trading_state():
    """Deletes all persisted paper trading state rows."""
    if not is_enabled():
        return

    ensure_schema()

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM paper_trading_state")
        connection.commit()
