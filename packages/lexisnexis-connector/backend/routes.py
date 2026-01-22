"""
FastAPI routes for LexisNexis Connector

Provides REST API endpoints for LexisNexis legal research
integration including case law, statutes, and Shepard's citations.
"""

from typing import Any, Dict, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path

from .schemas import (
    LexisNexisCredentials,
    LexisNexisConnectionConfig,
    LexisNexisConnectionResponse,
    DocumentSearchRequest,
    DocumentResponse,
    DocumentListResponse,
    DocumentType,
    Jurisdiction,
    SortOrder,
    CaseSearchRequest,
    CaseResponse,
    CaseListResponse,
    StatuteSearchRequest,
    StatuteResponse,
    StatuteListResponse,
    ShepardizeRequest,
    ShepardizeResponse,
    TreatmentType,
)
from .service import LexisNexisService

router = APIRouter(prefix="/lexisnexis", tags=["lexisnexis"])

# Service instance (in production, use dependency injection)
_service: Optional[LexisNexisService] = None


def get_service() -> LexisNexisService:
    """Dependency to get LexisNexis service instance"""
    global _service
    if _service is None:
        _service = LexisNexisService()
    return _service


# Connection Endpoints
@router.post("/connect", response_model=LexisNexisConnectionResponse)
async def connect(
    config: LexisNexisConnectionConfig,
    credentials: LexisNexisCredentials = Body(...),
    service: LexisNexisService = Depends(get_service),
) -> LexisNexisConnectionResponse:
    """Establish LexisNexis connection"""
    try:
        return await service.connect(config, credentials)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")


@router.post("/disconnect")
async def disconnect(
    service: LexisNexisService = Depends(get_service),
) -> Dict[str, bool]:
    """Disconnect from LexisNexis"""
    result = await service.disconnect()
    return {"disconnected": result}


# Document Search Endpoints
@router.post("/documents/search", response_model=DocumentListResponse)
async def search_documents(
    request: DocumentSearchRequest = Body(...),
    service: LexisNexisService = Depends(get_service),
) -> DocumentListResponse:
    """Search legal documents"""
    try:
        return await service.search_documents(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/documents", response_model=DocumentListResponse)
async def get_documents(
    query: str = Query(..., min_length=1, description="Search query"),
    document_type: Optional[DocumentType] = Query(None, description="Document type"),
    jurisdiction: Optional[Jurisdiction] = Query(None, description="Jurisdiction"),
    court: Optional[str] = Query(None, description="Court"),
    date_from: Optional[date] = Query(None, description="Date from"),
    date_to: Optional[date] = Query(None, description="Date to"),
    sort: SortOrder = Query(SortOrder.RELEVANCE, description="Sort order"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(25, ge=1, le=100, description="Pagination limit"),
    service: LexisNexisService = Depends(get_service),
) -> DocumentListResponse:
    """Search documents with query parameters"""
    try:
        request = DocumentSearchRequest(
            query=query,
            document_type=document_type,
            jurisdiction=jurisdiction,
            court=court,
            date_from=date_from,
            date_to=date_to,
            sort=sort,
            offset=offset,
            limit=limit,
        )
        return await service.search_documents(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str = Path(..., description="Document ID"),
    service: LexisNexisService = Depends(get_service),
) -> DocumentResponse:
    """Get document by ID"""
    try:
        result = await service.get_document(document_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Document not found: {document_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get document: {str(e)}")


# Case Law Endpoints
@router.post("/cases/search", response_model=CaseListResponse)
async def search_cases(
    request: CaseSearchRequest = Body(...),
    service: LexisNexisService = Depends(get_service),
) -> CaseListResponse:
    """Search case law"""
    try:
        return await service.search_cases(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/cases", response_model=CaseListResponse)
async def get_cases(
    query: str = Query(..., min_length=1, description="Search query"),
    jurisdiction: Optional[Jurisdiction] = Query(None, description="Jurisdiction"),
    court: Optional[str] = Query(None, description="Court"),
    date_from: Optional[date] = Query(None, description="Date from"),
    date_to: Optional[date] = Query(None, description="Date to"),
    sort: SortOrder = Query(SortOrder.RELEVANCE, description="Sort order"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(25, ge=1, le=100, description="Pagination limit"),
    service: LexisNexisService = Depends(get_service),
) -> CaseListResponse:
    """Search cases with query parameters"""
    try:
        request = CaseSearchRequest(
            query=query,
            jurisdiction=jurisdiction,
            court=court,
            date_from=date_from,
            date_to=date_to,
            sort=sort,
            offset=offset,
            limit=limit,
        )
        return await service.search_cases(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/cases/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str = Path(..., description="Case ID"),
    service: LexisNexisService = Depends(get_service),
) -> CaseResponse:
    """Get case by ID"""
    try:
        result = await service.get_case(case_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Case not found: {case_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get case: {str(e)}")


# Statute Endpoints
@router.post("/statutes/search", response_model=StatuteListResponse)
async def search_statutes(
    request: StatuteSearchRequest = Body(...),
    service: LexisNexisService = Depends(get_service),
) -> StatuteListResponse:
    """Search statutes"""
    try:
        return await service.search_statutes(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/statutes", response_model=StatuteListResponse)
async def get_statutes(
    query: str = Query(..., min_length=1, description="Search query"),
    jurisdiction: Optional[Jurisdiction] = Query(None, description="Jurisdiction"),
    code_name: Optional[str] = Query(None, description="Code name"),
    sort: SortOrder = Query(SortOrder.RELEVANCE, description="Sort order"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(25, ge=1, le=100, description="Pagination limit"),
    service: LexisNexisService = Depends(get_service),
) -> StatuteListResponse:
    """Search statutes with query parameters"""
    try:
        request = StatuteSearchRequest(
            query=query,
            jurisdiction=jurisdiction,
            code_name=code_name,
            sort=sort,
            offset=offset,
            limit=limit,
        )
        return await service.search_statutes(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# Shepard's Endpoints
@router.post("/shepardize", response_model=ShepardizeResponse)
async def shepardize(
    request: ShepardizeRequest = Body(...),
    service: LexisNexisService = Depends(get_service),
) -> ShepardizeResponse:
    """Get Shepard's citation analysis"""
    try:
        return await service.shepardize(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Shepardize failed: {str(e)}")


@router.get("/shepardize/{citation:path}", response_model=ShepardizeResponse)
async def shepardize_citation(
    citation: str = Path(..., description="Citation to analyze"),
    include_history: bool = Query(True, description="Include case history"),
    include_citing_references: bool = Query(True, description="Include citing references"),
    treatment_filter: Optional[TreatmentType] = Query(None, description="Filter by treatment"),
    limit: int = Query(50, ge=1, le=200, description="Limit citing references"),
    service: LexisNexisService = Depends(get_service),
) -> ShepardizeResponse:
    """Shepardize a citation"""
    try:
        request = ShepardizeRequest(
            citation=citation,
            include_history=include_history,
            include_citing_references=include_citing_references,
            treatment_filter=treatment_filter,
            limit=limit,
        )
        return await service.shepardize(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Shepardize failed: {str(e)}")
