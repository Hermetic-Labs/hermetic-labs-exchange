"""
Developer Portal - Backend Module
EVE-OS Marketplace Package

This __init__.py exports the FastAPI router and service class.
When your package is installed, EVE OS imports from here to mount your routes.

Usage in main app:
    from packages.dev_portal.backend import router
    app.include_router(router)
"""

from .routes import router
from .service import DevPortalService
from .schemas import (
    PackageGenerateRequest,
    PackageGenerateResponse,
    RemixElementSchema,
    GeneratedFileSchema,
)

__all__ = [
    'router',
    'DevPortalService',
    'PackageGenerateRequest',
    'PackageGenerateResponse',
    'RemixElementSchema',
    'GeneratedFileSchema',
]
