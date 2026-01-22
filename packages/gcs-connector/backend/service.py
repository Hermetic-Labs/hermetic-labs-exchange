"""
Google Cloud Storage Connector Service

Business logic for GCS operations using google-cloud-storage.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, BinaryIO, Union

from .schemas import (
    GCSConfig,
    GCSObject,
    ServiceAccountCredentials,
    ObjectListRequest,
    ObjectListResponse,
    ObjectUploadRequest,
    ObjectUploadResponse,
    ObjectDownloadResponse,
    ObjectDeleteResponse,
    SignedUrlRequest,
    SignedUrlResponse,
)

logger = logging.getLogger(__name__)


class GCSServiceError(Exception):
    """Custom exception for GCS service errors."""
    def __init__(self, message: str, code: Optional[str] = None):
        super().__init__(message)
        self.code = code


class GCSService:
    """Service class for Google Cloud Storage operations."""

    def __init__(self, config: GCSConfig):
        """Initialize GCS service with configuration."""
        self.config = config
        self._client = None
        self._bucket = None
        self._credentials = None

    def _parse_credentials(self) -> Dict:
        """Parse credentials from config."""
        if isinstance(self.config.credentials, str):
            # Try to parse as JSON string
            try:
                return json.loads(self.config.credentials)
            except json.JSONDecodeError:
                # Assume it's a file path
                with open(self.config.credentials, 'r') as f:
                    return json.load(f)
        elif isinstance(self.config.credentials, ServiceAccountCredentials):
            return self.config.credentials.model_dump()
        else:
            return dict(self.config.credentials)

    @property
    def client(self):
        """Lazy initialization of GCS client."""
        if self._client is None:
            try:
                from google.cloud import storage
                from google.oauth2 import service_account

                credentials_info = self._parse_credentials()
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_info
                )

                self._client = storage.Client(
                    project=self.config.project_id,
                    credentials=credentials,
                )

            except ImportError:
                raise GCSServiceError(
                    "google-cloud-storage is not installed. Run: pip install google-cloud-storage"
                )

        return self._client

    @property
    def bucket(self):
        """Get bucket instance for configured bucket."""
        if self._bucket is None:
            self._bucket = self.client.bucket(self.config.bucket)
        return self._bucket

    async def test_connection(self) -> bool:
        """Test connection to GCS bucket."""
        try:
            self.bucket.exists()
            return True
        except Exception as e:
            logger.error(f"GCS connection test failed: {e}")
            return False

    async def list_objects(self, request: ObjectListRequest) -> ObjectListResponse:
        """List objects in the GCS bucket."""
        try:
            blobs = self.client.list_blobs(
                self.config.bucket,
                prefix=request.prefix,
                delimiter=request.delimiter,
                max_results=request.max_results,
                page_token=request.page_token,
                versions=request.versions,
            )

            objects = []
            for blob in blobs:
                objects.append(GCSObject(
                    name=blob.name,
                    size=blob.size or 0,
                    updated=blob.updated or datetime.now(timezone.utc),
                    content_type=blob.content_type or "application/octet-stream",
                    etag=blob.etag,
                    generation=str(blob.generation) if blob.generation else None,
                    storage_class=blob.storage_class,
                    metadata=blob.metadata,
                    md5_hash=blob.md5_hash,
                    crc32c=blob.crc32c,
                ))

            prefixes = list(blobs.prefixes) if hasattr(blobs, 'prefixes') else []

            return ObjectListResponse(
                objects=objects,
                prefixes=prefixes,
                next_page_token=blobs.next_page_token if hasattr(blobs, 'next_page_token') else None,
            )

        except Exception as e:
            logger.error(f"Failed to list objects: {e}")
            raise GCSServiceError(f"Failed to list objects: {str(e)}")

    async def upload_object(
        self,
        name: str,
        file_obj: BinaryIO,
        request: ObjectUploadRequest,
    ) -> ObjectUploadResponse:
        """Upload an object to GCS."""
        try:
            blob = self.bucket.blob(name)

            if request.content_type:
                blob.content_type = request.content_type
            if request.content_encoding:
                blob.content_encoding = request.content_encoding
            if request.cache_control:
                blob.cache_control = request.cache_control
            if request.content_disposition:
                blob.content_disposition = request.content_disposition
            if request.metadata:
                blob.metadata = request.metadata

            blob.upload_from_file(
                file_obj,
                content_type=request.content_type,
                predefined_acl=request.predefined_acl,
            )

            blob.reload()

            return ObjectUploadResponse(
                name=blob.name,
                generation=str(blob.generation),
                size=blob.size,
                md5_hash=blob.md5_hash,
                media_link=blob.media_link,
            )

        except Exception as e:
            logger.error(f"Failed to upload object: {e}")
            raise GCSServiceError(f"Failed to upload object: {str(e)}")

    async def download_object(self, name: str) -> tuple[BinaryIO, ObjectDownloadResponse]:
        """Download an object from GCS."""
        try:
            from io import BytesIO

            blob = self.bucket.blob(name)

            if not blob.exists():
                raise GCSServiceError(f"Object not found: {name}", code="NotFound")

            blob.reload()
            content = BytesIO()
            blob.download_to_file(content)
            content.seek(0)

            metadata = ObjectDownloadResponse(
                name=name,
                content_type=blob.content_type,
                content_length=blob.size,
                etag=blob.etag,
                updated=blob.updated,
                metadata=blob.metadata,
                generation=str(blob.generation) if blob.generation else None,
            )

            return content, metadata

        except GCSServiceError:
            raise
        except Exception as e:
            logger.error(f"Failed to download object: {e}")
            raise GCSServiceError(f"Failed to download object: {str(e)}")

    async def delete_object(
        self, name: str, generation: Optional[str] = None
    ) -> ObjectDeleteResponse:
        """Delete an object from GCS."""
        try:
            blob = self.bucket.blob(name, generation=int(generation) if generation else None)
            blob.delete()

            return ObjectDeleteResponse(name=name, deleted=True)

        except Exception as e:
            logger.error(f"Failed to delete object: {e}")
            raise GCSServiceError(f"Failed to delete object: {str(e)}")

    async def generate_signed_url(self, request: SignedUrlRequest) -> SignedUrlResponse:
        """Generate a signed URL for an object."""
        try:
            blob = self.bucket.blob(request.object_name)

            expiration = timedelta(minutes=request.expiration_minutes)

            method_map = {
                "read": "GET",
                "write": "PUT",
                "delete": "DELETE",
                "resumable": "POST",
            }
            method = method_map.get(request.action, "GET")

            url_kwargs = {
                "expiration": expiration,
                "method": method,
                "version": "v4",
            }

            if request.content_type and request.action in ("write", "resumable"):
                url_kwargs["content_type"] = request.content_type

            if request.response_content_type:
                url_kwargs["response_type"] = request.response_content_type

            if request.response_content_disposition:
                url_kwargs["response_disposition"] = request.response_content_disposition

            url = blob.generate_signed_url(**url_kwargs)

            expires_at = datetime.now(timezone.utc) + expiration

            return SignedUrlResponse(
                url=url,
                object_name=request.object_name,
                expires_at=expires_at,
                method=method,
            )

        except Exception as e:
            logger.error(f"Failed to generate signed URL: {e}")
            raise GCSServiceError(f"Failed to generate signed URL: {str(e)}")
