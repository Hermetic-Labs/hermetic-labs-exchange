"""
AWS S3 Connector Backend Module

Provides FastAPI routes for Amazon S3 storage operations.
"""

from .routes import router
from .service import S3Service
from .schemas import (
    S3Config,
    S3UploadRequest,
    S3DownloadResponse,
    S3ListRequest,
    S3ListResponse,
    S3DeleteRequest,
    S3PresignedUrlRequest,
    S3PresignedUrlResponse,
    S3Object,
)

__all__ = [
    "router",
    "S3Service",
    "S3Config",
    "S3UploadRequest",
    "S3DownloadResponse",
    "S3ListRequest",
    "S3ListResponse",
    "S3DeleteRequest",
    "S3PresignedUrlRequest",
    "S3PresignedUrlResponse",
    "S3Object",
]
