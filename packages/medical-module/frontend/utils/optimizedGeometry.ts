/**
 * Optimized Geometry for Medical Viewport
 * Pre-baked, merged, single draw call
 * Target: Raspberry Pi
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from './performance';

// =============================================================================
// GEOMETRY CACHE (create once)
// =============================================================================

let cachedBodyGeo: THREE.BufferGeometry | null = null;

// =============================================================================
// BODY STRUCTURE (baked positions)
// =============================================================================

interface Part {
    type: 'S' | 'C' | 'Y' | 'B'; // sphere, capsule, cylinder, box
    p: [number, number, number]; // position
    s?: [number, number, number]; // scale
    r?: number[]; // params
}

// Minimal body - 23 parts merged into 1 draw call
const BODY: Part[] = [
    { type: 'S', p: [0, 1.65, 0], s: [1, 1.15, 0.95], r: [0.14] },
    { type: 'Y', p: [0, 1.52, 0], r: [0.06, 0.075, 0.15] },
    { type: 'C', p: [0, 1.2, 0], r: [0.2, 0.35] },
    { type: 'C', p: [0, 0.85, 0], r: [0.18, 0.25] },
    { type: 'S', p: [-0.27, 1.4, 0], r: [0.08] },
    { type: 'S', p: [0.27, 1.4, 0], r: [0.08] },
    { type: 'C', p: [-0.27, 1.15, 0], r: [0.045, 0.28] },
    { type: 'S', p: [-0.27, 0.95, 0], r: [0.05] },
    { type: 'C', p: [-0.27, 0.74, 0], r: [0.04, 0.26] },
    { type: 'B', p: [-0.27, 0.515, 0], r: [0.07, 0.11, 0.04] },
    { type: 'C', p: [0.27, 1.15, 0], r: [0.045, 0.28] },
    { type: 'S', p: [0.27, 0.95, 0], r: [0.05] },
    { type: 'C', p: [0.27, 0.74, 0], r: [0.04, 0.26] },
    { type: 'B', p: [0.27, 0.515, 0], r: [0.07, 0.11, 0.04] },
    { type: 'B', p: [0, 0.68, 0], r: [0.32, 0.16, 0.22] },
    { type: 'C', p: [-0.11, 0.38, 0], r: [0.065, 0.42] },
    { type: 'S', p: [-0.11, 0.12, 0], r: [0.06] },
    { type: 'C', p: [-0.11, -0.13, 0], r: [0.055, 0.4] },
    { type: 'B', p: [-0.11, -0.41, 0.05], r: [0.09, 0.06, 0.2] },
    { type: 'C', p: [0.11, 0.38, 0], r: [0.065, 0.42] },
    { type: 'S', p: [0.11, 0.12, 0], r: [0.06] },
    { type: 'C', p: [0.11, -0.13, 0], r: [0.055, 0.4] },
    { type: 'B', p: [0.11, -0.41, 0.05], r: [0.09, 0.06, 0.2] },
];

function makePart(part: Part): THREE.BufferGeometry {
    const { SPHERE_SEGMENTS: SS, CAPSULE_SEGMENTS: CS, CYLINDER_SEGMENTS: YS } = CONFIG;
    let geo: THREE.BufferGeometry;

    switch (part.type) {
        case 'S':
            geo = new THREE.SphereGeometry(part.r![0], SS, SS);
            break;
        case 'C':
            geo = new THREE.CapsuleGeometry(part.r![0], part.r![1], CS, SS);
            break;
        case 'Y':
            geo = new THREE.CylinderGeometry(part.r![0], part.r![1], part.r![2], YS);
            break;
        case 'B':
            geo = new THREE.BoxGeometry(part.r![0], part.r![1], part.r![2]);
            break;
        default:
            geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    }

    if (part.s) geo.scale(part.s[0], part.s[1], part.s[2]);
    geo.translate(part.p[0], part.p[1], part.p[2]);

    return geo;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get merged body geometry (cached, 1 draw call)
 */
export function getBodyGeometry(): THREE.BufferGeometry {
    if (!cachedBodyGeo) {
        const geos = BODY.map(makePart);
        cachedBodyGeo = mergeGeometries(geos, false);
        geos.forEach(g => g.dispose());
    }
    return cachedBodyGeo;
}

/**
 * Create body mesh with given color
 */
export function createBodyMesh(color: number): THREE.Mesh {
    const geo = getBodyGeometry();
    const mat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.75,
        roughness: 0.6,
        metalness: 0.05,
        emissive: color,
        emissiveIntensity: 0.1,
    });
    return new THREE.Mesh(geo, mat);
}

// =============================================================================
// PARTICLE POOL (pre-allocated, reusable)
// =============================================================================

const POOL: THREE.Mesh[] = [];
let poolGeo: THREE.BufferGeometry | null = null;

export function initParticlePool(parent: THREE.Object3D, count = CONFIG.MAX_PARTICLES) {
    if (POOL.length > 0) return; // Already initialized

    poolGeo = new THREE.SphereGeometry(0.03, 4, 4);

    for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        const mesh = new THREE.Mesh(poolGeo, mat);
        mesh.visible = false;
        mesh.userData = { active: false, vx: 0, vy: 0, vz: 0, life: 0 };
        parent.add(mesh);
        POOL.push(mesh);
    }
}

export function spawnParticle(x: number, y: number, z: number, color: number): boolean {
    const p = POOL.find(m => !m.userData.active);
    if (!p) return false;

    p.position.set(x, y, z);
    p.userData.active = true;
    p.userData.life = 1;
    p.userData.vx = (Math.random() - 0.5) * 0.02;
    p.userData.vy = -0.01 - Math.random() * 0.02;
    p.userData.vz = (Math.random() - 0.5) * 0.02;
    p.visible = true;
    (p.material as THREE.MeshBasicMaterial).color.setHex(color);
    (p.material as THREE.MeshBasicMaterial).opacity = 0.9;

    return true;
}

export function updateParticles(dt: number): number {
    let active = 0;
    for (const p of POOL) {
        if (!p.userData.active) continue;

        p.userData.life -= dt * 0.15;
        p.position.x += p.userData.vx;
        p.position.y += p.userData.vy;
        p.position.z += p.userData.vz;

        (p.material as THREE.MeshBasicMaterial).opacity = p.userData.life * 0.8;

        if (p.userData.life <= 0) {
            p.userData.active = false;
            p.visible = false;
        } else {
            active++;
        }
    }
    return active;
}

export function disposeAll() {
    cachedBodyGeo?.dispose();
    cachedBodyGeo = null;
    poolGeo?.dispose();
    POOL.length = 0;
}
