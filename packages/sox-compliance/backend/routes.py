"""
SOX Compliance Suite - FastAPI Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from .schemas import (
    ControlRequest,
    ControlResponse,
    ControlListResponse,
    ControlTestRequest,
    ControlTestResponse,
    SODCheckRequest,
    SODCheckResponse,
    DeficiencyRequest,
    DeficiencyResponse,
    AuditTrailResponse
)
from .service import SOXService

router = APIRouter(prefix="/sox", tags=["sox"])


def get_sox_service() -> SOXService:
    return SOXService()


@router.post("/control", response_model=ControlResponse)
async def create_control(
    request: ControlRequest,
    service: SOXService = Depends(get_sox_service)
) -> ControlResponse:
    """Create a new SOX control."""
    try:
        return await service.create_control(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/controls", response_model=ControlListResponse)
async def list_controls(
    page: int = 1,
    page_size: int = 20,
    process_area: Optional[str] = None,
    service: SOXService = Depends(get_sox_service)
) -> ControlListResponse:
    """List all controls."""
    try:
        return await service.list_controls(page, page_size, process_area)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/test", response_model=ControlTestResponse)
async def log_control_test(
    request: ControlTestRequest,
    service: SOXService = Depends(get_sox_service)
) -> ControlTestResponse:
    """Log a control test result."""
    try:
        return await service.log_control_test(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sod-check", response_model=SODCheckResponse)
async def check_sod(
    request: SODCheckRequest,
    service: SOXService = Depends(get_sox_service)
) -> SODCheckResponse:
    """Check for segregation of duties conflicts."""
    try:
        return await service.check_sod(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/deficiency", response_model=DeficiencyResponse)
async def report_deficiency(
    request: DeficiencyRequest,
    service: SOXService = Depends(get_sox_service)
) -> DeficiencyResponse:
    """Report a control deficiency."""
    try:
        return await service.report_deficiency(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/audit-trail", response_model=AuditTrailResponse)
async def get_audit_trail(
    page: int = 1,
    page_size: int = 50,
    entity_type: Optional[str] = None,
    service: SOXService = Depends(get_sox_service)
) -> AuditTrailResponse:
    """Get audit trail entries."""
    try:
        return await service.get_audit_trail(page, page_size, entity_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
