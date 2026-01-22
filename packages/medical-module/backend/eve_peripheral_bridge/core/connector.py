"""Connection management for devices."""
from __future__ import annotations
import asyncio
import logging
from typing import TYPE_CHECKING, Any

from .types import (
    DeviceInfo,
    DeviceState,
    DataPacket,
    DataHandler,
    ConnectionHandler,
    Protocol,
)

if TYPE_CHECKING:
    from ..adapters.base import BaseAdapter
    from ..plugins.base import BasePlugin

log = logging.getLogger(__name__)


class BaseConnector:
    """Base class for protocol-specific connectors."""
    
    protocol: Protocol = Protocol.UNKNOWN
    
    def __init__(self, device: DeviceInfo):
        self.device = device
        self._connected = False
        self._data_handlers: list[DataHandler] = []
    
    @property
    def connected(self) -> bool:
        return self._connected
    
    async def connect(self) -> bool:
        """Establish connection. Override in subclass."""
        raise NotImplementedError
    
    async def disconnect(self) -> None:
        """Close connection. Override in subclass."""
        raise NotImplementedError
    
    async def read(self, capability_id: str) -> bytes:
        """Read from capability. Override in subclass."""
        raise NotImplementedError
    
    async def write(self, capability_id: str, data: bytes) -> bool:
        """Write to capability. Override in subclass."""
        raise NotImplementedError
    
    async def subscribe(self, capability_id: str, handler: DataHandler) -> bool:
        """Subscribe to notifications. Override in subclass."""
        raise NotImplementedError
    
    async def unsubscribe(self, capability_id: str) -> None:
        """Unsubscribe from notifications. Override in subclass."""
        raise NotImplementedError
    
    def add_data_handler(self, handler: DataHandler) -> None:
        """Register a global data handler."""
        self._data_handlers.append(handler)
    
    async def _emit_data(self, packet: DataPacket) -> None:
        """Notify all handlers of new data."""
        for handler in self._data_handlers:
            try:
                await handler(packet)
            except Exception as e:
                log.error(f"Handler error: {e}")


class ConnectionManager:
    """Manages active connections and plugin routing."""
    
    def __init__(self):
        self._adapters: dict[Protocol, BaseAdapter] = {}
        self._plugins: dict[str, BasePlugin] = {}
        self._connections: dict[str, BaseConnector] = {}
        self._on_connect: list[ConnectionHandler] = []
        self._on_disconnect: list[ConnectionHandler] = []
    
    def register_adapter(self, protocol: Protocol, adapter: BaseAdapter) -> None:
        """Register protocol adapter."""
        self._adapters[protocol] = adapter
    
    def register_plugin(self, plugin: BasePlugin) -> None:
        """Register device plugin for edge cases."""
        self._plugins[plugin.manifest.id] = plugin
        log.info(f"Registered plugin: {plugin.manifest.name}")
    
    def on_connect(self, handler: ConnectionHandler) -> None:
        """Register connection callback."""
        self._on_connect.append(handler)
    
    def on_disconnect(self, handler: ConnectionHandler) -> None:
        """Register disconnection callback."""
        self._on_disconnect.append(handler)
    
    def _find_plugin(self, device: DeviceInfo) -> BasePlugin | None:
        """Find matching plugin for device."""
        for plugin in self._plugins.values():
            if plugin.matches(device):
                return plugin
        return None
    
    async def connect(self, device: DeviceInfo) -> BaseConnector | None:
        """
        Connect to device, using plugin if available.
        
        Returns connector on success, None on failure.
        """
        if device.id in self._connections:
            log.warning(f"Already connected to {device.id}")
            return self._connections[device.id]
        
        adapter = self._adapters.get(device.protocol)
        if not adapter:
            log.error(f"No adapter for {device.protocol.name}")
            return None
        
        # Check for specialized plugin
        plugin = self._find_plugin(device)
        if plugin:
            log.info(f"Using plugin '{plugin.manifest.name}' for {device.name}")
            connector = await plugin.create_connector(device, adapter)
        else:
            connector = await adapter.create_connector(device)
        
        if not connector:
            return None
        
        try:
            device.state = DeviceState.CONNECTING
            success = await connector.connect()
            
            if success:
                device.state = DeviceState.CONNECTED
                self._connections[device.id] = connector
                
                for handler in self._on_connect:
                    await handler(device)
                
                log.info(f"Connected: {device.name} ({device.id})")
                return connector
            else:
                device.state = DeviceState.ERROR
                return None
                
        except Exception as e:
            log.error(f"Connection failed for {device.name}: {e}")
            device.state = DeviceState.ERROR
            return None
    
    async def disconnect(self, device_id: str) -> None:
        """Disconnect from device."""
        connector = self._connections.pop(device_id, None)
        if not connector:
            return
        
        try:
            await connector.disconnect()
            connector.device.state = DeviceState.DISCONNECTED
            
            for handler in self._on_disconnect:
                await handler(connector.device)
                
            log.info(f"Disconnected: {device_id}")
        except Exception as e:
            log.error(f"Disconnect error: {e}")
    
    async def disconnect_all(self) -> None:
        """Disconnect all active connections."""
        device_ids = list(self._connections.keys())
        await asyncio.gather(*[self.disconnect(did) for did in device_ids])
    
    def get_connector(self, device_id: str) -> BaseConnector | None:
        """Get active connector for device."""
        return self._connections.get(device_id)
    
    @property
    def active_connections(self) -> list[str]:
        """List of connected device IDs."""
        return list(self._connections.keys())
