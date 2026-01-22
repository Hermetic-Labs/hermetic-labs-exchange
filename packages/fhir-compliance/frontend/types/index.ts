/**
 * FHIR Compliance Suite - Type Definitions
 */

// Configuration
export interface FHIRConfig {
    baseUrl: string;
    version?: 'R4' | 'STU3';
    apiKey?: string;
    timeout?: number;
}

// Resource Types
export type FHIRResourceType =
    | 'Patient'
    | 'Practitioner'
    | 'Observation'
    | 'Condition'
    | 'MedicationRequest'
    | 'Encounter'
    | 'DiagnosticReport'
    | 'Bundle';

// Common FHIR Types
export interface HumanName {
    use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
}

export interface ContactPoint {
    system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
    value?: string;
    use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
}

export interface Address {
    use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

export interface Identifier {
    system?: string;
    value: string;
}

export interface Reference {
    reference: string;
    display?: string;
}

export interface CodeableConcept {
    coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
    }>;
    text?: string;
}

export type Gender = 'male' | 'female' | 'other' | 'unknown';

// Validation
export interface ValidationParams {
    resourceType: FHIRResourceType;
    resource: Record<string, unknown>;
    profile?: string;
}

export interface ValidationIssue {
    severity: 'error' | 'warning' | 'information';
    code: string;
    diagnostics: string;
    location?: string[];
}

export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    resourceType: FHIRResourceType;
}

// Patient
export interface PatientParams {
    identifier?: Identifier[];
    name: HumanName[];
    telecom?: ContactPoint[];
    gender?: Gender;
    birthDate?: string;
    address?: Address[];
}

export interface Patient {
    id: string;
    resourceType: 'Patient';
    identifier?: Identifier[];
    name: HumanName[];
    gender?: Gender;
    birthDate?: string;
    created: Date;
}

// Observation
export interface ObservationParams {
    status?: 'registered' | 'preliminary' | 'final' | 'amended';
    code: CodeableConcept;
    subject: Reference;
    effectiveDateTime?: Date;
    valueQuantity?: {
        value: number;
        unit: string;
        system?: string;
        code?: string;
    };
    valueString?: string;
}

export interface Observation {
    id: string;
    resourceType: 'Observation';
    status: string;
    code: CodeableConcept;
    subject: Reference;
    effectiveDateTime?: Date;
    issued: Date;
}

// Search
export interface SearchParams {
    resourceType: FHIRResourceType;
    params: Record<string, string>;
    count?: number;
    offset?: number;
}

export interface BundleEntry {
    fullUrl?: string;
    resource: Record<string, unknown>;
}

export interface SearchResult {
    resourceType: 'Bundle';
    type: 'searchset';
    total: number;
    entry: BundleEntry[];
}

// Service Events
export interface FHIREventMap {
    'resource:validated': ValidationResult;
    'resource:created': Record<string, unknown>;
    'resource:updated': Record<string, unknown>;
    'search:completed': SearchResult;
    'error': Error;
}
