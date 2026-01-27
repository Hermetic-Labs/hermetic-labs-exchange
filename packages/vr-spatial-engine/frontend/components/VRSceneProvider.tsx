/**
 * VRSceneProvider - Base VR Scene Infrastructure
 *
 * Provides a shared Three.js/WebXR scene that modules can plug into.
 * Handles:
 * - Static environment (grid, skybox, lighting)
 * - WebXR session management
 * - Proper disposal to prevent WebGL uniform errors
 * - Module scene injection points
 *
 * Usage:
 * <VRSceneProvider onSceneReady={(scene, camera, renderer) => {
 *   // Add your module's 3D content here
 *   scene.add(myMedicalModel);
 * }}>
 *   <YourModuleUI />
 * </VRSceneProvider>
 */

import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =============================================================================
// TYPES
// =============================================================================

export interface VRSceneContextValue {
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    controls: OrbitControls | null;
    moduleGroup: THREE.Group | null;
    xrSession: XRSession | null;
    isVRActive: boolean;
    enterVR: () => Promise<void>;
    exitVR: () => Promise<void>;
}

export interface VRSceneProviderProps {
    children?: React.ReactNode;
    /** Callback when scene is ready - add your module content here */
    onSceneReady?: (scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, moduleGroup: THREE.Group) => void;
    /** Callback for cleanup when scene is disposed */
    onSceneDispose?: () => void;
    /** Background color (default: dark space) */
    backgroundColor?: number;
    /** Show floor grid */
    showGrid?: boolean;
    /** Show starfield background */
    showStars?: boolean;
    /** Enable orbit controls */
    enableControls?: boolean;
    /** Initial camera position */
    cameraPosition?: [number, number, number];
    /** Camera target / look-at point */
    cameraTarget?: [number, number, number];
    /** CSS class for container */
    className?: string;
}

// =============================================================================
// CONTEXT
// =============================================================================

const VRSceneContext = createContext<VRSceneContextValue>({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    moduleGroup: null,
    xrSession: null,
    isVRActive: false,
    enterVR: async () => {},
    exitVR: async () => {},
});

export const useVRScene = () => useContext(VRSceneContext);

// =============================================================================
// STATIC SCENE ELEMENTS
// =============================================================================

function createStarfield(count: number = 1000): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 200;
        positions[i + 1] = (Math.random() - 0.5) * 200;
        positions[i + 2] = (Math.random() - 0.5) * 200;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        transparent: true,
        opacity: 0.15,
        sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
}

function createFloorGrid(size: number = 20, divisions: number = 20): THREE.Group {
    const group = new THREE.Group();

    // Grid helper
    const grid = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
    grid.material.opacity = 0.3;
    grid.material.transparent = true;
    group.add(grid);

    // Subtle floor plane (for shadows if needed)
    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.5,
        roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01; // Slightly below grid to prevent z-fighting
    floor.receiveShadow = true;
    group.add(floor);

    return group;
}

function createDefaultLighting(scene: THREE.Scene): void {
    // Ambient - base illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    // Hemisphere - sky/ground color gradient
    const hemi = new THREE.HemisphereLight(0x88bbff, 0x223344, 0.3);
    scene.add(hemi);

    // Key light - main directional
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    // Fill light - softer opposite side
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);
}

// =============================================================================
// DISPOSAL HELPER
// =============================================================================

function disposeScene(scene: THREE.Scene): void {
    scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
            } else if (object.material) {
                object.material.dispose();
            }
        }
        if (object instanceof THREE.Points) {
            object.geometry?.dispose();
            if (object.material instanceof THREE.Material) {
                object.material.dispose();
            }
        }
        if (object instanceof THREE.Line) {
            object.geometry?.dispose();
            if (object.material instanceof THREE.Material) {
                object.material.dispose();
            }
        }
        if (object instanceof THREE.Sprite) {
            object.material?.dispose();
        }
    });
    scene.clear();
}

// =============================================================================
// COMPONENT
// =============================================================================

