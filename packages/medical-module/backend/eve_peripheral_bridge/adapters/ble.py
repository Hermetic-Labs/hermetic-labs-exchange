"""Bluetooth Low Energy adapter using bleak."""
from __future__ import annotations
import asyncio
import logging
from datetime import datetime
from typing import Any

from bleak import BleakClient, BleakScanner
from bleak.backends.device import BLEDevice
from bleak.backends.characteristic import BleakGATTCharacteristic

from .base import BaseAdapter
from ..core.types import (
    DeviceInfo,
    DeviceCapability,
    DataPacket,
    Protocol,
    DeviceState,
    DataHandler,
)
from ..core.connector import BaseConnector

log = logging.getLogger(__name__)


class BLEConnector(BaseConnector):
    """BLE-specific connector using bleak."""
    
    protocol = Protocol.BLE
    
    def __init__(self, device: DeviceInfo, ble_device: BLEDevice):
        super().__init__(device)
        self._ble_device = ble_device
        self._client: BleakClient | None = None
        self._subscriptions: dict[str, DataHandler] = {}
    
    async def connect(self) -> bool:
        """Connect to BLE device."""
        try:
            self._client = BleakClient(self._ble_device, timeout=10.0)
            await self._client.connect()
            self._connected = self._client.is_connected
            
            if self._connected:
                await self._enumerate_capabilities()
            
            return self._connected
        except Exception as e:
            log.error(f"BLE connect error: {e}")
            self._connected = False
            return False
    
    async def disconnect(self) -> None:
        """Disconnect from BLE device."""
        if self._client:
            try:
                await self._client.disconnect()
            except Exception as e:
                log.error(f"BLE disconnect error: {e}")
            finally:
                self._client = None
                self._connected = False
    
    async def _enumerate_capabilities(self) -> None:
        """Discover GATT services and characteristics."""
        if not self._client:
            return
        
        self.device.capabilities.clear()
        
        for service in self._client.services:
            for char in service.characteristics:
                cap = DeviceCapability(
                    id=char.uuid,
                    name=char.description or char.uuid,
                    readable="read" in char.properties,
                    writable="write" in char.properties or "write-without-response" in char.properties,
                    notifiable="notify" in char.properties or "indicate" in char.properties,
                    raw_handle=char,
                )
                self.device.capabilities.append(cap)
        
        log.debug(f"Found {len(self.device.capabilities)} characteristics")
    
    async def read(self, capability_id: str) -> bytes:
        """Read from BLE characteristic."""
        if not self._client or not self._connected:
            raise ConnectionError("Not connected")
        
        try:
            data = await self._client.read_gatt_char(capability_id)
            return bytes(data)
        except Exception as e:
            log.error(f"Read error on {capability_id}: {e}")
            raise
    
    async def write(self, capability_id: str, data: bytes) -> bool:
        """Write to BLE characteristic."""
        if not self._client or not self._connected:
            raise ConnectionError("Not connected")
        
        try:
            await self._client.write_gatt_char(capability_id, data)
            return True
        except Exception as e:
            log.error(f"Write error on {capability_id}: {e}")
            return False
    
    async def subscribe(self, capability_id: str, handler: DataHandler) -> bool:
        """Subscribe to BLE notifications."""
        if not self._client or not self._connected:
            return False
        
        def notification_callback(char: BleakGATTCharacteristic, data: bytearray):
            packet = DataPacket(
                device_id=self.device.id,
                capability_id=char.uuid,
                timestamp=datetime.now(),
                raw=bytes(data),
                protocol=Protocol.BLE,
            )
            asyncio.create_task(self._handle_notification(packet, handler))
        
        try:
            await self._client.start_notify(capability_id, notification_callback)
            self._subscriptions[capability_id] = handler
            log.debug(f"Subscribed to {capability_id}")
            return True
        except Exception as e:
            log.error(f"Subscribe error on {capability_id}: {e}")
            return False
    
    async def _handle_notification(self, packet: DataPacket, handler: DataHandler) -> None:
        """Process incoming notification."""
        await self._emit_data(packet)
        await handler(packet)
    
    async def unsubscribe(self, capability_id: str) -> None:
        """Unsubscribe from notifications."""
        if not self._client:
            return
        
        try:
            await self._client.stop_notify(capability_id)
            self._subscriptions.pop(capability_id, None)
        except Exception as e:
            log.error(f"Unsubscribe error: {e}")


class BLEAdapter(BaseAdapter):
    """Bluetooth Low Energy protocol adapter."""
    
    protocol = Protocol.BLE
    
    def __init__(self):
        self._discovered: dict[str, tuple[DeviceInfo, BLEDevice]] = {}
    
    async def discover(self, duration: float = 5.0) -> list[DeviceInfo]:
        """Scan for BLE devices."""
        self._discovered.clear()
        
        devices = await BleakScanner.discover(timeout=duration, return_adv=True)
        
        result = []
        for ble_device, adv_data in devices.values():
            device_info = DeviceInfo(
                id=ble_device.address,
                name=ble_device.name or adv_data.local_name or "Unknown",
                protocol=Protocol.BLE,
                address=ble_device.address,
                rssi=adv_data.rssi,
                manufacturer=self._parse_manufacturer(adv_data.manufacturer_data),
                metadata={
                    "service_uuids": list(adv_data.service_uuids) if adv_data.service_uuids else [],
                    "tx_power": adv_data.tx_power,
                },
            )
            self._discovered[ble_device.address] = (device_info, ble_device)
            result.append(device_info)
        
        log.info(f"BLE scan found {len(result)} devices")
        return result
    
    def _parse_manufacturer(self, mfr_data: dict[int, bytes] | None) -> str | None:
        """Extract manufacturer from advertisement data."""
        if not mfr_data:
            return None
        # Common manufacturer IDs
        MFR_IDS = {
            0x004C: "Apple",
            0x0006: "Microsoft",
            0x000F: "Broadcom",
            0x0075: "Samsung",
            0x00E0: "Google",
        }
        for mfr_id in mfr_data:
            if mfr_id in MFR_IDS:
                return MFR_IDS[mfr_id]
            return f"0x{mfr_id:04X}"
        return None
    
    async def create_connector(self, device: DeviceInfo) -> BLEConnector:
        """Create BLE connector for device."""
        cached = self._discovered.get(device.id)
        if cached:
            _, ble_device = cached
        else:
            # Re-discover single device
            ble_device = await BleakScanner.find_device_by_address(device.address)
            if not ble_device:
                raise ValueError(f"Device {device.id} not found")
        
        return BLEConnector(device, ble_device)
    
    async def shutdown(self) -> None:
        """Clean up BLE adapter."""
        self._discovered.clear()
