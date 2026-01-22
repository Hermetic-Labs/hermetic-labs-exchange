/**
 * VRButton - Button component to enter VR mode
 *
 * This button is injected into compatible views when the VR Spatial Engine
 * is installed. It handles WebXR session management and provides visual
 * feedback for VR availability.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { VRSessionManager, VRSessionOptions } from '../services/VRSessionManager';
import { isWebXRSupported } from '../index';

export interface VRButtonProps {
  viewId: string;
  onSessionStart?: (session: XRSession) => void;
  onSessionEnd?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'floating';
}

export const VRButton: React.FC<VRButtonProps> = ({
  viewId,
  onSessionStart,
  onSessionEnd,
  onError,
  className = '',
  size = 'md',
  variant = 'default',
}) => {
  const [sessionManager] = useState(() => new VRSessionManager());
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check WebXR support on mount
  useEffect(() => {
    const checkSupport = async () => {
      const supported = await isWebXRSupported();
      setIsSupported(supported);
    };
    checkSupport();
  }, []);

  // Subscribe to session events
  useEffect(() => {
    const handleSessionEnd = () => {
      setIsActive(false);
      onSessionEnd?.();
    };

    sessionManager.on('sessionEnd', handleSessionEnd);
    return () => {
      sessionManager.off('sessionEnd', handleSessionEnd);
    };
  }, [sessionManager, onSessionEnd]);

  const handleClick = useCallback(async () => {
    if (isLoading || isSupported === false) return;

    setIsLoading(true);

    try {
      if (isActive) {
        await sessionManager.endSession();
        setIsActive(false);
        onSessionEnd?.();
      } else {
        const options: VRSessionOptions = {
          viewId,
          mode: 'immersive-vr',
          features: ['local-floor', 'hand-tracking'],
        };
        const session = await sessionManager.startSession(options);
        setIsActive(true);
        onSessionStart?.(session);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('VR session failed');
      onError?.(err);
      console.error('[VRButton] Session error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isActive, isLoading, isSupported, sessionManager, viewId, onSessionStart, onSessionEnd, onError]);

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  // Variant classes
  const getVariantClasses = () => {
    const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200';

    if (variant === 'minimal') {
      return `${base} bg-transparent hover:bg-white/10 text-white`;
    }

    if (variant === 'floating') {
      return `${base} fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white shadow-lg z-50`;
    }

    // default
    if (isActive) {
      return `${base} bg-green-600 hover:bg-green-700 text-white`;
    }
    if (isSupported === false) {
      return `${base} bg-gray-600 text-gray-400 cursor-not-allowed`;
    }
    return `${base} bg-purple-600 hover:bg-purple-700 text-white`;
  };

  // Icon based on state
  const getIcon = () => {
    if (isLoading) {
      return (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      );
    }

    // VR goggles icon
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.74 6H3.26C2.57 6 2 6.57 2 7.26v9.48c0 .7.57 1.26 1.26 1.26h5.48c.39 0 .74-.24.89-.6l1.5-3.6a.99.99 0 01.87-.6c.36 0 .7.24.87.6l1.5 3.6c.14.36.5.6.89.6h5.48c.7 0 1.26-.57 1.26-1.26V7.26C22 6.57 21.43 6 20.74 6zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm10 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
      </svg>
    );
  };

  const getLabel = () => {
    if (isSupported === null) return 'Checking VR...';
    if (isSupported === false) return 'VR Not Available';
    if (isLoading) return isActive ? 'Exiting VR...' : 'Entering VR...';
    if (isActive) return 'Exit VR';
    return 'Enter VR';
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || isSupported === false}
      className={`${getVariantClasses()} ${sizeClasses[size]} ${className}`}
      title={isSupported === false ? 'WebXR is not supported on this device' : undefined}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </button>
  );
};

export default VRButton;
