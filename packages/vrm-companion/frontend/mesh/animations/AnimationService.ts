/**
 * AnimationService - Modular animation system for any mesh/model
 *
 * Features:
 * - Subtle idle animation (breathing, micro-movements)
 * - Speaking animation (gestures, body movement when TTS plays)
 * - Golden ratio based timing for natural movement
 * - Compatible with VRM, FBX, GLB or any rigged mesh
 * - Modular design - can be extended for mesh library
 */

import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { retargetAnimation } from 'vrm-mixamo-retarget';

// Animation source types
export type AnimationSourceType = 'mixamo' | 'cc4' | 'native';

export interface LoadedAnimation {
    clip: THREE.AnimationClip;
    sourceType: AnimationSourceType;
    name: string;
}

/**
 * Animation player state for a mesh instance
 */
interface AnimationPlayerState {
    mixer: THREE.AnimationMixer | null;
    currentAction: THREE.AnimationAction | null;
    loadedAnimations: Map<string, LoadedAnimation>;
    isPlaying: boolean;
}

// Golden ratio for natural timing
const PHI = 1.618033988749895;

export interface AnimationConfig {
    idleIntensity?: number;      // 0-1, how pronounced idle movements are
    speakingIntensity?: number;  // 0-1, how pronounced speaking gestures are
    breathingRate?: number;      // Breaths per minute (default ~14-16 for natural)
    enabled?: boolean;           // Master enable/disable
}

/**
 * Bone mapping configuration for different model types
 * This makes the system modular - add new mappings for different mesh types
 */
export interface BoneMapping {
    spine?: string | string[];
    spine1?: string | string[];
    spine2?: string | string[];
    chest?: string | string[];
    neck?: string | string[];
    leftShoulder?: string | string[];
    rightShoulder?: string | string[];
    leftArm?: string | string[];
    rightArm?: string | string[];
    hips?: string | string[];
    head?: string | string[];
}

/**
 * Pre-defined bone mappings for common model formats
 * Add new mappings here to support additional mesh libraries
 */
export const BONE_MAPPINGS: Record<string, BoneMapping> = {
    // Character Creator / Reallusion
    characterCreator: {
        spine: ['CC_Base_Spine01', 'cc_base_spine01', 'Spine01'],
        spine1: ['CC_Base_Spine02', 'cc_base_spine02', 'Spine02'],
        chest: ['CC_Base_Spine02', 'cc_base_spine02'],
        neck: ['CC_Base_NeckTwist01', 'cc_base_necktwist01', 'Neck'],
        hips: ['CC_Base_Hip', 'cc_base_hip', 'CC_Base_Pelvis', 'cc_base_pelvis', 'Hips'],
        leftShoulder: ['CC_Base_L_Clavicle', 'cc_base_l_clavicle', 'L_Clavicle'],
        rightShoulder: ['CC_Base_R_Clavicle', 'cc_base_r_clavicle', 'R_Clavicle'],
        leftArm: ['CC_Base_L_Upperarm', 'cc_base_l_upperarm', 'L_Upperarm'],
        rightArm: ['CC_Base_R_Upperarm', 'cc_base_r_upperarm', 'R_Upperarm'],
        head: ['CC_Base_Head', 'cc_base_head', 'Head'],
    },

    // Mixamo
    mixamo: {
        spine: ['mixamorigSpine', 'Spine'],
        spine1: ['mixamorigSpine1', 'Spine1'],
        spine2: ['mixamorigSpine2', 'Spine2'],
        chest: ['mixamorigSpine2'],
        neck: ['mixamorigNeck', 'Neck'],
        hips: ['mixamorigHips', 'Hips'],
        leftShoulder: ['mixamorigLeftShoulder', 'LeftShoulder'],
        rightShoulder: ['mixamorigRightShoulder', 'RightShoulder'],
        leftArm: ['mixamorigLeftArm', 'LeftArm'],
        rightArm: ['mixamorigRightArm', 'RightArm'],
        head: ['mixamorigHead', 'Head'],
    },

    // Generic / Blender Rigify / Unity Humanoid
    generic: {
        spine: ['spine', 'Spine', 'spine_01', 'Spine_01'],
        spine1: ['spine.001', 'Spine1', 'spine_02', 'Spine_02'],
        spine2: ['spine.002', 'Spine2', 'spine_03', 'Spine_03'],
        chest: ['chest', 'Chest', 'spine.002'],
        neck: ['neck', 'Neck', 'neck_01'],
        hips: ['hips', 'Hips', 'pelvis', 'Pelvis', 'root'],
        leftShoulder: ['shoulder.L', 'LeftShoulder', 'clavicle.L', 'Clavicle_L'],
        rightShoulder: ['shoulder.R', 'RightShoulder', 'clavicle.R', 'Clavicle_R'],
        leftArm: ['upper_arm.L', 'LeftUpperArm', 'upperarm.L', 'Arm_L'],
        rightArm: ['upper_arm.R', 'RightUpperArm', 'upperarm.R', 'Arm_R'],
        head: ['head', 'Head'],
    },

    // VRM / VRoid
    vrm: {
        // VRM uses humanoid.getNormalizedBoneNode(), names are standardized
        spine: ['spine'],
        chest: ['chest', 'upperChest'],
        neck: ['neck'],
        hips: ['hips'],
        leftShoulder: ['leftShoulder'],
        rightShoulder: ['rightShoulder'],
        leftArm: ['leftUpperArm'],
        rightArm: ['rightUpperArm'],
        head: ['head'],
    },

    // ReadyPlayerMe
    readyPlayerMe: {
        spine: ['Spine', 'spine'],
        spine1: ['Spine1'],
        spine2: ['Spine2'],
        chest: ['Spine2'],
        neck: ['Neck'],
        hips: ['Hips'],
        leftShoulder: ['LeftShoulder'],
        rightShoulder: ['RightShoulder'],
        leftArm: ['LeftArm'],
        rightArm: ['RightArm'],
        head: ['Head'],
    },
};

