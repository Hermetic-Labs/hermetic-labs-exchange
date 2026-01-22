"""
Azure Blob Storage Connector Schemas

Pydantic models for request/response validation.
"""

from datetime import datetime
from typing import Optional, Dict, List, Literal
from pydantic import BaseModel, Field


class AzureBlobConfig(BaseModel):
    """Configuration for Azure Blob Storage connection."""
    account_name: str = Field(..., description="Azure storage account name")
    account_key: Optional[str] = Field(None, description="Azure storage account key")
    container_name: str = Field(..., description="Container name")
    sas_token: Optional[str] = Field(None, description="SAS token for authentication")
    endpoint: Optional[str] = Field(None, description="Custom endpoint URL")
    use_sas: bool = Field(False, description="Use SAS token for authentication")


class AzureBlob(BaseModel):
    """Represents an Azure blob."""
    name: str = Field(..., description="Blob name")
    size: int = Field(..., description="Blob size in bytes")
    last_modified: datetime = Field(..., description="Last modified timestamp")
    content_type: str = Field(..., description="Content type")
    etag: Optional[str] = Field(None, description="Blob ETag")
    blob_type: Optional[Literal["BlockBlob", "PageBlob", "AppendBlob"]] = Field(None)
    access_tier: Optional[str] = Field(None, description="Access tier")
    metadata: Optional[Dict[str, str]] = Field(None, description="Custom metadata")


class BlobUploadRequest(BaseModel):
    """Request to upload a blob."""
    name: str = Field(..., description="Destination blob name")
    content_type: Optional[str] = Field(None, description="MIME content type")
    content_encoding: Optional[str] = Field(None, description="Content encoding")
    cache_control: Optional[str] = Field(None, description="Cache control header")
    metadata: Optional[Dict[str, str]] = Field(None, description="Custom metadata")
    access_tier: Optional[Literal["Hot", "Cool", "Archive"]] = Field(None)
    blob_type: Literal["BlockBlob", "PageBlob", "AppendBlob"] = Field("BlockBlob")


class BlobUploadResponse(BaseModel):
    """Response after successful upload."""
    name: str = Field(..., description="Uploaded blob name")
    etag: str = Field(..., description="Blob ETag")
    last_modified: datetime = Field(..., description="Last modified timestamp")
    content_md5: Optional[str] = Field(None, description="Content MD5 hash")
    url: str = Field(..., description="Blob URL")


class BlobDownloadResponse(BaseModel):
    """Response containing download information."""
    name: str = Field(..., description="Blob name")
    content_type: Optional[str] = Field(None, description="MIME content type")
    content_length: int = Field(..., description="Content size in bytes")
    etag: str = Field(..., description="Blob ETag")
    last_modified: datetime = Field(..., description="Last modified timestamp")
    metadata: Optional[Dict[str, str]] = Field(None, description="Custom metadata")


class BlobListRequest(BaseModel):
    """Request to list blobs in a container."""
    prefix: Optional[str] = Field(None, description="Filter by name prefix")
    delimiter: Optional[str] = Field(None, description="Delimiter for grouping")
    max_results: int = Field(1000, description="Maximum results to return", ge=1, le=5000)
    marker: Optional[str] = Field(None, description="Pagination marker")
    include_metadata: bool = Field(False, description="Include blob metadata")
    include_snapshots: bool = Field(False, description="Include blob snapshots")


class BlobListResponse(BaseModel):
    """Response containing list of blobs."""
    blobs: List[AzureBlob] = Field(default_factory=list, description="List of blobs")
    prefixes: List[str] = Field(default_factory=list, description="Common prefixes")
    next_marker: Optional[str] = Field(None, description="Marker for next page")


class BlobDeleteRequest(BaseModel):
    """Request to delete a blob."""
    name: str = Field(..., description="Blob name to delete")
    delete_snapshots: Optional[Literal["include", "only"]] = Field(None)


class BlobDeleteResponse(BaseModel):
    """Response after successful deletion."""
    name: str = Field(..., description="Deleted blob name")
    deleted: bool = Field(True, description="Whether deletion was successful")


class SASTokenRequest(BaseModel):
    """Request to generate a SAS token."""
    blob_name: Optional[str] = Field(None, description="Blob name (for blob-level SAS)")
    permissions: str = Field("r", description="Permissions: r=read, w=write, d=delete, l=list")
    expiry_hours: int = Field(1, description="Token expiration in hours", ge=1, le=168)
    start_time: Optional[datetime] = Field(None, description="Token start time")
    content_type: Optional[str] = Field(None, description="Response content type")
    content_disposition: Optional[str] = Field(None, description="Response disposition")
    ip_range: Optional[str] = Field(None, description="Allowed IP range")
    protocol: Literal["https", "https,http"] = Field("https", description="Allowed protocol")


class SASTokenResponse(BaseModel):
    """Response containing SAS token."""
    token: str = Field(..., description="SAS token")
    url: str = Field(..., description="Full URL with SAS token")
    expires_at: datetime = Field(..., description="Token expiration timestamp")
    permissions: str = Field(..., description="Granted permissions")
