import { EventEmitter } from 'events';
import { VRGesture, VRInteraction, VRSpatialData, XRInputSource, VRScene } from '../types/vr';

export interface InteractionConfig {
  hapticFeedback: boolean;
  gestureRecognition: boolean;
  spatialInteraction: boolean;
  voiceCommands: boolean;
  gazeInteraction: boolean;
}

export interface GestureRecognitionOptions {
  sensitivity: number;
  minConfidence: number;
  maxGesturesPerFrame: number;
  gestureTimeout: number;
}

export interface HapticFeedbackOptions {
  intensity: number;
  duration: number;
  pattern: 'single' | 'double' | 'triple' | 'continuous';
}

export class VRInteractionService extends EventEmitter {
  private isInitialized: boolean = false;
  private interactionCount: number = 0;
  private config: InteractionConfig;
  private activeGestures: Map<string, VRGesture> = new Map();
  private interactionHandlers: Map<string, Function> = new Map();
  private sceneInteractions: Map<string, VRInteraction[]> = new Map();
  private gestureHistory: VRGesture[] = [];

  constructor(config?: Partial<InteractionConfig>) {
    super();
    this.config = {
      hapticFeedback: true,
      gestureRecognition: true,
      spatialInteraction: true,
      voiceCommands: false,
      gazeInteraction: false,
      ...config
    };
  }

  async initialize(config?: Partial<InteractionConfig>): Promise<void> {
    console.log('[VR-INTERACTION] Initializing VR Interaction Service...');

    try {
      // Update configuration
      this.config = { ...this.config, ...config };

      // Initialize gesture recognition
      if (this.config.gestureRecognition) {
        await this.initializeGestureRecognition();
      }

      // Initialize haptic feedback
      if (this.config.hapticFeedback) {
        await this.initializeHapticFeedback();
      }

      // Initialize spatial interaction
      if (this.config.spatialInteraction) {
        await this.initializeSpatialInteraction();
      }

      this.isInitialized = true;
      console.log('[SUCCESS] VR Interaction Service initialized');

      // Emit initialization event
      this.emit('interactionInitialized', {
        config: this.config,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[ERROR] Failed to initialize VR interaction service:', error);
      throw error;
    }
  }

  async setupSceneInteractions(scene: VRScene): Promise<void> {
    console.log('[VR-INTERACTION] Setting up interactions for scene:', scene.name);

    try {
      // Extract interactions from scene objects
      const sceneInteractions = this.extractSceneInteractions(scene);
      this.sceneInteractions.set(scene.id, sceneInteractions);

      // Register interaction handlers
      for (const interaction of sceneInteractions) {
        this.registerInteractionHandler(interaction);
      }

      console.log(`[SUCCESS] Setup ${sceneInteractions.length} interactions for scene`);

    } catch (error) {
      console.error('[ERROR] Failed to setup scene interactions:', error);
      throw error;
    }
  }

  async processGesture(gesture: VRGesture, source: XRInputSource): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('VR Interaction Service not initialized');
    }

    try {
      // Validate gesture
      if (gesture.confidence < 0.7) {
        console.log('[VR-INTERACTION] Gesture confidence too low, ignoring');
        return;
      }

      // Add to gesture history
      this.gestureHistory.push(gesture);
      this.maintainGestureHistory();

      // Recognize gesture type
      const recognizedGesture = await this.recognizeGesture(gesture);

      // Process gesture
      await this.executeGestureInteraction(recognizedGesture, source);

      // Provide haptic feedback
      if (this.config.hapticFeedback) {
        await this.provideHapticFeedback(source, {
          intensity: 0.5,
          duration: 50,
          pattern: 'single'
        });
      }

      // Emit gesture processed event
      this.emit('gestureProcessed', {
        gesture: recognizedGesture,
        source: source.handedness,
        timestamp: new Date().toISOString()
      });

      this.interactionCount++;

    } catch (error) {
      console.error('[ERROR] Failed to process gesture:', error);
      throw error;
    }
  }

  async updateFrame(frame: XRFrame): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Update active gestures
      await this.updateActiveGestures(frame);

      // Process input sources
      await this.processInputSources(frame);