interface BoneRefs {
    spine?: THREE.Bone;
    spine1?: THREE.Bone;
    spine2?: THREE.Bone;
    chest?: THREE.Bone;
    neck?: THREE.Bone;
    leftShoulder?: THREE.Bone;
    rightShoulder?: THREE.Bone;
    leftArm?: THREE.Bone;
    rightArm?: THREE.Bone;
    hips?: THREE.Bone;
    head?: THREE.Bone;
}

interface OriginalRotations {
    [boneName: string]: THREE.Euler;
}

/**
 * Mesh instance data - stores per-mesh animation state
 */
interface MeshInstance {
    id: string;
    model: THREE.Object3D;
    vrm?: VRM;
    bones: BoneRefs;
    originalRotations: OriginalRotations;
    boneMapping: BoneMapping;
    config: Required<AnimationConfig>;
    isSpeaking: boolean;
    speakingIntensity: number;
    targetSpeakingIntensity: number;
    microMovementSeed: number;
    // Animation playback state
    animationState: AnimationPlayerState;
}

export class AnimationService {
    private instances: Map<string, MeshInstance> = new Map();
    private defaultConfig: Required<AnimationConfig>;

    // Timing state (shared across all instances)
    private time = 0;
    private breathPhase = 0;
    private idlePhase = 0;
    private speakingPhase = 0;

    constructor(config: AnimationConfig = {}) {
        this.defaultConfig = {
            idleIntensity: config.idleIntensity ?? 0.3,
            speakingIntensity: config.speakingIntensity ?? 0.5,
            breathingRate: config.breathingRate ?? 15,
            enabled: config.enabled ?? true,
        };
    }

    /**
     * Register a mesh/model with the animation service
     * @param id Unique identifier for this mesh
     * @param model The Three.js object (Group, Scene, etc.)
     * @param vrm Optional VRM instance if this is a VRM model
     * @param mappingType Pre-defined mapping name or custom BoneMapping
     * @param config Optional per-mesh config overrides
     */
    register(
        id: string,
        model: THREE.Object3D,
        vrm?: VRM,
        mappingType: string | BoneMapping = 'generic',
        config?: Partial<AnimationConfig>
    ): void {
        // Get bone mapping
        const boneMapping = typeof mappingType === 'string'
            ? BONE_MAPPINGS[mappingType] || BONE_MAPPINGS.generic
            : mappingType;

        const instance: MeshInstance = {
            id,
            model,
            vrm,
            bones: {},
            originalRotations: {},
            boneMapping,
            config: { ...this.defaultConfig, ...config },
            isSpeaking: false,
            speakingIntensity: 0,
            targetSpeakingIntensity: 0,
            microMovementSeed: Math.random() * 1000,
            animationState: {
                mixer: null,
                currentAction: null,
                loadedAnimations: new Map(),
                isPlaying: false,
            },
        };

        // Find bones
        if (vrm) {
            this.findVRMBones(instance);
        } else {
            this.findModelBones(instance);
        }

        // Store original rotations
        this.storeOriginalRotations(instance);

        this.instances.set(id, instance);
        console.log(`[AnimationService] Registered mesh "${id}" with ${Object.keys(instance.bones).length} bones`);
    }

