import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Crop, X, Volume2, VolumeX, Move } from 'lucide-react';
import { useProjectStore } from './useProjectStore';

function formatTimecode(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function VideoPreview() {
  const { playheadPosition, isPlaying, setPlayheadPosition, totalDuration, addVideoClip } = useProjectStore();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Crop state
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropDragOffset, setCropDragOffset] = useState<{ x: number; y: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync video playback with timeline playhead
  useEffect(() => {
    if (videoRef.current && videoSrc) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, videoSrc]);

  // Sync video time with playhead position (when scrubbing)
  useEffect(() => {
    if (videoRef.current && videoSrc && !isPlaying) {
      const currentTime = videoRef.current.currentTime;
      // Only seek if difference is significant (avoid feedback loop)
      if (Math.abs(currentTime - playheadPosition) > 0.1) {
        videoRef.current.currentTime = playheadPosition;
      }
    }
  }, [playheadPosition, videoSrc, isPlaying]);

  // Update volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(f => f.type.startsWith('video/'));

    if (videoFile) {
      loadVideoFile(videoFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadVideoFile(file);
    }
  };

  const loadVideoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoSrc(url);

    // Add to timeline
    const video = document.createElement('video');
    video.src = url;
    video.onloadedmetadata = () => {
      addVideoClip({
        id: `video-${Date.now()}`,
        name: file.name,
        startTime: 0,
        duration: video.duration,
        url,
      });
    };
  };

  const handleRemoveVideo = () => {
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(null);
    setCropRegion(null);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Scrubbing with mouse drag on video preview
  const handleScrubStart = useCallback((e: React.MouseEvent) => {
    if (cropMode || !videoSrc) return;
    e.preventDefault();
    setIsScrubbing(true);
  }, [cropMode, videoSrc]);

  const handleScrubMove = useCallback((e: React.MouseEvent) => {
    if (!isScrubbing || !containerRef.current || !videoSrc) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percent * totalDuration;
    setPlayheadPosition(newTime);

    // Also seek video
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }, [isScrubbing, totalDuration, setPlayheadPosition, videoSrc]);

  const handleScrubEnd = useCallback(() => {
    setIsScrubbing(false);
  }, []);

  // Global mouse up handler for scrubbing
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isScrubbing]);

  // Crop drag handlers
  const handleCropStart = useCallback((e: React.MouseEvent) => {
    if (!cropMode || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking inside existing crop region to drag it
    if (cropRegion) {
      const inCrop = x >= cropRegion.x && x <= cropRegion.x + cropRegion.width &&
                     y >= cropRegion.y && y <= cropRegion.y + cropRegion.height;
      if (inCrop) {
        setIsDraggingCrop(true);
        setCropDragOffset({ x: x - cropRegion.x, y: y - cropRegion.y });
        return;
      }
    }

    // Start new crop region
    setCropStart({ x, y });
    setCropRegion({ x, y, width: 0, height: 0 });
  }, [cropMode, cropRegion]);

  const handleCropMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    if (isDraggingCrop && cropRegion && cropDragOffset) {
      // Dragging existing crop region
      const newX = Math.max(0, Math.min(rect.width - cropRegion.width, x - cropDragOffset.x));
      const newY = Math.max(0, Math.min(rect.height - cropRegion.height, y - cropDragOffset.y));
      setCropRegion({ ...cropRegion, x: newX, y: newY });
    } else if (cropStart) {
      // Creating new crop region
      const width = x - cropStart.x;
      const height = y - cropStart.y;

      setCropRegion({
        x: width < 0 ? x : cropStart.x,
        y: height < 0 ? y : cropStart.y,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    }
  }, [cropStart, isDraggingCrop, cropRegion, cropDragOffset]);

  const handleCropEnd = useCallback(() => {
    setCropStart(null);
    setIsDraggingCrop(false);
    setCropDragOffset(null);

    // Remove tiny crop regions (accidental clicks)
    if (cropRegion && (cropRegion.width < 10 || cropRegion.height < 10)) {
      setCropRegion(null);
    }
  }, [cropRegion]);

  // Global mouse up for crop
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (cropStart || isDraggingCrop) {
        handleCropEnd();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [cropStart, isDraggingCrop, handleCropEnd]);

  // Clear crop when exiting crop mode
  useEffect(() => {
    if (!cropMode) {
      setCropRegion(null);
      setCropStart(null);
    }
  }, [cropMode]);

  // Get container dimensions for scrub bar
  const containerWidth = containerRef.current?.clientWidth || 0;
  const scrubPosition = totalDuration > 0 ? (playheadPosition / totalDuration) * 100 : 0;

  return (
    <div className="h-full flex flex-col bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div className="h-10 bg-slate-900/50 border-b border-slate-700 flex items-center justify-between px-4">
        <span className="text-sm font-semibold text-white">Preview</span>
        <div className="flex items-center gap-2">
          {/* Volume Control */}
          {videoSrc && (
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={toggleMute}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Volume Slider - shows on hover */}
              <div
                className={`absolute left-full ml-2 flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-600 transition-all z-20 ${
                  showVolumeSlider ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-xs text-slate-400 w-8">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>
          )}

          {videoSrc && (
            <>
              <button
                onClick={() => setCropMode(!cropMode)}
                className={`p-1.5 rounded transition-colors ${cropMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                title="Crop video (drag to select region)"
              >
                <Crop className="w-4 h-4" />
              </button>
              <button
                onClick={handleRemoveVideo}
                className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                title="Remove video"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className={`flex-1 bg-black flex items-center justify-center relative ${isDragOver ? 'ring-2 ring-blue-500 ring-inset' : ''} ${isScrubbing ? 'cursor-ew-resize' : cropMode ? 'cursor-crosshair' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={cropMode ? handleCropStart : handleScrubStart}
        onMouseMove={cropMode ? handleCropMove : handleScrubMove}
        onMouseUp={cropMode ? handleCropEnd : handleScrubEnd}
        onMouseLeave={cropMode ? handleCropEnd : handleScrubEnd}
      >
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="max-w-full max-h-full pointer-events-none"
            onTimeUpdate={() => {
              if (videoRef.current && isPlaying) {
                setPlayheadPosition(videoRef.current.currentTime);
              }
            }}
          />
        ) : (
          <div className="text-center">
            <div className="text-slate-500 text-sm mb-4">
              Drop video file here or
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
            >
              <Upload className="w-4 h-4" />
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Crop overlay */}
        {cropMode && cropRegion && cropRegion.width > 0 && cropRegion.height > 0 && (
          <>
            {/* Darkened area outside crop */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top */}
              <div
                className="absolute left-0 right-0 top-0 bg-black/60"
                style={{ height: cropRegion.y }}
              />
              {/* Bottom */}
              <div
                className="absolute left-0 right-0 bottom-0 bg-black/60"
                style={{ height: `calc(100% - ${cropRegion.y + cropRegion.height}px)` }}
              />
              {/* Left */}
              <div
                className="absolute left-0 bg-black/60"
                style={{
                  top: cropRegion.y,
                  width: cropRegion.x,
                  height: cropRegion.height
                }}
              />
              {/* Right */}
              <div
                className="absolute right-0 bg-black/60"
                style={{
                  top: cropRegion.y,
                  width: `calc(100% - ${cropRegion.x + cropRegion.width}px)`,
                  height: cropRegion.height
                }}
              />
            </div>

            {/* Crop border */}
            <div
              className="absolute border-2 border-blue-500 border-dashed pointer-events-none"
              style={{
                left: cropRegion.x,
                top: cropRegion.y,
                width: cropRegion.width,
                height: cropRegion.height
              }}
            >
              {/* Corner handles */}
              <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-blue-500 rounded-full" />
              <div className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-blue-500 rounded-full" />
              <div className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-blue-500 rounded-full" />
              <div className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-blue-500 rounded-full" />

              {/* Move icon in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 rounded-full p-2">
                  <Move className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Dimensions label */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-blue-400 bg-black/70 px-2 py-0.5 rounded whitespace-nowrap">
                {Math.round(cropRegion.width)} × {Math.round(cropRegion.height)}
              </div>
            </div>
          </>
        )}

        {/* Timecode overlay */}
        <div className="absolute top-3 right-3 font-mono text-sm text-white bg-black/70 px-2 py-1 rounded">
          {formatTimecode(playheadPosition)}
        </div>

        {/* Playing indicator */}
        {isPlaying && videoSrc && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            PLAYING
          </div>
        )}

        {/* Crop mode indicator */}
        {cropMode && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-blue-500/80 text-white text-xs px-2 py-1 rounded">
            <Crop className="w-3 h-3" />
            CROP MODE - Drag to select
          </div>
        )}

        {/* Scrubbing indicator */}
        {isScrubbing && !cropMode && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-cyan-500/80 text-white text-xs px-2 py-1 rounded">
            <span className="w-2 h-2 bg-white rounded-full" />
            SCRUBBING
          </div>
        )}

        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center pointer-events-none">
            <span className="text-blue-400 font-medium">Drop video file here</span>
          </div>
        )}
      </div>

      {/* Mini scrub bar */}
      {videoSrc && (
        <div className="h-2 bg-slate-900/50 relative cursor-pointer group"
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const newTime = percent * totalDuration;
            setPlayheadPosition(newTime);
            if (videoRef.current) {
              videoRef.current.currentTime = newTime;
            }
          }}
        >
          {/* Progress bar */}
          <div
            className="absolute top-0 left-0 h-full bg-blue-500/50 transition-all"
            style={{ width: `${scrubPosition}%` }}
          />
          {/* Playhead */}
          <div
            className="absolute top-0 w-1 h-full bg-blue-500 group-hover:w-2 transition-all"
            style={{ left: `${scrubPosition}%`, transform: 'translateX(-50%)' }}
          />
        </div>
      )}

      {/* Status bar */}
      <div className="h-8 bg-slate-900/50 border-t border-slate-700 flex items-center justify-center px-4">
        <span className="text-xs text-slate-500">
          {videoSrc
            ? cropMode
              ? 'Drag to select crop region • Drag inside to move'
              : 'Drag to scrub • Use timeline for precise control'
            : 'No video loaded'
          }
        </span>
      </div>
    </div>
  );
}
