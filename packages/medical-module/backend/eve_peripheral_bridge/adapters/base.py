"""Base adapter interface."""
from __future__ import annotations
from abc import ABC, abstractmethod

from ..core.types import DeviceInfo, Protocol
from ..core.connector import BaseConnector


class BaseAdapter(ABC):
    """Abstract base for protocol adapters."""
    
    protocol: Protocol = Protocol.UNKNOWN
    
    @abstractmethod
    async def discover(self, duration: float = 5.0) -> list[DeviceInfo]:
        """Discover devices on this protocol."""
        ...
    
    @abstractmethod
    async def create_connector(self, device: DeviceInfo) -> BaseConnector:
        """Create a connector for the given device."""
        ...
    
    @abstractmethod
    async def shutdown(self) -> None:
        """Clean up adapter resources."""
        ...