    /**
     * Unregister a mesh from the animation service
     */
    unregister(id: string): void {
        const instance = this.instances.get(id);
        if (instance) {
            this.resetInstance(instance);
            this.instances.delete(id);
            console.log(`[AnimationService] Unregistered mesh "${id}"`);
        }
    }

    /**
     * Connect to a VRM model (convenience method)
     */
    connectToVRM(vrm: VRM, id = 'default'): void {
        this.register(id, vrm.scene, vrm, 'vrm');
    }

    /**
     * Connect to an FBX model (convenience method)
     * Attempts to auto-detect the bone mapping
     */
    connectToFBX(model: THREE.Group, id = 'default'): void {
        // Auto-detect mapping by checking for known bone names
        let mappingType = 'generic';

        model.traverse((child) => {
            if ((child as THREE.Bone).isBone) {
                const name = child.name.toLowerCase();
                if (name.includes('cc_base') || name.includes('cc_base')) {
                    mappingType = 'characterCreator';
                } else if (name.includes('mixamorig')) {
                    mappingType = 'mixamo';
                }
            }
        });

        console.log(`[AnimationService] Auto-detected bone mapping: ${mappingType}`);
        this.register(id, model, undefined, mappingType);
    }

    /**
     * Find VRM humanoid bones
     */
    private findVRMBones(instance: MeshInstance): void {
        if (!instance.vrm?.humanoid) return;

        const humanoid = instance.vrm.humanoid;
        const mapping = instance.boneMapping;

        // Map VRM humanoid bones
        if (mapping.spine) {
            const names = Array.isArray(mapping.spine) ? mapping.spine : [mapping.spine];
            for (const name of names) {
                const bone = humanoid.getNormalizedBoneNode(name as any);
                if (bone) {
                    instance.bones.spine = bone as THREE.Bone;
                    break;
                }
            }
        }

        if (mapping.chest) {
            const names = Array.isArray(mapping.chest) ? mapping.chest : [mapping.chest];
            for (const name of names) {
                const bone = humanoid.getNormalizedBoneNode(name as any);
                if (bone) {
                    instance.bones.chest = bone as THREE.Bone;
                    break;
                }
            }
        }

        if (mapping.neck) {
            const names = Array.isArray(mapping.neck) ? mapping.neck : [mapping.neck];
            for (const name of names) {
                const bone = humanoid.getNormalizedBoneNode(name as any);
                if (bone) {
                    instance.bones.neck = bone as THREE.Bone;
                    break;
                }
            }
        }

        if (mapping.hips) {
            const names = Array.isArray(mapping.hips) ? mapping.hips : [mapping.hips];
            for (const name of names) {
                const bone = humanoid.getNormalizedBoneNode(name as any);
                if (bone) {
                    instance.bones.hips = bone as THREE.Bone;
                    break;
                }
            }
        }

        if (mapping.leftShoulder) {
            const names = Array.isArray(mapping.leftShoulder) ? mapping.leftShoulder : [mapping.leftShoulder];
            for (const name of names) {
                const bone = humanoid.getNormalizedBoneNode(name as any);
                if (bone) {
                    instance.bones.leftShoulder = bone as THREE.Bone;
                    break;
                }
            }
        }

        if (mapping.rightShoulder) {
            const names = Array.isArray(mapping.rightShoulder) ? mapping.rightShoulder : [mapping.rightShoulder];
            for (const name of names) {
                const bone = humanoid.getNormalizedBoneNode(name as any);
                if (bone) {
                    instance.bones.rightShoulder = bone as THREE.Bone;
                    break;
                }
            }
        }

        if (mapping.leftArm) {
            const names = Array.isArray(mapping.leftArm) ? mapping.leftArm : [mapping.leftArm];
            for (const name of names) {
                const bone = humanoid.getNormalizedBoneNode(name as any);
                if (bone) {
                    instance.bones.leftArm = bone as THREE.Bone;
                    break;
                }
            }
        }

        if (mapping.rightArm) {
            const names = Array.isArray(mapping.rightArm) ? mapping.rightArm : [mapping.rightArm];
            for (const name of names) {
                const bone = humanoid.getNormalizedBoneNode(name as any);
                if (bone) {
                    instance.bones.rightArm = bone as THREE.Bone;
                    break;
                }
            }
        }

        if (mapping.head) {
            const names = Array.isArray(mapping.head) ? mapping.head : [mapping.head];
            for (const name of names) {
                const bone = humanoid.getNormalizedBoneNode(name as any);
                if (bone) {
                    instance.bones.head = bone as THREE.Bone;
                    break;
                }
            }
        }

        console.log('[AnimationService] VRM bones found:', Object.entries(instance.bones)
            .filter(([_, v]) => v !== undefined)
            .map(([k]) => k));
    }

