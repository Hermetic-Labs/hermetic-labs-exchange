import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButtonSlot } from '../../_shared/useVRCapability';

/** Dispose all geometries and materials in an object and its children */
function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => mat.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    }
    if (child instanceof THREE.Points) {
      child.geometry?.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
  });
}

// Sound types with colors
const SOUND_TYPES = [
  { id: 'kick', name: 'Kick', color: 0xff4444 },
  { id: 'snare', name: 'Snare', color: 0x44ff44 },
  { id: 'hihat', name: 'Hi-Hat', color: 0x4444ff },
  { id: 'bass', name: 'Bass', color: 0xff44ff },
  { id: 'synth', name: 'Synth', color: 0xffff44 },
];

// Track positions (latitude angles in radians)
const TRACKS = [
  { angle: Math.PI * 0.15, name: 'Track 1' },
  { angle: Math.PI * 0.30, name: 'Track 2' },
  { angle: Math.PI * 0.45, name: 'Track 3' },
  { angle: Math.PI * 0.55, name: 'Track 4' },
  { angle: Math.PI * 0.70, name: 'Track 5' },
];

interface BeatBall {
  id: string;
  trackIndex: number;
  longitude: number; // 0 to 2*PI
  soundType: string;
  mesh: THREE.Mesh;
}

// Audio synthesis functions
function createKick(audioCtx: AudioContext, time: number) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
  osc.start(time);
  osc.stop(time + 0.5);
}

function createSnare(audioCtx: AudioContext, time: number) {
  const noise = audioCtx.createBufferSource();
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < output.length; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  noise.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  noise.start(time);
}

function createHiHat(audioCtx: AudioContext, time: number) {
  const noise = audioCtx.createBufferSource();
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < output.length; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  noise.buffer = noiseBuffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start(time);
}

function createBass(audioCtx: AudioContext, time: number) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(55, time);
  gain.gain.setValueAtTime(0.5, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
  osc.start(time);
  osc.stop(time + 0.3);
}

function createSynth(audioCtx: AudioContext, time: number) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(440, time);
  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  osc.start(time);
  osc.stop(time + 0.2);
}

