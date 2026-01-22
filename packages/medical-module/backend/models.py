"""
Medical Data Models

SQLAlchemy models for medical records, audit logs, and stations.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy import Column, String, Boolean, Integer, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column

# Import from main app (absolute import instead of relative escaping package)
from app.db.base import Base


class MedicalRecordModel(Base):
    """
    Medical record storage.

    Stores synced records from bedside/station devices.
    """
    __tablename__ = "medical_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    type: Mapped[str] = mapped_column(String(32), index=True)
    patient_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    station_id: Mapped[str] = mapped_column(String(64), index=True)
    data: Mapped[Dict[str, Any]] = mapped_column(JSON)
    timestamp: Mapped[str] = mapped_column(String(32), index=True)
    created_by: Mapped[str] = mapped_column(String(64))
    sync_status: Mapped[str] = mapped_column(String(16), default="synced")
    sync_attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_sync_attempt: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    server_timestamp: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    checksum: Mapped[str] = mapped_column(String(32))

    def __repr__(self) -> str:
        return f"<MedicalRecord {self.id} ({self.type})>"


class AuditLogModel(Base):
    """
    HIPAA-compliant audit log.

    Tracks all access and modifications to medical records.
    Required for HIPAA compliance (45 CFR 164.312(b)).
    """
    __tablename__ = "medical_audit_log"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    action: Mapped[str] = mapped_column(String(16), index=True)
    record_id: Mapped[str] = mapped_column(String(64), index=True)
    record_type: Mapped[str] = mapped_column(String(32))
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    station_id: Mapped[str] = mapped_column(String(64), index=True)
    timestamp: Mapped[str] = mapped_column(String(32), index=True)
    details: Mapped[str] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<AuditLog {self.id} ({self.action} on {self.record_id})>"


class StationModel(Base):
    """
    Registered bedside/nurse stations.

    Tracks connected stations for sync and monitoring.
    """
    __tablename__ = "medical_stations"

    station_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    station_type: Mapped[str] = mapped_column(String(32))
    location: Mapped[str] = mapped_column(String(128))
    capabilities: Mapped[List[str]] = mapped_column(JSON, default=list)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    online: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    last_heartbeat: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[str] = mapped_column(String(32))

    def __repr__(self) -> str:
        return f"<Station {self.station_id} ({self.station_type})>"
