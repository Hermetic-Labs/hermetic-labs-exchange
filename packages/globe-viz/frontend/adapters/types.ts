/**
 * Core data types for the globe visualization system.
 * All adapters must transform their source data into these standard formats.
 */

/** Supported visualization types */
export type VisualizationType = 'point' | 'arc' | 'heatmap' | 'path';

/** Base interface for all visualization data items */
export interface BaseDataItem {
  /** Unique identifier for this item */
  id: string;
  /** Visualization type determines how this item renders */
  type: VisualizationType;
  /** Optional label for tooltips/popups */
  label?: string;
  /** Optional color (hex or CSS color string) */
  color?: string;
  /** Arbitrary metadata for click handlers */
  metadata?: Record<string, unknown>;
}

/** Point data - renders as a marker at a single location */
export interface PointData extends BaseDataItem {
  type: 'point';
  /** Latitude in degrees (-90 to 90) */
  lat: number;
  /** Longitude in degrees (-180 to 180) */
  lng: number;
  /** Optional size multiplier (default 1) */
  value?: number;
}

/** Arc data - renders as a curved line between two points */
export interface ArcData extends BaseDataItem {
  type: 'arc';
  /** Source latitude */
  startLat: number;
  /** Source longitude */
  startLng: number;
  /** Destination latitude */
  endLat: number;
  /** Destination longitude */
  endLng: number;
  /** Optional intensity/thickness (default 1) */
  value?: number;
}

/** Heatmap data - renders as colored region with intensity */
export interface HeatmapData extends BaseDataItem {
  type: 'heatmap';
  lat: number;
  lng: number;
  /** Intensity value (0-1 normalized) */
  value: number;
  /** Radius in degrees */
  radius?: number;
}

/** Path data - renders as animated line following coordinates */
export interface PathData extends BaseDataItem {
  type: 'path';
  /** Array of [lat, lng] coordinates */
  coordinates: [number, number][];
  /** Current position along path (0-1) for animation */
  progress?: number;
  value?: number;
}

/** Union type of all data items */
export type GlobeDataItem = PointData | ArcData | HeatmapData | PathData;

/** Adapter configuration options */
export interface AdapterConfig {
  /** API endpoint URL (if fetching from remote) */
  url?: string;
  /** Static JSON data (if using local data) */
  data?: unknown;
  /** Polling interval in ms (0 = no polling) */
  refreshInterval?: number;
}

/**
 * Adapter function signature.
 * Takes raw data from any source and returns normalized GlobeDataItem array.
 * 
 * @example
 * const myAdapter: DataAdapter = async (config) => {
 *   const rawData = config.data || await fetch(config.url).then(r => r.json());
 *   return rawData.map(item => ({
 *     id: item.id,
 *     type: 'point',
 *     lat: item.latitude,
 *     lng: item.longitude,
 *     label: item.name
 *   }));
 * };
 */
export type DataAdapter = (config: AdapterConfig) => Promise<GlobeDataItem[]>;

/** Props for the main Globe component */
export interface GlobeProps {
  /** Array of data items to visualize */
  data: GlobeDataItem[];
  /** Callback when an item is clicked */
  onItemClick?: (item: GlobeDataItem) => void;
  /** Globe texture URL (optional, uses default earth texture) */
  textureUrl?: string;
  /** Enable auto-rotation */
  autoRotate?: boolean;
  /** Background color */
  backgroundColor?: string;
}
