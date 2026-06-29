"""Paper trading simulation service backed by live CCXT market prices."""

from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Dict, Any, Optional

import ccxt

from app_services_exchange import (
    _extract_base_currency_from_symbol,
    _extract_quote_currency_from_symbol,
    _get_cached_exchange,
    _get_supported_symbols,
    _normalize_exchange,
    _normalize_symbol,
)
from db_cache import (
    delete_all_paper_trading_state,
    delete_paper_trading_state,
    is_enabled as is_db_cache_enabled,
    get_paper_trading_state,
    upsert_paper_trading_state,
)

_paper_state_lock = Lock()
_paper_state: Dict[str, Dict[str, Any]] = {
    "exchanges": {},
}
_loaded_exchanges = set()

_DEFAULT_QUOTE_BALANCE = 10_000.0
_MAX_RECENT_ORDERS = 50


def _build_empty_exchange_state() -> Dict[str, Any]:
    return {
        "balances": {},
        "positions": {},
        "orders": [],
        "next_order_id": 1,
    }


def _utc_timestamp() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _safe_number(value: Any) -> Optional[float]:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number <= 0:
        return None
    return number


def _resolve_execution_price(exchange_key: str, symbol: str, side: str, fallback_price: Optional[float]) -> Optional[float]:
    ticker = None
    try:
        exchange = _get_cached_exchange(exchange_key)
        ticker = exchange.fetch_ticker(symbol)
    except (
        ccxt.RequestTimeout,
        ccxt.NetworkError,
        ccxt.ExchangeNotAvailable,
        ccxt.BadSymbol,
        ccxt.ExchangeError,
        OSError,
    ):
        ticker = None

    if isinstance(ticker, dict):
        if side == "buy":
            ask = _safe_number(ticker.get("ask"))
            if ask is not None:
                return ask
        if side == "sell":
            bid = _safe_number(ticker.get("bid"))
            if bid is not None:
                return bid

        last = _safe_number(ticker.get("last"))
        if last is not None:
            return last

    return _safe_number(fallback_price)


def _get_exchange_state(exchange_key: str) -> Dict[str, Any]:
    exchange_state = _paper_state["exchanges"].get(exchange_key)
    if isinstance(exchange_state, dict):
        return exchange_state

    if is_db_cache_enabled() and exchange_key not in _loaded_exchanges:
        persisted_state = get_paper_trading_state(exchange_key)
        if isinstance(persisted_state, dict):
            persisted_balances = persisted_state.get("balances")
            persisted_positions = persisted_state.get("positions")
            persisted_orders = persisted_state.get("orders")
            persisted_next_order_id = persisted_state.get("next_order_id")

            exchange_state = {
                "balances": persisted_balances if isinstance(persisted_balances, dict) else {},
                "positions": persisted_positions if isinstance(persisted_positions, dict) else {},
                "orders": persisted_orders if isinstance(persisted_orders, list) else [],
                "next_order_id": int(persisted_next_order_id) if isinstance(persisted_next_order_id, int) and persisted_next_order_id > 0 else 1,
            }
            _paper_state["exchanges"][exchange_key] = exchange_state
            _loaded_exchanges.add(exchange_key)
            return exchange_state

    exchange_state = _build_empty_exchange_state()
    _paper_state["exchanges"][exchange_key] = exchange_state
    _loaded_exchanges.add(exchange_key)
    return exchange_state


def _persist_exchange_state(exchange_key: str, exchange_state: Dict[str, Any]) -> None:
    if not is_db_cache_enabled():
        return

    payload = {
        "balances": exchange_state.get("balances") if isinstance(exchange_state.get("balances"), dict) else {},
        "positions": exchange_state.get("positions") if isinstance(exchange_state.get("positions"), dict) else {},
        "orders": exchange_state.get("orders") if isinstance(exchange_state.get("orders"), list) else [],
        "next_order_id": int(exchange_state.get("next_order_id") or 1),
    }
    upsert_paper_trading_state(exchange_key, payload)


def _ensure_quote_balance(exchange_state: Dict[str, Any], quote_currency: str) -> None:
    balances = exchange_state["balances"]
    if quote_currency not in balances:
        balances[quote_currency] = _DEFAULT_QUOTE_BALANCE