      // Update spatial interactions
      if (this.config.spatialInteraction) {
        await this.updateSpatialInteractions(frame);
      }

    } catch (error) {
      console.error('[ERROR] Failed to update interaction frame:', error);
    }
  }

  private async initializeGestureRecognition(): Promise<void> {
    console.log('[VR-INTERACTION] Initializing gesture recognition...');

    // This would initialize machine learning models for gesture recognition
    // For now, we'll set up basic gesture patterns
    
    console.log('[SUCCESS] Gesture recognition initialized');
  }

  private async initializeHapticFeedback(): Promise<void> {
    console.log('[VR-INTERACTION] Initializing haptic feedback...');

    // Check haptic capabilities
    if (!('getGamepads' in navigator)) {
      console.warn('[VR-INTERACTION] Haptic feedback not supported');
      return;
    }

    console.log('[SUCCESS] Haptic feedback initialized');
  }

  private async initializeSpatialInteraction(): Promise<void> {
    console.log('[VR-INTERACTION] Initializing spatial interaction...');

    // Setup raycasting for object interaction
    // Initialize collision detection
    
    console.log('[SUCCESS] Spatial interaction initialized');
  }

  private extractSceneInteractions(scene: VRScene): VRInteraction[] {
    const interactions: VRInteraction[] = [];

    for (const obj of scene.objects) {
      if (obj.interactive && obj.components) {
        for (const component of obj.components) {
          if (component.type === 'interaction') {
            const interaction: VRInteraction = {
              id: `${obj.id}-${component.config.type || 'click'}`,
              type: component.config.type || 'click',
              target: obj.id,
              handler: component.config.handler || 'default',
              conditions: component.config.conditions || {},
              priority: component.config.priority || 1,
              enabled: component.enabled !== false
            };
            interactions.push(interaction);
          }
        }
      }
    }

    return interactions;
  }

  private registerInteractionHandler(interaction: VRInteraction): void {
    const handlerKey = `${interaction.type}-${interaction.target}`;
    const handler = this.createInteractionHandler(interaction);
    this.interactionHandlers.set(handlerKey, handler);
  }

  private createInteractionHandler(interaction: VRInteraction): Function {
    return (data: any) => {
      console.log(`[VR-INTERACTION] Executing ${interaction.type} interaction on ${interaction.target}`);
      
      // Emit interaction event
      this.emit('interactionExecuted', {
        interaction,
        data,
        timestamp: new Date().toISOString()
      });

      // This would trigger the actual interaction logic
      // For now, we'll just log the interaction
    };
  }

  private async recognizeGesture(gesture: VRGesture): Promise<VRGesture> {
    // This would use ML models to recognize gestures
    // For now, we'll use the input gesture as-is
    
    // Additional gesture classification could happen here
    if (gesture.type === 'custom' && gesture.magnitude !== undefined) {
      if (gesture.magnitude > 0.8) {
        gesture.type = 'grab';
      } else if (gesture.magnitude > 0.5) {
        gesture.type = 'point';
      }
    }

    return gesture;
  }

  private async executeGestureInteraction(gesture: VRGesture, source: XRInputSource): Promise<void> {
    // Find matching interactions
    const interactions = this.findMatchingInteractions(gesture, source);
    
    for (const interaction of interactions) {
      if (interaction.enabled) {
        await this.executeInteraction(interaction, { gesture, source });
      }
    }
  }

  private findMatchingInteractions(gesture: VRGesture, source: XRInputSource): VRInteraction[] {
    const matches: VRInteraction[] = [];

    // Search through all scene interactions
    for (const sceneInteractions of this.sceneInteractions.values()) {
      for (const interaction of sceneInteractions) {
        if (this.isInteractionMatch(interaction, gesture, source)) {
          matches.push(interaction);
        }
      }
    }

    // Sort by priority
    return matches.sort((a, b) => b.priority - a.priority);
  }

  private isInteractionMatch(interaction: VRInteraction, gesture: VRGesture, source: XRInputSource): boolean {
    // Check gesture type match
    if (interaction.type !== gesture.type) {
      return false;
    }

    // Check handedness if specified
    if (interaction.conditions?.handedness && interaction.conditions.handedness !== source.handedness) {
      return false;
    }

    // Check confidence threshold
    if (interaction.conditions?.minConfidence && gesture.confidence < interaction.conditions.minConfidence) {
      return false;
    }

    return true;
  }

  private async executeInteraction(interaction: VRInteraction, data: any): Promise<void> {
    const handlerKey = `${interaction.type}-${interaction.target}`;
    const handler = this.interactionHandlers.get(handlerKey);
    
    if (handler) {
      await handler(data);
    } else {
      console.warn(`[VR-INTERACTION] No handler found for interaction: ${handlerKey}`);
    }
  }

  private async updateActiveGestures(frame: XRFrame): Promise<void> {
    const currentTime = Date.now();
    const timeout = 5000; // 5 seconds

    // Remove expired gestures
    for (const [id, gesture] of this.activeGestures.entries()) {
      const gestureAge = currentTime - new Date(gesture.timestamp).getTime();
      if (gestureAge > timeout) {
        this.activeGestures.delete(id);
      }
    }

    // This would update ongoing gestures based on frame data
  }

  private async processInputSources(frame: XRFrame): Promise<void> {
    const inputSources = frame.session.inputSources;

    for (const inputSource of inputSources) {
      // Process button presses
      if (inputSource.gamepad) {
        await this.processGamepadInput(inputSource.gamepad, inputSource);
      }

      // Process hand tracking
      if (inputSource.hand) {
        await this.processHandInput(inputSource.hand, inputSource);
      }
    }
  }

  private async processGamepadInput(gamepad: Gamepad, source: XRInputSource): Promise<void> {
    // Process button presses and stick movements
    for (let i = 0; i < gamepad.buttons.length; i++) {
      const button = gamepad.buttons[i];
      if (button.pressed) {
        const gesture: VRGesture = {
          type: 'tap',
          confidence: 1.0,
          position: [0, 0, 0],
          duration: 100,
          handedness: source.handedness || 'left',
          timestamp: new Date().toISOString(),
          metadata: { buttonIndex: i }
        };
        await this.processGesture(gesture, source);
      }
    }
  }

  private async processHandInput(hand: any, source: XRInputSource): Promise<void> {
    // Process hand gestures and finger positions
    // This would extract actual hand joint data and recognize gestures
    
    console.log(`[VR-INTERACTION] Processing hand input for ${source.handedness} hand`);
  }

  private async updateSpatialInteractions(frame: XRFrame): Promise<void> {
    // Update raycasting for object interaction
    // Process proximity-based interactions
    
    console.log('[VR-INTERACTION] Updating spatial interactions');
  }

  private async provideHapticFeedback(source: XRInputSource, options: HapticFeedbackOptions): Promise<void> {
    try {
      if (source.gamepad && source.gamepad.hapticActuators && source.gamepad.hapticActuators.length > 0) {
        await source.gamepad.hapticActuators[0].pulse(options.intensity, options.duration);
        console.log('[VR-INTERACTION] Haptic feedback provided');
      }
    } catch (error) {
      console.warn('[VR-INTERACTION] Failed to provide haptic feedback:', error);
    }
  }

  private maintainGestureHistory(): void {
    // Keep only last 100 gestures
    if (this.gestureHistory.length > 100) {
      this.gestureHistory = this.gestureHistory.slice(-100);
    }
  }

  // Public API methods
  public getInteractionCount(): number {
    return this.interactionCount;
  }

  public getActiveGestures(): VRGesture[] {
    return Array.from(this.activeGestures.values());
  }

  public getGestureHistory(): VRGesture[] {
    return [...this.gestureHistory];
  }

  public getSceneInteractions(sceneId: string): VRInteraction[] {
    return this.sceneInteractions.get(sceneId) || [];
  }

  public registerCustomGesture(gestureType: string, handler: Function): void {
    this.interactionHandlers.set(`custom-${gestureType}`, handler);
    console.log(`[VR-INTERACTION] Registered custom gesture handler: ${gestureType}`);
  }

  public enableInteraction(interactionId: string): void {
    // Find and enable the interaction
    for (const [sceneId, interactions] of this.sceneInteractions.entries()) {
      const interaction = interactions.find(i => i.id === interactionId);
      if (interaction) {
        interaction.enabled = true;
        console.log(`[VR-INTERACTION] Enabled interaction: ${interactionId}`);
        break;
      }
    }
  }

  public disableInteraction(interactionId: string): void {
    // Find and disable the interaction
    for (const [sceneId, interactions] of this.sceneInteractions.entries()) {
      const interaction = interactions.find(i => i.id === interactionId);
      if (interaction) {
        interaction.enabled = false;
        console.log(`[VR-INTERACTION] Disabled interaction: ${interactionId}`);
        break;
      }
    }
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  public getConfig(): InteractionConfig {
    return { ...this.config };
  }
}