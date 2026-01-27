/**
 * EVE OS Medical Viewport VR
 *
 * VR-enabled version using VRSceneProvider for shared scene infrastructure.
 * Inherits base scene (grid, stars, lighting) and adds medical-specific content.
 *
 * Features:
 * - L0-L7 layer system (macro body systems)
 * - Medication delivery simulation
 * - WebXR VR mode support
 * - Proper disposal handling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { VRSceneProvider, useVRScene } from '../../vr-spatial-engine/frontend';
import { VRButtonSlot } from '../../_shared/useVRCapability';

// =============================================================================
// TYPES
// =============================================================================

type LayerId = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';
type MedicationType = 'analgesic' | 'antibiotic' | 'stimulant' | 'immunoboost';

interface VitalSigns {
    heartRate: number;
    o2Sat: number;
    temp: number;
    bp: string;
}

interface LayerDefinition {
    name: string;
    color: number;
    effect: string;
}

// =============================================================================
// LAYER DEFINITIONS
// =============================================================================

const LAYERS: Record<LayerId, LayerDefinition> = {
    L0: { name: 'Outline', color: 0x4488ff, effect: 'glow' },
    L1: { name: 'Skeleton', color: 0xffffff, effect: 'pulse' },
    L2: { name: 'Muscles', color: 0xff4444, effect: 'contract' },
    L3: { name: 'Circulatory', color: 0xff0066, effect: 'flow' },
    L4: { name: 'Nervous', color: 0xffff00, effect: 'spark' },
    L5: { name: 'Respiratory', color: 0x66ffff, effect: 'breathe' },
    L6: { name: 'Digestive', color: 0xff8800, effect: 'peristalsis' },
    L7: { name: 'Immune', color: 0x00ff00, effect: 'swarm' },
};

const MED_COLORS: Record<MedicationType, number> = {
    analgesic: 0xff6b6b,
    antibiotic: 0x00ff88,
    stimulant: 0xffff00,
    immunoboost: 0x00ffff,
};

// =============================================================================
// GEOMETRY CREATION
// =============================================================================

function createBodyMesh(color: number): THREE.Group {
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.75,
        roughness: 0.6,
        metalness: 0.05,
        emissive: color,
        emissiveIntensity: 0.1,
    });

    // HEAD
    const headGeo = new THREE.SphereGeometry(0.14, 16, 16);
    headGeo.scale(1, 1.15, 0.95);
    const head = new THREE.Mesh(headGeo, mat.clone());
    head.position.set(0, 1.65, 0);
    group.add(head);

    // NECK
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.075, 0.15, 8);
    const neck = new THREE.Mesh(neckGeo, mat.clone());
    neck.position.set(0, 1.52, 0);
    group.add(neck);

    // TORSO
    const upperTorsoGeo = new THREE.CapsuleGeometry(0.2, 0.35, 8, 16);
    const upperTorso = new THREE.Mesh(upperTorsoGeo, mat.clone());
    upperTorso.position.set(0, 1.2, 0);
    group.add(upperTorso);

    const lowerTorsoGeo = new THREE.CapsuleGeometry(0.18, 0.25, 8, 16);
    const lowerTorso = new THREE.Mesh(lowerTorsoGeo, mat.clone());
    lowerTorso.position.set(0, 0.85, 0);
    group.add(lowerTorso);

    // ARMS
    const armGeo = new THREE.CapsuleGeometry(0.045, 0.5, 6, 12);
    [-1, 1].forEach(side => {
        const arm = new THREE.Mesh(armGeo, mat.clone());
        arm.position.set(side * 0.3, 1.0, 0);
        group.add(arm);
    });

    // LEGS
    const legGeo = new THREE.CapsuleGeometry(0.06, 0.7, 6, 12);
    [-1, 1].forEach(side => {
        const leg = new THREE.Mesh(legGeo, mat.clone());
        leg.position.set(side * 0.12, 0.2, 0);
        group.add(leg);
    });

    return group;
}

// =============================================================================
// MEDICAL CONTENT COMPONENT (renders inside VRSceneProvider)
// =============================================================================

interface MedicalContentProps {
    currentLayer: LayerId;
    onLayerMeshesCreated: (meshes: Record<LayerId, THREE.Group>) => void;
}

function MedicalContent({ currentLayer, onLayerMeshesCreated }: MedicalContentProps) {
    const { scene, moduleGroup } = useVRScene();
    const meshesRef = useRef<Record<string, THREE.Group>>({});
    const animationRef = useRef<number>(0);

    useEffect(() => {
        if (!moduleGroup) return;

        // Create layer meshes
        const meshes: Record<string, THREE.Group> = {};

        Object.entries(LAYERS).forEach(([id, def]) => {
            const mesh = createBodyMesh(def.color);
            mesh.visible = id === 'L0';
            mesh.position.set(0, 0, 0); // Center in scene
            moduleGroup.add(mesh);
            meshes[id] = mesh;
        });

        meshesRef.current = meshes;
        onLayerMeshesCreated(meshes as Record<LayerId, THREE.Group>);

        // Animation for current layer
        let isDisposed = false;

        const animate = () => {
            if (isDisposed) return;
            animationRef.current = requestAnimationFrame(animate);

            const mesh = meshesRef.current[currentLayer];
            if (mesh) {
                const t = performance.now() * 0.001;
                const scale = 1 + Math.sin(t * 2) * 0.015;
                mesh.scale.setScalar(scale);

                // Update emissive intensity for pulse effect
                mesh.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                        child.material.emissiveIntensity = 0.1 + Math.sin(t * 3) * 0.05;
                    }
                });
            }
        };
        animate();

        return () => {
            isDisposed = true;
            cancelAnimationFrame(animationRef.current);

            // Dispose meshes
            Object.values(meshes).forEach(mesh => {
                mesh.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry?.dispose();
                        if (child.material instanceof THREE.Material) {
                            child.material.dispose();
                        }
                    }
                });
                moduleGroup.remove(mesh);
            });
        };
    }, [moduleGroup, onLayerMeshesCreated]);

    // Update visibility when layer changes
    useEffect(() => {
        Object.entries(meshesRef.current).forEach(([id, mesh]) => {
            mesh.visible = id === currentLayer;
        });
    }, [currentLayer]);

    return null; // This component only manages 3D content
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MedicalViewportVR() {
    const [currentLayer, setCurrentLayer] = useState<LayerId>('L0');
    const [vitals, setVitals] = useState<VitalSigns>({
        heartRate: 72,
        o2Sat: 98,
        temp: 98.6,
        bp: '118/76',
    });
    const [medType, setMedType] = useState<MedicationType>('analgesic');
    const [medActive, setMedActive] = useState(false);
    const [status, setStatus] = useState('READY');

    const meshesRef = useRef<Record<LayerId, THREE.Group> | null>(null);

    // Vitals simulation
    useEffect(() => {
        const interval = setInterval(() => {
            setVitals(v => ({
                heartRate: Math.round(v.heartRate + (Math.random() * 4 - 2)),
                o2Sat: Math.min(100, Math.max(95, Math.round(v.o2Sat + (Math.random() * 2 - 1)))),
                temp: parseFloat((v.temp + (Math.random() * 0.2 - 0.1)).toFixed(1)),
                bp: v.bp,
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const handleLayerChange = useCallback((id: LayerId) => {
        setCurrentLayer(id);
    }, []);

    const handleMeshesCreated = useCallback((meshes: Record<LayerId, THREE.Group>) => {
        meshesRef.current = meshes;
    }, []);

    const startMedication = useCallback(() => {
        if (medActive) return;
        setMedActive(true);
        setStatus('Medication flowing...');

        // Simulate medication absorption
        setTimeout(() => {
            setMedActive(false);
            setStatus('Absorbed');
        }, 3000);
    }, [medActive]);

    return (
        <VRSceneProvider
            backgroundColor={0x020208}
            showGrid={false}
            showStars={true}
            enableControls={true}
            cameraPosition={[0, 1, 5]}
            cameraTarget={[0, 1, 0]}
            className="medical-viewport-vr"
        >
            {/* 3D Content Manager */}
            <MedicalContent
                currentLayer={currentLayer}
                onLayerMeshesCreated={handleMeshesCreated}
            />

            {/* UI Overlays */}
            <div className="absolute inset-0 pointer-events-none">
                {/* VR Button */}
                <div className="absolute top-3 right-4 z-20 pointer-events-auto">
                    <VRButtonSlot
                        viewId="medical-viewport-vr"
                        size="md"
                        variant="default"
                    />
                </div>

                {/* Vitals Header */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-5 py-2 bg-[rgba(0,25,0,0.9)] rounded-lg border border-[#00ff99] text-[#00ff99] text-sm tracking-wide shadow-[0_0_6px_#00ff99] pointer-events-auto">
                    HR: {vitals.heartRate} | O2: {vitals.o2Sat}% | T: {vitals.temp}F | BP: {vitals.bp}
                </div>

                {/* Layer Panel */}
                <div className="absolute top-16 left-4 z-10 bg-black/85 backdrop-blur-md rounded-lg p-3 text-white text-xs border border-[rgba(0,255,153,0.3)] pointer-events-auto">
                    <div className="text-[10px] uppercase opacity-70 mb-2 text-[#00ff99] tracking-wide">Body Systems</div>
                    {(Object.entries(LAYERS) as [LayerId, LayerDefinition][]).map(([id, def]) => (
                        <div
                            key={id}
                            onClick={() => handleLayerChange(id)}
                            className={`px-3 py-1.5 my-1 rounded cursor-pointer transition-all text-xs border-l-[3px] ${
                                currentLayer === id
                                    ? 'bg-[rgba(0,180,255,0.8)] shadow-[0_0_10px_rgba(0,180,255,0.5)]'
                                    : 'bg-white/10 hover:bg-white/20'
                            }`}
                            style={{ borderLeftColor: `#${def.color.toString(16).padStart(6, '0')}` }}
                        >
                            {id} - {def.name}
                        </div>
                    ))}
                </div>

                {/* Medication Panel */}
                <div className="absolute top-16 right-4 z-10 w-48 bg-black/85 backdrop-blur-md rounded-lg p-3 text-white text-xs border border-[rgba(0,180,255,0.3)] pointer-events-auto">
                    <div className="text-[10px] uppercase opacity-70 mb-2 text-[#00ff99] tracking-wide">Medication</div>
                    <select
                        value={medType}
                        onChange={e => setMedType(e.target.value as MedicationType)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white text-xs mb-2"
                    >
                        <option value="analgesic">Analgesic</option>
                        <option value="antibiotic">Antibiotic</option>
                        <option value="stimulant">Stimulant</option>
                        <option value="immunoboost">Immune Boost</option>
                    </select>
                    <button
                        onClick={startMedication}
                        disabled={medActive}
                        className="w-full py-2 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded disabled:opacity-50"
                    >
                        Administer
                    </button>
                </div>

                {/* Status */}
                <div className="absolute bottom-4 right-4 z-10 px-3 py-1 bg-black/60 rounded text-green-400 text-xs pointer-events-auto">
                    {status}
                </div>
            </div>
        </VRSceneProvider>
    );
}

export default MedicalViewportVR;
