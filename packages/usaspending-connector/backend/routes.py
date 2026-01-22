"""
FastAPI routes for USASpending Connector

Provides REST API endpoints for USASpending.gov
federal spending data integration.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path

from .schemas import (
    USASpendingConnectionConfig,
    USASpendingConnectionResponse,
    AwardSearchRequest,
    AwardResponse,
    AwardListResponse,
    AwardType,
    AwardCategory,
    AgencySpendingRequest,
    AgencySpendingResponse,
    RecipientSearchRequest,
    RecipientResponse,
    RecipientListResponse,
    GeographicSpendingRequest,
    GeographicSpendingResponse,
    FiscalYearSpendingResponse,
)
from .service import USASpendingService

router = APIRouter(prefix="/usaspending", tags=["usaspending"])

# Service instance (in production, use dependency injection)
_service: Optional[USASpendingService] = None


def get_service() -> USASpendingService:
    """Dependency to get USASpending service instance"""
    global _service
    if _service is None:
        _service = USASpendingService()
    return _service


# Connection Endpoints
@router.post("/connect", response_model=USASpendingConnectionResponse)
async def connect(
    config: USASpendingConnectionConfig = Body(...),
    service: USASpendingService = Depends(get_service),
) -> USASpendingConnectionResponse:
    """Establish USASpending connection"""
    try:
        return await service.connect(config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")


@router.post("/disconnect")
async def disconnect(
    service: USASpendingService = Depends(get_service),
) -> Dict[str, bool]:
    """Disconnect from USASpending"""
    result = await service.disconnect()
    return {"disconnected": result}


# Award Endpoints
@router.post("/awards/search", response_model=AwardListResponse)
async def search_awards(
    request: AwardSearchRequest = Body(...),
    service: USASpendingService = Depends(get_service),
) -> AwardListResponse:
    """Search federal awards"""
    try:
        return await service.search_awards(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search awards: {str(e)}")


@router.get("/awards", response_model=AwardListResponse)
async def get_awards(
    keywords: Optional[str] = Query(None, description="Keywords to search"),
    award_type: Optional[AwardType] = Query(None, description="Award type filter"),
    agency_code: Optional[str] = Query(None, description="Awarding agency code"),
    recipient_name: Optional[str] = Query(None, description="Recipient name"),
    state_code: Optional[str] = Query(None, description="State code"),
    fiscal_year: Optional[int] = Query(None, description="Fiscal year"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=500, description="Pagination limit"),
    service: USASpendingService = Depends(get_service),
) -> AwardListResponse:
    """Get awards with filters"""
    try:
        request = AwardSearchRequest(
            keywords=[keywords] if keywords else None,
            award_type=award_type,
            awarding_agency_code=agency_code,
            recipient_name=recipient_name,
            state_code=state_code,
            fiscal_year=fiscal_year,
            offset=offset,
            limit=limit,
        )
        return await service.search_awards(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get awards: {str(e)}")


@router.get("/awards/{award_id}", response_model=AwardResponse)
async def get_award(
    award_id: str = Path(..., description="Award ID"),
    service: USASpendingService = Depends(get_service),
) -> AwardResponse:
    """Get award by ID"""
    try:
        result = await service.get_award(award_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Award not found: {award_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get award: {str(e)}")


# Agency Endpoints
@router.get("/agencies/{agency_code}/spending", response_model=AgencySpendingResponse)
async def get_agency_spending(
    agency_code: str = Path(..., description="Agency code"),
    fiscal_year: Optional[int] = Query(None, description="Fiscal year"),
    include_sub_agencies: bool = Query(True, description="Include sub-agency breakdown"),
    service: USASpendingService = Depends(get_service),
) -> AgencySpendingResponse:
    """Get agency spending summary"""
    try:
        request = AgencySpendingRequest(
            agency_code=agency_code,
            fiscal_year=fiscal_year,
            include_sub_agencies=include_sub_agencies,
        )
        return await service.get_agency_spending(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get agency spending: {str(e)}")


# Recipient Endpoints
@router.get("/recipients", response_model=RecipientListResponse)
async def search_recipients(
    query: Optional[str] = Query(None, description="Search query"),
    uei: Optional[str] = Query(None, description="UEI"),
    state_code: Optional[str] = Query(None, description="State code"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=500, description="Pagination limit"),
    service: USASpendingService = Depends(get_service),
) -> RecipientListResponse:
    """Search award recipients"""
    try:
        request = RecipientSearchRequest(
            query=query,
            uei=uei,
            state_code=state_code,
            offset=offset,
            limit=limit,
        )
        return await service.search_recipients(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search recipients: {str(e)}")


# Geographic Endpoints
@router.post("/spending/geographic", response_model=GeographicSpendingResponse)
async def get_geographic_spending(
    request: GeographicSpendingRequest = Body(...),
    service: USASpendingService = Depends(get_service),
) -> GeographicSpendingResponse:
    """Get geographic spending analysis"""
    try:
        return await service.get_geographic_spending(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get geographic spending: {str(e)}")


# Fiscal Year Endpoints
@router.get("/spending/fiscal-year/{fiscal_year}", response_model=FiscalYearSpendingResponse)
async def get_fiscal_year_spending(
    fiscal_year: int = Path(..., description="Fiscal year"),
    service: USASpendingService = Depends(get_service),
) -> FiscalYearSpendingResponse:
    """Get fiscal year spending summary"""
    try:
        return await service.get_spending_by_fiscal_year(fiscal_year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get fiscal year spending: {str(e)}")
