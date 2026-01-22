"""GATT traffic capture for protocol analysis."""
from __future__ import annotations
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any

from ..core.types import DataPacket, Protocol
from ..adapters.ble import BLEConnector

log = logging.getLogger(__name__)


class OperationType(Enum):
    """GATT operation types."""
    READ = auto()
    WRITE = auto()
    NOTIFY = auto()
    INDICATE = auto()


@dataclass
class CapturedOperation:
    """Single captured GATT operation."""
    timestamp: datetime
    operation: OperationType
    characteristic: str
    data: bytes
    service: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CaptureSession:
    """Complete capture session."""
    device_id: str
    device_name: str
    start_time: datetime
    end_time: datetime | None = None
    operations: list[CapturedOperation] = field(default_factory=list)
    
    def duration(self) -> float:
        """Session duration in seconds."""
        end = self.end_time or datetime.now()
        return (end - self.start_time).total_seconds()
    
    def filter_by_char(self, char_uuid: str) -> list[CapturedOperation]:
        """Get operations for specific characteristic."""
        return [op for op in self.operations if char_uuid in op.characteristic]
    
    def filter_by_type(self, op_type: OperationType) -> list[CapturedOperation]:
        """Get operations by type."""
        return [op for op in self.operations if op.operation == op_type]


class GATTCapture:
    """
    Captures BLE GATT traffic for protocol analysis.
    
    Usage:
        capture = GATTCapture()
        session = await capture.start(connector)
        # ... interact with device via vendor app ...
        await capture.stop()
        
        # Analyze captured traffic
        for op in session.operations:
            print(f"{op.operation.name}: {op.characteristic} -> {op.data.hex()}")
    """
    
    def __init__(self):
        self._session: CaptureSession | None = None
        self._connector: BLEConnector | None = None
        self._active = False
        self._original_handlers: dict = {}
    
    async def start(
        self,
        connector: BLEConnector,
        characteristics: list[str] | None = None,
    ) -> CaptureSession:
        """
        Start capturing GATT traffic.
        
        Args:
            connector: Active BLE connector
            characteristics: Specific UUIDs to monitor (None = all notifiable)
        
        Returns:
            CaptureSession that will be populated with operations
        """
        if self._active:
            raise RuntimeError("Capture already active")
        
        self._connector = connector
        self._session = CaptureSession(
            device_id=connector.device.id,
            device_name=connector.device.name,
            start_time=datetime.now(),
        )
        
        # Subscribe to notifications
        target_chars = characteristics or [
            cap.id for cap in connector.device.capabilities if cap.notifiable
        ]
        
        for char_uuid in target_chars:
            await connector.subscribe(char_uuid, self._capture_handler)
            log.info(f"Capturing: {char_uuid}")
        
        self._active = True
        log.info(f"Capture started for {connector.device.name}")
        return self._session
    
    async def _capture_handler(self, packet: DataPacket) -> None:
        """Handle captured notification."""
        if not self._session:
            return
        
        op = CapturedOperation(
            timestamp=packet.timestamp,
            operation=OperationType.NOTIFY,
            characteristic=packet.capability_id,
            data=packet.raw,
        )
        self._session.operations.append(op)
        log.debug(f"Captured: {op.characteristic} -> {op.data.hex()}")
    
    def capture_write(self, char_uuid: str, data: bytes) -> None:
        """Manually log a write operation (call before writing)."""
        if not self._session:
            return
        
        op = CapturedOperation(
            timestamp=datetime.now(),
            operation=OperationType.WRITE,
            characteristic=char_uuid,
            data=data,
        )
        self._session.operations.append(op)
    
    def capture_read(self, char_uuid: str, data: bytes) -> None:
        """Manually log a read operation (call after reading)."""
        if not self._session:
            return
        
        op = CapturedOperation(
            timestamp=datetime.now(),
            operation=OperationType.READ,
            characteristic=char_uuid,
            data=data,
        )
        self._session.operations.append(op)
    
    async def stop(self) -> CaptureSession:
        """Stop capture and return completed session."""
        if not self._active or not self._session:
            raise RuntimeError("No active capture")
        
        self._session.end_time = datetime.now()
        self._active = False
        
        # Unsubscribe
        if self._connector:
            for cap in self._connector.device.capabilities:
                if cap.notifiable:
                    await self._connector.unsubscribe(cap.id)
        
        log.info(
            f"Capture complete: {len(self._session.operations)} operations "
            f"in {self._session.duration():.1f}s"
        )
        return self._session
    
    @property
    def session(self) -> CaptureSession | None:
        return self._session
    
    @property
    def is_active(self) -> bool:
        return self._active
