/**
 * Globe Data Visualization - Marketplace Package
 *
 * A modular 3D globe that visualizes ANY data source through pluggable adapters.
 *
 * ARCHITECTURE:
 * - Adapters transform raw API data into a standard format
 * - The Globe component renders points, arcs, heatmaps, paths based on data type
 * - Controls allow switching between data sources or uploading custom data
 *
 * This is a COMPONENT type package for data visualization.
 */

// ============================================================================
// Component Metadata
// ============================================================================

export const COMPONENT_ID = 'globe-viz';
export const COMPONENT_TYPE = 'component';
export const COMPONENT_VERSION = '1.0.0';

// ============================================================================
// Core Exports
// ============================================================================

// Main entry point (first component in manifest)
// Re-export Globe as both GlobeViz (named) and default
export { Globe as GlobeViz } from './components/Globe';
export { Globe as default } from './components/Globe';

// Other components
export { Globe } from './components/Globe';
export { Controls } from './components/Controls';
export { DataLayer } from './components/DataLayer';
export { ErrorBoundary } from './components/ErrorBoundary';

// Adapters
export { flightAdapter, trafficAdapter, heatmapAdapter } from './adapters';
export type {
  VisualizationType,
  BaseDataItem,
  PointData,
  ArcData,
  HeatmapData,
  PathData,
  GlobeDataItem,
  AdapterConfig,
  DataAdapter,
  GlobeProps,
} from './adapters/types';

// Hooks
export { useDataAdapter, useMultipleAdapters } from './hooks/useDataAdapter';

// ============================================================================
// Capability Detection API
// ============================================================================

/**
 * Check if globe visualization is available
 */
export function isGlobeVizAvailable(): boolean {
  return true; // Component is loaded
}

/**
 * Check if WebGL is supported (required for Three.js)
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
 * Get globe visualization capabilities
 */
export interface GlobeVizCapabilities {
  webgl: boolean;
  points: boolean;
  arcs: boolean;
  heatmaps: boolean;
  paths: boolean;
  customData: boolean;
  autoRotate: boolean;
}

export function getGlobeVizCapabilities(): GlobeVizCapabilities {
  return {
    webgl: isWebGLSupported(),
    points: true,
    arcs: true,
    heatmaps: true,
    paths: true,
    customData: true,
    autoRotate: true,
  };
}

// ============================================================================
// Integration API
// ============================================================================

/**
 * Create a custom data adapter
 *
 * @example
 * const myAdapter = createAdapter(async (config) => {
 *   const data = await fetch('/api/my-data').then(r => r.json());
 *   return data.map(item => ({
 *     id: item.id,
 *     type: 'point',
 *     lat: item.latitude,
 *     lng: item.longitude,
 *     label: item.name
 *   }));
 * });
 */
export function createAdapter(
  transformFn: (config: import('./adapters/types').AdapterConfig) => Promise<import('./adapters/types').GlobeDataItem[]>
): import('./adapters/types').DataAdapter {
  return transformFn;
}

/**
 * Default demo data for immediate display
 */
export const DEFAULT_DEMO_DATA: import('./adapters/types').GlobeDataItem[] = [
  { id: 'demo-jfk', type: 'point', lat: 40.6413, lng: -73.7781, label: 'JFK - New York', color: '#ffffff', value: 1, metadata: { type: 'airport' } },
  { id: 'demo-lax', type: 'point', lat: 33.9425, lng: -118.4081, label: 'LAX - Los Angeles', color: '#ffffff', value: 1, metadata: { type: 'airport' } },
  { id: 'demo-lhr', type: 'point', lat: 51.4700, lng: -0.4543, label: 'LHR - London', color: '#ffffff', value: 1, metadata: { type: 'airport' } },
  { id: 'demo-nrt', type: 'point', lat: 35.7720, lng: 140.3929, label: 'NRT - Tokyo', color: '#ffffff', value: 1, metadata: { type: 'airport' } },
  { id: 'demo-arc-1', type: 'arc', startLat: 40.6413, startLng: -73.7781, endLat: 51.4700, endLng: -0.4543, label: 'NYC → London', color: '#eb2226', value: 1.2 },
  { id: 'demo-arc-2', type: 'arc', startLat: 33.9425, startLng: -118.4081, endLat: 35.7720, endLng: 140.3929, label: 'LA → Tokyo', color: '#c8102e', value: 1.3 },
];
