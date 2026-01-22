/**
 * FHIR Compliance Suite - EVE OS Marketplace Package
 *
 * Healthcare interoperability module featuring:
 * - FHIRCompliancePortal: Main UI dashboard (default)
 * - FHIRComplianceService: Service class for FHIR operations
 *
 * Self-contained module - all imports are relative (no @/ aliases)
 * @packageDocumentation
 */

// Main tabbed container (default export for sidebar tab)
export { default, default as FHIRCompliancePortal } from './FHIRCompliancePortal';

// Service class (for programmatic access, NOT a React component)
export { FHIRComplianceService } from './FHIRComplianceService';

// Types
export type {
    FHIRConfig,
    FHIRResourceType,
    HumanName,
    ContactPoint,
    Address,
    Identifier,
    Reference,
    CodeableConcept,
    Gender,
    ValidationParams,
    ValidationIssue,
    ValidationResult,
    PatientParams,
    Patient,
    ObservationParams,
    Observation,
    SearchParams,
    BundleEntry,
    SearchResult,
    FHIREventMap
} from './types';
