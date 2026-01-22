/**
 * iot-connector - EVE OS Marketplace Package
 */

// Main tabbed container (default export for sidebar tab)
export { default, default as IoTConnectorPortal } from './IoTConnectorPortal';

// Service classes (for programmatic access, NOT React components)
// IoTDeviceAdapter is an interface, exported via type export
export type { IoTDeviceAdapter, DeviceAdapterFactory } from './IoTDeviceAdapter';
export { BaseIoTDeviceAdapter, StandardDeviceAdapterFactory } from './IoTDeviceAdapter';
export { IoTTemplateEngine } from './IoTTemplateEngine';
export type { TemplateMetadata, TemplateVariable, TemplateCategory } from './IoTTemplateEngine';
export { default as IoTWorkflowEngine } from './IoTWorkflowEngine';
export { deviceDiscovery } from './DeviceDiscovery';
export { protocolManager, dynamicProtocolLoader, ProtocolManager } from './DeviceProtocols';
export { deviceSafetyManager, DeviceSafetyManager } from './DeviceSafety';
export { DevicePairingService, getDevicePairingService } from './DevicePairingService';

// Type exports only
export type * from './types';
