"""
VR Spatial Engine - Service Layer
Business logic for VR session and spatial anchor management
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional
from .schemas import (
    VRSessionRequest,
    VRSessionResponse,
    SpatialAnchorRequest,
    SpatialAnchorResponse,
    SessionStatus,
    Quaternion
)


class VRSpatialService:
    """
    Service for managing VR sessions and spatial anchors.
    In production, this would persist to a database.
    """
    
    # In-memory storage (replace with DB in production)
    _sessions: Dict[str, VRSessionResponse] = {}
    _anchors: Dict[str, SpatialAnchorResponse] = {}
    
    async def create_session(
        self, 
        request: VRSessionRequest
    ) -> VRSessionResponse:
        """Create a new VR session."""
        session_id = f"vr_session_{uuid.uuid4().hex[:12]}"
        
        session = VRSessionResponse(
            session_id=session_id,
            view_id=request.view_id,
            mode=request.mode,
            status=SessionStatus.ACTIVE,
            created_at=datetime.utcnow(),
            features=request.features or [
                "local-floor",
                "hand-tracking"
            ]
        )
        
        self._sessions[session_id] = session
        return session
    
    async def get_session(
        self, 
        session_id: str
    ) -> Optional[VRSessionResponse]:
        """Get a VR session by ID."""
        return self._sessions.get(session_id)
    
    async def end_session(self, session_id: str) -> bool:
        """End a VR session."""
        if session_id not in self._sessions:
            return False
        
        session = self._sessions[session_id]
        session.status = SessionStatus.ENDED
        
        # Clean up anchors for this session
        anchors_to_remove = [
            aid for aid, anchor in self._anchors.items()
            if anchor.session_id == session_id and not anchor.persistent
        ]
        for aid in anchors_to_remove:
            del self._anchors[aid]
        
        return True
    
    async def create_anchor(
        self, 
        request: SpatialAnchorRequest
    ) -> SpatialAnchorResponse:
        """Create a spatial anchor."""
        anchor_id = f"anchor_{uuid.uuid4().hex[:12]}"
        
        anchor = SpatialAnchorResponse(
            anchor_id=anchor_id,
            session_id=request.session_id,
            name=request.name,
            position=request.position,
            rotation=request.rotation or Quaternion(),
            created_at=datetime.utcnow(),
            persistent=False
        )
        
        self._anchors[anchor_id] = anchor
        return anchor
    
    async def get_anchors(
        self, 
        session_id: str
    ) -> List[SpatialAnchorResponse]:
        """Get all anchors for a session."""
        return [
            anchor for anchor in self._anchors.values()
            if anchor.session_id == session_id
        ]
    
    async def delete_anchor(self, anchor_id: str) -> bool:
        """Delete a spatial anchor."""
        if anchor_id in self._anchors:
            del self._anchors[anchor_id]
            return True
        return False
