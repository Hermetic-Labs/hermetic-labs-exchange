/**
 * SOX Compliance Suite - Type Definitions
 */

// Configuration
export interface SOXConfig {
    companyId: string;
    fiscalYear?: number;
    apiEndpoint?: string;
}

// Control Types
export type ControlType = 'preventive' | 'detective' | 'corrective';

// Control Frequency
export type ControlFrequency =
    | 'continuous'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'annually';

// Test Results
export type TestResult = 'effective' | 'ineffective' | 'not_tested';

// Deficiency Severity
export type DeficiencySeverity =
    | 'control_deficiency'
    | 'significant_deficiency'
    | 'material_weakness';

// Control Status
export type ControlStatus = 'active' | 'inactive' | 'under_review';

// Control
export interface ControlParams {
    name: string;
    description?: string;
    controlType: ControlType;
    frequency: ControlFrequency;
    ownerId: string;
    processArea: string;
    assertion?: string[];
    automationLevel?: string;
}

export interface Control {
    id: string;
    name: string;
    description?: string;
    controlType: ControlType;
    frequency: ControlFrequency;
    ownerId: string;
    processArea: string;
    status: ControlStatus;
    createdAt: Date;
    lastTested?: Date;
}

export interface ControlListResult {
    controls: Control[];
    totalCount: number;
    page: number;
    pageSize: number;
}

// Control Test
export interface ControlTestParams {
    controlId: string;
    testDate: Date;
    testerId: string;
    result: TestResult;
    sampleSize?: number;
    exceptionsFound?: number;
    evidence?: string[];
    notes?: string;
}

export interface ControlTestResult {
    id: string;
    controlId: string;
    testDate: Date;
    testerId: string;
    result: TestResult;
    exceptionsFound: number;
    createdAt: Date;
}

// SOD Check
export interface SODCheckParams {
    userId: string;
    proposedRole: string;
    checkExisting?: boolean;
}

export interface SODConflict {
    conflictingRole: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    description: string;
}

export interface SODCheckResult {
    hasConflicts: boolean;
    conflicts: SODConflict[];
    userId: string;
    proposedRole: string;
    checkedAt: Date;
}

// Deficiency
export interface DeficiencyParams {
    controlId: string;
    description: string;
    severity: DeficiencySeverity;
    identifiedDate: Date;
    identifiedBy: string;
    rootCause?: string;
    remediationPlan?: string;
    targetRemediationDate?: Date;
}

export interface DeficiencyResult {
    id: string;
    controlId: string;
    description: string;
    severity: DeficiencySeverity;
    status: string;
    identifiedDate: Date;
    targetRemediationDate?: Date;
    createdAt: Date;
}

// Audit Trail
export interface AuditTrailEntry {
    id: string;
    timestamp: Date;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
}

export interface AuditTrailResult {
    entries: AuditTrailEntry[];
    totalCount: number;
    page: number;
    pageSize: number;
}

// Service Events
export interface SOXEventMap {
    'control:created': Control;
    'control:tested': ControlTestResult;
    'sod:checked': SODCheckResult;
    'deficiency:reported': DeficiencyResult;
    'error': Error;
}
