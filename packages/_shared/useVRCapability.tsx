/**
 * VR Capability Hook for Marketplace Packages
 *
 * This hook allows any 3D package to check if the vr-spatial-engine module
 * is installed and provides access to VR functionality without a hard dependency.
 *
 * Usage:
 * ```tsx
 * import { useVRCapability, VRButtonSlot } from '@eve/shared';
 *
 * function My3DComponent() {
 *   const { isVRAvailable, VRButton } = useVRCapability('my-view-id');
 *
 *   return (
 *     <div>
 *       <Canvas>...</Canvas>
 *       <VRButtonSlot viewId="my-view-id" position="top-right" />
 *     </div>
 *   );
 * }
 * ```
 */
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface VRCapabilityState {
  /** Whether the vr-spatial-engine module is installed */
  isInstalled: boolean;
  /** Whether the device supports WebXR */
  isWebXRSupported: boolean | null;
  /** Whether VR is currently available (installed + supported) */
  isVRAvailable: boolean;
  /** Whether a VR session is currently active */
  isSessionActive: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
}

export interface VRCapabilityActions {
  /** Enter VR mode */
  enterVR: () => Promise<void>;
  /** Exit VR mode */
  exitVR: () => Promise<void>;
  /** Refresh capability check */
  refresh: () => Promise<void>;
}

export interface VRCapability extends VRCapabilityState, VRCapabilityActions {
  /** The VRButton component if available, null otherwise */
  VRButton: React.ComponentType<VRButtonSlotProps> | null;
}

export interface VRButtonSlotProps {
  viewId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'floating';
  onSessionStart?: (session: unknown) => void;
  onSessionEnd?: () => void;
  onError?: (error: Error) => void;
  /** Called when VR module is not installed - use for marketplace prompt */
  onNotInstalled?: () => void;
}

// ============================================================================
// GLOBAL VR MODULE REGISTRY
// ============================================================================

/**
 * Global registry for VR module.
 * The vr-spatial-engine registers itself here when loaded.
 */
interface VRModuleRegistry {
  VRButton?: React.ComponentType<any>;
  VRSessionManager?: any;
  isWebXRSupported?: () => Promise<boolean>;
  enterVR?: (viewId: string) => Promise<unknown>;
  exitVR?: () => Promise<void>;
}

