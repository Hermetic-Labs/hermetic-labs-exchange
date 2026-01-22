/**
 * VRIKService - VR Hand and Body IK System Foundation
 *
 * Features:
 * - VR controller tracking for hand IK
 * - Full body IK support for VR headsets
 * - Compatible with WebXR API
 * - Works with VRM, FBX, and any rigged mesh
 * - Modular design for mesh library integration
 *
 * This is a foundation service - full implementation requires:
 * - WebXR session management
 * - Controller pose tracking
 * - IK solver (FABRIK, CCD, or analytical)
 */

import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

export interface VRIKConfig {
    enabled?: boolean;
    handIKEnabled?: boolean;      // Track hands to controllers
    headIKEnabled?: boolean;      // Track head to HMD
    elbowHintWeight?: number;     // How much elbow hints affect arm IK (0-1)
    shoulderRotation?: boolean;   // Allow shoulder rotation for better reach
    fingerTracking?: boolean;     // Enable finger tracking if available
}

/**
 * IK target positions from VR controllers/HMD
 */
export interface VRIKTargets {
    head?: THREE.Vector3;
    headRotation?: THREE.Quaternion;
    leftHand?: THREE.Vector3;
    leftHandRotation?: THREE.Quaternion;
    rightHand?: THREE.Vector3;
    rightHandRotation?: THREE.Quaternion;
    // Optional finger tracking data
    leftFingers?: Record<string, THREE.Quaternion>;
    rightFingers?: Record<string, THREE.Quaternion>;
}

/**
 * Bone chain for IK solving
 */
interface IKChain {
    bones: THREE.Bone[];
    effector: THREE.Bone;
    target: THREE.Vector3;
    targetRotation?: THREE.Quaternion;
    hint?: THREE.Vector3;  // Pole target / elbow hint
}

/**
 * Hand bone mapping for different model formats
 */
export interface HandBoneMapping {
    shoulder?: string | string[];
    upperArm?: string | string[];
    forearm?: string | string[];
    hand?: string | string[];
    // Finger bones
    thumb?: { proximal?: string; intermediate?: string; distal?: string };
    index?: { proximal?: string; intermediate?: string; distal?: string };
    middle?: { proximal?: string; intermediate?: string; distal?: string };
    ring?: { proximal?: string; intermediate?: string; distal?: string };
    pinky?: { proximal?: string; intermediate?: string; distal?: string };
}

/**
 * Pre-defined hand bone mappings for common model formats
 */
export const HAND_BONE_MAPPINGS: Record<string, { left: HandBoneMapping; right: HandBoneMapping }> = {
    characterCreator: {
        left: {
            shoulder: ['CC_Base_L_Clavicle', 'L_Clavicle'],
            upperArm: ['CC_Base_L_Upperarm', 'L_Upperarm'],
            forearm: ['CC_Base_L_Forearm', 'L_Forearm'],
            hand: ['CC_Base_L_Hand', 'L_Hand'],
        },
        right: {
            shoulder: ['CC_Base_R_Clavicle', 'R_Clavicle'],
            upperArm: ['CC_Base_R_Upperarm', 'R_Upperarm'],
            forearm: ['CC_Base_R_Forearm', 'R_Forearm'],
            hand: ['CC_Base_R_Hand', 'R_Hand'],
        },
    },

    mixamo: {
        left: {
            shoulder: ['mixamorigLeftShoulder', 'LeftShoulder'],
            upperArm: ['mixamorigLeftArm', 'LeftArm'],
            forearm: ['mixamorigLeftForeArm', 'LeftForeArm'],
            hand: ['mixamorigLeftHand', 'LeftHand'],
        },
        right: {
            shoulder: ['mixamorigRightShoulder', 'RightShoulder'],
            upperArm: ['mixamorigRightArm', 'RightArm'],
            forearm: ['mixamorigRightForeArm', 'RightForeArm'],
            hand: ['mixamorigRightHand', 'RightHand'],
        },
    },

    vrm: {
        left: {
            shoulder: ['leftShoulder'],
            upperArm: ['leftUpperArm'],
            forearm: ['leftLowerArm'],
            hand: ['leftHand'],
        },
        right: {
            shoulder: ['rightShoulder'],
            upperArm: ['rightUpperArm'],
            forearm: ['rightLowerArm'],
            hand: ['rightHand'],
        },
    },

    generic: {
        left: {
            shoulder: ['shoulder.L', 'LeftShoulder', 'Clavicle_L'],
            upperArm: ['upper_arm.L', 'LeftUpperArm', 'Arm_L'],
            forearm: ['forearm.L', 'LeftForearm', 'ForeArm_L'],
            hand: ['hand.L', 'LeftHand', 'Hand_L'],
        },
        right: {
            shoulder: ['shoulder.R', 'RightShoulder', 'Clavicle_R'],
            upperArm: ['upper_arm.R', 'RightUpperArm', 'Arm_R'],
            forearm: ['forearm.R', 'RightForearm', 'ForeArm_R'],
            hand: ['hand.R', 'RightHand', 'Hand_R'],
        },
    },
};

