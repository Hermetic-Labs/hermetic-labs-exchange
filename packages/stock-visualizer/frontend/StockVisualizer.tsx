/**
 * StockVisualizer - Main wrapper component for the 3D Stock Visualizer
 *
 * This component combines the 3D chart, strategy editor, and timeline controls
 * into a complete stock visualization interface.
 */
import React, { useState, useMemo, useCallback } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import StockChart3D from './components/StockChart3D';
import StrategyEditor from './components/StrategyEditor';
import TimelineControls from './components/TimelineControls';
import { generateMockStockData, CandleData } from './utils/stockData';
import { parseStrategy, DEFAULT_STRATEGY } from './utils/strategyParser';

export interface StockVisualizerProps {
  initialView?: '2D' | '3D';
  showEditor?: boolean;
  windowSize?: number;
  dataLength?: number;
  data?: CandleData[];
}

export default function StockVisualizer({
  initialView = '3D',
  showEditor = true,
  windowSize: initialWindowSize = 50,
  dataLength = 150,
  data: externalData,
}: StockVisualizerProps) {
  // State
  const [is3D, setIs3D] = useState(initialView === '3D');
  const [strategy, setStrategy] = useState(DEFAULT_STRATEGY);
  const [windowSize, setWindowSize] = useState(initialWindowSize);

  // Generate or use provided data
  const data = useMemo(() => {
    return externalData ?? generateMockStockData(dataLength);
  }, [externalData, dataLength]);

  // Initialize visible range based on data length
  const [visibleRange, setVisibleRange] = useState<[number, number]>(() => {
    const start = Math.max(0, data.length - windowSize);
    return [start, data.length];
  });

  // Parse strategy and generate signals
  const { indicators, signals, errors } = useMemo(() => {
    return parseStrategy(strategy, data);
  }, [strategy, data]);

  // Get current price change
  const priceChange = useMemo(() => {
    if (data.length < 2) return { value: 0, percent: 0 };
    const first = data[visibleRange[0]]?.close ?? 0;
    const last = data[visibleRange[1] - 1]?.close ?? 0;
    const change = last - first;
    const percent = first !== 0 ? (change / first) * 100 : 0;
    return { value: change, percent };
  }, [data, visibleRange]);

  const handleRangeChange = useCallback((range: [number, number]) => {
    setVisibleRange(range);
  }, []);

  const handleWindowSizeChange = useCallback((size: number) => {
    setWindowSize(size);
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full bg-slate-950 text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Stock Visualizer</h1>
            <div className="flex items-center gap-2 text-sm">
              <span className={priceChange.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                {priceChange.value >= 0 ? '+' : ''}{priceChange.value.toFixed(2)}
                ({priceChange.percent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIs3D(false)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                !is3D ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setIs3D(true)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                is3D ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              3D
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chart */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <StockChart3D
                data={data}
                indicators={indicators}
                signals={signals}
                is3D={is3D}
                visibleRange={visibleRange}
              />
            </div>

            {/* Timeline controls */}
            <div className="p-4 border-t border-slate-800">
              <TimelineControls
                data={data}
                visibleRange={visibleRange}
                onRangeChange={handleRangeChange}
                windowSize={windowSize}
                onWindowSizeChange={handleWindowSizeChange}
              />
            </div>
          </div>

          {/* Strategy editor */}
          {showEditor && (
            <div className="w-80 border-l border-slate-800 flex flex-col">
              <div className="p-3 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-slate-300">Strategy Editor</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <StrategyEditor
                  value={strategy}
                  onChange={setStrategy}
                  errors={errors}
                />
              </div>
              {errors.length > 0 && (
                <div className="p-3 border-t border-red-900/50 bg-red-950/30">
                  <p className="text-xs text-red-400">{errors.length} error(s)</p>
                </div>
              )}
              <div className="p-3 border-t border-slate-800 text-xs text-slate-500">
                <p>{signals.length} signals generated</p>
                <p>{indicators.length} indicators active</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
