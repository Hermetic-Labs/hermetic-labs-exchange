"""
Pydantic schemas for Salesforce Connector API
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class SalesforceEnvironment(str, Enum):
    """Salesforce environment type"""
    PRODUCTION = "production"
    SANDBOX = "sandbox"


class BulkOperationType(str, Enum):
    """Bulk operation types"""
    INSERT = "insert"
    UPDATE = "update"
    UPSERT = "upsert"
    DELETE = "delete"
    QUERY = "query"


class BulkJobState(str, Enum):
    """Bulk job states"""
    OPEN = "Open"
    UPLOAD_COMPLETE = "UploadComplete"
    IN_PROGRESS = "InProgress"
    JOB_COMPLETE = "JobComplete"
    ABORTED = "Aborted"
    FAILED = "Failed"


# OAuth Schemas
class SalesforceCredentials(BaseModel):
    """Salesforce OAuth credentials"""
    access_token: str = Field(..., description="OAuth access token")
    refresh_token: Optional[str] = Field(None, description="OAuth refresh token")
    instance_url: str = Field(..., description="Salesforce instance URL")
    token_type: str = Field(default="Bearer", description="Token type")
    issued_at: Optional[datetime] = Field(None, description="Token issue timestamp")
    expires_in: Optional[int] = Field(None, description="Token expiry in seconds")


class OAuthTokenRequest(BaseModel):
    """OAuth token exchange request"""
    code: str = Field(..., description="Authorization code")
    redirect_uri: str = Field(..., description="OAuth redirect URI")
    client_id: str = Field(..., description="OAuth client ID")
    client_secret: str = Field(..., description="OAuth client secret")


class OAuthRefreshRequest(BaseModel):
    """OAuth token refresh request"""
    refresh_token: str = Field(..., description="Refresh token")
    client_id: str = Field(..., description="OAuth client ID")
    client_secret: str = Field(..., description="OAuth client secret")


class OAuthTokenResponse(BaseModel):
    """OAuth token response"""
    access_token: str
    refresh_token: Optional[str] = None
    instance_url: str
    token_type: str = "Bearer"
    issued_at: str
    expires_in: Optional[int] = None
    scope: Optional[str] = None


# SOQL Query Schemas
class SOQLQueryRequest(BaseModel):
    """SOQL query request"""
    query: str = Field(..., description="SOQL query string", min_length=1)
    include_deleted: bool = Field(default=False, description="Include deleted records")
    batch_size: Optional[int] = Field(None, ge=200, le=2000, description="Batch size for results")


class SOQLQueryResponse(BaseModel):
    """SOQL query response"""
    total_size: int = Field(..., description="Total number of records")
    done: bool = Field(..., description="Whether all records have been returned")
    next_records_url: Optional[str] = Field(None, description="URL for next batch of records")
    records: List[Dict[str, Any]] = Field(default_factory=list, description="Query results")


# SObject Schemas
class SObjectRecord(BaseModel):
    """Salesforce object record"""
    id: Optional[str] = Field(None, alias="Id", description="Record ID")
    attributes: Optional[Dict[str, str]] = Field(None, description="Record attributes")
    fields: Dict[str, Any] = Field(default_factory=dict, description="Record fields")

    class Config:
        populate_by_name = True


class SObjectCreateRequest(BaseModel):
    """Create SObject request"""
    object_type: str = Field(..., description="Salesforce object type (e.g., Account, Lead)")
    fields: Dict[str, Any] = Field(..., description="Field values for the new record")


class SObjectCreateResponse(BaseModel):
    """Create SObject response"""
    id: str = Field(..., description="Created record ID")
    success: bool = Field(..., description="Whether creation was successful")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Any errors")


class SObjectUpdateRequest(BaseModel):
    """Update SObject request"""
    fields: Dict[str, Any] = Field(..., description="Field values to update")


class SObjectDeleteResponse(BaseModel):
    """Delete SObject response"""
    id: str = Field(..., description="Deleted record ID")
    success: bool = Field(..., description="Whether deletion was successful")


# Bulk Operation Schemas
class BulkOperationRequest(BaseModel):
    """Bulk operation request"""
    object_type: str = Field(..., description="Salesforce object type")
    operation: BulkOperationType = Field(..., description="Bulk operation type")
    records: Optional[List[Dict[str, Any]]] = Field(None, description="Records for insert/update/delete")
    query: Optional[str] = Field(None, description="SOQL query for bulk query operation")
    external_id_field: Optional[str] = Field(None, description="External ID field for upsert")


class BulkJobStatus(BaseModel):
    """Bulk job status"""
    id: str = Field(..., description="Job ID")
    state: BulkJobState = Field(..., description="Job state")
    object: str = Field(..., description="Object type")
    operation: str = Field(..., description="Operation type")
    created_by_id: str = Field(..., description="User who created the job")
    created_date: datetime = Field(..., description="Job creation date")
    system_modstamp: datetime = Field(..., description="Last modification timestamp")
    number_records_processed: int = Field(default=0, description="Records processed")
    number_records_failed: int = Field(default=0, description="Records failed")
    total_processing_time: Optional[int] = Field(None, description="Total processing time in ms")


class BulkOperationResponse(BaseModel):
    """Bulk operation response"""
    job_id: str = Field(..., description="Bulk job ID")
    state: BulkJobState = Field(..., description="Job state")
    records_processed: int = Field(default=0, description="Number of records processed")
    records_failed: int = Field(default=0, description="Number of records failed")
    results: Optional[List[Dict[str, Any]]] = Field(None, description="Operation results")


# Describe Schemas
class DescribeObjectResponse(BaseModel):
    """Describe SObject response"""
    name: str = Field(..., description="Object API name")
    label: str = Field(..., description="Object label")
    label_plural: str = Field(..., description="Plural label")
    key_prefix: Optional[str] = Field(None, description="Record ID prefix")
    queryable: bool = Field(..., description="Whether object is queryable")
    createable: bool = Field(..., description="Whether records can be created")
    updateable: bool = Field(..., description="Whether records can be updated")
    deletable: bool = Field(..., description="Whether records can be deleted")
    fields: List[Dict[str, Any]] = Field(default_factory=list, description="Object fields")
