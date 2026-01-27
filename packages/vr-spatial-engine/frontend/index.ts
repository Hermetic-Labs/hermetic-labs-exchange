/**
 * VR Spatial Engine - EVE-OS Component
 *
 * This is a CAPABILITY component that enables VR functionality
 * across EVE-OS when installed. It provides:
 * - WebXR session management
 * - VR rendering capabilities
 * - Spatial tracking
 * - VR button injection into compatible views
 *
 * @packageDocumentation
 */

export { default, default as VRSceneEditor } from './VRSceneEditor';

/// <reference path="../../_shared/webxr.d.ts" />

// Import registration helper from shared
import { registerVRModule } from '../../_shared/useVRCapability';

// ============================================================================
// CAPABILITY DETECTION - Used by EVE Core to check if VR is available
// ============================================================================

/**
 * Check if VR component is installed and available
 */
export function isVRAvailable(): boolean {
    return true; // If this module loads, VR is available
}

/**
 * Check if device supports WebXR
 */
export async function isWebXRSupported(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.xr) return false;
    try {
        return await navigator.xr.isSessionSupported('immersive-vr');
    } catch {
        return false;
    }
}

/**
 * Get VR capability info for EVE Core integration
 */
export function getVRCapabilities() {
    return {
        id: 'vr-spatial-engine',
        name: 'VR Spatial Engine',
        version: '1.0.0',
        type: 'component' as const,
        capabilities: [
            'webxr',
            'spatial-tracking',
            'hand-tracking',
            'scene-rendering',
            'vr-mode'
        ],
        // Views that should show VR button when this component is installed
        compatibleViews: [
            'eve-core',        // Main EVE sphere view
            'vrm-companion',   // Companion 3D scene
            'chat',            // Chat interface
            'workspace'        // Workspace view
        ],
        // Other components this works with
        integrations: [
            'vrm-companion'    // Can render VRM avatars in VR
        ]
    };
}

// ============================================================================
// COMPONENT REGISTRATION
// ============================================================================

export const COMPONENT_ID = 'vr-spatial-engine';
export const COMPONENT_TYPE = 'component';
export const COMPONENT_CATEGORY = 'capability';

// ============================================================================
// VR SESSION MANAGEMENT
// ============================================================================

export { VRSessionManager } from './services/VRSessionManager';

// ============================================================================
// COMPONENTS - React components for VR UI
// ============================================================================

export { VRButton } from './components/VRButton';
// VRSceneEditor already exported above as default
export { VROverlay } from './components/VROverlay';
export { VRSceneProvider, useVRScene } from './components/VRSceneProvider';
export type { VRSceneProviderProps, VRSceneContextValue } from './components/VRSceneProvider';

// ============================================================================
// SERVICES
// ============================================================================

export { VRSceneService } from './services/VRSceneService';
export { VRSpatialTrackingService } from './services/VRSpatialTrackingService';
export { VRInteractionService } from './services/VRInteractionService';

// ============================================================================
// TYPES
// ============================================================================

export type * from './types';

// ============================================================================
// INTEGRATION API - For EVE Core to use
// ============================================================================

export interface EVECoreIntegration {
    registerCapability: (capability: ReturnType<typeof getVRCapabilities>) => void;
    onCapabilityReady: (id: string, callback: () => void) => void;
}

/**
 * Register VR capability with EVE Core
 * Called automatically when component is activated
 */
export function registerWithEveCore(eveCore: EVECoreIntegration): void {
    eveCore.registerCapability(getVRCapabilities());
}

/**
 * Check if VR button should be shown for a given view
 */
export function shouldShowVRButton(viewId: string): boolean {
    const caps = getVRCapabilities();
    return caps.compatibleViews.includes(viewId);
}

/**
 * Initialize VR for a specific view
 */
export async function initializeVRForView(viewId: string): Promise<{
    supported: boolean;
    session?: unknown;
    error?: string;
}> {
    const supported = await isWebXRSupported();
    if (!supported) {
        return { supported: false, error: 'WebXR not supported on this device' };
    }

    // VR session would be created here
    return { supported: true };
}

// ============================================================================
// GLOBAL REGISTRATION - Auto-register when module loads
// ============================================================================

import { VRButton } from './components/VRButton';
import { getVRSessionManager } from './services/VRSessionManager';

// Register VR module with global registry so other packages can discover it
if (typeof window !== 'undefined') {
    const sessionManager = getVRSessionManager();

    registerVRModule({
        VRButton,
        VRSessionManager: sessionManager,
        isWebXRSupported,
        enterVR: async (viewId: string) => {
            return sessionManager.startSession({
                viewId,
                mode: 'immersive-vr',
                features: ['local-floor', 'hand-tracking'],
            });
        },
        exitVR: async () => {
            await sessionManager.endSession();
        },
    });

    console.log('[VR Spatial Engine] Registered with EVE module system');
}
