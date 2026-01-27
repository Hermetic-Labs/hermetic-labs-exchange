// VR/XR Type Definitions for EVE-OS Spatial Engine

export interface VRScene {
  id: string;
  name: string;
  description?: string;
  objects: VRSceneObject[];
  environment?: VREnvironment;
  lighting?: VRLighting;
  physics?: VRPhysics;
  audio?: VRAudioSettings;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface VRSceneObject {
  id: string;
  type: 'mesh' | 'light' | 'camera' | 'audio' | 'anchor' | 'interaction' | 'particle';
  name: string;
  transform: VRTransform;
  geometry?: VRGeometry;
  material?: VRMaterial;
  components?: VRComponent[];
  visible: boolean;
  interactive: boolean;
  metadata?: Record<string, any>;
}

export interface VRTransform {
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion
  scale: [number, number, number];
  parent?: string;
}

export interface VRGeometry {
  type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'custom';
  parameters?: Record<string, number>;
  vertices?: number[];
  faces?: number[];
  uvs?: number[];
  normals?: number[];
}

export interface VRMaterial {
  type: 'basic' | 'standard' | 'physical' | 'custom';
  properties: {
    color?: string;
    opacity?: number;
    metalness?: number;
    roughness?: number;
    emissive?: string;
    map?: string;
    normalMap?: string;
    [key: string]: any;
  };
}

export interface VRComponent {
  type: 'animation' | 'physics' | 'audio' | 'interaction' | 'script' | 'particle';
  config: Record<string, any>;
  enabled: boolean;
}

export interface VREnvironment {
  skybox?: string;
  background?: string;
  fog?: VRFog;
  gravity?: [number, number, number];
  ambientLight?: VRLight;
}

export interface VRFog {
  type: 'linear' | 'exponential';
  color: string;
  near?: number;
  far?: number;
  density?: number;
}

export interface VRLighting {
  ambient?: VRLight;
  directional?: VRLight[];
  point?: VRLight[];
  spot?: VRLight[];
  hemisphere?: VRLight;
}

export interface VRLight {
  color: string;
  intensity: number;
  position?: [number, number, number];
  target?: [number, number, number];
  angle?: number;
  penumbra?: number;
  decay?: number;
  distance?: number;
  castShadow?: boolean;
}

export interface VRPhysics {
  enabled: boolean;
  gravity: [number, number, number];
  friction: number;
  restitution: number;
  solverIterations: number;
}

export interface VRAudioSettings {
  masterVolume: number;
  spatialAudio: boolean;
  reverbEnabled: boolean;
  occlusionEnabled: boolean;
}

export interface VRSpatialData {
  position: [number, number, number];
  rotation: [number, number, number, number];
  velocity?: [number, number, number];
  acceleration?: [number, number, number];
  angularVelocity?: [number, number, number];
  timestamp: string;
  confidence: number;
  source: 'head' | 'left-hand' | 'right-hand' | 'controller' | 'eye' | 'anchor';
}

export interface VRGesture {
  type: 'point' | 'grab' | 'pinch' | 'swipe' | 'tap' | 'hold' | 'custom';
  confidence: number;
  position: [number, number, number];
  direction?: [number, number, number];
  magnitude?: number;
  duration: number;
  handedness: 'left' | 'right';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface XRFrame {
  timestamp: number;
  pose?: XRPose;
  views: XRView[];
  inputSources: XRInputSource[];
  spatialAnchors?: SpatialAnchor[];
}

export interface SpatialAnchor {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  description?: string;
  lifetime: number;
  createdAt: string;
  trackingState?: 'tracked' | 'emulated' | 'untracked';
}

export interface XRInputSource {
  handedness: 'left' | 'right';
  targetRayMode: 'gaze' | 'tracked-pointer' | 'tap';
  profiles: string[];
  gripSpace?: XRReferenceSpace;
  targetRaySpace: XRReferenceSpace;
  gamepad?: Gamepad;
  hand?: XRHand;
}

export interface XRHand {
  indexFinger: XRJointSpace;
  middleFinger: XRJointSpace;
  ringFinger: XRJointSpace;
  pinkyFinger: XRJointSpace;
  thumb: XRJointSpace;
  wrist: XRJointSpace;
}

export interface XRJointSpace {
  pose?: XRPose;
  radius?: number;
}

export interface XRView {
  eye: 'left' | 'right';
  projectionMatrix: Float32Array;
  transform: XRRigidTransform;
}

export interface XRPose {
  transform: XRRigidTransform;
  linearVelocity?: Float32Array;
  angularVelocity?: Float32Array;
}

export interface XRRigidTransform {
  position: DOMPointReadOnly;
  orientation: DOMPointReadOnly;
  matrix: Float32Array;
  inverse: Float32Array;
}

export interface VRInteraction {
  id: string;
  type: 'click' | 'hover' | 'grab' | 'drag' | 'manipulate' | 'gesture';
  target: string;
  handler: string | Function;
  conditions?: Record<string, any>;
  priority: number;
  enabled: boolean;
}

export interface VRPerformanceMetrics {
  frameRate: number;
  frameTime: number;
  gpuTime: number;
  cpuTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
  resolution: [number, number];
  timestamp: string;
}

export interface VRSessionConfig {
  mode: 'immersive-vr' | 'immersive-ar' | 'inline';
  requiredFeatures: string[];
  optionalFeatures: string[];
  referenceSpaceType: 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';
  domOverlay?: {
    root: HTMLElement;
  };
  callback?: (session: XRSession) => void;
}

export interface VRDeviceInfo {
  manufacturer: string;
  model: string;
  serialNumber?: string;
  firmwareVersion?: string;
  capabilities: {
    vr: boolean;
    ar: boolean;
    handTracking: boolean;
    eyeTracking: boolean;
    spatialAnchors: boolean;
    haptics: boolean;
    passthrough: boolean;
  };
  tracking: {
    position: boolean;
    rotation: boolean;
    velocity: boolean;
    acceleration: boolean;
  };
  display: {
    resolution: [number, number];
    refreshRate: number;
    fieldOfView: number;
    displayType: 'oled' | 'lcd' | 'micro_oled';
  };
}

export interface VREvent {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  data: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface VRNodeDefinition {
  id: string;
  name: string;
  category: 'vr-input' | 'vr-spatial' | 'vr-render' | 'vr-interaction' | 'vr-audio' | 'vr-physics';
  description: string;
  inputs: VRPortDefinition[];
  outputs: VRPortDefinition[];
  parameters: VRParameterDefinition[];
  implementation: string;
  icon?: string;
  tags: string[];
}

export interface VRPortDefinition {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean' | 'vector3' | 'quaternion' | 'matrix4' | 'object' | 'event';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface VRParameterDefinition {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean' | 'enum' | 'color' | 'range';
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
}

export interface VRError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  source: string;
  stack?: string;
}

export interface VRLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
}

// WebXR types are available globally from TypeScript's DOM lib
// Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
// For enhanced type support, add @webxr-types/types to devDependencies