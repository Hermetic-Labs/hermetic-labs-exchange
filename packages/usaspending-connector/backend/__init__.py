"""
USASpending Connector Backend Module

Provides FastAPI routes and services for USASpending.gov
federal spending data integration.
"""

from .routes import router
from .service import USASpendingService
from .schemas import (
    USASpendingConnectionConfig,
    AwardSearchRequest,
    AwardResponse,
    AwardListResponse,
    AgencySpendingRequest,
    AgencySpendingResponse,
    RecipientSearchRequest,
    RecipientResponse,
    RecipientListResponse,
    GeographicSpendingRequest,
    GeographicSpendingResponse,
    FiscalYearSpendingResponse,
)

__all__ = [
    # Router
    "router",
    # Service
    "USASpendingService",
    # Schemas
    "USASpendingConnectionConfig",
    "AwardSearchRequest",
    "AwardResponse",
    "AwardListResponse",
    "AgencySpendingRequest",
    "AgencySpendingResponse",
    "RecipientSearchRequest",
    "RecipientResponse",
    "RecipientListResponse",
    "GeographicSpendingRequest",
    "GeographicSpendingResponse",
    "FiscalYearSpendingResponse",
]
