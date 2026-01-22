"""
FHIR Compliance Suite - Backend Module
EVE-OS Marketplace Package
"""

from .routes import router
from .service import FHIRService

__all__ = ['router', 'FHIRService']
