/**
 * DataLayer - Renders visualization items on the globe surface.
 * Simplified and mobile-safe implementation.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { GlobeDataItem, PointData, ArcData, HeatmapData } from '../adapters/types';

interface DataLayerProps {
  data: GlobeDataItem[];
  globeRadius: number;
  onItemClick?: (item: GlobeDataItem) => void;
}

/** Convert lat/lng to 3D position on sphere */
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function DataLayer({ data, globeRadius, onItemClick }: DataLayerProps) {
  const points = useMemo(() => data.filter((d): d is PointData => d.type === 'point'), [data]);
  const arcs = useMemo(() => data.filter((d): d is ArcData => d.type === 'arc'), [data]);
  const heatmaps = useMemo(() => data.filter((d): d is HeatmapData => d.type === 'heatmap'), [data]);

  return (
    <group>
      {points.map((point) => (
        <PointMarker key={point.id} point={point} radius={globeRadius} onItemClick={onItemClick} />
      ))}
      {arcs.map((arc) => (
        <ArcLine key={arc.id} arc={arc} radius={globeRadius} onItemClick={onItemClick} />
      ))}
      {heatmaps.map((heat) => (
        <HeatSpot key={heat.id} heat={heat} radius={globeRadius} onItemClick={onItemClick} />
      ))}
    </group>
  );
}

/** Single point marker */
function PointMarker({ 
  point, 
  radius, 
  onItemClick 
}: { 
  point: PointData; 
  radius: number;
  onItemClick?: (item: GlobeDataItem) => void;
}) {
  const pos = useMemo(() => latLngToVector3(point.lat, point.lng, radius * 1.01), [point.lat, point.lng, radius]);
  const color = useMemo(() => new THREE.Color(point.color || '#ffffff'), [point.color]);
  const scale = (point.value || 1) * 0.015;

  return (
    <mesh
      position={pos}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onItemClick?.(point);
      }}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/** Single arc line between two points - using mesh tube for better visibility */
function ArcLine({ 
  arc, 
  radius,
  onItemClick
}: { 
  arc: ArcData; 
  radius: number;
  onItemClick?: (item: GlobeDataItem) => void;
}) {
  const { curve, color } = useMemo(() => {
    const start = latLngToVector3(arc.startLat, arc.startLng, radius * 1.005);
    const end = latLngToVector3(arc.endLat, arc.endLng, radius * 1.005);
    
    // Create mid point for arc
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const distance = start.distanceTo(end);
    midPoint.normalize().multiplyScalar(radius + distance * 0.3);
    
    return {
      curve: new THREE.QuadraticBezierCurve3(start, midPoint, end),
      color: new THREE.Color(arc.color || '#00ff88')
    };
  }, [arc, radius]);

  return (
    <mesh
      onClick={(e) => {
        e.stopPropagation();
        onItemClick?.(arc);
      }}
    >
      <tubeGeometry args={[curve, 24, 0.004 * (arc.value || 1), 6, false]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

/** Heatmap spot */
function HeatSpot({ 
  heat, 
  radius,
  onItemClick
}: { 
  heat: HeatmapData; 
  radius: number;
  onItemClick?: (item: GlobeDataItem) => void;
}) {
  const pos = useMemo(() => latLngToVector3(heat.lat, heat.lng, radius * 1.002), [heat.lat, heat.lng, radius]);
  const color = useMemo(() => new THREE.Color(heat.color || '#ff0000'), [heat.color]);
  const size = (heat.radius || 3) * 0.02 * heat.value;

  return (
    <mesh
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        onItemClick?.(heat);
      }}
    >
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}

export default DataLayer;