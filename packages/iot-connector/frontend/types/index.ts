/**
 * IoT Connector Types
 * 
 * TypeScript type definitions for universal IoT device
 * discovery, protocol handlers, and workflow automation
 */

// Device Categories and Protocols
export type DeviceCategory = 'medical' | 'personal' | 'infrastructure' | 'sensor';
export type DeviceProtocol = 'http' | 'bluetooth' | 'websocket' | 'local' | 'mqtt' | 'coap';
export type DeviceStatus = 'online' | 'offline' | 'unreachable' | 'error';
export type ResponseFormat = 'json' | 'xml' | 'raw' | 'binary';
export type SafetyLevel = 'low' | 'medium' | 'high' | 'critical';
export type CommandPriority = 'normal' | 'high' | 'urgent' | 'emergency';

// Configuration Types
export interface IoTConfig {
  protocol: DeviceProtocol;
  baseUrl?: string;
  brokerUrl?: string;
  port?: number;
  timeout?: number;
  ssl?: boolean;
  credentials?: IoTCredentials;
}

export interface IoTCredentials {
  apiKey?: string;
  username?: string;
  password?: string;
  certificate?: string;
}

export interface IoTConnectionResponse {
  connected: boolean;
  protocol: DeviceProtocol;
  devicesDiscovered: number;
}

// Device Types
export interface DeviceEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  parameters: Parameter[];
  responseFormat: ResponseFormat;
  authentication?: AuthConfig;
  timeout?: number;
  retryCount?: number;
  rateLimit?: RateLimitConfig;
}

export interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  validation?: ValidationRule[];
  description?: string;
}

export interface DeviceCapability {
  name: string;
  type: 'control' | 'monitor' | 'sensor' | 'actuator';
  parameters: Parameter[];
  returnType: string;
  description: string;
  requiresPermissions?: string[];
}

export interface SafetyRule {
  id: string;
  name: string;
  type: 'range_check' | 'whitelist' | 'blacklist' | 'pattern' | 'emergency';
  rule: any;
  severity: SafetyLevel;
  enabled: boolean;
  description: string;
  hospitalSpecific?: boolean;
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'api_key' | 'certificate' | 'oauth2';
  credentials: Record<string, string>;
  headers?: Record<string, string>;
  tokenExpiry?: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit?: number;
  backoffStrategy?: 'linear' | 'exponential' | 'fixed';
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'required' | 'custom';
  value: any;
  message: string;
  customValidator?: (value: any) => boolean;
}

export interface NetworkConfig {
  baseUrl?: string;
  port?: number;
  ssl?: boolean;
  proxy?: string;
  timeout?: number;
  localNetwork?: boolean;
  broadcastAddress?: string;
}

export interface DeviceSpec {
  deviceId: string;
  name: string;
  type: string;
  category: DeviceCategory;
  protocol: DeviceProtocol;
  endpoints: DeviceEndpoint[];
  capabilities: DeviceCapability[];
  safetyRules: SafetyRule[];
  medicalOverride?: boolean;
  networkConfig?: NetworkConfig;
  metadata?: Record<string, any>;
}

export interface DiscoveredDevice {
  deviceId: string;
  name: string;
  type: string;
  category: DeviceCategory;
  protocol: DeviceProtocol;
  capabilities: string[];
  status: DeviceStatus;
  ipAddress?: string;
  macAddress?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  discoveredAt: string;
}

export interface DeviceListResponse {
  devices: DiscoveredDevice[];
  total: number;
  onlineCount: number;
  offlineCount: number;
}

// Control Types
export interface UserContext {
  userId: string;
  permissions: string[];
  location?: string;
  emergencyMode?: boolean;
  medicalContext?: MedicalContext;
}

export interface MedicalContext {
  patientId?: string;
  procedureType?: string;
  department?: string;
  attendingPhysician?: string;
  urgencyLevel: 'routine' | 'urgent' | 'emergency';
}

export interface DeviceControlRequest {
  deviceId: string;
  capability: string;
  parameters: Record<string, any>;
  timeout?: number;
  priority?: CommandPriority;
  userContext?: UserContext;
}

export interface DeviceControlResponse {
  success: boolean;
  data?: any;
  error?: ExecutionError;
  executionTime: number;
  deviceId: string;
  capability: string;
  timestamp: string;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestedAction?: string;
}

// Workflow Types
export interface WorkflowStep {
  stepId: string;
  deviceId: string;
  capability: string;
  parameters: Record<string, any>;
  condition?: string;
  delayMs: number;
}

export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  trigger?: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  success: boolean;
  stepsExecuted: number;
  stepsFailed: number;
  results: DeviceControlResponse[];
  totalExecutionTime: number;
  startedAt: string;
  completedAt: string;
}

// Discovery Types
export interface DiscoveryScanRequest {
  protocols: string[];
  timeout: number;
  includeOffline: boolean;
}

export interface DiscoveryScanResponse {
  devices: DiscoveredDevice[];
  scanDurationMs: number;
  protocolsScanned: string[];
}

// Event Types
export interface DeviceEvent {
  type: 'connected' | 'disconnected' | 'status_change' | 'data' | 'error';
  deviceId: string;
  data?: any;
  timestamp: string;
}

export interface IoTEventHandler {
  onDeviceConnected?: (device: DiscoveredDevice) => void;
  onDeviceDisconnected?: (deviceId: string) => void;
  onDeviceStatusChange?: (deviceId: string, status: DeviceStatus) => void;
  onDeviceData?: (deviceId: string, data: any) => void;
  onError?: (error: ExecutionError) => void;
}
