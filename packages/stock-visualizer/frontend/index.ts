/**
 * Stock Visualizer - Marketplace Package
 *
 * Interactive 3D candlestick chart with real-time strategy coding.
 * Write trading strategies in a simple DSL and see buy/sell signals visualized.
 *
 * This is a COMPONENT type package for financial visualization.
 */

// ============================================================================
// Component Metadata
// ============================================================================

export const COMPONENT_ID = 'stock-visualizer';
export const COMPONENT_TYPE = 'component';
export const COMPONENT_VERSION = '1.0.0';

// ============================================================================
// Core Exports
// ============================================================================

// Main Visualizer Component - MUST match first item in manifest.json "components"
export { default as StockVisualizer } from './StockVisualizer';

// Also export as default for sidebar integration
export { default } from './StockVisualizer';

export { default as StockChart3D } from './components/StockChart3D';
export { default as StrategyEditor } from './components/StrategyEditor';
export { default as TimelineControls } from './components/TimelineControls';
export { default as ErrorBoundary } from './components/ErrorBoundary';

// Utils
export { generateMockStockData } from './utils/stockData';
export type { CandleData, Signal } from './utils/stockData';

export { parseStrategy, DEFAULT_STRATEGY } from './utils/strategyParser';

// ============================================================================
// Capability Detection API
// ============================================================================

/**
 * Check if stock visualizer is available
 */
export function isStockVisualizerAvailable(): boolean {
  return true;
}

/**
 * Check if WebGL is supported (required for 3D view)
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Get stock visualizer capabilities
 */
export interface StockVisualizerCapabilities {
  webgl: boolean;
  view3D: boolean;
  view2D: boolean;
  strategyEditor: boolean;
  indicators: string[];
}

export function getStockVisualizerCapabilities(): StockVisualizerCapabilities {
  return {
    webgl: isWebGLSupported(),
    view3D: isWebGLSupported(),
    view2D: true,
    strategyEditor: true,
    indicators: ['SMA', 'EMA'],
  };
}

// ============================================================================
// Integration API
// ============================================================================

export interface StockVisualizerConfig {
  initialView?: '2D' | '3D';
  showEditor?: boolean;
  windowSize?: number;
  dataLength?: number;
}

export const DEFAULT_CONFIG: StockVisualizerConfig = {
  initialView: '3D',
  showEditor: true,
  windowSize: 50,
  dataLength: 150,
};
