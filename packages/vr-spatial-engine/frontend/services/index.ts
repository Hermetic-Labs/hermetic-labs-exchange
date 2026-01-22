// VR Services Index
export { VRSceneService } from './VRSceneService';
export { VRSpatialTrackingService } from './VRSpatialTrackingService';
export { VRInteractionService } from './VRInteractionService';

// Service types
export type {
  SceneCreationOptions,
  ScenePerformance,
  SpatialTrackingConfig,
  SpatialAnchorOptions,
  InteractionConfig,
  GestureRecognitionOptions,
  HapticFeedbackOptions
} from './VRSceneService';

// Service factory functions
export const createVRSceneService = () => new VRSceneService();
export const createVRSpatialTrackingService = (config?: any) => new VRSpatialTrackingService(config);
export const createVRInteractionService = (config?: any) => new VRInteractionService(config);

// Service utilities
export const initializeAllServices = async (config?: any) => {
  const sceneService = createVRSceneService();
  const spatialService = createVRSpatialTrackingService(config?.spatial);
  const interactionService = createVRInteractionService(config?.interaction);

  await sceneService.initialize();
  await spatialService.initialize(config?.spatial);
  await interactionService.initialize(config?.interaction);

  return {
    sceneService,
    spatialService,
    interactionService
  };
};