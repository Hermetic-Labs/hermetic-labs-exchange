"""
Google Cloud Storage Connector Backend Module

Provides FastAPI routes for Google Cloud Storage operations.
"""

from .routes import router
from .service import GCSService
from .schemas import (
    GCSConfig,
    GCSObject,
    ObjectUploadRequest,
    ObjectUploadResponse,
    ObjectDownloadResponse,
    ObjectListRequest,
    ObjectListResponse,
    ObjectDeleteRequest,
    ObjectDeleteResponse,
    SignedUrlRequest,
    SignedUrlResponse,
)

__all__ = [
    "router",
    "GCSService",
    "GCSConfig",
    "GCSObject",
    "ObjectUploadRequest",
    "ObjectUploadResponse",
    "ObjectDownloadResponse",
    "ObjectListRequest",
    "ObjectListResponse",
    "ObjectDeleteRequest",
    "ObjectDeleteResponse",
    "SignedUrlRequest",
    "SignedUrlResponse",
]
