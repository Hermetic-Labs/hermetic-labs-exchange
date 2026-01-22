/**
 * Export Service - Video/Audio encoding
 *
 * Uses browser-based MediaRecorder for WebM export (fast, client-side)
 * Uses backend moviepy/ffmpeg for MP4 export (proper encoding, server-side)
 */

import type { AudioClip, VideoClip } from '../types';

export interface ExportConfig {
  resolution: '720p' | '1080p';
  format: 'mp4' | 'webm';
  audioClips: AudioClip[];
  videoClips: VideoClip[];
  projectName?: string;
}

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error';
  progress: number;
  message: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

// Resolution presets
const RESOLUTIONS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 }
};

/**
 * Wait for video to seek to a specific time and be ready
 * Prevents flickering by ensuring the frame is loaded
 */
async function seekVideoAndWait(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.02) {
      resolve();
      return;
    }

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}

/**
 * Export project to video file
 *
 * For WebM: Uses browser's MediaRecorder (client-side)
 * For MP4: Uses backend moviepy/ffmpeg (server-side)
 */
export async function exportVideo(
  config: ExportConfig,
  onProgress: ProgressCallback
): Promise<string> {
  const { format } = config;

  // For MP4, use server-side encoding with moviepy
  if (format === 'mp4') {
    return exportVideoServerSide(config, onProgress);
  }

  // For WebM, use client-side encoding
  return exportVideoClientSide(config, onProgress);
}

/**
 * Server-side video rendering using moviepy/ffmpeg
 * Produces proper MP4 with H.264/AAC codecs
 */
async function exportVideoServerSide(
  config: ExportConfig,
  onProgress: ProgressCallback
): Promise<string> {
  const { resolution, audioClips, videoClips, projectName } = config;

  onProgress({ stage: 'preparing', progress: 10, message: 'Preparing for server-side render...' });

  try {
    // Check if we have local file paths (for clips already saved)
    // For browser blob URLs, we need to upload them first
    const preparedAudioClips = [];
    const preparedVideoClips = [];

    onProgress({ stage: 'preparing', progress: 20, message: 'Uploading clips to server...' });

    // Upload audio clips that are blob URLs
    for (const clip of audioClips) {
      if (clip.audioUrl && clip.audioUrl.startsWith('blob:')) {
        // Upload blob to server
        const response = await fetch(clip.audioUrl);
        const blob = await response.blob();
        const uploadedPath = await uploadToServer(blob, `audio_${clip.id}.wav`);
        preparedAudioClips.push({
          ...clip,
          audioUrl: uploadedPath,
          url: uploadedPath
        });
      } else if (clip.audioUrl && !clip.audioUrl.startsWith('data:')) {
        preparedAudioClips.push(clip);
      }
    }

    // Upload video clips that are blob URLs
    for (const clip of videoClips) {
      if (clip.url && clip.url.startsWith('blob:')) {
        const response = await fetch(clip.url);
        const blob = await response.blob();
        const uploadedPath = await uploadToServer(blob, `video_${clip.id}.webm`);
        preparedVideoClips.push({
          ...clip,
          url: uploadedPath
        });
      } else if (clip.url) {
        preparedVideoClips.push(clip);
      }
    }

    onProgress({ stage: 'rendering', progress: 40, message: 'Rendering video on server...' });

    // Call backend render endpoint
    const response = await fetch('/api/marketplace/modules/render-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_clips: preparedAudioClips.map(c => ({
          audioUrl: c.audioUrl,
          startTime: c.startTime,
          duration: c.duration
        })),
        video_clips: preparedVideoClips.map(c => ({
          url: c.url,
          startTime: c.startTime,
          duration: c.duration
        })),
        output_format: 'mp4',
        resolution,
        project_name: projectName || 'export'
      })
    });

    onProgress({ stage: 'encoding', progress: 80, message: 'Finalizing MP4...' });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Server-side render failed');
    }

    onProgress({ stage: 'complete', progress: 100, message: `Export complete: ${result.filename}` });

    // Return the server path - user can download from there
    return result.output_path;

  } catch (error) {
    console.error('[Export] Server-side render error:', error);

    // Fallback to client-side export as WebM
    onProgress({ stage: 'preparing', progress: 0, message: 'Falling back to client-side WebM export...' });
    return exportVideoClientSide({ ...config, format: 'webm' }, onProgress);
  }
}