def _get_symbol_state(exchange_state: Dict[str, Any], symbol: str) -> Dict[str, Any]:
    positions = exchange_state["positions"]
    symbol_state = positions.get(symbol)
    if isinstance(symbol_state, dict):
        return symbol_state

    symbol_state = {
        "symbol": symbol,
        "size": 0.0,
        "avg_entry_price": None,
        "realized_pnl_quote": 0.0,
        "updated_at": _utc_timestamp(),
    }
    positions[symbol] = symbol_state
    return symbol_state


def _build_state_payload(exchange_key: str, symbol: str) -> Dict[str, Any]:
    exchange_state = _get_exchange_state(exchange_key)
    symbol_state = _get_symbol_state(exchange_state, symbol)
    
    all_symbol_orders = [
        order
        for order in exchange_state["orders"]
        if order.get("symbol") == symbol
    ]
    
    open_orders = [order for order in all_symbol_orders if order.get("status") == "pending"]
    closed_orders = [order for order in all_symbol_orders if order.get("status") in ("filled", "cancelled")][-_MAX_RECENT_ORDERS:]

    balances = {
        asset: round(float(amount), 12)
        for asset, amount in exchange_state["balances"].items()
    }

    position_size = float(symbol_state.get("size") or 0.0)
    avg_entry_price = symbol_state.get("avg_entry_price")

    return {
        "exchange": exchange_key,
        "symbol": symbol,
        "balances": balances,
        "position": {
            "symbol": symbol,
            "size": round(position_size, 12),
            "avg_entry_price": round(float(avg_entry_price), 12) if isinstance(avg_entry_price, (int, float)) else None,
            "realized_pnl_quote": round(float(symbol_state.get("realized_pnl_quote") or 0.0), 12),
            "updated_at": symbol_state.get("updated_at") or _utc_timestamp(),
        },
        "open_orders": open_orders,
        "closed_orders": closed_orders,
        "recent_orders": all_symbol_orders[-_MAX_RECENT_ORDERS:],
        "paper_mode": True,
    }


def _fetch_paper_trade_state(exchange_key=None, symbol=None) -> Dict[str, Any]:
    normalized_exchange = _normalize_exchange(exchange_key)

    supported_symbols = []
    try:
        exchange = _get_cached_exchange(normalized_exchange)
        supported_symbols = _get_supported_symbols(exchange)
    except (
        ccxt.RequestTimeout,
        ccxt.NetworkError,
        ccxt.ExchangeNotAvailable,
        ccxt.BadSymbol,
        ccxt.ExchangeError,
        OSError,
    ):
        supported_symbols = []

    normalized_symbol = _normalize_symbol(symbol, supported_symbols)
    quote_currency = _extract_quote_currency_from_symbol(normalized_symbol) or "USDT"

    with _paper_state_lock:
        exchange_state = _get_exchange_state(normalized_exchange)
        balances = exchange_state.get("balances")
        if not isinstance(balances, dict):
            balances = {}
            exchange_state["balances"] = balances

        positions = exchange_state.get("positions")
        if not isinstance(positions, dict):
            positions = {}
            exchange_state["positions"] = positions

        had_quote_balance = quote_currency in balances
        had_symbol_state = normalized_symbol in positions

        _ensure_quote_balance(exchange_state, quote_currency)
        _get_symbol_state(exchange_state, normalized_symbol)

        if not had_quote_balance or not had_symbol_state:
            _persist_exchange_state(normalized_exchange, exchange_state)

        return _build_state_payload(normalized_exchange, normalized_symbol)


