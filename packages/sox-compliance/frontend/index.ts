/**
 * SOX Compliance Suite - EVE OS Marketplace Package
 * @packageDocumentation
 */

// Main tabbed container (default export for sidebar tab)
export { default, default as SOXCompliancePortal } from './SOXCompliancePortal';

// Service class (for programmatic access, NOT a React component)
export { SOXComplianceService } from './SOXComplianceService';

// Types
export type {
    SOXConfig,
    ControlType,
    ControlFrequency,
    TestResult,
    DeficiencySeverity,
    ControlStatus,
    ControlParams,
    Control,
    ControlListResult,
    ControlTestParams,
    ControlTestResult,
    SODCheckParams,
    SODConflict,
    SODCheckResult,
    DeficiencyParams,
    DeficiencyResult,
    AuditTrailEntry,
    AuditTrailResult,
    SOXEventMap
} from './types';
