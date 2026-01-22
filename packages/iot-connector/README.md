# @eve-os/iot-connector

Universal IoT device discovery, protocol handlers, and workflow automation for EVE OS.

## Features

### Device Discovery
- mDNS/SSDP device scanning
- Bluetooth device discovery
- Network device enumeration
- Automatic device identification

### Protocol Handlers
- HTTP/HTTPS REST API support
- WebSocket real-time communication
- MQTT pub/sub messaging
- CoAP lightweight protocol

### Device Safety
- Safety rules engine
- Medical device compliance
- Rate limiting and throttling
- Emergency override handling

### Workflow Automation
- Device workflow engine
- Template-based automation
- Event-driven triggers
- Multi-device orchestration

### Device Templates
- Common manufacturer support
- Smart home device templates
- Medical device integration
- Industrial IoT templates

## Installation

```bash
pnpm add @eve-os/iot-connector
```

## Usage

```typescript
import { IoTDeviceAdapter, deviceDiscovery } from '@eve-os/iot-connector';

// Discover devices on network
const devices = await deviceDiscovery.scanNetwork({
  protocols: ['mdns', 'ssdp'],
  timeout: 5000
});

// Create device adapter
const adapter = new IoTDeviceAdapter({
  deviceId: 'device-001',
  protocol: 'mqtt',
  networkConfig: {
    baseUrl: 'mqtt://localhost:1883'
  }
});

// Connect to device
await adapter.connect();

// Execute capability
const result = await adapter.executeCapability({
  capability: 'toggle',
  parameters: { state: true }
});
```

## API Reference

### IoTDeviceAdapter

Main adapter class for IoT device communication.

#### Methods

- `connect()` - Connect to device
- `disconnect()` - Disconnect from device
- `executeCapability(request)` - Execute device capability
- `getStatus()` - Get device status

### DeviceDiscovery

Service for discovering IoT devices on the network.

#### Methods

- `scanNetwork(options)` - Scan for devices
- `getDevice(deviceId)` - Get device by ID
- `watchDevice(deviceId, callback)` - Watch device status

### DeviceSafety

Safety rules engine for IoT operations.

#### Methods

- `validateCommand(command)` - Validate command against safety rules
- `addSafetyRule(rule)` - Add safety rule
- `checkEmergencyMode()` - Check emergency mode status
