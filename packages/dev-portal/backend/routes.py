"""
Developer Portal - FastAPI Routes

API endpoints for the Developer Portal package:
- Package generation from remix basket
- Element registry operations
- Status/health checks
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
import io

from .schemas import (
    PackageGenerateRequest,
    PackageGenerateResponse,
    StatusResponse,
    ElementQueryRequest,
    ElementQueryResponse,
)
from .service import DevPortalService


# Create router with prefix
router = APIRouter(
    prefix="/dev-portal",
    tags=["dev-portal"]
)


# ============================================================================
# Dependency Injection
# ============================================================================

def get_service() -> DevPortalService:
    """Get an instance of the dev portal service."""
    return DevPortalService()


# ============================================================================
# Status Endpoint
# ============================================================================

@router.get("/status", response_model=StatusResponse)
async def get_status(
    service: DevPortalService = Depends(get_service)
) -> StatusResponse:
    """
    Get the current status of the Developer Portal.

    This is a simple health check endpoint.
    """
    return await service.get_status()


# ============================================================================
# Package Generation Endpoints
# ============================================================================

@router.post("/generate", response_model=PackageGenerateResponse)
async def generate_package(
    request: PackageGenerateRequest,
    service: DevPortalService = Depends(get_service)
) -> PackageGenerateResponse:
    """
    Generate a new package from remix basket elements.

    Takes a list of elements and generation options, returns the generated
    package files including manifest, components, services, hooks, and README.

    Args:
        request: Package generation request with elements and options

    Returns:
        PackageGenerateResponse with generated files and metadata
    """
    return await service.generate_package(request.elements, request.options)


@router.post("/generate/download")
async def generate_and_download(
    request: PackageGenerateRequest,
    service: DevPortalService = Depends(get_service)
) -> StreamingResponse:
    """
    Generate a package and return it as a downloadable zip file.

    Args:
        request: Package generation request with elements and options

    Returns:
        Streaming response with zip file
    """
    # Generate the package
    response = await service.generate_package(request.elements, request.options)

    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)

    # Create zip file
    zip_bytes = await service.create_package_zip(response)

    # Return as streaming response
    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{response.name}.zip"'
        }
    )


@router.post("/generate/save", response_model=Dict[str, Any])
async def generate_and_save(
    request: PackageGenerateRequest,
    service: DevPortalService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Generate a package and save it to the market_source directory.

    Args:
        request: Package generation request with elements and options

    Returns:
        Success response with the path where package was saved
    """
    # Generate the package
    response = await service.generate_package(request.elements, request.options)

    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)

    # Save to disk
    try:
        path = await service.save_package_to_disk(response)
        return {
            "success": True,
            "message": f"Package saved successfully",
            "path": path,
            "name": response.name,
            "files_count": len(response.files),
            "warnings": response.warnings,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Element Registry Endpoints
# ============================================================================

@router.post("/elements/query", response_model=ElementQueryResponse)
async def query_elements(
    request: ElementQueryRequest,
    service: DevPortalService = Depends(get_service)
) -> ElementQueryResponse:
    """
    Query available elements for remixing.

    Supports filtering by package, type, and search term.

    Args:
        request: Query parameters

    Returns:
        ElementQueryResponse with matching elements
    """
    # TODO: Implement element registry query
    # For now, return empty response
    return ElementQueryResponse(
        success=True,
        elements=[],
        total=0,
        has_more=False,
    )


# ============================================================================
# Preview Endpoints
# ============================================================================

@router.post("/preview/manifest")
async def preview_manifest(
    request: PackageGenerateRequest,
    service: DevPortalService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Preview the manifest.json that would be generated.

    Useful for checking package configuration before full generation.

    Args:
        request: Package generation request

    Returns:
        The manifest dict
    """
    response = await service.generate_package(request.elements, request.options)

    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)

    # Find and return manifest file
    for file in response.files:
        if file.path == 'manifest.json':
            import json
            return json.loads(file.content)

    raise HTTPException(status_code=500, detail="Manifest not generated")
