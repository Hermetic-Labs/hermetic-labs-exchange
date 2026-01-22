"""
Package Name - FastAPI Routes

Define your API endpoints here. These routes are automatically mounted
when the package is installed in EVE OS.

Route Naming Convention:
- Use kebab-case for paths: /package-name/do-something
- Prefix with package name to avoid conflicts
- Use standard HTTP methods (GET, POST, PUT, DELETE)

Authentication:
- Use get_optional_user for endpoints that work without auth
- Use get_current_user for endpoints that require auth
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends

from .schemas import (
    PackageRequest,
    PackageResponse,
    StatusResponse,
)
from .service import PackageService

# Create router with prefix matching your package name
# Tags appear in OpenAPI docs
router = APIRouter(
    prefix="/package-name",
    tags=["package-name"]
)


# ============================================================================
# Dependency Injection
# ============================================================================

def get_service() -> PackageService:
    """Get an instance of the package service."""
    return PackageService()


# ============================================================================
# Status Endpoint
# ============================================================================

@router.get("/status", response_model=StatusResponse)
async def get_status(
    service: PackageService = Depends(get_service)
) -> StatusResponse:
    """
    Get the current status of the package.
    
    This is a simple health check endpoint.
    """
    return await service.get_status()


# ============================================================================
# Main Endpoints
# ============================================================================

@router.get("/{item_id}", response_model=PackageResponse)
async def get_item(
    item_id: str,
    service: PackageService = Depends(get_service)
) -> PackageResponse:
    """
    Get an item by ID.
    
    Args:
        item_id: The unique identifier of the item
        
    Returns:
        The item data
        
    Raises:
        HTTPException: If item not found
    """
    result = await service.get_item(item_id)
    if not result.success:
        raise HTTPException(status_code=404, detail=result.error)
    return result


@router.post("/", response_model=PackageResponse)
async def create_item(
    request: PackageRequest,
    service: PackageService = Depends(get_service)
) -> PackageResponse:
    """
    Create a new item.
    
    Args:
        request: The item data to create
        
    Returns:
        The created item with ID
        
    Raises:
        HTTPException: If creation fails
    """
    try:
        return await service.create_item(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{item_id}", response_model=PackageResponse)
async def update_item(
    item_id: str,
    request: PackageRequest,
    service: PackageService = Depends(get_service)
) -> PackageResponse:
    """
    Update an existing item.
    
    Args:
        item_id: The ID of the item to update
        request: The updated item data
        
    Returns:
        The updated item
        
    Raises:
        HTTPException: If item not found or update fails
    """
    result = await service.update_item(item_id, request)
    if not result.success:
        raise HTTPException(status_code=404, detail=result.error)
    return result


@router.delete("/{item_id}")
async def delete_item(
    item_id: str,
    service: PackageService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Delete an item.
    
    Args:
        item_id: The ID of the item to delete
        
    Returns:
        Success confirmation
        
    Raises:
        HTTPException: If item not found
    """
    result = await service.delete_item(item_id)
    if not result:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True, "message": f"Item {item_id} deleted"}
