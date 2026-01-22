"""
Salesforce Connector Backend Module

Provides FastAPI routes and services for Salesforce CRM integration
including OAuth, SOQL queries, object CRUD, and bulk operations.
"""

from .routes import router
from .service import SalesforceService
from .schemas import (
    SalesforceCredentials,
    OAuthTokenRequest,
    OAuthTokenResponse,
    SOQLQueryRequest,
    SOQLQueryResponse,
    SObjectRecord,
    SObjectCreateRequest,
    SObjectUpdateRequest,
    BulkOperationRequest,
    BulkOperationResponse,
    BulkJobStatus,
)

__all__ = [
    # Router
    "router",
    # Service
    "SalesforceService",
    # Schemas
    "SalesforceCredentials",
    "OAuthTokenRequest",
    "OAuthTokenResponse",
    "SOQLQueryRequest",
    "SOQLQueryResponse",
    "SObjectRecord",
    "SObjectCreateRequest",
    "SObjectUpdateRequest",
    "BulkOperationRequest",
    "BulkOperationResponse",
    "BulkJobStatus",
]