def _place_paper_order(payload: Dict[str, Any]) -> Dict[str, Any]:
    requested_exchange = payload.get("exchange")
    requested_symbol = payload.get("symbol")
    requested_side = str(payload.get("side") or "buy").strip().lower()
    requested_type = str(payload.get("type") or "limit").strip().lower()
    immediate_fill = not payload.get("wait_for_fill", False)

    if requested_side not in {"buy", "sell"}:
        raise ValueError("Unsupported order side")

    if requested_type not in {"limit", "market", "stop_limit", "stop_market", "oco"}:
        raise ValueError("Unsupported order type")

    normalized_exchange = _normalize_exchange(requested_exchange)

    supported_symbols = []
    try:
        exchange = _get_cached_exchange(normalized_exchange)
        supported_symbols = _get_supported_symbols(exchange)
    except (
        ccxt.RequestTimeout,
        ccxt.NetworkError,
        ccxt.ExchangeNotAvailable,
        ccxt.BadSymbol,
        ccxt.ExchangeError,
        OSError,
    ):
        supported_symbols = []

    normalized_symbol = _normalize_symbol(requested_symbol, supported_symbols)
    base_currency = _extract_base_currency_from_symbol(normalized_symbol)
    quote_currency = _extract_quote_currency_from_symbol(normalized_symbol)
    if not base_currency or not quote_currency:
        raise ValueError("Invalid trading pair")

    amount = _safe_number(payload.get("amount"))
    if amount is None:
        raise ValueError("Order amount must be a positive number")

    requested_price = _safe_number(payload.get("price"))
    stop_price = _safe_number(payload.get("stop_price"))

    if requested_type in {"limit", "stop_limit", "oco"} and requested_price is None:
        raise ValueError("Order price is required for this order type")

    if requested_type in {"stop_limit", "stop_market"} and stop_price is None:
        raise ValueError("Stop price is required for this order type")

    execution_price = _resolve_execution_price(
        normalized_exchange,
        normalized_symbol,
        requested_side,
        fallback_price=requested_price,
    )
    if execution_price is None:
        raise ValueError("Unable to determine execution price")

    # For limit-like orders, use the user-requested limit price for simulation bookkeeping.
    order_price = execution_price
    if requested_type in {"limit", "stop_limit", "oco"} and requested_price is not None:
        order_price = requested_price

    notional = amount * order_price

    with _paper_state_lock:
        exchange_state = _get_exchange_state(normalized_exchange)
        _ensure_quote_balance(exchange_state, quote_currency)
        exchange_state["balances"].setdefault(base_currency, 0.0)
        symbol_state = _get_symbol_state(exchange_state, normalized_symbol)

        quote_balance = float(exchange_state["balances"].get(quote_currency) or 0.0)
        base_balance = float(exchange_state["balances"].get(base_currency) or 0.0)

        # Only check/update balances if order fills immediately
        if immediate_fill:
            if requested_side == "buy":
                if quote_balance + 1e-12 < notional:
                    raise ValueError(f"Insufficient {quote_currency} balance for paper buy")

                previous_size = float(symbol_state.get("size") or 0.0)
                previous_avg = symbol_state.get("avg_entry_price")
                previous_cost = previous_size * float(previous_avg) if isinstance(previous_avg, (int, float)) else 0.0
                next_size = previous_size + amount
                next_cost = previous_cost + notional

                symbol_state["size"] = next_size
                symbol_state["avg_entry_price"] = (next_cost / next_size) if next_size > 0 else None
                exchange_state["balances"][quote_currency] = quote_balance - notional
                exchange_state["balances"][base_currency] = base_balance + amount
            else:
                if base_balance + 1e-12 < amount:
                    raise ValueError(f"Insufficient {base_currency} balance for paper sell")

                previous_size = float(symbol_state.get("size") or 0.0)
                previous_avg = symbol_state.get("avg_entry_price")
                avg_entry = float(previous_avg) if isinstance(previous_avg, (int, float)) else 0.0
                realized_delta = (order_price - avg_entry) * amount

                next_size = max(0.0, previous_size - amount)
                symbol_state["size"] = next_size
                symbol_state["avg_entry_price"] = avg_entry if next_size > 0 else None
                symbol_state["realized_pnl_quote"] = float(symbol_state.get("realized_pnl_quote") or 0.0) + realized_delta
                exchange_state["balances"][quote_currency] = quote_balance + notional
                exchange_state["balances"][base_currency] = base_balance - amount

            symbol_state["updated_at"] = _utc_timestamp()

        order_id = exchange_state["next_order_id"]
        exchange_state["next_order_id"] = order_id + 1
        order_timestamp = _utc_timestamp()

        order_entry = {
            "id": order_id,
            "timestamp": order_timestamp,
            "exchange": normalized_exchange,
            "symbol": normalized_symbol,
            "side": requested_side,
            "type": requested_type,
            "amount": round(amount, 12),
            "price": round(order_price, 12),
            "stop_price": round(stop_price, 12) if stop_price is not None else None,
            "notional": round(notional, 12),
            "status": "filled" if immediate_fill else "pending",
            "filled_at": order_timestamp if immediate_fill else None,
        }

        exchange_state["orders"].append(order_entry)
        if len(exchange_state["orders"]) > _MAX_RECENT_ORDERS * 2:
            exchange_state["orders"] = exchange_state["orders"][-(_MAX_RECENT_ORDERS * 2):]

        _persist_exchange_state(normalized_exchange, exchange_state)

        return {
            "order": order_entry,
            "state": _build_state_payload(normalized_exchange, normalized_symbol),
            "paper_mode": True,
        }