    /**
     * Find bones in a generic model using bone mapping
     */
    private findModelBones(instance: MeshInstance): void {
        const mapping = instance.boneMapping;

        instance.model.traverse((child) => {
            if (!(child as THREE.Bone).isBone) return;
            const bone = child as THREE.Bone;
            const name = bone.name;

            // Check each bone type
            for (const [boneKey, patterns] of Object.entries(mapping)) {
                if (instance.bones[boneKey as keyof BoneRefs]) continue; // Already found

                const patternArray = Array.isArray(patterns) ? patterns : [patterns];
                for (const pattern of patternArray) {
                    if (name === pattern || name.toLowerCase() === pattern.toLowerCase()) {
                        instance.bones[boneKey as keyof BoneRefs] = bone;
                        console.log(`[AnimationService] Found ${boneKey}: ${name}`);
                        break;
                    }
                }
            }
        });
    }

    /**
     * Store original bone rotations for blending
     */
    private storeOriginalRotations(instance: MeshInstance): void {
        instance.originalRotations = {};
        for (const [key, bone] of Object.entries(instance.bones)) {
            if (bone) {
                instance.originalRotations[key] = bone.rotation.clone();
            }
        }
    }

    /**
     * Apply a relaxed pose to get the model out of T-pose
     * This should be called after registration to establish a natural baseline
     * Arms are lowered to ~45 degrees, slight natural body asymmetry added
     */
    applyRelaxedPose(id = 'default'): void {
        const instance = this.instances.get(id);
        if (!instance) {
            console.warn(`[AnimationService] Cannot apply relaxed pose: mesh "${id}" not registered`);
            return;
        }

        const bones = instance.bones;
        const isVRM = !!instance.vrm;

        // VRM normalized bones use a different coordinate system than FBX
        // VRM: Y-up, Z-forward, arms rotate on Z axis but inverted from FBX
        // FBX/CC4: May vary, typically Z rotation for arm lowering

        if (isVRM && instance.vrm?.humanoid) {
            // Get RAW bone nodes and rotate directly
            // VRM normalized bones are proxies - raw bones are the actual skeleton
            const humanoid = instance.vrm.humanoid;

            // Get raw bone nodes (not normalized)
            const leftUpperArm = humanoid.getRawBoneNode('leftUpperArm');
            const rightUpperArm = humanoid.getRawBoneNode('rightUpperArm');

            console.log('[AnimationService] VRM raw bones:', {
                leftUpperArm: leftUpperArm?.name,
                rightUpperArm: rightUpperArm?.name,
            });

            // Apply rotation to raw bones - try all axes to find the right one
            // VRM models vary in their bone orientation
            if (leftUpperArm) {
                // Try rotating on Z axis first (most common for lowering arms)
                leftUpperArm.rotation.z += 0.6;  // ~34 degrees
                console.log('[AnimationService] Left arm rotated, new rotation:', leftUpperArm.rotation.toArray());
            }
            if (rightUpperArm) {
                rightUpperArm.rotation.z -= 0.6;  // Opposite for right
                console.log('[AnimationService] Right arm rotated, new rotation:', rightUpperArm.rotation.toArray());
            }

            console.log(`[AnimationService] Applied VRM relaxed pose via raw bones to "${id}"`);
        } else {
            // FBX/CC4/Generic bone rotations
            if (bones.leftArm) {
                bones.leftArm.rotation.z += 0.7;  // Lower arm (~40 degrees)
                bones.leftArm.rotation.x -= 0.15; // Slight forward rotation
                bones.leftArm.rotation.y += 0.1;  // Slight inward rotation
            }

            if (bones.rightArm) {
                bones.rightArm.rotation.z -= 0.7;  // Lower arm
                bones.rightArm.rotation.x -= 0.15; // Slight forward rotation
                bones.rightArm.rotation.y -= 0.1;  // Slight inward rotation
            }

            // Slight natural body asymmetry
            if (bones.spine) {
                bones.spine.rotation.z += 0.01;
            }

            if (bones.hips) {
                bones.hips.rotation.z -= 0.005;
            }

            // Shoulders slightly forward
            if (bones.leftShoulder) {
                bones.leftShoulder.rotation.y += 0.05;
            }
            if (bones.rightShoulder) {
                bones.rightShoulder.rotation.y -= 0.05;
            }

            console.log(`[AnimationService] Applied FBX relaxed pose to "${id}"`);
        }

        // Update original rotations to use relaxed pose as baseline
        this.storeOriginalRotations(instance);
    }

