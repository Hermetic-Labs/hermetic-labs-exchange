/**
 * TTS Service for Video Narration Editor
 *
 * Integrates with EVE-OS Kokoro TTS backend at /tts/voices and /tts/synthesize.
 * Falls back to browser native speech synthesis if Kokoro is unavailable.
 */

import type { Voice } from '../types';

// ============================================================================
// Voice Types
// ============================================================================

interface KokoroVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
}

interface VoiceOption extends Voice {
  provider: 'kokoro' | 'native';
  gender?: string;
}

// ============================================================================
// State
// ============================================================================

let cachedVoices: VoiceOption[] = [];
let voicesLoaded = false;
let kokoroAvailable = false;

// ============================================================================
// Voice Loading
// ============================================================================

/**
 * Fetch available voices from both Kokoro backend and browser
 */
export async function loadVoices(): Promise<VoiceOption[]> {
  const allVoices: VoiceOption[] = [];

  // Load Kokoro voices from EVE backend
  try {
    const res = await fetch('/tts/voices');
    if (res.ok) {
      const data = await res.json();
      kokoroAvailable = true;

      (data.voices || []).forEach((v: KokoroVoice) => {
        allVoices.push({
          id: `kokoro:${v.id}`,
          name: `${v.name} (${v.language} ${v.gender})`,
          language: v.language,
          provider: 'kokoro',
          gender: v.gender
        });
      });
    }
  } catch (err) {
    console.log('[TTS Service] Kokoro TTS not available:', err);
    kokoroAvailable = false;
  }

  // Load native browser voices
  const loadNativeVoices = () => {
    const nativeVoices = speechSynthesis.getVoices();
    nativeVoices.forEach(v => {
      allVoices.push({
        id: `native:${v.voiceURI}`,
        name: v.name,
        language: v.lang,
        provider: 'native'
      });
    });
  };

  // Browser voices might load asynchronously
  if (speechSynthesis.getVoices().length > 0) {
    loadNativeVoices();
  } else {
    await new Promise<void>((resolve) => {
      speechSynthesis.onvoiceschanged = () => {
        loadNativeVoices();
        resolve();
      };
      // Timeout fallback
      setTimeout(resolve, 1000);
    });
  }

  cachedVoices = allVoices;
  voicesLoaded = true;
  return allVoices;
}

/**
 * Get available voices (loads if not already loaded)
 */
export async function getAvailableVoices(): Promise<VoiceOption[]> {
  if (!voicesLoaded) {
    await loadVoices();
  }
  return cachedVoices;
}

/**
 * Synchronous getter for already-loaded voices
 */
export function getVoicesSync(): VoiceOption[] {
  return cachedVoices;
}

/**
 * Check if Kokoro TTS is available
 */
export function isKokoroAvailable(): boolean {
  return kokoroAvailable;
}

// Legacy export for backwards compatibility (used by components that haven't migrated)
export const availableVoices: Voice[] = [
  { id: 'kokoro:af_heart', name: 'Heart (Female)', language: 'en-US' },
  { id: 'kokoro:af_sky', name: 'Sky (Female)', language: 'en-US' },
  { id: 'kokoro:af_bella', name: 'Bella (Female)', language: 'en-US' },
  { id: 'kokoro:am_adam', name: 'Adam (Male)', language: 'en-US' },
  { id: 'kokoro:am_michael', name: 'Michael (Male)', language: 'en-US' },
  { id: 'kokoro:bf_emma', name: 'Emma (British)', language: 'en-GB' },
  { id: 'kokoro:bm_george', name: 'George (British)', language: 'en-GB' },
];

// ============================================================================
// TTS Request/Response
// ============================================================================

export interface TTSRequest {
  text: string;
  voiceId: string;
  speed: number;
}

export interface TTSResponse {
  audioUrl: string;
  duration: number;
  blob?: Blob;
}

// ============================================================================
// Speech Generation
// ============================================================================

/**
 * Generate speech from text using Kokoro TTS or native browser TTS
 */
