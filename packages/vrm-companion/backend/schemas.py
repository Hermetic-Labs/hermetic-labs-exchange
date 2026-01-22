"""
VRM Companion Backend Schemas

Pydantic models for avatar management, lip sync, and EVE Core integration.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum
from datetime import datetime


# ============================================================================
# Enums
# ============================================================================

class RepresentationType(str, Enum):
    """EVE Core representation type"""
    SPHERE = "sphere"
    VRM_COMPANION = "vrm-companion"


class LipSyncMode(str, Enum):
    """Lip sync mode"""
    PHONEME = "phoneme"
    AMPLITUDE = "amplitude"
    IDLE = "idle"


class ModelType(str, Enum):
    """3D model type"""
    VRM = "vrm"
    FBX = "fbx"
    GLB = "glb"
    GLTF = "gltf"


# ============================================================================
# Avatar Schemas
# ============================================================================

class AvatarModel(BaseModel):
    """Avatar model info"""
    name: str = Field(..., description="Display name")
    url: str = Field(..., description="URL to model file")
    type: ModelType = Field(..., description="Model file type")
    thumbnail: Optional[str] = Field(None, description="Thumbnail URL")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class AvatarLoadRequest(BaseModel):
    """Request to load an avatar"""
    url: str = Field(..., description="URL of avatar to load")
    model_type: Optional[ModelType] = Field(None, description="Model type (auto-detected if not provided)")


class AvatarLoadResponse(BaseModel):
    """Response from loading avatar"""
    success: bool
    model: Optional[AvatarModel] = None
    error: Optional[str] = None


# ============================================================================
# Lip Sync Schemas
# ============================================================================

class LipSyncConfig(BaseModel):
    """Lip sync configuration"""
    smoothing: float = Field(0.3, ge=0, le=1, description="Smoothing factor")
    gain: float = Field(2.0, ge=0, le=10, description="Amplitude gain")
    max_mouth_open: float = Field(0.8, ge=0, le=1, description="Maximum mouth opening")
    amplitude_mode: bool = Field(False, description="Use amplitude mode")
    phoneme_mode: bool = Field(True, description="Use phoneme mode")


class PhonemeEvent(BaseModel):
    """Phoneme event for lip sync"""
    phoneme: str = Field(..., description="Phoneme string")
    viseme: str = Field(..., description="Target viseme")
    start_time: float = Field(..., description="Start time in seconds")
    duration: float = Field(..., description="Duration in seconds")


class PhonemeRequest(BaseModel):
    """Request to generate phonemes from text"""
    text: str = Field(..., description="Text to convert to phonemes")


class PhonemeResponse(BaseModel):
    """Response with generated phonemes"""
    text: str
    phonemes: str
    message: str


# ============================================================================
# EVE Core Integration Schemas
# ============================================================================

class EveCoreIntegrationConfig(BaseModel):
    """Configuration for EVE Core integration"""
    auto_replace_sphere: bool = Field(False, description="Auto-swap on registration")
    default_avatar_url: Optional[str] = Field(None, description="Default avatar URL")
    enable_companion_button: bool = Field(True, description="Show companion button")
    button_position: str = Field("top-right", description="Button position")


class RegisterCompanionRequest(BaseModel):
    """Request to register companion with EVE Core"""
    component_id: str = Field("vrm-companion", description="Component ID")
    config: EveCoreIntegrationConfig = Field(default_factory=EveCoreIntegrationConfig)


class RegisterCompanionResponse(BaseModel):
    """Response from registration"""
    success: bool
    registered: bool
    message: str


class SwapRepresentationRequest(BaseModel):
    """Request to swap EVE Core representation"""
    representation: RepresentationType = Field(..., description="Target representation")
    avatar_url: Optional[str] = Field(None, description="Avatar URL if swapping to companion")


class SwapRepresentationResponse(BaseModel):
    """Response from swap"""
    success: bool
    current_representation: RepresentationType
    message: str


class CompanionButtonState(BaseModel):
    """State of companion button in EVE Core"""
    view_id: str = "eve-core"
    is_visible: bool = False
    is_enabled: bool = False
    current_representation: RepresentationType = RepresentationType.SPHERE


# ============================================================================
# Capability Schemas
# ============================================================================

class CompanionCapabilities(BaseModel):
    """Companion capabilities info"""
    avatar_loading: bool = True
    lip_sync: bool = True
    phoneme_driven: bool = True
    amplitude_mode: bool = True
    vr_ready: bool = False
    eve_core_integration: bool = True


class CapabilityResponse(BaseModel):
    """Response with capabilities"""
    is_available: bool = True
    capabilities: CompanionCapabilities
    vr_engine_installed: bool = False
    eve_core_available: bool = False


# ============================================================================
# Status Schemas
# ============================================================================

class CompanionStatus(BaseModel):
    """Overall companion status"""
    status: str = "online"
    module: str = "vrm-companion"
    version: str = "1.0.0"
    registered_with_eve_core: bool = False
    current_representation: RepresentationType = RepresentationType.SPHERE
    current_avatar_url: Optional[str] = None
    capabilities: CompanionCapabilities = Field(default_factory=CompanionCapabilities)