    /**
     * Apply relaxed pose to all registered meshes
     */
    applyRelaxedPoseAll(): void {
        for (const id of this.instances.keys()) {
            this.applyRelaxedPose(id);
        }
    }

    /**
     * Set speaking state for a specific mesh
     */
    setSpeaking(speaking: boolean, id = 'default'): void {
        const instance = this.instances.get(id);
        if (!instance) return;

        instance.isSpeaking = speaking;
        instance.targetSpeakingIntensity = speaking ? 1 : 0;

        if (speaking) {
            this.speakingPhase = 0;
        }
    }

    /**
     * Set speaking state for all meshes
     */
    setSpeakingAll(speaking: boolean): void {
        for (const instance of this.instances.values()) {
            instance.isSpeaking = speaking;
            instance.targetSpeakingIntensity = speaking ? 1 : 0;
        }
        if (speaking) {
            this.speakingPhase = 0;
        }
    }

    /**
     * Update configuration for a specific mesh
     */
    updateConfig(config: Partial<AnimationConfig>, id = 'default'): void {
        const instance = this.instances.get(id);
        if (instance) {
            Object.assign(instance.config, config);
        }
    }

    /**
     * Update default configuration (applies to new registrations)
     */
    updateDefaultConfig(config: Partial<AnimationConfig>): void {
        Object.assign(this.defaultConfig, config);
    }

    /**
     * Smooth noise function using golden ratio harmonics
     */
    private goldenNoise(t: number, seed: number = 0): number {
        const x = (t + seed) * PHI;
        const y = Math.sin(x) + Math.sin(x * PHI) * 0.5 + Math.sin(x * PHI * PHI) * 0.25;
        return y / 1.75;
    }

    /**
     * Main update loop - call every frame with delta time
     */
    update(dt: number): void {
        this.time += dt;

        // Update shared phases
        const breathCycleLength = 60 / this.defaultConfig.breathingRate;
        this.breathPhase = (this.time % breathCycleLength) / breathCycleLength;
        this.idlePhase = (this.time % (breathCycleLength * PHI)) / (breathCycleLength * PHI);
        this.speakingPhase += dt * 2;

        // Update each registered instance
        for (const instance of this.instances.values()) {
            if (!instance.config.enabled) continue;

            // Update animation mixer (for file-based animations)
            this.updateAnimationMixer(instance, dt);

            // Skip procedural animations if playing a file-based animation
            if (instance.animationState.isPlaying) {
                continue;
            }

            // Smooth speaking intensity
            const speakingSmooth = dt * 3;
            instance.speakingIntensity = THREE.MathUtils.lerp(
                instance.speakingIntensity,
                instance.targetSpeakingIntensity,
                speakingSmooth
            );

            // Apply procedural animations (only when not playing file animations)
            this.applyBreathing(instance);
            this.applyIdleMicroMovements(instance);

            if (instance.speakingIntensity > 0.01) {
                this.applySpeakingAnimation(instance);
            }
        }
    }

