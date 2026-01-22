/**
 * Performance Config for Medical Viewport
 * Single target: Raspberry Pi / low-end hardware
 * No quality presets - just one optimized path
 */

import * as THREE from 'three';

// =============================================================================
// BAKED SETTINGS (no runtime detection needed)
// =============================================================================

export const CONFIG = {
    // Renderer - minimal
    PIXEL_RATIO: 1,
    ANTIALIAS: false,
    SHADOWS: false,

    // Geometry - low poly
    SPHERE_SEGMENTS: 6,
    CAPSULE_SEGMENTS: 4,
    CYLINDER_SEGMENTS: 6,

    // Animation - throttled
    TARGET_FPS: 24,
    FRAME_INTERVAL: 1000 / 24,

    // Particles - minimal
    MAX_PARTICLES: 15,

    // Features - essential only
    ENABLE_MICRO_LAYERS: false,
    ENABLE_MEDICATION_SIM: true,

    // Textures
    MAX_TEXTURE_SIZE: 256,
} as const;

// =============================================================================
// FRAME LIMITER (24 FPS lock)
// =============================================================================

let lastFrameTime = 0;

export function shouldRender(now: number): boolean {
    if (now - lastFrameTime >= CONFIG.FRAME_INTERVAL) {
        lastFrameTime = now;
        return true;
    }
    return false;
}

// =============================================================================
// REUSABLE OBJECTS (avoid GC pressure)
// =============================================================================

export const tempVec3 = new THREE.Vector3();
export const tempMatrix = new THREE.Matrix4();
export const tempColor = new THREE.Color();

// =============================================================================
// DISPOSE HELPER
// =============================================================================

export function dispose(obj: THREE.Object3D) {
    obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(m => m.dispose());
        }
    });
}
