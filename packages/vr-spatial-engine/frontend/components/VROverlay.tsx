/**
 * VROverlay - Overlay UI for VR mode
 *
 * This component provides an overlay UI that appears when in VR mode,
 * showing status information and controls.
 */
import React, { useState, useEffect } from 'react';

export interface VROverlayProps {
  session: XRSession | null;
  onExitVR?: () => void;
  showStatus?: boolean;
  showControls?: boolean;
  className?: string;
}

interface VRStatus {
  frameRate: number;
  referenceSpace: string;
  inputSources: number;
  handTracking: boolean;
}

export const VROverlay: React.FC<VROverlayProps> = ({
  session,
  onExitVR,
  showStatus = true,
  showControls = true,
  className = '',
}) => {
  const [status, setStatus] = useState<VRStatus>({
    frameRate: 0,
    referenceSpace: 'unknown',
    inputSources: 0,
    handTracking: false,
  });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!session) return;

    // Update status periodically
    const updateStatus = () => {
      setStatus({
        frameRate: session.frameRate ?? 0,
        referenceSpace: 'local-floor',
        inputSources: session.inputSources?.length ?? 0,
        handTracking: Array.from(session.inputSources ?? []).some(
          (source) => source.hand !== null
        ),
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, [session]);

  if (!session) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-50 ${className}`}
      style={{ display: isVisible ? 'block' : 'none' }}
    >
      {/* Top status bar */}
      {showStatus && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-4 text-white text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>VR Active</span>
            </div>
            <div className="h-4 w-px bg-white/30" />
            <span>{status.frameRate.toFixed(0)} FPS</span>
            <div className="h-4 w-px bg-white/30" />
            <span>{status.inputSources} controller{status.inputSources !== 1 ? 's' : ''}</span>
            {status.handTracking && (
              <>
                <div className="h-4 w-px bg-white/30" />
                <span className="text-purple-400">Hand Tracking</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="bg-black/60 backdrop-blur-sm rounded-full p-3 text-white hover:bg-black/80 transition-colors"
              title="Toggle overlay"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isVisible ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'}
                />
              </svg>
            </button>

            <button
              onClick={onExitVR}
              className="bg-red-600/80 backdrop-blur-sm rounded-full px-4 py-3 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Exit VR</span>
            </button>

            <button
              onClick={() => {
                // Recenter view - would need session reference
                console.log('[VROverlay] Recenter requested');
              }}
              className="bg-black/60 backdrop-blur-sm rounded-full p-3 text-white hover:bg-black/80 transition-colors"
              title="Recenter view"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Corner info */}
      <div className="absolute bottom-4 left-4 pointer-events-auto">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 text-white/60 text-xs">
          <p>VR Spatial Engine v1.0.0</p>
          <p className="text-white/40">{status.referenceSpace}</p>
        </div>
      </div>
    </div>
  );
};

export default VROverlay;
