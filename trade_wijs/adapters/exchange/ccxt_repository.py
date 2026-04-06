"""Exchange gateway implementation using CCXT."""

from typing import Optional, List

from trade_wijs.domain.repositories import ExchangeGateway

# Import legacy exchange functions from where they actually are
from app_services_shared import (
    _fetch_ohlcv_window,
    _fetch_symbol_quote_volume_usdt,
)
from app_services_exchange import (
    _get_cached_exchange,
    _get_supported_symbols,
    _get_supported_timeframes,
    _get_supported_quote_currencies,
)


class CcxtExchangeGateway(ExchangeGateway):
    """CCXT-backed exchange gateway adapter."""
    
    def get_supported_symbols(self, exchange_key: str) -> List[str]:
        """Get all supported trading symbols for an exchange."""
        try:
            exchange = _get_cached_exchange(exchange_key)
            return _get_supported_symbols(exchange)
        except Exception:
            return []
    
    def get_supported_timeframes(self, exchange_key: str) -> List[str]:
        """Get all supported candlestick timeframes for an exchange."""
        try:
            exchange = _get_cached_exchange(exchange_key)
            return _get_supported_timeframes(exchange)
        except Exception:
            return []
    
    def get_supported_quote_currencies(
        self,
        exchange_key: str,
        symbols: List[str],
    ) -> List[str]:
        """Get unique quote currencies from symbols."""
        try:
            exchange = _get_cached_exchange(exchange_key)
            return _get_supported_quote_currencies(exchange, symbols)
        except Exception:
            return []
    
    def get_ohlcv(
        self,
        exchange_key: str,
        symbol: str,
        timeframe: str,
        limit: int = 1000,
    ) -> List[list]:
        """Fetch OHLCV candles for symbol/timeframe."""
        try:
            return _fetch_ohlcv_window(
                exchange_key,
                symbol,
                timeframe,
                max_count=limit,
            )
        except Exception:
            return []
    
    def get_ticker(
        self,
        exchange_key: str,
        symbol: str,
    ) -> Optional[dict]:
        """Fetch current ticker data (bid, ask, last price, volume)."""
        try:
            exchange = _get_cached_exchange(exchange_key)
            return exchange.fetch_ticker(symbol)
        except Exception:
            return None
    
    def get_market(
        self,
        exchange_key: str,
        symbol: str,
    ) -> Optional[dict]:
        """Fetch market constraints (min/max amount, precision)."""
        try:
            exchange = _get_cached_exchange(exchange_key)
            if hasattr(exchange, 'markets') and symbol in exchange.markets:
                return exchange.markets[symbol]
        except Exception:
            pass
        return None
    
    def fetch_symbol_quote_volume_usdt(
        self,
        exchange_key: str,
        symbol: str,
    ) -> Optional[float]:
        """Fetch 24h quote currency volume in USDT for symbol."""
        try:
            return _fetch_symbol_quote_volume_usdt(exchange_key, symbol)
        except Exception:
            return None
