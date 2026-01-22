"""
FastAPI routes for Salesforce Connector

Provides REST API endpoints for Salesforce CRM integration including
OAuth authentication, SOQL queries, object CRUD, and bulk operations.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body

from .schemas import (
    SalesforceCredentials,
    OAuthTokenRequest,
    OAuthRefreshRequest,
    OAuthTokenResponse,
    SOQLQueryRequest,
    SOQLQueryResponse,
    SObjectCreateRequest,
    SObjectCreateResponse,
    SObjectUpdateRequest,
    SObjectDeleteResponse,
    BulkOperationRequest,
    BulkOperationResponse,
    BulkJobStatus,
    DescribeObjectResponse,
)
from .service import SalesforceService

router = APIRouter(prefix="/salesforce", tags=["salesforce"])


def get_service(sandbox: bool = Query(False)) -> SalesforceService:
    """Dependency to get Salesforce service instance"""
    return SalesforceService(sandbox=sandbox)


def get_credentials(
    access_token: str = Query(..., description="Salesforce access token"),
    instance_url: str = Query(..., description="Salesforce instance URL"),
) -> SalesforceCredentials:
    """Dependency to get credentials from query params"""
    return SalesforceCredentials(
        access_token=access_token,
        instance_url=instance_url,
    )


# OAuth Endpoints
@router.get("/oauth/authorize")
async def get_authorization_url(
    client_id: str = Query(..., description="OAuth client ID"),
    redirect_uri: str = Query(..., description="OAuth redirect URI"),
    scope: str = Query("api refresh_token", description="OAuth scopes"),
    state: Optional[str] = Query(None, description="State parameter"),
    service: SalesforceService = Depends(get_service),
) -> Dict[str, str]:
    """Get OAuth authorization URL"""
    url = service.get_authorization_url(
        client_id=client_id,
        redirect_uri=redirect_uri,
        scope=scope,
        state=state,
    )
    return {"authorization_url": url}


@router.post("/oauth/token", response_model=OAuthTokenResponse)
async def exchange_token(
    request: OAuthTokenRequest,
    service: SalesforceService = Depends(get_service),
) -> OAuthTokenResponse:
    """Exchange authorization code for access token"""
    try:
        return await service.exchange_code_for_token(
            code=request.code,
            client_id=request.client_id,
            client_secret=request.client_secret,
            redirect_uri=request.redirect_uri,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/oauth/refresh", response_model=OAuthTokenResponse)
async def refresh_token(
    request: OAuthRefreshRequest,
    service: SalesforceService = Depends(get_service),
) -> OAuthTokenResponse:
    """Refresh access token"""
    try:
        return await service.refresh_token(
            refresh_token=request.refresh_token,
            client_id=request.client_id,
            client_secret=request.client_secret,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# SOQL Query Endpoints
@router.post("/query", response_model=SOQLQueryResponse)
async def execute_query(
    request: SOQLQueryRequest,
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> SOQLQueryResponse:
    """Execute SOQL query"""
    try:
        return await service.execute_soql(credentials, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/query/next", response_model=SOQLQueryResponse)
async def get_next_records(
    next_records_url: str = Query(..., description="URL for next batch"),
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> SOQLQueryResponse:
    """Get next batch of query records"""
    try:
        return await service.get_next_records(credentials, next_records_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# SObject CRUD Endpoints
@router.get("/objects/{object_type}/describe", response_model=DescribeObjectResponse)
async def describe_object(
    object_type: str,
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> DescribeObjectResponse:
    """Describe an SObject"""
    try:
        return await service.describe_object(credentials, object_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/objects/{object_type}/{record_id}")
async def get_record(
    object_type: str,
    record_id: str,
    fields: Optional[str] = Query(None, description="Comma-separated list of fields"),
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> Dict[str, Any]:
    """Get a single record"""
    try:
        field_list = fields.split(",") if fields else None
        return await service.get_record(credentials, object_type, record_id, field_list)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/objects/{object_type}", response_model=SObjectCreateResponse)
async def create_record(
    object_type: str,
    fields: Dict[str, Any] = Body(..., description="Field values"),
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> SObjectCreateResponse:
    """Create a new record"""
    try:
        return await service.create_record(credentials, object_type, fields)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/objects/{object_type}/{record_id}")
async def update_record(
    object_type: str,
    record_id: str,
    request: SObjectUpdateRequest,
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> Dict[str, bool]:
    """Update a record"""
    try:
        success = await service.update_record(
            credentials, object_type, record_id, request.fields
        )
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/objects/{object_type}/{record_id}", response_model=SObjectDeleteResponse)
async def delete_record(
    object_type: str,
    record_id: str,
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> SObjectDeleteResponse:
    """Delete a record"""
    try:
        return await service.delete_record(credentials, object_type, record_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Bulk Operation Endpoints
@router.post("/bulk/job", response_model=BulkJobStatus)
async def create_bulk_job(
    request: BulkOperationRequest,
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> BulkJobStatus:
    """Create a bulk job"""
    try:
        return await service.create_bulk_job(credentials, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/bulk/job/{job_id}/data")
async def upload_bulk_data(
    job_id: str,
    records: List[Dict[str, Any]] = Body(..., description="Records to upload"),
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> Dict[str, bool]:
    """Upload data to a bulk job"""
    try:
        success = await service.upload_bulk_data(credentials, job_id, records)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/bulk/job/{job_id}/close", response_model=BulkJobStatus)
async def close_bulk_job(
    job_id: str,
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> BulkJobStatus:
    """Close a bulk job to start processing"""
    try:
        return await service.close_bulk_job(credentials, job_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/bulk/job/{job_id}", response_model=BulkJobStatus)
async def get_bulk_job_status(
    job_id: str,
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> BulkJobStatus:
    """Get bulk job status"""
    try:
        return await service.get_bulk_job_status(credentials, job_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk/execute", response_model=BulkOperationResponse)
async def execute_bulk_operation(
    request: BulkOperationRequest,
    credentials: SalesforceCredentials = Depends(get_credentials),
    service: SalesforceService = Depends(get_service),
) -> BulkOperationResponse:
    """Execute a complete bulk operation"""
    try:
        return await service.execute_bulk_operation(credentials, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
