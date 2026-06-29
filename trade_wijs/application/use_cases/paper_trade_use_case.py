"""Use cases for paper trading simulation endpoints."""

from urllib.parse import unquote
from dataclasses import dataclass
from typing import Optional

from app_services_paper_trading import (
    _fetch_paper_trade_state,
    _place_paper_order,
    _reset_paper_trade_state,
)


@dataclass
class PaperTradeStateRequest:
    """Encapsulates paper trade state fetch request parameters."""

    exchange: Optional[str]
    symbol: Optional[str]

    @classmethod
    def from_flask_args(cls, args):
        """Create PaperTradeStateRequest from Flask request.args."""

        def decode_value(value):
            return unquote(value) if isinstance(value, str) else value

        return cls(
            exchange=decode_value(args.get("exchange")),
            symbol=decode_value(args.get("symbol")),
        )


@dataclass
class PaperTradeStateResponse:
    """Encapsulates paper trade state response payload."""

    payload: dict


class FetchPaperTradeStateUseCase:
    """Use case for fetching paper trade portfolio and order state."""

    def __call__(self, request: PaperTradeStateRequest) -> PaperTradeStateResponse:
        payload = _fetch_paper_trade_state(
            request.exchange,
            request.symbol,
        )
        return PaperTradeStateResponse(payload)


@dataclass
class PlacePaperOrderRequest:
    """Encapsulates paper order placement request payload."""

    payload: dict

    @classmethod
    def from_json(cls, payload):
        """Create PlacePaperOrderRequest from JSON body."""
        return cls(payload=payload if isinstance(payload, dict) else {})


@dataclass
class PlacePaperOrderResponse:
    """Encapsulates paper order placement response payload."""

    payload: dict


class PlacePaperOrderUseCase:
    """Use case for placing paper orders against live CCXT prices."""

    def __call__(self, request: PlacePaperOrderRequest) -> PlacePaperOrderResponse:
        payload = _place_paper_order(request.payload)
        return PlacePaperOrderResponse(payload)


@dataclass
class ResetPaperTradeStateRequest:
    """Encapsulates paper trade reset request parameters."""

    exchange: Optional[str]
    reset_all: bool = False

    @classmethod
    def from_json(cls, payload):
        """Create ResetPaperTradeStateRequest from JSON body."""
        payload = payload if isinstance(payload, dict) else {}
        return cls(
            exchange=payload.get("exchange"),
            reset_all=bool(payload.get("reset_all")),
        )


@dataclass
class ResetPaperTradeStateResponse:
    """Encapsulates paper trade reset response payload."""

    payload: dict


class ResetPaperTradeStateUseCase:
    """Use case for resetting paper trade state for one exchange or all exchanges."""

    def __call__(self, request: ResetPaperTradeStateRequest) -> ResetPaperTradeStateResponse:
        payload = _reset_paper_trade_state(
            exchange_key=request.exchange,
            reset_all=request.reset_all,
        )
        return ResetPaperTradeStateResponse(payload)