/**
 * Upload a blob to the server and return the file path
 */
async function uploadToServer(blob: Blob, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('module', 'video-narration-component');
  formData.append('folder', 'temp');

  const response = await fetch('/api/marketplace/modules/save-file', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload file to server');
  }

  const result = await response.json();
  return result.path;
}

/**
 * Client-side video export using browser's MediaRecorder
 * Produces WebM with VP8/VP9 codec
 */
async function exportVideoClientSide(
  config: ExportConfig,
  onProgress: ProgressCallback
): Promise<string> {
  const { resolution, audioClips, videoClips, projectName, format } = config;
  const { width, height } = RESOLUTIONS[resolution];

  console.log('[Export] Starting client-side export:', { resolution, format, audioClips: audioClips.length, videoClips: videoClips.length });

  try {
    onProgress({ stage: 'preparing', progress: 5, message: 'Preparing canvas...' });

    // Calculate total duration
    const totalDuration = Math.max(
      ...audioClips.map(c => c.startTime + c.duration),
      ...videoClips.map(c => c.startTime + c.duration),
      1
    );

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;

    // Set up MediaRecorder
    const stream = canvas.captureStream(30);

    // Create audio context for mixing
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();

    if (audioClips.length > 0) {
      stream.addTrack(audioDestination.stream.getAudioTracks()[0]);
    }

    // Check codec support
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: resolution === '1080p' ? 5000000 : 2500000
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    onProgress({ stage: 'preparing', progress: 15, message: 'Loading video sources...' });

    // Load video elements
    const videoElements: Map<string, HTMLVideoElement> = new Map();
    for (const clip of videoClips) {
      if (clip.url) {
        const video = document.createElement('video');
        video.src = clip.url;
        video.muted = true;
        video.preload = 'auto';
        video.playsInline = true;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error(`Timeout loading video`)), 30000);
          video.oncanplaythrough = () => { clearTimeout(timeout); resolve(); };
          video.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load video')); };
          video.load();
        });

        videoElements.set(clip.id, video);
      }
    }

    // Load audio buffers
    const audioBuffers: Map<string, { buffer: AudioBuffer; startTime: number }> = new Map();
    for (const clip of audioClips) {
      if (clip.audioUrl && !clip.audioUrl.startsWith('data:audio/wav;native')) {
        try {
          const response = await fetch(clip.audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          audioBuffers.set(clip.id, { buffer: audioBuffer, startTime: clip.startTime });
        } catch (err) {
          console.warn('[Export] Failed to load audio clip:', clip.id, err);
        }
      }
    }

    onProgress({ stage: 'rendering', progress: 25, message: 'Starting render...' });

    recorder.start(100);

    // Schedule audio
    const audioStartTime = audioContext.currentTime + 0.1;
    for (const [, { buffer, startTime }] of audioBuffers) {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioDestination);
      source.start(audioStartTime + startTime);
    }

    // Render frames
    const fps = 24;
    const frameCount = Math.ceil(totalDuration * fps);
    let lastVideoId: string | null = null;

    for (let frame = 0; frame <= frameCount; frame++) {
      const currentTime = frame / fps;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Find active video clip
      let activeClip: VideoClip | null = null;
      for (const clip of videoClips) {
        if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
          activeClip = clip;
          break;
        }
      }

      if (activeClip) {
        const video = videoElements.get(activeClip.id);
        if (video) {
          const clipTime = currentTime - activeClip.startTime;

          if (lastVideoId !== activeClip.id || Math.abs(video.currentTime - clipTime) > 0.1) {
            await seekVideoAndWait(video, clipTime);
          }
          lastVideoId = activeClip.id;

          // Draw with aspect ratio preservation
          const videoAspect = video.videoWidth / video.videoHeight;
          const canvasAspect = width / height;
          let drawWidth = width, drawHeight = height, drawX = 0, drawY = 0;

          if (videoAspect > canvasAspect) {
            drawHeight = width / videoAspect;
            drawY = (height - drawHeight) / 2;
          } else {
            drawWidth = height * videoAspect;
            drawX = (width - drawWidth) / 2;
          }

          ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
        }
      } else {
        lastVideoId = null;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        const activeAudio = audioClips.find(c => currentTime >= c.startTime && currentTime < c.startTime + c.duration);
        if (activeAudio) {
          ctx.fillStyle = '#06b6d4';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('♪ Audio Playing', width / 2, height / 2);
        }
      }

      const progress = 25 + Math.floor((frame / frameCount) * 60);
      if (frame % fps === 0) {
        onProgress({
          stage: 'rendering',
          progress,
          message: `Rendering ${Math.round(currentTime)}s / ${Math.round(totalDuration)}s...`
        });
      }

      await new Promise(r => setTimeout(r, 1000 / fps / 3));
    }

    onProgress({ stage: 'encoding', progress: 90, message: 'Finalizing video...' });

    recorder.stop();
    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
    await audioContext.close();

    onProgress({ stage: 'encoding', progress: 95, message: 'Creating file...' });

    const blob = new Blob(chunks, { type: mimeType });
    const filename = `${projectName || 'export'}_${Date.now()}.webm`;

    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Try to save to server
    try {
      await saveToExportFolder(blob, filename);
    } catch (err) {
      console.warn('[Export] Could not save to server:', err);
    }

    onProgress({ stage: 'complete', progress: 100, message: `Export complete: ${filename}` });

    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return url;

  } catch (error) {
    console.error('[Export] Error:', error);
    onProgress({
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Export failed'
    });
    throw error;
  }
}

