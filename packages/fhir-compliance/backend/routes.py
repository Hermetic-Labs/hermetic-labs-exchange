"""
FHIR Compliance Suite - FastAPI Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from .schemas import (
    ValidationRequest,
    ValidationResponse,
    PatientRequest,
    PatientResponse,
    ObservationRequest,
    ObservationResponse,
    SearchRequest,
    SearchResponse,
    FHIRResourceType
)
from .service import FHIRService

router = APIRouter(prefix="/fhir", tags=["fhir"])


def get_fhir_service() -> FHIRService:
    return FHIRService()


@router.post("/validate", response_model=ValidationResponse)
async def validate_resource(
    request: ValidationRequest,
    service: FHIRService = Depends(get_fhir_service)
) -> ValidationResponse:
    """Validate a FHIR resource."""
    try:
        return await service.validate_resource(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/Patient", response_model=PatientResponse)
async def create_patient(
    request: PatientRequest,
    service: FHIRService = Depends(get_fhir_service)
) -> PatientResponse:
    """Create a Patient resource."""
    try:
        return await service.create_patient(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{resource_type}/{resource_id}")
async def get_resource(
    resource_type: FHIRResourceType,
    resource_id: str,
    service: FHIRService = Depends(get_fhir_service)
) -> Dict[str, Any]:
    """Get a resource by ID."""
    try:
        result = await service.get_resource(resource_type, resource_id)
        if not result:
            raise HTTPException(status_code=404, detail="Resource not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/Observation", response_model=ObservationResponse)
async def create_observation(
    request: ObservationRequest,
    service: FHIRService = Depends(get_fhir_service)
) -> ObservationResponse:
    """Create an Observation resource."""
    try:
        return await service.create_observation(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/search", response_model=SearchResponse)
async def search_resources(
    request: SearchRequest,
    service: FHIRService = Depends(get_fhir_service)
) -> SearchResponse:
    """Search for FHIR resources."""
    try:
        return await service.search(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
