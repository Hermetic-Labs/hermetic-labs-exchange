/**
 * Device Safety Framework
 * 
 * Safety checks and validation framework for critical IoT operations.
 * Provides comprehensive safety validation, medical device oversight, and emergency protocols.
 */

import { DeviceControlRequest, DeviceCategory, MedicalContext } from './IoTDeviceAdapter';

// Safety Level Definitions
export type SafetyLevel = 'low' | 'medium' | 'high' | 'critical' | 'emergency';

// Safety Check Types
export type SafetyCheckType = 'parameter_validation' | 'access_control' | 'medical_override' | 'rate_limiting' | 'device_state' | 'emergency_protocol';

// Safety Violation
export interface SafetyViolation {
  id: string;
  type: SafetyCheckType;
  severity: SafetyLevel;
  message: string;
  deviceId: string;
  userId: string;
  timestamp: Date;
  context: SafetyContext;
  suggestion?: string;
  emergencyStopRequired?: boolean;
  medicalOverride?: boolean;
}

// Safety Context
export interface SafetyContext {
  deviceCategory: DeviceCategory;
  userPermissions: string[];
  location?: string;
  emergencyMode?: boolean;
  medicalContext?: MedicalContext;
  networkTrustLevel?: 'trusted' | 'untrusted' | 'unknown';
  deviceSecurityLevel?: SafetyLevel;
  operationRisk?: SafetyLevel;
}

// Safety Check Result
export interface SafetyCheckResult {
  passed: boolean;
  violations: SafetyViolation[];
  warnings: SafetyWarning[];
  suggestions: string[];
  requiresConfirmation: boolean;
  emergencyProtocolTriggered?: boolean;
}

// Safety Warning
export interface SafetyWarning {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

// Medical Device Safety Profile
export interface MedicalDeviceSafetyProfile {
  deviceType: string;
  manufacturer: string;
  model: string;
  safetyLevel: SafetyLevel;
  criticalParameters: CriticalParameter[];
  emergencyProcedures: EmergencyProcedure[];
  requiredPermissions: string[];
  supervisionRequirements: SupervisionRequirement[];
  auditLogging: AuditLogConfig;
}

// Critical Parameter Definition
export interface CriticalParameter {
  name: string;
  minValue: number;
  maxValue: number;
  units: string;
  criticalThreshold: number;
  escalationRequired: boolean;
  emergencyStop: boolean;
}

// Emergency Procedure
export interface EmergencyProcedure {
  id: string;
  name: string;
  description: string;
  triggerConditions: string[];
  actions: EmergencyAction[];
  requiresAuthorization: boolean;
  timeout: number;
}

// Emergency Action
export interface EmergencyAction {
  type: 'stop_all' | 'set_safe_state' | 'notify_supervisor' | 'activate_backup' | 'emergency_shutdown';
  parameters: Record<string, any>;
  target?: string;
  sequence: number;
}

// Supervision Requirement
export interface SupervisionRequirement {
  type: 'physician_approval' | 'nurse_supervision' | 'two_person_verification' | 'automated_monitoring';
  conditions: string[];
  timeout?: number;
  fallback?: string;
}

// Audit Log Configuration
export interface AuditLogConfig {
  enabled: boolean;
  logLevel: 'minimal' | 'standard' | 'comprehensive';
  retentionDays: number;
  includeDeviceState: boolean;
  includeUserContext: boolean;
  includeMedicalData: boolean;
  requiredFields: string[];
}

// Base Safety Checker
export abstract class BaseSafetyChecker {
  abstract checkType: SafetyCheckType;
  abstract priority: number;

  abstract validate(request: DeviceControlRequest, context: SafetyContext): Promise<SafetyCheckResult>;
}

// Parameter Validation Checker
export class ParameterValidationChecker extends BaseSafetyChecker {
  public checkType: SafetyCheckType = 'parameter_validation';
  public priority = 1;

