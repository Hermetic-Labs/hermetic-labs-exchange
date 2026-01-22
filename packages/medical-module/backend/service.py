"""
Medical Record Service

Handles storage, retrieval, and sync of medical records.
Local-first architecture with hospital server as sync target.
"""

import hashlib
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import MedicalRecord, AuditEntry, SyncResponse, RecordQueryParams
from .models import MedicalRecordModel, AuditLogModel, StationModel

logger = logging.getLogger(__name__)


class MedicalRecordService:
    """
    Service for managing medical records with local-first sync.

    Architecture:
    - Records arrive from bedside/station devices
    - Verified by checksum for integrity
    - Stored in local database
    - Audit trail maintained for HIPAA
    - Conflicts resolved with server-wins strategy
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def sync_records(
        self,
        records: List[MedicalRecord],
        station_id: str,
        client_ip: Optional[str] = None
    ) -> SyncResponse:
        """
        Sync a batch of records from a station.

        Args:
            records: List of medical records to sync
            station_id: ID of the sending station
            client_ip: Client IP for audit logging

        Returns:
            SyncResponse with counts and any conflicts
        """
        synced = 0
        failed = 0
        conflicts: List[str] = []
        errors: List[Dict[str, str]] = []
        timestamp = datetime.utcnow().isoformat()

        for record in records:
            try:
                # Verify checksum
                if not self._verify_checksum(record):
                    errors.append({
                        "id": record.id,
                        "error": "Checksum mismatch - data integrity error"
                    })
                    failed += 1
                    continue

                # Check for existing record (conflict detection)
                existing = await self._get_record_by_id(record.id)

                if existing:
                    # Conflict resolution: server wins if newer
                    if existing.server_timestamp and existing.server_timestamp > record.timestamp:
                        conflicts.append(record.id)
                        logger.info(f"Conflict detected for record {record.id}, server version retained")
                        continue
                    else:
                        # Update existing
                        await self._update_record(existing, record)
                else:
                    # Create new record
                    await self._create_record(record)

                # Log the sync
                await self._log_audit(
                    action="sync",
                    record_id=record.id,
                    record_type=record.type,
                    user_id=record.created_by,
                    station_id=station_id,
                    details=f"Record synced from station {station_id}",
                    ip_address=client_ip
                )

                synced += 1

            except Exception as e:
                logger.error(f"Failed to sync record {record.id}: {e}")
                errors.append({
                    "id": record.id,
                    "error": str(e)
                })
                failed += 1

        # Commit all changes
        await self.db.commit()

        # Generate sync token for next sync
        sync_token = self._generate_sync_token(station_id, timestamp)

        logger.info(
            f"Sync from {station_id}: {synced} synced, {failed} failed, {len(conflicts)} conflicts"
        )

        return SyncResponse(
            success=failed == 0,
            synced_count=synced,
            failed_count=failed,
            timestamp=timestamp,
            sync_token=sync_token,
            conflicts=conflicts,
            errors=errors
        )

    async def get_records(
        self,
        params: RecordQueryParams
    ) -> List[MedicalRecordModel]:
        """
        Query records with filters.

        Args:
            params: Query parameters

        Returns:
            List of matching records
        """
        query = select(MedicalRecordModel)

        conditions = []
        if params.type:
            conditions.append(MedicalRecordModel.type == params.type)
        if params.patient_id:
            conditions.append(MedicalRecordModel.patient_id == params.patient_id)
        if params.station_id:
            conditions.append(MedicalRecordModel.station_id == params.station_id)
        if params.start_date:
            conditions.append(MedicalRecordModel.timestamp >= params.start_date)
        if params.end_date:
            conditions.append(MedicalRecordModel.timestamp <= params.end_date)

        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(MedicalRecordModel.timestamp.desc())
        query = query.offset(params.offset).limit(params.limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_record_by_id(self, record_id: str) -> Optional[MedicalRecordModel]:
        """Get a single record by ID."""
        return await self._get_record_by_id(record_id)

    async def get_audit_log(
        self,
        record_id: Optional[str] = None,
        station_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> List[AuditLogModel]:
        """
        Get audit log entries with optional filters.

        Returns:
            List of audit entries
        """
        query = select(AuditLogModel)

        conditions = []
        if record_id:
            conditions.append(AuditLogModel.record_id == record_id)
        if station_id:
            conditions.append(AuditLogModel.station_id == station_id)
        if start_date:
            conditions.append(AuditLogModel.timestamp >= start_date)
        if end_date:
            conditions.append(AuditLogModel.timestamp <= end_date)

        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(AuditLogModel.timestamp.desc()).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def register_station(
        self,
        station_id: str,
        station_type: str,
        location: str,
        capabilities: List[str],
        ip_address: Optional[str] = None
    ) -> StationModel:
        """
        Register or update a station.

        Args:
            station_id: Unique station identifier
            station_type: Type of station (bedside, nurse_station, etc.)
            location: Physical location
            capabilities: List of capabilities
            ip_address: Network address

        Returns:
            Station model
        """
        existing = await self._get_station(station_id)

        if existing:
            existing.station_type = station_type
            existing.location = location
            existing.capabilities = capabilities
            existing.ip_address = ip_address
            existing.last_heartbeat = datetime.utcnow().isoformat()
            await self.db.commit()
            return existing

        station = StationModel(
            station_id=station_id,
            station_type=station_type,
            location=location,
            capabilities=capabilities,
            ip_address=ip_address,
            online=True,
            last_heartbeat=datetime.utcnow().isoformat(),
            created_at=datetime.utcnow().isoformat()
        )
        self.db.add(station)
        await self.db.commit()

        await self._log_audit(
            action="create",
            record_id=station_id,
            record_type="audit_log",
            user_id="system",
            station_id=station_id,
            details=f"Station registered: {station_type} at {location}",
            ip_address=ip_address
        )

        return station

    async def update_station_heartbeat(self, station_id: str) -> bool:
        """Update station heartbeat timestamp."""
        station = await self._get_station(station_id)
        if station:
            station.last_heartbeat = datetime.utcnow().isoformat()
            station.online = True
            await self.db.commit()
            return True
        return False

    async def get_station_status(self, station_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a station."""
        station = await self._get_station(station_id)
        if not station:
            return None

        # Count pending records from this station
        query = select(MedicalRecordModel).where(
            and_(
                MedicalRecordModel.station_id == station_id,
                MedicalRecordModel.sync_status != "synced"
            )
        )
        result = await self.db.execute(query)
        pending = len(result.scalars().all())

        return {
            "station_id": station.station_id,
            "online": station.online,
            "last_sync": station.last_sync,
            "pending_records": pending,
            "last_heartbeat": station.last_heartbeat
        }

    # ============================================================================
    # Private Methods
    # ============================================================================

    async def _get_record_by_id(self, record_id: str) -> Optional[MedicalRecordModel]:
        """Get record from database by ID."""
        query = select(MedicalRecordModel).where(
            MedicalRecordModel.id == record_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _create_record(self, record: MedicalRecord) -> MedicalRecordModel:
        """Create a new record in the database."""
        model = MedicalRecordModel(
            id=record.id,
            type=record.type,
            patient_id=record.patient_id,
            device_id=record.device_id,
            station_id=record.station_id,
            data=record.data,
            timestamp=record.timestamp,
            created_by=record.created_by,
            sync_status="synced",
            sync_attempts=record.sync_attempts + 1,
            last_sync_attempt=datetime.utcnow().isoformat(),
            server_timestamp=datetime.utcnow().isoformat(),
            checksum=record.checksum
        )
        self.db.add(model)
        return model

    async def _update_record(
        self,
        existing: MedicalRecordModel,
        record: MedicalRecord
    ) -> MedicalRecordModel:
        """Update an existing record."""
        existing.data = record.data
        existing.sync_status = "synced"
        existing.sync_attempts = record.sync_attempts + 1
        existing.last_sync_attempt = datetime.utcnow().isoformat()
        existing.server_timestamp = datetime.utcnow().isoformat()
        existing.checksum = record.checksum
        return existing

    async def _get_station(self, station_id: str) -> Optional[StationModel]:
        """Get station by ID."""
        query = select(StationModel).where(StationModel.station_id == station_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _log_audit(
        self,
        action: str,
        record_id: str,
        record_type: str,
        user_id: str,
        station_id: str,
        details: str,
        ip_address: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> None:
        """Log an audit entry."""
        entry = AuditLogModel(
            id=self._generate_id(),
            action=action,
            record_id=record_id,
            record_type=record_type,
            user_id=user_id,
            station_id=station_id,
            timestamp=datetime.utcnow().isoformat(),
            details=details,
            ip_address=ip_address,
            success=success,
            error_message=error_message
        )
        self.db.add(entry)

    def _verify_checksum(self, record: MedicalRecord) -> bool:
        """Verify record data integrity via checksum."""
        calculated = self._calculate_checksum(record.data)
        return calculated == record.checksum

    def _calculate_checksum(self, data: Dict[str, Any]) -> str:
        """Calculate checksum for data integrity verification."""
        import json
        data_str = json.dumps(data, sort_keys=True)
        hash_int = 0
        for char in data_str:
            hash_int = ((hash_int << 5) - hash_int) + ord(char)
            hash_int = hash_int & 0xFFFFFFFF  # Keep as 32-bit
        return format(hash_int, 'x')

    def _generate_sync_token(self, station_id: str, timestamp: str) -> str:
        """Generate a sync token for the next sync."""
        data = f"{station_id}:{timestamp}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]

    def _generate_id(self) -> str:
        """Generate a unique ID."""
        import time
        import random
        timestamp = format(int(time.time() * 1000), 'x')
        random_part = format(random.randint(0, 0xFFFFFF), 'x')
        return f"{timestamp}-{random_part}"
