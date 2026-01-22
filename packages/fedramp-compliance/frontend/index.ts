/**
 * FedRAMP Compliance Suite - EVE OS Marketplace Package
 *
 * Federal cloud authorization module featuring:
 * - FedRAMPCompliancePortal: Main UI dashboard (default)
 * - FedRAMPComplianceService: Service class for compliance operations
 *
 * Self-contained module - all imports are relative (no @/ aliases)
 * @packageDocumentation
 */

// Main tabbed container (default export for sidebar tab)
export { default, default as FedRAMPCompliancePortal } from './FedRAMPCompliancePortal';

// Service class (for programmatic access, NOT a React component)
export { FedRAMPComplianceService } from './FedRAMPComplianceService';

// Types
export type {
    FedRAMPConfig,
    ImpactLevel,
    ControlFamily,
    ImplementationStatus,
    POAMStatus,
    RiskLevel,
    ControlAssessmentParams,
    ControlAssessmentResult,
    FedRAMPControl,
    ControlListResult,
    POAMParams,
    POAMItem,
    POAMListResult,
    ConMonParams,
    VulnerabilitySummary,
    ConMonResult,
    SSPSection,
    SSPResult,
    FedRAMPEventMap
} from './types';
