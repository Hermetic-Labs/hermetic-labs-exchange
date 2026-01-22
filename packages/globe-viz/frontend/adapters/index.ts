/**
 * Adapter exports - Import adapters from here.
 * 
 * @example
 * import { flightAdapter, trafficAdapter, heatmapAdapter } from '@/adapters';
 * 
 * // Or import types
 * import type { DataAdapter, GlobeDataItem } from '@/adapters';
 */

export * from './types';
export { flightAdapter } from './flightAdapter';
export { trafficAdapter } from './trafficAdapter';
export { heatmapAdapter } from './heatmapAdapter';