  async validate(request: DeviceControlRequest, context: SafetyContext): Promise<SafetyCheckResult> {
    const violations: SafetyViolation[] = [];
    const warnings: SafetyWarning[] = [];
    const suggestions: string[] = [];

    // Check required parameters
    for (const [key, value] of Object.entries(request.parameters)) {
      if (value === undefined || value === null) {
        violations.push(this.createViolation(
          'MISSING_REQUIRED_PARAMETER',
          'high',
          `Required parameter '${key}' is missing`,
          request,
          context
        ));
      } else if (typeof value === 'string') {
        // Check for dangerous characters
        if (this.containsDangerousCharacters(value)) {
          violations.push(this.createViolation(
            'DANGEROUS_CHARACTERS',
            'high',
            `Parameter '${key}' contains dangerous characters`,
            request,
            context,
            'Sanitize input to remove potentially harmful characters'
          ));
        }

        // Check length limits
        if (value.length > 1000) {
          warnings.push({
            type: 'PARAMETER_TOO_LONG',
            message: `Parameter '${key}' is very long (${value.length} characters)`,
            severity: 'medium',
            suggestion: 'Consider breaking down into smaller chunks'
          });
        }
      }
    }

    // Device-specific parameter validation
    if (context.deviceCategory === 'medical') {
      await this.validateMedicalParameters(request, context, violations);
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      suggestions,
      requiresConfirmation: violations.some(v => v.severity === 'critical')
    };
  }

  private containsDangerousCharacters(value: string): boolean {
    const dangerousChars = /[<>"'`&|;$(){}[\]\\]/;
    return dangerousChars.test(value);
  }

  private async validateMedicalParameters(
    request: DeviceControlRequest,
    context: SafetyContext,
    violations: SafetyViolation[]
  ): Promise<void> {
    // Validate medical-specific parameters
    if (request.capability.includes('rate') || request.capability.includes('dose')) {
      const rate = request.parameters.rate || request.parameters.dose;
      if (typeof rate === 'number') {
        if (rate < 0) {
          violations.push(this.createViolation(
            'NEGATIVE_MEDICAL_VALUE',
            'critical',
            'Medical rates/doses cannot be negative',
            request,
            context,
            'Set positive value for medical parameters'
          ));
        }

        if (rate > 1000) {
          violations.push(this.createViolation(
            'EXCESSIVE_MEDICAL_VALUE',
            'critical',
            'Medical rate/dose exceeds safe limit',
            request,
            context,
            'Reduce value to safe range'
          ));
        }
      }
    }

    // Check for emergency procedures
    if (request.priority === 'emergency') {
      const emergencyContext = context.medicalContext;
      if (!emergencyContext) {
        violations.push(this.createViolation(
          'EMERGENCY_WITHOUT_CONTEXT',
          'critical',
          'Emergency operation without medical context',
          request,
          context,
          'Provide medical context for emergency operations'
        ));
      }
    }
  }

  private createViolation(
    type: string,
    severity: SafetyLevel,
    message: string,
    request: DeviceControlRequest,
    context: SafetyContext,
    suggestion?: string
  ): SafetyViolation {
    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'parameter_validation',
      severity,
      message,
      deviceId: request.deviceId,
      userId: request.userContext?.userId || 'unknown',
      timestamp: new Date(),
      context,
      suggestion,
      emergencyStopRequired: severity === 'critical',
      medicalOverride: context.deviceCategory === 'medical'
    };
  }
}

// Access Control Checker
export class AccessControlChecker extends BaseSafetyChecker {
  public checkType: SafetyCheckType = 'access_control';
  public priority = 2;

