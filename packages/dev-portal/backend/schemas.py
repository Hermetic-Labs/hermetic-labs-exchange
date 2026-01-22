"""
Developer Portal - Pydantic Schemas

Define request/response models for the DevPortal API endpoints.
These schemas handle package generation, element management, and remix operations.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# Element Schemas
# ============================================================================

class RemixElementSchema(BaseModel):
    """Schema for a remix element (component, hook, service, etc)."""

    id: str = Field(
        ...,
        description="Unique identifier for the element"
    )
    name: str = Field(
        ...,
        description="Name of the element"
    )
    type: str = Field(
        ...,
        description="Element type: component, hook, service, type, function, constant"
    )
    source_package: str = Field(
        ...,
        alias="sourcePackage",
        description="Package this element was sourced from"
    )
    file_path: Optional[str] = Field(
        None,
        alias="filePath",
        description="Original file path"
    )
    code: Optional[str] = Field(
        None,
        description="Source code of the element"
    )
    dependencies: List[str] = Field(
        default_factory=list,
        description="List of dependency IDs"
    )
    exports: List[str] = Field(
        default_factory=list,
        description="List of exported names"
    )

    class Config:
        populate_by_name = True


# ============================================================================
# Package Generation Schemas
# ============================================================================

class GeneratorOptionsSchema(BaseModel):
    """Options for package generation."""

    package_name: str = Field(
        ...,
        alias="packageName",
        min_length=1,
        max_length=50,
        description="Name for the generated package (kebab-case)"
    )
    display_name: Optional[str] = Field(
        None,
        alias="displayName",
        description="Human-readable display name"
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Package description"
    )
    author: Optional[str] = Field(
        "Remix IDE",
        description="Package author"
    )
    category: Optional[str] = Field(
        "Generated",
        description="Package category"
    )
    icon: Optional[str] = Field(
        None,
        description="Package icon emoji"
    )
    version: Optional[str] = Field(
        "1.0.0",
        description="Package version"
    )
    include_types: Optional[bool] = Field(
        True,
        alias="includeTypes",
        description="Whether to include type definitions"
    )
    generate_readme: Optional[bool] = Field(
        True,
        alias="generateReadme",
        description="Whether to generate README.md"
    )

    class Config:
        populate_by_name = True


class PackageGenerateRequest(BaseModel):
    """Request model for generating a package from remix basket."""

    elements: List[RemixElementSchema] = Field(
        ...,
        min_length=1,
        description="Elements to include in the package"
    )
    options: GeneratorOptionsSchema = Field(
        ...,
        description="Package generation options"
    )


class GeneratedFileSchema(BaseModel):
    """Schema for a generated file."""

    path: str = Field(
        ...,
        description="Relative path within the package"
    )
    content: str = Field(
        ...,
        description="File contents"
    )
    type: str = Field(
        ...,
        description="File type: component, service, hook, type, style, index, manifest, readme"
    )


class PackageManifestSchema(BaseModel):
    """Schema for generated package manifest."""

    schema_ref: str = Field(
        "../_shared/manifest.schema.json",
        alias="$schema"
    )
    name: str
    version: str
    type: str
    display_name: str = Field(alias="displayName")
    description: str
    entry: str
    icon: str
    sidebar: bool
    components: List[str]
    permissions: List[str]
    tags: List[str]
    category: str
    author: str
    license: str
    market_id: str = Field(alias="marketId")
    price: str
    features: List[str]
    dependencies: Dict[str, List[str]]

    class Config:
        populate_by_name = True


class PackageGenerateResponse(BaseModel):
    """Response model for package generation."""

    success: bool = Field(
        ...,
        description="Whether generation succeeded"
    )
    name: str = Field(
        ...,
        description="Generated package name"
    )
    display_name: str = Field(
        ...,
        alias="displayName",
        description="Human-readable name"
    )
    version: str = Field(
        ...,
        description="Package version"
    )
    description: str = Field(
        ...,
        description="Package description"
    )
    files: List[GeneratedFileSchema] = Field(
        default_factory=list,
        description="Generated files"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Generation warnings"
    )
    download_url: Optional[str] = Field(
        None,
        alias="downloadUrl",
        description="URL to download the package as zip"
    )
    error: Optional[str] = Field(
        None,
        description="Error message if generation failed"
    )

    class Config:
        populate_by_name = True


# ============================================================================
# Status Schema
# ============================================================================

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
# Element Registry Schemas
# ============================================================================

class ElementQueryRequest(BaseModel):
    """Request for querying elements."""

    package: Optional[str] = Field(
        None,
        description="Filter by source package"
    )
    type: Optional[str] = Field(
        None,
        description="Filter by element type"
    )
    search: Optional[str] = Field(
        None,
        description="Search term for name"
    )
    limit: int = Field(
        50,
        ge=1,
        le=200,
        description="Maximum results"
    )
    offset: int = Field(
        0,
        ge=0,
        description="Result offset for pagination"
    )


class ElementQueryResponse(BaseModel):
    """Response for element query."""

    success: bool = True
    elements: List[RemixElementSchema] = Field(
        default_factory=list,
        description="Matching elements"
    )
    total: int = Field(
        0,
        description="Total matching elements"
    )
    has_more: bool = Field(
        False,
        alias="hasMore",
        description="Whether more results exist"
    )

    class Config:
        populate_by_name = True
