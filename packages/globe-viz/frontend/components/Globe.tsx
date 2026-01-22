/**
 * Globe - Pure Three.js implementation for better mobile compatibility
 */

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GlobeDataItem, GlobeProps, PointData, ArcData } from '../adapters/types';

const GLOBE_RADIUS = 1;

/** Convert lat/lng to 3D position */
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/** Check WebGL support */
function checkWebGL(): { supported: boolean; message: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) return { supported: true, message: '' };
    return { supported: false, message: 'WebGL is not supported by your browser.' };
  } catch {
    return { supported: false, message: 'WebGL check failed.' };
  }
}

/** Detect mobile */
function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || window.innerWidth < 768;
}

export function Globe({
  data = [],
  onItemClick,
  autoRotate = false,
  backgroundColor = '#000010'
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglStatus] = useState(() => checkWebGL());
  const [loading, setLoading] = useState(true);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    globe: THREE.Mesh;
    dataGroup: THREE.Group;
    animationId: number;
  } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !webglStatus.supported) return;

    const container = containerRef.current;
    const mobile = isMobile();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    // Camera
    const camera = new THREE.PerspectiveCamera(mobile ? 55 : 45, width / height, 0.1, 1000);
    camera.position.z = 2.5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: !mobile,
      powerPreference: mobile ? 'low-power' : 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(mobile ? 1 : Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 4;
    controls.rotateSpeed = mobile ? 0.8 : 0.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Stars
    const starCount = mobile ? 300 : 800;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8 })
    );
    scene.add(stars);

    // Globe
    const segments = mobile ? 32 : 48;
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, segments, segments);
    const globeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a365d, roughness: 0.8, metalness: 0.1 });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);

    // Atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, mobile ? 24 : 48, mobile ? 24 : 48);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4080ff, transparent: true, opacity: 0.1, side: THREE.BackSide 
    });
    scene.add(new THREE.Mesh(atmosphereGeometry, atmosphereMaterial));

    // Grid
    const gridGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.001, mobile ? 18 : 32, mobile ? 9 : 16);
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x4a90a4, wireframe: true, transparent: true, opacity: 0.15 });
    scene.add(new THREE.Mesh(gridGeometry, gridMaterial));

    // Data group
    const dataGroup = new THREE.Group();
    scene.add(dataGroup);

    // Store refs
    sceneRef.current = { scene, camera, renderer, controls, globe, dataGroup, animationId: 0 };

    // Animation loop
    function animate() {
      sceneRef.current!.animationId = requestAnimationFrame(animate);
      
      if (autoRotate) {
        globe.rotation.y += 0.001;
      }
      
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    setLoading(false);

    // Handle resize
    function handleResize() {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(sceneRef.current!.animationId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [webglStatus.supported, backgroundColor, autoRotate]);

  // Update data visualization
  useEffect(() => {
    if (!sceneRef.current) return;
    const { dataGroup } = sceneRef.current;

    // Clear existing data
    while (dataGroup.children.length) {
      dataGroup.remove(dataGroup.children[0]);
    }

    // Add points
    const points = data.filter((d): d is PointData => d.type === 'point');
    points.forEach(point => {
      const pos = latLngToVector3(point.lat, point.lng, GLOBE_RADIUS * 1.01);
      const geometry = new THREE.SphereGeometry((point.value || 1) * 0.015, 8, 8);
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(point.color || '#ffffff') });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      mesh.userData = point;
      dataGroup.add(mesh);
    });

    // Add arcs
    const arcs = data.filter((d): d is ArcData => d.type === 'arc');
    arcs.forEach(arc => {
      const start = latLngToVector3(arc.startLat, arc.startLng, GLOBE_RADIUS * 1.005);
      const end = latLngToVector3(arc.endLat, arc.endLng, GLOBE_RADIUS * 1.005);
      
      const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const distance = start.distanceTo(end);
      midPoint.normalize().multiplyScalar(GLOBE_RADIUS + distance * 0.3);
      
      const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
      const tubeGeometry = new THREE.TubeGeometry(curve, 24, 0.004 * (arc.value || 1), 6, false);
      const tubeMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(arc.color || '#00ff88'), 
        transparent: true, 
        opacity: 0.85 
      });
      const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
      tube.userData = arc;
      dataGroup.add(tube);
    });
  }, [data]);

  // WebGL not supported
  if (!webglStatus.supported) {
    return (
      <div style={{
        width: '100%', height: '100%', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(to bottom, #111827, #000)', color: 'white', padding: 32
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 96, height: 96, margin: '0 auto 24px', borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#60a5fa' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>3D Globe Unavailable</h2>
          <p style={{ color: '#9ca3af', marginBottom: 16 }}>{webglStatus.message}</p>
          <p style={{ fontSize: 14, color: '#6b7280' }}>Try Chrome, Firefox, or Safari with hardware acceleration enabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        minHeight: '100vh', minWidth: '100vw', touchAction: 'none'
      }}
    >
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: backgroundColor, zIndex: 10
        }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{
              width: 64, height: 64, margin: '0 auto 16px',
              border: '4px solid #3b82f6', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 1s linear infinite'
            }} />
            <p>Loading Globe...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}
    </div>
  );
}

// Named export alias for manifest compatibility
export { Globe as GlobeViz };
export default Globe;