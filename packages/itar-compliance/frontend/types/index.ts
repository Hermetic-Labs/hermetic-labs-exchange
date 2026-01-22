/**
 * ITAR Compliance Suite - Type Definitions
 */

// Configuration
export interface ITARConfig {
    companyId: string;
    ddtcRegistrationNumber?: string;
    apiEndpoint?: string;
}

// USML Categories
export type USMLCategory =
    | 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII'
    | 'VIII' | 'IX' | 'X' | 'XI' | 'XII' | 'XIII' | 'XIV'
    | 'XV' | 'XVI' | 'XVII' | 'XVIII' | 'XIX' | 'XX' | 'XXI';

// License Types
export type LicenseType = 'DSP-5' | 'DSP-61' | 'DSP-73' | 'DSP-85' | 'TAA' | 'MLA';

// License Status
export type LicenseStatus =
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'denied'
    | 'expired';

// Screening Result
export type ScreeningResult = 'clear' | 'match' | 'potential_match' | 'review_required';

// Data Classification
export type DataClassification = 'unclassified' | 'cui' | 'itar_controlled';

// Classification
export interface ClassificationParams {
    itemDescription: string;
    technicalSpecs?: Record<string, unknown>;
    intendedUse?: string;
    manufacturer?: string;
}

export interface ClassificationResult {
    classificationId: string;
    usmlCategory?: USMLCategory;
    isItarControlled: boolean;
    jurisdiction: 'ITAR' | 'EAR' | 'dual';
    rationale: string;
    confidence: number;
    classifiedAt: Date;
}

// Screening
export interface ScreeningParams {
    name: string;
    nationality: string;
    organization?: string;
    email?: string;
    checkDeniedParties?: boolean;
    checkSanctions?: boolean;
}

export interface DeniedPartyMatch {
    listName: string;
    matchedName: string;
    matchScore: number;
    source: string;
}

export interface ScreeningResultData {
    screeningId: string;
    result: ScreeningResult;
    name: string;
    nationality: string;
    deniedPartyMatches?: DeniedPartyMatch[];
    sanctionsMatches?: string[];
    screenedAt: Date;
}

// License
export interface LicenseItem {
    description: string;
    quantity: number;
    valueUsd?: number;
    usmlCategory?: USMLCategory;
}

export interface LicenseParams {
    licenseType?: LicenseType;
    usmlCategory: USMLCategory;
    endUser: string;
    destinationCountry: string;
    items: LicenseItem[];
    endUseStatement?: string;
    supportingDocuments?: string[];
}

export interface License {
    id: string;
    licenseType: LicenseType;
    status: LicenseStatus;
    usmlCategory: USMLCategory;
    endUser: string;
    destinationCountry: string;
    submittedDate?: Date;
    approvalDate?: Date;
    expiryDate?: Date;
    createdAt: Date;
}

export interface LicenseListResult {
    licenses: License[];
    totalCount: number;
    activeCount: number;
    pendingCount: number;
}

// Technical Data
export interface TechnicalDataParams {
    dataDescription: string;
    dataClassification: DataClassification;
    accessRequestedBy: string;
    purpose: string;
}

export interface TechnicalDataResult {
    accessId: string;
    approved: boolean;
    dataClassification: DataClassification;
    restrictions?: string[];
    expiryDate?: Date;
    reviewedAt: Date;
}

// Audit
export interface AuditEntry {
    id: string;
    timestamp: Date;
    action: string;
    userId: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
}

export interface AuditReportResult {
    reportId: string;
    periodStart: Date;
    periodEnd: Date;
    entries: AuditEntry[];
    totalClassifications: number;
    totalScreenings: number;
    totalLicenseActivities: number;
    generatedAt: Date;
}

// Service Events
export interface ITAREventMap {
    'item:classified': ClassificationResult;
    'person:screened': ScreeningResultData;
    'license:created': License;
    'license:updated': License;
    'data:accessed': TechnicalDataResult;
    'error': Error;
}
