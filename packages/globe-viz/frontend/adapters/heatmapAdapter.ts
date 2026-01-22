/**
 * Heatmap Adapter - Transforms population or density data into heatmap visualizations.
 * 
 * This adapter demonstrates handling intensity-based data like population density,
 * pathogen spread, economic activity, or any geographically distributed metric.
 * 
 * @example
 * // Using with real population data:
 * const realPopulationAdapter: DataAdapter = async (config) => {
 *   const response = await fetch('https://api.worldbank.org/population');
 *   const data = await response.json();
 *   return data.map(region => ({
 *     id: region.code,
 *     type: 'heatmap',
 *     lat: region.centroid.lat,
 *     lng: region.centroid.lng,
 *     value: normalizePopulation(region.population),
 *     radius: region.area_km2 / 10000,
 *     color: getPopulationColor(region.density)
 *   }));
 * };
 */

import { DataAdapter, HeatmapData, GlobeDataItem } from './types';

/** Mock population/density data for major metropolitan areas */
const MOCK_POPULATION_DATA = [
  // Asia
  { region: 'Tokyo Metro', lat: 35.6762, lng: 139.6503, population: 37.4, density: 0.95 },
  { region: 'Delhi NCR', lat: 28.7041, lng: 77.1025, population: 32.9, density: 0.88 },
  { region: 'Shanghai', lat: 31.2304, lng: 121.4737, population: 29.2, density: 0.85 },
  { region: 'Beijing', lat: 39.9042, lng: 116.4074, population: 21.5, density: 0.72 },
  { region: 'Mumbai', lat: 19.0760, lng: 72.8777, population: 21.4, density: 0.9 },
  { region: 'Osaka', lat: 34.6937, lng: 135.5023, population: 19.2, density: 0.65 },
  { region: 'Jakarta', lat: -6.2088, lng: 106.8456, population: 34.5, density: 0.82 },
  { region: 'Seoul', lat: 37.5665, lng: 126.9780, population: 25.8, density: 0.78 },
  { region: 'Singapore', lat: 1.3521, lng: 103.8198, population: 5.9, density: 0.92 },
  { region: 'Hong Kong', lat: 22.3193, lng: 114.1694, population: 7.5, density: 0.98 },
  // Americas
  { region: 'New York Metro', lat: 40.7128, lng: -74.0060, population: 20.1, density: 0.68 },
  { region: 'Sao Paulo', lat: -23.5505, lng: -46.6333, population: 22.4, density: 0.75 },
  { region: 'Mexico City', lat: 19.4326, lng: -99.1332, population: 21.8, density: 0.7 },
  { region: 'Los Angeles', lat: 34.0522, lng: -118.2437, population: 13.2, density: 0.45 },
  { region: 'Buenos Aires', lat: -34.6037, lng: -58.3816, population: 15.4, density: 0.55 },
  { region: 'Chicago', lat: 41.8781, lng: -87.6298, population: 9.5, density: 0.4 },
  // Europe
  { region: 'London', lat: 51.5074, lng: -0.1278, population: 14.3, density: 0.58 },
  { region: 'Paris', lat: 48.8566, lng: 2.3522, population: 13.0, density: 0.62 },
  { region: 'Moscow', lat: 55.7558, lng: 37.6173, population: 12.6, density: 0.48 },
  { region: 'Istanbul', lat: 41.0082, lng: 28.9784, population: 15.6, density: 0.65 },
  // Africa
  { region: 'Lagos', lat: 6.5244, lng: 3.3792, population: 15.4, density: 0.85 },
  { region: 'Cairo', lat: 30.0444, lng: 31.2357, population: 21.3, density: 0.8 },
  { region: 'Johannesburg', lat: -26.2041, lng: 28.0473, population: 5.9, density: 0.35 },
  // Oceania
  { region: 'Sydney', lat: -33.8688, lng: 151.2093, population: 5.4, density: 0.32 },
  { region: 'Melbourne', lat: -37.8136, lng: 144.9631, population: 5.1, density: 0.28 },
];

/**
 * Generates mock population/density heatmap data.
 * Intensity represents population density normalized to 0-1.
 */
export const heatmapAdapter: DataAdapter = async (config) => {
  // If external data provided, use it
  if (config.data) {
    return transformExternalData(config.data);
  }

  // If URL provided, fetch from API
  if (config.url) {
    const response = await fetch(config.url);
    const data = await response.json();
    return transformExternalData(data);
  }

  // Generate mock heatmap data
  return MOCK_POPULATION_DATA.map((region, index): HeatmapData => ({
    id: `pop-${index}`,
    type: 'heatmap',
    lat: region.lat,
    lng: region.lng,
    value: region.density,
    radius: 3 + (region.population / 40) * 5, // Larger radius for bigger cities
    color: getDensityColor(region.density),
    label: `${region.region}`,
    metadata: {
      region: region.region,
      population: `${region.population}M`,
      density: `${Math.round(region.density * 100)}%`,
      rank: index + 1,
    },
  }));
};

/** Returns color based on density level (0-1) */
function getDensityColor(density: number): string {
  if (density < 0.3) return '#3b82f6'; // Blue - low density
  if (density < 0.5) return '#8b5cf6'; // Purple - moderate
  if (density < 0.7) return '#ec4899'; // Pink - high
  if (density < 0.85) return '#f97316'; // Orange - very high
  return '#ef4444'; // Red - extreme
}

/**
 * Transform external population/density API data to standard format.
 */
function transformExternalData(data: unknown): GlobeDataItem[] {
  if (!Array.isArray(data)) return [];
  
  return data.map((item: Record<string, unknown>, index) => {
    const value = Number(item.value || item.density || item.intensity || 0.5);
    return {
      id: String(item.id || `heatmap-${index}`),
      type: 'heatmap' as const,
      lat: Number(item.lat || item.latitude || 0),
      lng: Number(item.lng || item.longitude || 0),
      value,
      radius: Number(item.radius || 3),
      color: getDensityColor(value),
      label: String(item.label || item.name || item.region || ''),
      metadata: item,
    };
  });
}

export default heatmapAdapter;
