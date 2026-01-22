/**
 * Medical Module Type Definitions
 * Self-contained types for the medical module package
 */

// ============================================================================
// Core Cortex Types
// ============================================================================

export type SituationalMode = 'work' | 'personal' | 'creative' | 'social' | 'medical' | 'emergency';

export type CortexEventType =
  | 'thread_creation'
  | 'thread_completion'
  | 'card_execution'
  | 'neural_pathway'
  | 'learning_event'
  | 'system_evolution'
  | 'cortex_handoff'
  | 'medical_device_registration'
  | 'medical_template_registration'
  | 'medical_situational_mode_change'
  | 'compliance_critical_issue';

export interface CortexEventMetadata {
  duration_ms?: number;
  success_rate?: number;
  learning_value?: number;
  pathway_strength?: number;
  evolution_impact?: number;
  related_threads?: string[];
  triggered_actions?: string[];
  from_cortex?: string;
  to_cortex?: string;
  compliance_impact?: number;
  safety_level?: 'low' | 'medium' | 'high' | 'critical';
  medical_context?: boolean;
  compliance_zone?: string;
  template_complexity?: number;
  medical_compliance_impact?: boolean;
}

export interface CortexEvent {
  id: string;
  type: CortexEventType;
  thread_id: string;
  timestamp: string;
  data: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  source: 'cloud' | 'local' | 'system' | 'integration_manager' | 'compliance';
  feedback_color?: 'green' | 'yellow' | 'red' | 'orange' | 'blue';
  metadata: CortexEventMetadata;
}

export interface NeuralPathway {
  id: string;
  source: string;
  target: string;
  strength: number;
  active: boolean;
  type?: string;
  bidirectional?: boolean;
}

export interface EvolutionMetrics {
  generation?: number;
  fitness?: number;
  diversity?: number;
  mutations?: number;
  improvements?: number;
  timestamp?: Date | string;
  learning_rate?: number;
  pathway_growth?: number;
  efficiency_improvement?: number;
  specialization_level?: number;
  adaptation_score?: number;
  cross_thread_coordination?: number;
  evolution_impact?: number;
}

export interface CortexState {
  active?: boolean;
  processing?: boolean;
  modelLoaded?: boolean;
  threads?: number;
  memory?: number;
  status?: string;
  heartbeat_cycle?: number;
  active_threads?: number;
  neural_pathways?: NeuralPathway[];
  recent_events?: CortexEvent[];
  evolution_metrics?: EvolutionMetrics;
  system_health?: 'evolving' | 'stable' | 'optimizing' | 'critical' | 'healthy' | 'degraded';
  last_update?: string;
  situational_mode?: SituationalMode;
}

export interface ThreadSnapshot {
  id?: string;
  name?: string;
  status: 'active' | 'idle' | 'error';
  created?: Date;
  lastActivity?: Date;
  last_activity?: string;
  memoryEntries?: number;
  current_load?: number;
  active_cards?: number;
  memory_usage?: number;
  neural_connections?: string[];
  thread_id?: string;
  thread_type?: string;
  capabilities?: string[];
  activity_level?: number;
}

export interface UnifiedHeartbeat {
  timestamp: number;
  cortex: CortexState;
  pathways: NeuralPathway[];
  evolution: EvolutionMetrics;
  threads: ThreadSnapshot[];
}

export interface ActiveEvent {
  event_id: string;
  event_type: string;
  status: 'starting' | 'processing' | 'completing' | 'completed' | 'error';
  progress: number;
  estimated_completion?: string;
  thread_id: string;
  card_ids: string[];
}

export interface SystemPulse {
  cpu_usage: number;
  memory_usage: number;
  active_threads: number;
  event_queue_size: number;
  learning_rate: number;
  evolution_stage: string;
}

export interface EvolutionIndicators {
  new_pathways_formed: number;
  learning_events_detected: number;
  efficiency_gains: number;
  specialization_advances: number;
  adaptation_level: number;
  system_maturity: number;
}

export interface PersonalityThread {
  id: string;
  name: string;
  description: string;
  active: boolean;
  traits: Record<string, number>;
  created_at: string;
}

export interface PatchFile {
  patch_id: string;
  thread_id: string;
  patch_type: 'status' | 'data' | 'emotion' | 'code' | 'learning';
  content: unknown;
  timestamp: string;
  heartbeat_cycle: number;
  processed: boolean;
  processed_at?: string;
}

export interface ThresholdMetrics {
  good_threads: number;
  bad_threads: number;
  slow_threads: number;
  silent_threads: number;
  average_response_time: number;
  system_efficiency: number;
}

// ============================================================================
// Medical Device Types
// ============================================================================

export type MedicalDeviceCategory = 'monitoring' | 'diagnostic' | 'therapeutic' | 'imaging' | 'laboratory' | 'surgical' | 'emergency';

export interface MedicalDevice {
  device_id: string;
  device_name: string;
  category: MedicalDeviceCategory;
  manufacturer: string;
  model: string;
  status: 'registered' | 'active' | 'maintenance' | 'offline' | 'error';
  capabilities: string[];
  compliance_requirements: string[];
  last_heartbeat: string;
  safety_level: 'low' | 'medium' | 'high' | 'critical';
  maintenance_schedule: unknown[];
  performance_metrics: {
    uptime: number;
    response_time: number;
    error_rate: number;
    accuracy: number;
  };
  connected_at: string;
}

export interface MedicalTemplate {
  template_id: string;
  template_name: string;
  category: string;
  device_requirements: string[];
  safety_checks: string[];
  compliance_standards: string[];
  status: 'active' | 'inactive' | 'draft' | 'deprecated';
  performance_score: number;
  usage_count: number;
  last_updated: string;
  certifications: string[];
  tested_devices: string[];
  risk_assessment: 'low' | 'medium' | 'high' | 'critical';
  installation_instructions: string[];
  maintenance_requirements: string[];
}

export interface MedicalComplianceMetrics {
  fda_compliance_score: number;
  iec_62304_compliance: number;
  hl7_compliance: number;
  dicom_compliance: number;
  ieee_11073_compliance: number;
  fhir_compliance: number;
  safety_level: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  last_audit: string;
  critical_issues: number;
  warnings: number;
  certifications: string[];
}

// ============================================================================
// Medical Vocabulary Types (from MedicalVocabulary.ts)
// ============================================================================

export type DeviceCategory =
  | 'vital_signs'
  | 'imaging'
  | 'laboratory'
  | 'infusion'
  | 'respiratory'
  | 'surgical'
  | 'monitoring'
  | 'diagnostic'
  | 'therapeutic'
  | 'emergency';

export interface VitalSign {
  id: string;
  name: string;
  synonyms: string[];
  phoneticSpellings: string[];
  unit: string;
  normalRange: NormalRange;
  criticalLow: number;
  criticalHigh: number;
  measurementMethod?: string;
}

export interface NormalRange {
  min: number;
  max: number;
  unit: string;
}

// ============================================================================
// Re-export medical-models types
// ============================================================================

export * from './medical-models';