/**
 * VR IK instance data - stores per-mesh IK state
 */
interface VRIKInstance {
    id: string;
    model: THREE.Object3D;
    vrm?: VRM;
    config: Required<VRIKConfig>;
    leftArmChain: IKChain | null;
    rightArmChain: IKChain | null;
    headBone: THREE.Bone | null;
    originalPoses: Map<THREE.Bone, { position: THREE.Vector3; rotation: THREE.Quaternion }>;
}

export class VRIKService {
    private instances: Map<string, VRIKInstance> = new Map();
    private defaultConfig: Required<VRIKConfig>;
    private xrSession: XRSession | null = null;
    private xrReferenceSpace: XRReferenceSpace | null = null;

    // Current IK targets (updated from WebXR input)
    private targets: VRIKTargets = {};

    constructor(config: VRIKConfig = {}) {
        this.defaultConfig = {
            enabled: config.enabled ?? false,
            handIKEnabled: config.handIKEnabled ?? true,
            headIKEnabled: config.headIKEnabled ?? true,
            elbowHintWeight: config.elbowHintWeight ?? 0.5,
            shoulderRotation: config.shoulderRotation ?? true,
            fingerTracking: config.fingerTracking ?? false,
        };
    }

    /**
     * Register a mesh/model for VR IK
     */
    register(
        id: string,
        model: THREE.Object3D,
        vrm?: VRM,
        mappingType = 'generic',
        config?: Partial<VRIKConfig>
    ): void {
        const instance: VRIKInstance = {
            id,
            model,
            vrm,
            config: { ...this.defaultConfig, ...config },
            leftArmChain: null,
            rightArmChain: null,
            headBone: null,
            originalPoses: new Map(),
        };

        // Find and set up IK chains
        this.setupIKChains(instance, mappingType);

        this.instances.set(id, instance);
        console.log(`[VRIKService] Registered mesh "${id}"`);
    }

    /**
     * Unregister a mesh
     */
    unregister(id: string): void {
        const instance = this.instances.get(id);
        if (instance) {
            this.resetPoses(instance);
            this.instances.delete(id);
        }
    }

    /**
     * Connect to a VRM model
     */
    connectToVRM(vrm: VRM, id = 'default'): void {
        this.register(id, vrm.scene, vrm, 'vrm');
    }

    /**
     * Connect to an FBX model
     */
    connectToFBX(model: THREE.Group, id = 'default'): void {
        // Auto-detect mapping
        let mappingType = 'generic';
        model.traverse((child) => {
            if ((child as THREE.Bone).isBone) {
                const name = child.name.toLowerCase();
                if (name.includes('cc_base')) {
                    mappingType = 'characterCreator';
                } else if (name.includes('mixamorig')) {
                    mappingType = 'mixamo';
                }
            }
        });
        this.register(id, model, undefined, mappingType);
    }