async function saveToExportFolder(blob: Blob, filename: string): Promise<void> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('module', 'video-narration-component');
  formData.append('folder', 'export');

  const response = await fetch('/api/marketplace/modules/save-file', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to save to export folder');
  }
}

/**
 * Audio-only export
 */
export async function exportAudioOnly(
  audioClips: AudioClip[],
  onProgress: ProgressCallback
): Promise<string> {
  onProgress({ stage: 'preparing', progress: 10, message: 'Preparing audio...' });

  const audioContext = new OfflineAudioContext(2, 44100 * 300, 44100);
  const totalDuration = Math.max(...audioClips.map(c => c.startTime + c.duration), 1);

  onProgress({ stage: 'rendering', progress: 30, message: 'Loading audio clips...' });

  for (const clip of audioClips) {
    if (clip.audioUrl && !clip.audioUrl.startsWith('data:audio/wav;native')) {
      try {
        const response = await fetch(clip.audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(clip.startTime);
      } catch (err) {
        console.warn('[Export] Failed to load audio:', clip.id, err);
      }
    }
  }

  onProgress({ stage: 'encoding', progress: 60, message: 'Rendering audio...' });

  const renderedBuffer = await audioContext.startRendering();

  onProgress({ stage: 'encoding', progress: 80, message: 'Encoding WAV...' });

  const wavBlob = audioBufferToWav(renderedBuffer, totalDuration);
  const url = URL.createObjectURL(wavBlob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `audio_export_${Date.now()}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  onProgress({ stage: 'complete', progress: 100, message: 'Audio export complete!' });

  return url;
}

function audioBufferToWav(buffer: AudioBuffer, duration: number): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = Math.min(buffer.length, Math.ceil(duration * sampleRate));
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;

  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// ============================================================================
// Subtitle/Caption Export
// ============================================================================

export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
  }>;
}

/**
 * Generate subtitles from audio clips (Instagram-style word-by-word)
 */
export function generateSubtitles(
  chunks: Array<{ text: string; startTime: number; duration: number }>,
  style: 'srt' | 'vtt' | 'json' = 'srt'
): string {
  const cues: SubtitleCue[] = [];

  for (const chunk of chunks) {
    const words = chunk.text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) continue;

    // Calculate timing for each word based on duration
    const wordsPerSecond = words.length / chunk.duration;
    const wordDuration = chunk.duration / words.length;

    const wordTimings: Array<{ word: string; startTime: number; endTime: number }> = [];

    words.forEach((word, i) => {
      const wordStart = chunk.startTime + (i * wordDuration);
      const wordEnd = wordStart + wordDuration;
      wordTimings.push({ word, startTime: wordStart, endTime: wordEnd });
    });

    // Create cues - group words into subtitle chunks (max 8 words per cue)
    const maxWordsPerCue = 8;
    for (let i = 0; i < wordTimings.length; i += maxWordsPerCue) {
      const cueWords = wordTimings.slice(i, i + maxWordsPerCue);
      if (cueWords.length === 0) continue;

      cues.push({
        startTime: cueWords[0].startTime,
        endTime: cueWords[cueWords.length - 1].endTime,
        text: cueWords.map(w => w.word).join(' '),
        words: cueWords
      });
    }
  }

  if (style === 'json') {
    return JSON.stringify({ cues }, null, 2);
  }

  if (style === 'vtt') {
    return generateVTT(cues);
  }

  return generateSRT(cues);
}

/**
 * Generate SRT format subtitles
 */
function generateSRT(cues: SubtitleCue[]): string {
  return cues.map((cue, index) => {
    const startTime = formatSRTTime(cue.startTime);
    const endTime = formatSRTTime(cue.endTime);
    return `${index + 1}\n${startTime} --> ${endTime}\n${cue.text}\n`;
  }).join('\n');
}

/**
 * Generate WebVTT format subtitles
 */
function generateVTT(cues: SubtitleCue[]): string {
  let vtt = 'WEBVTT\n\n';

  cues.forEach((cue, index) => {
    const startTime = formatVTTTime(cue.startTime);
    const endTime = formatVTTTime(cue.endTime);
    vtt += `${index + 1}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    vtt += `${cue.text}\n\n`;
  });

  return vtt;
}

