/**
 * ITAR Compliance Suite - EVE OS Marketplace Package
 * @packageDocumentation
 */

// Main tabbed container (default export for sidebar tab)
export { default, default as ITARCompliancePortal } from './ITARCompliancePortal';

// Service class (for programmatic access, NOT a React component)
export { ITARComplianceService } from './ITARComplianceService';

// Types
export type {
    ITARConfig,
    USMLCategory,
    LicenseType,
    LicenseStatus,
    ScreeningResult,
    DataClassification,
    ClassificationParams,
    ClassificationResult,
    ScreeningParams,
    DeniedPartyMatch,
    ScreeningResultData,
    LicenseItem,
    LicenseParams,
    License,
    LicenseListResult,
    TechnicalDataParams,
    TechnicalDataResult,
    AuditEntry,
    AuditReportResult,
    ITAREventMap
} from './types';
