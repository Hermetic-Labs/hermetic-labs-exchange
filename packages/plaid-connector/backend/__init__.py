"""
Plaid Connector Backend Module

Provides FastAPI routes and services for Plaid banking integration.
"""

from .routes import router
from .service import PlaidService
from .schemas import (
    LinkTokenRequest,
    LinkTokenResponse,
    ExchangeTokenRequest,
    ExchangeTokenResponse,
    AccountResponse,
    TransactionResponse,
    WebhookPayload,
    PlaidError,
)

__all__ = [
    "router",
    "PlaidService",
    "LinkTokenRequest",
    "LinkTokenResponse",
    "ExchangeTokenRequest",
    "ExchangeTokenResponse",
    "AccountResponse",
    "TransactionResponse",
    "WebhookPayload",
    "PlaidError",
]