  async validate(request: DeviceControlRequest, context: SafetyContext): Promise<SafetyCheckResult> {
    const violations: SafetyViolation[] = [];
    const warnings: SafetyWarning[] = [];
    const suggestions: string[] = [];

    if (!request.userContext) {
      violations.push(this.createViolation(
        'NO_USER_CONTEXT',
        'high',
        'Operation requires user context',
        request,
        context
      ));
      return { passed: false, violations, warnings, suggestions, requiresConfirmation: true };
    }

    // Check user permissions
    const requiredPermissions = this.getRequiredPermissions(request.capability, context.deviceCategory);
    const userPermissions = request.userContext.permissions || [];
    const missingPermissions = requiredPermissions.filter(p => !userPermissions.includes(p));

    if (missingPermissions.length > 0) {
      violations.push(this.createViolation(
        'INSUFFICIENT_PERMISSIONS',
        context.deviceCategory === 'medical' ? 'critical' : 'high',
        `Missing required permissions: ${missingPermissions.join(', ')}`,
        request,
        context,
        'Contact administrator for required permissions'
      ));
    }

    // Location-based access control
    if (context.location && context.deviceCategory === 'medical') {
      const allowedLocations = this.getAllowedMedicalLocations(userPermissions);
      if (!allowedLocations.includes(context.location)) {
        violations.push(this.createViolation(
          'UNAUTHORIZED_LOCATION',
          'critical',
          `Medical device access not allowed from location: ${context.location}`,
          request,
          context,
          'Verify location authorization for medical device access'
        ));
      }
    }

    // Emergency override for medical devices
    if (context.deviceCategory === 'medical' && request.userContext.emergencyMode) {
      if (!request.userContext.medicalContext) {
        violations.push(this.createViolation(
          'EMERGENCY_WITHOUT_MEDICAL_CONTEXT',
          'critical',
          'Emergency medical operation requires medical context',
          request,
          context,
          'Provide patient ID and procedure information'
        ));
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      suggestions,
      requiresConfirmation: violations.some(v => v.severity === 'critical')
    };
  }

  private getRequiredPermissions(capability: string, category: DeviceCategory): string[] {
    const basePermissions = ['device_control'];

    if (category === 'medical') {
      return ['medical_device_access', 'patient_data_access'];
    }

    if (capability.includes('admin') || capability.includes('config')) {
      return ['device_admin', 'system_configuration'];
    }

    return basePermissions;
  }

  private getAllowedMedicalLocations(permissions: string[]): string[] {
    if (permissions.includes('emergency_medical_access')) {
      return ['emergency_room', 'operating_room', 'icu', 'any_location'];
    }

    if (permissions.includes('floor_medical_access')) {
      return ['patient_room', 'nurse_station', 'treatment_room'];
    }

    return [];
  }

  private createViolation(
    type: string,
    severity: SafetyLevel,
    message: string,
    request: DeviceControlRequest,
    context: SafetyContext,
    suggestion?: string
  ): SafetyViolation {
    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'access_control',
      severity,
      message,
      deviceId: request.deviceId,
      userId: request.userContext?.userId || 'unknown',
      timestamp: new Date(),
      context,
      suggestion,
      emergencyStopRequired: severity === 'critical',
      medicalOverride: context.deviceCategory === 'medical'
    };
  }
}

// Medical Override Checker
export class MedicalOverrideChecker extends BaseSafetyChecker {
  public checkType: SafetyCheckType = 'medical_override';
  public priority = 3;

