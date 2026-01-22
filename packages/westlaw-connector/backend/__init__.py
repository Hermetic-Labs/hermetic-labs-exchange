"""
Westlaw Connector Backend Module

Provides FastAPI routes and services for Westlaw
legal research integration including KeyCite and case law.
"""

from .routes import router
from .service import WestlawService
from .schemas import (
    WestlawCredentials,
    WestlawConnectionConfig,
    DocumentSearchRequest,
    DocumentResponse,
    DocumentListResponse,
    CaseSearchRequest,
    CaseResponse,
    CaseListResponse,
    StatuteSearchRequest,
    StatuteResponse,
    StatuteListResponse,
    KeyCiteRequest,
    KeyCiteResponse,
    CitingReference,
)

__all__ = [
    # Router
    "router",
    # Service
    "WestlawService",
    # Schemas
    "WestlawCredentials",
    "WestlawConnectionConfig",
    "DocumentSearchRequest",
    "DocumentResponse",
    "DocumentListResponse",
    "CaseSearchRequest",
    "CaseResponse",
    "CaseListResponse",
    "StatuteSearchRequest",
    "StatuteResponse",
    "StatuteListResponse",
    "KeyCiteRequest",
    "KeyCiteResponse",
    "CitingReference",
]
