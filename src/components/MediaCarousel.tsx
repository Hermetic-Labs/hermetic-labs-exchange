import { useState, useRef } from 'react';
import { MediaItem } from '../types';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface Props {
  media: MediaItem[];
}

export function MediaCarousel({ media }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = media[currentIndex];

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(false);
  };

  const prev = () => goTo((currentIndex - 1 + media.length) % media.length);
  const next = () => goTo((currentIndex + 1) % media.length);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Display */}
      <div className="relative aspect-video cyber-card overflow-hidden">
        {current.type === 'image' ? (
          <img
            src={current.url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={current.url}
              muted={isMuted}
              loop
              className="w-full h-full object-cover"
              onEnded={() => setIsPlaying(false)}
            />
            {/* Video Controls */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </button>
            </div>
            <button
              onClick={toggleMute}
              className="absolute bottom-4 right-4 p-2 bg-black/50 rounded backdrop-blur hover:bg-black/70 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        )}

        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded backdrop-blur hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded backdrop-blur hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {media.map((item, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`relative shrink-0 w-24 h-16 rounded overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-cyber-green shadow-neon-green'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={item.type === 'video' ? item.thumbnail || item.url : item.url}
                alt=""
                className="w-full h-full object-cover"
              />
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
