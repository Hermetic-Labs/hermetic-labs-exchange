/**
 * Enhanced Base Body Generator
 * Creates a lightweight anatomical model that's better than procedural primitives
 * but small enough to bundle with the repo (~200-400 KB max)
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export function createBaseBodyModel(): THREE.Group {
    const body = new THREE.Group();
    body.name = 'BaseHumanoidBody';

    // Material with better shading
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xffdbac,
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    });

    // HEAD - More anatomical shape
    const headGeo = new THREE.SphereGeometry(0.13, 16, 16);
    headGeo.scale(1, 1.2, 0.9); // Slightly elongated
    const head = new THREE.Mesh(headGeo, skinMat.clone());
    head.position.set(0, 1.65, 0);
    body.add(head);

    // NECK
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.15, 12);
    const neck = new THREE.Mesh(neckGeo, skinMat.clone());
    neck.position.set(0, 1.5, 0);
    body.add(neck);

    // TORSO - Better shaped
    const torsoGeo = new THREE.CapsuleGeometry(0.18, 0.5, 8, 16);
    const torso = new THREE.Mesh(torsoGeo, skinMat.clone());
    torso.position.set(0, 1.15, 0);
    body.add(torso);

    // SHOULDERS
    const shoulderGeo = new THREE.SphereGeometry(0.08, 12, 12);
    [-0.25, 0.25].forEach(x => {
        const shoulder = new THREE.Mesh(shoulderGeo, skinMat.clone());
        shoulder.position.set(x, 1.38, 0);
        body.add(shoulder);
    });

    // ARMS
    const upperArmGeo = new THREE.CapsuleGeometry(0.04, 0.28, 6, 12);
    const lowerArmGeo = new THREE.CapsuleGeometry(0.035, 0.25, 6, 12);

    [-1, 1].forEach(side => {
        // Upper arm
        const upperArm = new THREE.Mesh(upperArmGeo, skinMat.clone());
        upperArm.position.set(side * 0.25, 1.15, 0);
        body.add(upperArm);

        // Elbow
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), skinMat.clone());
        elbow.position.set(side * 0.25, 0.95, 0);
        body.add(elbow);

        // Lower arm
        const lowerArm = new THREE.Mesh(lowerArmGeo, skinMat.clone());
        lowerArm.position.set(side * 0.25, 0.75, 0);
        body.add(lowerArm);

        // Hand
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), skinMat.clone());
        hand.position.set(side * 0.25, 0.55, 0);
        body.add(hand);
    });

    // PELVIS
    const pelvisGeo = new THREE.BoxGeometry(0.3, 0.15, 0.2);
    pelvisGeo.translate(0, 0.85, 0);
    const pelvis = new THREE.Mesh(pelvisGeo, skinMat.clone());
    body.add(pelvis);

    // LEGS
    const upperLegGeo = new THREE.CapsuleGeometry(0.06, 0.4, 8, 12);
    const lowerLegGeo = new THREE.CapsuleGeometry(0.05, 0.38, 8, 12);

    [-1, 1].forEach(side => {
        // Upper leg
        const upperLeg = new THREE.Mesh(upperLegGeo, skinMat.clone());
        upperLeg.position.set(side * 0.1, 0.55, 0);
        body.add(upperLeg);

        // Knee
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), skinMat.clone());
        knee.position.set(side * 0.1, 0.3, 0);
        body.add(knee);

        // Lower leg
        const lowerLeg = new THREE.Mesh(lowerLegGeo, skinMat.clone());
        lowerLeg.position.set(side * 0.1, 0.05, 0);
        body.add(lowerLeg);

        // Foot
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.18), skinMat.clone());
        foot.position.set(side * 0.1, -0.12, 0.04);
        body.add(foot);
    });

    return body;
}

/**
 * Export the base model to GLTF format for bundling
 */
export async function exportBaseModel(): Promise<ArrayBuffer> {
    const model = createBaseBodyModel();
    const exporter = new GLTFExporter();

    return new Promise((resolve, reject) => {
        exporter.parse(
            model,
            (result) => {
                if (result instanceof ArrayBuffer) {
                    resolve(result);
                } else {
                    // Convert JSON to binary
                    const json = JSON.stringify(result);
                    const buffer = new TextEncoder().encode(json);
                    resolve(buffer.buffer);
                }
            },
            (error) => reject(error),
            { binary: true } // Use GLB format for smaller size
        );
    });
}