declare global {
  interface Window {
    __EVE_VR_MODULE__?: VRModuleRegistry;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const VRCapabilityContext = createContext<VRCapability | null>(null);

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access VR capabilities from any marketplace package.
 *
 * @param viewId - Unique identifier for the view (used for session management)
 * @returns VR capability state and actions
 */
export function useVRCapability(viewId: string): VRCapability {
  const [state, setState] = useState<VRCapabilityState>({
    isInstalled: false,
    isWebXRSupported: null,
    isVRAvailable: false,
    isSessionActive: false,
    isLoading: true,
    error: null,
  });

  // Check if VR module is available
  const checkVRAvailability = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if vr-spatial-engine has registered itself
      const vrModule = window.__EVE_VR_MODULE__;
      const isInstalled = !!vrModule?.VRButton;

      // Check WebXR support
      let isWebXRSupported = false;
      if (isInstalled && vrModule?.isWebXRSupported) {
        isWebXRSupported = await vrModule.isWebXRSupported();
      } else if (typeof navigator !== 'undefined' && navigator.xr) {
        try {
          isWebXRSupported = await navigator.xr.isSessionSupported('immersive-vr');
        } catch {
          isWebXRSupported = false;
        }
      }

      setState({
        isInstalled,
        isWebXRSupported,
        isVRAvailable: isInstalled && isWebXRSupported,
        isSessionActive: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check VR availability',
      }));
    }
  }, []);

  // Initial check
  useEffect(() => {
    checkVRAvailability();

    // Listen for VR module registration
    const handleVRModuleRegistered = () => {
      checkVRAvailability();
    };

    window.addEventListener('eve:vr-module-registered', handleVRModuleRegistered);
    return () => {
      window.removeEventListener('eve:vr-module-registered', handleVRModuleRegistered);
    };
  }, [checkVRAvailability]);

  // Actions
  const enterVR = useCallback(async () => {
    const vrModule = window.__EVE_VR_MODULE__;
    if (!vrModule?.enterVR) {
      throw new Error('VR module not installed');
    }
    await vrModule.enterVR(viewId);
    setState(prev => ({ ...prev, isSessionActive: true }));
  }, [viewId]);

  const exitVR = useCallback(async () => {
    const vrModule = window.__EVE_VR_MODULE__;
    if (!vrModule?.exitVR) {
      throw new Error('VR module not installed');
    }
    await vrModule.exitVR();
    setState(prev => ({ ...prev, isSessionActive: false }));
  }, []);

  const refresh = useCallback(async () => {
    await checkVRAvailability();
  }, [checkVRAvailability]);

  // Get VRButton component if available
  const VRButton = state.isInstalled ? window.__EVE_VR_MODULE__?.VRButton || null : null;

  return {
    ...state,
    enterVR,
    exitVR,
    refresh,
    VRButton: VRButton as React.ComponentType<VRButtonSlotProps> | null,
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * VRButtonSlot - Renders VR button if module is installed, or install prompt
 *
 * This component handles all the logic for showing VR entry UI:
 * - Shows VR button if vr-spatial-engine is installed
 * - Shows "Get VR" prompt if not installed (triggers marketplace)
 * - Shows nothing if WebXR not supported
 */
export function VRButtonSlot({
  viewId,
  className = '',
  size = 'md',
  variant = 'default',
  onSessionStart,
  onSessionEnd,
  onError,
  onNotInstalled,
}: VRButtonSlotProps) {
  const { isInstalled, isWebXRSupported, isLoading, VRButton } = useVRCapability(viewId);

  // Still loading
  if (isLoading) {
    return null;
  }

  // WebXR not supported - don't show anything
  if (isWebXRSupported === false) {
    return null;
  }

  // VR module installed - render actual button
  if (isInstalled && VRButton) {
    return (
      <VRButton
        viewId={viewId}
        className={className}
        size={size}
        variant={variant}
        onSessionStart={onSessionStart}
        onSessionEnd={onSessionEnd}
        onError={onError}
      />
    );
  }

  // VR module NOT installed - show install prompt button
  const handleInstallClick = () => {
    if (onNotInstalled) {
      onNotInstalled();
    } else {
      // Default: dispatch event for host to handle
      window.dispatchEvent(new CustomEvent('eve:request-module', {
        detail: {
          moduleId: 'vr-spatial-engine',
          reason: 'vr-button-clicked',
          sourceView: viewId,
        }
      }));
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  // Position classes for floating variant
  const positionClasses = variant === 'floating' ? 'fixed bottom-4 right-4 z-50' : '';

  return (
    <button
      onClick={handleInstallClick}
      className={`inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200
        bg-purple-600/50 hover:bg-purple-600 text-white border border-purple-500/50 border-dashed
        ${sizeClasses[size]} ${positionClasses} ${className}`}
      title="Install VR module to enable VR mode"
    >
      {/* VR goggles icon with plus */}
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.74 6H3.26C2.57 6 2 6.57 2 7.26v9.48c0 .7.57 1.26 1.26 1.26h5.48c.39 0 .74-.24.89-.6l1.5-3.6a.99.99 0 01.87-.6c.36 0 .7.24.87.6l1.5 3.6c.14.36.5.6.89.6h5.48c.7 0 1.26-.57 1.26-1.26V7.26C22 6.57 21.43 6 20.74 6zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm10 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
      </svg>
      <span>Get VR</span>
      <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

/**
 * Provider component for VR capability context
 * Wrap your app or 3D view section with this to share VR state
 */
export function VRCapabilityProvider({
  children,
  viewId
}: {
  children: React.ReactNode;
  viewId: string;
}) {
  const capability = useVRCapability(viewId);

  return (
    <VRCapabilityContext.Provider value={capability}>
      {children}
    </VRCapabilityContext.Provider>
  );
}

/**
 * Hook to access VR capability from context
 * Must be used within VRCapabilityProvider
 */
export function useVRCapabilityContext(): VRCapability {
  const context = useContext(VRCapabilityContext);
  if (!context) {
    throw new Error('useVRCapabilityContext must be used within VRCapabilityProvider');
  }
  return context;
}

// ============================================================================
// REGISTRATION HELPER (for vr-spatial-engine to use)
// ============================================================================

/**
 * Register VR module with the global registry.
 * Called by vr-spatial-engine when it initializes.
 */
export function registerVRModule(module: VRModuleRegistry): void {
  window.__EVE_VR_MODULE__ = module;
  window.dispatchEvent(new CustomEvent('eve:vr-module-registered'));
}

export default useVRCapability;
