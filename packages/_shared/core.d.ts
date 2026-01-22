/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EVE OS HOST CONTRACT DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * These type definitions describe the INTERFACES provided by the EVE OS host
 * application. Marketplace packages import these types for IDE support and
 * type checking during development.
 * 
 * ⚠️  IMPORTANT: These are NOT implementations!
 * 
 * At runtime, packages use the ACTUAL implementations from the host codebase.
 * These declarations exist to:
 * 
 *   1. Eliminate "Cannot find module" errors in the IDE
 *   2. Provide IntelliSense/autocomplete during package development
 *   3. Document the contract between packages and the host
 *   4. Enable type checking without requiring the full host codebase
 * 
 * When a package is installed into EVE OS, the tsconfig path mappings resolve
 * these imports to the real implementations in frontend/src/*.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * MAINTENANCE: If the host types change, update this file to match.
 * VERSION: Synced with EVE OS v1.0.0 (January 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CORE TYPES (@/types)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Situational Mode - Contextual operating mode for the system
 */
export type SituationalMode = 'work' | 'personal' | 'creative' | 'social' | 'medical' | 'emergency';

/**
 * ReflexCard - The fundamental action unit in EVE OS
 * Every operation in EVE OS is represented as a card that flows through the system.
 */
export interface ReflexCard {
  id: string;
  version?: string;
  type: 'memory' | 'knowledge' | 'context' | 'personality' | 'action' | 'function' | 'emotion';
  intent: string;
  description?: string;
  input: CardInput | Record<string, unknown>;
  output?: CardOutput | Record<string, unknown>;
  process?: string[];
  status?: 'pending' | 'processing' | 'completed' | 'error';
  created_at?: string;
  updated_at?: string;
  metadata?: CardMetadata;
  source?: 'cloud' | 'local' | 'user';
  context?: {
    mode?: string;
    personality_threads?: string[];
    memory_cultivation?: boolean;
    learning_enabled?: boolean;
    consciousness_tracking?: boolean;
    thread_id?: string;
    [key: string]: unknown;
  };
}

export interface CardInput {
  data: Record<string, unknown>;
  context?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  tags?: string[];
}

export interface CardOutput {
  result: Record<string, unknown>;
  confidence?: number;
  execution_time?: number;
  resources_used?: string[];
  next_actions?: string[];
}

export interface CardMetadata {
  version?: string;
  schema?: string;
  requires_permissions?: string[];
  estimated_cost?: number;
  capabilities?: string[];
  created_at?: string;
  execution_count?: number;
  success_rate?: number;
  [key: string]: unknown;
}

export interface CardExecutionResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  execution_time: number;
}

/**
 * Voice Recognition Types
 */
export interface VoiceRecognitionState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  confidence: number;
  error?: string;
}

export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  confidence: number;
  isFinal: boolean;
  speaker?: string;
}

export interface MedicalTerm {
  term: string;
  category: string;
  confidence: number;
}

export interface MedicalVocabularyConfig {
  enabled: boolean;
  vocabularies: string[];
}

export interface VoiceCommandHistory {
  commands: TranscriptEntry[];
  maxSize: number;
}

