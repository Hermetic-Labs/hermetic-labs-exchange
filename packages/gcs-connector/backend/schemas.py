"""
Google Cloud Storage Connector Schemas

Pydantic models for request/response validation.
"""

from datetime import datetime
from typing import Optional, Dict, List, Literal, Union
from pydantic import BaseModel, Field


class ServiceAccountCredentials(BaseModel):
    """GCP service account credentials structure."""
    type: str = Field("service_account")
    project_id: str
    private_key_id: str
    private_key: str
    client_email: str
    client_id: str
    auth_uri: str = Field(default="https://accounts.google.com/o/oauth2/auth")
    token_uri: str = Field(default="https://oauth2.googleapis.com/token")


class GCSConfig(BaseModel):
    """Configuration for GCS connection."""
    project_id: str = Field(..., description="GCP project ID")
    credentials: Union[str, ServiceAccountCredentials] = Field(
        ..., description="Service account credentials (JSON string or path)"
    )
    bucket: str = Field(..., description="GCS bucket name")
    access_token: Optional[str] = Field(None, description="OAuth access token")


class GCSObject(BaseModel):
    """Represents a GCS object."""
    name: str = Field(..., description="Object name")
    size: int = Field(..., description="Object size in bytes")
    updated: datetime = Field(..., description="Last update timestamp")
    content_type: str = Field(..., description="Content type")
    etag: Optional[str] = Field(None, description="Object ETag")
    generation: Optional[str] = Field(None, description="Object generation")
    storage_class: Optional[str] = Field(None, description="Storage class")
    metadata: Optional[Dict[str, str]] = Field(None, description="Custom metadata")
    md5_hash: Optional[str] = Field(None, description="MD5 hash")
    crc32c: Optional[str] = Field(None, description="CRC32C checksum")


class ObjectUploadRequest(BaseModel):
    """Request to upload an object."""
    name: str = Field(..., description="Destination object name")
    content_type: Optional[str] = Field(None, description="MIME content type")
    content_encoding: Optional[str] = Field(None, description="Content encoding")
    cache_control: Optional[str] = Field(None, description="Cache control header")
    content_disposition: Optional[str] = Field(None, description="Content disposition")
    metadata: Optional[Dict[str, str]] = Field(None, description="Custom metadata")
    storage_class: Optional[Literal[
        "STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE"
    ]] = Field(None, description="Storage class")
    predefined_acl: Optional[Literal[
        "authenticatedRead", "bucketOwnerFullControl", "bucketOwnerRead",
        "private", "projectPrivate", "publicRead"
    ]] = Field(None, description="Predefined ACL")


class ObjectUploadResponse(BaseModel):
    """Response after successful upload."""
    name: str = Field(..., description="Uploaded object name")
    generation: str = Field(..., description="Object generation")
    size: int = Field(..., description="Object size in bytes")
    md5_hash: Optional[str] = Field(None, description="MD5 hash")
    media_link: str = Field(..., description="Media download link")


class ObjectDownloadResponse(BaseModel):
    """Response containing download information."""
    name: str = Field(..., description="Object name")
    content_type: Optional[str] = Field(None, description="MIME content type")
    content_length: int = Field(..., description="Content size in bytes")
    etag: str = Field(..., description="Object ETag")
    updated: datetime = Field(..., description="Last update timestamp")
    metadata: Optional[Dict[str, str]] = Field(None, description="Custom metadata")
    generation: Optional[str] = Field(None, description="Object generation")


class ObjectListRequest(BaseModel):
    """Request to list objects in a bucket."""
    prefix: Optional[str] = Field(None, description="Filter by name prefix")
    delimiter: Optional[str] = Field(None, description="Delimiter for grouping")
    max_results: int = Field(1000, description="Maximum results to return", ge=1, le=1000)
    page_token: Optional[str] = Field(None, description="Pagination token")
    versions: bool = Field(False, description="Include object versions")


class ObjectListResponse(BaseModel):
    """Response containing list of objects."""
    objects: List[GCSObject] = Field(default_factory=list, description="List of objects")
    prefixes: List[str] = Field(default_factory=list, description="Common prefixes")
    next_page_token: Optional[str] = Field(None, description="Token for next page")


class ObjectDeleteRequest(BaseModel):
    """Request to delete an object."""
    name: str = Field(..., description="Object name to delete")
    generation: Optional[str] = Field(None, description="Specific generation to delete")


class ObjectDeleteResponse(BaseModel):
    """Response after successful deletion."""
    name: str = Field(..., description="Deleted object name")
    deleted: bool = Field(True, description="Whether deletion was successful")


class SignedUrlRequest(BaseModel):
    """Request to generate a signed URL."""
    object_name: str = Field(..., description="Object name")
    action: Literal["read", "write", "delete", "resumable"] = Field(
        "read", description="URL action type"
    )
    expiration_minutes: int = Field(
        60, description="URL expiration in minutes", ge=1, le=10080
    )
    content_type: Optional[str] = Field(None, description="Content type for write")
    response_content_type: Optional[str] = Field(None, description="Response content type")
    response_content_disposition: Optional[str] = Field(None, description="Response disposition")


class SignedUrlResponse(BaseModel):
    """Response containing signed URL."""
    url: str = Field(..., description="Signed URL")
    object_name: str = Field(..., description="Object name")
    expires_at: datetime = Field(..., description="URL expiration timestamp")
    method: str = Field(..., description="HTTP method to use")