    /**
     * Set up IK chains for arms
     */
    private setupIKChains(instance: VRIKInstance, mappingType: string): void {
        const mapping = HAND_BONE_MAPPINGS[mappingType] || HAND_BONE_MAPPINGS.generic;

        if (instance.vrm?.humanoid) {
            // VRM model - use humanoid API
            const humanoid = instance.vrm.humanoid;

            const leftUpper = humanoid.getNormalizedBoneNode('leftUpperArm');
            const leftLower = humanoid.getNormalizedBoneNode('leftLowerArm');
            const leftHand = humanoid.getNormalizedBoneNode('leftHand');

            if (leftUpper && leftLower && leftHand) {
                instance.leftArmChain = {
                    bones: [leftUpper as THREE.Bone, leftLower as THREE.Bone],
                    effector: leftHand as THREE.Bone,
                    target: new THREE.Vector3(),
                };
                this.storeOriginalPose(instance, leftUpper as THREE.Bone);
                this.storeOriginalPose(instance, leftLower as THREE.Bone);
                this.storeOriginalPose(instance, leftHand as THREE.Bone);
            }

            const rightUpper = humanoid.getNormalizedBoneNode('rightUpperArm');
            const rightLower = humanoid.getNormalizedBoneNode('rightLowerArm');
            const rightHand = humanoid.getNormalizedBoneNode('rightHand');

            if (rightUpper && rightLower && rightHand) {
                instance.rightArmChain = {
                    bones: [rightUpper as THREE.Bone, rightLower as THREE.Bone],
                    effector: rightHand as THREE.Bone,
                    target: new THREE.Vector3(),
                };
                this.storeOriginalPose(instance, rightUpper as THREE.Bone);
                this.storeOriginalPose(instance, rightLower as THREE.Bone);
                this.storeOriginalPose(instance, rightHand as THREE.Bone);
            }

            instance.headBone = humanoid.getNormalizedBoneNode('head') as THREE.Bone | null;
        } else {
            // Generic model - find bones by name
            this.findArmBones(instance, mapping.left, 'left');
            this.findArmBones(instance, mapping.right, 'right');
            this.findHeadBone(instance);
        }

        console.log(`[VRIKService] IK chains setup - Left: ${instance.leftArmChain ? 'found' : 'missing'}, Right: ${instance.rightArmChain ? 'found' : 'missing'}`);
    }

    /**
     * Find arm bones by name patterns
     */
    private findArmBones(instance: VRIKInstance, mapping: HandBoneMapping, side: 'left' | 'right'): void {
        let upperArm: THREE.Bone | null = null;
        let forearm: THREE.Bone | null = null;
        let hand: THREE.Bone | null = null;

        instance.model.traverse((child) => {
            if (!(child as THREE.Bone).isBone) return;
            const bone = child as THREE.Bone;
            const name = bone.name;

            if (!upperArm && mapping.upperArm) {
                const patterns = Array.isArray(mapping.upperArm) ? mapping.upperArm : [mapping.upperArm];
                if (patterns.some(p => name === p || name.toLowerCase() === p.toLowerCase())) {
                    upperArm = bone;
                }
            }

            if (!forearm && mapping.forearm) {
                const patterns = Array.isArray(mapping.forearm) ? mapping.forearm : [mapping.forearm];
                if (patterns.some(p => name === p || name.toLowerCase() === p.toLowerCase())) {
                    forearm = bone;
                }
            }

            if (!hand && mapping.hand) {
                const patterns = Array.isArray(mapping.hand) ? mapping.hand : [mapping.hand];
                if (patterns.some(p => name === p || name.toLowerCase() === p.toLowerCase())) {
                    hand = bone;
                }
            }
        });

        if (upperArm && forearm && hand) {
            const chain: IKChain = {
                bones: [upperArm, forearm],
                effector: hand,
                target: new THREE.Vector3(),
            };

            if (side === 'left') {
                instance.leftArmChain = chain;
            } else {
                instance.rightArmChain = chain;
            }

            this.storeOriginalPose(instance, upperArm);
            this.storeOriginalPose(instance, forearm);
            this.storeOriginalPose(instance, hand);
        }
    }

    /**
     * Find head bone
     */
    private findHeadBone(instance: VRIKInstance): void {
        instance.model.traverse((child) => {
            if (!(child as THREE.Bone).isBone) return;
            const name = child.name.toLowerCase();
            if (name === 'head' || name === 'cc_base_head' || name.endsWith('_head')) {
                instance.headBone = child as THREE.Bone;
            }
        });
    }

