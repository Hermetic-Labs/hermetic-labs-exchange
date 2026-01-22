#!/usr/bin/env python3
"""
Eve Peripheral Bridge - Basic Usage Examples
============================================

Run with: python -m examples.basic_usage
"""
import asyncio
import logging
from eve_peripheral_bridge import Bridge, Protocol, DataPacket

logging.basicConfig(level=logging.INFO)


async def example_discover():
    """Discover all BLE devices."""
    print("\n=== Device Discovery ===")
    
    bridge = Bridge()
    devices = await bridge.discover(duration=5.0)
    
    print(f"Found {len(devices)} devices:\n")
    for d in devices:
        print(f"  {d.name}")
        print(f"    ID: {d.id}")
        print(f"    RSSI: {d.rssi}")
        print(f"    Manufacturer: {d.manufacturer}")
        print()
    
    await bridge.shutdown()
    return devices


async def example_connect_and_read(device_id: str):
    """Connect and enumerate characteristics."""
    print("\n=== Connect & Enumerate ===")
    
    bridge = Bridge()
    await bridge.discover(duration=3.0)
    
    device = bridge.get_device(device_id)
    if not device:
        print(f"Device {device_id} not found")
        return
    
    connector = await bridge.connect(device)
    if not connector:
        print("Connection failed")
        return
    
    print(f"Connected to: {device.name}")
    print(f"Capabilities ({len(device.capabilities)}):")
    
    for cap in device.capabilities:
        flags = []
        if cap.readable: flags.append("R")
        if cap.writable: flags.append("W")
        if cap.notifiable: flags.append("N")
        print(f"  [{'/'.join(flags)}] {cap.id}")
        print(f"       {cap.name}")
    
    await bridge.disconnect_all()


async def example_subscribe():
    """Subscribe to notifications and normalize data."""
    print("\n=== Subscribe & Normalize ===")
    
    bridge = Bridge()
    devices = await bridge.discover(duration=3.0)
    
    # Find a device (modify filter as needed)
    target = next((d for d in devices if "heart" in d.name.lower()), None)
    if not target:
        print("No target device found")
        return
    
    connector = await bridge.connect(target)
    device = bridge.get_device(target.id)
    
    async def on_data(packet: DataPacket):
        # Normalize for Eve ingestion
        normalized = bridge.normalize(packet, device)
        print(f"Received: {normalized}")
    
    # Subscribe to first notifiable characteristic
    for cap in device.capabilities:
        if cap.notifiable:
            await connector.subscribe(cap.id, on_data)
            print(f"Subscribed to: {cap.id}")
            break
    
    # Listen for 30 seconds
    print("Listening for 30 seconds...")
    await asyncio.sleep(30)
    
    await bridge.disconnect_all()


async def example_sniff_protocol(device_id: str):
    """Capture and analyze protocol traffic."""
    print("\n=== Protocol Sniffing ===")
    
    bridge = Bridge()
    await bridge.discover(duration=3.0)
    
    device = bridge.get_device(device_id)
    if not device:
        print(f"Device {device_id} not found")
        return
    
    connector = await bridge.connect(device)
    if not connector:
        print("Connection failed")
        return
    
    # Start capture
    print(f"Capturing traffic from {device.name}...")
    session = await bridge.start_capture(connector)
    
    print("Interact with the device via vendor app now...")
    print("Press Ctrl+C to stop capture\n")
    
    try:
        while True:
            await asyncio.sleep(1)
            print(f"  Captured {len(session.operations)} operations")
    except KeyboardInterrupt:
        pass
    
    # Stop and analyze
    session = await bridge.stop_capture()
    
    print(f"\nCapture complete: {len(session.operations)} operations")
    
    # Analyze
    profile = bridge.analyze_capture(session)
    
    # Generate plugin skeleton
    plugin_code = bridge.generate_plugin(profile, "generated_plugin.py")
    print("\nGenerated plugin saved to: generated_plugin.py")
    
    # Print analysis summary
    from eve_peripheral_bridge.sniffer import ProtocolAnalyzer
    analyzer = ProtocolAnalyzer()
    analyzer._profile = profile
    print("\n" + analyzer.export_summary())
    
    await bridge.disconnect_all()


if __name__ == "__main__":
    # Run discovery by default
    asyncio.run(example_discover())
