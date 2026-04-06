"""Domain models for Trade Wijs data structures."""

from dataclasses import dataclass, field
from typing import Optional, Any, Dict, List
from datetime import datetime


@dataclass
class MarketData:
    """Market data common to chart and quote payloads."""
    
    symbol: str
    display_symbol: str
    exchange_key: str
    exchange: str
    timeframe: str
    timestamp_unix: int
    
    # Market constraints (from exchange)
    amount_step: Optional[float] = None
    amount_min: Optional[float] = None
    amount_precision: Optional[int] = None
    total_min: Optional[float] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    price_step: Optional[float] = None
    
    # Market state
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "symbol": self.symbol,
            "display_symbol": self.display_symbol,
            "exchange_key": self.exchange_key,
            "exchange": self.exchange,
            "timeframe": self.timeframe,
            "timestamp_unix": self.timestamp_unix,
            "amount_step": self.amount_step,
            "amount_min": self.amount_min,
            "amount_precision": self.amount_precision,
            "total_min": self.total_min,
            "price_min": self.price_min,
            "price_max": self.price_max,
            "price_step": self.price_step,
            "error": self.error,
        }


@dataclass
class Candle:
    """OHLCV candle data."""
    
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "t": self.timestamp,
            "o": self.open,
            "h": self.high,
            "l": self.low,
            "c": self.close,
            "v": self.volume,
        }


@dataclass
class ChartPayload:
    """Chart data payload with OHLCV candles and drawing points."""
    
    market_data: MarketData
    candles: List[Candle]
    axis_levels: List[Dict[str, Any]] = field(default_factory=list)
    footer_points: List[Dict[str, Any]] = field(default_factory=list)
    payload_mode: str = "full"  # "full" or "delta"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "market_data": self.market_data.to_dict(),
            "candles": [c.to_dict() for c in self.candles],
            "axis_levels": self.axis_levels,
            "footer_points": self.footer_points,
            "payload_mode": self.payload_mode,
        }


@dataclass
class QuoteData(MarketData):
    """Market quote data - extends MarketData with quotes."""
    
    last: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    quote_volume: Optional[float] = None
    quote_volume_compact: Optional[str] = None
    timestamp: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        base = super().to_dict()
        base.update({
            "last": self.last,
            "bid": self.bid,
            "ask": self.ask,
            "high": self.high,
            "low": self.low,
            "quote_volume": self.quote_volume,
            "quote_volume_compact": self.quote_volume_compact,
            "timestamp": self.timestamp,
        })
        return base


@dataclass
class MarketQuotePayload:
    """Market quote payload with lightweight price/volume updates."""
    
    market_data: QuoteData
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "market_data": self.market_data.to_dict(),
        }


@dataclass
class SupportedSymbolItem:
    """Symbol with volume metadata for exchange."""
    
    symbol: str
    quote_volume_24h_usdt: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "symbol": self.symbol,
            "quote_volume_24h_usdt": self.quote_volume_24h_usdt,
        }


@dataclass
class ExchangeSettingsPayload:
    """Exchange settings options and metadata."""
    
    exchange_key: str
    supported_symbols: List[SupportedSymbolItem]
    supported_timeframes: List[str]
    supported_quote_currencies: List[str]
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "error": self.error,
            "exchange_key": self.exchange_key,
            "supported_symbols": [s.to_dict() for s in self.supported_symbols],
            "supported_timeframes": self.supported_timeframes,
            "supported_quote_currencies": self.supported_quote_currencies,
        }