    /**
     * Store original bone pose for reset
     */
    private storeOriginalPose(instance: VRIKInstance, bone: THREE.Bone): void {
        instance.originalPoses.set(bone, {
            position: bone.position.clone(),
            rotation: bone.quaternion.clone(),
        });
    }

    /**
     * Reset all bones to original poses
     */
    private resetPoses(instance: VRIKInstance): void {
        for (const [bone, pose] of instance.originalPoses) {
            bone.position.copy(pose.position);
            bone.quaternion.copy(pose.rotation);
        }
    }

    /**
     * Initialize WebXR session for controller tracking
     */
    async initializeXR(renderer: THREE.WebGLRenderer): Promise<boolean> {
        if (!navigator.xr) {
            console.warn('[VRIKService] WebXR not available');
            return false;
        }

        try {
            const supported = await navigator.xr.isSessionSupported('immersive-vr');
            if (!supported) {
                console.warn('[VRIKService] Immersive VR not supported');
                return false;
            }

            // Request XR session when user triggers it
            console.log('[VRIKService] WebXR available and supported');
            return true;
        } catch (error) {
            console.error('[VRIKService] WebXR initialization failed:', error);
            return false;
        }
    }

    /**
     * Start XR session
     */
    async startXRSession(renderer: THREE.WebGLRenderer): Promise<void> {
        if (!navigator.xr) return;

        try {
            this.xrSession = await navigator.xr.requestSession('immersive-vr', {
                requiredFeatures: ['local-floor'],
                optionalFeatures: ['hand-tracking'],
            });

            this.xrReferenceSpace = await this.xrSession.requestReferenceSpace('local-floor');

            // Set up renderer for XR
            await renderer.xr.setSession(this.xrSession);

            console.log('[VRIKService] XR session started');
        } catch (error) {
            console.error('[VRIKService] Failed to start XR session:', error);
        }
    }

    /**
     * End XR session
     */
    async endXRSession(): Promise<void> {
        if (this.xrSession) {
            await this.xrSession.end();
            this.xrSession = null;
            this.xrReferenceSpace = null;
        }
    }

    /**
     * Update IK targets from XR frame (call in render loop)
     */
    updateFromXRFrame(frame: XRFrame, renderer: THREE.WebGLRenderer): void {
        if (!this.xrSession || !this.xrReferenceSpace) return;

        const pose = frame.getViewerPose(this.xrReferenceSpace);
        if (pose) {
            // Update head target
            const headTransform = pose.transform;
            this.targets.head = new THREE.Vector3(
                headTransform.position.x,
                headTransform.position.y,
                headTransform.position.z
            );
            this.targets.headRotation = new THREE.Quaternion(
                headTransform.orientation.x,
                headTransform.orientation.y,
                headTransform.orientation.z,
                headTransform.orientation.w
            );
        }

        // Update controller targets
        for (const source of this.xrSession.inputSources) {
            if (source.gripSpace) {
                const gripPose = frame.getPose(source.gripSpace, this.xrReferenceSpace);
                if (gripPose) {
                    const position = new THREE.Vector3(
                        gripPose.transform.position.x,
                        gripPose.transform.position.y,
                        gripPose.transform.position.z
                    );
                    const rotation = new THREE.Quaternion(
                        gripPose.transform.orientation.x,
                        gripPose.transform.orientation.y,
                        gripPose.transform.orientation.z,
                        gripPose.transform.orientation.w
                    );

                    if (source.handedness === 'left') {
                        this.targets.leftHand = position;
                        this.targets.leftHandRotation = rotation;
                    } else if (source.handedness === 'right') {
                        this.targets.rightHand = position;
                        this.targets.rightHandRotation = rotation;
                    }
                }
            }
        }
    }

    /**
     * Manually set IK targets (for non-XR testing or alternative input)
     */
    setTargets(targets: Partial<VRIKTargets>): void {
        Object.assign(this.targets, targets);
    }