  async validate(request: DeviceControlRequest, context: SafetyContext): Promise<SafetyCheckResult> {
    const violations: SafetyViolation[] = [];
    const warnings: SafetyWarning[] = [];
    const suggestions: string[] = [];
    let emergencyProtocolTriggered = false;

    if (context.deviceCategory !== 'medical') {
      return { passed: true, violations, warnings, suggestions, requiresConfirmation: false };
    }

    // Check for emergency protocols
    if (request.priority === 'emergency' || context.emergencyMode) {
      emergencyProtocolTriggered = true;
      warnings.push({
        type: 'EMERGENCY_PROTOCOL',
        message: 'Emergency medical protocol activated',
        severity: 'high',
        suggestion: 'Ensure all required documentation is completed'
      });
    }

    // Check supervision requirements
    const supervisionViolation = await this.checkSupervisionRequirements(request, context);
    if (supervisionViolation) {
      violations.push(supervisionViolation);
    }

    // Check critical parameter thresholds
    const criticalViolation = await this.checkCriticalParameters(request, context);
    if (criticalViolation) {
      violations.push(criticalViolation);
      violations[violations.length - 1].emergencyStopRequired = true;
    }

    // Validate medical procedure context
    if (context.medicalContext) {
      const contextViolation = this.validateMedicalContext(request, context.medicalContext);
      if (contextViolation) {
        violations.push(contextViolation);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      suggestions,
      requiresConfirmation: violations.length > 0,
      emergencyProtocolTriggered
    };
  }

  private async checkSupervisionRequirements(
    request: DeviceControlRequest,
    context: SafetyContext
  ): Promise<SafetyViolation | null> {
    if (!context.medicalContext?.procedureType) {
      return null;
    }

    const procedureType = context.medicalContext.procedureType;

    // High-risk procedures require supervision
    const highRiskProcedures = ['surgery', 'anesthesia', 'critical_care'];

    if (highRiskProcedures.includes(procedureType)) {
      const userPermissions = context.userPermissions || [];

      if (!userPermissions.includes('medical_supervision')) {
        return this.createViolation(
          'SUPERVISION_REQUIRED',
          'critical',
          `${procedureType} requires medical supervision`,
          request,
          context,
          'Obtain supervision approval for high-risk procedure'
        );
      }
    }

    return null;
  }

  private async checkCriticalParameters(
    request: DeviceControlRequest,
    context: SafetyContext
  ): Promise<SafetyViolation | null> {
    // Check for critical parameter limits
    for (const [key, value] of Object.entries(request.parameters)) {
      if (typeof value === 'number') {
        // Simulate critical parameter validation
        if (key.includes('rate') && value > 100) {
          return this.createViolation(
            'CRITICAL_RATE_EXCEEDED',
            'critical',
            `Critical rate parameter '${key}' exceeds safe limit: ${value}`,
            request,
            context,
            'Reduce rate to safe operational range'
          );
        }

        if (key.includes('dose') && value > 500) {
          return this.createViolation(
            'CRITICAL_DOSE_EXCEEDED',
            'critical',
            `Critical dose parameter '${key}' exceeds safe limit: ${value}`,
            request,
            context,
            'Verify dosage calculation and reduce if necessary'
          );
        }
      }
    }

    return null;
  }

  private validateMedicalContext(
    request: DeviceControlRequest,
    medicalContext: MedicalContext
  ): SafetyViolation | null {
    // Validate medical context completeness
    if (medicalContext.urgencyLevel === 'emergency' && !medicalContext.attendingPhysician) {
      return this.createViolation(
        'EMERGENCY_WITHOUT_PHYSICIAN',
        'critical',
        'Emergency medical operation must have attending physician assigned',
        request,
        { deviceCategory: 'medical', userPermissions: [], medicalContext } as SafetyContext,
        'Assign attending physician to emergency operation'
      );
    }

    return null;
  }

  private createViolation(
    type: string,
    severity: SafetyLevel,
    message: string,
    request: DeviceControlRequest,
    context: SafetyContext,
    suggestion?: string
  ): SafetyViolation {
    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'medical_override',
      severity,
      message,
      deviceId: request.deviceId,
      userId: request.userContext?.userId || 'unknown',
      timestamp: new Date(),
      context,
      suggestion,
      emergencyStopRequired: severity === 'critical',
      medicalOverride: true
    };
  }
}

// Rate Limiting Checker
export class RateLimitingChecker extends BaseSafetyChecker {
  public checkType: SafetyCheckType = 'rate_limiting';
  public priority = 4;

  private operationCounts = new Map<string, { count: number; resetTime: number }>();

