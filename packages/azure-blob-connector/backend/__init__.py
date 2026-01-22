"""
Azure Blob Storage Connector Backend Module

Provides FastAPI routes for Azure Blob Storage operations.
"""

from .routes import router
from .service import AzureBlobService
from .schemas import (
    AzureBlobConfig,
    AzureBlob,
    BlobUploadRequest,
    BlobUploadResponse,
    BlobDownloadResponse,
    BlobListRequest,
    BlobListResponse,
    BlobDeleteRequest,
    BlobDeleteResponse,
    SASTokenRequest,
    SASTokenResponse,
)

__all__ = [
    "router",
    "AzureBlobService",
    "AzureBlobConfig",
    "AzureBlob",
    "BlobUploadRequest",
    "BlobUploadResponse",
    "BlobDownloadResponse",
    "BlobListRequest",
    "BlobListResponse",
    "BlobDeleteRequest",
    "BlobDeleteResponse",
    "SASTokenRequest",
    "SASTokenResponse",
]
