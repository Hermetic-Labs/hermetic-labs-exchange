"""
FastAPI routes for Westlaw Connector

Provides REST API endpoints for Westlaw legal research
integration including KeyCite, case law, and statutes.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path

from .schemas import (
    WestlawCredentials,
    WestlawConnectionConfig,
    WestlawConnectionResponse,
    DocumentSearchRequest,
    DocumentResponse,
    DocumentListResponse,
    DocumentType,
    Jurisdiction,
    CaseSearchRequest,
    CaseResponse,
    CaseListResponse,
    StatuteSearchRequest,
    StatuteResponse,
    StatuteListResponse,
    KeyCiteRequest,
    KeyCiteResponse,
    KeyNumber,
)
from .service import WestlawService

router = APIRouter(prefix="/westlaw", tags=["westlaw"])

# Service instance (in production, use dependency injection)
_service: Optional[WestlawService] = None


def get_service() -> WestlawService:
    """Dependency to get Westlaw service instance"""
    global _service
    if _service is None:
        _service = WestlawService()
    return _service


# Connection Endpoints
@router.post("/connect", response_model=WestlawConnectionResponse)
async def connect(
    config: WestlawConnectionConfig = Body(...),
    credentials: WestlawCredentials = Body(...),
    service: WestlawService = Depends(get_service),
) -> WestlawConnectionResponse:
    """Establish Westlaw connection"""
    try:
        return await service.connect(config, credentials)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")


@router.post("/disconnect")
async def disconnect(
    service: WestlawService = Depends(get_service),
) -> Dict[str, bool]:
    """Disconnect from Westlaw"""
    result = await service.disconnect()
    return {"disconnected": result}


# Document Endpoints
@router.post("/documents/search", response_model=DocumentListResponse)
async def search_documents(
    request: DocumentSearchRequest = Body(...),
    service: WestlawService = Depends(get_service),
) -> DocumentListResponse:
    """Search legal documents"""
    try:
        return await service.search_documents(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search documents: {str(e)}")


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str = Path(..., description="Document ID"),
    service: WestlawService = Depends(get_service),
) -> DocumentResponse:
    """Get a specific document by ID"""
    try:
        return await service.get_document(document_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get document: {str(e)}")


# Case Law Endpoints
@router.post("/cases/search", response_model=CaseListResponse)
async def search_cases(
    request: CaseSearchRequest = Body(...),
    service: WestlawService = Depends(get_service),
) -> CaseListResponse:
    """Search case law"""
    try:
        return await service.search_cases(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search cases: {str(e)}")


@router.get("/cases", response_model=CaseListResponse)
async def get_cases(
    query: str = Query(..., description="Search query"),
    jurisdiction: Optional[Jurisdiction] = Query(None),
    court: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: WestlawService = Depends(get_service),
) -> CaseListResponse:
    """Get cases by query parameters"""
    try:
        request = CaseSearchRequest(
            query=query,
            jurisdiction=jurisdiction,
            court=court,
            date_from=date_from,
            date_to=date_to,
            offset=offset,
            limit=limit,
        )
        return await service.search_cases(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cases: {str(e)}")


# Statute Endpoints
@router.post("/statutes/search", response_model=StatuteListResponse)
async def search_statutes(
    request: StatuteSearchRequest = Body(...),
    service: WestlawService = Depends(get_service),
) -> StatuteListResponse:
    """Search statutes"""
    try:
        return await service.search_statutes(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search statutes: {str(e)}")


@router.get("/statutes", response_model=StatuteListResponse)
async def get_statutes(
    query: str = Query(..., description="Search query"),
    jurisdiction: Optional[Jurisdiction] = Query(None),
    code_name: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: WestlawService = Depends(get_service),
) -> StatuteListResponse:
    """Get statutes by query parameters"""
    try:
        request = StatuteSearchRequest(
            query=query,
            jurisdiction=jurisdiction,
            code_name=code_name,
            offset=offset,
            limit=limit,
        )
        return await service.search_statutes(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statutes: {str(e)}")


# KeyCite Endpoints
@router.post("/keycite", response_model=KeyCiteResponse)
async def keycite(
    request: KeyCiteRequest = Body(...),
    service: WestlawService = Depends(get_service),
) -> KeyCiteResponse:
    """KeyCite a citation"""
    try:
        return await service.keycite(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to KeyCite: {str(e)}")


@router.get("/keycite/{citation}", response_model=KeyCiteResponse)
async def keycite_by_citation(
    citation: str = Path(..., description="Citation to KeyCite"),
    include_citing_refs: bool = Query(True),
    include_history: bool = Query(True),
    service: WestlawService = Depends(get_service),
) -> KeyCiteResponse:
    """KeyCite a citation by path parameter"""
    try:
        request = KeyCiteRequest(
            citation=citation,
            include_citing_refs=include_citing_refs,
            include_history=include_history,
        )
        return await service.keycite(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to KeyCite: {str(e)}")


# Key Number Endpoints
@router.get("/keynumbers/{key_number}", response_model=KeyNumber)
async def get_key_number(
    key_number: str = Path(..., description="West Key Number"),
    service: WestlawService = Depends(get_service),
) -> KeyNumber:
    """Get details for a West Key Number"""
    try:
        return await service.get_key_number(key_number)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get key number: {str(e)}")
