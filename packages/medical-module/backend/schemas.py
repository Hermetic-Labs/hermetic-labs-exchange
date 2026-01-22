"""
Medical Data Schemas

Pydantic models for medical record sync and storage.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field


# Record types matching frontend
MedicalRecordType = Literal[
    'vitals',
    'alert',
    'medication',
    'procedure',
    'note',
    'device_reading',
    'fall_detection',
    'triage',
    'audit_log'
]

SyncStatus = Literal['pending', 'syncing', 'synced', 'failed', 'conflict']


class MedicalRecord(BaseModel):
    """Medical record from bedside/station devices."""
    id: str
    type: MedicalRecordType
    patient_id: Optional[str] = Field(None, alias="patientId")
    device_id: Optional[str] = Field(None, alias="deviceId")
    station_id: str = Field(..., alias="stationId")
    data: Dict[str, Any]
    timestamp: str
    created_by: str = Field(..., alias="createdBy")
    sync_status: SyncStatus = Field("pending", alias="syncStatus")
    sync_attempts: int = Field(0, alias="syncAttempts")
    last_sync_attempt: Optional[str] = Field(None, alias="lastSyncAttempt")
    server_timestamp: Optional[str] = Field(None, alias="serverTimestamp")
    checksum: str

    class Config:
        populate_by_name = True


class AuditEntry(BaseModel):
    """Audit log entry for HIPAA compliance."""
    id: str
    action: Literal['create', 'read', 'update', 'delete', 'sync', 'export']
    record_id: str = Field(..., alias="recordId")
    record_type: MedicalRecordType = Field(..., alias="recordType")
    user_id: str = Field(..., alias="userId")
    station_id: str = Field(..., alias="stationId")
    timestamp: str
    details: str
    ip_address: Optional[str] = Field(None, alias="ipAddress")
    success: bool = True
    error_message: Optional[str] = Field(None, alias="errorMessage")

    class Config:
        populate_by_name = True


class SyncRequest(BaseModel):
    """Request to sync a batch of records."""
    records: List[MedicalRecord]
    station_id: str = Field(..., alias="stationId")
    sync_token: Optional[str] = Field(None, alias="syncToken")


class SyncResponse(BaseModel):
    """Response after sync operation."""
    success: bool
    synced_count: int = Field(..., alias="syncedCount")
    failed_count: int = Field(0, alias="failedCount")
    timestamp: str
    sync_token: str = Field(..., alias="syncToken")
    conflicts: List[str] = Field(default_factory=list)
    errors: List[Dict[str, str]] = Field(default_factory=list)


class RecordQueryParams(BaseModel):
    """Query parameters for fetching records."""
    type: Optional[MedicalRecordType] = None
    patient_id: Optional[str] = None
    station_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: int = Field(100, ge=1, le=1000)
    offset: int = Field(0, ge=0)


class StationRegistration(BaseModel):
    """Register a bedside/nurse station with the server."""
    station_id: str = Field(..., alias="stationId")
    station_type: Literal['bedside', 'nurse_station', 'doctor_station', 'admin']
    location: str
    capabilities: List[str] = Field(default_factory=list)
    ip_address: Optional[str] = Field(None, alias="ipAddress")


class StationStatus(BaseModel):
    """Station status report."""
    station_id: str = Field(..., alias="stationId")
    online: bool
    last_sync: Optional[str] = Field(None, alias="lastSync")
    pending_records: int = Field(0, alias="pendingRecords")
    last_heartbeat: str = Field(..., alias="lastHeartbeat")