    /**
     * Apply breathing animation
     */
    private applyBreathing(instance: MeshInstance): void {
        const intensity = instance.config.idleIntensity;
        const bones = instance.bones;
        const orig = instance.originalRotations;

        // Golden ratio based breathing curve
        const inhalePoint = 1 / PHI;
        let breathWeight: number;

        if (this.breathPhase < inhalePoint) {
            const t = this.breathPhase / inhalePoint;
            breathWeight = Math.sin(t * Math.PI / 2);
        } else {
            const t = (this.breathPhase - inhalePoint) / (1 - inhalePoint);
            breathWeight = Math.cos(t * Math.PI / 2);
        }

        if (bones.spine && orig['spine']) {
            const breathAmount = breathWeight * 0.015 * intensity;
            bones.spine.rotation.x = orig['spine'].x - breathAmount;
        }

        if (bones.chest && orig['chest']) {
            const breathAmount = breathWeight * 0.02 * intensity;
            bones.chest.rotation.x = orig['chest'].x - breathAmount;
        }

        if (bones.leftShoulder && orig['leftShoulder']) {
            const shoulderRise = breathWeight * 0.01 * intensity;
            bones.leftShoulder.rotation.z = orig['leftShoulder'].z - shoulderRise;
        }

        if (bones.rightShoulder && orig['rightShoulder']) {
            const shoulderRise = breathWeight * 0.01 * intensity;
            bones.rightShoulder.rotation.z = orig['rightShoulder'].z + shoulderRise;
        }
    }

    /**
     * Apply subtle idle micro-movements
     */
    private applyIdleMicroMovements(instance: MeshInstance): void {
        const intensity = instance.config.idleIntensity;
        const bones = instance.bones;
        const orig = instance.originalRotations;
        const seed = instance.microMovementSeed;

        const sway = this.goldenNoise(this.time * 0.3, seed) * intensity * 0.02;
        const tilt = this.goldenNoise(this.time * 0.2, seed + 100) * intensity * 0.01;

        if (bones.hips && orig['hips']) {
            bones.hips.rotation.z = orig['hips'].z + sway;
            bones.hips.rotation.x = orig['hips'].x + tilt;
        }

        if (bones.spine && orig['spine']) {
            bones.spine.rotation.z = orig['spine'].z - sway * 0.5;
        }

        if (bones.neck && orig['neck']) {
            const neckSway = this.goldenNoise(this.time * 0.15, seed + 200) * intensity * 0.01;
            bones.neck.rotation.z = orig['neck'].z + neckSway;
        }
    }

    /**
     * Apply speaking animation
     */
    private applySpeakingAnimation(instance: MeshInstance): void {
        const intensity = instance.config.speakingIntensity * instance.speakingIntensity;
        const bones = instance.bones;
        const orig = instance.originalRotations;

        const emphasis = Math.sin(this.speakingPhase * 1.5) * intensity * 0.03;
        const sideEmphasis = Math.sin(this.speakingPhase * 0.8 + PHI) * intensity * 0.02;

        if (bones.spine) {
            bones.spine.rotation.x = bones.spine.rotation.x - emphasis;
            bones.spine.rotation.z = bones.spine.rotation.z + sideEmphasis;
        }

        if (bones.chest) {
            bones.chest.rotation.x = bones.chest.rotation.x - emphasis * 0.5;
        }

        const armGesture = Math.sin(this.speakingPhase * 1.2) * intensity * 0.05;
        const armOffset = Math.sin(this.speakingPhase * 0.7) * intensity * 0.03;

        if (bones.leftArm && orig['leftArm']) {
            bones.leftArm.rotation.x = orig['leftArm'].x - armGesture;
            bones.leftArm.rotation.z = orig['leftArm'].z + armOffset;
        }

        if (bones.rightArm && orig['rightArm']) {
            const rightArmGesture = Math.sin(this.speakingPhase * 1.2 + PHI) * intensity * 0.05;
            const rightArmOffset = Math.sin(this.speakingPhase * 0.7 + PHI) * intensity * 0.03;
            bones.rightArm.rotation.x = orig['rightArm'].x - rightArmGesture;
            bones.rightArm.rotation.z = orig['rightArm'].z - rightArmOffset;
        }

        const shoulderEmphasis = Math.max(0, Math.sin(this.speakingPhase * 2)) * intensity * 0.02;

        if (bones.leftShoulder) {
            bones.leftShoulder.rotation.z = bones.leftShoulder.rotation.z - shoulderEmphasis;
        }

        if (bones.rightShoulder) {
            bones.rightShoulder.rotation.z = bones.rightShoulder.rotation.z + shoulderEmphasis;
        }
    }

    /**
     * Reset a specific instance to original rotations
     */
    private resetInstance(instance: MeshInstance): void {
        for (const [key, bone] of Object.entries(instance.bones)) {
            if (bone && instance.originalRotations[key]) {
                bone.rotation.copy(instance.originalRotations[key]);
            }
        }
    }

