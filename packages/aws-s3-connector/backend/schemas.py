"""
AWS S3 Connector Schemas

Pydantic models for request/response validation.
"""

from datetime import datetime
from typing import Optional, Dict, List, Literal
from pydantic import BaseModel, Field


class S3Config(BaseModel):
    """Configuration for S3 connection."""
    region: str = Field(..., description="AWS region")
    access_key_id: str = Field(..., description="AWS access key ID")
    secret_access_key: str = Field(..., description="AWS secret access key")
    bucket: str = Field(..., description="S3 bucket name")
    endpoint: Optional[str] = Field(None, description="Custom endpoint URL")
    session_token: Optional[str] = Field(None, description="AWS session token")
    force_path_style: bool = Field(False, description="Use path-style URLs")


class S3Object(BaseModel):
    """Represents an S3 object."""
    key: str = Field(..., description="Object key")
    size: int = Field(..., description="Object size in bytes")
    last_modified: datetime = Field(..., description="Last modified timestamp")
    etag: str = Field(..., description="Object ETag")
    storage_class: Optional[str] = Field(None, description="Storage class")


class S3UploadRequest(BaseModel):
    """Request to upload a file to S3."""
    key: str = Field(..., description="Destination key/path")
    content_type: Optional[str] = Field(None, description="MIME content type")
    content_encoding: Optional[str] = Field(None, description="Content encoding")
    cache_control: Optional[str] = Field(None, description="Cache control header")
    metadata: Optional[Dict[str, str]] = Field(None, description="Custom metadata")
    storage_class: Optional[Literal[
        "STANDARD", "REDUCED_REDUNDANCY", "STANDARD_IA",
        "ONEZONE_IA", "INTELLIGENT_TIERING", "GLACIER", "DEEP_ARCHIVE"
    ]] = Field(None, description="Storage class")
    acl: Optional[Literal[
        "private", "public-read", "public-read-write",
        "authenticated-read", "bucket-owner-read", "bucket-owner-full-control"
    ]] = Field(None, description="Access control list")


class S3UploadResponse(BaseModel):
    """Response after successful upload."""
    key: str = Field(..., description="Uploaded object key")
    etag: str = Field(..., description="Object ETag")
    version_id: Optional[str] = Field(None, description="Version ID if versioning enabled")
    location: str = Field(..., description="Object URL")


class S3DownloadResponse(BaseModel):
    """Response containing download information."""
    key: str = Field(..., description="Object key")
    content_type: Optional[str] = Field(None, description="MIME content type")
    content_length: int = Field(..., description="Content size in bytes")
    etag: str = Field(..., description="Object ETag")
    last_modified: datetime = Field(..., description="Last modified timestamp")
    metadata: Optional[Dict[str, str]] = Field(None, description="Custom metadata")


class S3ListRequest(BaseModel):
    """Request to list objects in a bucket."""
    prefix: Optional[str] = Field(None, description="Filter by key prefix")
    delimiter: Optional[str] = Field(None, description="Delimiter for grouping")
    max_keys: int = Field(1000, description="Maximum keys to return", ge=1, le=1000)
    continuation_token: Optional[str] = Field(None, description="Pagination token")


class S3ListResponse(BaseModel):
    """Response containing list of objects."""
    objects: List[S3Object] = Field(default_factory=list, description="List of objects")
    common_prefixes: List[str] = Field(default_factory=list, description="Common prefixes")
    is_truncated: bool = Field(False, description="Whether results are truncated")
    next_continuation_token: Optional[str] = Field(None, description="Token for next page")
    key_count: int = Field(0, description="Number of keys returned")


class S3DeleteRequest(BaseModel):
    """Request to delete an object."""
    key: str = Field(..., description="Object key to delete")
    version_id: Optional[str] = Field(None, description="Specific version to delete")


class S3DeleteResponse(BaseModel):
    """Response after successful deletion."""
    key: str = Field(..., description="Deleted object key")
    version_id: Optional[str] = Field(None, description="Deleted version ID")
    delete_marker: bool = Field(False, description="Whether a delete marker was created")


class S3PresignedUrlRequest(BaseModel):
    """Request to generate a presigned URL."""
    key: str = Field(..., description="Object key")
    operation: Literal["get", "put"] = Field("get", description="Operation type")
    expires_in: int = Field(3600, description="URL expiration in seconds", ge=1, le=604800)
    content_type: Optional[str] = Field(None, description="Content type for PUT")
    response_content_type: Optional[str] = Field(None, description="Response content type")
    response_content_disposition: Optional[str] = Field(None, description="Response disposition")


class S3PresignedUrlResponse(BaseModel):
    """Response containing presigned URL."""
    url: str = Field(..., description="Presigned URL")
    key: str = Field(..., description="Object key")
    expires_at: datetime = Field(..., description="URL expiration timestamp")
    method: str = Field(..., description="HTTP method to use")