    /**
     * Main update loop - solve IK for all registered models
     */
    update(dt: number): void {
        for (const instance of this.instances.values()) {
            if (!instance.config.enabled) continue;

            // Solve arm IK
            if (instance.config.handIKEnabled) {
                if (this.targets.leftHand && instance.leftArmChain) {
                    instance.leftArmChain.target.copy(this.targets.leftHand);
                    instance.leftArmChain.targetRotation = this.targets.leftHandRotation;
                    this.solveIKChain(instance.leftArmChain, instance.config);
                }

                if (this.targets.rightHand && instance.rightArmChain) {
                    instance.rightArmChain.target.copy(this.targets.rightHand);
                    instance.rightArmChain.targetRotation = this.targets.rightHandRotation;
                    this.solveIKChain(instance.rightArmChain, instance.config);
                }
            }

            // Apply head tracking
            if (instance.config.headIKEnabled && instance.headBone && this.targets.headRotation) {
                instance.headBone.quaternion.copy(this.targets.headRotation);
            }
        }
    }

    /**
     * Solve IK chain using two-bone IK (common for arms)
     * Uses analytical solution for better performance
     */
    private solveIKChain(chain: IKChain, config: Required<VRIKConfig>): void {
        if (chain.bones.length < 2) return;

        const upperBone = chain.bones[0];
        const lowerBone = chain.bones[1];
        const effector = chain.effector;
        const target = chain.target;

        // Get world positions
        const upperPos = new THREE.Vector3();
        const lowerPos = new THREE.Vector3();
        const effectorPos = new THREE.Vector3();
        upperBone.getWorldPosition(upperPos);
        lowerBone.getWorldPosition(lowerPos);
        effector.getWorldPosition(effectorPos);

        // Calculate bone lengths
        const upperLength = upperPos.distanceTo(lowerPos);
        const lowerLength = lowerPos.distanceTo(effectorPos);
        const totalLength = upperLength + lowerLength;

        // Direction to target
        const toTarget = target.clone().sub(upperPos);
        const targetDist = toTarget.length();

        // Clamp if target is out of reach
        if (targetDist > totalLength * 0.999) {
            toTarget.normalize().multiplyScalar(totalLength * 0.999);
        }

        // Analytical two-bone IK
        // Using law of cosines to find elbow angle
        const targetDistClamped = Math.min(targetDist, totalLength * 0.999);
        const upperLengthSq = upperLength * upperLength;
        const lowerLengthSq = lowerLength * lowerLength;
        const targetDistSq = targetDistClamped * targetDistClamped;

        // Angle at upper bone (shoulder)
        const cosUpperAngle = (upperLengthSq + targetDistSq - lowerLengthSq) / (2 * upperLength * targetDistClamped);
        const upperAngle = Math.acos(Math.max(-1, Math.min(1, cosUpperAngle)));

        // Angle at lower bone (elbow)
        const cosLowerAngle = (upperLengthSq + lowerLengthSq - targetDistSq) / (2 * upperLength * lowerLength);
        const lowerAngle = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosLowerAngle)));

        // Apply rotations (simplified - full implementation would handle all axes)
        // This is a foundation - full implementation needs proper rotation calculation
        // considering bone orientations, twist, and pole targets

        // Set effector rotation if target rotation is available
        if (chain.targetRotation) {
            effector.quaternion.copy(chain.targetRotation);
        }
    }

    /**
     * Update configuration for a specific mesh
     */
    updateConfig(config: Partial<VRIKConfig>, id = 'default'): void {
        const instance = this.instances.get(id);
        if (instance) {
            Object.assign(instance.config, config);
        }
    }

    /**
     * Check if WebXR is currently active
     */
    isXRActive(): boolean {
        return this.xrSession !== null;
    }

    /**
     * Get all registered mesh IDs
     */
    getRegisteredIds(): string[] {
        return Array.from(this.instances.keys());
    }

    /**
     * Dispose of all resources
     */
    async dispose(): Promise<void> {
        await this.endXRSession();
        for (const instance of this.instances.values()) {
            this.resetPoses(instance);
        }
        this.instances.clear();
    }
}

export default VRIKService;