    /**
     * Reset all bones to original rotations
     */
    reset(id?: string): void {
        if (id) {
            const instance = this.instances.get(id);
            if (instance) this.resetInstance(instance);
        } else {
            for (const instance of this.instances.values()) {
                this.resetInstance(instance);
            }
        }
    }

    /**
     * Get all registered mesh IDs
     */
    getRegisteredIds(): string[] {
        return Array.from(this.instances.keys());
    }

    /**
     * Check if a mesh is registered
     */
    isRegistered(id: string): boolean {
        return this.instances.has(id);
    }

    // =========================================
    // ANIMATION FILE LOADING & PLAYBACK
    // =========================================

    private fbxLoader: FBXLoader | null = null;

    /**
     * Get or create FBX loader (lazy initialization)
     */
    private getFBXLoader(): FBXLoader {
        if (!this.fbxLoader) {
            this.fbxLoader = new FBXLoader();
        }
        return this.fbxLoader;
    }

    /**
     * Load a Mixamo animation from FBX file and retarget it for VRM
     * @param url URL or path to the FBX animation file
     * @param animationName Name to store the animation under
     * @param meshId ID of the mesh instance to load for
     * @returns Promise resolving to the loaded animation clip
     */
    async loadMixamoAnimation(
        url: string,
        animationName: string,
        meshId = 'default'
    ): Promise<THREE.AnimationClip | null> {
        const instance = this.instances.get(meshId);
        if (!instance) {
            console.error(`[AnimationService] Cannot load animation: mesh "${meshId}" not registered`);
            return null;
        }

        if (!instance.vrm) {
            console.error(`[AnimationService] Mixamo retargeting requires a VRM model`);
            return null;
        }

        try {
            console.log(`[AnimationService] Loading Mixamo animation: ${url}`);
            const loader = this.getFBXLoader();

            const fbxAsset = await loader.loadAsync(url);
            console.log(`[AnimationService] FBX loaded, retargeting to VRM...`);

            // Use vrm-mixamo-retarget to convert the animation
            const clip = retargetAnimation(fbxAsset, instance.vrm);

            if (!clip) {
                console.error(`[AnimationService] Failed to retarget animation`);
                return null;
            }

            // Store the loaded animation
            const loadedAnim: LoadedAnimation = {
                clip,
                sourceType: 'mixamo',
                name: animationName,
            };
            instance.animationState.loadedAnimations.set(animationName, loadedAnim);

            // Create mixer if not exists
            if (!instance.animationState.mixer) {
                instance.animationState.mixer = new THREE.AnimationMixer(instance.vrm.scene);
            }

            console.log(`[AnimationService] Animation "${animationName}" loaded and ready`);
            return clip;
        } catch (error) {
            console.error(`[AnimationService] Failed to load animation:`, error);
            return null;
        }
    }

    /**
     * Load a CC4 animation from FBX file (for CC4 models, no retargeting needed)
     * @param url URL or path to the FBX animation file
     * @param animationName Name to store the animation under
     * @param meshId ID of the mesh instance to load for
     */
    async loadCC4Animation(
        url: string,
        animationName: string,
        meshId = 'default'
    ): Promise<THREE.AnimationClip | null> {
        const instance = this.instances.get(meshId);
        if (!instance) {
            console.error(`[AnimationService] Cannot load animation: mesh "${meshId}" not registered`);
            return null;
        }

        try {
            console.log(`[AnimationService] Loading CC4 animation: ${url}`);
            const loader = this.getFBXLoader();

            const fbxAsset = await loader.loadAsync(url);

            // CC4 animations come with the FBX - extract the first animation
            if (!fbxAsset.animations || fbxAsset.animations.length === 0) {
                console.error(`[AnimationService] No animations found in FBX file`);
                return null;
            }

            const clip = fbxAsset.animations[0];
            clip.name = animationName;

            // Store the loaded animation
            const loadedAnim: LoadedAnimation = {
                clip,
                sourceType: 'cc4',
                name: animationName,
            };
            instance.animationState.loadedAnimations.set(animationName, loadedAnim);

            // Create mixer if not exists
            if (!instance.animationState.mixer) {
                instance.animationState.mixer = new THREE.AnimationMixer(instance.model);
            }

            console.log(`[AnimationService] CC4 Animation "${animationName}" loaded and ready`);
            return clip;
        } catch (error) {
            console.error(`[AnimationService] Failed to load CC4 animation:`, error);
            return null;
        }
    }

