/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WebXR Type Declarations
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Minimal WebXR API type declarations for VR/AR packages.
 * These enable IDE support without requiring @types/webxr.
 * 
 * Reference: https://www.w3.org/TR/webxr/
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Extend Navigator with XR
declare global {
  interface Navigator {
    xr?: XRSystem;
  }
}

// XR System
interface XRSystem extends EventTarget {
  isSessionSupported(mode: XRSessionMode): Promise<boolean>;
  requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
}

type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';

interface XRSessionInit {
  requiredFeatures?: string[];
  optionalFeatures?: string[];
}

// XR Session
interface XRSession extends EventTarget {
  renderState: XRRenderState;
  inputSources: XRInputSourceArray;
  visibilityState: XRVisibilityState;
  
  updateRenderState(state?: XRRenderStateInit): void;
  requestReferenceSpace(type: XRReferenceSpaceType): Promise<XRReferenceSpace>;
  requestAnimationFrame(callback: XRFrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
  end(): Promise<void>;
  
  // Events
  onend: ((this: XRSession, ev: XRSessionEvent) => void) | null;
  oninputsourceschange: ((this: XRSession, ev: XRInputSourcesChangeEvent) => void) | null;
  onvisibilitychange: ((this: XRSession, ev: XRSessionEvent) => void) | null;
}

type XRVisibilityState = 'visible' | 'visible-blurred' | 'hidden';

interface XRRenderState {
  baseLayer?: XRWebGLLayer;
  depthFar: number;
  depthNear: number;
  inlineVerticalFieldOfView?: number;
}

interface XRRenderStateInit {
  baseLayer?: XRWebGLLayer;
  depthFar?: number;
  depthNear?: number;
  inlineVerticalFieldOfView?: number;
}

type XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame) => void;

// Reference Spaces
type XRReferenceSpaceType = 
  | 'viewer'
  | 'local'
  | 'local-floor'
  | 'bounded-floor'
  | 'unbounded';

interface XRReferenceSpace extends XRSpace {
  getOffsetReferenceSpace(originOffset: XRRigidTransform): XRReferenceSpace;
}

interface XRBoundedReferenceSpace extends XRReferenceSpace {
  boundsGeometry: DOMPointReadOnly[];
}

interface XRSpace extends EventTarget {}

// XR Frame
interface XRFrame {
  session: XRSession;
  
  getViewerPose(referenceSpace: XRReferenceSpace): XRViewerPose | null;
  getPose(space: XRSpace, baseSpace: XRSpace): XRPose | null;
}

// Poses and Views
interface XRPose {
  transform: XRRigidTransform;
  emulatedPosition: boolean;
}

interface XRViewerPose extends XRPose {
  views: readonly XRView[];
}

interface XRView {
  eye: XREye;
  projectionMatrix: Float32Array;
  transform: XRRigidTransform;
}

type XREye = 'none' | 'left' | 'right';

interface XRRigidTransform {
  position: DOMPointReadOnly;
  orientation: DOMPointReadOnly;
  matrix: Float32Array;
  inverse: XRRigidTransform;
  
  constructor(position?: DOMPointInit, orientation?: DOMPointInit): XRRigidTransform;
}

// Input Sources
interface XRInputSourceArray {
  length: number;
  [index: number]: XRInputSource;
  [Symbol.iterator](): IterableIterator<XRInputSource>;
}

interface XRInputSource {
  handedness: XRHandedness;
  targetRayMode: XRTargetRayMode;
  targetRaySpace: XRSpace;
  gripSpace?: XRSpace;
  gamepad?: Gamepad;
  profiles: readonly string[];
  hand?: XRHand;
}

type XRHandedness = 'none' | 'left' | 'right';
type XRTargetRayMode = 'gaze' | 'tracked-pointer' | 'screen';

interface XRHand extends Map<XRHandJoint, XRJointSpace> {
  readonly size: number;
}

type XRHandJoint = 
  | 'wrist'
  | 'thumb-metacarpal' | 'thumb-phalanx-proximal' | 'thumb-phalanx-distal' | 'thumb-tip'
  | 'index-finger-metacarpal' | 'index-finger-phalanx-proximal' | 'index-finger-phalanx-intermediate' | 'index-finger-phalanx-distal' | 'index-finger-tip'
  | 'middle-finger-metacarpal' | 'middle-finger-phalanx-proximal' | 'middle-finger-phalanx-intermediate' | 'middle-finger-phalanx-distal' | 'middle-finger-tip'
  | 'ring-finger-metacarpal' | 'ring-finger-phalanx-proximal' | 'ring-finger-phalanx-intermediate' | 'ring-finger-phalanx-distal' | 'ring-finger-tip'
  | 'pinky-finger-metacarpal' | 'pinky-finger-phalanx-proximal' | 'pinky-finger-phalanx-intermediate' | 'pinky-finger-phalanx-distal' | 'pinky-finger-tip';

interface XRJointSpace extends XRSpace {}

// WebGL Layer
interface XRWebGLLayer {
  framebuffer: WebGLFramebuffer | null;
  framebufferWidth: number;
  framebufferHeight: number;
  
  getViewport(view: XRView): XRViewport | null;
  
  constructor(session: XRSession, context: WebGLRenderingContext | WebGL2RenderingContext, options?: XRWebGLLayerInit): XRWebGLLayer;
}

interface XRWebGLLayerInit {
  antialias?: boolean;
  depth?: boolean;
  stencil?: boolean;
  alpha?: boolean;
  ignoreDepthValues?: boolean;
  framebufferScaleFactor?: number;
}

interface XRViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Events
interface XRSessionEvent extends Event {
  session: XRSession;
}

interface XRInputSourcesChangeEvent extends Event {
  session: XRSession;
  added: readonly XRInputSource[];
  removed: readonly XRInputSource[];
}

// Export types for use in packages
export type {
  XRSystem,
  XRSession,
  XRSessionMode,
  XRSessionInit,
  XRReferenceSpace,
  XRReferenceSpaceType,
  XRBoundedReferenceSpace,
  XRSpace,
  XRFrame,
  XRPose,
  XRViewerPose,
  XRView,
  XREye,
  XRRigidTransform,
  XRInputSource,
  XRInputSourceArray,
  XRHandedness,
  XRTargetRayMode,
  XRHand,
  XRHandJoint,
  XRJointSpace,
  XRWebGLLayer,
  XRViewport,
  XRVisibilityState
};
