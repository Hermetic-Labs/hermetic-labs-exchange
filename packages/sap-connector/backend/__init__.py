"""
SAP Connector Backend Module

Provides FastAPI routes and services for SAP ERP integration
including RFC calls, BAPI execution, OData services, and IDoc processing.
"""

from .routes import router
from .service import SAPService
from .schemas import (
    SAPCredentials,
    SAPConnectionConfig,
    RFCCallRequest,
    RFCCallResponse,
    RFCMetadata,
    BAPICallRequest,
    BAPICallResponse,
    ODataRequest,
    ODataResponse,
    IDocSendRequest,
    IDocSendResponse,
    IDocStatus,
    IDocType,
)

__all__ = [
    # Router
    "router",
    # Service
    "SAPService",
    # Schemas
    "SAPCredentials",
    "SAPConnectionConfig",
    "RFCCallRequest",
    "RFCCallResponse",
    "RFCMetadata",
    "BAPICallRequest",
    "BAPICallResponse",
    "ODataRequest",
    "ODataResponse",
    "IDocSendRequest",
    "IDocSendResponse",
    "IDocStatus",
    "IDocType",
]
