"""Protocol-agnostic device discovery engine."""
from __future__ import annotations
import asyncio
import logging
from typing import TYPE_CHECKING

from .types import DeviceInfo, Protocol

if TYPE_CHECKING:
    from ..adapters.base import BaseAdapter

log = logging.getLogger(__name__)


class DiscoveryEngine:
    """Unified discovery across all protocols."""
    
    def __init__(self):
        self._adapters: dict[Protocol, BaseAdapter] = {}
        self._devices: dict[str, DeviceInfo] = {}
        self._scanning = False
    
    def register_adapter(self, protocol: Protocol, adapter: BaseAdapter) -> None:
        """Register a protocol adapter for discovery."""
        self._adapters[protocol] = adapter
        log.info(f"Registered adapter for {protocol.name}")
    
    def unregister_adapter(self, protocol: Protocol) -> None:
        """Remove a protocol adapter."""
        self._adapters.pop(protocol, None)
    
    @property
    def devices(self) -> dict[str, DeviceInfo]:
        """Current device manifest."""
        return self._devices.copy()
    
    async def scan(
        self,
        protocols: list[Protocol] | None = None,
        duration: float = 5.0,
        clear_cache: bool = False,
    ) -> list[DeviceInfo]:
        """
        Scan for devices across protocols.
        
        Args:
            protocols: Specific protocols to scan (None = all registered)
            duration: Scan duration in seconds
            clear_cache: Clear existing device cache before scan
        
        Returns:
            List of discovered devices
        """
        if self._scanning:
            log.warning("Scan already in progress")
            return list(self._devices.values())
        
        if clear_cache:
            self._devices.clear()
        
        self._scanning = True
        target_adapters = (
            {p: self._adapters[p] for p in protocols if p in self._adapters}
            if protocols
            else self._adapters
        )
        
        try:
            # Parallel scan across all target protocols
            tasks = [
                self._scan_protocol(protocol, adapter, duration)
                for protocol, adapter in target_adapters.items()
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    log.error(f"Scan error: {result}")
                elif isinstance(result, list):
                    for device in result:
                        self._devices[device.id] = device
        finally:
            self._scanning = False
        
        log.info(f"Discovery complete: {len(self._devices)} devices")
        return list(self._devices.values())
    
    async def _scan_protocol(
        self, protocol: Protocol, adapter: BaseAdapter, duration: float
    ) -> list[DeviceInfo]:
        """Scan a single protocol."""
        log.debug(f"Scanning {protocol.name} for {duration}s")
        try:
            return await adapter.discover(duration)
        except Exception as e:
            log.error(f"{protocol.name} scan failed: {e}")
            raise
    
    def get_device(self, device_id: str) -> DeviceInfo | None:
        """Get device by ID."""
        return self._devices.get(device_id)
    
    def filter_devices(
        self,
        protocol: Protocol | None = None,
        name_contains: str | None = None,
    ) -> list[DeviceInfo]:
        """Filter discovered devices."""
        devices = list(self._devices.values())
        
        if protocol:
            devices = [d for d in devices if d.protocol == protocol]
        if name_contains:
            devices = [d for d in devices if name_contains.lower() in d.name.lower()]
        
        return devices
