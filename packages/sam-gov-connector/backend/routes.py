"""
FastAPI routes for SAM.gov Connector

Provides REST API endpoints for SAM.gov federal contractor
registration, entity search, and exclusions integration.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path

from .schemas import (
    SAMGovCredentials,
    SAMGovConnectionConfig,
    SAMGovConnectionResponse,
    EntitySearchRequest,
    EntityResponse,
    EntityListResponse,
    EntityStatus,
    EntityType,
    ExclusionSearchRequest,
    ExclusionResponse,
    ExclusionListResponse,
    ExclusionType,
    OpportunitySearchRequest,
    OpportunityResponse,
    OpportunityListResponse,
    SetAsideType,
)
from .service import SAMGovService

router = APIRouter(prefix="/sam-gov", tags=["sam-gov"])

# Service instance (in production, use dependency injection)
_service: Optional[SAMGovService] = None


def get_service() -> SAMGovService:
    """Dependency to get SAM.gov service instance"""
    global _service
    if _service is None:
        _service = SAMGovService()
    return _service


# Connection Endpoints
@router.post("/connect", response_model=SAMGovConnectionResponse)
async def connect(
    config: SAMGovConnectionConfig,
    credentials: SAMGovCredentials = Body(...),
    service: SAMGovService = Depends(get_service),
) -> SAMGovConnectionResponse:
    """Establish SAM.gov connection"""
    try:
        return await service.connect(config, credentials)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")


@router.post("/disconnect")
async def disconnect(
    service: SAMGovService = Depends(get_service),
) -> Dict[str, bool]:
    """Disconnect from SAM.gov"""
    result = await service.disconnect()
    return {"disconnected": result}


# Entity Endpoints
@router.get("/entities", response_model=EntityListResponse)
async def search_entities(
    query: Optional[str] = Query(None, description="Search query"),
    uei: Optional[str] = Query(None, description="Unique Entity Identifier"),
    cage_code: Optional[str] = Query(None, description="CAGE Code"),
    legal_business_name: Optional[str] = Query(None, description="Legal business name"),
    status: Optional[EntityStatus] = Query(None, description="Registration status"),
    entity_type: Optional[EntityType] = Query(None, description="Entity type"),
    state: Optional[str] = Query(None, description="State code"),
    naics_code: Optional[str] = Query(None, description="NAICS code"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=500, description="Pagination limit"),
    service: SAMGovService = Depends(get_service),
) -> EntityListResponse:
    """Search registered entities"""
    try:
        request = EntitySearchRequest(
            query=query,
            uei=uei,
            cage_code=cage_code,
            legal_business_name=legal_business_name,
            status=status,
            entity_type=entity_type,
            state=state,
            naics_code=naics_code,
            offset=offset,
            limit=limit,
        )
        return await service.search_entities(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search entities: {str(e)}")


@router.get("/entities/{uei}", response_model=EntityResponse)
async def get_entity(
    uei: str = Path(..., description="Unique Entity Identifier"),
    service: SAMGovService = Depends(get_service),
) -> EntityResponse:
    """Get entity by UEI"""
    try:
        result = await service.get_entity(uei)
        if not result:
            raise HTTPException(status_code=404, detail=f"Entity not found: {uei}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entity: {str(e)}")


@router.get("/entities/cage/{cage_code}", response_model=EntityResponse)
async def get_entity_by_cage(
    cage_code: str = Path(..., description="CAGE Code"),
    service: SAMGovService = Depends(get_service),
) -> EntityResponse:
    """Get entity by CAGE code"""
    try:
        result = await service.get_entity_by_cage(cage_code)
        if not result:
            raise HTTPException(status_code=404, detail=f"Entity not found: {cage_code}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entity: {str(e)}")


# Exclusion Endpoints
@router.get("/exclusions", response_model=ExclusionListResponse)
async def search_exclusions(
    name: Optional[str] = Query(None, description="Name search"),
    uei: Optional[str] = Query(None, description="Unique Entity Identifier"),
    cage_code: Optional[str] = Query(None, description="CAGE Code"),
    exclusion_type: Optional[ExclusionType] = Query(None, description="Exclusion type"),
    excluding_agency: Optional[str] = Query(None, description="Excluding agency"),
    active_only: bool = Query(True, description="Only active exclusions"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=500, description="Pagination limit"),
    service: SAMGovService = Depends(get_service),
) -> ExclusionListResponse:
    """Search exclusion records"""
    try:
        request = ExclusionSearchRequest(
            name=name,
            uei=uei,
            cage_code=cage_code,
            exclusion_type=exclusion_type,
            excluding_agency=excluding_agency,
            active_only=active_only,
            offset=offset,
            limit=limit,
        )
        return await service.search_exclusions(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search exclusions: {str(e)}")


# Opportunity Endpoints
@router.get("/opportunities", response_model=OpportunityListResponse)
async def search_opportunities(
    query: Optional[str] = Query(None, description="Search query"),
    agency: Optional[str] = Query(None, description="Agency filter"),
    naics_code: Optional[str] = Query(None, description="NAICS code"),
    set_aside: Optional[SetAsideType] = Query(None, description="Set-aside type"),
    active_only: bool = Query(True, description="Only active opportunities"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=500, description="Pagination limit"),
    service: SAMGovService = Depends(get_service),
) -> OpportunityListResponse:
    """Search contract opportunities"""
    try:
        request = OpportunitySearchRequest(
            query=query,
            agency=agency,
            naics_code=naics_code,
            set_aside=set_aside,
            active_only=active_only,
            offset=offset,
            limit=limit,
        )
        return await service.search_opportunities(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search opportunities: {str(e)}")
