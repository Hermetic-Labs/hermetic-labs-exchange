"""
AWS S3 Connector Service

Business logic for S3 operations using boto3.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List, BinaryIO

from .schemas import (
    S3Config,
    S3Object,
    S3ListRequest,
    S3ListResponse,
    S3UploadRequest,
    S3UploadResponse,
    S3DownloadResponse,
    S3DeleteResponse,
    S3PresignedUrlRequest,
    S3PresignedUrlResponse,
)

logger = logging.getLogger(__name__)


class S3ServiceError(Exception):
    """Custom exception for S3 service errors."""
    def __init__(self, message: str, code: Optional[str] = None):
        super().__init__(message)
        self.code = code


class S3Service:
    """Service class for AWS S3 operations."""

    def __init__(self, config: S3Config):
        """Initialize S3 service with configuration."""
        self.config = config
        self._client = None
        self._resource = None

    @property
    def client(self):
        """Lazy initialization of boto3 S3 client."""
        if self._client is None:
            try:
                import boto3
                from botocore.config import Config as BotoConfig

                boto_config = BotoConfig(
                    region_name=self.config.region,
                    s3={"addressing_style": "path" if self.config.force_path_style else "auto"},
                )

                client_kwargs = {
                    "service_name": "s3",
                    "region_name": self.config.region,
                    "aws_access_key_id": self.config.access_key_id,
                    "aws_secret_access_key": self.config.secret_access_key,
                    "config": boto_config,
                }

                if self.config.endpoint:
                    client_kwargs["endpoint_url"] = self.config.endpoint

                if self.config.session_token:
                    client_kwargs["aws_session_token"] = self.config.session_token

                self._client = boto3.client(**client_kwargs)

            except ImportError:
                raise S3ServiceError("boto3 is not installed. Run: pip install boto3")

        return self._client

    async def test_connection(self) -> bool:
        """Test connection to S3 bucket."""
        try:
            self.client.head_bucket(Bucket=self.config.bucket)
            return True
        except Exception as e:
            logger.error(f"S3 connection test failed: {e}")
            return False

    async def list_objects(self, request: S3ListRequest) -> S3ListResponse:
        """List objects in the S3 bucket."""
        try:
            params = {
                "Bucket": self.config.bucket,
                "MaxKeys": request.max_keys,
            }

            if request.prefix:
                params["Prefix"] = request.prefix
            if request.delimiter:
                params["Delimiter"] = request.delimiter
            if request.continuation_token:
                params["ContinuationToken"] = request.continuation_token

            response = self.client.list_objects_v2(**params)

            objects = []
            for obj in response.get("Contents", []):
                objects.append(S3Object(
                    key=obj["Key"],
                    size=obj["Size"],
                    last_modified=obj["LastModified"],
                    etag=obj["ETag"].strip('"'),
                    storage_class=obj.get("StorageClass"),
                ))

            return S3ListResponse(
                objects=objects,
                common_prefixes=[p["Prefix"] for p in response.get("CommonPrefixes", [])],
                is_truncated=response.get("IsTruncated", False),
                next_continuation_token=response.get("NextContinuationToken"),
                key_count=response.get("KeyCount", len(objects)),
            )

        except Exception as e:
            logger.error(f"Failed to list objects: {e}")
            raise S3ServiceError(f"Failed to list objects: {str(e)}")

    async def upload_object(
        self,
        key: str,
        file_obj: BinaryIO,
        request: S3UploadRequest,
    ) -> S3UploadResponse:
        """Upload an object to S3."""
        try:
            extra_args: Dict[str, any] = {}

            if request.content_type:
                extra_args["ContentType"] = request.content_type
            if request.content_encoding:
                extra_args["ContentEncoding"] = request.content_encoding
            if request.cache_control:
                extra_args["CacheControl"] = request.cache_control
            if request.storage_class:
                extra_args["StorageClass"] = request.storage_class
            if request.acl:
                extra_args["ACL"] = request.acl
            if request.metadata:
                extra_args["Metadata"] = request.metadata

            response = self.client.put_object(
                Bucket=self.config.bucket,
                Key=key,
                Body=file_obj,
                **extra_args,
            )

            location = f"https://{self.config.bucket}.s3.{self.config.region}.amazonaws.com/{key}"

            return S3UploadResponse(
                key=key,
                etag=response["ETag"].strip('"'),
                version_id=response.get("VersionId"),
                location=location,
            )

        except Exception as e:
            logger.error(f"Failed to upload object: {e}")
            raise S3ServiceError(f"Failed to upload object: {str(e)}")

    async def download_object(self, key: str) -> tuple[BinaryIO, S3DownloadResponse]:
        """Download an object from S3."""
        try:
            response = self.client.get_object(
                Bucket=self.config.bucket,
                Key=key,
            )

            metadata = S3DownloadResponse(
                key=key,
                content_type=response.get("ContentType"),
                content_length=response["ContentLength"],
                etag=response["ETag"].strip('"'),
                last_modified=response["LastModified"],
                metadata=response.get("Metadata"),
            )

            return response["Body"], metadata

        except self.client.exceptions.NoSuchKey:
            raise S3ServiceError(f"Object not found: {key}", code="NotFound")
        except Exception as e:
            logger.error(f"Failed to download object: {e}")
            raise S3ServiceError(f"Failed to download object: {str(e)}")

    async def delete_object(self, key: str, version_id: Optional[str] = None) -> S3DeleteResponse:
        """Delete an object from S3."""
        try:
            params = {
                "Bucket": self.config.bucket,
                "Key": key,
            }

            if version_id:
                params["VersionId"] = version_id

            response = self.client.delete_object(**params)

            return S3DeleteResponse(
                key=key,
                version_id=response.get("VersionId"),
                delete_marker=response.get("DeleteMarker", False),
            )

        except Exception as e:
            logger.error(f"Failed to delete object: {e}")
            raise S3ServiceError(f"Failed to delete object: {str(e)}")

    async def generate_presigned_url(self, request: S3PresignedUrlRequest) -> S3PresignedUrlResponse:
        """Generate a presigned URL for an object."""
        try:
            client_method = "get_object" if request.operation == "get" else "put_object"

            params = {
                "Bucket": self.config.bucket,
                "Key": request.key,
            }

            if request.operation == "put" and request.content_type:
                params["ContentType"] = request.content_type

            if request.response_content_type:
                params["ResponseContentType"] = request.response_content_type

            if request.response_content_disposition:
                params["ResponseContentDisposition"] = request.response_content_disposition

            url = self.client.generate_presigned_url(
                ClientMethod=client_method,
                Params=params,
                ExpiresIn=request.expires_in,
            )

            expires_at = datetime.now(timezone.utc) + timedelta(seconds=request.expires_in)

            return S3PresignedUrlResponse(
                url=url,
                key=request.key,
                expires_at=expires_at,
                method="GET" if request.operation == "get" else "PUT",
            )

        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise S3ServiceError(f"Failed to generate presigned URL: {str(e)}")
