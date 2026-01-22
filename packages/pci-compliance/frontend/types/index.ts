/**
 * PCI DSS Compliance Suite - Type Definitions
 */

// Configuration
export interface PCIConfig {
    encryptionKey: string;
    environment?: 'production' | 'sandbox';
    apiEndpoint?: string;
}

// SAQ Types
export type SAQType = 'A' | 'A-EP' | 'B' | 'B-IP' | 'C' | 'C-VT' | 'D' | 'P2PE';

// Compliance Status
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';

// Requirement Categories
export type RequirementCategory =
    | 'network_security'
    | 'data_protection'
    | 'vulnerability_management'
    | 'access_control'
    | 'monitoring'
    | 'security_policy';

// Scan Status
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';

// PAN Validation
export interface PANValidationParams {
    pan: string;
    checkLuhn?: boolean;
    identifyIssuer?: boolean;
}

export interface PANValidationResult {
    valid: boolean;
    issuer?: string;
    cardType?: string;
    maskedPan: string;
}

// PAN Masking
export interface PANMaskParams {
    pan: string;
    visibleFirst?: number;
    visibleLast?: number;
    maskChar?: string;
}

export interface PANMaskResult {
    maskedPan: string;
    originalLength: number;
}

// Assessment
export interface AssessmentParams {
    saqType: SAQType;
    requirements?: string[];
    includeEvidence?: boolean;
}

export interface RequirementResult {
    requirementId: string;
    description: string;
    status: ComplianceStatus;
    findings?: string[];
    remediation?: string;
}

export interface AssessmentResult {
    assessmentId: string;
    saqType: SAQType;
    overallStatus: ComplianceStatus;
    requirements: RequirementResult[];
    compliantCount: number;
    nonCompliantCount: number;
    completedAt: Date;
}

// Requirements
export interface PCIRequirement {
    id: string;
    category: RequirementCategory;
    title: string;
    description: string;
    subRequirements?: string[];
}

export interface RequirementsResult {
    requirements: PCIRequirement[];
    totalCount: number;
    version: string;
}

// Vulnerability Scan
export interface ScanParams {
    target: string;
    scanType?: 'internal' | 'external';
    asvScan?: boolean;
}

export interface Vulnerability {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    cvssScore?: number;
    title: string;
    description: string;
    remediation?: string;
}

export interface ScanResult {
    scanId: string;
    status: ScanStatus;
    target: string;
    vulnerabilities?: Vulnerability[];
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    startedAt: Date;
    completedAt?: Date;
}

// Service Events
export interface PCIEventMap {
    'pan:validated': PANValidationResult;
    'pan:masked': PANMaskResult;
    'assessment:completed': AssessmentResult;
    'scan:started': ScanResult;
    'scan:completed': ScanResult;
    'error': Error;
}