/**
 * Generate Instagram-style animated subtitles (JSON with word timings)
 * Useful for overlay rendering in the video
 */
export function generateInstagramCaptions(
  chunks: Array<{ text: string; startTime: number; duration: number }>
): {
  cues: SubtitleCue[];
  style: {
    fontFamily: string;
    fontSize: number;
    color: string;
    highlightColor: string;
    position: 'top' | 'center' | 'bottom';
  };
} {
  const cues: SubtitleCue[] = [];

  for (const chunk of chunks) {
    const words = chunk.text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) continue;

    const wordDuration = chunk.duration / words.length;
    const wordTimings: Array<{ word: string; startTime: number; endTime: number }> = [];

    words.forEach((word, i) => {
      const wordStart = chunk.startTime + (i * wordDuration);
      const wordEnd = wordStart + wordDuration;
      wordTimings.push({ word, startTime: wordStart, endTime: wordEnd });
    });

    // For Instagram-style, we create one cue per phrase with word-level timing
    cues.push({
      startTime: wordTimings[0].startTime,
      endTime: wordTimings[wordTimings.length - 1].endTime,
      text: chunk.text,
      words: wordTimings
    });
  }

  return {
    cues,
    style: {
      fontFamily: 'Inter, -apple-system, sans-serif',
      fontSize: 42,
      color: '#ffffff',
      highlightColor: '#00d4ff',
      position: 'center'
    }
  };
}

function formatSRTTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatVTTTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Export subtitles to file
 */
export function exportSubtitles(
  chunks: Array<{ text: string; startTime: number; duration: number }>,
  format: 'srt' | 'vtt' | 'json'
): void {
  const content = generateSubtitles(chunks, format);
  const ext = format;
  const mimeType = format === 'json' ? 'application/json' : 'text/plain';

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `subtitles_${Date.now()}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
