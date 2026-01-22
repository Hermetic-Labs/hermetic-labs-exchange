import { create } from 'zustand';
import type { Chunk, AudioClip, VideoClip, ProjectSettings } from '../types';

const DEMO_SCRIPT = `Welcome to the Video Narration Timeline Editor. This powerful tool allows you to create professional narrated videos from text scripts.

Start by writing or importing your script in this panel. Then, highlight sections of text to create individual chunks that can be assigned different voices and speaking speeds.

Each chunk can be customized with a unique voice from your TTS engine and adjusted for pacing. Once you're satisfied with your chunks, generate the audio and arrange them on the timeline below.

The timeline supports both audio and video tracks, allowing you to synchronize your narration with visual content. Drag and drop clips to reposition them, and use the playhead to preview your work.

When everything is ready, export your final video with the click of a button.`;

interface ProjectState {
  projectName: string;
  scriptText: string;
  chunks: Chunk[];
  audioClips: AudioClip[];
  videoClips: VideoClip[];
  settings: ProjectSettings;
  selectedChunkId: string | null;
  playheadPosition: number;
  isPlaying: boolean;
  totalDuration: number;
  
  setProjectName: (name: string) => void;
  setScriptText: (text: string) => void;
  addChunk: (chunk: Chunk) => void;
  updateChunk: (id: string, updates: Partial<Chunk>) => void;
  removeChunk: (id: string) => void;
  selectChunk: (id: string | null) => void;
  addAudioClip: (clip: AudioClip) => void;
  updateAudioClip: (id: string, updates: Partial<AudioClip>) => void;
  removeAudioClip: (id: string) => void;
  addVideoClip: (clip: VideoClip) => void;
  updateVideoClip: (id: string, updates: Partial<VideoClip>) => void;
  removeVideoClip: (id: string) => void;
  setPlayheadPosition: (position: number) => void;
  setIsPlaying: (playing: boolean) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  calculateTotalDuration: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectName: 'Untitled Project',
  scriptText: DEMO_SCRIPT,
  chunks: [],
  audioClips: [],
  videoClips: [],
  settings: {
    ttsApiEndpoint: 'http://localhost:8880/v1',
    apiKey: '',
    defaultVoiceId: 'af_sky',
  },
  selectedChunkId: null,
  playheadPosition: 0,
  isPlaying: false,
  totalDuration: 60,

  setProjectName: (name) => set({ projectName: name }),
  setScriptText: (text) => set({ scriptText: text }),
  
  addChunk: (chunk) => set((state) => ({ chunks: [...state.chunks, chunk] })),
  updateChunk: (id, updates) => set((state) => ({
    chunks: state.chunks.map((c) => c.id === id ? { ...c, ...updates } : c),
  })),
  removeChunk: (id) => set((state) => ({
    chunks: state.chunks.filter((c) => c.id !== id),
    audioClips: state.audioClips.filter((a) => a.chunkId !== id),
    selectedChunkId: state.selectedChunkId === id ? null : state.selectedChunkId,
  })),
  selectChunk: (id) => set({ selectedChunkId: id }),
  
  addAudioClip: (clip) => {
    set((state) => ({ audioClips: [...state.audioClips, clip] }));
    get().calculateTotalDuration();
  },
  updateAudioClip: (id, updates) => {
    set((state) => ({
      audioClips: state.audioClips.map((a) => a.id === id ? { ...a, ...updates } : a),
    }));
    get().calculateTotalDuration();
  },
  removeAudioClip: (id) => {
    set((state) => ({ audioClips: state.audioClips.filter((a) => a.id !== id) }));
    get().calculateTotalDuration();
  },
  
  addVideoClip: (clip) => {
    set((state) => ({ videoClips: [...state.videoClips, clip] }));
    get().calculateTotalDuration();
  },
  updateVideoClip: (id, updates) => {
    set((state) => ({
      videoClips: state.videoClips.map((v) => v.id === id ? { ...v, ...updates } : v),
    }));
    get().calculateTotalDuration();
  },
  removeVideoClip: (id) => {
    set((state) => ({ videoClips: state.videoClips.filter((v) => v.id !== id) }));
    get().calculateTotalDuration();
  },
  
  setPlayheadPosition: (position) => set({ playheadPosition: position }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  updateSettings: (settings) => set((state) => ({
    settings: { ...state.settings, ...settings },
  })),
  
  calculateTotalDuration: () => {
    const state = get();
    const audioEnd = Math.max(0, ...state.audioClips.map((a) => a.startTime + a.duration));
    const videoEnd = Math.max(0, ...state.videoClips.map((v) => v.startTime + v.duration));
    const total = Math.max(60, audioEnd, videoEnd);
    set({ totalDuration: total });
  },
}));
