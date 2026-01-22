/**
 * FedRAMP Compliance Suite - Type Definitions
 */

// Configuration
export interface FedRAMPConfig {
    systemId: string;
    impactLevel?: ImpactLevel;
    apiEndpoint?: string;
}

// Impact Level
export type ImpactLevel = 'low' | 'moderate' | 'high';

// Control Families
export type ControlFamily =
    | 'AC' | 'AT' | 'AU' | 'CA' | 'CM' | 'CP'
    | 'IA' | 'IR' | 'MA' | 'MP' | 'PE' | 'PL'
    | 'PM' | 'PS' | 'RA' | 'SA' | 'SC' | 'SI' | 'SR';

// Implementation Status
export type ImplementationStatus =
    | 'implemented'
    | 'partially_implemented'
    | 'planned'
    | 'alternative'
    | 'not_applicable';

// POA&M Status
export type POAMStatus = 'open' | 'in_progress' | 'completed' | 'delayed';

// Risk Level
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

// Control Assessment
export interface ControlAssessmentParams {
    controlId: string;
    implementation: string;
    responsibleRole?: string;
    evidence?: string[];
}

export interface ControlAssessmentResult {
    assessmentId: string;
    controlId: string;
    status: ImplementationStatus;
    gaps?: string[];
    recommendations?: string[];
    assessedAt: Date;
}

// FedRAMP Control
export interface FedRAMPControl {
    id: string;
    family: ControlFamily;
    title: string;
    description: string;
    baselineImpact: ImpactLevel[];
    parameters?: string[];
}

export interface ControlListResult {
    controls: FedRAMPControl[];
    totalCount: number;
    baseline: ImpactLevel;
}

// POA&M
export interface POAMParams {
    weakness: string;
    controlId: string;
    riskLevel?: RiskLevel;
    milestone: string;
    responsibleParty?: string;
    scheduledCompletionDate: Date;
    resourcesRequired?: string;
    vendorDependency?: boolean;
}

export interface POAMItem {
    id: string;
    weakness: string;
    controlId: string;
    status: POAMStatus;
    riskLevel: RiskLevel;
    milestone: string;
    scheduledCompletionDate: Date;
    actualCompletionDate?: Date;
    createdAt: Date;
}

export interface POAMListResult {
    items: POAMItem[];
    totalCount: number;
    openCount: number;
    overdueCount: number;
}

// Continuous Monitoring
export interface ConMonParams {
    month: string;
    year: number;
    includeVulnScan?: boolean;
    includeConfigScan?: boolean;
    includeAccessReview?: boolean;
}

export interface VulnerabilitySummary {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    total: number;
}

export interface ConMonResult {
    reportId: string;
    period: string;
    vulnerabilities: VulnerabilitySummary;
    newPoamItems: number;
    closedPoamItems: number;
    controlChanges: number;
    significantChanges: boolean;
    generatedAt: Date;
}

// SSP
export interface SSPSection {
    sectionId: string;
    title: string;
    content: string;
    lastUpdated: Date;
    approved: boolean;
}

export interface SSPResult {
    systemName: string;
    impactLevel: ImpactLevel;
    authorizationDate?: Date;
    authorizationExpiry?: Date;
    sections: SSPSection[];
    version: string;
}

// Service Events
export interface FedRAMPEventMap {
    'control:assessed': ControlAssessmentResult;
    'poam:created': POAMItem;
    'poam:updated': POAMItem;
    'conmon:generated': ConMonResult;
    'error': Error;
}
