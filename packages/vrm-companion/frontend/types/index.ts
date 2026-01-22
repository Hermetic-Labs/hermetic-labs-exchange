/**
 * VRM Companion - Type Definitions
 * 
 * Core types for VRM avatar loading, lip sync, and EVE Core integration.
 */

// ============================================================================
// Avatar Types
// ============================================================================

export interface AvatarModel {
  id: string;
  name: string;
  url: string;
  type: 'vrm' | 'fbx' | 'glb' | 'gltf';
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

export interface AvatarState {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  currentModel: AvatarModel | null;
}

// ============================================================================
// Lip Sync Types
// ============================================================================

export type VisemeKey = 'aa' | 'ih' | 'ou' | 'ee' | 'oh' | 'neutral';

export interface PhonemeEvent {
  phoneme: string;
  viseme: VisemeKey;
  startTime: number;
  duration: number;
}

export interface LipSyncConfig {
  smoothing: number;
  gain: number;
  maxMouthOpen: number;
  amplitudeMode: boolean;
  phonemeMode: boolean;
}

export interface LipSyncState {
  isActive: boolean;
  mode: 'phoneme' | 'amplitude' | 'idle';
  currentViseme: VisemeKey;
  visemeWeights: Record<VisemeKey, number>;
}

// ============================================================================
// Expression Types
// ============================================================================

export interface VRMExpression {
  name: string;
  weight: number;
  isBlendShape: boolean;
}

export interface ExpressionPreset {
  id: string;
  name: string;
  expressions: Record<string, number>;
}

// ============================================================================
// EVE Core Integration Types
// ============================================================================

export type RepresentationType = 'sphere' | 'vrm-companion';

export interface EveCoreRepresentation {
  type: RepresentationType;
  avatarUrl?: string;
  config?: EveCoreIntegrationConfig;
}

export interface EveCoreIntegrationConfig {
  autoReplaceSphere: boolean;
  defaultAvatarUrl?: string;
  enableCompanionButton: boolean;
  buttonPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface CompanionButtonState {
  viewId: string;
  isVisible: boolean;
  isEnabled: boolean;
  currentRepresentation: RepresentationType;
}

// ============================================================================
// Capability Types
// ============================================================================

export interface CompanionCapabilities {
  avatarLoading: boolean;
  lipSync: boolean;
  phonemeDriven: boolean;
  amplitudeMode: boolean;
  vrReady: boolean;
  eveCoreIntegration: boolean;
}

export interface CompanionCapabilityCheck {
  isAvailable: boolean;
  capabilities: CompanionCapabilities;
  vrEngineInstalled: boolean;
  eveCoreAvailable: boolean;
}

// ============================================================================
// Animation Types
// ============================================================================

export interface AnimationClip {
  name: string;
  duration: number;
  isLooping: boolean;
}

export interface AnimationState {
  currentClip: string | null;
  isPlaying: boolean;
  timeScale: number;
  availableClips: AnimationClip[];
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface VRMCompanionProps {
  /** Custom model URL (VRM, GLB, or FBX) */
  modelUrl?: string;
  /** Reference to external audio element for TTS integration */
  ttsAudioRef?: React.RefObject<HTMLAudioElement>;
  /** Callback when avatar speaks */
  onSpeakRequest?: (text: string) => void;
  /** Container className */
  className?: string;
  /** Enable VR mode (requires vr-spatial-engine) */
  vrEnabled?: boolean;
  /** EVE Core integration mode */
  eveCoreMode?: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface CompanionEvent {
  type: 'loaded' | 'error' | 'speak-start' | 'speak-end' | 'expression-change';
  timestamp: number;
  data?: unknown;
}

export interface LipSyncEvent {
  type: 'start' | 'stop' | 'viseme-change';
  viseme?: VisemeKey;
  weights?: Record<VisemeKey, number>;
  timestamp: number;
}

export interface IntegrationEvent {
  type: 'registered' | 'swapped' | 'restored' | 'error';
  viewId: string;
  representation?: RepresentationType;
  error?: string;
  timestamp: number;
}