  async validate(request: DeviceControlRequest, context: SafetyContext): Promise<SafetyCheckResult> {
    const violations: SafetyViolation[] = [];
    const warnings: SafetyWarning[] = [];
    const suggestions: string[] = [];

    const userId = request.userContext?.userId || 'unknown';
    const operationKey = `${userId}:${request.deviceId}:${request.capability}`;

    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxOperationsPerWindow = this.getRateLimit(request, context);

    // Clean up expired entries
    for (const [key, data] of this.operationCounts.entries()) {
      if (data.resetTime <= now) {
        this.operationCounts.delete(key);
      }
    }

    // Check current operation count
    const operationData = this.operationCounts.get(operationKey);
    if (operationData && operationData.count >= maxOperationsPerWindow) {
      violations.push(this.createViolation(
        'RATE_LIMIT_EXCEEDED',
        'medium',
        `Rate limit exceeded: ${operationData.count} operations per minute`,
        request,
        context,
        'Wait before attempting additional operations'
      ));
    } else {
      // Increment operation count
      const newCount = (operationData?.count || 0) + 1;
      this.operationCounts.set(operationKey, {
        count: newCount,
        resetTime: now + windowMs
      });
    }

    // Check for suspicious activity patterns
    if (context.deviceCategory === 'medical') {
      const medicalActivity = this.checkMedicalActivityPattern(userId, request, context);
      if (medicalActivity) {
        warnings.push(medicalActivity);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      suggestions,
      requiresConfirmation: false
    };
  }

  private getRateLimit(request: DeviceControlRequest, context: SafetyContext): number {
    if (context.deviceCategory === 'medical') {
      return 10; // Lower rate limit for medical devices
    }

    if (request.priority === 'high' || request.priority === 'urgent') {
      return 20; // Higher limit for urgent operations
    }

    return 30; // Standard rate limit
  }

  private checkMedicalActivityPattern(
    userId: string,
    request: DeviceControlRequest,
    context: SafetyContext
  ): SafetyWarning | null {
    // Check for unusual medical device activity
    const recentOperations = Array.from(this.operationCounts.entries())
      .filter(([key]) => key.startsWith(userId) && key.includes('medical'));

    if (recentOperations.length > 50) {
      return {
        type: 'HIGH_MEDICAL_ACTIVITY',
        message: 'High volume of medical device operations detected',
        severity: 'high',
        suggestion: 'Review medical device usage patterns'
      };
    }

    return null;
  }

  private createViolation(
    type: string,
    severity: SafetyLevel,
    message: string,
    request: DeviceControlRequest,
    context: SafetyContext,
    suggestion?: string
  ): SafetyViolation {
    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'rate_limiting',
      severity,
      message,
      deviceId: request.deviceId,
      userId: request.userContext?.userId || 'unknown',
      timestamp: new Date(),
      context,
      suggestion,
      medicalOverride: context.deviceCategory === 'medical'
    };
  }
}

// Device State Checker
export class DeviceStateChecker extends BaseSafetyChecker {
  public checkType: SafetyCheckType = 'device_state';
  public priority = 5;

  async validate(request: DeviceControlRequest, context: SafetyContext): Promise<SafetyCheckResult> {
    const violations: SafetyViolation[] = [];
    const warnings: SafetyWarning[] = [];
    const suggestions: string[] = [];

    // Simulate device state checking
    // In a real implementation, this would query the actual device state

    const deviceStatus = await this.getDeviceStatus(request.deviceId);

    if (!deviceStatus.isOnline) {
      violations.push(this.createViolation(
        'DEVICE_OFFLINE',
        'high',
        'Target device is offline or unreachable',
        request,
        context,
        'Check device connectivity and power status'
      ));
    }

    if (deviceStatus.errorCount > 5) {
      warnings.push({
        type: 'DEVICE_HIGH_ERROR_COUNT',
        message: `Device has reported ${deviceStatus.errorCount} recent errors`,
        severity: 'medium',
        suggestion: 'Investigate device error reports'
      });
    }

    if (deviceStatus.batteryLevel !== undefined && deviceStatus.batteryLevel < 20) {
      violations.push(this.createViolation(
        'LOW_DEVICE_BATTERY',
        context.deviceCategory === 'medical' ? 'critical' : 'medium',
        `Device battery level low: ${deviceStatus.batteryLevel}%`,
        request,
        context,
        'Charge device battery before operation'
      ));
    }

    // Check if device supports requested capability
    if (!deviceStatus.supportedCapabilities.includes(request.capability)) {
      violations.push(this.createViolation(
        'UNSUPPORTED_CAPABILITY',
        'high',
        `Device does not support capability: ${request.capability}`,
        request,
        context,
        'Use supported device capabilities'
      ));
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      suggestions,
      requiresConfirmation: violations.some(v => v.severity === 'critical')
    };
  }

