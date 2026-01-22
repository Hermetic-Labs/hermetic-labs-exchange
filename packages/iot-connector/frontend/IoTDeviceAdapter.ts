/**
 * IoT Device Adapter Framework
 * 
 * Standardized interface for universal IoT device control with medical vs personal classification.
 * Provides a consistent API for controlling diverse IoT devices regardless of their communication protocol.
 */

import { EventEmitter } from './EventEmitter';

// Device Type Classifications
export type DeviceCategory = 'medical' | 'personal' | 'infrastructure' | 'sensor';
export type DeviceProtocol = 'http' | 'bluetooth' | 'websocket' | 'local' | 'mqtt' | 'coap';
export type ResponseFormat = 'json' | 'xml' | 'raw' | 'binary';

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
  severity: 'low' | 'medium' | 'high' | 'critical';
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

export interface DeviceControlRequest {
  deviceId: string;
  capability: string;
  parameters: Record<string, any>;
  timeout?: number;
  priority?: 'normal' | 'high' | 'urgent' | 'emergency';
  userContext?: UserContext;
}

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

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: ExecutionError;
  executionTime: number;
  deviceId: string;
  capability: string;
  timestamp: Date;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface DiscoveredDevice {
  deviceId: string;
  name: string;
  type: string;
  category: DeviceCategory;
  protocol: DeviceProtocol;
  capabilities: string[];
  status: 'online' | 'offline' | 'unreachable' | 'error';
  networkInfo: NetworkInfo;
  lastSeen: Date;
  signalStrength?: number;
}

export interface NetworkInfo {
  ip?: string;
  mac?: string;
  port?: number;
  protocol: DeviceProtocol;
  manufacturer?: string;
  model?: string;
  firmware?: string;
}

/**
 * Base IoT Device Adapter Interface
 * All device adapters must implement this interface
 */
export interface IoTDeviceAdapter {
  deviceId: string;
  spec: DeviceSpec;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';

  // Core device operations
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  execute(operation: DeviceControlRequest): Promise<ExecutionResult>;

  // Device information
  getCapabilities(): Promise<DeviceCapability[]>;
  getStatus(): Promise<DeviceStatus>;

  // Event handling
  on(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
  removeAllListeners(event?: string): this;
}

export interface DeviceStatus {
  isOnline: boolean;
  batteryLevel?: number;
  signalStrength?: number;
  lastCommunication: Date;
  uptime?: number;
  errorCount: number;
  warnings: string[];
}

/**
 * Abstract base class for device adapters
 */
export abstract class BaseIoTDeviceAdapter extends EventEmitter implements IoTDeviceAdapter {
  public deviceId: string;
  public spec: DeviceSpec;
  public status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  protected connectionId?: string;
  protected lastHeartbeat?: Date;

  constructor(spec: DeviceSpec) {
    super();
    this.deviceId = spec.deviceId;
    this.spec = spec;

    // Set up event forwarding
    this.setupEventHandlers();
  }

  /**
   * Abstract methods that must be implemented by concrete adapters
   */
  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract execute(operation: DeviceControlRequest): Promise<ExecutionResult>;

  /**
   * Standard implementation for capability retrieval
   */
  async getCapabilities(): Promise<DeviceCapability[]> {
    return this.spec.capabilities;
  }

  /**
   * Standard implementation for status retrieval
   */
  async getStatus(): Promise<DeviceStatus> {
    const isOnline = this.status === 'connected';

    return {
      isOnline,
      lastCommunication: this.lastHeartbeat || new Date(),
      errorCount: 0,
      warnings: [],
      uptime: this.lastHeartbeat ? Date.now() - this.lastHeartbeat.getTime() : 0
    };
  }

  /**
   * Common event handlers setup
   */
  protected setupEventHandlers(): void {
    this.on('connect', () => {
      this.status = 'connected';
      this.lastHeartbeat = new Date();
    });

    this.on('disconnect', () => {
      this.status = 'disconnected';
    });

    this.on('error', (error) => {
      this.status = 'error';
      console.error(`Device ${this.deviceId} error:`, error);
    });
  }

