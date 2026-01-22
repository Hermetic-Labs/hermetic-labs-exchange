"""
Eve Peripheral Bridge
=====================

Protocol-agnostic device connectivity for Eve OS.

Core Components:
    - DiscoveryEngine: Scan for devices across protocols
    - ConnectionManager: Manage active connections + plugin routing
    - DataNormalizer: Transform raw data for Eve ingestion

Sniffer Components:
    - GATTCapture: Record BLE traffic
    - ProtocolAnalyzer: Infer protocol structure
    - PluginGenerator: Generate plugin skeletons

Example:
    from eve_peripheral_bridge import Bridge
    
    async def main():
        bridge = Bridge()
        
        # Discover all devices
        devices = await bridge.discover()
        
        # Connect to a device
        device = devices[0]
        connector = await bridge.connect(device)
        
        # Subscribe to data
        await connector.subscribe(
            "0000180d-0000-1000-8000-00805f9b34fb",
            lambda pkt: print(f"Data: {pkt.raw.hex()}")
        )
"""
from .bridge import Bridge
from .core import (
    Protocol,
    DeviceState,
    DeviceInfo,
    DeviceCapability,
    DataPacket,
    PluginManifest,
    DiscoveryEngine,
    ConnectionManager,
    DataNormalizer,
)
from .adapters import BLEAdapter
from .plugins import BasePlugin
from .sniffer import GATTCapture, ProtocolAnalyzer, PluginGenerator

__version__ = "0.1.0"
__all__ = [
    "Bridge",
    "Protocol",
    "DeviceState",
    "DeviceInfo",
    "DeviceCapability",
    "DataPacket",
    "PluginManifest",
    "DiscoveryEngine",
    "ConnectionManager",
    "DataNormalizer",
    "BLEAdapter",
    "BasePlugin",
    "GATTCapture",
    "ProtocolAnalyzer",
    "PluginGenerator",
]
