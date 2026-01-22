/**
 * HIPAA Privacy Suite - EVE OS Marketplace Package
 *
 * Healthcare privacy module featuring:
 * - HIPAACompliancePortal: Main UI dashboard (default)
 * - HIPAAPrivacyService: Service class for PHI handling
 *
 * Self-contained module - all imports are relative (no @/ aliases)
 * @packageDocumentation
 */

// Main tabbed container (default export for sidebar tab)
export { default, default as HIPAACompliancePortal } from './HIPAACompliancePortal';

// Service class (for programmatic access, NOT a React component)
// Using default export since the service file uses `export default`
export { default as HIPAAPrivacyService } from './HIPAAPrivacyService';

// Types
export type {
    HIPAAConfig,
    PHICategory,
    AccessPurpose,
    BreachSeverity,
    PHIDetectionParams,
    PHIEntity,
    PHIDetectionResult,
    PHIMaskParams,
    PHIMaskResult,
    AccessValidationParams,
    AccessValidationResult,
    AuditLogEntry,
    AuditLogResult,
    BreachReportParams,
    BreachReportResult,
    HIPAAEventMap
} from './types';
