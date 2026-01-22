import { useState } from 'react';
import { X, Download, Film, Volume2, FileText, Type } from 'lucide-react';
import { useProjectStore } from './useProjectStore';
import { exportVideo, exportAudioOnly, exportSubtitles, type ExportProgress } from './exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { audioClips, videoClips, chunks, projectName } = useProjectStore();
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [format, setFormat] = useState<'mp4' | 'webm'>('webm');
  const [exportType, setExportType] = useState<'video' | 'audio' | 'subtitles'>('video');
  const [subtitleFormat, setSubtitleFormat] = useState<'srt' | 'vtt' | 'json'>('srt');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Build chunk timing data for subtitles
  const getChunkTimings = () => {
    return audioClips.map(clip => {
      const chunk = chunks.find(c => c.id === clip.chunkId);
      return {
        text: chunk?.text || '',
        startTime: clip.startTime,
        duration: clip.duration
      };
    }).filter(c => c.text.length > 0);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress({ stage: 'preparing', progress: 0, message: 'Starting export...' });

    try {
      if (exportType === 'audio') {
        await exportAudioOnly(audioClips, setProgress);
      } else if (exportType === 'subtitles') {
        const timings = getChunkTimings();
        exportSubtitles(timings, subtitleFormat);
        setProgress({ stage: 'complete', progress: 100, message: 'Subtitles exported!' });
      } else {
        await exportVideo(
          { resolution, format, audioClips, videoClips, projectName },
          setProgress
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      setProgress({ stage: 'error', progress: 0, message: error instanceof Error ? error.message : 'Export failed' });
    } finally {
      setIsExporting(false);
    }
  };

  const hasVideo = videoClips.length > 0;
  const hasAudio = audioClips.length > 0;
  const hasChunks = chunks.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-800 rounded-lg border border-slate-700 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Export Project</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white" disabled={isExporting}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Export Type */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Export Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportType('video')}
                disabled={isExporting || !hasVideo}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  exportType === 'video'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white border border-slate-600'
                } ${!hasVideo ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Film className="w-4 h-4" />
                Video
              </button>
              <button
                onClick={() => setExportType('audio')}
                disabled={isExporting || !hasAudio}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  exportType === 'audio'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white border border-slate-600'
                } ${!hasAudio ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Volume2 className="w-4 h-4" />
                Audio
              </button>
              <button
                onClick={() => setExportType('subtitles')}
                disabled={isExporting || !hasChunks}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  exportType === 'subtitles'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white border border-slate-600'
                } ${!hasChunks ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Type className="w-4 h-4" />
                Subs
              </button>
            </div>
            {!hasVideo && !hasAudio && !hasChunks && (
              <p className="text-xs text-yellow-400 mt-2">Add video, generate audio, or create text chunks to enable export</p>
            )}
          </div>

          {/* Video-specific options */}
          {exportType === 'video' && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Resolution</label>
                <div className="flex gap-2">
                  {(['720p', '1080p'] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      disabled={isExporting}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        resolution === res
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-400 hover:text-white border border-slate-600'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Format</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormat('webm')}
                    disabled={isExporting}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors uppercase ${
                      format === 'webm'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-white border border-slate-600'
                    }`}
                  >
                    WebM
                    <span className="text-xs ml-1 opacity-70">(Fast)</span>
                  </button>
                  <button
                    onClick={() => setFormat('mp4')}
                    disabled={isExporting}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors uppercase ${
                      format === 'mp4'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-white border border-slate-600'
                    }`}
                  >
                    MP4
                    <span className="text-xs ml-1 opacity-70">(H.264)</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {format === 'mp4' ? 'Server-side encoding with FFmpeg (H.264/AAC)' : 'Client-side encoding (VP8/VP9)'}
                </p>
              </div>
            </>
          )}

          {/* Audio-only info */}
          {exportType === 'audio' && (
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <p className="text-sm text-slate-300">Audio Export</p>
              <p className="text-xs text-slate-400 mt-1">
                Exports all generated audio clips as a single WAV file.
                {audioClips.length} clip{audioClips.length !== 1 ? 's' : ''} will be combined.
              </p>
            </div>
          )}

          {/* Subtitle options */}
          {exportType === 'subtitles' && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Format</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSubtitleFormat('srt')}
                    disabled={isExporting}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors uppercase ${
                      subtitleFormat === 'srt'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-white border border-slate-600'
                    }`}
                  >
                    SRT
                  </button>
                  <button
                    onClick={() => setSubtitleFormat('vtt')}
                    disabled={isExporting}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors uppercase ${
                      subtitleFormat === 'vtt'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-white border border-slate-600'
                    }`}
                  >
                    VTT
                  </button>
                  <button
                    onClick={() => setSubtitleFormat('json')}
                    disabled={isExporting}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors uppercase ${
                      subtitleFormat === 'json'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-white border border-slate-600'
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>

              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <p className="text-sm text-yellow-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Instagram-Style Captions
                </p>
                <p className="text-xs text-yellow-400/70 mt-1">
                  Subtitles are timed to your audio clips with word-by-word timing.
                  {chunks.length} segment{chunks.length !== 1 ? 's' : ''} will be exported.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {subtitleFormat === 'srt' && 'SRT: Standard subtitle format - works with most video players'}
                  {subtitleFormat === 'vtt' && 'VTT: Web Video Text Tracks - best for web players'}
                  {subtitleFormat === 'json' && 'JSON: Word-level timing data - for custom rendering'}
                </p>
              </div>
            </>
          )}

          {/* Progress */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{progress.message}</span>
                <span className="text-slate-500">{progress.progress}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    progress.stage === 'error' ? 'bg-red-500' : progress.stage === 'complete' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {progress?.stage === 'error' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{progress.message}</p>
            </div>
          )}

          {/* Success message */}
          {progress?.stage === 'complete' && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">{progress.message}</p>
              <p className="text-green-400/70 text-xs mt-1">
                {exportType === 'subtitles' ? 'File downloaded to your browser.' : 'File downloaded to your Downloads folder.'}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            {progress?.stage === 'complete' ? 'Close' : 'Cancel'}
          </button>
          {progress?.stage !== 'complete' && (
            <button
              onClick={handleExport}
              disabled={isExporting || (!hasVideo && !hasAudio && !hasChunks)}
              className={`flex items-center gap-2 px-4 py-2 disabled:opacity-50 text-white font-medium rounded-md transition-colors ${
                exportType === 'audio'
                  ? 'bg-cyan-600 hover:bg-cyan-700'
                  : exportType === 'subtitles'
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : `Export ${exportType === 'audio' ? 'Audio' : exportType === 'subtitles' ? 'Subtitles' : 'Video'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
