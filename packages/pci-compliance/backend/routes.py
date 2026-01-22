"""
PCI DSS Compliance Suite - FastAPI Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from .schemas import (
    PANValidationRequest,
    PANValidationResponse,
    PANMaskRequest,
    PANMaskResponse,
    AssessmentRequest,
    AssessmentResponse,
    RequirementsResponse,
    ScanRequest,
    ScanResponse
)
from .service import PCIService

router = APIRouter(prefix="/pci", tags=["pci"])


def get_pci_service() -> PCIService:
    return PCIService()


@router.post("/validate-pan", response_model=PANValidationResponse)
async def validate_pan(
    request: PANValidationRequest,
    service: PCIService = Depends(get_pci_service)
) -> PANValidationResponse:
    """Validate a Primary Account Number."""
    try:
        return await service.validate_pan(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mask-pan", response_model=PANMaskResponse)
async def mask_pan(
    request: PANMaskRequest,
    service: PCIService = Depends(get_pci_service)
) -> PANMaskResponse:
    """Mask a PAN according to PCI requirements."""
    try:
        return await service.mask_pan(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/assessment", response_model=AssessmentResponse)
async def run_assessment(
    request: AssessmentRequest,
    service: PCIService = Depends(get_pci_service)
) -> AssessmentResponse:
    """Run a PCI DSS compliance assessment."""
    try:
        return await service.run_assessment(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/requirements", response_model=RequirementsResponse)
async def get_requirements(
    service: PCIService = Depends(get_pci_service)
) -> RequirementsResponse:
    """Get PCI DSS requirements."""
    try:
        return await service.get_requirements()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scan", response_model=ScanResponse)
async def run_scan(
    request: ScanRequest,
    service: PCIService = Depends(get_pci_service)
) -> ScanResponse:
    """Initiate a vulnerability scan."""
    try:
        return await service.run_scan(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
