/**
 * Medical Module - Marketplace Package
 * 
 * A comprehensive medical suite for EVE OS featuring:
 * - MedicalModulePage: Tabbed navigation container (default)
 * - MedicalViewport: Advanced quantum visualization
 * - MedicalDashboard: Clinician dashboard
 * - Bedside Assistant with fall detection
 * - Nurse Station Dashboard with room overflow
 * - FHIR R4 import/export
 * - HealthKit vitals visualization
 * - Patient intake forms
 * 
 * Self-contained module - all imports are relative (no @/ aliases)
 */

// Main tabbed container (default export for sidebar tab)
export { default, default as MedicalModulePage } from './MedicalModulePage';

// Individual components (for direct access)
export { MedicalViewport } from './MedicalViewport';
export { MedicalViewportLite } from './MedicalViewportLite';
export { MedicalViewportVR } from './MedicalViewportVR';
export { MedicalDashboard } from './MedicalDashboard';
export { AdminPortal } from './AdminPortalBridge';
export { AdminControls } from './AdminControls';

// Clinical components
export { default as EveBedsideAssistant } from './EveBedsideAssistant';
export { BedsideKiosk } from './BedsideKiosk';
export { default as NurseStationDashboard } from './NurseStationDashboard';
export { default as FHIRImportExport } from './FHIRImportExport';
export { default as HealthKitVitalsChart } from './HealthKitVitalsChart';
export { default as PatientIntakeForms } from './PatientIntakeForms';

// Services (for cross-package dependencies)
export { MedicalDataPersistence, medicalDataPersistence } from './services/MedicalDataPersistence';

// Re-export types
export type { ModelLoadProgress, MedicalModelMetadata } from './types/medical-models';
export type { AdminSettings, LayerConfig } from './AdminControls';
export type { MedicalRecord, MedicalRecordType, SyncStatus, AuditEntry } from './services/MedicalDataPersistence';
