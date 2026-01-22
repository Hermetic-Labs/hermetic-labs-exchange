"""
VR Spatial Engine - Backend Routes
Handles VR session management and spatial data persistence
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from .schemas import (
    VRSessionRequest,
    VRSessionResponse,
    SpatialAnchorRequest,
    SpatialAnchorResponse,
    VRCapabilityInfo
)
from .service import VRSpatialService

router = APIRouter(prefix="/vr", tags=["vr-spatial"])


def get_vr_service() -> VRSpatialService:
    return VRSpatialService()


@router.get("/capabilities", response_model=VRCapabilityInfo)
async def get_vr_capabilities() -> VRCapabilityInfo:
    """Get VR component capabilities for EVE Core integration."""
    return VRCapabilityInfo(
        id="vr-spatial-engine",
        name="VR Spatial Engine",
        version="1.0.0",
        component_type="component",
        capabilities=["webxr", "spatial-tracking", "hand-tracking", "scene-rendering"],
        compatible_views=["eve-core", "vrm-companion", "chat", "workspace"]
    )


@router.post("/session", response_model=VRSessionResponse)
async def create_vr_session(
    request: VRSessionRequest,
    service: VRSpatialService = Depends(get_vr_service)
) -> VRSessionResponse:
    """Create a new VR session for a view."""
    try:
        return await service.create_session(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/session/{session_id}")
async def end_vr_session(
    session_id: str,
    service: VRSpatialService = Depends(get_vr_service)
) -> Dict[str, Any]:
    """End an active VR session."""
    try:
        await service.end_session(session_id)
        return {"success": True, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/session/{session_id}", response_model=VRSessionResponse)
async def get_vr_session(
    session_id: str,
    service: VRSpatialService = Depends(get_vr_service)
) -> VRSessionResponse:
    """Get VR session status."""
    session = await service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/anchors", response_model=SpatialAnchorResponse)
async def create_spatial_anchor(
    request: SpatialAnchorRequest,
    service: VRSpatialService = Depends(get_vr_service)
) -> SpatialAnchorResponse:
    """Create a spatial anchor for persistent VR positioning."""
    try:
        return await service.create_anchor(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/anchors/{session_id}", response_model=List[SpatialAnchorResponse])
async def get_session_anchors(
    session_id: str,
    service: VRSpatialService = Depends(get_vr_service)
) -> List[SpatialAnchorResponse]:
    """Get all spatial anchors for a session."""
    return await service.get_anchors(session_id)


@router.delete("/anchors/{anchor_id}")
async def delete_spatial_anchor(
    anchor_id: str,
    service: VRSpatialService = Depends(get_vr_service)
) -> Dict[str, Any]:
    """Delete a spatial anchor."""
    await service.delete_anchor(anchor_id)
    return {"success": True, "anchor_id": anchor_id}
