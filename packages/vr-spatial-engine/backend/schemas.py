"""
VR Spatial Engine - Pydantic Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class VRMode(str, Enum):
    IMMERSIVE_VR = "immersive-vr"
    IMMERSIVE_AR = "immersive-ar"
    INLINE = "inline"


class SessionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


# Capability Info
class VRCapabilityInfo(BaseModel):
    id: str
    name: str
    version: str
    component_type: str = "component"
    capabilities: List[str]
    compatible_views: List[str]


# VR Session
class VRSessionRequest(BaseModel):
    view_id: str = Field(..., description="The view requesting VR mode")
    mode: VRMode = VRMode.IMMERSIVE_VR
    features: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class VRSessionResponse(BaseModel):
    session_id: str
    view_id: str
    mode: VRMode
    status: SessionStatus
    created_at: datetime
    features: List[str] = []


# Spatial Anchors
class Vector3(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class Quaternion(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    w: float = 1.0


class SpatialAnchorRequest(BaseModel):
    session_id: str
    name: str
    position: Vector3
    rotation: Optional[Quaternion] = None
    metadata: Optional[Dict[str, Any]] = None


class SpatialAnchorResponse(BaseModel):
    anchor_id: str
    session_id: str
    name: str
    position: Vector3
    rotation: Quaternion
    created_at: datetime
    persistent: bool = False