export interface VoiceAnalytics {
  totalCommands: number;
  successRate: number;
  averageConfidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION LANGUAGE SERVICE (@/services/ActionLanguageService)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ActionLanguage Action - Structured command format
 * DSL Format: verb noun [where=X] [with=Y] [as=Z] [if=condition] [until=condition]
 */
export interface ActionLanguageAction {
  verb: string;
  noun: string;
  where?: Record<string, unknown> | string;
  with?: Record<string, unknown>;
  as?: string;
  if?: string;
  until?: string;
}

export interface ActionValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * ActionLanguageService - Parses natural language into structured actions
 * and converts them to ReflexCards for execution.
 */
export interface ActionLanguageService {
  parseAction(input: string): ActionLanguageAction;
  actionToReflexCard(action: ActionLanguageAction): Promise<ReflexCard>;
  validateAction(action: ActionLanguageAction): ActionValidationResult;
  executeAction(action: ActionLanguageAction): Promise<CardExecutionResult>;
}

/**
 * Singleton instance provided by host
 */
export declare const actionLanguageService: ActionLanguageService;

// ─────────────────────────────────────────────────────────────────────────────
// CARD EXECUTION ENGINE (@/services/CardExecutionEngine)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CardExecutionEngine - Executes ReflexCards with full lifecycle management
 */
export interface CardExecutionEngine {
  executeCard(card: ReflexCard): Promise<CardExecutionResult>;
  validateCard(card: ReflexCard): Promise<{ valid: boolean; errors: string[] }>;
  getExecutionHistory(): ReflexCard[];
}

export declare const cardExecutionEngine: CardExecutionEngine;

// ─────────────────────────────────────────────────────────────────────────────
// VERB SAFETY SERVICE (@/services/VerbSafetyService)
// ─────────────────────────────────────────────────────────────────────────────

export type SafetyLevel = 'safe' | 'monitored' | 'controlled' | 'restricted' | 'critical';

export type DeviceCategory = 'personal' | 'medical' | 'emergency_medical' | 'critical_medical' | 'research' | 'admin';

export interface UserContext {
  userId: string;
  role: string;
  permissions: string[];
  sessionId?: string;
}

export interface MedicalContext {
  patientId?: string;
  encounterId?: string;
  facilityId?: string;
  supervisionLevel?: 'none' | 'nurse' | 'physician' | 'specialist';
  isEmergency?: boolean;
}

export interface SafetyWarning {
  id: string;
  message: string;
  severity: SafetyLevel;
  suggestion?: string;
}

export interface VerbSafetyViolation {
  id: string;
  type: 'unauthorized_verb' | 'context_mismatch' | 'sequence_violation' | 'parameter_violation' | 'emergency_violation';
  severity: SafetyLevel;
  message: string;
  verb: string;
  suggestion: string;
  requiresConfirmation: boolean;
  emergencyStopRequired?: boolean;
}

export interface VerbSafetyValidationResult {
  passed: boolean;
  violations: VerbSafetyViolation[];
  warnings: SafetyWarning[];
  suggestions: string[];
  requiresConfirmation: boolean;
  emergencyProtocolTriggered?: boolean;
  safetyScore: number;
  medicalModeCompliant: boolean;
  sequenceValid: boolean;
}

/**
 * VerbSafetyService - Validates verb usage across device contexts
 * with comprehensive medical safety compliance.
 */
export interface VerbSafetyService {
  validateReflexCardCreation(
    action: ActionLanguageAction,
    deviceCategory: DeviceCategory,
    userContext: UserContext,
    medicalContext?: MedicalContext
  ): Promise<VerbSafetyValidationResult>;
  
  on(event: string, listener: (...args: unknown[]) => void): this;
  off(event: string, listener: (...args: unknown[]) => void): this;
  emit(event: string, ...args: unknown[]): boolean;
}

export declare const verbSafetyService: VerbSafetyService;

// ─────────────────────────────────────────────────────────────────────────────
// SI ENGINE SERVICE (@/services/SIEngineService)
// ─────────────────────────────────────────────────────────────────────────────

export interface SIEngineService {
  processQuery(query: string): Promise<unknown>;
  getStatus(): { ready: boolean; model: string };
}

export declare const siEngineService: SIEngineService;

// ─────────────────────────────────────────────────────────────────────────────
// TTS SERVICE (@/services/ttsService)
// ─────────────────────────────────────────────────────────────────────────────

export type TTSState = 'idle' | 'loading' | 'speaking' | 'paused' | 'error';

export interface TTSService {
  speak(text: string): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  getState(): TTSState;
}

export declare function onStateChange(callback: (state: TTSState) => void): () => void;
export declare function getAudioElement(): HTMLAudioElement | null;
export declare function getAnalyser(): AnalyserNode | null;

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL DATA PERSISTENCE (@/services/MedicalDataPersistence)
// ─────────────────────────────────────────────────────────────────────────────

export interface MedicalDataPersistence {
  saveVitals(patientId: string, data: unknown): Promise<void>;
  getVitals(patientId: string): Promise<unknown>;
  saveEncounter(encounterId: string, data: unknown): Promise<void>;
  getEncounter(encounterId: string): Promise<unknown>;
}

export declare const medicalDataPersistence: MedicalDataPersistence;

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT PROVIDERS (@/components/devportal/context/*)
// ─────────────────────────────────────────────────────────────────────────────

export interface AppData {
  user?: {
    id: string;
    name: string;
    role: string;
  };
  session?: {
    id: string;
    startedAt: Date;
  };
  settings?: Record<string, unknown>;
}

export declare function useAppData(): AppData;

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY POLICIES (@/security/policies/*)
// ─────────────────────────────────────────────────────────────────────────────

export interface SecurityPolicy {
  name: string;
  version: string;
  rules: SecurityRule[];
  enabled: boolean;
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: string;
}

// Policy files are JSON - declare as modules
declare module '@/security/policies/sox-security-policy.json' {
  const policy: SecurityPolicy;
  export default policy;
}

declare module '@/security/policies/pci-security-policy.json' {
  const policy: SecurityPolicy;
  export default policy;
}

declare module '@/security/policies/hipaa-security-policy.json' {
  const policy: SecurityPolicy;
  export default policy;
}
