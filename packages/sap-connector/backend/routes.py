"""
FastAPI routes for SAP Connector

Provides REST API endpoints for SAP ERP integration including
RFC calls, BAPI execution, OData services, and IDoc processing.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path

from .schemas import (
    SAPCredentials,
    SAPConnectionConfig,
    SAPConnectionResponse,
    RFCCallRequest,
    RFCCallResponse,
    RFCMetadata,
    BAPICallRequest,
    BAPICallResponse,
    ODataRequest,
    ODataResponse,
    ODataEntityRequest,
    IDocSendRequest,
    IDocSendResponse,
    IDocStatus,
    IDocType,
)
from .service import SAPService

router = APIRouter(prefix="/sap", tags=["sap"])

# Service instance (in production, use dependency injection)
_service: Optional[SAPService] = None


def get_service() -> SAPService:
    """Dependency to get SAP service instance"""
    global _service
    if _service is None:
        _service = SAPService()
    return _service


def get_credentials(
    username: str = Query(..., description="SAP username"),
    password: str = Query(..., description="SAP password"),
) -> SAPCredentials:
    """Dependency to get credentials from query params"""
    return SAPCredentials(username=username, password=password)


# Connection Endpoints
@router.post("/connect", response_model=SAPConnectionResponse)
async def connect(
    config: SAPConnectionConfig,
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> SAPConnectionResponse:
    """Establish SAP connection"""
    try:
        return await service.connect(config, credentials)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/disconnect")
async def disconnect(
    service: SAPService = Depends(get_service),
) -> Dict[str, bool]:
    """Close SAP connection"""
    success = await service.disconnect()
    return {"disconnected": success}


# RFC Endpoints
@router.post("/rfc/call", response_model=RFCCallResponse)
async def call_rfc(
    request: RFCCallRequest,
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> RFCCallResponse:
    """Execute RFC function call"""
    try:
        return await service.call_rfc(credentials, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/rfc/metadata/{function_name}", response_model=RFCMetadata)
async def get_rfc_metadata(
    function_name: str = Path(..., description="RFC function name"),
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> RFCMetadata:
    """Get RFC function metadata"""
    try:
        return await service.get_rfc_metadata(credentials, function_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# BAPI Endpoints
@router.post("/bapi/call", response_model=BAPICallResponse)
async def call_bapi(
    request: BAPICallRequest,
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> BAPICallResponse:
    """Execute BAPI call"""
    try:
        return await service.call_bapi(credentials, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bapi/commit")
async def commit_bapi(
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> Dict[str, bool]:
    """Commit BAPI transaction"""
    try:
        success = await service.commit_bapi(credentials)
        return {"committed": success}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bapi/rollback")
async def rollback_bapi(
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> Dict[str, bool]:
    """Rollback BAPI transaction"""
    try:
        success = await service.rollback_bapi(credentials)
        return {"rolledback": success}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# OData Endpoints
@router.post("/odata/query", response_model=ODataResponse)
async def odata_query(
    request: ODataRequest,
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> ODataResponse:
    """Execute OData GET request"""
    try:
        return await service.odata_get(credentials, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/odata/create", response_model=ODataResponse)
async def odata_create(
    request: ODataEntityRequest,
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> ODataResponse:
    """Execute OData POST (create) request"""
    try:
        return await service.odata_create(credentials, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/odata/update", response_model=ODataResponse)
async def odata_update(
    request: ODataEntityRequest,
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> ODataResponse:
    """Execute OData PATCH (update) request"""
    try:
        return await service.odata_update(credentials, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/odata/{service_path:path}/{entity_set}", response_model=ODataResponse)
async def odata_delete(
    service_path: str = Path(..., description="OData service path"),
    entity_set: str = Path(..., description="Entity set name"),
    key: str = Query(..., description="Entity key"),
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> ODataResponse:
    """Execute OData DELETE request"""
    try:
        return await service.odata_delete(credentials, f"/{service_path}", entity_set, key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# IDoc Endpoints
@router.post("/idoc/send", response_model=IDocSendResponse)
async def send_idoc(
    request: IDocSendRequest,
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> IDocSendResponse:
    """Send IDoc to SAP"""
    try:
        return await service.send_idoc(credentials, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/idoc/{idoc_number}", response_model=IDocStatus)
async def get_idoc_status(
    idoc_number: str = Path(..., description="IDoc number"),
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> IDocStatus:
    """Get IDoc status"""
    try:
        return await service.get_idoc_status(credentials, idoc_number)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/idoc/types", response_model=List[IDocType])
async def get_idoc_types(
    credentials: SAPCredentials = Depends(get_credentials),
    service: SAPService = Depends(get_service),
) -> List[IDocType]:
    """Get available IDoc types"""
    try:
        return await service.get_idoc_types(credentials)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
