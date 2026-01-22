/**
 * EVE OS Medical Viewport - LITE
 * Optimized for Raspberry Pi / low-end devices
 *
 * Key optimizations:
 * - Single merged geometry per layer (1 draw call)
 * - 24 FPS frame limiter
 * - Object pooling for particles
 * - Minimal materials (no shadows)
 * - No micro layers (L8-L11 disabled)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG, shouldRender, dispose } from './utils/performance';
import { createBodyMesh, initParticlePool, spawnParticle, updateParticles, disposeAll } from './utils/optimizedGeometry';

// =============================================================================
// LAYER CONFIG (macro only - micro disabled for Pi)
// =============================================================================

const LAYERS = {
    L0: { name: 'Outline', color: 0x4488ff },
    L1: { name: 'Skeleton', color: 0xffffff },
    L2: { name: 'Muscles', color: 0xff4444 },
    L3: { name: 'Circulatory', color: 0xff0066 },
    L4: { name: 'Nervous', color: 0xffff00 },
    L5: { name: 'Respiratory', color: 0x66ffff },
    L6: { name: 'Digestive', color: 0xff8800 },
    L7: { name: 'Immune', color: 0x00ff00 },
} as const;

type LayerId = keyof typeof LAYERS;

const MED_COLORS = {
    analgesic: 0xff6b6b,
    antibiotic: 0x00ff88,
    stimulant: 0xffff00,
    immunoboost: 0x00ffff,
} as const;

type MedType = keyof typeof MED_COLORS;

// =============================================================================
// COMPONENT
// =============================================================================

export function MedicalViewportLite() {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        renderer: THREE.WebGLRenderer;
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        controls: OrbitControls;
        meshes: Record<string, THREE.Mesh>;
        animId: number;
    } | null>(null);

    const [layer, setLayer] = useState<LayerId>('L0');
    const [vitals, setVitals] = useState({ hr: 72, o2: 98, temp: 98.6, bp: '118/76' });
    const [medType, setMedType] = useState<MedType>('analgesic');
    const [medActive, setMedActive] = useState(false);
    const [status, setStatus] = useState('READY');

    const layerRef = useRef(layer);
    useEffect(() => { layerRef.current = layer; }, [layer]);

    // ==========================================================================
    // SCENE INIT
    // ==========================================================================

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020208);

        // Camera
        const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 1, 5);

        // Renderer (no antialias for Pi)
        const renderer = new THREE.WebGLRenderer({ antialias: CONFIG.ANTIALIAS });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(CONFIG.PIXEL_RATIO);
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Minimal lighting (1 hemi + 1 directional)
        scene.add(new THREE.HemisphereLight(0x88bbff, 0x223344, 0.6));
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(4, 8, 6);
        scene.add(sun);

        // Create layer meshes (merged geometry)
        const meshes: Record<string, THREE.Mesh> = {};
        for (const [id, def] of Object.entries(LAYERS)) {
            const mesh = createBodyMesh(def.color);
            mesh.visible = id === 'L0';
            scene.add(mesh);
            meshes[id] = mesh;
        }

        // Particle pool
        initParticlePool(scene);

        // Store refs
        sceneRef.current = { renderer, scene, camera, controls, meshes, animId: 0 };

        // Animation loop (24 FPS limited)
        function animate() {
            sceneRef.current!.animId = requestAnimationFrame(animate);

            const now = performance.now();
            if (!shouldRender(now)) return;

            controls.update();

            // Simple pulse animation on current layer
            const mesh = meshes[layerRef.current];
            if (mesh) {
                const t = now * 0.001;
                const scale = 1 + Math.sin(t * 2) * 0.015;
                mesh.scale.setScalar(scale);
                (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1 + Math.sin(t * 3) * 0.05;
            }

            // Update particles
            updateParticles(1 / CONFIG.TARGET_FPS);

            renderer.render(scene, camera);
        }
        animate();

        // Resize
        const onResize = () => {
            if (!sceneRef.current) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', onResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(sceneRef.current!.animId);
            dispose(scene);
            disposeAll();
            renderer.dispose();
            container.removeChild(renderer.domElement);
            sceneRef.current = null;
        };
    }, []);

    // ==========================================================================
    // VITALS SIM (throttled)
    // ==========================================================================

    useEffect(() => {
        const id = setInterval(() => {
            setVitals(v => ({
                hr: Math.round(v.hr + (Math.random() * 4 - 2)),
                o2: Math.min(100, Math.max(95, Math.round(v.o2 + (Math.random() * 2 - 1)))),
                temp: parseFloat((v.temp + (Math.random() * 0.2 - 0.1)).toFixed(1)),
                bp: v.bp,
            }));
        }, 3000); // Slower update for Pi

        return () => clearInterval(id);
    }, []);

    // ==========================================================================
    // LAYER SWITCH
    // ==========================================================================

    const switchLayer = useCallback((id: LayerId) => {
        if (!sceneRef.current) return;
        const { meshes } = sceneRef.current;

        for (const [k, m] of Object.entries(meshes)) {
            m.visible = k === id;
        }
        setLayer(id);
    }, []);

    // ==========================================================================
    // MEDICATION
    // ==========================================================================

    const startMedication = useCallback(() => {
        if (medActive) return;
        setMedActive(true);
        setStatus('💊 Medication flowing...');

        const color = MED_COLORS[medType];
        let spawned = 0;
        const spawnId = setInterval(() => {
            if (spawned >= CONFIG.MAX_PARTICLES) {
                clearInterval(spawnId);
                setTimeout(() => {
                    setMedActive(false);
                    setStatus('✓ Absorbed');
                }, 2000);
                return;
            }
            spawnParticle(0, 1.5, 0.3, color);
            spawned++;
        }, 100);
    }, [medActive, medType]);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <div className="medical-viewport h-full w-full relative bg-black overflow-hidden">
            {/* Vitals (minimal) */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-black/80 rounded border border-green-500/50 text-green-400 text-xs font-mono">
                HR:{vitals.hr} O₂:{vitals.o2}% T:{vitals.temp}°F
            </div>

            {/* Layer Buttons (vertical, left) */}
            <div className="absolute top-12 left-2 z-10 flex flex-col gap-1">
                {Object.entries(LAYERS).map(([id, def]) => (
                    <button
                        key={id}
                        onClick={() => switchLayer(id as LayerId)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                            layer === id
                                ? 'bg-cyan-600 text-white'
                                : 'bg-black/60 text-gray-300 hover:bg-white/10'
                        }`}
                        style={{ borderLeft: `3px solid #${def.color.toString(16).padStart(6, '0')}` }}
                    >
                        {id}
                    </button>
                ))}
            </div>

            {/* Medication (right) */}
            <div className="absolute top-12 right-2 z-10 flex flex-col gap-2 bg-black/60 p-2 rounded">
                <select
                    value={medType}
                    onChange={e => setMedType(e.target.value as MedType)}
                    className="bg-black/80 text-white text-xs p-1 rounded border border-white/20"
                >
                    <option value="analgesic">Analgesic</option>
                    <option value="antibiotic">Antibiotic</option>
                    <option value="stimulant">Stimulant</option>
                    <option value="immunoboost">Immune</option>
                </select>
                <button
                    onClick={startMedication}
                    disabled={medActive}
                    className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs py-1.5 px-3 rounded disabled:opacity-50"
                >
                    💊 Administer
                </button>
            </div>

            {/* Status */}
            <div className="absolute bottom-2 right-2 z-10 px-3 py-1 bg-black/60 rounded text-green-400 text-xs">
                {status}
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="absolute inset-0" />
        </div>
    );
}

export default MedicalViewportLite;
