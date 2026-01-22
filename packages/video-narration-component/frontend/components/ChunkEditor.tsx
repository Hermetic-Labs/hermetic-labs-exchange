import { useState, useEffect, useRef } from 'react';
import { User, Gauge, Cpu, Trash2, Play, Pause, Sparkles, Volume2 } from 'lucide-react';
import { useProjectStore } from './useProjectStore';
import { generateSpeech, loadVoices, playPreview, stopPreview, isKokoroAvailable } from './ttsService';
import type { Voice } from '../types';

interface VoiceOption extends Voice {
  provider: 'kokoro' | 'native';
  gender?: string;
}

export function ChunkEditor() {
  const { chunks, selectedChunkId, updateChunk, removeChunk, addAudioClip, audioClips, removeAudioClip } = useProjectStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPlayingGenerated, setIsPlayingGenerated] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectedChunk = chunks.find((c) => c.id === selectedChunkId);

  // Load voices on mount
  useEffect(() => {
    const fetchVoices = async () => {
      setVoicesLoading(true);
      try {
        const loadedVoices = await loadVoices();
        setVoices(loadedVoices);
      } catch (err) {
        console.error('Failed to load voices:', err);
      } finally {
        setVoicesLoading(false);
      }
    };
    fetchVoices();
  }, []);

  // Cleanup audio on unmount or chunk change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [selectedChunkId]);

  // Group voices by provider
  const kokoroVoices = voices.filter(v => v.provider === 'kokoro');
  const nativeVoices = voices.filter(v => v.provider === 'native');

  const handleGenerateAudio = async () => {
    if (!selectedChunk) return;

    setIsGenerating(true);
    try {
      const response = await generateSpeech({
        text: selectedChunk.text,
        voiceId: selectedChunk.voiceId,
        speed: selectedChunk.speed,
      });

      updateChunk(selectedChunk.id, {
        audioUrl: response.audioUrl,
        duration: response.duration,
      });

      // Remove existing audio clip for this chunk if any
      const existingClip = audioClips.find(c => c.chunkId === selectedChunk.id);
      if (existingClip) {
        removeAudioClip(existingClip.id);
      }

      // Calculate where to place the new clip (after all existing clips)
      const lastClip = audioClips
        .filter(c => c.chunkId !== selectedChunk.id)
        .reduce((max, clip) => Math.max(max, clip.startTime + clip.duration), 0);

      addAudioClip({
        id: `audio-${selectedChunk.id}-${Date.now()}`,
        chunkId: selectedChunk.id,
        startTime: lastClip,
        duration: response.duration,
        audioUrl: response.audioUrl,
      });
    } catch (error) {
      console.error('Failed to generate audio:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedChunk) return;

    if (isPreviewing) {
      stopPreview();
      setIsPreviewing(false);
      return;
    }

    setIsPreviewing(true);
    try {
      await playPreview(selectedChunk.text, selectedChunk.voiceId, selectedChunk.speed);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handlePlayGenerated = () => {
    if (!selectedChunk?.audioUrl) return;

    // If it's a native TTS placeholder, use speechSynthesis
    if (selectedChunk.audioUrl.startsWith('data:audio/wav;native')) {
      if (isPlayingGenerated) {
        speechSynthesis.cancel();
        setIsPlayingGenerated(false);
        return;
      }

      const text = decodeURIComponent(selectedChunk.audioUrl.replace('data:audio/wav;native,', ''));
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = selectedChunk.speed;
      utterance.onend = () => setIsPlayingGenerated(false);
      setIsPlayingGenerated(true);
      speechSynthesis.speak(utterance);
      return;
    }

    // For real audio URLs (Kokoro generated)
    if (isPlayingGenerated && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingGenerated(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(selectedChunk.audioUrl);
    audioRef.current.onended = () => setIsPlayingGenerated(false);
    audioRef.current.onerror = () => {
      console.error('Failed to play audio');
      setIsPlayingGenerated(false);
    };

    setIsPlayingGenerated(true);
    audioRef.current.play().catch(err => {
      console.error('Play failed:', err);
      setIsPlayingGenerated(false);
    });
  };

  if (!selectedChunk) {
    return (
      <div className="h-full flex flex-col bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <div className="h-10 bg-slate-900/50 border-b border-slate-700 flex items-center px-4">
          <span className="text-sm font-semibold text-white">Chunk Properties</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-4 text-center">
          Select text in the script and click "Process" to create audio segments
        </div>
      </div>
    );
  }

  const isKokoro = selectedChunk.voiceId.startsWith('kokoro:') || !selectedChunk.voiceId.startsWith('native:');
  const hasGeneratedAudio = !!selectedChunk.audioUrl;

  return (
    <div className="h-full flex flex-col bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div className="h-10 bg-slate-900/50 border-b border-slate-700 flex items-center justify-between px-4">
        <span className="text-sm font-semibold text-white">Chunk Properties</span>
        <button
          onClick={() => removeChunk(selectedChunk.id)}
          className="p-1.5 rounded hover:bg-red-500/20 transition-colors text-slate-400 hover:text-red-400"
          title="Delete chunk"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Text Preview */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-2">Text</label>
          <div className="text-sm text-white bg-slate-700 p-3 rounded-md border border-slate-600 max-h-24 overflow-y-auto">
            {selectedChunk.text}
          </div>
        </div>

        {/* Voice Selection */}
        <div>
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-2">
            <User className="w-3 h-3" /> Voice
          </label>
          <select
            value={selectedChunk.voiceId}
            onChange={(e) => updateChunk(selectedChunk.id, { voiceId: e.target.value })}
            className="w-full bg-slate-700 text-white text-sm p-2 rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
            disabled={voicesLoading}
          >
            {voicesLoading ? (
              <option value="">Loading voices...</option>
            ) : (
              <>
                {kokoroVoices.length > 0 && (
                  <optgroup label="Kokoro AI Voices">
                    {kokoroVoices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {nativeVoices.length > 0 && (
                  <optgroup label="Browser Voices">
                    {nativeVoices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.language})
                      </option>
                    ))}
                  </optgroup>
                )}

                {voices.length === 0 && (
                  <option value="">No voices available</option>
                )}
              </>
            )}
          </select>

          {/* Voice provider indicator */}
          <div className="mt-2 flex items-center gap-1 text-xs">
            {isKokoro && isKokoroAvailable() ? (
              <span className="flex items-center gap-1 text-purple-400">
                <Sparkles className="w-3 h-3" />
                Kokoro AI (high quality neural TTS)
              </span>
            ) : (
              <span className="text-slate-500">
                Browser native speech synthesis
              </span>
            )}
          </div>
        </div>

        {/* Speed Control */}
        <div>
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-2">
            <Gauge className="w-3 h-3" /> Speed: {selectedChunk.speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={selectedChunk.speed}
            onChange={(e) => updateChunk(selectedChunk.id, { speed: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Preview Button - Preview voice settings before generating */}
        <button
          onClick={handlePreview}
          disabled={isGenerating}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-md transition-colors ${
            isPreviewing
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-slate-600 hover:bg-slate-500 text-white'
          }`}
        >
          <Play className="w-4 h-4" />
          {isPreviewing ? 'Stop Preview' : 'Preview Voice'}
        </button>

        {/* Generate Audio Button */}
        <button
          onClick={handleGenerateAudio}
          disabled={isGenerating}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 font-medium rounded-md transition-colors ${
            isKokoro && isKokoroAvailable()
              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white'
              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
          } disabled:opacity-50`}
        >
          <Cpu className="w-4 h-4" />
          {isGenerating ? 'Generating...' : hasGeneratedAudio ? 'Regenerate Audio' : 'Generate Audio'}
        </button>

        {/* Generated Audio Section */}
        {hasGeneratedAudio && (
          <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white">Generated Audio</span>
              </div>
              <span className="text-xs text-slate-400">{selectedChunk.duration?.toFixed(1)}s</span>
            </div>

            {/* Play Generated Audio Button */}
            <button
              onClick={handlePlayGenerated}
              className={`w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-md transition-colors ${
                isPlayingGenerated
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-slate-600 hover:bg-slate-500 text-white'
              }`}
            >
              {isPlayingGenerated ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop Playback
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Play Generated Audio
                </>
              )}
            </button>

            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Added to timeline - drag to reposition
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