  private async getDeviceStatus(deviceId: string): Promise<any> {
    // Simulate device status retrieval
    // In a real implementation, this would communicate with the actual device
    return {
      isOnline: Math.random() > 0.1, // 90% chance device is online
      errorCount: Math.floor(Math.random() * 10),
      batteryLevel: 20 + Math.random() * 80, // 20-100%
      supportedCapabilities: ['power', 'status', 'control', 'monitor'],
      lastCommunication: new Date()
    };
  }

  private createViolation(
    type: string,
    severity: SafetyLevel,
    message: string,
    request: DeviceControlRequest,
    context: SafetyContext,
    suggestion?: string
  ): SafetyViolation {
    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'device_state',
      severity,
      message,
      deviceId: request.deviceId,
      userId: request.userContext?.userId || 'unknown',
      timestamp: new Date(),
      context,
      suggestion,
      emergencyStopRequired: severity === 'critical',
      medicalOverride: context.deviceCategory === 'medical'
    };
  }
}

// Emergency Protocol Handler
export class EmergencyProtocolHandler {
  private activeEmergencies = new Map<string, EmergencyProcedure>();

  async handleEmergency(request: DeviceControlRequest, context: SafetyContext): Promise<void> {
    const emergencyKey = `${request.deviceId}:${Date.now()}`;

    // Stop all operations on affected device
    await this.stopAllDeviceOperations(request.deviceId);

    // Set device to safe state
    await this.setDeviceToSafeState(request.deviceId);

    // Notify medical staff if medical device
    if (context.deviceCategory === 'medical') {
      await this.notifyMedicalStaff(request, context);
    }

    // Log emergency incident
    await this.logEmergencyIncident(request, context);

    this.activeEmergencies.set(emergencyKey, {
      id: emergencyKey,
      name: 'Emergency Stop',
      description: 'Emergency protocol activated',
      triggerConditions: ['emergency_request', 'critical_safety_violation'],
      actions: [
        { type: 'stop_all', parameters: {}, sequence: 1 },
        { type: 'set_safe_state', parameters: {}, sequence: 2 }
      ],
      requiresAuthorization: false,
      timeout: 0
    });
  }

  private async stopAllDeviceOperations(deviceId: string): Promise<void> {
    // In a real implementation, this would send stop commands to the device
    console.log(`Stopping all operations on device: ${deviceId}`);
  }

  private async setDeviceToSafeState(deviceId: string): Promise<void> {
    // In a real implementation, this would set the device to a predefined safe state
    console.log(`Setting device ${deviceId} to safe state`);
  }

  private async notifyMedicalStaff(request: DeviceControlRequest, context: SafetyContext): Promise<void> {
    // In a real implementation, this would send alerts to medical staff
    console.log(`Notifying medical staff of emergency on device: ${request.deviceId}`);
  }

  private async logEmergencyIncident(request: DeviceControlRequest, context: SafetyContext): Promise<void> {
    // In a real implementation, this would write to audit logs
    console.log(`Logging emergency incident for device: ${request.deviceId}`);
  }
}

// Main Safety Manager
export class DeviceSafetyManager {
  private checkers = new Map<SafetyCheckType, BaseSafetyChecker>();
  private safetyProfiles = new Map<string, MedicalDeviceSafetyProfile>();
  private auditLogs: any[] = [];
  private emergencyHandler = new EmergencyProtocolHandler();

  constructor() {
    this.setupCheckers();
    this.setupSafetyProfiles();
  }

  private setupCheckers(): void {
    this.checkers.set('parameter_validation', new ParameterValidationChecker());
    this.checkers.set('access_control', new AccessControlChecker());
    this.checkers.set('medical_override', new MedicalOverrideChecker());
    this.checkers.set('rate_limiting', new RateLimitingChecker());
    this.checkers.set('device_state', new DeviceStateChecker());
  }

