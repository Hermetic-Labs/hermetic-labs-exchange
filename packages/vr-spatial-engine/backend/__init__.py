"""
EVE OS VR Spatial Engine Component

Comprehensive VR/XR spatial computing component that injects
VR capabilities into compatible views (EVE Core, VRM Companion, Chat).

Features:
- WebXR session management
- Real-time VR scene generation
- Spatial anchor tracking
- Hand tracking support
- Eye tracking capabilities
- Cross-platform VR/AR/MR support
- Capability injection API
"""

from .routes import router as vr_spatial_router
from .service import VRSpatialService
from .schemas import (
    VRSessionRequest,
    VRSessionResponse,
    SpatialAnchorRequest,
    SpatialAnchorResponse,
    VRCapabilityInfo,
    VRMode,
    SessionStatus,
)

__all__ = [
    "vr_spatial_router",
    "VRSpatialService",
    "VRSessionRequest",
    "VRSessionResponse",
    "SpatialAnchorRequest",
    "SpatialAnchorResponse",
    "VRCapabilityInfo",
    "VRMode",
    "SessionStatus",
]
