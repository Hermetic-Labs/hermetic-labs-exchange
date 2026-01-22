/**
 * Medical Model Loader Service
 * Progressive lazy-loading for 3D anatomical models
 * Isolated to medical module with LRU cache
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type {
    MedicalModelMetadata,
    ModelLoadProgress,
    ModelCacheEntry,
} from '../types/medical-models';
import { MEDICAL_MODEL_REGISTRY } from '../types/medical-models';

const MAX_CACHE_SIZE = 3; // Maximum models in memory
const MAX_CACHE_MEMORY = 10 * 1024 * 1024; // 10 MB max cache memory

export class MedicalModelLoader {
    private static instance: MedicalModelLoader;
    private loader: GLTFLoader;
    private cache: Map<string, ModelCacheEntry>;
    private loadingQueue: Map<string, Promise<THREE.Group>>;
    private progressCallbacks: Map<string, (progress: ModelLoadProgress) => void>;

    private constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
        this.loadingQueue = new Map();
        this.progressCallbacks = new Map();
    }

    public static getInstance(): MedicalModelLoader {
        if (!MedicalModelLoader.instance) {
            MedicalModelLoader.instance = new MedicalModelLoader();
        }
        return MedicalModelLoader.instance;
    }

    /**
     * Load a medical model for a specific layer
     * Uses LRU cache to manage memory
     */
    public async loadModel(
        layerId: string,
        onProgress?: (progress: ModelLoadProgress) => void
    ): Promise<THREE.Group | null> {
        const metadata = MEDICAL_MODEL_REGISTRY[layerId];

        if (!metadata) {
            console.warn(`No model registered for layer ${layerId}`);
            return null;
        }

        // Check cache first
        const cached = this.cache.get(layerId);
        if (cached) {
            cached.lastAccessed = Date.now();
            console.log(`✓ Using cached model for ${layerId}`);
            return cached.model.clone();
        }

        // Check if already loading
        if (this.loadingQueue.has(layerId)) {
            console.log(`⏳ Model ${layerId} already loading, waiting...`);
            return this.loadingQueue.get(layerId)!;
        }

        // Register progress callback
        if (onProgress) {
            this.progressCallbacks.set(layerId, onProgress);
        }

        // Start loading
        const loadPromise = this._loadModelFromPath(layerId, metadata);
        this.loadingQueue.set(layerId, loadPromise);

        try {
            const model = await loadPromise;
            this.loadingQueue.delete(layerId);
            this.progressCallbacks.delete(layerId);
            return model;
        } catch (error) {
            this.loadingQueue.delete(layerId);
            this.progressCallbacks.delete(layerId);
            console.error(`Failed to load model for ${layerId}:`, error);

            if (onProgress) {
                onProgress({
                    layerId,
                    loaded: 0,
                    total: metadata.fileSize,
                    percentage: 0,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }

            return null;
        }
    }

    /**
     * Internal method to load model from file path
     */
    private async _loadModelFromPath(
        layerId: string,
        metadata: MedicalModelMetadata
    ): Promise<THREE.Group> {
        return new Promise((resolve, reject) => {
            const progressCallback = this.progressCallbacks.get(layerId);

            this.loader.load(
                metadata.modelPath,
                // Success callback
                (gltf) => {
                    const model = gltf.scene;

                    // Estimate memory size (rough calculation)
                    let memorySize = 0;
                    model.traverse((child) => {
                        if ((child as THREE.Mesh).geometry) {
                            const mesh = child as THREE.Mesh;
                            const positions = mesh.geometry.attributes.position;
                            memorySize += positions.count * positions.itemSize * 4; // Float32
                        }
                    });

                    // Cache the model
                    const cacheEntry: ModelCacheEntry = {
                        model: model,
                        metadata,
                        loadedAt: Date.now(),
                        lastAccessed: Date.now(),
                        memorySize
                    };

                    // Evict old entries if cache is full
                    this._evictCacheIfNeeded(memorySize);

                    this.cache.set(layerId, cacheEntry);

                    console.log(`✓ Loaded ${metadata.modelName} (${(memorySize / 1024 / 1024).toFixed(2)} MB)`);

                    if (progressCallback) {
                        progressCallback({
                            layerId,
                            loaded: metadata.fileSize,
                            total: metadata.fileSize,
                            percentage: 100,
                            status: 'complete'
                        });
                    }

                    resolve(model.clone());
                },
                // Progress callback
                (xhr) => {
                    if (progressCallback) {
                        const percentage = xhr.total > 0 ? (xhr.loaded / xhr.total) * 100 : 0;
                        progressCallback({
                            layerId,
                            loaded: xhr.loaded,
                            total: xhr.total,
                            percentage,
                            status: 'loading'
                        });
                    }
                },
                // Error callback
                (error) => {
                    reject(error);
                }
            );
        });
    }

    /**
     * Evict least recently used models to free memory
     */
    private _evictCacheIfNeeded(requiredSpace: number): void {
        // Check cache size
        if (this.cache.size >= MAX_CACHE_SIZE) {
            // Find LRU entry
            let lruKey: string | null = null;
            let lruTime = Infinity;

            this.cache.forEach((entry, key) => {
                if (entry.lastAccessed < lruTime) {
                    lruTime = entry.lastAccessed;
                    lruKey = key;
                }
            });

            if (lruKey) {
                console.log(`⚠️ Evicting cached model: ${lruKey}`);
                this.cache.delete(lruKey);
            }
        }

        // Check total memory usage
        let totalMemory = 0;
        this.cache.forEach(entry => {
            totalMemory += entry.memorySize;
        });

        while (totalMemory + requiredSpace > MAX_CACHE_MEMORY && this.cache.size > 0) {
            // Find LRU entry
            let lruKey: string | null = null;
            let lruTime = Infinity;

            this.cache.forEach((entry, key) => {
                if (entry.lastAccessed < lruTime) {
                    lruTime = entry.lastAccessed;
                    lruKey = key;
                }
            });

            if (lruKey) {
                const evicted = this.cache.get(lruKey);
                console.log(`⚠️ Evicting cached model for memory: ${lruKey} (${(evicted!.memorySize / 1024 / 1024).toFixed(2)} MB)`);
                totalMemory -= evicted!.memorySize;
                this.cache.delete(lruKey);
            } else {
                break;
            }
        }
    }

    /**
     * Manually unload a model from cache
     */
    public unloadModel(layerId: string): void {
        if (this.cache.has(layerId)) {
            console.log(`Unloading model: ${layerId}`);
            this.cache.delete(layerId);
        }
    }

    /**
     * Clear all cached models
     */
    public clearCache(): void {
        console.log('Clearing all cached models');
        this.cache.clear();
    }

    /**
     * Get current cache statistics
     */
    public getCacheStats(): {
        count: number;
        totalMemory: number;
        models: string[];
    } {
        let totalMemory = 0;
        const models: string[] = [];

        this.cache.forEach((entry, key) => {
            totalMemory += entry.memorySize;
            models.push(key);
        });

        return {
            count: this.cache.size,
            totalMemory,
            models
        };
    }

    /**
     * Check if a model is available for a layer
     */
    public hasModel(layerId: string): boolean {
        return MEDICAL_MODEL_REGISTRY[layerId] !== undefined;
    }

    /**
     * Get metadata for a specific layer's model
     */
    public getModelMetadata(layerId: string): MedicalModelMetadata | null {
        return MEDICAL_MODEL_REGISTRY[layerId] || null;
    }
}

// Export singleton instance
export const medicalModelLoader = MedicalModelLoader.getInstance();
