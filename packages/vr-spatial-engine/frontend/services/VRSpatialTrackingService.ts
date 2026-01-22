import { EventEmitter } from 'events';
import { VRSpatialData, SpatialAnchor, XRInputSource } from '../types/vr';

export interface SpatialTrackingConfig {
  trackingSpace: 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';
  features: string[];
  updateFrequency: number;
}

export interface SpatialAnchorOptions {
  position: [number, number, number];
  rotation: [number, number, number, number];
  description?: string;
  lifetime?: number;
}

export class VRSpatialTrackingService extends EventEmitter {
  private isTracking: boolean = false;
  private xrSession: XRSession | null = null;
  private referenceSpace: XRReferenceSpace | null = null;
  private spatialAnchors: Map<string, SpatialAnchor> = new Map();
  private trackingData: Map<string, VRSpatialData> = new Map();
  private config: SpatialTrackingConfig;
  private lastUpdate: number = 0;
  private updateInterval: number = 16; // ~60 FPS

  constructor(config?: Partial<SpatialTrackingConfig>) {
    super();
    this.config = {
      trackingSpace: 'local-floor',
      features: ['local-floor'],
      updateFrequency: 60,
      ...config
    };
  }

  async initialize(config?: Partial<SpatialTrackingConfig>): Promise<void> {
    console.log('[VR-SPATIAL] Initializing Spatial Tracking Service...');

    try {
      // Check WebXR support
      if (!navigator.xr) {
        throw new Error('WebXR not supported');
      }

      // Update configuration
      this.config = { ...this.config, ...config };

      // Check device capabilities
      const supportedFeatures = await navigator.xr.isSessionSupported('immersive-vr');
      if (!supportedFeatures) {
        throw new Error('VR session not supported');
      }

      console.log('[SUCCESS] Spatial Tracking Service initialized');
      
      // Emit initialization event
      this.emit('trackingInitialized', {
        config: this.config,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[ERROR] Failed to initialize spatial tracking:', error);
      throw error;
    }
  }

  async startTracking(session: XRSession, referenceSpace: XRReferenceSpace): Promise<void> {
    console.log('[VR-SPATIAL] Starting spatial tracking...');

    this.xrSession = session;
    this.referenceSpace = referenceSpace;
    this.isTracking = true;

    // Setup session event listeners
    this.setupSessionListeners();

    // Start continuous tracking
    this.startContinuousTracking();

    console.log('[SUCCESS] Spatial tracking started');

    // Emit tracking started event
    this.emit('trackingStarted', {
      sessionId: session.mode,
      referenceSpace: referenceSpace.type,
      timestamp: new Date().toISOString()
    });
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) return;

    console.log('[VR-SPATIAL] Stopping spatial tracking...');

    this.isTracking = false;
    this.xrSession = null;
    this.referenceSpace = null;
    this.trackingData.clear();

    console.log('[SUCCESS] Spatial tracking stopped');

    // Emit tracking stopped event
    this.emit('trackingStopped', {
      timestamp: new Date().toISOString()
    });
  }

  async updateFrame(frame: XRFrame, referenceSpace: XRReferenceSpace): Promise<void> {
    if (!this.isTracking || !frame || !referenceSpace) return;

    const currentTime = performance.now();
    
    // Rate limiting
    if (currentTime - this.lastUpdate < this.updateInterval) {
      return;
    }
    this.lastUpdate = currentTime;

    try {
      // Update head tracking
      await this.updateHeadTracking(frame, referenceSpace);

      // Update hand tracking
      await this.updateHandTracking(frame, referenceSpace);

      // Update eye tracking
      if (this.config.features.includes('eye-tracking')) {
        await this.updateEyeTracking(frame, referenceSpace);
      }

      // Update controller tracking
      await this.updateControllerTracking(frame, referenceSpace);

      // Update spatial anchors
      await this.updateSpatialAnchors(frame, referenceSpace);

    } catch (error) {
      console.error('[ERROR] Failed to update spatial tracking:', error);
    }
  }

  private async updateHeadTracking(frame: XRFrame, referenceSpace: XRReferenceSpace): Promise<void> {
    const viewerPose = frame.getViewerPose(referenceSpace);
    if (!viewerPose) return;

    const view = viewerPose.views[0]; // Use first view as head pose
    if (!view) return;

    const transform = view.transform;
    const position = [transform.position.x, transform.position.y, transform.position.z];
    const rotation = [transform.orientation.x, transform.orientation.y, transform.orientation.z, transform.orientation.w];

    const headData: VRSpatialData = {
      position,
      rotation,
      timestamp: new Date().toISOString(),
      confidence: 1.0,
      source: 'head'
    };

    this.trackingData.set('head', headData);

    // Emit head tracking update
    this.emit('headTrackingUpdate', headData);
  }

  private async updateHandTracking(frame: XRFrame, referenceSpace: XRReferenceSpace): Promise<void> {
    const inputSources = frame.session.inputSources;
    
    for (const inputSource of inputSources) {
      if (inputSource.hand && inputSource.handedness) {
        const handData = await this.extractHandData(inputSource, referenceSpace, frame);
        if (handData) {
          this.trackingData.set(`${inputSource.handedness}-hand`, handData);
          
          // Emit hand tracking update
          this.emit('handTrackingUpdate', {
            handedness: inputSource.handedness,
            data: handData
          });
        }
      }
    }
  }

  private async updateEyeTracking(frame: XRFrame, referenceSpace: XRReferenceSpace): Promise<void> {
    // This would require WebXR Eye Tracking API
    // For now, we'll simulate eye tracking data
    
    const headData = this.trackingData.get('head');
    if (!headData) return;

    const eyeData: VRSpatialData = {
      position: headData.position,
      rotation: headData.rotation,
      timestamp: new Date().toISOString(),
      confidence: 0.8, // Eye tracking typically has lower confidence
      source: 'eye'
    };

    this.trackingData.set('eye', eyeData);

    // Emit eye tracking update
    this.emit('eyeTrackingUpdate', eyeData);
  }

  private async updateControllerTracking(frame: XRFrame, referenceSpace: XRReferenceSpace): Promise<void> {
    const inputSources = frame.session.inputSources;
    
    for (const inputSource of inputSources) {
      if (inputSource.targetRaySpace && inputSource.handedness) {
        const controllerData = await this.extractControllerData(inputSource, referenceSpace, frame);
        if (controllerData) {
          this.trackingData.set(`${inputSource.handedness}-controller`, controllerData);
          
          // Emit controller tracking update
          this.emit('controllerTrackingUpdate', {
            handedness: inputSource.handedness,
            data: controllerData
          });
        }
      }
    }
  }

  private async updateSpatialAnchors(frame: XRFrame, referenceSpace: XRReferenceSpace): Promise<void> {
    // Update existing spatial anchors
    for (const [id, anchor] of this.spatialAnchors.entries()) {
      // Check if anchor is still valid
      const age = Date.now() - new Date(anchor.createdAt).getTime();
      if (age > anchor.lifetime) {
        this.spatialAnchors.delete(id);
        console.log(`[VR-SPATIAL] Spatial anchor expired: ${id}`);
        continue;
      }

      // Update anchor tracking state
      anchor.trackingState = 'tracked'; // Simplified - would need actual WebXR anchor API
      
      // Emit anchor update
      this.emit('spatialAnchorUpdate', anchor);
    }
  }

  private async extractHandData(
    inputSource: XRInputSource, 
    referenceSpace: XRReferenceSpace, 
    frame: XRFrame
  ): Promise<VRSpatialData | null> {
    try {
      // This would extract actual hand joint data
      // For now, return simplified data
      
      const wristPose = inputSource.hand?.wrist?.pose;
      if (!wristPose) return null;

      const transform = wristPose.transform;
      return {
        position: [transform.position.x, transform.position.y, transform.position.z],
        rotation: [transform.orientation.x, transform.orientation.y, transform.orientation.z, transform.orientation.w],
        timestamp: new Date().toISOString(),
        confidence: 0.9,
        source: `${inputSource.handedness}-hand`
      };
    } catch (error) {
      console.error('Failed to extract hand data:', error);
      return null;
    }
  }

  private async extractControllerData(
    inputSource: XRInputSource, 
    referenceSpace: XRReferenceSpace, 
    frame: XRFrame
  ): Promise<VRSpatialData | null> {
    try {
      const targetRayPose = frame.getPose(inputSource.targetRaySpace, referenceSpace);
      if (!targetRayPose) return null;

      const transform = targetRayPose.transform;
      return {
        position: [transform.position.x, transform.position.y, transform.position.z],
        rotation: [transform.orientation.x, transform.orientation.y, transform.orientation.z, transform.orientation.w],
        timestamp: new Date().toISOString(),
        confidence: 1.0,
        source: `${inputSource.handedness}-controller`
      };
    } catch (error) {
      console.error('Failed to extract controller data:', error);
      return null;
    }
  }

  async addSpatialAnchor(options: SpatialAnchorOptions): Promise<SpatialAnchor> {
    console.log('[VR-SPATIAL] Adding spatial anchor...');

    const anchor: SpatialAnchor = {
      id: `anchor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: options.position,
      rotation: options.rotation,
      description: options.description,
      lifetime: options.lifetime || (24 * 60 * 60 * 1000), // 24 hours default
      createdAt: new Date().toISOString(),
      trackingState: 'tracked'
    };

    this.spatialAnchors.set(anchor.id, anchor);

    console.log('[SUCCESS] Spatial anchor added:', anchor.id);

    // Emit anchor created event
    this.emit('spatialAnchorCreated', anchor);

    return anchor;
  }

  async removeSpatialAnchor(anchorId: string): Promise<void> {
    if (this.spatialAnchors.has(anchorId)) {
      this.spatialAnchors.delete(anchorId);
      console.log('[VR-SPATIAL] Spatial anchor removed:', anchorId);

      // Emit anchor removed event
      this.emit('spatialAnchorRemoved', { anchorId });
    }
  }

  private setupSessionListeners(): void {
    if (!this.xrSession) return;

    this.xrSession.addEventListener('end', () => {
      console.log('[VR-SPATIAL] Session ended, stopping tracking');
      this.stopTracking();
    });

    this.xrSession.addEventListener('inputsourceschange', (event) => {
      console.log('[VR-SPATIAL] Input sources changed:', event);
    });
  }

  private startContinuousTracking(): void {
    // This would start the continuous tracking loop
    console.log('[VR-SPATIAL] Continuous tracking started');
  }

  async getCurrentSpatialData(): Promise<VRSpatialData> {
    const headData = this.trackingData.get('head');
    if (!headData) {
      throw new Error('No spatial tracking data available');
    }
    return headData;
  }

  async getHandData(handedness: 'left' | 'right'): Promise<VRSpatialData | null> {
    return this.trackingData.get(`${handedness}-hand`) || null;
  }

  async getControllerData(handedness: 'left' | 'right'): Promise<VRSpatialData | null> {
    return this.trackingData.get(`${handedness}-controller`) || null;
  }

  getSpatialAnchors(): SpatialAnchor[] {
    return Array.from(this.spatialAnchors.values());
  }

  getSpatialAnchor(anchorId: string): SpatialAnchor | undefined {
    return this.spatialAnchors.get(anchorId);
  }

  // Getters
  public isTrackingActive(): boolean {
    return this.isTracking;
  }

  public getTrackingData(): Map<string, VRSpatialData> {
    return new Map(this.trackingData);
  }

  public getConfig(): SpatialTrackingConfig {
    return { ...this.config };
  }

  public getAvailableSources(): string[] {
    return Array.from(this.trackingData.keys());
  }
}