/**
 * VRMCompanion - Main component for the VRM Companion module
 *
 * Features:
 * - 3D VRM avatar rendering with Three.js
 * - Lip sync driven by phoneme timeline or audio amplitude
 * - Configurable controls for smoothing, gain, and mouth limits
 * - Mic input support for real-time lip sync
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
// UltraHDRLoader for .hdr.jpg files (when available)
// import { UltraHDRLoader } from 'three/examples/jsm/loaders/UltraHDRLoader.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import LipSyncService, { VisemeKey } from './LipSyncService';
import { AnimationService } from './mesh/animations';
import { VRButtonSlot } from '../../_shared/useVRCapability';

// Default model URL - served by the backend's asset route when module is installed
// This path is resolved at runtime via the /marketplace/modules/vrm-companion/assets/... endpoint
const DEFAULT_MODEL_PATH = '/marketplace/modules/vrm-companion/assets/models/VRoid/SampleAvatar/SampleAvatar.vrm';

import {
    onStateChange,
    getAudioElement,
    getAnalyser,
    type TTSState,
    speak, // Dynamic import requires this to be available in core.d.ts
    // stop // Assuming stop is also exported if needed
} from '@/services/ttsService';



// Golden ratio for natural timing
const PHI = 1.618033988749895;
const BLINK_MIN_INTERVAL = 12.0;  // Minimum seconds between blinks
const BLINK_MAX_INTERVAL = 20.0;  // Maximum seconds between blinks
const BLINK_DURATION = 0.25;      // Duration of a single blink (down + up) - slower

/**
 * Easing function using golden ratio for natural, organic movement.
 * Creates an asymmetric curve: fast close, slower open (like real blinks).
 */
const goldenEase = (t: number): number => {
    // Use golden ratio to create asymmetric ease
    // Fast down (first 38.2%), slower up (remaining 61.8%)
    const splitPoint = 1 / PHI;  // ~0.618
    if (t < splitPoint) {
        // Closing phase - ease out (fast start, slow end)
        const normalizedT = t / splitPoint;
        return Math.sin(normalizedT * Math.PI / 2);
    } else {
        // Opening phase - ease in (slow start, fast end)
        const normalizedT = (t - splitPoint) / (1 - splitPoint);
        return Math.cos(normalizedT * Math.PI / 2);
    }
};

/**
 * Get random blink interval using golden ratio distribution.
 * Creates more natural, non-uniform timing.
 */
const getNextBlinkInterval = (): number => {
    // Use golden ratio to weight toward middle of range
    const rand = Math.random();
    const weighted = Math.pow(rand, 1 / PHI);  // Bias toward middle values
    return BLINK_MIN_INTERVAL + weighted * (BLINK_MAX_INTERVAL - BLINK_MIN_INTERVAL);
};

/**
 * Split IPA phoneme string into individual phonemes.
 * Handles multi-character phonemes like diphthongs (aɪ, eɪ), long vowels (ɜː, iː),
 * and affricates (tʃ, dʒ).
 */
