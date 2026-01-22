/**
 * Beat Bubble VR - Marketplace Package
 *
 * Immersive 3D spherical beat mixer game.
 * Place beats on a spinning sphere inside a VR-ready environment.
 *
 * This is a COMPONENT type package for entertainment.
 */

// ============================================================================
// Component Metadata
// ============================================================================

export const COMPONENT_ID = 'beat-bubble-vr';
export const COMPONENT_TYPE = 'component';
export const COMPONENT_VERSION = '1.0.0';

// ============================================================================
// Core Exports
// ============================================================================

export { default, default as BeatBubbleVR } from './BeatBubbleVR';
export { default as ErrorBoundary } from './components/ErrorBoundary';

// ============================================================================
// Sound Types
// ============================================================================

export const SOUND_TYPES = [
  { id: 'kick', name: 'Kick', color: 0xff4444 },
  { id: 'snare', name: 'Snare', color: 0x44ff44 },
  { id: 'hihat', name: 'Hi-Hat', color: 0x4444ff },
  { id: 'bass', name: 'Bass', color: 0xff44ff },
  { id: 'synth', name: 'Synth', color: 0xffff44 },
] as const;

export type SoundType = typeof SOUND_TYPES[number]['id'];

// ============================================================================
// Track Configuration
// ============================================================================

export const TRACKS = [
  { angle: Math.PI * 0.15, name: 'Track 1' },
  { angle: Math.PI * 0.30, name: 'Track 2' },
  { angle: Math.PI * 0.45, name: 'Track 3' },
  { angle: Math.PI * 0.55, name: 'Track 4' },
  { angle: Math.PI * 0.70, name: 'Track 5' },
] as const;

// ============================================================================
// Capability Detection API
// ============================================================================

/**
 * Check if Beat Bubble VR is available
 */
export function isBeatBubbleAvailable(): boolean {
  return true;
}

/**
 * Check if WebGL is supported
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Check if Web Audio API is supported
 */
export function isWebAudioSupported(): boolean {
  return typeof AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined';
}

/**
 * Get game capabilities
 */
export interface BeatBubbleCapabilities {
  webgl: boolean;
  webAudio: boolean;
  vrReady: boolean;
}

export function getBeatBubbleCapabilities(): BeatBubbleCapabilities {
  return {
    webgl: isWebGLSupported(),
    webAudio: isWebAudioSupported(),
    vrReady: isWebGLSupported() && isWebAudioSupported(),
  };
}

// ============================================================================
// Integration API
// ============================================================================

export interface BeatBubbleConfig {
  initialTempo?: number;
  autoPlay?: boolean;
  sphereRadius?: number;
}

export const DEFAULT_CONFIG: BeatBubbleConfig = {
  initialTempo: 120,
  autoPlay: true,
  sphereRadius: 5,
};
