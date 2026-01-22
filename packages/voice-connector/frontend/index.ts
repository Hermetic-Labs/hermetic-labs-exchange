/**
 * voice-connector - EVE OS Marketplace Package
 */

// Main tabbed container (default export for sidebar tab)
export { default, default as VoiceConnectorPortal } from './VoiceConnectorPortal';

// Service classes (for programmatic access, NOT React components)
export { VoiceCommandProcessor } from './VoiceCommandProcessor';
export { VoiceRecognitionService } from './VoiceRecognitionService';
export { VoiceInterfaceManager } from './VoiceInterfaceManager';
export { VoiceToReflexCardService } from './VoiceToReflexCardService';

// Type exports
export * from './types';
