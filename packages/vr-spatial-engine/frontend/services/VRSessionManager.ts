/**
 * VR Session Manager
 * Manages WebXR sessions for VR experiences
 */

/// <reference path="../../../_shared/webxr.d.ts" />

import { EventEmitter } from '../../../_shared/EventEmitter';

export interface VRSessionOptions {
    viewId: string;
    mode?: 'immersive-vr' | 'immersive-ar' | 'inline';
    features?: string[];
    frameRate?: number;
}

export interface VRSessionState {
    active: boolean;
    mode: string | null;
    viewId: string | null;
    startedAt: Date | null;
}

export class VRSessionManager extends EventEmitter {
    private session: XRSession | null = null;
    private state: VRSessionState = {
        active: false,
        mode: null,
        viewId: null,
        startedAt: null
    };

    /**
     * Start a VR session for a specific view
     */
    async startSession(options: VRSessionOptions): Promise<XRSession> {
        if (this.session) {
            await this.endSession();
        }

        if (!navigator.xr) {
            throw new Error('WebXR not available');
        }

        const mode = options.mode || 'immersive-vr';
        const supported = await navigator.xr.isSessionSupported(mode);
        
        if (!supported) {
            throw new Error(`XR mode '${mode}' not supported`);
        }

        const sessionInit: XRSessionInit = {
            optionalFeatures: options.features || [
                'local-floor',
                'bounded-floor',
                'hand-tracking',
                'layers'
            ]
        };

        this.session = await navigator.xr.requestSession(mode, sessionInit);
        
        this.state = {
            active: true,
            mode,
            viewId: options.viewId,
            startedAt: new Date()
        };

        this.session.addEventListener('end', () => {
            this.handleSessionEnd();
        });

        this.emit('session:started', { viewId: options.viewId, mode });
        
        return this.session;
    }

    /**
     * End the current VR session
     */
    async endSession(): Promise<void> {
        if (this.session) {
            await this.session.end();
            this.session = null;
        }
    }

    /**
     * Handle session end event
     */
    private handleSessionEnd(): void {
        const previousViewId = this.state.viewId;
        
        this.state = {
            active: false,
            mode: null,
            viewId: null,
            startedAt: null
        };
        this.session = null;
        
        this.emit('session:ended', { viewId: previousViewId });
    }

    /**
     * Get current session state
     */
    getState(): VRSessionState {
        return { ...this.state };
    }

    /**
     * Check if a session is active
     */
    isActive(): boolean {
        return this.state.active;
    }

    /**
     * Get the current XR session
     */
    getSession(): XRSession | null {
        return this.session;
    }
}

// Singleton instance for app-wide VR management
let vrSessionManager: VRSessionManager | null = null;

export function getVRSessionManager(): VRSessionManager {
    if (!vrSessionManager) {
        vrSessionManager = new VRSessionManager();
    }
    return vrSessionManager;
}

export async function createVRSession(options: VRSessionOptions): Promise<XRSession> {
    return getVRSessionManager().startSession(options);
}
