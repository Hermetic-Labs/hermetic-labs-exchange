"""
SAM.gov Connector Backend Module

Provides FastAPI routes and services for SAM.gov federal
contractor registration and entity search integration.
"""

from .routes import router
from .service import SAMGovService
from .schemas import (
    SAMGovCredentials,
    SAMGovConnectionConfig,
    EntitySearchRequest,
    EntityResponse,
    EntityListResponse,
    ExclusionSearchRequest,
    ExclusionResponse,
    ExclusionListResponse,
    OpportunitySearchRequest,
    OpportunityResponse,
    OpportunityListResponse,
)

__all__ = [
    # Router
    "router",
    # Service
    "SAMGovService",
    # Schemas
    "SAMGovCredentials",
    "SAMGovConnectionConfig",
    "EntitySearchRequest",
    "EntityResponse",
    "EntityListResponse",
    "ExclusionSearchRequest",
    "ExclusionResponse",
    "ExclusionListResponse",
    "OpportunitySearchRequest",
    "OpportunityResponse",
    "OpportunityListResponse",
]