export async function generateSpeech(request: TTSRequest): Promise<TTSResponse> {
  const { text, voiceId, speed } = request;

  console.log('[TTS Service] Generating speech:', { text: text.substring(0, 50) + '...', voiceId, speed });

  // Determine provider from voiceId prefix
  const isKokoro = voiceId.startsWith('kokoro:') || !voiceId.startsWith('native:');
  const actualVoiceId = voiceId.replace(/^(kokoro:|native:)/, '');

  if (isKokoro && kokoroAvailable) {
    return generateWithKokoro(text, actualVoiceId, speed);
  } else if (isKokoro) {
    // Try Kokoro even if not cached as available
    const result = await generateWithKokoro(text, actualVoiceId, speed);
    if (result.audioUrl && !result.audioUrl.startsWith('data:audio/wav;native')) {
      return result;
    }
  }

  return generateWithNative(text, actualVoiceId, speed);
}

/**
 * Generate speech using Kokoro TTS backend
 */
async function generateWithKokoro(text: string, voiceId: string, speed: number): Promise<TTSResponse> {
  try {
    const response = await fetch('/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: voiceId,
        rate: speed
      })
    });

    if (!response.ok) {
      console.warn('[TTS Service] Kokoro synthesis failed, falling back to native');
      return generateWithNative(text, voiceId, speed);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);

    // Get duration from audio
    const duration = await getAudioDuration(audioUrl);

    kokoroAvailable = true;
    return {
      audioUrl,
      duration,
      blob
    };
  } catch (err) {
    console.error('[TTS Service] Kokoro error:', err);
    return generateWithNative(text, voiceId, speed);
  }
}

/**
 * Generate speech using browser native TTS
 * Returns a recorded blob from the speech synthesis
 */
async function generateWithNative(text: string, voiceId: string, speed: number): Promise<TTSResponse> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Find the voice
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.voiceURI === voiceId || v.name === voiceId);
    if (voice) utterance.voice = voice;

    utterance.rate = speed;

    // Estimate duration based on text length
    const wordsPerMinute = 150 / speed;
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = (wordCount / wordsPerMinute) * 60;

    // For native TTS, we can't easily capture audio, so we return a data URL placeholder
    // The actual audio plays directly via speechSynthesis
    utterance.onend = () => {
      resolve({
        audioUrl: `data:audio/wav;native,${encodeURIComponent(text)}`,
        duration: estimatedDuration
      });
    };

    utterance.onerror = (e) => {
      reject(new Error(`Speech synthesis error: ${e.error}`));
    };

    speechSynthesis.speak(utterance);
  });
}

/**
 * Get audio duration from URL
 */
function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      // Estimate based on common speech rate if metadata fails
      resolve(5); // Default 5 seconds
    });
  });
}

// ============================================================================
// Preview Playback
// ============================================================================

let currentAudio: HTMLAudioElement | null = null;

/**
 * Play a preview of text using TTS
 */
export async function playPreview(text: string, voiceId: string, speed: number): Promise<void> {
  stopPreview();

  const isKokoro = voiceId.startsWith('kokoro:') || !voiceId.startsWith('native:');
  const actualVoiceId = voiceId.replace(/^(kokoro:|native:)/, '');

  if (isKokoro) {
    try {
      const response = await fetch('/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: actualVoiceId,
          rate: speed
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        currentAudio = new Audio(url);
        currentAudio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudio = null;
        };
        await currentAudio.play();
        return;
      }
    } catch (err) {
      console.warn('[TTS Service] Preview via Kokoro failed, using native');
    }
  }

  // Fallback to native
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => v.voiceURI === actualVoiceId || v.name === actualVoiceId);
  if (voice) utterance.voice = voice;
  utterance.rate = speed;
  speechSynthesis.speak(utterance);
}

/**
 * Stop any playing preview
 */
export function stopPreview(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check if TTS service is available
 */
export async function checkTTSHealth(): Promise<boolean> {
  // Check Kokoro
  try {
    const res = await fetch('/tts/voices');
    if (res.ok) {
      kokoroAvailable = true;
      return true;
    }
  } catch {
    kokoroAvailable = false;
  }

  // Fallback: browser TTS
  return 'speechSynthesis' in window;
}

// ============================================================================
// Legacy Config Functions (kept for backwards compatibility)
// ============================================================================

let apiEndpoint = '/tts';
let apiKey = '';

export function setTTSConfig(endpoint: string, key: string) {
  apiEndpoint = endpoint;
  apiKey = key;
}

export function getTTSConfig() {
  return { apiEndpoint, apiKey };
}
