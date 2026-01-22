/**
 * Type definitions for Medical 3D Model System
 * Isolated to medical module - no core app dependencies
 */

import type * as THREE from 'three';

export interface MedicalModelMetadata {
    layerId: string;
    modelName: string;
    modelPath: string;
    fileSize: number; // bytes
    attribution: string;
    license: string;
    anatomicalSystem: 'skeletal' | 'circulatory' | 'respiratory' | 'nervous' | 'digestive' | 'muscular';
}

export interface ModelLoadProgress {
    layerId: string;
    loaded: number; // bytes
    total: number; // bytes
    percentage: number; // 0-100
    status: 'pending' | 'loading' | 'complete' | 'error';
    error?: string;
}

export interface ModelCacheEntry {
    model: THREE.Group;
    metadata: MedicalModelMetadata;
    loadedAt: number;
    lastAccessed: number;
    memorySize: number; // estimated bytes
}

export const MEDICAL_MODEL_REGISTRY: Record<string, MedicalModelMetadata> = {
    L1: {
        layerId: 'L1',
        modelName: 'Human Skeleton',
        modelPath: '/assets/models/skeleton.glb',
        fileSize: 1200000, // ~1.2 MB
        attribution: 'BodyParts3D, Database Center for Life Science',
        license: 'CC BY-SA 2.1 Japan',
        anatomicalSystem: 'skeletal'
    },
    L3: {
        layerId: 'L3',
        modelName: 'Cardiovascular System',
        modelPath: '/assets/models/heart.glb',
        fileSize: 500000, // ~500 KB
        attribution: 'BodyParts3D, Database Center for Life Science',
        license: 'CC BY-SA 2.1 Japan',
        anatomicalSystem: 'circulatory'
    },
    L4: {
        layerId: 'L4',
        modelName: 'Nervous System (Brain)',
        modelPath: '/assets/models/brain.glb',
        fileSize: 400000, // ~400 KB
        attribution: 'BodyParts3D, Database Center for Life Science',
        license: 'CC BY-SA 2.1 Japan',
        anatomicalSystem: 'nervous'
    },
    L5: {
        layerId: 'L5',
        modelName: 'Respiratory System',
        modelPath: '/assets/models/lungs.glb',
        fileSize: 800000, // ~800 KB
        attribution: 'BodyParts3D, Database Center for Life Science',
        license: 'CC BY-SA 2.1 Japan',
        anatomicalSystem: 'respiratory'
    }
};
