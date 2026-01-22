"""
LexisNexis Connector Backend Module

Provides FastAPI routes and services for LexisNexis
legal research integration including case law and statutes.
"""

from .routes import router
from .service import LexisNexisService
from .schemas import (
    LexisNexisCredentials,
    LexisNexisConnectionConfig,
    DocumentSearchRequest,
    DocumentResponse,
    DocumentListResponse,
    CaseSearchRequest,
    CaseResponse,
    CaseListResponse,
    StatuteSearchRequest,
    StatuteResponse,
    StatuteListResponse,
    ShepardizeRequest,
    ShepardizeResponse,
    CitingReference,
)

__all__ = [
    # Router
    "router",
    # Service
    "LexisNexisService",
    # Schemas
    "LexisNexisCredentials",
    "LexisNexisConnectionConfig",
    "DocumentSearchRequest",
    "DocumentResponse",
    "DocumentListResponse",
    "CaseSearchRequest",
    "CaseResponse",
    "CaseListResponse",
    "StatuteSearchRequest",
    "StatuteResponse",
    "StatuteListResponse",
    "ShepardizeRequest",
    "ShepardizeResponse",
    "CitingReference",
]
