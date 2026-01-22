"""
Package Name - Pydantic Schemas

Define request/response models for your API endpoints.
These schemas:
- Validate incoming request data
- Document the API in OpenAPI/Swagger
- Provide type hints for your service methods

Best Practices:
- Use Optional for nullable fields
- Add Field() for validation and documentation
- Create both Request and Response models
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================================================
# Base Models
# ============================================================================

class PackageBase(BaseModel):
    """Base model with common fields."""
    
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="The name of the item"
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional description"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional metadata"
    )


# ============================================================================
# Request Models
# ============================================================================

class PackageRequest(PackageBase):
    """Request model for creating/updating items."""
    
    # Add request-specific fields here
    options: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional configuration options"
    )


# ============================================================================
# Response Models
# ============================================================================

class PackageResponse(BaseModel):
    """Standard response model for API operations."""
    
    success: bool = Field(
        ...,
        description="Whether the operation succeeded"
    )
    data: Optional[Dict[str, Any]] = Field(
        None,
        description="Response data on success"
    )
    error: Optional[str] = Field(
        None,
        description="Error message on failure"
    )
    
    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {"id": "123", "name": "Example"},
                "error": None
            }
        }


class StatusResponse(BaseModel):
    """Response for status/health check endpoints."""
    
    status: str = Field(
        ...,
        description="Current status (ok, degraded, error)"
    )
    version: str = Field(
        ...,
        description="Package version"
    )
    uptime_seconds: Optional[float] = Field(
        None,
        description="Uptime in seconds"
    )
    details: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional status details"
    )


# ============================================================================
# List/Pagination Models
# ============================================================================

class PaginatedResponse(BaseModel):
    """Response model for paginated list endpoints."""
    
    success: bool = True
    items: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of items"
    )
    total: int = Field(
        ...,
        description="Total number of items"
    )
    page: int = Field(
        1,
        description="Current page number"
    )
    per_page: int = Field(
        20,
        description="Items per page"
    )
    total_pages: int = Field(
        1,
        description="Total number of pages"
    )
