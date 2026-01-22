import { useRef, useState, useCallback, useEffect } from 'react';
import { Layers, ZoomIn, ZoomOut, Volume2, Film, Trash2, Play, Pause, Square } from 'lucide-react';
import { useProjectStore } from './useProjectStore';

const PIXELS_PER_SECOND_BASE = 20;

// Audio playback manager for timeline
class TimelineAudioManager {
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private scheduledTimeouts: number[] = [];

  scheduleClips(
    clips: Array<{ id: string; startTime: number; duration: number; audioUrl: string }>,
    currentTime: number,
    onClipStart?: (id: string) => void,
    onClipEnd?: (id: string) => void
  ) {
    this.stop();

    clips.forEach(clip => {
      // Skip clips that have already ended
      if (clip.startTime + clip.duration < currentTime) return;

      // Skip native TTS placeholder URLs
      if (clip.audioUrl.startsWith('data:audio/wav;native')) return;

      const audio = new Audio(clip.audioUrl);
      this.audioElements.set(clip.id, audio);

      const delay = Math.max(0, (clip.startTime - currentTime) * 1000);

      if (delay === 0) {
        // Clip is already in progress, seek to correct position
        audio.currentTime = currentTime - clip.startTime;
        audio.play().catch(console.error);
        onClipStart?.(clip.id);
      } else {
        // Schedule clip to start later
        const timeout = window.setTimeout(() => {
          audio.play().catch(console.error);
          onClipStart?.(clip.id);
        }, delay);
        this.scheduledTimeouts.push(timeout);
      }

      audio.onended = () => {
        onClipEnd?.(clip.id);
        this.audioElements.delete(clip.id);
      };
    });
  }

  stop() {
    // Clear all scheduled timeouts
    this.scheduledTimeouts.forEach(t => clearTimeout(t));
    this.scheduledTimeouts = [];

    // Stop all playing audio
    this.audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.audioElements.clear();

    // Also stop any speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  isPlaying(): boolean {
    return this.audioElements.size > 0 || this.scheduledTimeouts.length > 0;
  }
}

const audioManager = new TimelineAudioManager();

