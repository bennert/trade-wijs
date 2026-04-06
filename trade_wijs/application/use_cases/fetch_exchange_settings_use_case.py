"""Use case for fetching exchange settings options with parameter validation."""

from urllib.parse import unquote
from dataclasses import dataclass
from typing import Optional

from app_services_payloads import _fetch_exchange_settings_options_payload


@dataclass
class ExchangeSettingsRequest:
    """Encapsulates exchange settings fetch request parameters."""
    
    exchange: Optional[str]
    
    @classmethod
    def from_flask_args(cls, args):
        """Create ExchangeSettingsRequest from Flask request.args."""
        def decode_value(value):
            return unquote(value) if isinstance(value, str) else value
        
        return cls(
            exchange=decode_value(args.get("exchange")),
        )


@dataclass
class ExchangeSettingsResponse:
    """Encapsulates exchange settings response payload."""
    
    payload: dict


class FetchExchangeSettingsUseCase:
    """Use case for fetching exchange settings options."""
    
    def __call__(self, request: ExchangeSettingsRequest) -> ExchangeSettingsResponse:
        """Execute the use case.
        
        Args:
            request: ExchangeSettingsRequest with exchange
            
        Returns:
            ExchangeSettingsResponse with payload
        """
        payload = _fetch_exchange_settings_options_payload(
            request.exchange,
        )
        
        return ExchangeSettingsResponse(payload)
