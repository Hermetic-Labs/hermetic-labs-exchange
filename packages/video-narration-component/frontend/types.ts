/**
 * Video Narration Editor - Type Definitions
 */

export interface Chunk {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  voiceId: string;
  speed: number;
  audioUrl?: string;
  duration?: number;
}

export interface AudioClip {
  id: string;
  chunkId: string;
  startTime: number;
  duration: number;
  audioUrl: string;
}

export interface VideoClip {
  id: string;
  startTime: number;
  duration: number;
  sourceUrl: string;
  name: string;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
}

export interface ProjectSettings {
  ttsApiEndpoint: string;
  apiKey: string;
  defaultVoiceId: string;
}

export interface Project {
  id: string;
  name: string;
  scriptText: string;
  chunks: Chunk[];
  audioClips: AudioClip[];
  videoClips: VideoClip[];
  settings: ProjectSettings;
}

export type TrackType = 'audio' | 'video';
