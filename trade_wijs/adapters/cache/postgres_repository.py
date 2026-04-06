"""Cache repository implementation using PostgreSQL."""

from typing import Optional

from trade_wijs.domain.models import (
    ChartPayload,
    ExchangeSettingsPayload,
)
from trade_wijs.domain.repositories import CacheRepository

# Import legacy cache functions
from db_cache import (
    is_enabled as is_db_cache_enabled,
    get_chart_payload as db_get_chart_payload,
    upsert_chart_payload as db_upsert_chart_payload,
    get_market_snapshot as db_get_market_snapshot,
    upsert_market_snapshot as db_upsert_market_snapshot,
    get_exchange_settings_payload as db_get_exchange_settings_payload,
    upsert_exchange_settings_payload as db_upsert_exchange_settings_payload,
)


class PostgresCacheRepository(CacheRepository):
    """PostgreSQL-backed cache repository adapter."""
    
    def is_enabled(self) -> bool:
        """Check if database caching is enabled."""
        return is_db_cache_enabled()
    
    def get_chart_payload(
        self,
        exchange_key: str,
        symbol: str,
        timeframe: str,
        max_age_seconds: int,
        payload_mode: str,
    ) -> Optional[ChartPayload]:
        """Retrieve cached chart payload from PostgreSQL if fresh."""
        cached_dict = db_get_chart_payload(
            exchange_key,
            symbol,
            timeframe,
            max_age_seconds=max_age_seconds,
            payload_mode=payload_mode,
        )
        
        if isinstance(cached_dict, dict):
            # Convert dict to ChartPayload
            # Note: this is a simplified conversion; in production you'd validate full structure
            return cached_dict  # Legacy code still expects dict for now
        
        return None
    
    def upsert_chart_payload(
        self,
        exchange_key: str,
        symbol: str,
        timeframe: str,
        payload: ChartPayload,
    ) -> None:
        """Store or update chart payload in PostgreSQL."""
        # Convert ChartPayload to dict for legacy storage
        payload_dict = payload.to_dict() if hasattr(payload, 'to_dict') else payload
        
        db_upsert_chart_payload(
            exchange_key,
            symbol,
            timeframe,
            payload_dict,
        )
    
    def get_market_snapshot(
        self,
        exchange_key: str,
        symbol: str,
        max_age_seconds: int,
    ) -> Optional[dict]:
        """Retrieve cached market snapshot from PostgreSQL."""
        return db_get_market_snapshot(
            exchange_key,
            symbol,
            max_age_seconds=max_age_seconds,
        )
    
    def upsert_market_snapshot(
        self,
        exchange_key: str,
        symbol: str,
        market_data: dict,
    ) -> None:
        """Store or update market snapshot in PostgreSQL."""
        db_upsert_market_snapshot(
            exchange_key,
            symbol,
            market_data,
        )
    
    def get_exchange_settings_payload(
        self,
        exchange_key: str,
        max_age_seconds: int,
    ) -> Optional[ExchangeSettingsPayload]:
        """Retrieve cached exchange settings from PostgreSQL if fresh."""
        cached_dict = db_get_exchange_settings_payload(
            exchange_key,
            max_age_seconds=max_age_seconds,
        )
        
        if isinstance(cached_dict, dict):
            # Convert dict to ExchangeSettingsPayload
            # Note: simplified conversion; legacy code expects dict for now
            return cached_dict
        
        return None
    
    def upsert_exchange_settings_payload(
        self,
        exchange_key: str,
        payload: ExchangeSettingsPayload,
    ) -> None:
        """Store or update exchange settings in PostgreSQL."""
        # Convert ExchangeSettingsPayload to dict for legacy storage
        payload_dict = payload.to_dict() if hasattr(payload, 'to_dict') else payload
        
        db_upsert_exchange_settings_payload(
            exchange_key,
            payload_dict,
        )
