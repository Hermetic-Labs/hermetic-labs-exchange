/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EVE OS MARKETPLACE - SHARED UTILITIES INDEX
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Central export point for all shared utilities used by marketplace packages.
 * Import from '@eve/shared' or '../_shared' in your package.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export { EventEmitter } from './EventEmitter';
export { BufferShim as Buffer } from './Buffer';

// ─────────────────────────────────────────────────────────────────────────────
// VR CAPABILITY (for 3D packages)
// ─────────────────────────────────────────────────────────────────────────────

export {
  useVRCapability,
  VRButtonSlot,
  VRCapabilityProvider,
  useVRCapabilityContext,
  registerVRModule,
} from './useVRCapability';

export type {
  VRCapability,
  VRCapabilityState,
  VRCapabilityActions,
  VRButtonSlotProps,
} from './useVRCapability';

// ─────────────────────────────────────────────────────────────────────────────
// TYPE RE-EXPORTS (from host contract)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  // Core Types
  ReflexCard,
  CardInput,
  CardOutput,
  CardMetadata,
  CardExecutionResult,
  SituationalMode,
  
  // Voice Types
  VoiceRecognitionState,
  TranscriptEntry,
  MedicalTerm,
  MedicalVocabularyConfig,
  VoiceCommandHistory,
  VoiceAnalytics,
  
  // Action Language
  ActionLanguageAction,
  ActionValidationResult,
  ActionLanguageService,
  
  // Card Execution
  CardExecutionEngine,
  
  // Safety
  SafetyLevel,
  DeviceCategory,
  UserContext,
  MedicalContext,
  SafetyWarning,
  VerbSafetyViolation,
  VerbSafetyValidationResult,
  VerbSafetyService,
  
  // TTS
  TTSState,
  TTSService,
  
  // Medical
  MedicalDataPersistence,
  
  // Context
  AppData,
  
  // Security
  SecurityPolicy,
  SecurityRule
} from './core.d.ts';