  private setupSafetyProfiles(): void {
    // Initialize medical device safety profiles
    const profiles: MedicalDeviceSafetyProfile[] = [
      {
        deviceType: 'infusion_pump',
        manufacturer: 'Becton Dickinson',
        model: 'Alaris GP',
        safetyLevel: 'critical',
        criticalParameters: [
          { name: 'flow_rate', minValue: 0, maxValue: 1200, units: 'ml/hr', criticalThreshold: 1000, escalationRequired: true, emergencyStop: true },
          { name: 'volume', minValue: 0, maxValue: 1000, units: 'ml', criticalThreshold: 800, escalationRequired: true, emergencyStop: false }
        ],
        emergencyProcedures: [
          {
            id: 'emergency_stop',
            name: 'Emergency Stop',
            description: 'Immediately stop all infusion operations',
            triggerConditions: ['critical_error', 'medical_emergency'],
            actions: [
              { type: 'stop_all', parameters: {}, sequence: 1 }
            ],
            requiresAuthorization: false,
            timeout: 0
          }
        ],
        requiredPermissions: ['medical_device_control', 'infusion_management'],
        supervisionRequirements: [
          {
            type: 'physician_approval',
            conditions: ['new_prescription', 'parameter_change'],
            timeout: 300
          }
        ],
        auditLogging: {
          enabled: true,
          logLevel: 'comprehensive',
          retentionDays: 365,
          includeDeviceState: true,
          includeUserContext: true,
          includeMedicalData: true,
          requiredFields: ['timestamp', 'user_id', 'patient_id', 'operation', 'parameters', 'result']
        }
      }
    ];

    profiles.forEach(profile => {
      const key = `${profile.manufacturer}_${profile.deviceType}`;
      this.safetyProfiles.set(key, profile);
    });
  }

  async validateOperation(request: DeviceControlRequest, context: SafetyContext): Promise<SafetyCheckResult> {
    const allViolations: SafetyViolation[] = [];
    const allWarnings: SafetyWarning[] = [];
    const allSuggestions: string[] = [];
    let requiresConfirmation = false;
    let emergencyProtocolTriggered = false;

    // Run all safety checks in priority order
    const sortedCheckers = Array.from(this.checkers.values())
      .sort((a, b) => a.priority - b.priority);

    for (const checker of sortedCheckers) {
      try {
        const result = await checker.validate(request, context);

        allViolations.push(...result.violations);
        allWarnings.push(...result.warnings);
        allSuggestions.push(...result.suggestions);

        if (result.requiresConfirmation) {
          requiresConfirmation = true;
        }

        if (result.emergencyProtocolTriggered) {
          emergencyProtocolTriggered = true;
          await this.emergencyHandler.handleEmergency(request, context);
        }

        // Stop processing if critical violation found
        if (allViolations.some(v => v.severity === 'critical' && v.emergencyStopRequired)) {
          break;
        }

      } catch (error) {
        allViolations.push(this.createSystemViolation(
          'CHECKER_ERROR',
          'high',
          `Safety checker error: ${error instanceof Error ? error.message : String(error)}`,
          request,
          context
        ));
      }
    }

    // Determine overall result
    const criticalViolations = allViolations.filter(v => v.severity === 'critical');
    const _highViolations = allViolations.filter(v => v.severity === 'high');

    const passed = criticalViolations.length === 0;

    // Log safety check results
    await this.logSafetyCheck(request, context, {
      passed,
      violations: allViolations,
      warnings: allWarnings,
      suggestions: allSuggestions,
      requiresConfirmation,
      emergencyProtocolTriggered
    });

    return {
      passed,
      violations: allViolations,
      warnings: allWarnings,
      suggestions: allSuggestions,
      requiresConfirmation,
      emergencyProtocolTriggered
    };
  }

