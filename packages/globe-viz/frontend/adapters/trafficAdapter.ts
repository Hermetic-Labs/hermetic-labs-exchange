/**
 * Traffic/Camera Adapter - Transforms traffic camera or sensor data into point visualizations.
 * 
 * This adapter demonstrates handling point-based data like traffic cameras,
 * sensors, or any location-based monitoring system.
 * 
 * @example
 * // Using with real traffic API:
 * const realTrafficAdapter: DataAdapter = async (config) => {
 *   const response = await fetch('https://api.city.gov/traffic/cameras');
 *   const cameras = await response.json();
 *   return cameras.map(cam => ({
 *     id: cam.camera_id,
 *     type: 'point',
 *     lat: cam.location.lat,
 *     lng: cam.location.lng,
 *     value: cam.congestion_level,
 *     color: getTrafficColor(cam.congestion_level),
 *     label: cam.street_name
 *   }));
 * };
 */

import { DataAdapter, PointData, GlobeDataItem } from './types';

/** Mock traffic camera/sensor locations in major cities */
const MOCK_SENSORS = [
  // New York
  { city: 'New York', lat: 40.7580, lng: -73.9855, location: 'Times Square', congestion: 0.9 },
  { city: 'New York', lat: 40.7484, lng: -73.9857, location: 'Empire State', congestion: 0.7 },
  { city: 'New York', lat: 40.7128, lng: -74.0060, location: 'Financial District', congestion: 0.6 },
  // Los Angeles
  { city: 'Los Angeles', lat: 34.0522, lng: -118.2437, location: 'Downtown LA', congestion: 0.85 },
  { city: 'Los Angeles', lat: 34.0195, lng: -118.4912, location: 'Santa Monica', congestion: 0.5 },
  { city: 'Los Angeles', lat: 34.1478, lng: -118.1445, location: 'Pasadena', congestion: 0.4 },
  // London
  { city: 'London', lat: 51.5074, lng: -0.1278, location: 'Westminster', congestion: 0.8 },
  { city: 'London', lat: 51.5155, lng: -0.1419, location: 'Oxford Circus', congestion: 0.95 },
  { city: 'London', lat: 51.5033, lng: -0.1195, location: 'Waterloo', congestion: 0.65 },
  // Tokyo
  { city: 'Tokyo', lat: 35.6762, lng: 139.6503, location: 'Shinjuku', congestion: 0.92 },
  { city: 'Tokyo', lat: 35.6595, lng: 139.7004, location: 'Shibuya', congestion: 0.88 },
  { city: 'Tokyo', lat: 35.6812, lng: 139.7671, location: 'Ginza', congestion: 0.75 },
  // Paris
  { city: 'Paris', lat: 48.8566, lng: 2.3522, location: 'Chatelet', congestion: 0.7 },
  { city: 'Paris', lat: 48.8738, lng: 2.2950, location: 'Arc de Triomphe', congestion: 0.6 },
  // Sydney
  { city: 'Sydney', lat: -33.8688, lng: 151.2093, location: 'CBD', congestion: 0.55 },
  { city: 'Sydney', lat: -33.8568, lng: 151.2153, location: 'Circular Quay', congestion: 0.45 },
  // Singapore
  { city: 'Singapore', lat: 1.2838, lng: 103.8591, location: 'Marina Bay', congestion: 0.5 },
  { city: 'Singapore', lat: 1.3039, lng: 103.8318, location: 'Orchard Road', congestion: 0.72 },
  // Dubai
  { city: 'Dubai', lat: 25.2048, lng: 55.2708, location: 'Downtown', congestion: 0.6 },
  { city: 'Dubai', lat: 25.0657, lng: 55.1713, location: 'JBR', congestion: 0.4 },
];

/**
 * Generates mock traffic sensor data as points.
 * Color-coded by congestion level (green=low, red=high).
 */
export const trafficAdapter: DataAdapter = async (config) => {
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

  // Generate mock data with some randomization
  return MOCK_SENSORS.map((sensor, index): PointData => {
    // Add some randomness to congestion for dynamic feel
    const congestion = Math.min(1, Math.max(0, sensor.congestion + (Math.random() - 0.5) * 0.2));
    
    return {
      id: `sensor-${index}`,
      type: 'point',
      lat: sensor.lat,
      lng: sensor.lng,
      value: 0.5 + congestion * 0.5,
      color: getCongestionColor(congestion),
      label: `${sensor.location}, ${sensor.city}`,
      metadata: {
        city: sensor.city,
        location: sensor.location,
        congestion: Math.round(congestion * 100),
        status: getCongestionStatus(congestion),
        lastUpdated: new Date().toISOString(),
      },
    };
  });
};

/** Returns color based on congestion level (0-1) */
function getCongestionColor(level: number): string {
  if (level < 0.3) return '#22c55e'; // Green - low traffic
  if (level < 0.5) return '#84cc16'; // Lime - moderate
  if (level < 0.7) return '#eab308'; // Yellow - busy
  if (level < 0.85) return '#f97316'; // Orange - heavy
  return '#ef4444'; // Red - severe
}

/** Returns status text based on congestion level */
function getCongestionStatus(level: number): string {
  if (level < 0.3) return 'Clear';
  if (level < 0.5) return 'Light Traffic';
  if (level < 0.7) return 'Moderate';
  if (level < 0.85) return 'Heavy';
  return 'Severe Congestion';
}

/**
 * Transform external traffic API data to standard format.
 */
function transformExternalData(data: unknown): GlobeDataItem[] {
  if (!Array.isArray(data)) return [];
  
  return data.map((item: Record<string, unknown>, index) => {
    const congestion = Number(item.congestion || item.value || 0.5);
    return {
      id: String(item.id || `sensor-${index}`),
      type: 'point' as const,
      lat: Number(item.lat || item.latitude || 0),
      lng: Number(item.lng || item.longitude || 0),
      value: congestion,
      color: getCongestionColor(congestion),
      label: String(item.label || item.location || ''),
      metadata: item,
    };
  });
}

export default trafficAdapter;
