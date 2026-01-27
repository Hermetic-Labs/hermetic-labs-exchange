/**
 * EVE OS Medical Viewport v2
 * 
 * Enhanced anatomical visualization with:
 * - L0-L11 layer system (macro body systems → micro quantum)
 * - Medication delivery simulation (oral & topical)
 * - Live data stream visualization
 * - Quantum superposition effects ⭐
 * - Cortex integration for event broadcasting (optional)
 * 
 * Self-contained marketplace module - no @/ imports
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { medicalModelLoader } from './services/ModelLoader';
import type { ModelLoadProgress } from './types/medical-models';
import { VRButtonSlot } from '../../_shared/useVRCapability';

// ============================================================================
// HOST APP INTEGRATION (Optional)
// ============================================================================

/**
 * Interface for host app event broadcasting
 * Modules can optionally integrate with the host's event system
 */
interface CortexEvent {
    id: string;
    type: string;
    thread_id: string;
    timestamp: string;
    data: Record<string, unknown>;
    priority: 'low' | 'normal' | 'high';
    source: string;
    feedback_color?: string;
    metadata?: Record<string, unknown>;
}

interface CortexService {
    broadcastEvent: (event: CortexEvent) => void;
}

// Try to get cortex service from window (injected by host app)
const getCortexService = (): CortexService | null => {
    try {
        // Host app can expose this on window for module integration
        return (window as any).__EVE_CORTEX_SERVICE__ || null;
    } catch {
        return null;
    }
};

// No-op fallback for when cortex is not available
const broadcastEvent = (event: CortexEvent) => {
    const cortex = getCortexService();
    if (cortex) {
        cortex.broadcastEvent(event);
    } else {
        // Log for debugging, but don't break functionality
        console.debug('[MedicalViewport] Event (no cortex):', event.type, event.data);
    }
};

// ============================================================================
// TYPES
// ============================================================================

type LayerMode = 'MACRO' | 'MICRO';
type MedicationType = 'analgesic' | 'antibiotic' | 'stimulant' | 'immunoboost';

interface VitalSigns {
    heartRate: number;
    o2Sat: number;
    temp: number;
    bpSys: number;
    bpDia: number;
}

interface LiveDataStream {
    value: number;
    timestamp: number;
    min: number;
    max: number;
}

interface LayerDefinition {
    name: string;
    color: number;
    effect: string;
    dataKey?: 'cellular' | 'molecular' | 'atomic' | 'quantum';
}

interface MedicationParticle extends THREE.Mesh {
    userData: {
        velocity: THREE.Vector3;
        life: number;
        delay: number;
    };
}

// ============================================================================
// LAYER DEFINITIONS
// ============================================================================

const MACRO_LAYERS: Record<string, LayerDefinition> = {
    L0: { name: 'Outline', color: 0x4488ff, effect: 'glow' },
    L1: { name: 'Skeleton', color: 0xffffff, effect: 'pulse' },
    L2: { name: 'Muscles', color: 0xff4444, effect: 'contract' },
    L3: { name: 'Circulatory', color: 0xff0066, effect: 'flow' },
    L4: { name: 'Nervous', color: 0xffff00, effect: 'spark' },
    L5: { name: 'Respiratory', color: 0x66ffff, effect: 'breathe' },
    L6: { name: 'Digestive', color: 0xff8800, effect: 'peristalsis' },
    L7: { name: 'Immune', color: 0x00ff00, effect: 'swarm' }
};

const MICRO_LAYERS: Record<string, LayerDefinition> = {
    L8: { name: 'Cellular', color: 0x00ff99, effect: 'membrane', dataKey: 'cellular' },
    L9: { name: 'Molecular', color: 0xff66ff, effect: 'bond', dataKey: 'molecular' },
    L10: { name: 'Atomic', color: 0x6666ff, effect: 'orbital', dataKey: 'atomic' },
    L11: { name: 'Quantum', color: 0xff00ff, effect: 'superposition', dataKey: 'quantum' }
};

const MEDICATION_COLORS: Record<MedicationType, number> = {
    analgesic: 0xff6b6b,
    antibiotic: 0x00ff88,
    stimulant: 0xffff00,
    immunoboost: 0x00ffff
};

// ============================================================================
// COMPONENT
// ============================================================================

