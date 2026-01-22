/**
 * VR Spatial Engine - Type Definitions
 * 
 * Core types for VR capability injection and WebXR integration.
 */

/// <reference path="../../../_shared/webxr.d.ts" />

// ============================================================================
// VR Session Types
// ============================================================================

export type VRMode = 'immersive-vr' | 'immersive-ar' | 'inline';
export type SessionStatus = 'idle' | 'starting' | 'active' | 'paused' | 'ended' | 'error';

export interface VRSessionConfig {
  mode: VRMode;
  referenceSpaceType?: XRReferenceSpaceType;
  requiredFeatures?: string[];
  optionalFeatures?: string[];
}

export interface VRSessionState {
  status: SessionStatus;
  mode: VRMode | null;
  session: XRSession | null;
  referenceSpace: XRReferenceSpace | null;
  error: Error | null;
}

// ============================================================================
// Capability Types
// ============================================================================

export interface VRCapabilities {
  vrSupported: boolean;
  arSupported: boolean;
  handTrackingSupported: boolean;
  eyeTrackingSupported: boolean;
  spatialAnchorsSupported: boolean;
  controllers: VRControllerInfo[];
}

export interface VRControllerInfo {
  id: string;
  hand: 'left' | 'right' | 'none';
  gamepad?: Gamepad;
  hasHaptics: boolean;
}

export interface VRCapabilityCheck {
  isAvailable: boolean;
  isWebXRSupported: boolean;
  capabilities: VRCapabilities | null;
  error?: string;
}

// ============================================================================
// Spatial Anchor Types
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface SpatialAnchor {
  id: string;
  sessionId: string;
  position: Vector3;
  rotation: Quaternion;
  label?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface SpatialAnchorRequest {
  position: Vector3;
  rotation: Quaternion;
  label?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Integration Types (EVE Core / VRM Companion)
// ============================================================================

export interface VRIntegrationConfig {
  targetView: string;
  enableVRButton: boolean;
  buttonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onSessionStart?: (session: VRSessionState) => void;
  onSessionEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface VRButtonInjection {
  viewId: string;
  isVisible: boolean;
  isEnabled: boolean;
  onClick: () => Promise<void>;
}

export interface VRViewCompatibility {
  viewId: string;
  compatible: boolean;
  features: string[];
  restrictions?: string[];
}

// Compatible views that can receive VR capability injection
export const COMPATIBLE_VIEWS = [
  'eve-core',
  'vrm-companion', 
  'chat',
  'spatial-workspace',
] as const;

export type CompatibleView = typeof COMPATIBLE_VIEWS[number];

// ============================================================================
// Event Types
// ============================================================================

export interface VRSessionEvent {
  type: 'start' | 'end' | 'pause' | 'resume' | 'error' | 'frame';
  session: VRSessionState;
  timestamp: number;
}

export interface VRInputEvent {
  type: 'select' | 'selectstart' | 'selectend' | 'squeeze' | 'squeezestart' | 'squeezeend';
  controller: VRControllerInfo;
  inputSource: XRInputSource;
  timestamp: number;
}

export interface VRAnchorEvent {
  type: 'created' | 'updated' | 'deleted';
  anchor: SpatialAnchor;
  timestamp: number;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IVRSessionManager {
  // State
  getState(): VRSessionState;
  
  // Session lifecycle
  startSession(config: VRSessionConfig): Promise<void>;
  endSession(): Promise<void>;
  pauseSession(): void;
  resumeSession(): void;
  
  // Capability checks
  isVRSupported(): Promise<boolean>;
  isARSupported(): Promise<boolean>;
  getCapabilities(): Promise<VRCapabilities>;
  
  // Events
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
}

export interface IVRAnchorManager {
  createAnchor(request: SpatialAnchorRequest): Promise<SpatialAnchor>;
  getAnchors(): Promise<SpatialAnchor[]>;
  getAnchor(id: string): Promise<SpatialAnchor | null>;
  updateAnchor(id: string, request: Partial<SpatialAnchorRequest>): Promise<SpatialAnchor>;
  deleteAnchor(id: string): Promise<void>;
}
