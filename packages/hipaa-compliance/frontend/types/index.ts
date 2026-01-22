/**
 * HIPAA Privacy Suite - Type Definitions
 */

// Configuration
export interface HIPAAConfig {
    encryptionKey: string;
    auditEnabled?: boolean;
    strictMode?: boolean;
    apiEndpoint?: string;
}

// PHI Categories
export type PHICategory =
    | 'name'
    | 'ssn'
    | 'date_of_birth'
    | 'address'
    | 'phone'
    | 'email'
    | 'medical_record_number'
    | 'insurance_id'
    | 'biometric'
    | 'photo';

// Access Purpose
export type AccessPurpose =
    | 'treatment'
    | 'payment'
    | 'operations'
    | 'research'
    | 'emergency';

// Breach Severity
export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';

// PHI Detection
export interface PHIDetectionParams {
    text: string;
    categories?: PHICategory[];
    includeConfidence?: boolean;
}

export interface PHIEntity {
    text: string;
    category: PHICategory;
    startIndex: number;
    endIndex: number;
    confidence: number;
}

export interface PHIDetectionResult {
    entities: PHIEntity[];
    phiDetected: boolean;
    scanTimestamp: Date;
}

// PHI Masking
export interface PHIMaskParams {
    text: string;
    maskChar?: string;
    categories?: PHICategory[];
    preserveFormat?: boolean;
}

export interface PHIMaskResult {
    maskedText: string;
    entitiesMasked: number;
    originalLength: number;
}

// Access Validation
export interface AccessValidationParams {
    userId: string;
    resourceType: string;
    resourceId?: string;
    purpose: AccessPurpose;
    minimumNecessary?: boolean;
}

export interface AccessValidationResult {
    allowed: boolean;
    reason?: string;
    restrictions?: string[];
    auditId: string;
}

// Audit Log
export interface AuditLogEntry {
    id: string;
    timestamp: Date;
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    purpose?: AccessPurpose;
    success: boolean;
    ipAddress?: string;
    details?: Record<string, unknown>;
}

export interface AuditLogResult {
    entries: AuditLogEntry[];
    totalCount: number;
    page: number;
    pageSize: number;
}

// Breach Reporting
export interface BreachReportParams {
    description: string;
    affectedRecords: number;
    phiTypes: PHICategory[];
    discoveryDate: Date;
    severity: BreachSeverity;
    containmentActions?: string[];
}

export interface BreachReportResult {
    reportId: string;
    status: string;
    notificationRequired: boolean;
    notificationDeadline?: Date;
    createdAt: Date;
}

// Service Events
export interface HIPAAEventMap {
    'phi:detected': PHIDetectionResult;
    'phi:masked': PHIMaskResult;
    'access:validated': AccessValidationResult;
    'breach:reported': BreachReportResult;
    'error': Error;
}
