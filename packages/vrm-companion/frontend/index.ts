/**
 * VRM Companion Component - Marketplace Package
 *
 * A 3D VRM avatar companion component that provides:
 * - VRM 1.0 avatar loading with Three.js
 * - Phoneme-driven lip sync via Kokoro TTS
 * - Amplitude fallback mode
 * - EVE Core integration (swap sphere with VRM character)
 * - VR-ready when vr-spatial-engine is installed
 *
 * This is a COMPONENT type package that injects avatar capabilities
 * into EVE Core, allowing users to replace the sphere with a full character.
 */

// ============================================================================
// Component Metadata
// ============================================================================

export const COMPONENT_ID = 'vrm-companion';
export const COMPONENT_TYPE = 'component';
export const COMPONENT_VERSION = '1.0.0';

// ============================================================================
// Core Exports
// ============================================================================

export { VRMCompanion, default } from './VRMCompanion';
export { LipSyncService } from './LipSyncService';
export type { VisemeKey, PhonemeEvent, LipSyncConfig } from './LipSyncService';

// ============================================================================
// Capability Detection API
// ============================================================================

/**
 * Check if companion capabilities are available
 */
export function isCompanionAvailable(): boolean {
  return true; // Component is loaded
}

/**
 * Check if VR integration is available (vr-spatial-engine installed)
 */
export async function isVRIntegrationAvailable(): Promise<boolean> {
  try {
    // Check if VR spatial engine is registered
    const response = await fetch('/api/marketplace/packages/vr-spatial-engine/status');
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get companion capabilities
 */
export interface CompanionCapabilities {
  avatarLoading: boolean;
  lipSync: boolean;
  phonemeDriven: boolean;
  amplitudeMode: boolean;
  vrReady: boolean;
  eveCoreIntegration: boolean;
}

export async function getCompanionCapabilities(): Promise<CompanionCapabilities> {
  const vrReady = await isVRIntegrationAvailable();
  
  return {
    avatarLoading: true,
    lipSync: true,
    phonemeDriven: true,
    amplitudeMode: true,
    vrReady,
    eveCoreIntegration: true,
  };
}

// ============================================================================
// EVE Core Integration API
// ============================================================================

export interface EveCoreIntegrationConfig {
  autoReplaceSphere?: boolean;
  defaultAvatarUrl?: string;
  enableCompanionButton?: boolean;
  buttonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Check if EVE Core is available for integration
 */
export async function isEveCoreAvailable(): Promise<boolean> {
  try {
    // Check if eve-core view is registered
    const response = await fetch('/api/views/eve-core/status');
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Should show companion button in a given view?
 */
export function shouldShowCompanionButton(viewId: string): boolean {
  const compatibleViews = ['eve-core', 'chat', 'spatial-workspace'];
  return compatibleViews.includes(viewId);
}

/**
 * Register companion with EVE Core
 * This injects the "swap to companion" button into EVE Core's view
 */
export async function registerWithEveCore(config: EveCoreIntegrationConfig = {}): Promise<boolean> {
  const isAvailable = await isEveCoreAvailable();
  if (!isAvailable) {
    console.warn('[VRMCompanion] EVE Core not available for integration');
    return false;
  }
  
  try {
    const response = await fetch('/api/views/eve-core/register-companion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        componentId: COMPONENT_ID,
        config: {
          enableCompanionButton: config.enableCompanionButton ?? true,
          buttonPosition: config.buttonPosition ?? 'top-right',
          autoReplaceSphere: config.autoReplaceSphere ?? false,
          defaultAvatarUrl: config.defaultAvatarUrl,
        },
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[VRMCompanion] Failed to register with EVE Core:', error);
    return false;
  }
}

/**
 * Swap EVE Core's sphere with VRM companion character
 */
export async function swapEveCoreToCompanion(avatarUrl?: string): Promise<boolean> {
  try {
    const response = await fetch('/api/views/eve-core/swap-representation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        representation: 'vrm-companion',
        avatarUrl,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[VRMCompanion] Failed to swap EVE Core representation:', error);
    return false;
  }
}

/**
 * Restore EVE Core back to sphere representation
 */
export async function restoreEveCoreToSphere(): Promise<boolean> {
  try {
    const response = await fetch('/api/views/eve-core/swap-representation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        representation: 'sphere',
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[VRMCompanion] Failed to restore EVE Core to sphere:', error);
    return false;
  }
}
