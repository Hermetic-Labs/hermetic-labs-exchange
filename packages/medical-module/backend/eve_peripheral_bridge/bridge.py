"""Main entry point for Eve Peripheral Bridge."""
from __future__ import annotations
import asyncio
import logging
from typing import Any

from .core import (
    DiscoveryEngine,
    ConnectionManager,
    DataNormalizer,
    Protocol,
    DeviceInfo,
    DataPacket,
    DataHandler,
    ConnectionHandler,
)
from .adapters import BLEAdapter
from .plugins.base import BasePlugin
from .sniffer import GATTCapture, ProtocolAnalyzer, PluginGenerator

log = logging.getLogger(__name__)


class Bridge:
    """
    Eve Peripheral Bridge - Unified device connectivity.
    
    The main interface for discovering, connecting, and communicating
    with peripheral devices across protocols.
    
    Usage:
        bridge = Bridge()
        
        # Discover
        devices = await bridge.discover()
        
        # Connect
        connector = await bridge.connect(devices[0])
        
        # Read/Write/Subscribe
        data = await connector.read("characteristic-uuid")
        await connector.subscribe("uuid", my_handler)
        
        # Normalize for Eve
        normalized = bridge.normalize(packet, device)
        
        # Sniff proprietary protocol
        session = await bridge.start_capture(connector)
        # ... trigger device actions ...
        session = await bridge.stop_capture()
        profile = bridge.analyze_capture(session)
        plugin_code = bridge.generate_plugin(profile)
    """
    
    def __init__(self, enable_protocols: list[Protocol] | None = None):
        """
        Initialize bridge.
        
        Args:
            enable_protocols: Protocols to enable (default: [BLE])
        """
        self._discovery = DiscoveryEngine()
        self._connections = ConnectionManager()
        self._normalizer = DataNormalizer()
        self._capture: GATTCapture | None = None
        
        # Register default adapters
        protocols = enable_protocols or [Protocol.BLE]
        
        if Protocol.BLE in protocols:
            ble = BLEAdapter()
            self._discovery.register_adapter(Protocol.BLE, ble)
            self._connections.register_adapter(Protocol.BLE, ble)
    
    # =========================================================================
    # Discovery
    # =========================================================================
    
    async def discover(
        self,
        protocols: list[Protocol] | None = None,
        duration: float = 5.0,
        name_filter: str | None = None,
    ) -> list[DeviceInfo]:
        """
        Discover devices.
        
        Args:
            protocols: Limit to specific protocols
            duration: Scan duration in seconds
            name_filter: Filter by name substring
        
        Returns:
            List of discovered devices
        """
        devices = await self._discovery.scan(protocols, duration)
        
        if name_filter:
            devices = [d for d in devices if name_filter.lower() in d.name.lower()]
        
        return devices
    
    def get_device(self, device_id: str) -> DeviceInfo | None:
        """Get device by ID from cache."""
        return self._discovery.get_device(device_id)
    
    @property
    def devices(self) -> dict[str, DeviceInfo]:
        """All discovered devices."""
        return self._discovery.devices
    
    # =========================================================================
    # Connection
    # =========================================================================
    
    async def connect(self, device: DeviceInfo) -> Any:
        """
        Connect to device.
        
        Returns protocol-specific connector.
        """
        return await self._connections.connect(device)
    
    async def disconnect(self, device_id: str) -> None:
        """Disconnect from device."""
        await self._connections.disconnect(device_id)
    
    async def disconnect_all(self) -> None:
        """Disconnect all devices."""
        await self._connections.disconnect_all()
    
    def get_connector(self, device_id: str) -> Any:
        """Get active connector for device."""
        return self._connections.get_connector(device_id)
    
    @property
    def connected_devices(self) -> list[str]:
        """List of connected device IDs."""
        return self._connections.active_connections
    
    def on_connect(self, handler: ConnectionHandler) -> None:
        """Register connection callback."""
        self._connections.on_connect(handler)
    
    def on_disconnect(self, handler: ConnectionHandler) -> None:
        """Register disconnection callback."""
        self._connections.on_disconnect(handler)
    
    # =========================================================================
    # Plugins
    # =========================================================================
    
    def register_plugin(self, plugin: BasePlugin) -> None:
        """Register edge-case device plugin."""
        self._connections.register_plugin(plugin)
    
    # =========================================================================
    # Normalization
    # =========================================================================
    
    def normalize(self, packet: DataPacket, device: DeviceInfo) -> dict[str, Any]:
        """Normalize data packet for Eve ingestion."""
        return self._normalizer.normalize(packet, device)
    
    def normalize_json(self, packet: DataPacket, device: DeviceInfo) -> str:
        """Normalize and serialize to JSON."""
        return self._normalizer.to_json(packet, device)
    
    def register_parser(self, capability_pattern: str, parser: callable) -> None:
        """Register custom parser for capability type."""
        self._normalizer.register_parser(capability_pattern, parser)
    
    # =========================================================================
    # Sniffer
    # =========================================================================
    
    async def start_capture(
        self,
        connector: Any,
        characteristics: list[str] | None = None,
    ) -> Any:
        """
        Start capturing GATT traffic.
        
        Args:
            connector: Active BLE connector
            characteristics: Specific UUIDs (None = all notifiable)
        
        Returns:
            CaptureSession being recorded
        """
        from .adapters.ble import BLEConnector
        
        if not isinstance(connector, BLEConnector):
            raise TypeError("Capture only supported for BLE connections")
        
        self._capture = GATTCapture()
        return await self._capture.start(connector, characteristics)
    
    async def stop_capture(self) -> Any:
        """Stop capture and return session."""
        if not self._capture:
            raise RuntimeError("No active capture")
        return await self._capture.stop()
    
    def analyze_capture(self, session: Any) -> Any:
        """Analyze captured session."""
        analyzer = ProtocolAnalyzer()
        return analyzer.analyze(session)
    
    def generate_plugin(
        self,
        profile: Any,
        output_path: str | None = None,
    ) -> str:
        """Generate plugin skeleton from analysis."""
        generator = PluginGenerator(profile)
        return generator.generate(output_path)
    
    # =========================================================================
    # Lifecycle
    # =========================================================================
    
    async def shutdown(self) -> None:
        """Clean shutdown of all connections and adapters."""
        await self.disconnect_all()
        log.info("Bridge shutdown complete")


# Convenience function for quick discovery
async def scan_devices(
    duration: float = 5.0,
    protocols: list[Protocol] | None = None,
) -> list[DeviceInfo]:
    """Quick scan for devices without full bridge setup."""
    bridge = Bridge(protocols)
    try:
        return await bridge.discover(duration=duration)
    finally:
        await bridge.shutdown()