    /**
     * Play a loaded animation
     * @param animationName Name of the animation to play
     * @param meshId ID of the mesh instance
     * @param options Playback options
     */
    playAnimation(
        animationName: string,
        meshId = 'default',
        options: {
            loop?: boolean;
            fadeIn?: number;
            fadeOut?: number;
            timeScale?: number;
        } = {}
    ): boolean {
        const instance = this.instances.get(meshId);
        if (!instance) {
            console.error(`[AnimationService] Cannot play animation: mesh "${meshId}" not registered`);
            return false;
        }

        const loadedAnim = instance.animationState.loadedAnimations.get(animationName);
        if (!loadedAnim) {
            console.error(`[AnimationService] Animation "${animationName}" not loaded`);
            return false;
        }

        if (!instance.animationState.mixer) {
            // Create mixer on the correct target
            const target = instance.vrm ? instance.vrm.scene : instance.model;
            instance.animationState.mixer = new THREE.AnimationMixer(target);
        }

        const mixer = instance.animationState.mixer;
        const { loop = true, fadeIn = 0.3, fadeOut = 0.3, timeScale = 1 } = options;

        // Fade out current action if playing
        if (instance.animationState.currentAction) {
            instance.animationState.currentAction.fadeOut(fadeOut);
        }

        // Create and play new action
        const action = mixer.clipAction(loadedAnim.clip);
        action.reset();
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        action.clampWhenFinished = !loop;
        action.timeScale = timeScale;
        action.fadeIn(fadeIn);
        action.play();

        instance.animationState.currentAction = action;
        instance.animationState.isPlaying = true;

        console.log(`[AnimationService] Playing animation "${animationName}" (loop: ${loop})`);
        return true;
    }

    /**
     * Stop the current animation
     * @param meshId ID of the mesh instance
     * @param fadeOut Fade out duration in seconds
     */
    stopAnimation(meshId = 'default', fadeOut = 0.3): void {
        const instance = this.instances.get(meshId);
        if (!instance) return;

        if (instance.animationState.currentAction) {
            instance.animationState.currentAction.fadeOut(fadeOut);
            instance.animationState.currentAction = null;
        }
        instance.animationState.isPlaying = false;
    }

    /**
     * Crossfade to a different animation
     * @param animationName Name of the animation to crossfade to
     * @param meshId ID of the mesh instance
     * @param duration Crossfade duration in seconds
     */
    crossfadeTo(animationName: string, meshId = 'default', duration = 0.5): boolean {
        const instance = this.instances.get(meshId);
        if (!instance) return false;

        const loadedAnim = instance.animationState.loadedAnimations.get(animationName);
        if (!loadedAnim || !instance.animationState.mixer) return false;

        const mixer = instance.animationState.mixer;
        const newAction = mixer.clipAction(loadedAnim.clip);

        if (instance.animationState.currentAction) {
            instance.animationState.currentAction.crossFadeTo(newAction, duration, true);
        }

        newAction.reset();
        newAction.setLoop(THREE.LoopRepeat, Infinity);
        newAction.play();

        instance.animationState.currentAction = newAction;
        instance.animationState.isPlaying = true;

        return true;
    }

    /**
     * Check if an animation is loaded
     */
    hasAnimation(animationName: string, meshId = 'default'): boolean {
        const instance = this.instances.get(meshId);
        return instance?.animationState.loadedAnimations.has(animationName) ?? false;
    }

    /**
     * Get list of loaded animation names
     */
    getLoadedAnimations(meshId = 'default'): string[] {
        const instance = this.instances.get(meshId);
        if (!instance) return [];
        return Array.from(instance.animationState.loadedAnimations.keys());
    }

    /**
     * Update animation mixer - MUST be called in the update loop
     * This is called automatically by the main update() method
     */
    private updateAnimationMixer(instance: MeshInstance, dt: number): void {
        if (instance.animationState.mixer && instance.animationState.isPlaying) {
            instance.animationState.mixer.update(dt);
        }
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        // Stop all animations and dispose mixers
        for (const instance of this.instances.values()) {
            if (instance.animationState.mixer) {
                instance.animationState.mixer.stopAllAction();
                instance.animationState.mixer = null;
            }
            instance.animationState.loadedAnimations.clear();
        }

        this.reset();
        this.instances.clear();
        this.fbxLoader = null;
    }
}

export default AnimationService;
