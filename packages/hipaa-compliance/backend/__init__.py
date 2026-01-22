"""
HIPAA Privacy Suite - Backend Module
EVE-OS Marketplace Package
"""

from .routes import router
from .service import HIPAAService

__all__ = ['router', 'HIPAAService']