export function MedicalViewport() {
    // State
    const [currentMode, setCurrentMode] = useState<LayerMode>('MACRO');
    const [currentLayer, setCurrentLayer] = useState('L0');
    const [vitals, setVitals] = useState<VitalSigns>({
        heartRate: 72,
        o2Sat: 98,
        temp: 98.6,
        bpSys: 118,
        bpDia: 76
    });
    const [liveData, setLiveData] = useState<LiveDataStream>(() => ({
        value: 0.5,
        timestamp: Date.now(),
        min: 0.1,
        max: 0.9
    }));
    const [medicationType, setMedicationType] = useState<MedicationType>('analgesic');
    const [medicationActive, setMedicationActive] = useState(false);
    const [topicalTarget, setTopicalTarget] = useState<THREE.Vector3 | null>(null);
    const [statusMessage, setStatusMessage] = useState('READY');

    // Model loading state
    const [detailMode, setDetailMode] = useState<Map<string, boolean>>(new Map());
    const [loadingProgress, setLoadingProgress] = useState<Map<string, ModelLoadProgress>>(new Map());

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        renderer: THREE.WebGLRenderer;
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        controls: OrbitControls;
        macroGroup: THREE.Group;
        microGroup: THREE.Group;
        macroMeshes: Record<string, THREE.Group>;
        microMeshes: Record<string, THREE.Group>;
        medicationParticles: THREE.Group;
        raycaster: THREE.Raycaster;
        mouse: THREE.Vector2;
        animationId: number;
    } | null>(null);

    const medParticlesRef = useRef<MedicationParticle[]>([]);
    const medicationProgressRef = useRef(0);
    const isOralRef = useRef(false);
    const currentLayerRef = useRef(currentLayer);
    const currentModeRef = useRef(currentMode);
    const liveDataRef = useRef(liveData);

    // Keep refs in sync
    useEffect(() => { currentLayerRef.current = currentLayer; }, [currentLayer]);
    useEffect(() => { currentModeRef.current = currentMode; }, [currentMode]);
    useEffect(() => { liveDataRef.current = liveData; }, [liveData]);

    // ============================================================================
    // GEOMETRY CREATION
    // ============================================================================

    const createBodyMesh = useCallback((layerDef: LayerDefinition, index: number): THREE.Group => {
        const group = new THREE.Group();

        const mat = new THREE.MeshStandardMaterial({
            color: layerDef.color,
            transparent: true,
            opacity: 0.75,
            roughness: 0.6,
            metalness: 0.05,
            emissive: layerDef.color,
            emissiveIntensity: 0.1
        });

        // HEAD - More anatomical proportions
        const headGeo = new THREE.SphereGeometry(0.14, 20, 20);
        headGeo.scale(1, 1.15, 0.95); // Slightly elongated and narrowed
        const head = new THREE.Mesh(headGeo, mat.clone());
        head.position.set(0, 1.65, 0);
        head.userData.isHead = true; // For oral medication
        group.add(head);

        // NECK
        const neckGeo = new THREE.CylinderGeometry(0.06, 0.075, 0.15, 12);
        const neck = new THREE.Mesh(neckGeo, mat.clone());
        neck.position.set(0, 1.52, 0);
        group.add(neck);

        // TORSO - Better shaped with capsule
        const upperTorsoGeo = new THREE.CapsuleGeometry(0.2, 0.35, 12, 20);
        const upperTorso = new THREE.Mesh(upperTorsoGeo, mat.clone());
        upperTorso.position.set(0, 1.2, 0);
        group.add(upperTorso);

        const lowerTorsoGeo = new THREE.CapsuleGeometry(0.18, 0.25, 12, 20);
        const lowerTorso = new THREE.Mesh(lowerTorsoGeo, mat.clone());
        lowerTorso.position.set(0, 0.85, 0);
        group.add(lowerTorso);

        // SHOULDERS
        const shoulderGeo = new THREE.SphereGeometry(0.08, 14, 14);
        [-0.27, 0.27].forEach(x => {
            const shoulder = new THREE.Mesh(shoulderGeo, mat.clone());
            shoulder.position.set(x, 1.4, 0);
            group.add(shoulder);
        });

        // ARMS - Using capsules for better look
        const upperArmGeo = new THREE.CapsuleGeometry(0.045, 0.28, 8, 16);
        const lowerArmGeo = new THREE.CapsuleGeometry(0.04, 0.26, 8, 16);

        [-1, 1].forEach(side => {
            // Upper arm
            const upperArm = new THREE.Mesh(upperArmGeo, mat.clone());
            upperArm.position.set(side * 0.27, 1.15, 0);
            upperArm.rotation.z = side * -0.05;
            group.add(upperArm);

            // Elbow joint
            const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), mat.clone());
            elbow.position.set(side * 0.27, 0.95, 0);
            group.add(elbow);

            // Lower arm
            const lowerArm = new THREE.Mesh(lowerArmGeo, mat.clone());
            lowerArm.position.set(side * 0.27, 0.74, 0);
            group.add(lowerArm);

            // Hand (simplified)
            const handGeo = new THREE.BoxGeometry(0.07, 0.11, 0.04);
            handGeo.translate(0, -0.055, 0);
            const hand = new THREE.Mesh(handGeo, mat.clone());
            hand.position.set(side * 0.27, 0.57, 0);
            group.add(hand);
        });

        // PELVIS
        const pelvisGeo = new THREE.BoxGeometry(0.32, 0.16, 0.22);
        const pelvis = new THREE.Mesh(pelvisGeo, mat.clone());
        pelvis.position.set(0, 0.68, 0);
        group.add(pelvis);

        // LEGS - Better proportions with capsules
        const upperLegGeo = new THREE.CapsuleGeometry(0.065, 0.42, 10, 16);
        const lowerLegGeo = new THREE.CapsuleGeometry(0.055, 0.4, 10, 16);

        [-1, 1].forEach(side => {
            // Upper leg (thigh)
            const upperLeg = new THREE.Mesh(upperLegGeo, mat.clone());
            upperLeg.position.set(side * 0.11, 0.38, 0);
            group.add(upperLeg);

            // Knee joint
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), mat.clone());
            knee.position.set(side * 0.11, 0.12, 0);
            group.add(knee);

            // Lower leg (calf)
            const lowerLeg = new THREE.Mesh(lowerLegGeo, mat.clone());
            lowerLeg.position.set(side * 0.11, -0.13, 0);
            group.add(lowerLeg);

            // Foot
            const footGeo = new THREE.BoxGeometry(0.09, 0.06, 0.2);
            footGeo.translate(0, -0.03, 0.05);
            const foot = new THREE.Mesh(footGeo, mat.clone());
            foot.position.set(side * 0.11, -0.38, 0);
            group.add(foot);
        });

        group.userData = { layerDef, meshes: group.children, animState: 0 };
        return group;
    }, []);

    const createMicroVis = useCallback((layerDef: LayerDefinition, index: number): THREE.Group => {
        const group = new THREE.Group();
        const count = 50 + index * 20;

        for (let i = 0; i < count; i++) {
            let geo: THREE.BufferGeometry;

            switch (layerDef.effect) {
                case 'membrane':
                    geo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 8, 8);
                    break;
                case 'bond':
                    geo = new THREE.OctahedronGeometry(0.1 + Math.random() * 0.05);
                    break;
                case 'orbital':
                    geo = new THREE.TorusGeometry(0.1, 0.02, 8, 16);
                    break;
                case 'superposition':
                    geo = new THREE.TetrahedronGeometry(0.08);
                    break;
                default:
                    geo = new THREE.SphereGeometry(0.1, 8, 8);
            }

            const mat = new THREE.MeshStandardMaterial({
                color: layerDef.color,
                transparent: true,
                opacity: 0.6,
                emissive: layerDef.color,
                emissiveIntensity: 0.2
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4
            );
            mesh.userData.basePos = mesh.position.clone();
            mesh.userData.phase = Math.random() * Math.PI * 2;
            group.add(mesh);
        }

        group.userData = { layerDef, animState: 0 };
        return group;
    }, []);

    const createMedParticles = useCallback((
        count: number,
        startPos: THREE.Vector3,
        color: number
    ): MedicationParticle[] => {
        const geo = new THREE.SphereGeometry(0.03, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });

        const particles: MedicationParticle[] = [];
        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(geo, mat.clone()) as unknown as MedicationParticle;
            p.position.copy(startPos);
            p.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.02,
                    -0.01 - Math.random() * 0.02,
                    (Math.random() - 0.5) * 0.02
                ),
                life: 1,
                delay: i * 0.05
            };
            sceneRef.current?.medicationParticles.add(p);
            particles.push(p);
        }
        return particles;
    }, []);

    // ============================================================================
    // ANIMATION FUNCTIONS
    // ============================================================================

    const animateLayer = useCallback((
        group: THREE.Group,
        delta: number,
        layerDef: LayerDefinition
    ) => {
        const t = performance.now() * 0.001;
        const data = liveDataRef.current;

        switch (layerDef.effect) {
            case 'glow':
                group.children.forEach(m => {
                    if ((m as THREE.Mesh).material) {
                        ((m as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity =
                            0.1 + Math.sin(t * 2) * 0.1;
                    }
                });
                break;

            case 'pulse':
                const scale = 1 + Math.sin(t * 3) * 0.02;
                group.scale.setScalar(scale);
                break;

            case 'flow': // Circulatory - med flows here
                group.children.forEach((m, i) => {
                    if ((m as THREE.Mesh).material) {
                        ((m as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity =
                            0.5 + Math.sin(t * 4 + i) * 0.3;
                    }
                });
                break;

            case 'spark': // Nervous - electrical
                group.children.forEach(m => {
                    if ((m as THREE.Mesh).material) {
                        const spark = Math.random() > 0.95 ? 1 : 0.3;
                        ((m as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = spark;
                    }
                });
                break;

            case 'breathe':
                const breathe = 1 + Math.sin(t * 1.5) * 0.05;
                group.scale.set(breathe, 1, breathe);
                break;

            case 'swarm': // Immune
                group.rotation.y += 0.002;
                break;

            // MICRO LAYERS - data-driven
            case 'membrane':
                group.children.forEach(m => {
                    const mesh = m as THREE.Mesh;
                    const base = mesh.userData.basePos;
                    const phase = mesh.userData.phase;
                    const amp = data.value * 0.5;
                    mesh.position.x = base.x + Math.sin(t + phase) * amp;
                    mesh.position.y = base.y + Math.cos(t * 1.3 + phase) * amp;
                    (mesh.material as THREE.MeshStandardMaterial).opacity = 0.3 + data.value * 0.5;
                });
                break;

            case 'bond':
                group.children.forEach(m => {
                    const mesh = m as THREE.Mesh;
                    mesh.rotation.x += data.value * 0.05;
                    mesh.rotation.y += data.value * 0.03;
                    const s = 0.8 + data.value * 0.4;
                    mesh.scale.setScalar(s);
                });
                break;

            case 'orbital':
                group.children.forEach(m => {
                    const mesh = m as THREE.Mesh;
                    const base = mesh.userData.basePos;
                    const phase = mesh.userData.phase;
                    const radius = 0.5 + data.value * 2;
                    mesh.position.x = base.x + Math.cos(t * 2 + phase) * radius * 0.3;
                    mesh.position.z = base.z + Math.sin(t * 2 + phase) * radius * 0.3;
                    mesh.rotation.x = t * data.value * 3;
                });
                break;

            case 'superposition': // ⭐ QUANTUM - THE EXCITING ONE ⭐
                group.children.forEach(m => {
                    const mesh = m as THREE.Mesh;
                    const mat = mesh.material as THREE.MeshStandardMaterial;
                    const phase = mesh.userData.phase;
                    const uncertainty = (1 - data.value) * 2; // Higher uncertainty at low values

                    // Position uncertainty (Heisenberg)
                    mesh.position.x = mesh.userData.basePos.x + (Math.random() - 0.5) * uncertainty;
                    mesh.position.y = mesh.userData.basePos.y + (Math.random() - 0.5) * uncertainty;
                    mesh.position.z = mesh.userData.basePos.z + (Math.random() - 0.5) * uncertainty;

                    // Phase rotation
                    mesh.rotation.x += data.value * 0.1;
                    mesh.rotation.y += (1 - data.value) * 0.1;

                    // Color shift based on data (quantum state)
                    const hue = (data.value * 0.3 + 0.8) % 1;
                    mat.color.setHSL(hue, 1, 0.5);
                    mat.emissive.setHSL(hue, 1, 0.3);
                    mat.emissiveIntensity = 0.3 + Math.sin(t * 5 + phase) * 0.2;

                    // Opacity fluctuation (wave function collapse visualization)
                    mat.opacity = 0.3 + Math.abs(Math.sin(t * 3 + phase * data.value)) * 0.5;
                });
                break;
        }
    }, []);

    // Medication particle physics
    const updateMedication = useCallback((delta: number) => {
        if (!medicationActive) return;

        medicationProgressRef.current += delta;
        const progress = medicationProgressRef.current;

        medParticlesRef.current.forEach((p, i) => {
            if (progress < p.userData.delay) return;

            p.userData.life -= delta * 0.15;

            if (isOralRef.current) {
                // Flow downward then outward (circulatory spread)
                if (progress < 2) {
                    p.position.y -= 0.02;
                } else {
                    p.userData.velocity.x += (Math.random() - 0.5) * 0.01;
                    p.userData.velocity.z += (Math.random() - 0.5) * 0.01;
                }
            } else {
                // Topical: stay local, spread slowly
                p.userData.velocity.multiplyScalar(0.98);
            }

            p.position.add(p.userData.velocity);
            (p.material as THREE.Material).opacity = p.userData.life * 0.8;

            if (p.userData.life <= 0) {
                sceneRef.current?.medicationParticles.remove(p);
            }
        });

        medParticlesRef.current = medParticlesRef.current.filter(p => p.userData.life > 0);

        if (medParticlesRef.current.length === 0) {
            setMedicationActive(false);
            setStatusMessage('✓ Medication absorbed');
        }
    }, [medicationActive]);

    // Live data simulation (replace with WebSocket)
    const updateLiveData = useCallback(() => {
        const t = Date.now() * 0.001;
        const raw = (Math.sin(t * 0.7) + Math.sin(t * 1.3) + Math.sin(t * 2.1)) / 3;
        const normalized = (raw + 1) / 2; // 0-1
        const value = liveData.min + normalized * (liveData.max - liveData.min);

        setLiveData(prev => ({
            ...prev,
            value,
            timestamp: Date.now()
        }));
    }, [liveData.min, liveData.max]);

    // Camera animation
    const animateCameraTo = useCallback((
        target: THREE.Vector3,
        onComplete?: () => void
    ) => {
        if (!sceneRef.current) return;

        const camera = sceneRef.current.camera;
        const start = camera.position.clone();
        const startTime = performance.now();
        const duration = 1200;

        function step() {
            const t = Math.min((performance.now() - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            camera.position.lerpVectors(start, target, ease);
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                onComplete?.();
            }
        }
        step();
    }, []);

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================

    const showLayer = useCallback((id: string) => {
        if (!sceneRef.current) return;

        setCurrentLayer(id);
        const isMicro = MICRO_LAYERS[id] !== undefined;

        const { macroGroup, microGroup, macroMeshes, microMeshes } = sceneRef.current;

        if (isMicro && currentModeRef.current === 'MACRO') {
            setCurrentMode('MICRO');
            animateCameraTo(new THREE.Vector3(0, 0, 3), () => {
                macroGroup.visible = false;
                microGroup.visible = true;
            });
        } else if (!isMicro && currentModeRef.current === 'MICRO') {
            setCurrentMode('MACRO');
            animateCameraTo(new THREE.Vector3(0, 1, 7), () => {
                microGroup.visible = false;
                macroGroup.visible = true;
            });
        }

        if (isMicro) {
            for (const k in microMeshes) microMeshes[k].visible = (k === id);
        } else {
            for (const k in macroMeshes) macroMeshes[k].visible = (k === id);
        }

        // Cortex integration - broadcast layer change (optional)
        broadcastEvent({
            id: `layer_${Date.now()}`,
            type: 'layer_change',
            thread_id: 'medical-viz',
            timestamp: new Date().toISOString(),
            data: { layer: id, mode: isMicro ? 'MICRO' : 'MACRO' },
            priority: 'normal',
            source: 'visualization',
            feedback_color: 'blue',
            metadata: { cortex_type: 'medical' }
        });
    }, [animateCameraTo]);

    // Toggle detail mode for a specific layer (load/unload high-fidelity models)
    const toggleDetailMode = useCallback(async (layerId: string) => {
        const currentDetail = detailMode.get(layerId) || false;
        const newDetailMode = !currentDetail;

        setDetailMode(new Map(detailMode.set(layerId, newDetailMode)));

        if (newDetailMode) {
            // Load high-fidelity model
            if (!medicalModelLoader.hasModel(layerId)) {
                setStatusMessage(`No detail model available for ${layerId}`);
                return;
            }

            setStatusMessage(`Loading detail model for ${layerId}...`);

            const model = await medicalModelLoader.loadModel(
                layerId,
                (progress) => {
                    setLoadingProgress(new Map(loadingProgress.set(layerId, progress)));
                    setStatusMessage(`Loading ${layerId}: ${progress.percentage.toFixed(0)}%`);
                }
            );

            if (model && sceneRef.current) {
                // Replace procedural geometry with loaded model
                const { macroMeshes } = sceneRef.current;
                const currentMesh = macroMeshes[layerId];

                if (currentMesh) {
                    const wasVisible = currentMesh.visible;
                    currentMesh.visible = false;

                    // Position and scale the loaded model to match viewport
                    model.position.set(0, 0, 0);
                    model.scale.set(1, 1, 1);

                    // Store reference to loaded model
                    currentMesh.userData.detailModel = model;
                    currentMesh.parent?.add(model);
                    model.visible = wasVisible;

                    const metadata = medicalModelLoader.getModelMetadata(layerId);
                    setStatusMessage(`✓ ${metadata?.modelName || layerId} loaded (Detail Mode)`);
                }
            } else {
                setStatusMessage(`Failed to load detail model for ${layerId}`);
                setDetailMode(new Map(detailMode.set(layerId, false)));
            }
        } else {
            // Unload high-fidelity model, revert to procedural
            if (sceneRef.current) {
                const { macroMeshes } = sceneRef.current;
                const currentMesh = macroMeshes[layerId];

                if (currentMesh && currentMesh.userData.detailModel) {
                    const detailModel = currentMesh.userData.detailModel as THREE.Group;
                    currentMesh.parent?.remove(detailModel);
                    currentMesh.visible = true;
                    delete currentMesh.userData.detailModel;
                }
            }

            medicalModelLoader.unloadModel(layerId);
            setStatusMessage(`${layerId} reverted to procedural geometry`);
        }
    }, [detailMode, loadingProgress]);


    const startMedication = useCallback((oral: boolean) => {
        if (medicationActive) return;

        setMedicationActive(true);
        isOralRef.current = oral;
        medicationProgressRef.current = 0;

        const color = MEDICATION_COLORS[medicationType];
        const startPos = oral
            ? new THREE.Vector3(0, 1.5, 0.3) // Mouth
            : (topicalTarget || new THREE.Vector3(0.5, 0.7, 0.4)); // Arm or clicked

        medParticlesRef.current = createMedParticles(oral ? 100 : 50, startPos, color);

        setStatusMessage(oral
            ? '💊 ORAL: Entering digestive → circulatory system...'
            : '✋ TOPICAL: Local tissue absorption...'
        );

        // Auto layer transitions for oral
        if (oral) {
            setTimeout(() => showLayer('L6'), 1000); // Digestive
            setTimeout(() => showLayer('L3'), 3000); // Circulatory
            setTimeout(() => showLayer('L0'), 6000); // Back to outline
        }
    }, [medicationActive, medicationType, topicalTarget, createMedParticles, showLayer]);

    const handleCanvasClick = useCallback((event: MouseEvent) => {
        if (!sceneRef.current) return;

        const { raycaster, mouse, camera, macroGroup } = sceneRef.current;
        const rect = (event.target as HTMLElement).getBoundingClientRect();

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(macroGroup.children, true);

        if (intersects.length > 0) {
            setTopicalTarget(intersects[0].point.clone());
            setStatusMessage(`📍 Topical target set: ${intersects[0].point.x.toFixed(2)}, ${intersects[0].point.y.toFixed(2)}`);
        }
    }, []);

    // ============================================================================
    // THREE.JS INITIALIZATION
    // ============================================================================

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020208);

        // Camera
        const camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            4000
        );
        camera.position.set(0, 1, 7);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // Lighting
        scene.add(new THREE.HemisphereLight(0x88bbff, 0x223344, 0.5));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1);
        keyLight.position.set(4, 8, 6);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x66ccff, 0.4);
        rimLight.position.set(-6, 4, -4);
        scene.add(rimLight);

        // Groups
        const macroGroup = new THREE.Group();
        const microGroup = new THREE.Group();
        microGroup.visible = false;
        scene.add(macroGroup);
        scene.add(microGroup);

        // Medication particles
        const medicationParticles = new THREE.Group();
        scene.add(medicationParticles);

        // Raycaster
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Build layers
        const macroMeshes: Record<string, THREE.Group> = {};
        const microMeshes: Record<string, THREE.Group> = {};

        Object.entries(MACRO_LAYERS).forEach(([id, def], i) => {
            const mesh = createBodyMesh(def, i);
            mesh.visible = false;
            macroGroup.add(mesh);
            macroMeshes[id] = mesh;
        });

        Object.entries(MICRO_LAYERS).forEach(([id, def], i) => {
            const mesh = createMicroVis(def, i);
            mesh.visible = false;
            microGroup.add(mesh);
            microMeshes[id] = mesh;
        });

        // Show initial layer
        macroMeshes['L0'].visible = true;

        // Store refs
        sceneRef.current = {
            renderer,
            scene,
            camera,
            controls,
            macroGroup,
            microGroup,
            macroMeshes,
            microMeshes,
            medicationParticles,
            raycaster,
            mouse,
            animationId: 0
        };

        // Animation loop with disposed check to prevent WebGL uniform errors
        let lastTime = performance.now();
        let isDisposed = false;

        function animate() {
            // Stop if disposed - prevents WebGL uniform errors during cleanup
            if (isDisposed || !sceneRef.current) return;

            const { controls, renderer, scene, camera, macroMeshes, microMeshes } = sceneRef.current;

            // Guard against lost WebGL context or disposed renderer
            if (!renderer.domElement || renderer.getContext().isContextLost()) return;

            sceneRef.current.animationId = requestAnimationFrame(animate);

            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;
            const mode = currentModeRef.current;
            const layer = currentLayerRef.current;

            controls.update();
            updateLiveData();
            updateMedication(delta);

            // Animate current layer
            if (mode === 'MACRO' && macroMeshes[layer]) {
                animateLayer(macroMeshes[layer], delta, MACRO_LAYERS[layer]);
            } else if (mode === 'MICRO' && microMeshes[layer]) {
                animateLayer(microMeshes[layer], delta, MICRO_LAYERS[layer]);
            }

            renderer.render(scene, camera);
        }
        animate();

        // Event listeners
        renderer.domElement.addEventListener('click', handleCanvasClick);

        const handleResize = () => {
            if (!sceneRef.current || !container) return;
            const { camera, renderer } = sceneRef.current as any;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            // CRITICAL: Set disposed flag FIRST to stop animation loop
            isDisposed = true;

            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('click', handleCanvasClick);

            if (sceneRef.current) {
                cancelAnimationFrame(sceneRef.current.animationId);

                // Dispose all materials and geometries in the scene
                sceneRef.current.scene.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        if (object.geometry) {
                            object.geometry.dispose();
                        }
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(mat => mat.dispose());
                            } else {
                                object.material.dispose();
                            }
                        }
                    }
                });

                // Clear the scene
                sceneRef.current.scene.clear();

                // Dispose controls and renderer to prevent WebGL uniform errors on HMR
                sceneRef.current.controls.dispose();
                renderer.dispose();
                renderer.forceContextLoss();

                if (container && renderer.domElement && container.contains(renderer.domElement)) {
                    container.removeChild(renderer.domElement);
                }
            }
            sceneRef.current = null;
        };
    }, [createBodyMesh, createMicroVis, animateLayer, updateLiveData, updateMedication, handleCanvasClick]);

    // Vitals simulation
    useEffect(() => {
        const interval = setInterval(() => {
            setVitals(prev => ({
                heartRate: Math.round(prev.heartRate + (Math.random() * 4 - 2)),
                o2Sat: Math.round(Math.min(100, Math.max(95, prev.o2Sat + (Math.random() * 2 - 1)))),
                temp: parseFloat((prev.temp + (Math.random() * 0.2 - 0.1)).toFixed(1)),
                bpSys: Math.round(prev.bpSys + (Math.random() * 4 - 2)),
                bpDia: Math.round(prev.bpDia + (Math.random() * 2 - 1))
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    // ============================================================================
    // RENDER
    // ============================================================================

    return (
        <div className="medical-viewport h-full w-full relative bg-black overflow-hidden">
            {/* VR Button - Shows if vr-spatial-engine is installed, or prompts to install */}
            <div className="absolute top-3 right-4 z-20">
                <VRButtonSlot
                    viewId="medical-viewport"
                    size="md"
                    variant="default"
                    onNotInstalled={() => {
                        console.log('[MedicalViewport] VR module not installed, prompting marketplace');
                    }}
                />
            </div>

            {/* Vitals Header */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-5 py-2 bg-[rgba(0,25,0,0.9)] rounded-lg border border-[#00ff99] text-[#00ff99] text-sm tracking-wide shadow-[0_0_6px_#00ff99]">
                HR: {vitals.heartRate} bpm | O₂: {vitals.o2Sat}% | TEMP: {vitals.temp}°F | BP: {vitals.bpSys}/{vitals.bpDia}
            </div>

            {/* Layer Panel */}
            <div className="absolute top-16 left-4 z-10 w-48 bg-black/85 backdrop-blur-md rounded-lg p-3 text-white text-xs border border-[rgba(0,255,153,0.3)]">
                <div className="text-[10px] uppercase opacity-70 mb-2 text-[#00ff99] tracking-wide">🏥 Body Systems</div>
                {Object.entries(MACRO_LAYERS).map(([id, def]) => {
                    const hasDetailModel = medicalModelLoader.hasModel(id);
                    const isDetailMode = detailMode.get(id) || false;
                    const progress = loadingProgress.get(id);

                    return (
                        <div key={id} className="my-1">
                            <div
                                onClick={() => showLayer(id)}
                                className={`px-3 py-1.5 rounded cursor-pointer transition-all text-xs flex items-center justify-between border-l-[3px] ${currentLayer === id
                                    ? 'bg-[rgba(0,180,255,0.8)] shadow-[0_0_10px_rgba(0,180,255,0.5)]'
                                    : 'bg-white/10 hover:bg-white/20'
                                    }`}
                                data-layer-color={def.color.toString(16).padStart(6, '0')}
                            >
                                <span>{id} – {def.name}</span>
                                {hasDetailModel && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleDetailMode(id);
                                        }}
                                        className={`ml-2 px-2 py-0.5 rounded text-[9px] font-bold transition-all ${isDetailMode
                                            ? 'bg-green-600/80 text-white'
                                            : 'bg-white/20 text-white/70 hover:bg-white/30'
                                            }`}
                                        title={isDetailMode ? 'Unload 3D Model' : 'Load High-Fidelity Model'}
                                    >
                                        {progress?.status === 'loading' ? `${progress.percentage.toFixed(0)}%` : isDetailMode ? '3D' : 'Detail'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                <div className="text-[10px] uppercase opacity-70 mb-2 mt-4 text-[#00ff99] tracking-wide">🔬 Micro Layers</div>
                {Object.entries(MICRO_LAYERS).map(([id, def]) => (
                    <div
                        key={id}
                        onClick={() => showLayer(id)}
                        className={`px-3 py-1.5 my-1 rounded cursor-pointer transition-all text-xs border-l-[3px] ${currentLayer === id
                            ? 'bg-[rgba(0,180,255,0.8)] shadow-[0_0_10px_rgba(0,180,255,0.5)]'
                            : 'bg-white/10 hover:bg-white/20'
                            }`}
                        data-layer-color={def.color.toString(16).padStart(6, '0')}
                    >
                        {id} – {def.name}
                    </div>
                ))}
            </div>

            {/* Medication Panel */}
            <div className="absolute top-16 right-4 z-10 w-52 bg-black/85 backdrop-blur-md rounded-lg p-3 text-white text-xs border border-[rgba(0,180,255,0.3)]">
                <div className="text-[10px] uppercase opacity-70 mb-2 text-[#00ff99] tracking-wide">💊 Medication Delivery</div>
                <select
                    value={medicationType}
                    onChange={(e) => setMedicationType(e.target.value as MedicationType)}
                    className="w-full p-2 bg-white/10 border border-white/20 rounded text-white text-xs mb-2"
                    title="Select medication type"
                    aria-label="Medication type selector"
                >
                    <option value="analgesic">Analgesic (Pain Relief)</option>
                    <option value="antibiotic">Antibiotic</option>
                    <option value="stimulant">Neural Stimulant</option>
                    <option value="immunoboost">Immune Booster</option>
                </select>
                <button
                    onClick={() => startMedication(true)}
                    disabled={medicationActive}
                    className="w-full py-2.5 mb-2 border-none rounded-md cursor-pointer text-xs font-semibold transition-all bg-gradient-to-br from-[#ff6b6b] to-[#ee5a24] text-white hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    ⬇ Oral Administration
                </button>
                <button
                    onClick={() => startMedication(false)}
                    disabled={medicationActive}
                    className="w-full py-2.5 border-none rounded-md cursor-pointer text-xs font-semibold transition-all bg-gradient-to-br from-[#00d2d3] to-[#01a3a4] text-white hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    ✋ Topical Application
                </button>
                <div className="mt-2 text-[10px] opacity-60">
                    Click body location for topical target
                </div>
            </div>

            {/* Live Data Panel */}
            <div className="absolute bottom-5 left-4 z-10 w-72 bg-black/85 backdrop-blur-md rounded-lg p-3 text-white text-xs border border-[rgba(255,100,200,0.3)]">
                <div className="text-[10px] uppercase opacity-70 mb-2 text-[#00ff99] tracking-wide">📊 Live Data Stream</div>
                <div className="flex gap-2 my-2 items-center">
                    <label className="text-[10px] opacity-70 min-w-[35px]">MIN</label>
                    <input
                        type="number"
                        value={liveData.min}
                        onChange={(e) => setLiveData(prev => ({ ...prev, min: parseFloat(e.target.value) || 0 }))}
                        step="0.01"
                        min="0"
                        max="1"
                        className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-xs w-16"
                        title="Minimum value"
                        placeholder="0.00"
                        aria-label="Minimum data value"
                    />
                    <label className="text-[10px] opacity-70 min-w-[35px]">MAX</label>
                    <input
                        type="number"
                        value={liveData.max}
                        onChange={(e) => setLiveData(prev => ({ ...prev, max: parseFloat(e.target.value) || 1 }))}
                        step="0.01"
                        min="0"
                        max="1"
                        className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-xs w-16"
                        title="Maximum value"
                        placeholder="1.00"
                        aria-label="Maximum data value"
                    />
                </div>
                <div
                    className="text-2xl font-bold text-center py-2.5 bg-[rgba(255,100,200,0.1)] rounded-lg my-2.5 font-mono text-[hsl(320,100%,70%)]"
                >
                    {liveData.value.toFixed(4)}
                </div>
                <div className="text-[10px] opacity-60 text-center">
                    Simulated field data (cellular/atomic/quantum)
                </div>
            </div>

            {/* Status Bar */}
            <div className="absolute bottom-5 right-4 z-10 bg-black/80 px-4 py-2 rounded-lg text-[#00ff99] text-xs">
                {statusMessage}
            </div>

            {/* Three.js Container */}
            <div ref={containerRef} className="absolute inset-0" />
        </div>
    );
}

export default MedicalViewport;
