"""Core type definitions for Eve Peripheral Bridge."""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Awaitable
from datetime import datetime


class Protocol(Enum):
    """Supported communication protocols."""
    BLE = auto()
    WIFI = auto()
    SERIAL = auto()
    USB = auto()
    UNKNOWN = auto()


class DeviceState(Enum):
    """Device connection state."""
    DISCOVERED = auto()
    CONNECTING = auto()
    CONNECTED = auto()
    DISCONNECTED = auto()
    ERROR = auto()


@dataclass
class DeviceCapability:
    """A single capability/characteristic of a device."""
    id: str
    name: str
    readable: bool = False
    writable: bool = False
    notifiable: bool = False
    raw_handle: Any = None  # Protocol-specific handle


@dataclass
class DeviceInfo:
    """Unified device descriptor."""
    id: str                           # Unique identifier (MAC, serial, etc.)
    name: str                         # Human-readable name
    protocol: Protocol                # Communication protocol
    address: str                      # Protocol-specific address
    rssi: int | None = None           # Signal strength (if applicable)
    manufacturer: str | None = None
    capabilities: list[DeviceCapability] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    state: DeviceState = DeviceState.DISCOVERED
    last_seen: datetime = field(default_factory=datetime.now)


@dataclass
class DataPacket:
    """Normalized data packet from any device."""
    device_id: str
    capability_id: str
    timestamp: datetime
    raw: bytes
    parsed: dict[str, Any] | None = None  # Plugin-parsed data
    protocol: Protocol = Protocol.UNKNOWN


@dataclass
class PluginManifest:
    """Descriptor for edge-case device plugins."""
    id: str
    name: str
    vendor: str | None = None
    device_patterns: list[str] = field(default_factory=list)  # Match patterns
    version: str = "1.0.0"


# Type aliases
DataHandler = Callable[[DataPacket], Awaitable[None]]
ConnectionHandler = Callable[[DeviceInfo], Awaitable[None]]