const playSound = (audioCtx: AudioContext, soundType: string) => {
  const time = audioCtx.currentTime;
  switch (soundType) {
    case 'kick': createKick(audioCtx, time); break;
    case 'snare': createSnare(audioCtx, time); break;
    case 'hihat': createHiHat(audioCtx, time); break;
    case 'bass': createBass(audioCtx, time); break;
    case 'synth': createSynth(audioCtx, time); break;
  }
};

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const timelineRef = useRef<THREE.Group | null>(null);
  const ballsRef = useRef<BeatBall[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTriggeredRef = useRef<Set<string>>(new Set());

  const [selectedSound, setSelectedSound] = useState('kick');
  const [isPlaying, setIsPlaying] = useState(true);
  const [tempo, setTempo] = useState(120);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [ballCount, setBallCount] = useState(0);
  const [vrSupported, setVRSupported] = useState(false);
  const [vrActive, setVRActive] = useState(false);

  // Check for VR support on mount
  useEffect(() => {
    const checkVR = async () => {
      // First check native WebXR support
      if (typeof navigator !== 'undefined' && navigator.xr) {
        try {
          const nativeSupport = await navigator.xr.isSessionSupported('immersive-vr');
          if (nativeSupport) {
            setVRSupported(true);
            return;
          }
        } catch { }
      }

      // Try to use vr-spatial-engine module if installed
      try {
        const vrModulePath = '../../vr-spatial-engine/frontend/index';
        const vrModule = await import(/* @vite-ignore */ vrModulePath);
        if (vrModule.isWebXRSupported) {
          const supported = await vrModule.isWebXRSupported();
          setVRSupported(supported);
        }
      } catch {
        // VR module not installed and native check failed
        setVRSupported(false);
      }
    };
    checkVR();
  }, []);

  const SPHERE_RADIUS = 5;

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);
    sceneRef.current = scene;

    // Get container dimensions
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Camera (inside the sphere)
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    // Renderer - use container size, not window size
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = 0.5;

    // Create sphere (transparent shell)
    const sphereGeom = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x334455,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    scene.add(sphere);

    // Create track lines (latitude circles)
    TRACKS.forEach((track, i) => {
      const y = SPHERE_RADIUS * Math.cos(track.angle);
      const radius = SPHERE_RADIUS * Math.sin(track.angle);
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
      const points = curve.getPoints(64);
      const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, y, p.y)));
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(i / TRACKS.length, 0.7, 0.5),
        linewidth: 2
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
    });

    // Create timeline (vertical sweeping line)
    const timelineGroup = new THREE.Group();
    const timelinePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const theta = (i / 32) * Math.PI;
      const x = SPHERE_RADIUS * Math.sin(theta);
      const y = SPHERE_RADIUS * Math.cos(theta);
      timelinePoints.push(new THREE.Vector3(x, y, 0));
    }
    const timelineGeom = new THREE.BufferGeometry().setFromPoints(timelinePoints);
    const timelineMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const timelineLine = new THREE.Line(timelineGeom, timelineMat);
    timelineGroup.add(timelineLine);

    // Add glow effect to timeline
    const glowMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
    const glowLine = new THREE.Line(timelineGeom.clone(), glowMat);
    glowLine.scale.set(1.05, 1.05, 1.05);
    timelineGroup.add(glowLine);

    scene.add(timelineGroup);
    timelineRef.current = timelineGroup;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Point light at center
    const pointLight = new THREE.PointLight(0xffffff, 1);
    scene.add(pointLight);

    // Handle resize - use container dimensions
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Click handler for placing balls
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(sphere);

      if (intersects.length > 0) {
        const point = intersects[0].point;

        // Find closest track
        let closestTrack = 0;
        let minDist = Infinity;
        TRACKS.forEach((track, i) => {
          const trackY = SPHERE_RADIUS * Math.cos(track.angle);
          const dist = Math.abs(point.y - trackY);
          if (dist < minDist) {
            minDist = dist;
            closestTrack = i;
          }
        });

        // Calculate longitude
        const longitude = Math.atan2(point.z, point.x);
        const normalizedLong = longitude < 0 ? longitude + Math.PI * 2 : longitude;

        // Check if clicking on existing ball to remove it
        const existingBall = ballsRef.current.find(b => {
          if (b.trackIndex !== closestTrack) return false;
          const longDiff = Math.abs(b.longitude - normalizedLong);
          return longDiff < 0.2 || longDiff > Math.PI * 2 - 0.2;
        });

        if (existingBall) {
          scene.remove(existingBall.mesh);
          ballsRef.current = ballsRef.current.filter(b => b.id !== existingBall.id);
          setBallCount(ballsRef.current.length);
        } else {
          // Create new ball
          const soundType = SOUND_TYPES.find(s => s.id === selectedSound) || SOUND_TYPES[0];
          const ballGeom = new THREE.SphereGeometry(0.15, 16, 16);
          const ballMat = new THREE.MeshStandardMaterial({
            color: soundType.color,
            emissive: soundType.color,
            emissiveIntensity: 0.5,
          });
          const ballMesh = new THREE.Mesh(ballGeom, ballMat);

          // Position ball on track
          const track = TRACKS[closestTrack];
          const y = SPHERE_RADIUS * Math.cos(track.angle);
          const r = SPHERE_RADIUS * Math.sin(track.angle);
          ballMesh.position.set(
            r * Math.cos(normalizedLong),
            y,
            r * Math.sin(normalizedLong)
          );

          scene.add(ballMesh);

          const newBall: BeatBall = {
            id: `${Date.now()}-${Math.random()}`,
            trackIndex: closestTrack,
            longitude: normalizedLong,
            soundType: selectedSound,
            mesh: ballMesh,
          };
          ballsRef.current.push(newBall);
          setBallCount(ballsRef.current.length);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Animation loop with disposed check
    let animationId: number;
    let lastTime = performance.now();
    let angle = 0;
    let isDisposed = false;

    const animate = () => {
      // Stop if disposed - prevents uniform errors during cleanup
      if (isDisposed) return;

      animationId = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (timelineRef.current && isPlaying) {
        // Calculate rotation speed based on tempo (one full rotation = one bar at given BPM)
        const rotationSpeed = (tempo / 60) * (Math.PI / 2); // One rotation every 4 beats
        angle += rotationSpeed * delta;
        if (angle >= Math.PI * 2) {
          angle -= Math.PI * 2;
          lastTriggeredRef.current.clear();
        }
        timelineRef.current.rotation.y = angle;
        setCurrentAngle(angle);

        // Check for ball triggers
        if (audioCtxRef.current) {
          ballsRef.current.forEach(ball => {
            const longDiff = Math.abs(ball.longitude - angle);
            const isClose = longDiff < 0.1 || longDiff > Math.PI * 2 - 0.1;

            if (isClose && !lastTriggeredRef.current.has(ball.id)) {
              playSound(audioCtxRef.current!, ball.soundType);
              lastTriggeredRef.current.add(ball.id);

              // Visual feedback - pulse the ball
              const originalScale = ball.mesh.scale.clone();
              ball.mesh.scale.set(1.5, 1.5, 1.5);
              setTimeout(() => {
                ball.mesh.scale.copy(originalScale);
              }, 100);
            }
          });
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      // CRITICAL: Set disposed flag FIRST to stop animation loop
      isDisposed = true;

      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      // Dispose all scene objects to prevent WebGL uniform errors on HMR
      if (sceneRef.current) {
        disposeObject(sceneRef.current);
      }
      controls.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [isPlaying, tempo, selectedSound]);

  // Initialize audio context on first interaction
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
  }, []);

  const handleClear = () => {
    ballsRef.current.forEach(ball => {
      if (sceneRef.current) {
        sceneRef.current.remove(ball.mesh);
      }
    });
    ballsRef.current = [];
    setBallCount(0);
    lastTriggeredRef.current.clear();
  };

  const handlePlayPause = () => {
    initAudio();
    setIsPlaying(!isPlaying);
  };

  // Enter VR mode
  const enterVR = async () => {
    if (!rendererRef.current || !vrSupported) return;

    try {
      const session = await navigator.xr?.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor']
      });
      if (session) {
        rendererRef.current.xr.setSession(session);
        setVRActive(true);
        session.addEventListener('end', () => setVRActive(false));
      }
    } catch (err) {
      console.error('[BeatBubbleVR] Failed to enter VR:', err);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden" onClick={initAudio}>
      <div ref={containerRef} className="w-full h-full" />

      {/* VR Button - Shows if vr-spatial-engine is installed, or prompts to install */}
      <div className="absolute top-4 right-4 z-20">
        <VRButtonSlot
          viewId="beat-bubble-vr"
          size="md"
          variant="default"
          onNotInstalled={() => {
            console.log('[BeatBubbleVR] VR module not installed, prompting marketplace');
          }}
        />
      </div>

      {/* UI Controls */}
      <div className="absolute top-4 left-4 bg-black/70 p-4 rounded-lg text-white space-y-4 max-w-xs">
        <h1 className="text-xl font-bold text-cyan-400">Spherical Beat Mixer</h1>
        <p className="text-sm text-gray-300">Click inside the sphere to place beats. Drag to look around.</p>

        {/* Sound Palette */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">Sound Type</label>
          <div className="flex flex-wrap gap-2">
            {SOUND_TYPES.map(sound => (
              <button
                key={sound.id}
                onClick={(e) => { e.stopPropagation(); setSelectedSound(sound.id); initAudio(); }}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${selectedSound === sound.id
                  ? 'ring-2 ring-white scale-105'
                  : 'opacity-70 hover:opacity-100'
                  }`}
                style={{ backgroundColor: `#${sound.color.toString(16).padStart(6, '0')}` }}
              >
                {sound.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tempo Control */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Tempo: {tempo} BPM</label>
          <input
            type="range"
            min="60"
            max="180"
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        {/* Play/Pause and Clear */}
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
            className={`flex-1 py-2 px-4 rounded font-medium ${isPlaying ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
              }`}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="flex-1 py-2 px-4 rounded font-medium bg-red-500 hover:bg-red-600"
          >
            Clear
          </button>
        </div>

        {/* Stats */}
        <div className="text-xs text-gray-500">
          Balls placed: {ballCount} | Position: {((currentAngle / (Math.PI * 2)) * 100).toFixed(0)}%
        </div>
      </div>

      {/* VR Button */}
      {vrSupported && (
        <button
          onClick={(e) => { e.stopPropagation(); enterVR(); }}
          className={`absolute top-4 right-4 px-4 py-2 rounded-lg font-medium transition-all ${vrActive
            ? 'bg-green-500 text-white'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
        >
          {vrActive ? '🥽 VR Active' : '🥽 Enter VR'}
        </button>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-black/50 p-3 rounded text-white text-sm max-w-xs">
        <p className="text-gray-400">
          <span className="text-cyan-400">Click</span> on sphere to place/remove beats
          <br />
          <span className="text-cyan-400">Drag</span> to rotate view
          {vrSupported && (
            <>
              <br />
              <span className="text-purple-400">VR</span> headset detected
            </>
          )}
        </p>
      </div>
    </div>
  );
}

// Export as BeatBubbleVR to match index.ts expectations
export { App as BeatBubbleVR };
export default App;
