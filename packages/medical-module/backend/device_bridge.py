"""
Medical Device Bridge

Unified BLE device connectivity using eve_peripheral_bridge.
Replaces ble_scanner.py with a cleaner architecture while maintaining
the same API surface for routes.py.

Architecture:
    Bridge -> BLEAdapter -> BLEConnector -> Device
                                  |
                               Sniffer (for unknown protocols)
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field

from .eve_peripheral_bridge import Bridge
from .eve_peripheral_bridge.core.types import (
    DeviceInfo,
    DataPacket,
    Protocol,
    DeviceCapability,
)
from .eve_peripheral_bridge.sniffer import GATTCapture, ProtocolAnalyzer

logger = logging.getLogger(__name__)


# =============================================================================
# Health Device Classification
# =============================================================================

class HealthServiceUUID:
    """Standard Bluetooth SIG Health Service UUIDs"""
    HEART_RATE = "0000180d-0000-1000-8000-00805f9b34fb"
    BLOOD_PRESSURE = "00001810-0000-1000-8000-00805f9b34fb"
    PULSE_OXIMETER = "00001822-0000-1000-8000-00805f9b34fb"
    HEALTH_THERMOMETER = "00001809-0000-1000-8000-00805f9b34fb"
    GLUCOSE = "00001808-0000-1000-8000-00805f9b34fb"

    # Quintic Corp proprietary (iChoice, etc.)
    QUINTIC_1 = "0000fee8-0000-1000-8000-00805f9b34fb"
    QUINTIC_2 = "0000fee9-0000-1000-8000-00805f9b34fb"


# Quintic notify characteristics for subscribing
QUINTIC_NOTIFY_CHARS = [
    "003784cf-f7e3-55b4-6c4c-9fd140100a16",  # Primary data
    "d44bc439-abfd-45a2-b575-925416129601",  # Data stream 1
    "d44bc439-abfd-45a2-b575-925416129602",  # Data stream 2
    "d44bc439-abfd-45a2-b575-925416129603",  # Data stream 3
    "d44bc439-abfd-45a2-b575-925416129604",  # Data stream 4
    "d44bc439-abfd-45a2-b575-925416129605",  # Data stream 5
    "d44bc439-abfd-45a2-b575-925416129606",  # Data stream 6
    "d44bc439-abfd-45a2-b575-925416129607",  # Data stream 7
]

# Quintic write characteristics for commands
QUINTIC_WRITE_CHARS = [
    "013784cf-f7e3-55b4-6c4c-9fd140100a16",  # Write commands
    "d44bc439-abfd-45a2-b575-925416129600",  # Write commands alt
]

# Known device name patterns
KNOWN_HEALTH_DEVICES = {
    "ichoicer": "pulse_oximeter_quintic",
    "choice": "pulse_oximeter_quintic",
    "oximeter": "pulse_oximeter",
}


def classify_device(device: DeviceInfo) -> str:
    """
    Classify a device as a health device type.

    Returns: Device type string or 'unknown'
    """
    # Check by name first (proprietary devices)
    name_lower = device.name.lower()
    for pattern, device_type in KNOWN_HEALTH_DEVICES.items():
        if pattern in name_lower:
            return device_type

    # Check by service UUIDs
    service_uuids = device.metadata.get("service_uuids", [])
    service_set = set(str(uuid).lower() for uuid in service_uuids)

    if HealthServiceUUID.QUINTIC_1.lower() in service_set or HealthServiceUUID.QUINTIC_2.lower() in service_set:
        return "pulse_oximeter_quintic"
    if HealthServiceUUID.PULSE_OXIMETER.lower() in service_set:
        return "pulse_oximeter"
    if HealthServiceUUID.BLOOD_PRESSURE.lower() in service_set:
        return "blood_pressure"
    if HealthServiceUUID.HEART_RATE.lower() in service_set:
        return "heart_rate"
    if HealthServiceUUID.HEALTH_THERMOMETER.lower() in service_set:
        return "thermometer"
    if HealthServiceUUID.GLUCOSE.lower() in service_set:
        return "glucose"

    return "unknown"


def is_quintic_device(device_type: str) -> bool:
    """Check if device uses Quintic proprietary protocol."""
    return device_type in ("pulse_oximeter_quintic", "quintic_device")


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class DiscoveredDevice:
    """Discovered BLE health device"""
    address: str
    name: str
    rssi: int
    device_type: str
    services: List[str]
    device_info: DeviceInfo  # Bridge's DeviceInfo
    last_seen: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "address": self.address,
            "name": self.name,
            "rssi": self.rssi,
            "deviceType": self.device_type,
            "services": self.services,
            "lastSeen": self.last_seen.isoformat(),
        }


@dataclass
class ConnectedDevice:
    """Actively connected BLE device"""
    address: str
    name: str
    device_type: str
    connector: Any  # BLEConnector from bridge
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_reading: Optional[datetime] = None
    reading_count: int = 0


# =============================================================================
# Medical Device Bridge
# =============================================================================

class MedicalDeviceBridge:
    """
    Medical Device Bridge using eve_peripheral_bridge.

    Provides a unified interface for BLE health device connectivity.
    Handles both standard GATT profiles and proprietary devices (Quintic/iChoice).

    Usage:
        bridge = MedicalDeviceBridge()

        # Discover devices
        devices = await bridge.scan(timeout=10)

        # Connect
        await bridge.connect(device_address)

        # Subscribe to readings
        await bridge.subscribe(device_address, callback)

        # For unknown devices, use sniffer
        capture = await bridge.start_capture(device_address)
        # ... trigger device ...
        analysis = await bridge.analyze_capture()
    """

    def __init__(self):
        self._bridge = Bridge(enable_protocols=[Protocol.BLE])
        self._discovered: Dict[str, DiscoveredDevice] = {}
        self._connected: Dict[str, ConnectedDevice] = {}
        self._callbacks: Dict[str, Callable] = {}
        self._capture_session = None

    @property
    def is_available(self) -> bool:
        """Check if BLE is available."""
        try:
            from bleak import BleakScanner
            return True
        except ImportError:
            return False

    # =========================================================================
    # Discovery
    # =========================================================================

    async def scan(
        self,
        timeout: float = 10.0,
        filter_health_only: bool = True
    ) -> List[DiscoveredDevice]:
        """
        Scan for BLE health devices.

        Args:
            timeout: Scan duration in seconds
            filter_health_only: Only return health devices

        Returns:
            List of discovered devices
        """
        logger.info(f"Starting BLE scan for {timeout}s...")
        self._discovered.clear()

        try:
            devices = await self._bridge.discover(duration=timeout)

            for device_info in devices:
                device_type = classify_device(device_info)

                # Filter non-health if requested
                if filter_health_only and device_type == "unknown":
                    continue

                discovered = DiscoveredDevice(
                    address=device_info.address,
                    name=device_info.name,
                    rssi=device_info.rssi or -100,
                    device_type=device_type,
                    services=device_info.metadata.get("service_uuids", []),
                    device_info=device_info,
                )
                self._discovered[device_info.address] = discovered
                logger.debug(f"Discovered: {discovered.name} ({discovered.address}) - {device_type}")

            result = list(self._discovered.values())
            logger.info(f"BLE scan complete: found {len(result)} health devices")
            return result

        except Exception as e:
            logger.error(f"BLE scan error: {e}")
            return []

    def get_discovered_devices(self) -> List[Dict[str, Any]]:
        """Get list of discovered devices from last scan."""
        return [d.to_dict() for d in self._discovered.values()]

    # =========================================================================
    # Connection
    # =========================================================================

    async def connect(self, address: str) -> bool:
        """
        Connect to a BLE device.

        Args:
            address: Device MAC address

        Returns:
            True if connected successfully
        """
        logger.info(f"Connecting to {address}...")

        if address in self._connected:
            logger.warning(f"Already connected to {address}")
            return True

        discovered = self._discovered.get(address)
        if not discovered:
            logger.error(f"Device {address} not discovered - scan first")
            return False

        try:
            connector = await self._bridge.connect(discovered.device_info)

            if not connector or not connector.is_connected:
                logger.error(f"Failed to connect to {address}")
                return False

            self._connected[address] = ConnectedDevice(
                address=address,
                name=discovered.name,
                device_type=discovered.device_type,
                connector=connector,
            )

            logger.info(f"Connected to {discovered.name} ({address})")
            return True

        except Exception as e:
            logger.error(f"Connection error for {address}: {e}")
            return False

    async def disconnect(self, address: str) -> bool:
        """Disconnect from a device."""
        if address not in self._connected:
            return True

        try:
            await self._bridge.disconnect(address)
            del self._connected[address]
            self._callbacks.pop(address, None)
            logger.info(f"Disconnected from {address}")
            return True
        except Exception as e:
            logger.error(f"Disconnect error: {e}")
            return False

    async def disconnect_all(self) -> None:
        """Disconnect from all devices."""
        await self._bridge.disconnect_all()
        self._connected.clear()
        self._callbacks.clear()

    def get_connected_devices(self) -> List[Dict[str, Any]]:
        """Get list of currently connected devices."""
        return [
            {
                "address": d.address,
                "name": d.name,
                "deviceType": d.device_type,
                "connectedAt": d.connected_at.isoformat(),
                "lastReading": d.last_reading.isoformat() if d.last_reading else None,
                "readingCount": d.reading_count,
            }
            for d in self._connected.values()
        ]

    # =========================================================================
    # Service Discovery
    # =========================================================================

    async def discover_services(self, address: str) -> Dict[str, Any]:
        """
        Discover all services and characteristics on a connected device.

        Returns:
            Dict with services and characteristics
        """
        if address not in self._connected:
            return {"error": "Device not connected"}

        connected = self._connected[address]
        device = connected.connector.device

        result = {
            "address": address,
            "name": connected.name,
            "deviceType": connected.device_type,
            "services": []
        }

        for cap in device.capabilities:
            result["services"].append({
                "uuid": cap.id,
                "name": cap.name,
                "readable": cap.readable,
                "writable": cap.writable,
                "notifiable": cap.notifiable,
            })

        return result

    # =========================================================================
    # Subscriptions
    # =========================================================================

    async def subscribe(
        self,
        address: str,
        callback: Callable[[str, str, Dict[str, Any]], None]
    ) -> bool:
        """
        Subscribe to measurement notifications from a device.

        Args:
            address: Device MAC address
            callback: Function called with (device_id, device_type, reading_dict)

        Returns:
            True if subscribed successfully
        """
        if address not in self._connected:
            logger.error(f"Not connected to {address}")
            return False

        connected = self._connected[address]
        connector = connected.connector

        self._callbacks[address] = callback

        # Create handler for notifications
        async def notification_handler(packet: DataPacket):
            reading = self._parse_reading(connected.device_type, packet)
            connected.last_reading = datetime.utcnow()
            connected.reading_count += 1

            if address in self._callbacks:
                self._callbacks[address](address, connected.device_type, reading)

        # Handle Quintic devices - subscribe to all notify characteristics
        if is_quintic_device(connected.device_type):
            logger.info(f"Quintic device detected: {connected.name}")
            subscribed_count = 0

            for char_uuid in QUINTIC_NOTIFY_CHARS:
                try:
                    success = await connector.subscribe(char_uuid, notification_handler)
                    if success:
                        subscribed_count += 1
                        logger.debug(f"Subscribed to {char_uuid[-8:]}")
                except Exception as e:
                    logger.debug(f"Could not subscribe to {char_uuid[-8:]}: {e}")

            if subscribed_count > 0:
                # Send start commands
                await self._send_start_commands(connector)
                logger.info(f"Subscribed to {subscribed_count} characteristics on {connected.name}")
                return True
            else:
                logger.error(f"Failed to subscribe to any characteristics on {connected.name}")
                return False

        # Standard health devices - subscribe to primary measurement characteristic
        measurement_chars = self._get_measurement_characteristics(connected.device_type)

        for char_uuid in measurement_chars:
            try:
                success = await connector.subscribe(char_uuid, notification_handler)
                if success:
                    logger.info(f"Subscribed to measurements from {connected.name}")
                    return True
            except Exception as e:
                logger.debug(f"Could not subscribe to {char_uuid}: {e}")

        logger.error(f"No suitable measurement characteristic found for {connected.device_type}")
        return False

    async def _send_start_commands(self, connector) -> None:
        """Send start commands to Quintic devices to trigger data streaming."""
        start_commands = [
            bytes([0x01]),
            bytes([0xA5]),
            bytes([0x81]),
        ]

        for char_uuid in QUINTIC_WRITE_CHARS:
            for cmd in start_commands:
                try:
                    await connector.write(char_uuid, cmd)
                    logger.debug(f"Sent {cmd.hex()} to {char_uuid[-8:]}")
                except Exception:
                    pass

    def _get_measurement_characteristics(self, device_type: str) -> List[str]:
        """Get measurement characteristic UUIDs for a device type."""
        mapping = {
            "pulse_oximeter": ["00002a5e-0000-1000-8000-00805f9b34fb"],  # PLX Spot Check
            "blood_pressure": ["00002a35-0000-1000-8000-00805f9b34fb"],  # BP Measurement
            "heart_rate": ["00002a37-0000-1000-8000-00805f9b34fb"],      # HR Measurement
            "thermometer": ["00002a1c-0000-1000-8000-00805f9b34fb"],     # Temperature
        }
        return mapping.get(device_type, [])

    def _parse_reading(self, device_type: str, packet: DataPacket) -> Dict[str, Any]:
        """Parse raw BLE data into a reading dict."""
        raw_hex = packet.raw.hex()

        reading = {
            "raw": raw_hex,
            "timestamp": packet.timestamp.isoformat(),
            "characteristicUuid": packet.capability_id,
        }

        # Attempt to parse based on device type
        if device_type == "pulse_oximeter_quintic":
            reading.update(self._parse_quintic_data(packet.raw))
        elif device_type == "pulse_oximeter":
            reading.update(self._parse_plx_data(packet.raw))
        elif device_type == "heart_rate":
            reading.update(self._parse_hr_data(packet.raw))
        elif device_type == "blood_pressure":
            reading.update(self._parse_bp_data(packet.raw))

        return reading

    def _parse_quintic_data(self, data: bytes) -> Dict[str, Any]:
        """Parse Quintic proprietary pulse oximeter data."""
        result = {"length": len(data)}

        if len(data) >= 4:
            # Heuristic parsing for Quintic devices
            possible_spo2 = data[1] if len(data) > 1 else None
            possible_pulse = data[2] if len(data) > 2 else None

            if possible_spo2 is not None and 50 <= possible_spo2 <= 100:
                result["spo2"] = possible_spo2

            if possible_pulse is not None and 30 <= possible_pulse <= 250:
                result["pulseRate"] = possible_pulse

        return result

    def _parse_plx_data(self, data: bytes) -> Dict[str, Any]:
        """Parse standard PLX Spot-Check data."""
        if len(data) < 5:
            return {"error": "Invalid data length"}

        # SFLOAT parsing (simplified)
        spo2_raw = int.from_bytes(data[1:3], 'little')
        pr_raw = int.from_bytes(data[3:5], 'little')

        return {
            "spo2": (spo2_raw & 0x0FFF) * (10 ** ((spo2_raw >> 12) - 8 if spo2_raw >> 12 >= 8 else spo2_raw >> 12)),
            "pulseRate": (pr_raw & 0x0FFF) * (10 ** ((pr_raw >> 12) - 8 if pr_raw >> 12 >= 8 else pr_raw >> 12)),
        }

    def _parse_hr_data(self, data: bytes) -> Dict[str, Any]:
        """Parse Heart Rate Measurement data."""
        if len(data) < 2:
            return {"error": "Invalid data length"}

        flags = data[0]
        hr_16bit = bool(flags & 0x01)

        if hr_16bit:
            heart_rate = int.from_bytes(data[1:3], 'little')
        else:
            heart_rate = data[1]

        return {"heartRate": heart_rate}

    def _parse_bp_data(self, data: bytes) -> Dict[str, Any]:
        """Parse Blood Pressure Measurement data."""
        if len(data) < 7:
            return {"error": "Invalid data length"}

        # Simplified SFLOAT parsing
        return {
            "systolic": int.from_bytes(data[1:3], 'little') & 0x0FFF,
            "diastolic": int.from_bytes(data[3:5], 'little') & 0x0FFF,
            "meanArterialPressure": int.from_bytes(data[5:7], 'little') & 0x0FFF,
        }

    # =========================================================================
    # Sniffer (for unknown protocols)
    # =========================================================================

    async def start_capture(self, address: str) -> bool:
        """
        Start capturing GATT traffic for protocol analysis.

        Use this for unknown/proprietary devices to reverse-engineer
        the protocol and auto-generate a plugin.
        """
        if address not in self._connected:
            return False

        connected = self._connected[address]
        try:
            self._capture_session = await self._bridge.start_capture(connected.connector)
            logger.info(f"Started capture on {connected.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to start capture: {e}")
            return False

    async def stop_capture(self) -> Dict[str, Any]:
        """Stop capture and return session data."""
        if not self._capture_session:
            return {"error": "No active capture"}

        try:
            session = await self._bridge.stop_capture()
            return {"session": session, "packets": len(session.packets) if hasattr(session, 'packets') else 0}
        except Exception as e:
            logger.error(f"Failed to stop capture: {e}")
            return {"error": str(e)}

    async def analyze_capture(self) -> Dict[str, Any]:
        """Analyze captured session and return protocol profile."""
        if not self._capture_session:
            return {"error": "No capture session"}

        try:
            profile = self._bridge.analyze_capture(self._capture_session)
            return {
                "profile": profile,
                "characteristics": len(profile.characteristics) if hasattr(profile, 'characteristics') else 0,
            }
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return {"error": str(e)}

    def generate_plugin(self, output_path: Optional[str] = None) -> str:
        """Generate plugin code from analysis."""
        if not self._capture_session:
            return "# No capture session available"

        try:
            profile = self._bridge.analyze_capture(self._capture_session)
            return self._bridge.generate_plugin(profile, output_path)
        except Exception as e:
            logger.error(f"Plugin generation failed: {e}")
            return f"# Generation failed: {e}"

    # =========================================================================
    # Lifecycle
    # =========================================================================

    async def shutdown(self) -> None:
        """Clean shutdown."""
        await self.disconnect_all()
        await self._bridge.shutdown()
        logger.info("Medical Device Bridge shutdown complete")


# =============================================================================
# Global Instance
# =============================================================================

_bridge_instance: Optional[MedicalDeviceBridge] = None


def get_bridge() -> MedicalDeviceBridge:
    """Get the global bridge instance."""
    global _bridge_instance
    if _bridge_instance is None:
        _bridge_instance = MedicalDeviceBridge()
    return _bridge_instance


async def check_ble_available() -> Dict[str, Any]:
    """Check if BLE is available."""
    bridge = get_bridge()
    return {
        "available": bridge.is_available,
        "message": "BLE ready" if bridge.is_available else "Install bleak: pip install bleak",
    }
