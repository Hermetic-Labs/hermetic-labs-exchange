/**
 * Flight Adapter - Transforms flight tracking data into arc visualizations.
 * 
 * This adapter demonstrates how to handle real-time flight data.
 * Replace the mock data with OpenSky API or FlightAware for production use.
 * 
 * @example
 * // Using with real OpenSky API:
 * const realFlightAdapter: DataAdapter = async (config) => {
 *   const url = 'https://opensky-network.org/api/states/all';
 *   const response = await fetch(url);
 *   const data = await response.json();
 *   return data.states.map(transformOpenSkyState);
 * };
 */

import { DataAdapter, ArcData, PointData, GlobeDataItem } from './types';

/** Major airports with coordinates */
const AIRPORTS = {
  JFK: { lat: 40.6413, lng: -73.7781, name: 'New York JFK' },
  LAX: { lat: 33.9425, lng: -118.4081, name: 'Los Angeles' },
  LHR: { lat: 51.4700, lng: -0.4543, name: 'London Heathrow' },
  CDG: { lat: 49.0097, lng: 2.5479, name: 'Paris CDG' },
  NRT: { lat: 35.7720, lng: 140.3929, name: 'Tokyo Narita' },
  SYD: { lat: -33.9399, lng: 151.1753, name: 'Sydney' },
  DXB: { lat: 25.2532, lng: 55.3657, name: 'Dubai' },
  SIN: { lat: 1.3644, lng: 103.9915, name: 'Singapore' },
  FRA: { lat: 50.0379, lng: 8.5622, name: 'Frankfurt' },
  HKG: { lat: 22.3080, lng: 113.9185, name: 'Hong Kong' },
};

type AirportCode = keyof typeof AIRPORTS;

/** Mock flight routes */
const MOCK_FLIGHTS: Array<{ from: AirportCode; to: AirportCode; flight: string; airline: string }> = [
  { from: 'JFK', to: 'LHR', flight: 'BA178', airline: 'British Airways' },
  { from: 'LAX', to: 'NRT', flight: 'JL61', airline: 'Japan Airlines' },
  { from: 'SYD', to: 'LAX', flight: 'QF11', airline: 'Qantas' },
  { from: 'DXB', to: 'JFK', flight: 'EK201', airline: 'Emirates' },
  { from: 'SIN', to: 'LHR', flight: 'SQ322', airline: 'Singapore Airlines' },
  { from: 'FRA', to: 'SIN', flight: 'LH778', airline: 'Lufthansa' },
  { from: 'HKG', to: 'SYD', flight: 'CX101', airline: 'Cathay Pacific' },
  { from: 'CDG', to: 'NRT', flight: 'AF276', airline: 'Air France' },
  { from: 'LHR', to: 'DXB', flight: 'EK2', airline: 'Emirates' },
  { from: 'NRT', to: 'JFK', flight: 'NH10', airline: 'ANA' },
];

/**
 * Generates mock flight data as arcs between airports.
 * In production, replace with actual flight API data.
 */
export const flightAdapter: DataAdapter = async (config) => {
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

  // Otherwise, generate mock data
  const items: GlobeDataItem[] = [];

  // Generate flight arcs
  MOCK_FLIGHTS.forEach((flight, index) => {
    const from = AIRPORTS[flight.from];
    const to = AIRPORTS[flight.to];

    const arc: ArcData = {
      id: `flight-${flight.flight}`,
      type: 'arc',
      startLat: from.lat,
      startLng: from.lng,
      endLat: to.lat,
      endLng: to.lng,
      color: getAirlineColor(flight.airline),
      label: `${flight.flight}: ${from.name} -> ${to.name}`,
      value: 1 + Math.random() * 0.5,
      metadata: {
        flightNumber: flight.flight,
        airline: flight.airline,
        departure: from.name,
        arrival: to.name,
        status: 'In Flight',
      },
    };
    items.push(arc);
  });

  // Add airport points
  Object.entries(AIRPORTS).forEach(([code, airport]) => {
    const point: PointData = {
      id: `airport-${code}`,
      type: 'point',
      lat: airport.lat,
      lng: airport.lng,
      label: `${code} - ${airport.name}`,
      color: '#ffffff',
      value: 1,
      metadata: {
        type: 'airport',
        code,
        name: airport.name,
      },
    };
    items.push(point);
  });

  return items;
};

/** Map airline names to colors */
function getAirlineColor(airline: string): string {
  const colors: Record<string, string> = {
    'British Airways': '#eb2226',
    'Japan Airlines': '#c8102e',
    'Qantas': '#e40000',
    'Emirates': '#d71a21',
    'Singapore Airlines': '#f0ab00',
    'Lufthansa': '#05164d',
    'Cathay Pacific': '#006564',
    'Air France': '#002157',
    'ANA': '#00467f',
  };
  return colors[airline] || '#00ff88';
}

/**
 * Transform external flight API data to standard format.
 * Customize this for your specific API response structure.
 */
function transformExternalData(data: unknown): GlobeDataItem[] {
  if (!Array.isArray(data)) return [];
  
  return data.map((item: Record<string, unknown>, index) => ({
    id: String(item.id || `flight-${index}`),
    type: 'arc' as const,
    startLat: Number(item.departure_lat || item.startLat || 0),
    startLng: Number(item.departure_lng || item.startLng || 0),
    endLat: Number(item.arrival_lat || item.endLat || 0),
    endLng: Number(item.arrival_lng || item.endLng || 0),
    label: String(item.flight_number || item.label || ''),
    color: String(item.color || '#00ff88'),
    metadata: item,
  }));
}

export default flightAdapter;
