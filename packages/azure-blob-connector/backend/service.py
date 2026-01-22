"""
Azure Blob Storage Connector Service

Business logic for Azure Blob Storage operations.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, BinaryIO

from .schemas import (
    AzureBlobConfig,
    AzureBlob,
    BlobListRequest,
    BlobListResponse,
    BlobUploadRequest,
    BlobUploadResponse,
    BlobDownloadResponse,
    BlobDeleteResponse,
    SASTokenRequest,
    SASTokenResponse,
)

logger = logging.getLogger(__name__)


class AzureBlobServiceError(Exception):
    """Custom exception for Azure Blob service errors."""
    def __init__(self, message: str, code: Optional[str] = None):
        super().__init__(message)
        self.code = code


class AzureBlobService:
    """Service class for Azure Blob Storage operations."""

    def __init__(self, config: AzureBlobConfig):
        """Initialize Azure Blob service with configuration."""
        self.config = config
        self._blob_service_client = None
        self._container_client = None

    @property
    def blob_service_client(self):
        """Lazy initialization of Azure Blob Service client."""
        if self._blob_service_client is None:
            try:
                from azure.storage.blob import BlobServiceClient

                if self.config.use_sas and self.config.sas_token:
                    account_url = f"https://{self.config.account_name}.blob.core.windows.net"
                    self._blob_service_client = BlobServiceClient(
                        account_url=account_url,
                        credential=self.config.sas_token,
                    )
                else:
                    connection_string = (
                        f"DefaultEndpointsProtocol=https;"
                        f"AccountName={self.config.account_name};"
                        f"AccountKey={self.config.account_key};"
                        f"EndpointSuffix=core.windows.net"
                    )
                    self._blob_service_client = BlobServiceClient.from_connection_string(
                        connection_string
                    )

            except ImportError:
                raise AzureBlobServiceError(
                    "azure-storage-blob is not installed. Run: pip install azure-storage-blob"
                )

        return self._blob_service_client

    @property
    def container_client(self):
        """Get container client for configured container."""
        if self._container_client is None:
            self._container_client = self.blob_service_client.get_container_client(
                self.config.container_name
            )
        return self._container_client

    async def test_connection(self) -> bool:
        """Test connection to Azure Blob Storage."""
        try:
            self.container_client.get_container_properties()
            return True
        except Exception as e:
            logger.error(f"Azure Blob connection test failed: {e}")
            return False

    async def list_blobs(self, request: BlobListRequest) -> BlobListResponse:
        """List blobs in the container."""
        try:
            include = []
            if request.include_metadata:
                include.append("metadata")
            if request.include_snapshots:
                include.append("snapshots")

            blobs_list = self.container_client.list_blobs(
                name_starts_with=request.prefix,
                include=include if include else None,
            )

            blobs = []
            prefixes = []
            count = 0

            for blob in blobs_list:
                if count >= request.max_results:
                    break

                blobs.append(AzureBlob(
                    name=blob.name,
                    size=blob.size,
                    last_modified=blob.last_modified,
                    content_type=blob.content_settings.content_type or "application/octet-stream",
                    etag=blob.etag,
                    blob_type=blob.blob_type,
                    access_tier=blob.blob_tier,
                    metadata=blob.metadata,
                ))
                count += 1

            return BlobListResponse(
                blobs=blobs,
                prefixes=prefixes,
                next_marker=None,
            )

        except Exception as e:
            logger.error(f"Failed to list blobs: {e}")
            raise AzureBlobServiceError(f"Failed to list blobs: {str(e)}")

    async def upload_blob(
        self,
        name: str,
        file_obj: BinaryIO,
        request: BlobUploadRequest,
    ) -> BlobUploadResponse:
        """Upload a blob to the container."""
        try:
            from azure.storage.blob import ContentSettings

            blob_client = self.container_client.get_blob_client(name)

            content_settings = ContentSettings(
                content_type=request.content_type,
                content_encoding=request.content_encoding,
                cache_control=request.cache_control,
            )

            upload_kwargs: Dict[str, any] = {
                "data": file_obj,
                "overwrite": True,
                "content_settings": content_settings,
            }

            if request.metadata:
                upload_kwargs["metadata"] = request.metadata

            response = blob_client.upload_blob(**upload_kwargs)

            if request.access_tier:
                blob_client.set_standard_blob_tier(request.access_tier)

            return BlobUploadResponse(
                name=name,
                etag=response["etag"],
                last_modified=response["last_modified"],
                content_md5=response.get("content_md5"),
                url=blob_client.url,
            )

        except Exception as e:
            logger.error(f"Failed to upload blob: {e}")
            raise AzureBlobServiceError(f"Failed to upload blob: {str(e)}")

    async def download_blob(self, name: str) -> tuple[BinaryIO, BlobDownloadResponse]:
        """Download a blob from the container."""
        try:
            blob_client = self.container_client.get_blob_client(name)
            download_stream = blob_client.download_blob()
            properties = download_stream.properties

            metadata = BlobDownloadResponse(
                name=name,
                content_type=properties.content_settings.content_type,
                content_length=properties.size,
                etag=properties.etag,
                last_modified=properties.last_modified,
                metadata=properties.metadata,
            )

            return download_stream, metadata

        except Exception as e:
            if "BlobNotFound" in str(e):
                raise AzureBlobServiceError(f"Blob not found: {name}", code="NotFound")
            logger.error(f"Failed to download blob: {e}")
            raise AzureBlobServiceError(f"Failed to download blob: {str(e)}")

    async def delete_blob(self, name: str, delete_snapshots: Optional[str] = None) -> BlobDeleteResponse:
        """Delete a blob from the container."""
        try:
            blob_client = self.container_client.get_blob_client(name)
            blob_client.delete_blob(delete_snapshots=delete_snapshots)

            return BlobDeleteResponse(name=name, deleted=True)

        except Exception as e:
            logger.error(f"Failed to delete blob: {e}")
            raise AzureBlobServiceError(f"Failed to delete blob: {str(e)}")

    async def generate_sas_token(self, request: SASTokenRequest) -> SASTokenResponse:
        """Generate a SAS token for blob or container access."""
        try:
            from azure.storage.blob import generate_blob_sas, generate_container_sas, BlobSasPermissions, ContainerSasPermissions

            expiry_time = datetime.now(timezone.utc) + timedelta(hours=request.expiry_hours)
            start_time = request.start_time or datetime.now(timezone.utc)

            # Parse permissions
            permissions_map = {
                "r": "read",
                "w": "write",
                "d": "delete",
                "l": "list",
            }

            if request.blob_name:
                # Blob-level SAS
                sas_permissions = BlobSasPermissions(
                    read="r" in request.permissions,
                    write="w" in request.permissions,
                    delete="d" in request.permissions,
                )

                sas_token = generate_blob_sas(
                    account_name=self.config.account_name,
                    container_name=self.config.container_name,
                    blob_name=request.blob_name,
                    account_key=self.config.account_key,
                    permission=sas_permissions,
                    expiry=expiry_time,
                    start=start_time,
                    content_type=request.content_type,
                    content_disposition=request.content_disposition,
                    protocol=request.protocol,
                    ip=request.ip_range,
                )

                url = (
                    f"https://{self.config.account_name}.blob.core.windows.net/"
                    f"{self.config.container_name}/{request.blob_name}?{sas_token}"
                )
            else:
                # Container-level SAS
                sas_permissions = ContainerSasPermissions(
                    read="r" in request.permissions,
                    write="w" in request.permissions,
                    delete="d" in request.permissions,
                    list="l" in request.permissions,
                )

                sas_token = generate_container_sas(
                    account_name=self.config.account_name,
                    container_name=self.config.container_name,
                    account_key=self.config.account_key,
                    permission=sas_permissions,
                    expiry=expiry_time,
                    start=start_time,
                    protocol=request.protocol,
                    ip=request.ip_range,
                )

                url = (
                    f"https://{self.config.account_name}.blob.core.windows.net/"
                    f"{self.config.container_name}?{sas_token}"
                )

            return SASTokenResponse(
                token=sas_token,
                url=url,
                expires_at=expiry_time,
                permissions=request.permissions,
            )

        except Exception as e:
            logger.error(f"Failed to generate SAS token: {e}")
            raise AzureBlobServiceError(f"Failed to generate SAS token: {str(e)}")