export function Timeline() {
  const {
    audioClips,
    videoClips,
    playheadPosition,
    totalDuration,
    isPlaying,
    setPlayheadPosition,
    setIsPlaying,
    updateAudioClip,
    updateVideoClip,
    removeAudioClip,
    removeVideoClip,
    selectChunk,
    chunks,
  } = useProjectStore();

  const [zoom, setZoom] = useState(1);
  const [draggingClip, setDraggingClip] = useState<{ id: string; type: 'audio' | 'video'; offsetX: number } | null>(null);
  const [draggingPlayhead, setDraggingPlayhead] = useState(false);
  const [playingClips, setPlayingClips] = useState<Set<string>>(new Set());
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoom;
  const timelineWidth = Math.max(totalDuration * pixelsPerSecond, 1000);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Playback animation loop
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();

      const animate = (currentTime: number) => {
        const delta = (currentTime - lastTimeRef.current) / 1000;
        lastTimeRef.current = currentTime;

        const newPosition = playheadPosition + delta;

        if (newPosition >= totalDuration) {
          // Reached end of timeline
          setPlayheadPosition(totalDuration);
          setIsPlaying(false);
          audioManager.stop();
          return;
        }

        setPlayheadPosition(newPosition);
        animationRef.current = requestAnimationFrame(animate);
      };

      // Schedule audio clips to play
      audioManager.scheduleClips(
        audioClips,
        playheadPosition,
        (id) => setPlayingClips(prev => new Set(prev).add(id)),
        (id) => setPlayingClips(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      audioManager.stop();
      setPlayingClips(new Set());
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const handlePlay = () => {
    if (playheadPosition >= totalDuration) {
      setPlayheadPosition(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setPlayheadPosition(0);
  };

  // Calculate time from mouse position
  const getTimeFromMouseEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    return Math.max(0, Math.min(totalDuration, x / pixelsPerSecond));
  }, [pixelsPerSecond, totalDuration]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (draggingClip || draggingPlayhead) return;

    const time = getTimeFromMouseEvent(e);
    setPlayheadPosition(time);

    // If playing, restart audio from new position
    if (isPlaying) {
      audioManager.stop();
      audioManager.scheduleClips(
        audioClips,
        time,
        (id) => setPlayingClips(prev => new Set(prev).add(id)),
        (id) => setPlayingClips(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        })
      );
    }
  };

  // Playhead drag handlers
  const handlePlayheadDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingPlayhead(true);

    // Pause if playing
    if (isPlaying) {
      setIsPlaying(false);
    }
  };

  const handlePlayheadDrag = useCallback((e: MouseEvent) => {
    if (!draggingPlayhead) return;
    const time = getTimeFromMouseEvent(e);
    setPlayheadPosition(time);
  }, [draggingPlayhead, getTimeFromMouseEvent, setPlayheadPosition]);

  const handlePlayheadDragEnd = useCallback(() => {
    setDraggingPlayhead(false);
  }, []);

  // Global mouse events for playhead dragging
  useEffect(() => {
    if (draggingPlayhead) {
      const handleMove = (e: MouseEvent) => handlePlayheadDrag(e);
      const handleUp = () => handlePlayheadDragEnd();

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);

      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }
  }, [draggingPlayhead, handlePlayheadDrag, handlePlayheadDragEnd]);

  const handleClipDragStart = (e: React.MouseEvent, id: string, type: 'audio' | 'video') => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    setDraggingClip({ id, type, offsetX });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingClip || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft - draggingClip.offsetX;
    const newStart = Math.max(0, x / pixelsPerSecond);

    if (draggingClip.type === 'audio') {
      updateAudioClip(draggingClip.id, { startTime: newStart });
    } else {
      updateVideoClip(draggingClip.id, { startTime: newStart });
    }
  }, [draggingClip, pixelsPerSecond, updateAudioClip, updateVideoClip]);

  const handleMouseUp = () => {
    setDraggingClip(null);
  };

  // Get chunk text for audio clip label
  const getChunkLabel = (chunkId: string) => {
    const chunk = chunks.find(c => c.id === chunkId);
    if (chunk) {
      return chunk.text.substring(0, 20) + (chunk.text.length > 20 ? '...' : '');
    }
    return 'Audio';
  };

  const timeMarkers = [];
  const interval = zoom >= 2 ? 5 : zoom >= 1 ? 10 : 15;
  for (let t = 0; t <= totalDuration; t += interval) {
    timeMarkers.push(t);
  }

  return (
    <div className="h-full flex flex-col bg-slate-800/50 border-t border-slate-700">
      <div className="h-10 bg-slate-900/50 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-white">Timeline</span>

          {/* Playback controls */}
          <div className="flex items-center gap-1 ml-4">
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="p-1.5 rounded bg-blue-600 hover:bg-blue-700 transition-colors text-white"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="p-1.5 rounded bg-blue-600 hover:bg-blue-700 transition-colors text-white"
                title="Play"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleStop}
              className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 ml-2 font-mono">
              {formatTime(playheadPosition)} / {formatTime(totalDuration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={timelineRef}
        className={`flex-1 overflow-x-auto overflow-y-hidden relative select-none ${draggingPlayhead ? 'cursor-ew-resize' : ''}`}
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={{ width: timelineWidth, minHeight: '100%' }} className="relative">
          {/* Time ruler */}
          <div className="h-6 bg-slate-900/50 border-b border-slate-700 relative">
            {timeMarkers.map((t) => (
              <div
                key={t}
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: t * pixelsPerSecond }}
              >
                <div className="h-2 w-px bg-slate-600" />
                <span className="text-[10px] text-slate-500 font-mono">{formatTime(t)}</span>
              </div>
            ))}
          </div>

          {/* Audio track */}
          <div className="h-[60px] bg-slate-800/30 border-b border-slate-700 relative">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-cyan-400 z-10">
              <Volume2 className="w-3 h-3" /> Audio
            </div>
            {audioClips.map((clip) => {
              const isCurrentlyPlaying = playingClips.has(clip.id);
              return (
                <div
                  key={clip.id}
                  className={`absolute top-1 bottom-1 rounded cursor-move flex items-center px-2 text-xs text-white font-medium truncate group transition-all ${
                    isCurrentlyPlaying
                      ? 'bg-cyan-400 ring-2 ring-cyan-300 shadow-lg shadow-cyan-500/30'
                      : 'bg-cyan-500/80 hover:brightness-110'
                  } ${draggingClip?.id === clip.id ? 'ring-2 ring-white shadow-lg' : ''}`}
                  style={{
                    left: clip.startTime * pixelsPerSecond,
                    width: Math.max(clip.duration * pixelsPerSecond, 40),
                  }}
                  onMouseDown={(e) => handleClipDragStart(e, clip.id, 'audio')}
                  onClick={(e) => { e.stopPropagation(); selectChunk(clip.chunkId); }}
                >
                  <span className="truncate">{getChunkLabel(clip.chunkId)}</span>
                  <button
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded"
                    onClick={(e) => { e.stopPropagation(); removeAudioClip(clip.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Video track */}
          <div className="h-[60px] bg-slate-900/30 border-b border-slate-700 relative">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-purple-400 z-10">
              <Film className="w-3 h-3" /> Video
            </div>
            {videoClips.map((clip) => (
              <div
                key={clip.id}
                className={`absolute top-1 bottom-1 bg-purple-500/80 rounded cursor-move flex items-center px-2 text-xs text-white font-medium truncate group ${draggingClip?.id === clip.id ? 'ring-2 ring-white shadow-lg' : 'hover:brightness-110'}`}
                style={{
                  left: clip.startTime * pixelsPerSecond,
                  width: Math.max(clip.duration * pixelsPerSecond, 40),
                }}
                onMouseDown={(e) => handleClipDragStart(e, clip.id, 'video')}
              >
                <span className="truncate">{clip.name}</span>
                <button
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded"
                  onClick={(e) => { e.stopPropagation(); removeVideoClip(clip.id); }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Playhead - draggable */}
          <div
            className={`absolute top-0 bottom-0 z-20 group ${draggingPlayhead ? 'cursor-ew-resize' : 'cursor-ew-resize'}`}
            style={{ left: playheadPosition * pixelsPerSecond - 6, width: 12 }}
            onMouseDown={handlePlayheadDragStart}
          >
            {/* Visible line */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px ${
                isPlaying ? 'bg-green-500' : draggingPlayhead ? 'bg-yellow-400' : 'bg-blue-500'
              } ${draggingPlayhead ? 'w-0.5' : ''}`}
            />
            {/* Draggable head */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 -top-0 w-4 h-4 transition-transform ${
                isPlaying ? 'bg-green-500' : draggingPlayhead ? 'bg-yellow-400 scale-125' : 'bg-blue-500'
              } group-hover:scale-110`}
              style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
            />
            {/* Extended hover/drag area at bottom */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 bottom-0 w-3 h-3 rounded-full transition-all ${
                isPlaying ? 'bg-green-500/50' : draggingPlayhead ? 'bg-yellow-400' : 'bg-blue-500/50'
              } group-hover:bg-opacity-100 group-hover:scale-125`}
            />
          </div>
        </div>
      </div>

      {/* Scrubber hint */}
      {draggingPlayhead && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-medium z-30">
          {formatTime(playheadPosition)}
        </div>
      )}
    </div>
  );
}