  private createSystemViolation(
    type: string,
    severity: SafetyLevel,
    message: string,
    request: DeviceControlRequest,
    context: SafetyContext
  ): SafetyViolation {
    return {
      id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'access_control', // Default type for system violations
      severity,
      message,
      deviceId: request.deviceId,
      userId: request.userContext?.userId || 'unknown',
      timestamp: new Date(),
      context,
      emergencyStopRequired: severity === 'critical',
      medicalOverride: context.deviceCategory === 'medical'
    };
  }

  private async logSafetyCheck(
    request: DeviceControlRequest,
    context: SafetyContext,
    result: SafetyCheckResult
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date(),
      deviceId: request.deviceId,
      userId: request.userContext?.userId || 'unknown',
      operation: request.capability,
      parameters: request.parameters,
      result: result.passed ? 'PASS' : 'FAIL',
      violations: result.violations.length,
      warnings: result.warnings.length,
      emergencyProtocol: result.emergencyProtocolTriggered,
      medicalContext: context.medicalContext
    };

    this.auditLogs.push(logEntry);

    // In a real implementation, this would write to persistent storage
    console.log('Safety check logged:', logEntry);
  }

  async getMedicalDeviceProfile(deviceType: string, manufacturer: string): Promise<MedicalDeviceSafetyProfile | undefined> {
    const key = `${manufacturer}_${deviceType}`;
    return this.safetyProfiles.get(key);
  }

  async addMedicalDeviceProfile(profile: MedicalDeviceSafetyProfile): Promise<void> {
    const key = `${profile.manufacturer}_${profile.deviceType}`;
    this.safetyProfiles.set(key, profile);
  }

  async getAuditLogs(limit: number = 100): Promise<any[]> {
    return this.auditLogs.slice(-limit);
  }

  async clearAuditLogs(): Promise<void> {
    this.auditLogs = [];
  }

  async forceEmergencyStop(deviceId: string, reason: string): Promise<void> {
    const emergencyRequest: DeviceControlRequest = {
      deviceId,
      capability: 'emergency_stop',
      parameters: { reason },
      timeout: 5000,
      priority: 'emergency',
      userContext: {
        userId: 'system',
        permissions: ['emergency_override'],
        emergencyMode: true,
        medicalContext: {
          urgencyLevel: 'emergency'
        }
      }
    };

    const context: SafetyContext = {
      deviceCategory: 'medical',
      userPermissions: ['emergency_override'],
      emergencyMode: true,
      deviceSecurityLevel: 'critical',
      operationRisk: 'critical'
    };

    await this.emergencyHandler.handleEmergency(emergencyRequest, context);
  }
}

// Global safety manager instance
export const deviceSafetyManager = new DeviceSafetyManager();

// Safety validation utilities
export class SafetyValidationUtils {
  static createSafetyContext(
    deviceCategory: DeviceCategory,
    userPermissions: string[],
    medicalContext?: MedicalContext
  ): SafetyContext {
    return {
      deviceCategory,
      userPermissions,
      medicalContext,
      networkTrustLevel: 'trusted',
      deviceSecurityLevel: deviceCategory === 'medical' ? 'critical' : 'medium',
      operationRisk: deviceCategory === 'medical' ? 'high' : 'medium'
    };
  }

  static validateEmergencyRequest(request: DeviceControlRequest): boolean {
    return (
      request.priority === 'emergency' ||
      (request.userContext?.emergencyMode === true)
    );
  }

  static requiresMedicalSupervision(capability: string, deviceCategory: DeviceCategory): boolean {
    if (deviceCategory !== 'medical') {
      return false;
    }

    const criticalCapabilities = ['start', 'stop', 'rate_change', 'dose_adjustment'];
    return criticalCapabilities.some(critical => capability.includes(critical));
  }

  static isCriticalOperation(capability: string, parameters: Record<string, any>): boolean {
    // Check if operation involves critical parameters
    const criticalParams = ['rate', 'dose', 'pressure', 'temperature'];

    for (const param of criticalParams) {
      if (parameters[param] !== undefined) {
        const value = parameters[param];
        if (typeof value === 'number' && (value > 100 || value < 0)) {
          return true;
        }
      }
    }

    return false;
  }
}