const splitIPAIntoPhonemes = (ipaString: string): string[] => {
    const phonemes: string[] = [];

    // Multi-character phonemes to check first (order matters - longest first)
    const multiChar = [
        // Affricates
        'tʃ', 'dʒ', 'ʤ', 'ʧ',
        // Diphthongs
        'aɪ', 'aʊ', 'eɪ', 'oʊ', 'ɔɪ', 'ɪə', 'eə', 'ʊə',
        // Long vowels
        'ɜː', 'ɑː', 'ɔː', 'iː', 'uː', 'ɛː', 'æː',
        // R-colored vowels
        'ɝː', 'ɚ', 'ɝ',
        // Nasalized vowels
        'ɑ̃', 'ɛ̃', 'ɔ̃',
    ];

    let i = 0;
    const chars = [...ipaString]; // Handle Unicode properly

    while (i < chars.length) {
        const char = chars[i];

        // Skip whitespace and punctuation
        if (/[\s.,!?;:'"()-]/.test(char)) {
            i++;
            continue;
        }

        // Check for multi-character phonemes
        let found = false;
        for (const multi of multiChar) {
            const slice = chars.slice(i, i + [...multi].length).join('');
            if (slice === multi) {
                phonemes.push(multi);
                i += [...multi].length;
                found = true;
                break;
            }
        }

        if (!found) {
            // Check if next char is a length marker or diacritic that should attach
            const nextChar = chars[i + 1];
            if (nextChar && /[ː̩̃ˈˌ]/.test(nextChar)) {
                phonemes.push(char + nextChar);
                i += 2;
            } else {
                phonemes.push(char);
                i++;
            }
        }
    }

    return phonemes;
};

/**
 * Get estimated duration weight for a phoneme based on its type.
 * Returns a multiplier relative to average duration.
 */
const getPhonemeDuration = (phoneme: string): number => {
    // Long vowels (with ː)
    if (/ː$/.test(phoneme)) return 1.4;

    // Diphthongs (two vowel sounds)
    if (/^(eɪ|aɪ|ɔɪ|aʊ|oʊ|ɪə|eə|ʊə)$/.test(phoneme)) return 1.3;

    // Regular vowels
    if (/^[ɑɔuieɛoaəɪʊʌɜɝæ]$/.test(phoneme)) return 1.0;

    // Plosives/stops (very short)
    if (/^[bpdtkgɡʔ]$/.test(phoneme)) return 0.3;

    // Affricates
    if (/^(tʃ|dʒ|ʤ|ʧ)$/.test(phoneme)) return 0.5;

    // Fricatives
    if (/^[fvszʃʒθðhx]$/.test(phoneme)) return 0.6;

    // Nasals
    if (/^[mnŋ]$/.test(phoneme)) return 0.7;

    // Liquids and glides
    if (/^[lɹrwj]$/.test(phoneme)) return 0.6;

    // Default
    return 0.5;
};



interface VRMCompanionProps {
    /** Custom model URL (VRM, GLB, or FBX) */
    modelUrl?: string;
    /** @deprecated Use modelUrl instead */
    vrmUrl?: string;
    /** Reference to external audio element for TTS integration */
    ttsAudioRef?: React.RefObject<HTMLAudioElement>;
    /** Callback when avatar speaks */
    onSpeakRequest?: (text: string) => void;
    /** Container className */
    className?: string;
}

export const VRMCompanion: React.FC<VRMCompanionProps> = ({
    modelUrl,
    vrmUrl,
    ttsAudioRef,
    onSpeakRequest,
    className = '',
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const vrmRef = useRef<VRM | null>(null);
    const fbxModelRef = useRef<THREE.Group | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const lipSyncRef = useRef<LipSyncService | null>(null);
    const clockRef = useRef<THREE.Clock>(new THREE.Clock());
    const animationServiceRef = useRef<AnimationService | null>(null);

    const [availableModels, setAvailableModels] = useState<{ name: string; url: string }[]>([]);
    const [selectedModelUrl, setSelectedModelUrl] = useState(modelUrl || '');
    const activeModelUrl = vrmUrl || selectedModelUrl;
    const [modelLoaded, setModelLoaded] = useState(false);
    // Keep vrmLoaded for backward compatibility
    const vrmLoaded = modelLoaded;
    const [status, setStatus] = useState<string>('Initializing...');
    const [phonemeError, setPhonemeError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMicActive, setIsMicActive] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [amplitudeMode, setAmplitudeMode] = useState(false);
    const [physicsEnabled, setPhysicsEnabled] = useState(false);
    const [smoothing, setSmoothing] = useState(0.3);
    const [gain, setGain] = useState(2.0);
    const [maxMouthOpen, setMaxMouthOpen] = useState(0.8);
    const [jawAmplitude, setJawAmplitude] = useState(0.5);
    const [visemeWeights, setVisemeWeights] = useState<Record<VisemeKey, number>>({
        aa: 0, ih: 0, ou: 0, ee: 0, oh: 0
    });
    const [availableExpressions, setAvailableExpressions] = useState<string[]>([]);
    const [availableAnimations, setAvailableAnimations] = useState<string[]>([]);
    const [currentAnimationIndex, setCurrentAnimationIndex] = useState<number>(-1);
    const [meshList, setMeshList] = useState<{ name: string; mesh: THREE.Mesh; visible: boolean }[]>([]);
    const [blinkEnabled, setBlinkEnabled] = useState(true);
    const [headTrackingEnabled, setHeadTrackingEnabled] = useState(true);
    const [idleAnimationEnabled, setIdleAnimationEnabled] = useState(true);
    const [speakingAnimationEnabled, setSpeakingAnimationEnabled] = useState(true);
    const [idleIntensity, setIdleIntensity] = useState(0.3);
    const [speakingIntensity, setSpeakingIntensity] = useState(0.5);
    const [lightIntensity, setLightIntensity] = useState(1.0);
    const [vrHandIKEnabled, setVrHandIKEnabled] = useState(false);

    // Environment/HDRI state
    const [availableEnvironments, setAvailableEnvironments] = useState<{ name: string; url: string; projection: string; type: string }[]>([]);
    const [selectedEnvironmentUrl, setSelectedEnvironmentUrl] = useState('__procedural_studio__');
    const pmremGeneratorRef = useRef<THREE.PMREMGenerator | null>(null);
    const envSkyboxRef = useRef<THREE.Mesh | null>(null);  // For animated procedural sky
    const envTimeRef = useRef(0);  // Animation time for procedural environments

    // HDR lighting refs - lights that respond to environment changes
    const mainLightRef = useRef<THREE.DirectionalLight | null>(null);
    const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
    const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
    const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

    // UE5/Reallusion model detection for axis swap
    const isUE5ModelRef = useRef(false);  // These models need X/Z axis swap for head tracking

    // Blink timing refs
    const blinkTimeRef = useRef(0);
    const nextBlinkRef = useRef(0);
    const blinkProgressRef = useRef(0);
    const isBlinkingRef = useRef(false);
    const blinkMorphRef = useRef<{ mesh: THREE.Mesh; index: number }[]>([]);

    // Head tracking refs - for lagged head follow
    const headBoneRef = useRef<THREE.Bone | null>(null);
    const targetHeadRotationRef = useRef(new THREE.Euler(0, 0, 0));
    const currentHeadRotationRef = useRef(new THREE.Euler(0, 0, 0));
    const headLagTimeRef = useRef(0);  // Time since target changed
    const headLagDurationRef = useRef(0.25);  // 0.2-0.4 seconds lag - much faster!

    // Eye look morph targets (CC models use morphs, not bone rotation)
    const eyeLookMorphsRef = useRef<{
        left: { mesh: THREE.Mesh; index: number } | null;
        right: { mesh: THREE.Mesh; index: number } | null;
        up: { mesh: THREE.Mesh; index: number } | null;
        down: { mesh: THREE.Mesh; index: number } | null;
    }>({ left: null, right: null, up: null, down: null });

    // VRM head tracking refs (uses lookAt but with lagged smoothing)
    const vrmTargetPositionRef = useRef(new THREE.Vector3(0, 0, 0));
    const vrmCurrentLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
    const vrmLookAtLagTimeRef = useRef(0);
    const vrmLookAtLagDurationRef = useRef(0.15);  // Very fast - 150ms
    // Persistent lookAt target object - must be added to scene for VRM lookAt to work
    const vrmLookAtTargetRef = useRef<THREE.Object3D | null>(null);

    // Fetch available models from backend on mount
    // If API not available, use local models from assets folder
    useEffect(() => {
        const fetchModels = async () => {
            // Fallback models - served by backend at runtime via /marketplace/modules/vrm-companion/assets/...
            // These match the known models in frontend/assets/models/ folder structure
            const fallbackModels = [
                { name: 'Sample Avatar (VRoid)', url: '/marketplace/modules/vrm-companion/assets/models/VRoid/SampleAvatar/SampleAvatar.vrm', type: 'vrm' },
                { name: 'Camila (Reallusion/CC)', url: '/marketplace/modules/vrm-companion/assets/models/Reallusion/Camila/Camila.fbx', type: 'fbx' },
                { name: 'Michelle (Reallusion/CC)', url: '/marketplace/modules/vrm-companion/assets/models/Reallusion/Michelle/Michelle.fbx', type: 'fbx' },
                { name: 'Manny (UE5)', url: '/marketplace/modules/vrm-companion/assets/models/UnrealEngine/Manny/Manny.fbx', type: 'fbx' },
                { name: 'Quinn (UE5)', url: '/marketplace/modules/vrm-companion/assets/models/UnrealEngine/Quinn/Quinn.fbx', type: 'fbx' },
            ];

            try {
                const response = await fetch('/marketplace/modules/vrm-companion/models');
                if (!response.ok) {
                    // API endpoint doesn't exist yet - use fallback models
                    console.warn('[VRMCompanion] Models API not available, using fallback models');
                    setAvailableModels(fallbackModels);
                    if (!selectedModelUrl) {
                        setSelectedModelUrl(fallbackModels[0].url);
                    }
                    return;
                }
                const models = await response.json();
                console.log('[VRMCompanion] Fetched models from API:', models);
                setAvailableModels(models.length > 0 ? models : fallbackModels);
                // Set first model as default if no model URL provided
                if ((models.length > 0 || fallbackModels.length > 0) && !selectedModelUrl) {
                    setSelectedModelUrl(models.length > 0 ? models[0].url : fallbackModels[0].url);
                }
            } catch (error) {
                console.error('[VRMCompanion] Failed to fetch models:', error);
                // Fallback to CDN model
                setAvailableModels(fallbackModels);
                if (!selectedModelUrl) {
                    setSelectedModelUrl(fallbackModels[0].url);
                }
            }
        };
        fetchModels();
    }, []);

    // Fetch available environments from backend on mount
    useEffect(() => {
        const fetchEnvironments = async () => {
            try {
                const response = await fetch('/marketplace/modules/vrm-companion/environments');
                const envs = await response.json();
                setAvailableEnvironments(envs);
                console.log('[VRMCompanion] Loaded environments:', envs);
            } catch (error) {
                console.error('[VRMCompanion] Failed to fetch environments:', error);
                // Default procedural environment will be used
                setAvailableEnvironments([
                    { name: 'Procedural Studio', url: '__procedural_studio__', projection: 'sphere', type: 'procedural' }
                ]);
            }
        };
        fetchEnvironments();
    }, []);

    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a12);
        sceneRef.current = scene;

        // Use fallback size if container not sized yet
        const width = container.clientWidth || window.innerWidth * 0.7;
        const height = container.clientHeight || window.innerHeight;

        const camera = new THREE.PerspectiveCamera(
            35,
            width / height,
            0.1,
            100
        );
        camera.position.set(0, 1.5, 1.5);  // Closer, face level
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // HDR tone mapping for proper lighting
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Ensure canvas fills container
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';

        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.4, 0);  // Look at face level
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.update();
        controlsRef.current = controls;

        // HDRI Environment Lighting (replaces static lights)
        // PMREMGenerator preprocesses environment maps for PBR materials
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        pmremGeneratorRef.current = pmrem;

        // Default: Procedural studio environment (zero file load, Pi 5 friendly)
        const roomEnv = new RoomEnvironment();
        const envTexture = pmrem.fromScene(roomEnv).texture;
        scene.environment = envTexture;  // Applies to all PBR materials

        // Three-point lighting setup for non-PBR materials (VRM MToon, etc.)
        // These lights will be updated when HDR environment changes

        // Key/Main light - primary light source (simulates sun/main light in HDR)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = false;
        scene.add(mainLight);
        mainLightRef.current = mainLight;

        // Fill light - softer, opposite side to reduce harsh shadows
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-5, 5, -5);
        scene.add(fillLight);
        fillLightRef.current = fillLight;

        // Rim/Back light - edge highlight for depth
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        rimLight.position.set(0, 5, -10);
        scene.add(rimLight);
        rimLightRef.current = rimLight;

        // Hemisphere light - ambient sky/ground color blend
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x362312, 0.6);
        scene.add(hemiLight);
        hemiLightRef.current = hemiLight;

        console.log('[VRMCompanion] HDRI environment + 3-point lighting initialized');

        // Grid
        const gridHelper = new THREE.GridHelper(10, 10, 0x00ff99, 0x003322);
        gridHelper.position.y = 0;
        scene.add(gridHelper);

        // Initialize LipSync service
        lipSyncRef.current = new LipSyncService({ smoothing, gain, maxMouthOpen, jawAmplitude });

        // Initialize Animation service for idle/speaking
        animationServiceRef.current = new AnimationService({
            idleIntensity,
            speakingIntensity,
            enabled: idleAnimationEnabled,
        });

        // Animation loop
        const animate = () => {
            const dt = clockRef.current.getDelta();

            // Update lip sync for both VRM and FBX models
            if (lipSyncRef.current && (vrmRef.current || fbxModelRef.current)) {
                lipSyncRef.current.update(dt);
                const weights = lipSyncRef.current.currentWeights;
                // Debug: Log non-zero weights
                const nonZero = Object.entries(weights).filter(([_, v]) => v > 0.01);
                if (nonZero.length > 0) {
                    console.log('[VRMCompanion] Non-zero weights:', nonZero);
                }
                setVisemeWeights(weights);
            }

            // Update blink animation
            if (blinkEnabled && (vrmRef.current || fbxModelRef.current)) {
                blinkTimeRef.current += dt;

                // Check if it's time to blink
                if (!isBlinkingRef.current && blinkTimeRef.current >= nextBlinkRef.current) {
                    isBlinkingRef.current = true;
                    blinkProgressRef.current = 0;
                }

                // Process blink animation
                if (isBlinkingRef.current) {
                    blinkProgressRef.current += dt / BLINK_DURATION;

                    if (blinkProgressRef.current >= 1) {
                        // Blink complete
                        isBlinkingRef.current = false;
                        blinkProgressRef.current = 0;
                        blinkTimeRef.current = 0;
                        nextBlinkRef.current = getNextBlinkInterval();

                        // Reset blink morphs to 0
                        if (vrmRef.current?.expressionManager) {
                            vrmRef.current.expressionManager.setValue('blink', 0);
                        }
                        for (const target of blinkMorphRef.current) {
                            if (target.mesh.morphTargetInfluences) {
                                target.mesh.morphTargetInfluences[target.index] = 0;
                            }
                        }
                    } else {
                        // Apply blink with golden ratio easing
                        const blinkWeight = goldenEase(blinkProgressRef.current);

                        if (vrmRef.current?.expressionManager) {
                            vrmRef.current.expressionManager.setValue('blink', blinkWeight);
                        }

                        // FBX blink morphs
                        for (const target of blinkMorphRef.current) {
                            if (target.mesh.morphTargetInfluences) {
                                target.mesh.morphTargetInfluences[target.index] = blinkWeight;
                            }
                        }
                    }
                }
            }

            // Update idle/speaking animations
            if (animationServiceRef.current && idleAnimationEnabled) {
                animationServiceRef.current.update(dt);
            }

            // Update head tracking (look at camera)
            // Eyes lock immediately via morphs, head follows with golden ratio lag via bone
            if (headTrackingEnabled && camera) {
                // VRM head tracking - simple camera target approach
                if (vrmRef.current?.lookAt) {
                    // Set camera directly as target - VRM lookAt will handle it
                    if (vrmRef.current.lookAt.target !== camera) {
                        vrmRef.current.lookAt.target = camera;
                        console.log('[VRMCompanion] Set camera as lookAt target');
                    }
                    // Note: vrm.update() will call lookAt.update() automatically
                } else if (headBoneRef.current && fbxModelRef.current) {
                    // Calculate direction from head to camera
                    const headPos = new THREE.Vector3();
                    headBoneRef.current.getWorldPosition(headPos);
                    const camPos = camera.position.clone();
                    const direction = camPos.sub(headPos).normalize();

                    // Calculate yaw (left/right) and pitch (up/down) angles
                    const yaw = Math.atan2(direction.x, direction.z);
                    const pitch = Math.asin(Math.max(-1, Math.min(1, -direction.y)));

                    // EYES: Apply immediately via morphs (CC4 Eye_Look_* morphs)
                    const eyeMorphs = eyeLookMorphsRef.current;
                    const maxEyeWeight = 0.7;  // Don't fully activate to keep natural look

                    // Horizontal eye movement (positive yaw = look right, negative = look left)
                    if (eyeMorphs.left?.mesh.morphTargetInfluences && eyeMorphs.right?.mesh.morphTargetInfluences) {
                        const horizontalWeight = Math.abs(yaw) * 2;  // Scale up for visibility
                        if (yaw < 0) {
                            // Looking left (from camera's perspective, so character looks right at camera)
                            eyeMorphs.left.mesh.morphTargetInfluences[eyeMorphs.left.index] = Math.min(horizontalWeight, maxEyeWeight);
                            eyeMorphs.right.mesh.morphTargetInfluences[eyeMorphs.right.index] = 0;
                        } else {
                            // Looking right
                            eyeMorphs.right.mesh.morphTargetInfluences[eyeMorphs.right.index] = Math.min(horizontalWeight, maxEyeWeight);
                            eyeMorphs.left.mesh.morphTargetInfluences[eyeMorphs.left.index] = 0;
                        }
                    }

                    // Vertical eye movement
                    if (eyeMorphs.up?.mesh.morphTargetInfluences && eyeMorphs.down?.mesh.morphTargetInfluences) {
                        const verticalWeight = Math.abs(pitch) * 2;
                        if (pitch > 0) {
                            // Looking up
                            eyeMorphs.up.mesh.morphTargetInfluences[eyeMorphs.up.index] = Math.min(verticalWeight, maxEyeWeight);
                            eyeMorphs.down.mesh.morphTargetInfluences[eyeMorphs.down.index] = 0;
                        } else {
                            // Looking down
                            eyeMorphs.down.mesh.morphTargetInfluences[eyeMorphs.down.index] = Math.min(verticalWeight, maxEyeWeight);
                            eyeMorphs.up.mesh.morphTargetInfluences[eyeMorphs.up.index] = 0;
                        }
                    }

                    // HEAD: Lagged follow with golden ratio easing
                    const maxHeadAngle = Math.PI / 8;  // 22.5 degrees max for subtle head movement
                    const targetYaw = THREE.MathUtils.clamp(yaw, -maxHeadAngle, maxHeadAngle);
                    const targetPitch = THREE.MathUtils.clamp(pitch, -maxHeadAngle / 2, maxHeadAngle / 2);

                    // Update target rotation
                    targetHeadRotationRef.current.set(targetPitch, targetYaw, 0);

                    // Fast smooth interpolation - head should follow quickly but not jitter
                    // Use exponential smoothing: lerp factor of ~8-12 per second gives responsive feel
                    const lerpFactor = 1 - Math.exp(-dt * 10);  // ~10 per second = very responsive

                    currentHeadRotationRef.current.x = THREE.MathUtils.lerp(
                        currentHeadRotationRef.current.x,
                        targetHeadRotationRef.current.x,
                        lerpFactor
                    );
                    currentHeadRotationRef.current.y = THREE.MathUtils.lerp(
                        currentHeadRotationRef.current.y,
                        targetHeadRotationRef.current.y,
                        lerpFactor
                    );

                    // Apply to head bone - UE5/Reallusion models need axis swap due to rotated coordinate system
                    if (isUE5ModelRef.current) {
                        // After -90° X rotation, the local axes are swapped: local Y = world Z, local Z = world -Y
                        headBoneRef.current.rotation.z = currentHeadRotationRef.current.x;  // Pitch becomes roll
                        headBoneRef.current.rotation.y = -currentHeadRotationRef.current.y;  // Yaw inverted
                    } else {
                        headBoneRef.current.rotation.x = currentHeadRotationRef.current.x;
                        headBoneRef.current.rotation.y = currentHeadRotationRef.current.y;
                    }
                }
            }
            // VRM head tracking fallback - no FBX model, just VRM
            if (headTrackingEnabled && camera && vrmRef.current && !fbxModelRef.current) {
                // Already handled above via VRM lookAt
            }

            // Update VRM with physics optionally disabled
            if (vrmRef.current) {
                if (physicsEnabled) {
                    vrmRef.current.update(dt);
                } else {
                    // Update VRM without physics (skip spring bone simulation)
                    vrmRef.current.expressionManager?.update();
                    vrmRef.current.lookAt?.update(dt);
                    vrmRef.current.humanoid?.update();
                }
            }

            // Update FBX animation mixer if present
            if (mixerRef.current) {
                mixerRef.current.update(dt);
            }

            controlsRef.current?.update();
            renderer.render(scene, camera);
        };

        renderer.setAnimationLoop(animate);

        // Handle resize
        const handleResize = () => {
            if (!container || !camera || !renderer) return;
            const w = container.clientWidth || window.innerWidth * 0.7;
            const h = container.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // Auto-load model
        loadModel();

        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.setAnimationLoop(null); // Stop animation loop

            // Dispose all scene objects to prevent WebGL uniform errors
            scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry?.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else if (object.material) {
                        object.material.dispose();
                    }
                }
            });
            scene.clear();

            controlsRef.current?.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            if (container && renderer.domElement) {
                container.removeChild(renderer.domElement);
            }
            lipSyncRef.current?.dispose();
            animationServiceRef.current?.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update config when sliders change
    useEffect(() => {
        lipSyncRef.current?.updateConfig({ smoothing, gain, maxMouthOpen, jawAmplitude });
    }, [smoothing, gain, maxMouthOpen, jawAmplitude]);

    // Update animation service config
    useEffect(() => {
        animationServiceRef.current?.updateDefaultConfig({
            idleIntensity,
            speakingIntensity,
            enabled: idleAnimationEnabled,
        });
    }, [idleIntensity, speakingIntensity, idleAnimationEnabled]);

    // Update light intensity when slider changes
    useEffect(() => {
        if (mainLightRef.current) {
            mainLightRef.current.intensity = 1.2 * lightIntensity;
        }
        if (fillLightRef.current) {
            fillLightRef.current.intensity = 0.6 * lightIntensity;
        }
        if (rimLightRef.current) {
            rimLightRef.current.intensity = 0.3 * lightIntensity;
        }
        if (hemiLightRef.current) {
            hemiLightRef.current.intensity = 0.8 * lightIntensity;
        }
    }, [lightIntensity]);

    // Track amplitude mode
    useEffect(() => {
        if (lipSyncRef.current) {
            lipSyncRef.current.forceAmplitudeMode = amplitudeMode;
        }
    }, [amplitudeMode]);

    // Handle environment changes
    useEffect(() => {
        if (!sceneRef.current || !pmremGeneratorRef.current) return;

        const scene = sceneRef.current;
        const pmrem = pmremGeneratorRef.current;

        const loadEnvironment = async () => {
            console.log('[VRMCompanion] Loading environment:', selectedEnvironmentUrl);

            if (selectedEnvironmentUrl.startsWith('__procedural_')) {
                // Procedural environments - no file load needed
                const roomEnv = new RoomEnvironment();
                const envTexture = pmrem.fromScene(roomEnv).texture;
                scene.environment = envTexture;
                console.log('[VRMCompanion] Procedural environment applied');
            } else if (selectedEnvironmentUrl) {
                // Detect file type and use appropriate loader
                const url = selectedEnvironmentUrl.toLowerCase();

                try {
                    const onLoad = (texture: THREE.DataTexture) => {
                        texture.mapping = THREE.EquirectangularReflectionMapping;
                        const envMap = pmrem.fromEquirectangular(texture).texture;
                        scene.environment = envMap;
                        scene.background = texture;  // Show HDRI as sky/dome background

                        // Sample colors from the HDR texture to tint the lights
                        // This creates ambient lighting that matches the environment
                        // Note: HDR DataTextures don't have canvas-compatible images, so skip sampling for them
                        try {
                            const canvas = document.createElement('canvas');
                            const size = 32; // Small sample for performance
                            canvas.width = size;
                            canvas.height = size;
                            const ctx = canvas.getContext('2d');
                            // Only try to sample if we have a drawable image (not HDR DataTexture)
                            const img = texture.image;
                            if (ctx && img && 'width' in img && (img instanceof HTMLImageElement || img instanceof ImageBitmap)) {
                                ctx.drawImage(img, 0, 0, size, size);
                                const imageData = ctx.getImageData(0, 0, size, size).data;

                                // Sample sky color (top region) and ground color (bottom region)
                                let skyR = 0, skyG = 0, skyB = 0, skyCount = 0;
                                let groundR = 0, groundG = 0, groundB = 0, groundCount = 0;

                                for (let y = 0; y < size; y++) {
                                    for (let x = 0; x < size; x++) {
                                        const i = (y * size + x) * 4;
                                        if (y < size / 3) {
                                            // Top third = sky
                                            skyR += imageData[i];
                                            skyG += imageData[i + 1];
                                            skyB += imageData[i + 2];
                                            skyCount++;
                                        } else if (y > size * 2 / 3) {
                                            // Bottom third = ground
                                            groundR += imageData[i];
                                            groundG += imageData[i + 1];
                                            groundB += imageData[i + 2];
                                            groundCount++;
                                        }
                                    }
                                }

                                // Average and normalize
                                const skyColor = new THREE.Color(
                                    skyR / skyCount / 255,
                                    skyG / skyCount / 255,
                                    skyB / skyCount / 255
                                );
                                const groundColor = new THREE.Color(
                                    groundR / groundCount / 255,
                                    groundG / groundCount / 255,
                                    groundB / groundCount / 255
                                );

                                // Update hemisphere light with environment colors
                                if (hemiLightRef.current) {
                                    hemiLightRef.current.color.copy(skyColor);
                                    hemiLightRef.current.groundColor.copy(groundColor);
                                    hemiLightRef.current.intensity = 0.8;
                                }

                                // Tint main light with a warm/cool bias from environment
                                if (mainLightRef.current) {
                                    const mainColor = skyColor.clone().lerp(new THREE.Color(1, 1, 1), 0.5);
                                    mainLightRef.current.color.copy(mainColor);
                                    mainLightRef.current.intensity = 1.2;
                                }

                                // Fill light - slightly tinted by ground reflection
                                if (fillLightRef.current) {
                                    const fillColor = groundColor.clone().lerp(new THREE.Color(1, 1, 1), 0.7);
                                    fillLightRef.current.color.copy(fillColor);
                                    fillLightRef.current.intensity = 0.6;
                                }

                                console.log('[VRMCompanion] HDR lighting applied - sky:', skyColor, 'ground:', groundColor);
                            }
                        } catch (colorSampleError) {
                            // HDR DataTextures don't have canvas-compatible images, this is expected
                            console.log('[VRMCompanion] Skipping color sampling for HDR texture');
                        }

                        // Apply environment map to all mesh materials for proper reflections
                        scene.traverse((obj) => {
                            if (obj instanceof THREE.Mesh && obj.material) {
                                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                                materials.forEach((mat) => {
                                    if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                                        mat.envMap = envMap;
                                        mat.envMapIntensity = 1.0;
                                        mat.needsUpdate = true;
                                    }
                                });
                            }
                        });

                        console.log('[VRMCompanion] Environment loaded and applied:', selectedEnvironmentUrl);
                    };

                    const onError = (error: unknown) => {
                        console.error('[VRMCompanion] Failed to load environment:', error);
                        // Fallback to procedural
                        const roomEnv = new RoomEnvironment();
                        const envTexture = pmrem.fromScene(roomEnv).texture;
                        scene.environment = envTexture;
                    };

                    // Priority: .hdr.jpg (UltraHDR) > .hdr (Radiance) > .exr (OpenEXR)
                    if (url.endsWith('.hdr.jpg')) {
                        // UltraHDR format - most efficient, smallest file size
                        console.log('[VRMCompanion] UltraHDR format detected, falling back to procedural (loader not enabled). URL:', selectedEnvironmentUrl);
                        // const loader = new UltraHDRLoader();
                        // loader.setDataType(THREE.HalfFloatType);
                        // loader.load(selectedEnvironmentUrl, onLoad, undefined, onError);
                        console.log('[VRMCompanion] UltraHDR format detected, falling back to procedural (loader not enabled)');
                        const roomEnv = new RoomEnvironment();
                        const envTexture = pmrem.fromScene(roomEnv).texture;
                        scene.environment = envTexture;
                    } else if (url.endsWith('.hdr')) {
                        // Standard Radiance HDR format - most common, widely available
                        const loader = new RGBELoader();
                        loader.setDataType(THREE.HalfFloatType);
                        loader.load(selectedEnvironmentUrl, onLoad, undefined, onError);
                    } else if (url.endsWith('.exr')) {
                        // OpenEXR format - high quality, larger files
                        const loader = new EXRLoader();
                        loader.setDataType(THREE.HalfFloatType);
                        loader.load(selectedEnvironmentUrl, onLoad, undefined, onError);
                    } else {
                        // Unknown format - use procedural fallback
                        console.log('[VRMCompanion] Unknown format, using procedural fallback');
                        const roomEnv = new RoomEnvironment();
                        const envTexture = pmrem.fromScene(roomEnv).texture;
                        scene.environment = envTexture;
                    }
                } catch (error) {
                    console.error('[VRMCompanion] Error loading environment:', error);
                }
            }
        };

        loadEnvironment();
    }, [selectedEnvironmentUrl]);

    // Connect lip sync to Global Chat TTS (shared ttsService)
    useEffect(() => {
        console.log('[VRMCompanion] Setting up TTS state listener, vrmLoaded:', vrmLoaded);

        const unsubscribe = onStateChange(async (state) => {
            console.log('[VRMCompanion] TTS state changed:', state, 'vrmLoaded:', vrmLoaded, 'lipSyncRef:', !!lipSyncRef.current);

            if (state.playing && lipSyncRef.current && vrmLoaded) {
                const audio = getAudioElement();
                const analyser = getAnalyser();
                console.log('[VRMCompanion] TTS playing, audio:', !!audio, 'analyser:', !!analyser);

                if (audio) {
                    try {
                        // Fetch phonemes if text is available and not in amplitude-only mode
                        if (state.text && !amplitudeMode) {
                            try {
                                console.log('[VRMCompanion] Fetching phonemes for:', state.text.substring(0, 50) + '...');
                                const { api } = await import('@/services/api');
                                const phonemeData = await api.textToPhonemes(state.text);

                                // Only process if we got actual phoneme data (not empty)
                                if (phonemeData.phonemes && phonemeData.phonemes.trim()) {
                                    // Split IPA string into individual phonemes (not words!)
                                    const phonemes = splitIPAIntoPhonemes(phonemeData.phonemes);

                                    console.log('[VRMCompanion] Split phonemes:', {
                                        raw: phonemeData.phonemes,
                                        parsed: phonemes,
                                        count: phonemes.length
                                    });

                                    if (phonemes.length > 0 && audio.duration > 0) {
                                        // Calculate weighted durations based on phoneme type
                                        const weights = phonemes.map(p => getPhonemeDuration(p));
                                        const totalWeight = weights.reduce((a, b) => a + b, 0);
                                        const timePerWeight = audio.duration / totalWeight;

                                        // Build timeline with variable durations
                                        const timeline: { t0: number; t1: number; phoneme: string; stress?: number }[] = [];
                                        let currentTime = 0;

                                        for (let i = 0; i < phonemes.length; i++) {
                                            const duration = weights[i] * timePerWeight;
                                            timeline.push({
                                                t0: currentTime,
                                                t1: currentTime + duration,
                                                phoneme: phonemes[i],
                                                stress: weights[i] // Use weight as stress for visual intensity
                                            });
                                            currentTime += duration;
                                        }

                                        console.log(`[VRMCompanion] Created phoneme timeline:`, {
                                            phonemeCount: timeline.length,
                                            audioDuration: audio.duration.toFixed(2),
                                            firstFive: timeline.slice(0, 5),
                                            lastPhoneme: timeline[timeline.length - 1]
                                        });
                                        lipSyncRef.current.ingestPhonemeTimeline(timeline);
                                        console.log('[VRMCompanion] Timeline ingested successfully');
                                    } else {
                                        console.warn('[VRMCompanion] Invalid timeline data:', {
                                            phonemeCount: phonemes.length,
                                            duration: audio.duration
                                        });
                                    }
                                } else {
                                    // Phonemizer returned empty - log error but continue with amplitude
                                    console.warn('[VRMCompanion] Phonemizer returned no data, using amplitude mode');
                                    setPhonemeError('Phonemizer unavailable - using amplitude mode');
                                }
                            } catch (phonemeErr) {
                                // Phoneme fetch failed - log error but continue with amplitude
                                console.warn('[VRMCompanion] Phoneme fetch failed, using amplitude fallback:', phonemeErr);
                                setPhonemeError(`Phoneme error: ${phonemeErr} - using amplitude mode`);
                            }
                        }

                        // Pass the shared ttsService analyser to avoid duplicate audio connections
                        console.log('[VRMCompanion] Connecting to audio:', {
                            hasAudio: !!audio,
                            hasExternalAnalyser: !!analyser,
                            audioDuration: audio?.duration,
                            audioReadyState: audio?.readyState
                        });
                        await lipSyncRef.current.connectToAudio(audio, analyser ?? undefined);
                        setIsPlaying(true);
                        setStatus(amplitudeMode ? 'Lip syncing (amplitude)...' : 'Lip syncing (phonemes)...');

                        // Trigger speaking animation
                        if (speakingAnimationEnabled && animationServiceRef.current) {
                            animationServiceRef.current.setSpeakingAll(true);
                        }
                        console.log('[VRMCompanion] ✅ Connected to audio successfully');
                        console.log('[VRMCompanion] LipSync state:', {
                            hasTimeline: lipSyncRef.current.currentWeights !== undefined,
                            amplitudeOnly: (lipSyncRef.current as any).amplitudeOnly,
                            forceAmplitudeMode: (lipSyncRef.current as any).forceAmplitudeMode
                        });
                    } catch (err) {
                        console.warn('[VRMCompanion] Failed to connect lip sync:', err);
                    }
                } else {
                    console.warn('[VRMCompanion] No audio element from ttsService');
                }
            } else if (!state.playing && isPlaying) {
                setIsPlaying(false);
                setStatus('Ready');

                // Stop speaking animation
                if (animationServiceRef.current) {
                    animationServiceRef.current.setSpeakingAll(false);
                }
            }
        });

        return unsubscribe;
    }, [vrmLoaded, isPlaying, amplitudeMode, speakingAnimationEnabled]);

    // Detect model type from URL
    const getModelType = (url: string): 'vrm' | 'fbx' | 'glb' => {
        const lower = url.toLowerCase();
        if (lower.endsWith('.fbx')) return 'fbx';
        if (lower.endsWith('.glb') || lower.endsWith('.gltf')) return 'glb';
        return 'vrm';
    };

    // Load model (VRM, GLB, or FBX)
    const loadModel = useCallback(async () => {
        if (!sceneRef.current) return;

        const type = getModelType(activeModelUrl);
        setStatus(`Loading ${type.toUpperCase()} model...`);

        // Clear existing models
        if (vrmRef.current) {
            sceneRef.current.remove(vrmRef.current.scene);
            vrmRef.current = null;
        }
        if (fbxModelRef.current) {
            sceneRef.current.remove(fbxModelRef.current);
            fbxModelRef.current = null;
        }
        if (mixerRef.current) {
            mixerRef.current.stopAllAction();
            mixerRef.current = null;
        }
        // Clear VRM lookAt target
        if (vrmLookAtTargetRef.current && sceneRef.current) {
            sceneRef.current.remove(vrmLookAtTargetRef.current);
            vrmLookAtTargetRef.current = null;
        }
        setModelLoaded(false);
        setAvailableExpressions([]);

        try {
            if (type === 'fbx') {
                // Load FBX with error handling for CC4 vertex color issues
                const loader = new FBXLoader();

                // Stop any existing animations to prevent conflicts
                if (mixerRef.current) {
                    mixerRef.current.stopAllAction();
                }

                let fbx: THREE.Group;
                try {
                    fbx = await loader.loadAsync(activeModelUrl);
                } catch (fbxError) {
                    // Check if it's the vertex color parsing error
                    const errorMsg = String(fbxError);
                    if (errorMsg.includes("Cannot read properties of undefined (reading 'a')") ||
                        errorMsg.includes('parseVertexColors') ||
                        errorMsg.includes('parseGeoNode')) {
                        console.warn('[VRMCompanion] FBX vertex color parsing failed, retrying with geometry cleanup...');

                        // Try to load with a custom manager that ignores problematic resources
                        const loadingManager = new THREE.LoadingManager();
                        loadingManager.onError = (url) => {
                            console.warn('[VRMCompanion] Ignoring resource error:', url);
                        };
                        const retryLoader = new FBXLoader(loadingManager);
                        fbx = await retryLoader.loadAsync(activeModelUrl);

                        // Post-process: remove any geometry without proper vertex colors
                        fbx.traverse((child) => {
                            const mesh = child as THREE.Mesh;
                            if (mesh.isMesh && mesh.geometry) {
                                const colorAttr = mesh.geometry.getAttribute('color');
                                if (colorAttr && !colorAttr.array) {
                                    console.warn('[VRMCompanion] Removing invalid color attribute from:', mesh.name);
                                    mesh.geometry.deleteAttribute('color');
                                }
                            }
                        });
                    } else {
                        throw fbxError; // Re-throw if it's a different error
                    }
                }

                // Detect model type from URL path - must rotate BEFORE bounding box calculations
                const modelUrl = activeModelUrl.toLowerCase();
                const isUEModel = modelUrl.includes('unrealengine') || modelUrl.includes('manny') || modelUrl.includes('quinn');
                const isReallusionModel = modelUrl.includes('reallusion') || modelUrl.includes('camila') || modelUrl.includes('cc4');

                // Fix rotation for Unreal Engine and Reallusion exports (they use different axis orientation)
                if (isUEModel || isReallusionModel) {
                    fbx.rotation.x = -Math.PI / 2; // Rotate 90 degrees to stand upright
                    isUE5ModelRef.current = true;  // Mark for axis swap in head tracking
                    console.log('[VRMCompanion] Applied rotation fix for UE/Reallusion model');
                } else {
                    isUE5ModelRef.current = false;
                }

                // Update matrix world so bounding box reflects the rotated orientation
                fbx.updateMatrixWorld(true);

                // FBX models from Character Creator are often huge, scale down
                const box = new THREE.Box3().setFromObject(fbx);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const targetHeight = 1.8; // 1.8 meters tall
                const scale = targetHeight / maxDim;
                fbx.scale.setScalar(scale);

                // Update matrix again after scaling
                fbx.updateMatrixWorld(true);

                // Center and ground the model
                box.setFromObject(fbx);
                const center = box.getCenter(new THREE.Vector3());
                fbx.position.x = -center.x;
                fbx.position.z = -center.z;
                fbx.position.y = -box.min.y;

                sceneRef.current.add(fbx);
                fbxModelRef.current = fbx;

                // Set up animation mixer if model has animations
                if (fbx.animations && fbx.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(fbx);
                    mixerRef.current = mixer;

                    // Store available animations
                    const animNames = fbx.animations.map(a => a.name || `Animation ${fbx.animations.indexOf(a)}`);
                    setAvailableAnimations(animNames);

                    // Auto-play first animation for CC4 models (gets them out of T-pose)
                    const firstAction = mixer.clipAction(fbx.animations[0]);
                    firstAction.reset();
                    firstAction.play();
                    setCurrentAnimationIndex(0);

                    console.log('[VRMCompanion] FBX animations:', animNames);
                    console.log('[VRMCompanion] Auto-playing first animation:', animNames[0]);
                    setStatus(`FBX loaded. Playing: ${animNames[0]}`);
                } else {
                    setAvailableAnimations([]);
                    setCurrentAnimationIndex(-1);
                    setStatus('FBX loaded (no animations).');
                }

                // Log bone structure for Character Creator models
                const bones: string[] = [];
                fbx.traverse((child) => {
                    if ((child as THREE.Bone).isBone) {
                        bones.push(child.name);
                    }
                });
                console.log('[VRMCompanion] FBX bones:', bones);

                // Check for morph targets (blend shapes)
                const morphTargets: string[] = [];
                const meshes: { name: string; visible: boolean }[] = [];
                const meshRefs: { name: string; mesh: THREE.Mesh; visible: boolean }[] = [];

                fbx.traverse((child) => {
                    const mesh = child as THREE.Mesh;
                    if (mesh.isMesh && mesh.morphTargetDictionary) {
                        Object.keys(mesh.morphTargetDictionary).forEach(name => {
                            if (!morphTargets.includes(name)) morphTargets.push(name);
                        });
                    }

                    // Log all meshes
                    if (mesh.isMesh) {
                        meshes.push({ name: mesh.name, visible: mesh.visible });

                        // Auto-hide common duplicate mesh patterns
                        const lowerName = mesh.name.toLowerCase();

                        // Hide LOD meshes (keep LOD0, hide LOD1, LOD2, etc.)
                        if (lowerName.includes('_lod') && !lowerName.includes('_lod0')) {
                            mesh.visible = false;
                            console.log(`[VRMCompanion] Hiding LOD mesh: ${mesh.name}`);
                        }

                        // Hide duplicate/backup meshes
                        if (lowerName.includes('_duplicate') || lowerName.includes('_backup') || lowerName.includes('_orig')) {
                            mesh.visible = false;
                            console.log(`[VRMCompanion] Hiding duplicate mesh: ${mesh.name}`);
                        }

                        // Character Creator specific: hide .Shape meshes if main mesh exists
                        if (lowerName.endsWith('.shape') || lowerName.includes('_shape_')) {
                            mesh.visible = false;
                            console.log(`[VRMCompanion] Hiding shape mesh: ${mesh.name}`);
                        }

                        // Hide numbered duplicates (Blender/CC style: .001, .002, _001, _002)
                        if (/\.(00[1-9]|0[1-9]\d|\d{3,})$/.test(mesh.name) || /_00[1-9]$/.test(mesh.name)) {
                            mesh.visible = false;
                            console.log(`[VRMCompanion] Hiding numbered duplicate: ${mesh.name}`);
                        }

                        // Hide symmetry duplicates (.R, .L, _R, _L at the end - common in CC)
                        if (/\.[RL]$/i.test(mesh.name) || /_[RL]$/i.test(mesh.name)) {
                            mesh.visible = false;
                            console.log(`[VRMCompanion] Hiding symmetry mesh: ${mesh.name}`);
                        }

                        // Hide CC-specific duplicate patterns
                        if (lowerName.includes('_copy') || lowerName.includes('copy_') || lowerName.endsWith('_old')) {
                            mesh.visible = false;
                            console.log(`[VRMCompanion] Hiding copy mesh: ${mesh.name}`);
                        }

                        // Store mesh reference for UI controls
                        meshRefs.push({ name: mesh.name, mesh, visible: mesh.visible });
                    }
                });

                console.log('[VRMCompanion] FBX meshes:', meshes);
                setMeshList(meshRefs);

                if (morphTargets.length > 0) {
                    console.log('[VRMCompanion] FBX morph targets:', morphTargets);
                    setAvailableExpressions(morphTargets);
                    setStatus(`FBX loaded. ${morphTargets.length} blend shapes found.`);
                }

                // Find blink morphs for automatic blinking
                blinkMorphRef.current = [];
                fbx.traverse((child) => {
                    const mesh = child as THREE.Mesh;
                    if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
                        for (const [morphName, morphIndex] of Object.entries(mesh.morphTargetDictionary)) {
                            // Look for blink-related morphs
                            // CC4 uses Eye_Blink_L and Eye_Blink_R
                            if (
                                morphName === 'Eye_Blink_L' ||
                                morphName === 'Eye_Blink_R' ||
                                morphName === 'A13_Blink_Left' ||   // ARKit style
                                morphName === 'A14_Blink_Right' ||  // ARKit style
                                morphName === 'eyeBlinkLeft' ||     // ARKit camelCase
                                morphName === 'eyeBlinkRight' ||    // ARKit camelCase
                                morphName === 'Fcl_EYE_Close' ||    // VRoid style
                                morphName === 'Fcl_EYE_Close_L' ||  // VRoid L/R
                                morphName === 'Fcl_EYE_Close_R'     // VRoid L/R
                            ) {
                                blinkMorphRef.current.push({ mesh, index: morphIndex });
                                console.log(`[VRMCompanion] Found blink morph: ${morphName}`);
                            }
                        }
                    }
                });

                // Initialize blink timing
                nextBlinkRef.current = getNextBlinkInterval();
                console.log(`[VRMCompanion] Blink initialized, first blink in ${nextBlinkRef.current.toFixed(2)}s`);

                // Reset head/eye tracking refs for new model
                headBoneRef.current = null;
                eyeLookMorphsRef.current = { left: null, right: null, up: null, down: null };
                currentHeadRotationRef.current.set(0, 0, 0);
                targetHeadRotationRef.current.set(0, 0, 0);
                headLagTimeRef.current = 0;

                // Find head bone for head tracking
                fbx.traverse((child) => {
                    if ((child as THREE.Bone).isBone) {
                        const boneName = child.name.toLowerCase();
                        if (boneName === 'head' || boneName === 'cc_base_head' || boneName.endsWith('_head')) {
                            headBoneRef.current = child as THREE.Bone;
                            console.log(`[VRMCompanion] Found head bone: ${child.name}`);
                        }
                    }
                });

                // Find eye look morphs (CC4 uses Eye_Look_* morphs)
                fbx.traverse((child) => {
                    const mesh = child as THREE.Mesh;
                    if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
                        for (const [morphName, morphIndex] of Object.entries(mesh.morphTargetDictionary)) {
                            // CC4 Eye Look morphs
                            if (morphName === 'Eye_Look_Out_L' || morphName === 'Eye_L_Look_L') {
                                eyeLookMorphsRef.current.left = { mesh, index: morphIndex };
                                console.log(`[VRMCompanion] Found eye look left: ${morphName}`);
                            }
                            if (morphName === 'Eye_Look_Out_R' || morphName === 'Eye_R_Look_R') {
                                eyeLookMorphsRef.current.right = { mesh, index: morphIndex };
                                console.log(`[VRMCompanion] Found eye look right: ${morphName}`);
                            }
                            if (morphName === 'Eye_Look_Up_L' || morphName === 'Eye_Look_Up_R' || morphName === 'Eye_L_Look_Up' || morphName === 'Eye_R_Look_Up') {
                                eyeLookMorphsRef.current.up = { mesh, index: morphIndex };
                                console.log(`[VRMCompanion] Found eye look up: ${morphName}`);
                            }
                            if (morphName === 'Eye_Look_Down_L' || morphName === 'Eye_Look_Down_R' || morphName === 'Eye_L_Look_Down' || morphName === 'Eye_R_Look_Down') {
                                eyeLookMorphsRef.current.down = { mesh, index: morphIndex };
                                console.log(`[VRMCompanion] Found eye look down: ${morphName}`);
                            }
                        }
                    }
                });

                // Connect FBX model to lip sync service
                lipSyncRef.current?.connectToFBX(fbx);

                // Connect FBX model to animation service for idle/speaking
                animationServiceRef.current?.connectToFBX(fbx);

                // Apply relaxed pose to get out of T-pose
                animationServiceRef.current?.applyRelaxedPose('default');

                setModelLoaded(true);

            } else {
                // Load VRM or GLB
                const loader = new GLTFLoader();
                loader.register((parser) => new VRMLoaderPlugin(parser));

                const gltf = await loader.loadAsync(activeModelUrl);
                const vrm = gltf.userData.vrm as VRM;

                if (vrm) {
                    // VRM model
                    vrm.scene.rotation.y = 0;
                    vrm.scene.position.set(0, 0, 0);
                    sceneRef.current.add(vrm.scene);
                    vrmRef.current = vrm;

                    // Analyze expressions
                    if (vrm.expressionManager) {
                        const expressions = vrm.expressionManager.expressions || [];
                        const expNames = expressions.map(
                            (e: { expressionName?: string; name?: string }) => e.expressionName || e.name
                        ).filter(Boolean) as string[];

                        setAvailableExpressions(expNames);
                        console.log('[VRMCompanion] VRM expressions:', expNames);

                        // Check for standard visemes (aa, ee, ih, oh, ou)
                        const visemes = ['aa', 'ee', 'ih', 'oh', 'ou'];
                        const foundVisemes = visemes.filter(v => expNames.includes(v));

                        const mouthRelated = expNames.filter(name =>
                            /mouth|mth|lip|jaw|smile|frown|open|close|vowel|viseme/i.test(name) ||
                            /^[AIUEO]$/i.test(name) ||
                            visemes.includes(name.toLowerCase())
                        );

                        console.log('[VRMCompanion] Viseme detection:', {
                            foundVisemes,
                            mouthRelated,
                            total: expNames.length
                        });

                        if (foundVisemes.length === 0) {
                            setStatus(`⚠️ No visemes (aa/ee/ih/oh/ou)! Found ${mouthRelated.length} mouth expressions.`);
                        } else {
                            setStatus(`Ready. Found ${foundVisemes.length}/5 visemes, ${mouthRelated.length} mouth expressions.`);
                        }
                    } else {
                        console.error('[VRMCompanion] No expression manager found on VRM');
                        setStatus('⚠️ No expression manager found.');
                    }

                    console.log('[VRMCompanion] Connecting VRM to LipSyncService...');
                    lipSyncRef.current?.connectToAvatar(vrm);
                    console.log('[VRMCompanion] VRM connected to LipSyncService');

                    // Connect VRM to animation service for idle/speaking
                    animationServiceRef.current?.connectToVRM(vrm);
                    console.log('[VRMCompanion] VRM connected to AnimationService');

                    // Load and play Mixamo idle animation instead of procedural pose
                    // The animation will handle the relaxed pose naturally
                    const loadIdleAnimation = async () => {
                        if (!animationServiceRef.current) return;

                        try {
                            // Load the Mixamo idle animation from assets
                            const idleUrl = '/marketplace/modules/vrm-companion/assets/animations/mixamo/Standing Idle.fbx';
                            console.log('[VRMCompanion] Loading Mixamo idle animation...');

                            const clip = await animationServiceRef.current.loadMixamoAnimation(
                                idleUrl,
                                'idle',
                                'default'
                            );

                            if (clip) {
                                // Play the idle animation on loop
                                animationServiceRef.current.playAnimation('idle', 'default', {
                                    loop: true,
                                    fadeIn: 0.5,
                                    timeScale: 1.0
                                });
                                console.log('[VRMCompanion] Idle animation playing');
                            } else {
                                // Fallback to procedural relaxed pose if animation fails
                                console.warn('[VRMCompanion] Failed to load idle animation, using procedural pose');
                                animationServiceRef.current.applyRelaxedPose('default');
                            }
                        } catch (err) {
                            console.warn('[VRMCompanion] Error loading idle animation:', err);
                            // Fallback to procedural relaxed pose
                            animationServiceRef.current?.applyRelaxedPose('default');
                        }
                    };

                    loadIdleAnimation();
                    console.log('[VRMCompanion] Initiated idle animation loading');
                } else {
                    // Plain GLB without VRM data
                    const model = gltf.scene;

                    // Scale and position
                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    if (maxDim > 3) {
                        const scale = 1.8 / maxDim;
                        model.scale.setScalar(scale);
                    }

                    box.setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.x = -center.x;
                    model.position.z = -center.z;
                    model.position.y = -box.min.y;

                    sceneRef.current.add(model);
                    fbxModelRef.current = model;

                    // Animations
                    if (gltf.animations && gltf.animations.length > 0) {
                        const mixer = new THREE.AnimationMixer(model);
                        mixerRef.current = mixer;

                        const animNames = gltf.animations.map(a => a.name || `Animation ${gltf.animations.indexOf(a)}`);
                        setAvailableAnimations(animNames);
                        setCurrentAnimationIndex(-1); // Don't auto-play

                        setStatus(`GLB loaded. ${gltf.animations.length} animation(s). Select one to play.`);
                    } else {
                        setAvailableAnimations([]);
                        setCurrentAnimationIndex(-1);
                        setStatus('GLB loaded.');
                    }

                    // Connect GLB model to lip sync service (for morph targets)
                    lipSyncRef.current?.connectToFBX(model);

                    // Connect GLB model to animation service for idle/speaking
                    animationServiceRef.current?.connectToFBX(model);

                    // Apply relaxed pose to get out of T-pose
                    animationServiceRef.current?.applyRelaxedPose('default');
                }

                setModelLoaded(true);
            }
        } catch (error) {
            console.error('[VRMCompanion] Failed to load model:', error);
            setStatus(`Failed to load ${type.toUpperCase()} model.`);
        }
    }, [activeModelUrl]);

    // Keep loadVRM as alias for backward compatibility
    const loadVRM = loadModel;

    // Play TTS demo - uses shared ttsService (triggers lip sync via useEffect listener)
    const playTTS = useCallback(async () => {
        if (!vrmLoaded) {
            setStatus('Load VRM first');
            return;
        }

        setStatus('Speaking...');

        // Import speak dynamically to avoid circular deps (already imported at top for types)
        const { speak } = await import('@/services/ttsService');
        await speak('Hello world, this is a lip sync test.');

        if (onSpeakRequest) {
            onSpeakRequest('Hello world, this is a lip sync test.');
        }
    }, [vrmLoaded, onSpeakRequest]);

    // Toggle microphone
    const toggleMic = useCallback(async () => {
        if (!vrmLoaded || !lipSyncRef.current) {
            setStatus('Load VRM first');
            return;
        }

        if (isMicActive) {
            lipSyncRef.current.disconnectMic();
            setIsMicActive(false);
            setStatus('Mic disabled');
        } else {
            try {
                await lipSyncRef.current.connectToMic();
                setIsMicActive(true);
                setStatus('Mic active - speak to see lip sync');
            } catch (error) {
                console.error('[VRMCompanion] Mic access failed:', error);
                setStatus('Mic access denied');
            }
        }
    }, [vrmLoaded, isMicActive]);

    // Test blendshapes/morph targets by cycling through them
    const testExpressions = useCallback(async () => {
        if (!modelLoaded) {
            setStatus('Load a model first');
            return;
        }

        setIsTesting(true);

        // Check if VRM model with expression manager
        if (vrmRef.current?.expressionManager) {
            const expressionManager = vrmRef.current.expressionManager;

            // Get all available expressions from the VRM
            const availableExpressions = expressionManager.expressions?.map(
                (e: { expressionName?: string; name?: string }) => e.expressionName || e.name
            ).filter(Boolean) || [];

            console.log('='.repeat(50));
            console.log('[VRMCompanion] ALL AVAILABLE VRM EXPRESSIONS:');
            availableExpressions.forEach((expr: string, i: number) => console.log(`  ${i + 1}. "${expr}"`));
            console.log('='.repeat(50));

            setStatus(`Found ${availableExpressions.length} expressions - check console!`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Standard VRM 1.0 visemes
            const standardVisemes: VisemeKey[] = ['aa', 'ih', 'ou', 'ee', 'oh'];

            // VRoid Studio / VRM 0.x style names (mouth shapes)
            const vroidMouthShapes = [
                'A', 'I', 'U', 'E', 'O',           // Japanese vowel visemes (VRoid)
                'Fcl_MTH_A', 'Fcl_MTH_I', 'Fcl_MTH_U', 'Fcl_MTH_E', 'Fcl_MTH_O', // VRoid prefixed
                'vrc.v_aa', 'vrc.v_ih', 'vrc.v_ou', 'vrc.v_ee', 'vrc.v_oh',     // VRChat style
                'Vowel_A', 'Vowel_I', 'Vowel_U', 'Vowel_E', 'Vowel_O',          // Alternative
                'MTH_A', 'MTH_I', 'MTH_U', 'MTH_E', 'MTH_O',                    // Short prefix
            ];

            // Common emotion expressions
            const emotionExpressions = [
                'happy', 'sad', 'angry', 'surprised', 'relaxed', 'neutral',
                'Fcl_ALL_Joy', 'Fcl_ALL_Angry', 'Fcl_ALL_Sorrow', 'Fcl_ALL_Fun',
                'Joy', 'Angry', 'Sorrow', 'Fun'
            ];

            // Blink expressions
            const blinkExpressions = [
                'blink', 'blinkLeft', 'blinkRight',
                'Fcl_EYE_Close', 'Fcl_EYE_Close_L', 'Fcl_EYE_Close_R',
                'Blink', 'Blink_L', 'Blink_R'
            ];

            // Test standard visemes first
            setStatus('Testing standard visemes (aa, ih, ou, ee, oh)...');
            for (const viseme of standardVisemes) {
                const found = availableExpressions.includes(viseme);
                setStatus(`Testing: ${viseme} ${found ? '✓' : '✗ not found'}`);

                if (found) {
                    standardVisemes.forEach(v => expressionManager.setValue(v, 0));
                    expressionManager.setValue(viseme, 1.0);
                    expressionManager.update();

                    const weights: Record<VisemeKey, number> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
                    weights[viseme] = 1.0;
                    setVisemeWeights(weights);
                }

                await new Promise(resolve => setTimeout(resolve, 600));
            }

            // Reset
            standardVisemes.forEach(v => {
                try { expressionManager.setValue(v, 0); } catch { /* skip */ }
            });
            setVisemeWeights({ aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 });

            // Test VRoid mouth shapes
            setStatus('Testing VRoid mouth shapes...');
            for (const shape of vroidMouthShapes) {
                if (availableExpressions.includes(shape)) {
                    setStatus(`Testing: ${shape} ✓`);
                    expressionManager.setValue(shape, 1.0);
                    expressionManager.update();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    expressionManager.setValue(shape, 0);
                    expressionManager.update();
                }
            }

            // Test emotions
            setStatus('Testing emotions...');
            for (const expr of emotionExpressions) {
                if (availableExpressions.includes(expr)) {
                    setStatus(`Testing: ${expr} ✓`);
                    expressionManager.setValue(expr, 1.0);
                    expressionManager.update();
                    await new Promise(resolve => setTimeout(resolve, 400));
                    expressionManager.setValue(expr, 0);
                    expressionManager.update();
                }
            }

            // Test blinks
            setStatus('Testing blinks...');
            for (const expr of blinkExpressions) {
                if (availableExpressions.includes(expr)) {
                    setStatus(`Testing: ${expr} ✓`);
                    expressionManager.setValue(expr, 1.0);
                    expressionManager.update();
                    await new Promise(resolve => setTimeout(resolve, 300));
                    expressionManager.setValue(expr, 0);
                    expressionManager.update();
                }
            }

            // Final summary
            const foundVisemes = standardVisemes.filter(v => availableExpressions.includes(v));
            const foundVroid = vroidMouthShapes.filter(v => availableExpressions.includes(v));

            console.log('[VRMCompanion] Standard visemes found:', foundVisemes);
            console.log('[VRMCompanion] VRoid shapes found:', foundVroid);

            // Now test ALL expressions one by one to see which moves the mouth
            setStatus('Testing ALL expressions - watch the mouth!');
            await new Promise(resolve => setTimeout(resolve, 1000));

            for (const expr of availableExpressions as string[]) {
                setStatus(`Testing: "${expr}"`);
                console.log(`[VRMCompanion] Testing expression: "${expr}"`);
                try {
                    expressionManager.setValue(expr, 1.0);
                    expressionManager.update();
                    await new Promise(resolve => setTimeout(resolve, 600));
                    expressionManager.setValue(expr, 0);
                    expressionManager.update();
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (e) {
                    console.warn(`[VRMCompanion] Failed to test "${expr}":`, e);
                }
            }

            if (foundVisemes.length === 0 && foundVroid.length === 0) {
                setStatus('⚠️ No standard mouth expressions - check which moved!');
            } else {
                setStatus(`Done! Found: ${foundVisemes.length} visemes, ${foundVroid.length} VRoid shapes`);
            }

        } else if (fbxModelRef.current) {
            // FBX model - test morph targets
            console.log('='.repeat(50));
            console.log('[VRMCompanion] TESTING FBX MORPH TARGETS');
            console.log('='.repeat(50));

            // Find all meshes with morph targets
            const meshesWithMorphs: { mesh: THREE.Mesh; morphs: string[] }[] = [];
            fbxModelRef.current.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
                    const morphNames = Object.keys(mesh.morphTargetDictionary);
                    if (morphNames.length > 0) {
                        meshesWithMorphs.push({ mesh, morphs: morphNames });
                        console.log(`[VRMCompanion] Mesh "${mesh.name}" has ${morphNames.length} morph targets:`, morphNames);
                    }
                }
            });

            if (meshesWithMorphs.length === 0) {
                setStatus('⚠️ No morph targets found on FBX model');
                setIsTesting(false);
                return;
            }

            setStatus(`Found ${meshesWithMorphs.length} mesh(es) with morph targets`);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Common Character Creator / ARKit blend shape patterns
            const ccMouthShapes = [
                // ARKit standard (52 blend shapes)
                'jawOpen', 'jawForward', 'jawLeft', 'jawRight',
                'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthLeft', 'mouthRight',
                'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight',
                'mouthDimpleLeft', 'mouthDimpleRight', 'mouthStretchLeft', 'mouthStretchRight',
                'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower', 'mouthShrugUpper',
                'mouthPressLeft', 'mouthPressRight', 'mouthLowerDownLeft', 'mouthLowerDownRight',
                'mouthUpperUpLeft', 'mouthUpperUpRight',

                // Character Creator variations
                'Mouth_Open', 'Mouth_Smile', 'Mouth_Wide', 'Mouth_Narrow',
                'Jaw_Open', 'Lips_Pucker', 'Lips_Funnel',

                // Viseme-like
                'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
                'V_Open', 'V_Explosive', 'V_Dental_Lip', 'V_Tight_O', 'V_Wide',
            ];

            // Test each mesh's morph targets
            for (const { mesh, morphs } of meshesWithMorphs) {
                setStatus(`Testing morphs on "${mesh.name}"...`);

                // Test common mouth shapes first
                for (const shapeName of ccMouthShapes) {
                    const morphIndex = mesh.morphTargetDictionary![shapeName];
                    if (morphIndex !== undefined && mesh.morphTargetInfluences) {
                        setStatus(`Testing: ${shapeName} ✓`);
                        console.log(`[VRMCompanion] Testing morph: "${shapeName}"`);

                        // Set morph value
                        mesh.morphTargetInfluences[morphIndex] = 1.0;
                        await new Promise(resolve => setTimeout(resolve, 600));

                        // Reset
                        mesh.morphTargetInfluences[morphIndex] = 0;
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }

                // Test ALL morph targets to see what they do
                setStatus(`Testing all ${morphs.length} morphs - watch closely!`);
                await new Promise(resolve => setTimeout(resolve, 1000));

                for (const morphName of morphs) {
                    setStatus(`Testing: "${morphName}"`);
                    console.log(`[VRMCompanion] Testing morph: "${morphName}"`);

                    const morphIndex = mesh.morphTargetDictionary![morphName];
                    if (morphIndex !== undefined && mesh.morphTargetInfluences) {
                        mesh.morphTargetInfluences[morphIndex] = 1.0;
                        await new Promise(resolve => setTimeout(resolve, 500));
                        mesh.morphTargetInfluences[morphIndex] = 0;
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            }

            setStatus('Done! Check console for all morph target names.');
            console.log('='.repeat(50));
            console.log('[VRMCompanion] FBX morph testing complete');
            console.log('='.repeat(50));
        } else {
            setStatus('⚠️ No model loaded or model has no blend shapes');
        }

        setIsTesting(false);
    }, [modelLoaded]);

    // Play a specific animation by index
    const playAnimation = useCallback((index: number) => {
        if (!mixerRef.current || !fbxModelRef.current) return;

        const model = vrmRef.current?.scene || fbxModelRef.current;
        if (!model) return;

        // Stop all current actions
        mixerRef.current.stopAllAction();

        // Get the animation clip
        const animations = (model as any).animations || (fbxModelRef.current as any).animations;
        if (!animations || index < 0 || index >= animations.length) return;

        // Play the selected animation
        const action = mixerRef.current.clipAction(animations[index]);
        action.reset();
        action.play();
        setCurrentAnimationIndex(index);
        setStatus(`Playing: ${availableAnimations[index]}`);
    }, [availableAnimations]);

    // Stop all animations
    const stopAnimation = useCallback(() => {
        if (!mixerRef.current) return;
        mixerRef.current.stopAllAction();
        setCurrentAnimationIndex(-1);
        setStatus('Animation stopped - idle pose');
    }, []);

    // Toggle mesh visibility
    const toggleMeshVisibility = useCallback((meshName: string) => {
        const meshItem = meshList.find(m => m.name === meshName);
        if (meshItem) {
            meshItem.mesh.visible = !meshItem.mesh.visible;
            setMeshList(prev => prev.map(m =>
                m.name === meshName ? { ...m, visible: m.mesh.visible } : m
            ));
        }
    }, [meshList]);

    return (
        <div className={`vrm-companion-container flex w-full h-full bg-black/40 backdrop-blur-md overflow-hidden border border-white/10 ${className}`}>
            {/* 3D Canvas - fills available space */}
            <div ref={containerRef} className="flex-1 relative h-full">
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm p-4 rounded-lg max-w-xs border border-cyan-500/30 pointer-events-none z-10">
                    <h1 className="text-lg font-bold mb-2 text-cyan-400">VRM Companion</h1>
                    <p className="text-sm text-gray-300">{status}</p>
                </div>

                {/* VR Button - Shows if vr-spatial-engine is installed, or prompts to install */}
                <div className="absolute top-4 right-4 z-20">
                    <VRButtonSlot
                        viewId="vrm-companion"
                        size="md"
                        variant="default"
                        onNotInstalled={() => {
                            console.log('[VRMCompanion] VR module not installed, prompting marketplace');
                        }}
                    />
                </div>
            </div>

            {/* Control Panel */}
            <div className="w-72 bg-black/60 p-4 overflow-y-auto border-l border-white/10">
                <h2 className="text-lg font-semibold mb-4 text-white">Controls</h2>

                {/* Model Selector */}
                {availableModels.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-md font-semibold mb-3 text-gray-400 uppercase tracking-wider text-xs">Model</h3>
                        <select
                            value={selectedModelUrl}
                            onChange={(e) => {
                                setSelectedModelUrl(e.target.value);
                                // Auto-reload when model changes
                                setTimeout(() => loadModel(), 100);
                            }}
                            className="w-full py-2 px-3 bg-black/60 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 mb-3"
                        >
                            <option value="">Select a model...</option>
                            {availableModels.map((model, i) => (
                                <option key={i} value={model.url}>{model.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Environment Selector */}
                {availableEnvironments.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-md font-semibold mb-3 text-gray-400 uppercase tracking-wider text-xs">Environment</h3>
                        <select
                            value={selectedEnvironmentUrl}
                            onChange={(e) => {
                                setSelectedEnvironmentUrl(e.target.value);
                                // Environment change is handled by useEffect
                            }}
                            className="w-full py-2 px-3 bg-black/60 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 mb-3"
                        >
                            {availableEnvironments.map((env, i) => (
                                <option key={i} value={env.url}>
                                    {env.name} ({env.projection})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 mb-6">
                    <button
                        onClick={loadVRM}
                        className="w-full py-2 px-4 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-black font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(0,255,153,0.3)] hover:shadow-[0_0_25px_rgba(0,255,153,0.5)]"
                    >
                        Reload Model
                    </button>

                    <button
                        onClick={playTTS}
                        disabled={!vrmLoaded || isPlaying}
                        className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                    >
                        {isPlaying ? 'Speaking...' : 'Demo TTS'}
                    </button>

                    <button
                        onClick={toggleMic}
                        disabled={!vrmLoaded}
                        className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${isMicActive
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                            } disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed`}
                    >
                        {isMicActive ? '🔴 Stop Mic' : '🎤 Start Mic'}
                    </button>

                    <button
                        onClick={testExpressions}
                        disabled={!modelLoaded || isTesting}
                        className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                    >
                        {isTesting ? 'Testing...' : '🎭 Test Expressions'}
                    </button>
                </div>

                {/* Toggles */}
                <div className="mb-6 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={amplitudeMode}
                            onChange={(e) => setAmplitudeMode(e.target.checked)}
                            className="w-4 h-4 accent-cyan-500"
                        />
                        <span className="text-sm text-gray-300">Amplitude-only mode</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={physicsEnabled}
                            onChange={(e) => setPhysicsEnabled(e.target.checked)}
                            className="w-4 h-4 accent-cyan-500"
                        />
                        <span className="text-sm text-gray-300">Enable physics (hair/cloth)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={blinkEnabled}
                            onChange={(e) => setBlinkEnabled(e.target.checked)}
                            className="w-4 h-4 accent-cyan-500"
                        />
                        <span className="text-sm text-gray-300">Auto blink (12-20s interval)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={headTrackingEnabled}
                            onChange={(e) => setHeadTrackingEnabled(e.target.checked)}
                            className="w-4 h-4 accent-cyan-500"
                        />
                        <span className="text-sm text-gray-300">Head/eye tracking (follow camera)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={idleAnimationEnabled}
                            onChange={(e) => setIdleAnimationEnabled(e.target.checked)}
                            className="w-4 h-4 accent-cyan-500"
                        />
                        <span className="text-sm text-gray-300">Idle animation (breathing, sway)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={speakingAnimationEnabled}
                            onChange={(e) => setSpeakingAnimationEnabled(e.target.checked)}
                            className="w-4 h-4 accent-cyan-500"
                        />
                        <span className="text-sm text-gray-300">Speaking animation (body gestures)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={vrHandIKEnabled}
                            onChange={(e) => setVrHandIKEnabled(e.target.checked)}
                            className="w-4 h-4 accent-cyan-500"
                        />
                        <span className="text-sm text-gray-300">VR Hand IK (controller tracking)</span>
                    </label>
                </div>

                {/* Animation Controls */}
                {availableAnimations.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-md font-semibold mb-3 text-gray-400 uppercase tracking-wider text-xs">
                            Animations ({availableAnimations.length})
                        </h3>
                        <div className="space-y-2">
                            <select
                                value={currentAnimationIndex}
                                onChange={(e) => {
                                    const idx = parseInt(e.target.value);
                                    if (idx >= 0) {
                                        playAnimation(idx);
                                    }
                                }}
                                className="w-full py-2 px-3 bg-black/60 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                            >
                                <option value={-1}>Select animation...</option>
                                {availableAnimations.map((name, i) => (
                                    <option key={i} value={i}>{name}</option>
                                ))}
                            </select>

                            <button
                                onClick={stopAnimation}
                                disabled={currentAnimationIndex === -1}
                                className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all text-sm"
                            >
                                ⏹️ Stop Animation
                            </button>
                        </div>
                    </div>
                )}

                {/* Config Sliders */}
                <h3 className="text-md font-semibold mb-3 text-gray-400 uppercase tracking-wider text-xs">Config</h3>
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-sm text-gray-400 block mb-1">
                            Smoothing: {smoothing.toFixed(2)}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={smoothing}
                            onChange={(e) => setSmoothing(parseFloat(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 block mb-1">
                            Gain: {gain.toFixed(2)}
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="5"
                            step="0.1"
                            value={gain}
                            onChange={(e) => setGain(parseFloat(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 block mb-1">
                            Max Mouth Open: {maxMouthOpen.toFixed(2)}
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.01"
                            value={maxMouthOpen}
                            onChange={(e) => setMaxMouthOpen(parseFloat(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 block mb-1">
                            Jaw Amplitude: {jawAmplitude.toFixed(2)}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={jawAmplitude}
                            onChange={(e) => setJawAmplitude(parseFloat(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Controls how much jaw opens based on audio volume</p>
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 block mb-1">
                            Idle Intensity: {idleIntensity.toFixed(2)}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={idleIntensity}
                            onChange={(e) => setIdleIntensity(parseFloat(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Breathing and micro-movement intensity</p>
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 block mb-1">
                            Speaking Intensity: {speakingIntensity.toFixed(2)}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={speakingIntensity}
                            onChange={(e) => setSpeakingIntensity(parseFloat(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Body gesture intensity while speaking</p>
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 block mb-1">
                            Light Intensity: {lightIntensity.toFixed(2)}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="3"
                            step="0.1"
                            value={lightIntensity}
                            onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                            className="w-full accent-yellow-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">HDR environment lighting intensity</p>
                    </div>
                </div>

                {/* Viseme Weights Display */}
                <h3 className="text-md font-semibold mb-3 text-gray-400 uppercase tracking-wider text-xs">Viseme Weights</h3>
                <div className="space-y-2 bg-black/40 p-3 rounded-lg font-mono text-sm border border-white/5 mb-6">
                    {Object.entries(visemeWeights).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                            <span className="w-8 text-gray-500">{key}:</span>
                            <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-75"
                                    style={{ width: `${value * 100}%` }}
                                />
                            </div>
                            <span className="w-14 text-right text-gray-500 text-xs">
                                {value.toFixed(3)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Available Expressions from VRM Metadata */}
                {availableExpressions.length > 0 && (
                    <>
                        <h3 className="text-md font-semibold mb-3 text-gray-400 uppercase tracking-wider text-xs">
                            Model Expressions ({availableExpressions.length})
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-xs border border-white/5 max-h-48 overflow-y-auto">
                            {availableExpressions.map((expr, i) => {
                                // Highlight mouth-related expressions
                                const isMouth = /mouth|mth|lip|jaw|smile|frown|open|close|vowel|viseme|^[AIUEO]$/i.test(expr);
                                const isViseme = ['aa', 'ih', 'ou', 'ee', 'oh'].includes(expr);
                                return (
                                    <div
                                        key={i}
                                        className={`py-0.5 ${isViseme ? 'text-emerald-400 font-bold' : isMouth ? 'text-cyan-400' : 'text-gray-500'}`}
                                    >
                                        {expr} {isViseme && '✓'} {isMouth && !isViseme && '○'}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Mesh Visibility Controls - FBX only */}
                {meshList.length > 0 && (
                    <>
                        <h3 className="text-md font-semibold mb-3 text-gray-400 uppercase tracking-wider text-xs">
                            Mesh Visibility ({meshList.length})
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-xs border border-white/5 max-h-64 overflow-y-auto mb-6">
                            {meshList.map((meshItem, i) => (
                                <label key={i} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-white/5 rounded px-1">
                                    <input
                                        type="checkbox"
                                        checked={meshItem.visible}
                                        onChange={() => toggleMeshVisibility(meshItem.name)}
                                        className="w-3 h-3 accent-cyan-500"
                                    />
                                    <span className={meshItem.visible ? 'text-gray-300' : 'text-gray-600 line-through'}>
                                        {meshItem.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VRMCompanion;
