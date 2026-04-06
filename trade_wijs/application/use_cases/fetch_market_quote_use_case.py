"""Use case for fetching market quote data with parameter validation and normalization."""

from urllib.parse import unquote
from dataclasses import dataclass
from typing import Optional

from app_services_payloads import _fetch_market_quote_payload


@dataclass
class MarketQuoteRequest:
    """Encapsulates market quote fetch request parameters."""
    
    exchange: Optional[str]
    symbol: Optional[str]
    timeframe: Optional[str]
    
    @classmethod
    def from_flask_args(cls, args):
        """Create MarketQuoteRequest from Flask request.args."""
        def decode_value(value):
            return unquote(value) if isinstance(value, str) else value
        
        return cls(
            exchange=decode_value(args.get("exchange")),
            symbol=decode_value(args.get("symbol")),
            timeframe=decode_value(args.get("timeframe")),
        )


@dataclass
class MarketQuoteResponse:
    """Encapsulates market quote response payload."""
    
    payload: dict


class FetchMarketQuoteUseCase:
    """Use case for fetching market quote data."""
    
    def __call__(self, request: MarketQuoteRequest) -> MarketQuoteResponse:
        """Execute the use case.
        
        Args:
            request: MarketQuoteRequest with exchange, symbol, timeframe
            
        Returns:
            MarketQuoteResponse with payload
        """
        payload = _fetch_market_quote_payload(
            request.exchange,
            request.symbol,
            request.timeframe,
        )
        
        return MarketQuoteResponse(payload)