export const VRSceneProvider: React.FC<VRSceneProviderProps> = ({
    children,
    onSceneReady,
    onSceneDispose,
    backgroundColor = 0x0a0b10,
    showGrid = true,
    showStars = true,
    enableControls = true,
    cameraPosition = [0, 2, 8],
    cameraTarget = [0, 1, 0],
    className = '',
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const moduleGroupRef = useRef<THREE.Group | null>(null);
    const animationIdRef = useRef<number>(0);
    const xrSessionRef = useRef<XRSession | null>(null);

    const [isVRActive, setIsVRActive] = useState(false);
    const [contextValue, setContextValue] = useState<VRSceneContextValue>({
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        moduleGroup: null,
        xrSession: null,
        isVRActive: false,
        enterVR: async () => {},
        exitVR: async () => {},
    });

    // Enter VR mode
    const enterVR = useCallback(async () => {
        if (!navigator.xr || !rendererRef.current) {
            console.warn('[VRSceneProvider] WebXR not available');
            return;
        }

        try {
            const session = await navigator.xr.requestSession('immersive-vr', {
                requiredFeatures: ['local-floor'],
                optionalFeatures: ['hand-tracking'],
            });

            xrSessionRef.current = session;
            setIsVRActive(true);

            await rendererRef.current.xr.setSession(session);

            session.addEventListener('end', () => {
                xrSessionRef.current = null;
                setIsVRActive(false);
            });

            console.log('[VRSceneProvider] VR session started');
        } catch (error) {
            console.error('[VRSceneProvider] Failed to enter VR:', error);
        }
    }, []);

    // Exit VR mode
    const exitVR = useCallback(async () => {
        if (xrSessionRef.current) {
            await xrSessionRef.current.end();
        }
    }, []);

    // Initialize scene
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(backgroundColor);
        scene.fog = new THREE.Fog(backgroundColor, 30, 100);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(...cameraPosition);
        camera.lookAt(...cameraTarget);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.xr.enabled = true;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        let controls: OrbitControls | null = null;
        if (enableControls) {
            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.target.set(...cameraTarget);
            controlsRef.current = controls;
        }

        // Static scene elements
        createDefaultLighting(scene);

        if (showStars) {
            const stars = createStarfield();
            scene.add(stars);
        }

        if (showGrid) {
            const grid = createFloorGrid();
            scene.add(grid);
        }

        // Module group - this is where modules add their content
        const moduleGroup = new THREE.Group();
        moduleGroup.name = 'ModuleContent';
        scene.add(moduleGroup);
        moduleGroupRef.current = moduleGroup;

        // Update context
        setContextValue({
            scene,
            camera,
            renderer,
            controls,
            moduleGroup,
            xrSession: null,
            isVRActive: false,
            enterVR,
            exitVR,
        });

        // Notify module that scene is ready
        onSceneReady?.(scene, camera, renderer, moduleGroup);

        // Animation loop with disposed check
        let isDisposed = false;

        const animate = () => {
            if (isDisposed) return;
            animationIdRef.current = requestAnimationFrame(animate);

            controls?.update();
            renderer.render(scene, camera);
        };

        // Use setAnimationLoop for WebXR compatibility
        renderer.setAnimationLoop((time, frame) => {
            if (isDisposed) {
                renderer.setAnimationLoop(null);
                return;
            }
            controls?.update();
            renderer.render(scene, camera);
        });

        // Resize handler
        const handleResize = () => {
            const w = container.clientWidth || window.innerWidth;
            const h = container.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            isDisposed = true;

            window.removeEventListener('resize', handleResize);

            // Notify module of disposal
            onSceneDispose?.();

            // Cancel animation
            cancelAnimationFrame(animationIdRef.current);
            renderer.setAnimationLoop(null);

            // End XR session if active
            if (xrSessionRef.current) {
                xrSessionRef.current.end().catch(() => {});
            }

            // Dispose all scene objects
            disposeScene(scene);

            // Dispose controls and renderer
            controls?.dispose();
            renderer.dispose();
            renderer.forceContextLoss();

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }

            // Clear refs
            sceneRef.current = null;
            cameraRef.current = null;
            rendererRef.current = null;
            controlsRef.current = null;
            moduleGroupRef.current = null;
        };
    }, [backgroundColor, showGrid, showStars, enableControls, cameraPosition, cameraTarget, onSceneReady, onSceneDispose, enterVR, exitVR]);

    // Update context when VR state changes
    useEffect(() => {
        setContextValue(prev => ({
            ...prev,
            xrSession: xrSessionRef.current,
            isVRActive,
        }));
    }, [isVRActive]);

    return (
        <VRSceneContext.Provider value={contextValue}>
            <div
                ref={containerRef}
                className={`vr-scene-provider relative w-full h-full ${className}`}
                style={{ minHeight: '400px' }}
            >
                {children}
            </div>
        </VRSceneContext.Provider>
    );
};

export default VRSceneProvider;
