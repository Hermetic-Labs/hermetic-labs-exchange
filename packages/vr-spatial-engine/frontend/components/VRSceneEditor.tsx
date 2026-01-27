import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PerspectiveCamera } from '@react-three/drei';
import { VRScene, VRSceneObject, VRPerformanceMetrics } from '../types/vr';
import { VRSceneService } from '../services/VRSceneService';
import './VRSceneEditor.css';

interface VRSceneEditorProps {
  initialScene?: VRScene;
  onSceneChange?: (scene: VRScene) => void;
  onObjectSelect?: (objectId: string | null) => void;
  enableVR?: boolean;
  showPerformance?: boolean;
}

interface EditorState {
  selectedObjectId: string | null;
  mode: 'select' | 'translate' | 'rotate' | 'scale';
  snapToGrid: boolean;
  showGrid: boolean;
  showWireframe: boolean;
  autoSave: boolean;
}

export const VRSceneEditor: React.FC<VRSceneEditorProps> = ({
  initialScene,
  onSceneChange,
  onObjectSelect,
  enableVR = true,
  showPerformance = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sceneService] = useState(() => new VRSceneService());
  const [currentScene, setCurrentScene] = useState<VRScene | null>(initialScene || null);
  const [editorState, setEditorState] = useState<EditorState>({
    selectedObjectId: null,
    mode: 'select',
    snapToGrid: false,
    showGrid: true,
    showWireframe: false,
    autoSave: true
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<VRPerformanceMetrics | null>(null);
  const [isVRMode, setIsVRMode] = useState(false);
  const [vrSession, setVRSession] = useState<XRSession | null>(null);

  useEffect(() => {
    const initializeEditor = async () => {
      try {
        await sceneService.initialize();
        console.log('[VR-EDITOR] Scene editor initialized');
      } catch (error) {
        console.error('[VR-EDITOR] Failed to initialize editor:', error);
      }
    };

    initializeEditor();

    return () => {
      // Cleanup
    };
  }, [sceneService]);

  const handleObjectSelect = useCallback((objectId: string | null) => {
    setEditorState(prev => ({ ...prev, selectedObjectId: objectId }));
    onObjectSelect?.(objectId);
  }, [onObjectSelect]);

  const handleSceneChange = useCallback((updatedScene: VRScene) => {
    setCurrentScene(updatedScene);
    onSceneChange?.(updatedScene);

    if (editorState.autoSave) {
      saveScene(updatedScene);
    }
  }, [onSceneChange, editorState.autoSave]);

  const handleModeChange = useCallback((mode: EditorState['mode']) => {
    setEditorState(prev => ({ ...prev, mode }));
  }, []);

  const handleToggleGrid = useCallback(() => {
    setEditorState(prev => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const handleToggleWireframe = useCallback(() => {
    setEditorState(prev => ({ ...prev, showWireframe: !prev.showWireframe }));
  }, []);

  const handleToggleSnapToGrid = useCallback(() => {
    setEditorState(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }));
  }, []);

  const startVRSession = useCallback(async () => {
    try {
      if (!navigator.xr) {
        throw new Error('WebXR not supported');
      }

      const session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking', 'spatial-anchors']
      });

      setVRSession(session);
      setIsVRMode(true);

      // Attach session to canvas
      if (canvasRef.current) {
        canvasRef.current.addEventListener('webglcontextlost', () => {
          console.log('[VR-EDITOR] WebGL context lost');
        });
      }

      console.log('[VR-EDITOR] VR session started');

    } catch (error) {
      console.error('[VR-EDITOR] Failed to start VR session:', error);
    }
  }, []);

  const stopVRSession = useCallback(async () => {
    if (vrSession) {
      await vrSession.end();
      setVRSession(null);
      setIsVRMode(false);
      console.log('[VR-EDITOR] VR session stopped');
    }
  }, [vrSession]);

  const saveScene = useCallback((scene: VRScene) => {
    try {
      const sceneData = JSON.stringify(scene, null, 2);
      localStorage.setItem(`vr-scene-${scene.id}`, sceneData);
      console.log('[VR-EDITOR] Scene saved to localStorage');
    } catch (error) {
      console.error('[VR-EDITOR] Failed to save scene:', error);
    }
  }, []);

  const loadScene = useCallback(async (sceneId: string) => {
    try {
      const sceneData = localStorage.getItem(`vr-scene-${sceneId}`);
      if (sceneData) {
        const scene = JSON.parse(sceneData) as VRScene;
        setCurrentScene(scene);
        console.log('[VR-EDITOR] Scene loaded from localStorage');
      }
    } catch (error) {
      console.error('[VR-EDITOR] Failed to load scene:', error);
    }
  }, []);

  const createNewObject = useCallback((type: VRSceneObject['type']) => {
    if (!currentScene) return;

    const newObject: VRSceneObject = {
      id: `object-${Date.now()}`,
      type,
      name: `${type}-${Date.now()}`,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1]
      },
      visible: true,
      interactive: true
    };

    const updatedScene = {
      ...currentScene,
      objects: [...currentScene.objects, newObject],
      updatedAt: new Date().toISOString()
    };

    handleSceneChange(updatedScene);
  }, [currentScene, handleSceneChange]);

  const deleteSelectedObject = useCallback(() => {
    if (!currentScene || !editorState.selectedObjectId) return;

    const updatedScene = {
      ...currentScene,
      objects: currentScene.objects.filter(obj => obj.id !== editorState.selectedObjectId),
      updatedAt: new Date().toISOString()
    };

    handleSceneChange(updatedScene);
    handleObjectSelect(null);
  }, [currentScene, editorState.selectedObjectId, handleSceneChange, handleObjectSelect]);

  return (
    <div className="vr-scene-editor">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <button
            className={`toolbar-button ${editorState.mode === 'select' ? 'active' : ''}`}
            onClick={() => handleModeChange('select')}
            title="Select (V)"
          >
            🖱️
          </button>
          <button
            className={`toolbar-button ${editorState.mode === 'translate' ? 'active' : ''}`}
            onClick={() => handleModeChange('translate')}
            title="Move (T)"
          >
            ✋
          </button>
          <button
            className={`toolbar-button ${editorState.mode === 'rotate' ? 'active' : ''}`}
            onClick={() => handleModeChange('rotate')}
            title="Rotate (R)"
          >
            🔄
          </button>
          <button
            className={`toolbar-button ${editorState.mode === 'scale' ? 'active' : ''}`}
            onClick={() => handleModeChange('scale')}
            title="Scale (S)"
          >
            📐
          </button>
        </div>

        <div className="toolbar-section">
          <button
            className={`toolbar-button ${editorState.showGrid ? 'active' : ''}`}
            onClick={handleToggleGrid}
            title="Toggle Grid (G)"
          >
            #
          </button>
          <button
            className={`toolbar-button ${editorState.showWireframe ? 'active' : ''}`}
            onClick={handleToggleWireframe}
            title="Toggle Wireframe (W)"
          >
            ⬜
          </button>
          <button
            className={`toolbar-button ${editorState.snapToGrid ? 'active' : ''}`}
            onClick={handleToggleSnapToGrid}
            title="Snap to Grid (X)"
          >
            🧲
          </button>
        </div>

        <div className="toolbar-section">
          {!isVRMode ? (
            <button
              className="toolbar-button vr-button"
              onClick={startVRSession}
              title="Enter VR Mode"
            >
              🥽
            </button>
          ) : (
            <button
              className="toolbar-button vr-button active"
              onClick={stopVRSession}
              title="Exit VR Mode"
            >
              🥽❌
            </button>
          )}
        </div>

        <div className="toolbar-section">
          <button
            className="toolbar-button"
            onClick={() => createNewObject('mesh')}
            title="Add Mesh"
          >
            📦
          </button>
          <button
            className="toolbar-button"
            onClick={() => createNewObject('light')}
            title="Add Light"
          >
            💡
          </button>
          <button
            className="toolbar-button"
            onClick={() => createNewObject('camera')}
            title="Add Camera"
          >
            📷
          </button>
        </div>

        <div className="toolbar-section">
          <button
            className="toolbar-button delete-button"
            onClick={deleteSelectedObject}
            disabled={!editorState.selectedObjectId}
            title="Delete Selected (Del)"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="editor-main">
        {/* 3D Viewport */}
        <div className="viewport">
          <Canvas
            ref={canvasRef}
            camera={{ position: [10, 10, 10], fov: 75 }}
            shadows
            className="editor-canvas"
          >
            <PerspectiveCamera makeDefault position={[10, 10, 10]} />
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
            />
            
            {/* Environment */}
            <Environment preset="studio" />
            
            {/* Grid */}
            {editorState.showGrid && (
              <Grid
                args={[100, 100]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="#6f6f6f"
                sectionSize={10}
                sectionThickness={1}
                sectionColor="#9d4b4b"
                fadeDistance={100}
                fadeStrength={1}
                infiniteGrid={false}
              />
            )}

            {/* Scene Objects */}
            {currentScene?.objects.map((obj) => (
              <SceneObject
                key={obj.id}
                object={obj}
                isSelected={obj.id === editorState.selectedObjectId}
                mode={editorState.mode}
                showWireframe={editorState.showWireframe}
                snapToGrid={editorState.snapToGrid}
                onSelect={handleObjectSelect}
                onTransform={(transform) => {
                  // Handle object transformation
                  const updatedObjects = currentScene.objects.map(o =>
                    o.id === obj.id ? { ...o, transform } : o
                  );
                  handleSceneChange({
                    ...currentScene,
                    objects: updatedObjects
                  });
                }}
              />
            ))}

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 10, 5]}
              castShadow
              intensity={1}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
          </Canvas>
        </div>

        {/* Sidebar */}
        <div className="editor-sidebar">
          {/* Properties Panel */}
          <div className="properties-panel">
            <h3>Properties</h3>
            {editorState.selectedObjectId ? (
              <ObjectProperties
                object={currentScene?.objects.find(obj => obj.id === editorState.selectedObjectId)}
                onChange={(updates) => {
                  if (!currentScene || !editorState.selectedObjectId) return;
                  
                  const updatedObjects = currentScene.objects.map(obj =>
                    obj.id === editorState.selectedObjectId ? { ...obj, ...updates } : obj
                  );
                  handleSceneChange({
                    ...currentScene,
                    objects: updatedObjects
                  });
                }}
              />
            ) : (
              <div className="no-selection">No object selected</div>
            )}
          </div>

          {/* Performance Panel */}
          {showPerformance && performanceMetrics && (
            <div className="performance-panel">
              <h3>Performance</h3>
              <div className="performance-metrics">
                <div>FPS: {performanceMetrics.frameRate.toFixed(1)}</div>
                <div>Frame Time: {performanceMetrics.frameTime.toFixed(2)}ms</div>
                <div>Memory: {(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
                <div>Triangles: {performanceMetrics.triangles.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Scene Hierarchy */}
          <div className="hierarchy-panel">
            <h3>Scene Hierarchy</h3>
            <div className="scene-tree">
              {currentScene?.objects.map((obj) => (
                <div
                  key={obj.id}
                  className={`tree-item ${obj.id === editorState.selectedObjectId ? 'selected' : ''}`}
                  onClick={() => handleObjectSelect(obj.id)}
                >
                  <span className={`object-icon ${obj.type}`}>
                    {obj.type === 'mesh' ? '📦' : 
                     obj.type === 'light' ? '💡' : 
                     obj.type === 'camera' ? '📷' : '❓'}
                  </span>
                  <span className="object-name">{obj.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Scene Object Component
interface SceneObjectProps {
  object: VRSceneObject;
  isSelected: boolean;
  mode: EditorState['mode'];
  showWireframe: boolean;
  snapToGrid: boolean;
  onSelect: (objectId: string | null) => void;
  onTransform: (transform: VRSceneObject['transform']) => void;
}

const SceneObject: React.FC<SceneObjectProps> = ({
  object,
  isSelected,
  mode,
  showWireframe,
  snapToGrid,
  onSelect,
  onTransform
}) => {
  // This would render the actual 3D object using Three.js/React Three Fiber
  // For now, we'll render a simple placeholder
  
  return (
    <group
      position={object.transform.position}
      rotation={object.transform.rotation}
      scale={object.transform.scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(object.id);
      }}
    >
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={isSelected ? '#ff6b6b' : object.material?.properties.color || '#4ecdc4'}
          wireframe={showWireframe}
        />
      </mesh>
      {isSelected && (
        <mesh>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial
            color="#ff6b6b"
            wireframe={true}
            transparent={true}
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
};

// Object Properties Panel
interface ObjectPropertiesProps {
  object?: VRSceneObject;
  onChange: (updates: Partial<VRSceneObject>) => void;
}

const ObjectProperties: React.FC<ObjectPropertiesProps> = ({ object, onChange }) => {
  if (!object) return null;

  return (
    <div className="object-properties">
      <div className="property-group">
        <label>Name</label>
        <input
          type="text"
          value={object.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      
      <div className="property-group">
        <label>Position</label>
        <div className="vector-input">
          <input
            type="number"
            step="0.1"
            value={object.transform.position[0]}
            onChange={(e) => onChange({
              transform: {
                ...object.transform,
                position: [parseFloat(e.target.value), object.transform.position[1], object.transform.position[2]]
              }
            })}
            placeholder="X"
          />
          <input
            type="number"
            step="0.1"
            value={object.transform.position[1]}
            onChange={(e) => onChange({
              transform: {
                ...object.transform,
                position: [object.transform.position[0], parseFloat(e.target.value), object.transform.position[2]]
              }
            })}
            placeholder="Y"
          />
          <input
            type="number"
            step="0.1"
            value={object.transform.position[2]}
            onChange={(e) => onChange({
              transform: {
                ...object.transform,
                position: [object.transform.position[0], object.transform.position[1], parseFloat(e.target.value)]
              }
            })}
            placeholder="Z"
          />
        </div>
      </div>

      <div className="property-group">
        <label>Rotation</label>
        <div className="vector-input">
          <input
            type="number"
            step="0.1"
            value={object.transform.rotation[0]}
            onChange={(e) => onChange({
              transform: {
                ...object.transform,
                rotation: [parseFloat(e.target.value), object.transform.rotation[1], object.transform.rotation[2], object.transform.rotation[3]]
              }
            })}
            placeholder="X"
          />
          <input
            type="number"
            step="0.1"
            value={object.transform.rotation[1]}
            onChange={(e) => onChange({
              transform: {
                ...object.transform,
                rotation: [object.transform.rotation[0], parseFloat(e.target.value), object.transform.rotation[2], object.transform.rotation[3]]
              }
            })}
            placeholder="Y"
          />
          <input
            type="number"
            step="0.1"
            value={object.transform.rotation[2]}
            onChange={(e) => onChange({
              transform: {
                ...object.transform,
                rotation: [object.transform.rotation[0], object.transform.rotation[1], parseFloat(e.target.value), object.transform.rotation[3]]
              }
            })}
            placeholder="Z"
          />
          <input
            type="number"
            step="0.1"
            value={object.transform.rotation[3]}
            onChange={(e) => onChange({
              transform: {
                ...object.transform,
                rotation: [object.transform.rotation[0], object.transform.rotation[1], object.transform.rotation[2], parseFloat(e.target.value)]
              }
            })}
            placeholder="W"
          />
        </div>
      </div>

      <div className="property-group">
        <label>Scale</label>
        <div className="vector-input">
          <input
            type="number"
            step="0.1"
            value={object.transform.scale[0]}
            onChange={(e) => onChange({
              transform: {
                ...object.transform,
                scale: [parseFloat(e.target.value), object.transform.scale[1], object.transform.scale[2]]
              }
            })}
            placeholder="X"
          />
          <input
            type="number"
            step="0.1"
            value={object.transform.scale[1]}
            onChange={(e) => onChange({
              transform: {
                ...object.transform,
                scale: [object.transform.scale[0], parseFloat(e.target.value), object.transform.scale[2]]
              }
            })}
            placeholder="Y"
          />
          <input
            type="number"
            step="0.1"
            value={object.transform.scale[2]}
            onChange={(e) => onChange({
              transform: {
                ...object.transform,
                scale: [object.transform.scale[0], object.transform.scale[1], parseFloat(e.target.value)]
              }
            })}
            placeholder="Z"
          />
        </div>
      </div>

      <div className="property-group">
        <label>
          <input
            type="checkbox"
            checked={object.visible}
            onChange={(e) => onChange({ visible: e.target.checked })}
          />
          Visible
        </label>
      </div>

      <div className="property-group">
        <label>
          <input
            type="checkbox"
            checked={object.interactive}
            onChange={(e) => onChange({ interactive: e.target.checked })}
          />
          Interactive
        </label>
      </div>
    </div>
  );
};

export default VRSceneEditor;