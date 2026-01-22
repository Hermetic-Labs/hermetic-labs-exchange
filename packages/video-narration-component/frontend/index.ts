/**
 * Video Narration Editor - Marketplace Package
 *
 * Timeline-based video editor with TTS narration support.
 * Drop a script, chunk it, assign voices and speeds, overlay on video, and export.
 *
 * This is a COMPONENT type package for media production.
 */

// ============================================================================
// Component Metadata
// ============================================================================

export const COMPONENT_ID = 'video-narration-editor';
export const COMPONENT_TYPE = 'component';
export const COMPONENT_VERSION = '1.0.0';

// ============================================================================
// Core Exports
// ============================================================================

// Main component - MUST match first item in manifest.json "components"
export { default as VideoNarrationEditor } from './VideoNarrationEditor';

// Also export as default for sidebar integration
export { default } from './VideoNarrationEditor';

export { default as ErrorBoundary } from './components/ErrorBoundary';

// ============================================================================
// Sub-Component Exports
// ============================================================================

export { Header } from './components/Header';
export { VideoPreview } from './components/VideoPreview';
export { ScriptPanel } from './components/ScriptPanel';
export { ChunkEditor } from './components/ChunkEditor';
export { Timeline } from './components/Timeline';
export { SettingsModal } from './components/SettingsModal';
export { ExportModal } from './components/ExportModal';

// ============================================================================
// Service Exports
// ============================================================================

export {
  generateSpeech,
  availableVoices,
  setTTSConfig,
  getTTSConfig,
  checkTTSHealth,
  type TTSRequest,
  type TTSResponse,
} from './components/ttsService';

export {
  exportVideo,
  type ExportConfig,
  type ExportProgress,
  type ProgressCallback,
} from './components/exportService';

// ============================================================================
// Store Export
// ============================================================================

export { useProjectStore } from './components/useProjectStore';

// ============================================================================
// Types
// ============================================================================

export type {
  Chunk,
  AudioClip,
  VideoClip,
  Voice,
  ProjectSettings,
  Project,
  TrackType,
} from './types';

// ============================================================================
// Editor Constants
// ============================================================================

export const EDITOR_CONSTANTS = {
  MIN_SPEED: 0.5,
  MAX_SPEED: 2.0,
  DEFAULT_SPEED: 1.0,
  TIMELINE_ZOOM_MIN: 0.25,
  TIMELINE_ZOOM_MAX: 4.0,
  TRACK_HEIGHT: 60,
  SCRUBBER_HEIGHT: 280,
} as const;

// ============================================================================
// Capability Detection API
// ============================================================================

export function isEditorAvailable(): boolean {
  return true;
}

export function isAudioContextSupported(): boolean {
  return typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
}

export function isVideoSupported(): boolean {
  const video = document.createElement('video');
  return !!video.canPlayType;
}

export interface EditorCapabilities {
  audio: boolean;
  video: boolean;
  dragDrop: boolean;
  webSpeech: boolean;
}

export function getEditorCapabilities(): EditorCapabilities {
  return {
    audio: isAudioContextSupported(),
    video: isVideoSupported(),
    dragDrop: 'draggable' in document.createElement('span'),
    webSpeech: 'speechSynthesis' in window,
  };
}

// ============================================================================
// Integration API
// ============================================================================

export interface EditorConfig {
  ttsEndpoint?: string;
  apiKey?: string;
  defaultVoice?: string;
  onExport?: (blob: Blob, filename: string) => void;
}

export const DEFAULT_CONFIG: EditorConfig = {
  ttsEndpoint: 'http://localhost:8080/v1/audio/speech',
  defaultVoice: 'default',
};
