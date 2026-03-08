"""Database-backed cache helpers for market snapshots."""

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
        connection.commit()

    _STATE["schema_ready"] = True


def upsert_market_snapshot(exchange_key, symbol, timeframe, payload):
    if not is_enabled() or not exchange_key or not symbol or not timeframe:
        return

    ensure_schema()
    updated_at_unix = int(time.time())
    payload_json = json.dumps(payload or {})

    with _connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO market_snapshots (exchange_key, symbol, timeframe, payload_json, updated_at_unix)
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
    if not isinstance(updated_at_unix, int) or (now_unix - updated_at_unix) > int(max_age_seconds):
        return None

    try:
        payload = json.loads(payload_json)
    except (TypeError, ValueError):
        return None

    return payload if isinstance(payload, dict) else None
