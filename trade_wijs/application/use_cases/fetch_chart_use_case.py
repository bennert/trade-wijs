"""Use case for fetching chart data with parameter validation and normalization."""

from urllib.parse import unquote
from dataclasses import dataclass
from typing import Optional

from app_services_payloads import _fetch_chart_payload
from app_services_market import _get_git_version


@dataclass
class ChartRequest:
    """Encapsulates chart data fetch request parameters."""
    
    timeframe: Optional[str]
    exchange: Optional[str]
    symbol: Optional[str]
    mode: Optional[str] = "full"
    include_symbol_volumes: bool = True
    prefer_cached_chart: bool = True

    @classmethod
    def from_flask_args(cls, args, cookies=None):
        """Create ChartRequest from Flask request.args and cookies."""
        cookies = cookies or {}
        
        def decode_value(value):
            return unquote(value) if isinstance(value, str) else value
        
        return cls(
            timeframe=decode_value(args.get("timeframe") or cookies.get("trade_wijs_timeframe")),
            exchange=decode_value(args.get("exchange") or cookies.get("trade_wijs_exchange")),
            symbol=decode_value(args.get("symbol") or cookies.get("trade_wijs_symbol")),
            mode=decode_value(args.get("mode") or "full"),
            include_symbol_volumes=args.get("include_symbol_volumes", True),
            prefer_cached_chart=args.get("prefer_cached_chart", True) if isinstance(args.get("prefer_cached_chart"), bool) else True,
        )


@dataclass
class ChartResponse:
    """Encapsulates chart data response payload."""
    
    payload: dict
    cookies: dict  # {name: value} for HTTP response

    def __init__(self, payload, cookies=None):
        self.payload = payload
        self.cookies = cookies or {}


class FetchChartUseCase:
    """Use case for fetching chart data."""
    
    def __call__(self, request: ChartRequest) -> ChartResponse:
        """Execute the use case.
        
        Args:
            request: ChartRequest with timeframe, exchange, symbol
            
        Returns:
            ChartResponse with payload and cookies to set
        """
        # Normalize mode to "delta" or "full"
        normalized_mode = "delta" if str(request.mode).lower() == "delta" else "full"
        
        # Fetch payload from business logic
        payload = _fetch_chart_payload(
            request.timeframe,
            request.exchange,
            request.symbol,
            include_symbol_volumes=request.include_symbol_volumes,
            payload_mode=normalized_mode,
            prefer_cached_chart=request.prefer_cached_chart,
        )
        
        # Add app version
        payload["app_version"] = _get_git_version()
        
        # Prepare cookies to persist user selections
        cookie_ttl = 60 * 60 * 24 * 365
        cookies = {
            "trade_wijs_timeframe": {
                "value": payload["market_data"]["timeframe"],
                "max_age": cookie_ttl,
                "samesite": "Lax",
            },
            "trade_wijs_exchange": {
                "value": payload["market_data"]["exchange_key"],
                "max_age": cookie_ttl,
                "samesite": "Lax",
            },
            "trade_wijs_symbol": {
                "value": payload["market_data"]["symbol"],
                "max_age": cookie_ttl,
                "samesite": "Lax",
            },
        }
        
        return ChartResponse(payload, cookies)