  /**
   * Validate parameters against device capability specification
   */
  protected validateParameters(operation: DeviceControlRequest): void {
    const capability = this.spec.capabilities.find(cap => cap.name === operation.capability);
    if (!capability) {
      throw new Error(`Capability '${operation.capability}' not supported by device ${this.deviceId}`);
    }

    for (const param of capability.parameters) {
      const value = operation.parameters[param.name];

      if (param.required && (value === undefined || value === null)) {
        throw new Error(`Required parameter '${param.name}' missing`);
      }

      if (value !== undefined && param.validation) {
        this.validateParameterValue(param, value);
      }
    }
  }

  /**
   * Validate individual parameter value
   */
  protected validateParameterValue(param: Parameter, value: any): void {
    if (!param.validation) return;

    for (const rule of param.validation) {
      switch (rule.type) {
        case 'required':
          if (!value) {
            throw new Error(`${param.name}: ${rule.message}`);
          }
          break;
        case 'min':
          if (typeof value === 'number' && value < rule.value) {
            throw new Error(`${param.name}: ${rule.message}`);
          }
          break;
        case 'max':
          if (typeof value === 'number' && value > rule.value) {
            throw new Error(`${param.name}: ${rule.message}`);
          }
          break;
        case 'pattern':
          if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
            throw new Error(`${param.name}: ${rule.message}`);
          }
          break;
        case 'custom':
          if (rule.customValidator && !rule.customValidator(value)) {
            throw new Error(`${param.name}: ${rule.message}`);
          }
          break;
      }
    }
  }

  /**
   * Apply safety rules for the operation
   */
  protected async applySafetyChecks(operation: DeviceControlRequest): Promise<void> {
    for (const rule of this.spec.safetyRules) {
      if (!rule.enabled) continue;

      const shouldApplyRule = rule.hospitalSpecific
        ? (this.spec.category === 'medical' && this.spec.medicalOverride)
        : true;

      if (!shouldApplyRule) continue;

      // Check if operation parameters violate safety rule
      for (const [paramName, value] of Object.entries(operation.parameters)) {
        const paramRule = rule.rule;

        switch (rule.type) {
          case 'range_check':
            if (typeof value === 'number' && (value < paramRule.min || value > paramRule.max)) {
              throw new Error(`Safety violation: ${paramName} value ${value} outside allowed range ${paramRule.min}-${paramRule.max}`);
            }
            break;
          case 'whitelist':
            if (!paramRule.values.includes(value)) {
              throw new Error(`Safety violation: ${paramName} value ${value} not in allowed values`);
            }
            break;
          case 'blacklist':
            if (paramRule.values.includes(value)) {
              throw new Error(`Safety violation: ${paramName} value ${value} in forbidden values`);
            }
            break;
          case 'pattern':
            if (typeof value === 'string' && !new RegExp(paramRule.pattern).test(value)) {
              throw new Error(`Safety violation: ${paramName} value ${value} doesn't match required pattern`);
            }
            break;
          case 'emergency':
            if (operation.priority !== 'urgent' && operation.priority !== 'emergency') {
              throw new Error(`Emergency operation ${paramName} requires urgent/emergency priority`);
            }
            break;
        }
      }
    }
  }
}

/**
 * Factory interface for creating device adapters
 */
export interface DeviceAdapterFactory {
  createAdapter(spec: DeviceSpec): Promise<IoTDeviceAdapter>;
  supports(protocol: DeviceProtocol, deviceType: string): boolean;
}

/**
 * Standard adapter factory implementation
 */
export class StandardDeviceAdapterFactory implements DeviceAdapterFactory {
  private protocolAdapters: Map<DeviceProtocol, new (spec: DeviceSpec) => IoTDeviceAdapter>;

  constructor() {
    this.protocolAdapters = new Map();
  }

  registerProtocol(protocol: DeviceProtocol, adapterClass: new (spec: DeviceSpec) => IoTDeviceAdapter): void {
    this.protocolAdapters.set(protocol, adapterClass);
  }

  async createAdapter(spec: DeviceSpec): Promise<IoTDeviceAdapter> {
    const AdapterClass = this.protocolAdapters.get(spec.protocol);
    if (!AdapterClass) {
      throw new Error(`No adapter registered for protocol: ${spec.protocol}`);
    }

    return new AdapterClass(spec);
  }

  supports(protocol: DeviceProtocol, deviceType: string): boolean {
    return this.protocolAdapters.has(protocol);
  }
}