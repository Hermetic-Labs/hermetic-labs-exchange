"""
ITAR Compliance Suite - FastAPI Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import date
from .schemas import (
    ClassificationRequest,
    ClassificationResponse,
    ScreeningRequest,
    ScreeningResponse,
    LicenseRequest,
    LicenseResponse,
    LicenseListResponse,
    TechnicalDataRequest,
    TechnicalDataResponse,
    AuditReportResponse,
    LicenseStatus
)
from .service import ITARService

router = APIRouter(prefix="/itar", tags=["itar"])


def get_itar_service() -> ITARService:
    return ITARService()


@router.post("/classify", response_model=ClassificationResponse)
async def classify_item(
    request: ClassificationRequest,
    service: ITARService = Depends(get_itar_service)
) -> ClassificationResponse:
    """Classify an item under USML."""
    try:
        return await service.classify_item(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/screen", response_model=ScreeningResponse)
async def screen_person(
    request: ScreeningRequest,
    service: ITARService = Depends(get_itar_service)
) -> ScreeningResponse:
    """Screen a foreign person."""
    try:
        return await service.screen_person(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/license", response_model=LicenseResponse)
async def request_license(
    request: LicenseRequest,
    service: ITARService = Depends(get_itar_service)
) -> LicenseResponse:
    """Request an export license."""
    try:
        return await service.request_license(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/licenses", response_model=LicenseListResponse)
async def list_licenses(
    status: Optional[LicenseStatus] = None,
    service: ITARService = Depends(get_itar_service)
) -> LicenseListResponse:
    """List export licenses."""
    try:
        return await service.list_licenses(status)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/technical-data", response_model=TechnicalDataResponse)
async def control_technical_data(
    request: TechnicalDataRequest,
    service: ITARService = Depends(get_itar_service)
) -> TechnicalDataResponse:
    """Control access to technical data."""
    try:
        return await service.control_technical_data(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/audit", response_model=AuditReportResponse)
async def get_audit_report(
    start_date: date,
    end_date: date,
    service: ITARService = Depends(get_itar_service)
) -> AuditReportResponse:
    """Get audit report."""
    try:
        return await service.get_audit_report(start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
