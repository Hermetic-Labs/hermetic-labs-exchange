"""
HIPAA Privacy Suite - FastAPI Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from .schemas import (
    PHIDetectionRequest,
    PHIDetectionResponse,
    PHIMaskRequest,
    PHIMaskResponse,
    AccessValidationRequest,
    AccessValidationResponse,
    AuditLogResponse,
    BreachReportRequest,
    BreachReportResponse
)
from .service import HIPAAService

router = APIRouter(prefix="/hipaa", tags=["hipaa"])


def get_hipaa_service() -> HIPAAService:
    return HIPAAService()


@router.post("/detect-phi", response_model=PHIDetectionResponse)
async def detect_phi(
    request: PHIDetectionRequest,
    service: HIPAAService = Depends(get_hipaa_service)
) -> PHIDetectionResponse:
    """Detect PHI entities in text."""
    try:
        return await service.detect_phi(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mask-phi", response_model=PHIMaskResponse)
async def mask_phi(
    request: PHIMaskRequest,
    service: HIPAAService = Depends(get_hipaa_service)
) -> PHIMaskResponse:
    """Mask PHI in text."""
    try:
        return await service.mask_phi(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/validate-access", response_model=AccessValidationResponse)
async def validate_access(
    request: AccessValidationRequest,
    service: HIPAAService = Depends(get_hipaa_service)
) -> AccessValidationResponse:
    """Validate access based on HIPAA requirements."""
    try:
        return await service.validate_access(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/audit-log", response_model=AuditLogResponse)
async def get_audit_log(
    page: int = 1,
    page_size: int = 50,
    user_id: Optional[str] = None,
    service: HIPAAService = Depends(get_hipaa_service)
) -> AuditLogResponse:
    """Get audit log entries."""
    try:
        return await service.get_audit_log(page, page_size, user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/report-breach", response_model=BreachReportResponse)
async def report_breach(
    request: BreachReportRequest,
    service: HIPAAService = Depends(get_hipaa_service)
) -> BreachReportResponse:
    """Report a potential HIPAA breach."""
    try:
        return await service.report_breach(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
