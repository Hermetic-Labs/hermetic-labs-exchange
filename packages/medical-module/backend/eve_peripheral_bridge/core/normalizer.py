"""Data normalization for Eve ingestion."""
from __future__ import annotations
import json
import logging
from datetime import datetime
from typing import Any

from .types import DataPacket, DeviceInfo

log = logging.getLogger(__name__)


class DataNormalizer:
    """
    Transforms raw device data into Eve-ingestible format.
    
    Output schema is designed for vector store / knowledge graph ingestion.
    """
    
    def __init__(self):
        self._parsers: dict[str, callable] = {}
    
    def register_parser(self, capability_pattern: str, parser: callable) -> None:
        """
        Register a parser for specific capability types.
        
        Parser signature: (raw: bytes) -> dict[str, Any]
        """
        self._parsers[capability_pattern] = parser
    
    def normalize(self, packet: DataPacket, device: DeviceInfo) -> dict[str, Any]:
        """
        Normalize a data packet to Eve schema.
        
        Returns a dict ready for vector store / cartification.
        """
        # Try to parse raw data
        parsed = packet.parsed
        if parsed is None:
            parsed = self._try_parse(packet)
        
        return {
            "type": "peripheral_data",
            "version": "1.0",
            "timestamp": packet.timestamp.isoformat(),
            "device": {
                "id": device.id,
                "name": device.name,
                "protocol": device.protocol.name,
                "manufacturer": device.manufacturer,
            },
            "capability": {
                "id": packet.capability_id,
                "name": self._get_capability_name(device, packet.capability_id),
            },
            "data": {
                "raw_hex": packet.raw.hex() if packet.raw else None,
                "raw_length": len(packet.raw) if packet.raw else 0,
                "parsed": parsed,
            },
            "metadata": {
                "protocol": packet.protocol.name,
            }
        }
    
    def _try_parse(self, packet: DataPacket) -> dict[str, Any] | None:
        """Attempt to parse raw bytes using registered parsers."""
        for pattern, parser in self._parsers.items():
            if pattern in packet.capability_id:
                try:
                    return parser(packet.raw)
                except Exception as e:
                    log.debug(f"Parser {pattern} failed: {e}")
        
        # Fallback: try common formats
        return self._generic_parse(packet.raw)
    
    def _generic_parse(self, raw: bytes) -> dict[str, Any] | None:
        """Generic parsing for common data patterns."""
        if not raw:
            return None
        
        result = {}
        
        # Try UTF-8 string
        try:
            text = raw.decode("utf-8")
            if text.isprintable():
                result["text"] = text
                # Try JSON
                try:
                    result["json"] = json.loads(text)
                except:
                    pass
        except:
            pass
        
        # Numeric interpretations (common for sensor data)
        if len(raw) == 1:
            result["uint8"] = raw[0]
            result["int8"] = int.from_bytes(raw, "little", signed=True)
        elif len(raw) == 2:
            result["uint16_le"] = int.from_bytes(raw, "little", signed=False)
            result["int16_le"] = int.from_bytes(raw, "little", signed=True)
        elif len(raw) == 4:
            result["uint32_le"] = int.from_bytes(raw, "little", signed=False)
            result["float32"] = self._try_float(raw)
        
        return result if result else None
    
    def _try_float(self, raw: bytes) -> float | None:
        """Try to interpret bytes as float."""
        import struct
        try:
            return struct.unpack("<f", raw)[0]
        except:
            return None
    
    def _get_capability_name(self, device: DeviceInfo, cap_id: str) -> str | None:
        """Look up capability name from device info."""
        for cap in device.capabilities:
            if cap.id == cap_id:
                return cap.name
        return None
    
    def to_json(self, packet: DataPacket, device: DeviceInfo) -> str:
        """Normalize and serialize to JSON."""
        return json.dumps(self.normalize(packet, device), indent=2)
    
    def batch_normalize(
        self, packets: list[tuple[DataPacket, DeviceInfo]]
    ) -> list[dict[str, Any]]:
        """Normalize multiple packets."""
        return [self.normalize(p, d) for p, d in packets]
