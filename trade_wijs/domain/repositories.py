"""Repository and gateway interfaces for Trade Wijs data access."""

from abc import ABC, abstractmethod
from typing import Optional, List

from trade_wijs.domain.models import (
    ChartPayload,
    MarketQuotePayload,
    ExchangeSettingsPayload,
)


class CacheRepository(ABC):
    """Repository interface for caching chart, quote, and settings data."""
    
    @abstractmethod
    def is_enabled(self) -> bool:
        """Check if caching is enabled."""
        pass
    
    @abstractmethod
    def get_chart_payload(
        self,
        exchange_key: str,
        symbol: str,
        timeframe: str,
        max_age_seconds: int,
        payload_mode: str,
    ) -> Optional[ChartPayload]:
        """Retrieve cached chart payload if fresh enough."""
        pass
    
    @abstractmethod
    def upsert_chart_payload(
        self,
        exchange_key: str,
        symbol: str,
        timeframe: str,
        payload: ChartPayload,
    ) -> None:
        """Store or update chart payload in cache."""
        pass
    
    @abstractmethod
    def get_market_snapshot(
        self,
        exchange_key: str,
        symbol: str,
        max_age_seconds: int,
    ) -> Optional[dict]:
        """Retrieve cached market snapshot (ticker)."""
        pass
    
    @abstractmethod
    def upsert_market_snapshot(
        self,
        exchange_key: str,
        symbol: str,
        market_data: dict,
    ) -> None:
        """Store or update market snapshot in cache."""
        pass
    
    @abstractmethod
    def get_exchange_settings_payload(
        self,
        exchange_key: str,
        max_age_seconds: int,
    ) -> Optional[ExchangeSettingsPayload]:
        """Retrieve cached exchange settings if fresh enough."""
        pass
    
    @abstractmethod
    def upsert_exchange_settings_payload(
        self,
        exchange_key: str,
        payload: ExchangeSettingsPayload,
    ) -> None:
        """Store or update exchange settings in cache."""
        pass


class ExchangeGateway(ABC):
    """Gateway interface for cryptocurrency exchange data access."""
    
    @abstractmethod
    def get_supported_symbols(self, exchange_key: str) -> List[str]:
        """Get all supported trading symbols for an exchange."""
        pass
    
    @abstractmethod
    def get_supported_timeframes(self, exchange_key: str) -> List[str]:
        """Get all supported candlestick timeframes for an exchange."""
        pass
    
    @abstractmethod
    def get_supported_quote_currencies(
        self,
        exchange_key: str,
        symbols: List[str],
    ) -> List[str]:
        """Get unique quote currencies from symbols."""
        pass
    
    @abstractmethod
    def get_ohlcv(
        self,
        exchange_key: str,
        symbol: str,
        timeframe: str,
        limit: int = 1000,
    ) -> List[list]:
        """Fetch OHLCV candles for symbol/timeframe."""
        pass
    
    @abstractmethod
    def get_ticker(
        self,
        exchange_key: str,
        symbol: str,
    ) -> Optional[dict]:
        """Fetch current ticker data (bid, ask, last price, volume)."""
        pass
    
    @abstractmethod
    def get_market(
        self,
        exchange_key: str,
        symbol: str,
    ) -> Optional[dict]:
        """Fetch market constraints (min/max amount, precision)."""
        pass
    
    @abstractmethod
    def fetch_symbol_quote_volume_usdt(
        self,
        exchange_key: str,
        symbol: str,
    ) -> Optional[float]:
        """Fetch 24h quote currency volume in USDT for symbol."""
        pass
