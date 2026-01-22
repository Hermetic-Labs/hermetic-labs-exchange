"""
FedRAMP Compliance Suite - FastAPI Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from .schemas import (
    ControlAssessmentRequest,
    ControlAssessmentResponse,
    ControlListResponse,
    POAMRequest,
    POAMResponse,
    POAMListResponse,
    ConMonRequest,
    ConMonResponse,
    ImpactLevel,
    ControlFamily,
    POAMStatus
)
from .service import FedRAMPService

router = APIRouter(prefix="/fedramp", tags=["fedramp"])


def get_fedramp_service() -> FedRAMPService:
    return FedRAMPService()


@router.post("/assess", response_model=ControlAssessmentResponse)
async def assess_control(
    request: ControlAssessmentRequest,
    service: FedRAMPService = Depends(get_fedramp_service)
) -> ControlAssessmentResponse:
    """Assess a control implementation."""
    try:
        return await service.assess_control(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/controls", response_model=ControlListResponse)
async def list_controls(
    baseline: ImpactLevel = ImpactLevel.MODERATE,
    family: Optional[ControlFamily] = None,
    service: FedRAMPService = Depends(get_fedramp_service)
) -> ControlListResponse:
    """List controls by baseline."""
    try:
        return await service.list_controls(baseline, family)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/poam", response_model=POAMResponse)
async def create_poam(
    request: POAMRequest,
    service: FedRAMPService = Depends(get_fedramp_service)
) -> POAMResponse:
    """Create a POA&M item."""
    try:
        return await service.create_poam(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/poam", response_model=POAMListResponse)
async def list_poam(
    status: Optional[POAMStatus] = None,
    service: FedRAMPService = Depends(get_fedramp_service)
) -> POAMListResponse:
    """List POA&M items."""
    try:
        return await service.list_poam(status)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/conmon", response_model=ConMonResponse)
async def run_conmon(
    request: ConMonRequest,
    service: FedRAMPService = Depends(get_fedramp_service)
) -> ConMonResponse:
    """Run continuous monitoring report."""
    try:
        return await service.run_conmon(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
