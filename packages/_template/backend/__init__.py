"""
Package Name - Backend Module
EVE-OS Marketplace Package

This __init__.py exports the FastAPI router and service class.
When your package is installed, EVE OS imports from here to mount your routes.

Usage in main app:
    from packages.package_name.backend import router
    app.include_router(router)
"""

from .routes import router
from .service import PackageService
from .schemas import (
    PackageRequest,
    PackageResponse,
)

__all__ = [
    'router',
    'PackageService',
    'PackageRequest',
    'PackageResponse',
]