def _update_order_status(exchange_key: str, order_id: int, new_status: str) -> Dict[str, Any]:
    """Updates order status (pending → filled/cancelled) and applies balance changes if filling."""
    normalized_exchange = _normalize_exchange(exchange_key)
    
    if new_status not in ("filled", "cancelled"):
        raise ValueError("Unsupported status update")
    
    with _paper_state_lock:
        exchange_state = _get_exchange_state(normalized_exchange)
        order_entry = None
        order_index = -1
        
        for idx, order in enumerate(exchange_state["orders"]):
            if order.get("id") == order_id and order.get("status") == "pending":
                order_entry = order
                order_index = idx
                break
        
        if order_entry is None:
            raise ValueError(f"Pending order {order_id} not found")
        
        symbol = order_entry.get("symbol")
        symbol_state = _get_symbol_state(exchange_state, symbol)
        
        base_currency = _extract_base_currency_from_symbol(symbol)
        quote_currency = _extract_quote_currency_from_symbol(symbol)
        
        if new_status == "filled":
            # Apply balance changes for fill
            amount = float(order_entry.get("amount") or 0.0)
            price = float(order_entry.get("price") or 0.0)
            notional = amount * price
            side = order_entry.get("side")
            
            quote_balance = float(exchange_state["balances"].get(quote_currency) or 0.0)
            base_balance = float(exchange_state["balances"].get(base_currency) or 0.0)
            
            if side == "buy":
                previous_size = float(symbol_state.get("size") or 0.0)
                previous_avg = symbol_state.get("avg_entry_price")
                previous_cost = previous_size * float(previous_avg) if isinstance(previous_avg, (int, float)) else 0.0
                next_size = previous_size + amount
                next_cost = previous_cost + notional
                
                symbol_state["size"] = next_size
                symbol_state["avg_entry_price"] = (next_cost / next_size) if next_size > 0 else None
                exchange_state["balances"][quote_currency] = quote_balance - notional
                exchange_state["balances"][base_currency] = base_balance + amount
            elif side == "sell":
                previous_size = float(symbol_state.get("size") or 0.0)
                previous_avg = symbol_state.get("avg_entry_price")
                avg_entry = float(previous_avg) if isinstance(previous_avg, (int, float)) else 0.0
                realized_delta = (price - avg_entry) * amount
                
                next_size = max(0.0, previous_size - amount)
                symbol_state["size"] = next_size
                symbol_state["avg_entry_price"] = avg_entry if next_size > 0 else None
                symbol_state["realized_pnl_quote"] = float(symbol_state.get("realized_pnl_quote") or 0.0) + realized_delta
                exchange_state["balances"][quote_currency] = quote_balance + notional
                exchange_state["balances"][base_currency] = base_balance - amount
            
            symbol_state["updated_at"] = _utc_timestamp()
        
        # Update order status
        order_entry["status"] = new_status
        order_entry["status_updated_at"] = _utc_timestamp()
        if new_status == "filled":
            order_entry["filled_at"] = _utc_timestamp()
        exchange_state["orders"][order_index] = order_entry
        
        _persist_exchange_state(normalized_exchange, exchange_state)
        
        return {
            "order": order_entry,
            "state": _build_state_payload(normalized_exchange, symbol),
            "paper_mode": True,
        }


def _reset_paper_trade_state(exchange_key=None, reset_all=False) -> Dict[str, Any]:
    """Resets persisted and in-memory paper trading state."""
    with _paper_state_lock:
        if reset_all:
            _paper_state["exchanges"] = {}
            _loaded_exchanges.clear()
            delete_all_paper_trading_state()
            return {
                "paper_mode": True,
                "reset_scope": "all",
                "message": "All paper trading state has been reset.",
            }

        normalized_exchange = _normalize_exchange(exchange_key)
        _paper_state["exchanges"].pop(normalized_exchange, None)
        _loaded_exchanges.discard(normalized_exchange)
        delete_paper_trading_state(normalized_exchange)
        return {
            "paper_mode": True,
            "reset_scope": "exchange",
            "exchange": normalized_exchange,
            "message": f"Paper trading state for {normalized_exchange} has been reset.",
        }
