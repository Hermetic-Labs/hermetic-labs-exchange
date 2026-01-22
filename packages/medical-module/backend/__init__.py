"""
EVE OS Medical Module

Local-first medical data management with hospital server sync.
Provides HIPAA-compliant data storage and audit logging.

Features:
- Local-first IndexedDB storage on bedside devices
- Server sync with conflict resolution
- WebSocket real-time alerts (fall detection, bed exit)
- Video chat between rooms and nurse stations
- Call queue with overflow to other stations
- HIPAA-compliant audit logging
"""

from .routes import router as medical_router
from .schemas import MedicalRecord, AuditEntry, SyncRequest, SyncResponse
from .service import MedicalRecordService
from .websocket import medical_ws_manager, MedicalWebSocketManager

__all__ = [
    "medical_router",
    "MedicalRecord",
    "AuditEntry",
    "SyncRequest",
    "SyncResponse",
    "MedicalRecordService",
    "medical_ws_manager",
    "MedicalWebSocketManager"
]
