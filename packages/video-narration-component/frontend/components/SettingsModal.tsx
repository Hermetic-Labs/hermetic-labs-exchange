import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useProjectStore } from './useProjectStore';
import { loadVoices, isKokoroAvailable } from './ttsService';
import type { Voice } from '../types';

interface VoiceOption extends Voice {
  provider: 'kokoro' | 'native';
  gender?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useProjectStore();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);

  // Load voices when modal opens
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Group voices by provider
  const kokoroVoices = voices.filter(v => v.provider === 'kokoro');
  const nativeVoices = voices.filter(v => v.provider === 'native');
  const isKokoro = settings.defaultVoiceId.startsWith('kokoro:') || !settings.defaultVoiceId.startsWith('native:');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Default Voice Selection */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Default Voice</label>
            <select
              value={settings.defaultVoiceId}
              onChange={(e) => updateSettings({ defaultVoiceId: e.target.value })}
              className="w-full bg-slate-700 text-white text-sm p-3 rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
              disabled={voicesLoading}
            >
              {voicesLoading ? (
                <option value="">Loading voices...</option>
              ) : (
                <>
                  {kokoroVoices.length > 0 && (
                    <optgroup label="✨ Kokoro AI Voices">
                      {kokoroVoices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {nativeVoices.length > 0 && (
                    <optgroup label="🖥️ Browser Voices">
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
                  Using Kokoro AI (high quality neural TTS)
                </span>
              ) : (
                <span className="text-slate-500">
                  Using browser's native speech synthesis
                </span>
              )}
            </div>
          </div>

          {/* Kokoro Status */}
          {!isKokoroAvailable() && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm">
                Kokoro TTS backend not detected. Using browser voices only.
              </p>
              <p className="text-yellow-400/70 text-xs mt-1">
                Make sure the EVE backend is running for AI voices.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
