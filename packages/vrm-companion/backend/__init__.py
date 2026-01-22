"""
EVE OS VRM Companion Component

3D VRM avatar companion component that provides:
- VRM 1.0 avatar loading and rendering
- Phoneme and amplitude-driven lip sync
- EVE Core integration (swap sphere with VRM character)
- VR-ready when vr-spatial-engine is installed

This is a COMPONENT type package that injects avatar capabilities
into EVE Core, allowing users to replace the sphere with a full character.
"""

from .routes import router as vrm_companion_router
from .service import VRMCompanionService, get_companion_service
from .schemas import (
    RepresentationType,
    LipSyncMode,
    ModelType,
    AvatarModel,
    LipSyncConfig,
    PhonemeEvent,
    PhonemeRequest,
    PhonemeResponse,
    EveCoreIntegrationConfig,
    RegisterCompanionRequest,
    RegisterCompanionResponse,
    SwapRepresentationRequest,
    SwapRepresentationResponse,
    CompanionButtonState,
    CompanionCapabilities,
    CapabilityResponse,
    CompanionStatus,
)

__all__ = [
    # Router
    "vrm_companion_router",
    # Service
    "VRMCompanionService",
    "get_companion_service",
    # Enums
    "RepresentationType",
    "LipSyncMode",
    "ModelType",
    # Schemas
    "AvatarModel",
    "LipSyncConfig",
    "PhonemeEvent",
    "PhonemeRequest",
    "PhonemeResponse",
    "EveCoreIntegrationConfig",
    "RegisterCompanionRequest",
    "RegisterCompanionResponse",
    "SwapRepresentationRequest",
    "SwapRepresentationResponse",
    "CompanionButtonState",
    "CompanionCapabilities",
    "CapabilityResponse",
    "CompanionStatus",
]
