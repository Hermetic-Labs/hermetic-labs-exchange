import { CandleData } from '../utils/stockData';

interface TimelineControlsProps {
  data: CandleData[];
  visibleRange: [number, number];
  onRangeChange: (range: [number, number]) => void;
  windowSize: number;
  onWindowSizeChange: (size: number) => void;
}

export default function TimelineControls({
  data,
  visibleRange,
  onRangeChange,
  windowSize,
  onWindowSizeChange,
}: TimelineControlsProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = parseInt(e.target.value, 10);
    const end = Math.min(start + windowSize, data.length);
    onRangeChange([start, end]);
  };

  const handleWindowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    onWindowSizeChange(size);
    const end = Math.min(visibleRange[0] + size, data.length);
    onRangeChange([visibleRange[0], end]);
  };

  const handleStep = (direction: 'prev' | 'next') => {
    const step = Math.floor(windowSize / 4);
    let newStart = direction === 'next' 
      ? Math.min(visibleRange[0] + step, data.length - windowSize)
      : Math.max(visibleRange[0] - step, 0);
    onRangeChange([newStart, Math.min(newStart + windowSize, data.length)]);
  };

  const startDate = data[visibleRange[0]]?.date || '';
  const endDate = data[Math.min(visibleRange[1] - 1, data.length - 1)]?.date || '';

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">Timeline Navigation</h3>
        <span className="text-xs text-gray-400">
          {startDate} - {endDate}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => handleStep('prev')}
          disabled={visibleRange[0] === 0}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <input
          type="range"
          min={0}
          max={Math.max(0, data.length - windowSize)}
          value={visibleRange[0]}
          onChange={handleSliderChange}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />

        <button
          onClick={() => handleStep('next')}
          disabled={visibleRange[1] >= data.length}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-xs text-gray-400">Window Size:</label>
        <input
          type="range"
          min={20}
          max={100}
          value={windowSize}
          onChange={handleWindowChange}
          className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-xs text-gray-300 w-12 text-right">{windowSize} days</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[30, 50, 100].map(size => (
          <button
            key={size}
            onClick={() => {
              const newSize = Math.min(size, data.length);
              onWindowSizeChange(newSize);
              const start = Math.min(visibleRange[0], data.length - newSize);
              onRangeChange([Math.max(start, 0), Math.min(start + newSize, data.length)]);
            }}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              windowSize === size 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {size}D
          </button>
        ))}
      </div>
    </div>
  );
}
