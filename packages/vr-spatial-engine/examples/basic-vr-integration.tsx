// Basic VR Integration Example for EVE-OS VR Spatial Engine
import React, { useState, useEffect } from 'react';
import { VRSpatialEngine, VRScene, VRSceneObject } from '../module-implementation';
import { VRSceneEditor } from '../ui/VRSceneEditor';

interface BasicVRIntegrationProps {
  onSceneChange?: (scene: VRScene) => void;
}

export const BasicVRIntegration: React.FC<BasicVRIntegrationProps> = ({
  onSceneChange
}) => {
  const [vrEngine, setVREngine] = useState<VRSpatialEngine | null>(null);
  const [currentScene, setCurrentScene] = useState<VRScene | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeVR = async () => {
      try {
        console.log('[VR-EXAMPLE] Initializing VR integration...');
        
        // Create VR engine instance
        const engine = new VRSpatialEngine(`vr-session-${Date.now()}`);
        
        // Setup event listeners
        engine.on('engine_initialized', (event) => {
          console.log('[VR-EXAMPLE] VR engine initialized:', event.data);
          setIsInitialized(true);
        });

        engine.on('vr_session_started', (event) => {
          console.log('[VR-EXAMPLE] VR session started:', event.data);
        });

        engine.on('scene_created', (event) => {
          console.log('[VR-EXAMPLE] Scene created:', event.data);
          setCurrentScene(event.data);
          onSceneChange?.(event.data);
        });

        engine.on('spatial_anchor_added', (event) => {
          console.log('[VR-EXAMPLE] Spatial anchor added:', event.data);
        });

        setVREngine(engine);
        
      } catch (err) {
        console.error('[VR-EXAMPLE] Failed to initialize VR:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    initializeVR();

    return () => {
      // Cleanup
      if (vrEngine) {
        vrEngine.removeAllListeners();
      }
    };
  }, [onSceneChange]);

  const startVRSession = async () => {
    if (!vrEngine) return;

    try {
      await vrEngine.startVRSession({
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking', 'spatial-anchors', 'layers'],
        sessionMode: 'immersive-vr',
        referenceSpaceType: 'local-floor'
      });
    } catch (err) {
      console.error('[VR-EXAMPLE] Failed to start VR session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start VR session');
    }
  };

  const stopVRSession = async () => {
    if (!vrEngine) return;

    try {
      await vrEngine.stopVRSession();
    } catch (err) {
      console.error('[VR-EXAMPLE] Failed to stop VR session:', err);
    }
  };

  const createSampleScene = async () => {
    if (!vrEngine) return;

    try {
      const sampleScene: VRScene = {
        id: `sample-scene-${Date.now()}`,
        name: 'Sample VR Scene',
        description: 'A basic VR scene created for demonstration',
        objects: [
          {
            id: 'cube-1',
            type: 'mesh',
            name: 'Interactive Cube',
            transform: {
              position: [0, 1, -2],
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1]
            },
            geometry: {
              type: 'box',
              parameters: { width: 1, height: 1, depth: 1 }
            },
            material: {
              type: 'standard',
              properties: {
                color: '#4ecdc4',
                metalness: 0.3,
                roughness: 0.4
              }
            },
            components: [
              {
                type: 'interaction',
                config: {
                  type: 'click',
                  handler: 'highlightObject'
                },
                enabled: true
              }
            ],
            visible: true,
            interactive: true
          },
          {
            id: 'light-1',
            type: 'light',
            name: 'Main Light',
            transform: {
              position: [5, 5, 5],
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1]
            },
            visible: true,
            interactive: false
          },
          {
            id: 'sphere-1',
            type: 'mesh',
            name: 'Floating Sphere',
            transform: {
              position: [2, 1.5, -3],
              rotation: [0, 0, 0, 1],
              scale: [0.5, 0.5, 0.5]
            },
            geometry: {
              type: 'sphere',
              parameters: { radius: 0.5, widthSegments: 32, heightSegments: 16 }
            },
            material: {
              type: 'standard',
              properties: {
                color: '#ff6b6b',
                emissive: '#ff6b6b',
                emissiveIntensity: 0.1
              }
            },
            visible: true,
            interactive: true
          }
        ],
        environment: {
          background: '#87ceeb',
          ambientLight: {
            color: '#ffffff',
            intensity: 0.4
          }
        },
        lighting: {
          directional: [
            {
              color: '#ffffff',
              intensity: 1,
              position: [5, 5, 5],
              castShadow: true
            }
          ]
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await vrEngine.createSceneFromSchema(sampleScene, {
        autoOptimize: true,
        enablePhysics: false,
        enableLighting: true
      });

    } catch (err) {
      console.error('[VR-EXAMPLE] Failed to create sample scene:', err);
      setError(err instanceof Error ? err.message : 'Failed to create scene');
    }
  };

  const addSpatialAnchor = async () => {
    if (!vrEngine) return;

    try {
      await vrEngine.addSpatialAnchor(
        [0, 1, -2], // position
        [0, 0, 0, 1], // rotation (quaternion)
        'Sample Anchor',
        3600000 // 1 hour lifetime
      );
    } catch (err) {
      console.error('[VR-EXAMPLE] Failed to add spatial anchor:', err);
    }
  };

  const getSpatialData = async () => {
    if (!vrEngine) return;

    try {
      const spatialData = await vrEngine.getSpatialData();
      console.log('[VR-EXAMPLE] Current spatial data:', spatialData);
    } catch (err) {
      console.error('[VR-EXAMPLE] Failed to get spatial data:', err);
    }
  };

  const getSessionStats = () => {
    if (!vrEngine) return;

    const stats = vrEngine.getSessionStatistics();
    console.log('[VR-EXAMPLE] Session statistics:', stats);
  };

  if (error) {
    return (
      <div className="vr-integration-error">
        <h2>VR Integration Error</h2>
        <p>{error}</p>
        <p>Please ensure your browser supports WebXR and you have a VR headset connected.</p>
      </div>
    );
  }

  return (
    <div className="basic-vr-integration">
      <div className="vr-controls">
        <h2>VR Spatial Engine - Basic Integration</h2>
        
        <div className="control-section">
          <h3>Engine Status</h3>
          <div className="status-indicator">
            <span className={`status-dot ${isInitialized ? 'active' : 'inactive'}`} />
            {isInitialized ? 'Initialized' : 'Initializing...'}
          </div>
        </div>

        <div className="control-section">
          <h3>Session Management</h3>
          <div className="button-group">
            <button
              onClick={startVRSession}
              disabled={!isInitialized || vrEngine?.isVRActive()}
              className="vr-button primary"
            >
              Start VR Session
            </button>
            <button
              onClick={stopVRSession}
              disabled={!vrEngine?.isVRActive()}
              className="vr-button secondary"
            >
              Stop VR Session
            </button>
          </div>
        </div>

        <div className="control-section">
          <h3>Scene Management</h3>
          <div className="button-group">
            <button
              onClick={createSampleScene}
              disabled={!isInitialized}
              className="vr-button primary"
            >
              Create Sample Scene
            </button>
            <button
              onClick={addSpatialAnchor}
              disabled={!vrEngine?.isVRActive()}
              className="vr-button secondary"
            >
              Add Spatial Anchor
            </button>
          </div>
        </div>

        <div className="control-section">
          <h3>Debug & Analytics</h3>
          <div className="button-group">
            <button
              onClick={getSpatialData}
              disabled={!vrEngine?.isVRActive()}
              className="vr-button secondary"
            >
              Get Spatial Data
            </button>
            <button
              onClick={getSessionStats}
              disabled={!isInitialized}
              className="vr-button secondary"
            >
              Session Statistics
            </button>
          </div>
        </div>

        {vrEngine?.isVRActive() && (
          <div className="control-section">
            <h3>Active VR Session</h3>
            <div className="session-info">
              <p>Session ID: {vrEngine.getSessionId()}</p>
              <p>Current Scene: {vrEngine.getCurrentScene()?.name || 'None'}</p>
              <p>Spatial Anchors: {vrEngine.getSpatialAnchors().length}</p>
            </div>
          </div>
        )}
      </div>

      {currentScene && (
        <div className="vr-scene-editor-container">
          <h3>VR Scene Editor</h3>
          <VRSceneEditor
            initialScene={currentScene}
            onSceneChange={setCurrentScene}
            enableVR={true}
            showPerformance={true}
          />
        </div>
      )}
    </div>
  );
};

export default BasicVRIntegration;