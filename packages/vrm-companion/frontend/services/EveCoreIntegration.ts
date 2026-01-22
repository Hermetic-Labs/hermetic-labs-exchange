/**
 * EVE Core Integration Service
 * 
 * Handles the integration between VRM Companion and EVE Core,
 * enabling the "swap sphere to companion" functionality.
 */

import { EventEmitter } from 'events';
import type { 
  RepresentationType, 
  EveCoreIntegrationConfig, 
  CompanionButtonState,
  IntegrationEvent 
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: EveCoreIntegrationConfig = {
  autoReplaceSphere: false,
  enableCompanionButton: true,
  buttonPosition: 'top-right',
};

// ============================================================================
// EVE Core Integration Service
// ============================================================================

export class EveCoreIntegrationService extends EventEmitter {
  private static instance: EveCoreIntegrationService | null = null;
  
  private isRegistered: boolean = false;
  private currentRepresentation: RepresentationType = 'sphere';
  private config: EveCoreIntegrationConfig = DEFAULT_CONFIG;
  private currentAvatarUrl: string | null = null;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EveCoreIntegrationService {
    if (!EveCoreIntegrationService.instance) {
      EveCoreIntegrationService.instance = new EveCoreIntegrationService();
    }
    return EveCoreIntegrationService.instance;
  }

  // ==========================================================================
  // Registration
  // ==========================================================================

  /**
   * Check if EVE Core is available
   */
  async checkEveCoreAvailability(): Promise<boolean> {
    try {
      const response = await fetch('/api/views/eve-core/status');
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Register companion with EVE Core
   */
  async register(config: Partial<EveCoreIntegrationConfig> = {}): Promise<boolean> {
    const isAvailable = await this.checkEveCoreAvailability();
    
    if (!isAvailable) {
      console.warn('[EveCoreIntegration] EVE Core not available');
      return false;
    }

    this.config = { ...DEFAULT_CONFIG, ...config };

    try {
      const response = await fetch('/api/views/eve-core/register-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentId: 'vrm-companion',
          config: this.config,
        }),
      });

      if (response.ok) {
        this.isRegistered = true;
        this.emitEvent('registered', 'eve-core');
        
        // Auto-swap if configured
        if (this.config.autoReplaceSphere && this.config.defaultAvatarUrl) {
          await this.swapToCompanion(this.config.defaultAvatarUrl);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[EveCoreIntegration] Registration failed:', error);
      this.emitEvent('error', 'eve-core', undefined, String(error));
      return false;
    }
  }

  /**
   * Unregister from EVE Core
   */
  async unregister(): Promise<boolean> {
    if (!this.isRegistered) return true;

    try {
      // Restore sphere first
      if (this.currentRepresentation === 'vrm-companion') {
        await this.restoreToSphere();
      }

      const response = await fetch('/api/views/eve-core/unregister-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentId: 'vrm-companion' }),
      });

      if (response.ok) {
        this.isRegistered = false;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[EveCoreIntegration] Unregistration failed:', error);
      return false;
    }
  }

  // ==========================================================================
  // Representation Swapping
  // ==========================================================================

  /**
   * Swap EVE Core's sphere to VRM companion
   */
  async swapToCompanion(avatarUrl?: string): Promise<boolean> {
    if (this.currentRepresentation === 'vrm-companion') {
      console.log('[EveCoreIntegration] Already showing companion');
      return true;
    }

    try {
      const response = await fetch('/api/views/eve-core/swap-representation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          representation: 'vrm-companion',
          avatarUrl: avatarUrl || this.currentAvatarUrl || this.config.defaultAvatarUrl,
        }),
      });

      if (response.ok) {
        this.currentRepresentation = 'vrm-companion';
        this.currentAvatarUrl = avatarUrl || this.currentAvatarUrl;
        this.emitEvent('swapped', 'eve-core', 'vrm-companion');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[EveCoreIntegration] Swap to companion failed:', error);
      this.emitEvent('error', 'eve-core', undefined, String(error));
      return false;
    }
  }

  /**
   * Restore EVE Core back to sphere
   */
  async restoreToSphere(): Promise<boolean> {
    if (this.currentRepresentation === 'sphere') {
      console.log('[EveCoreIntegration] Already showing sphere');
      return true;
    }

    try {
      const response = await fetch('/api/views/eve-core/swap-representation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ representation: 'sphere' }),
      });

      if (response.ok) {
        this.currentRepresentation = 'sphere';
        this.emitEvent('restored', 'eve-core', 'sphere');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[EveCoreIntegration] Restore to sphere failed:', error);
      this.emitEvent('error', 'eve-core', undefined, String(error));
      return false;
    }
  }

  /**
   * Toggle between sphere and companion
   */
  async toggle(avatarUrl?: string): Promise<RepresentationType> {
    if (this.currentRepresentation === 'sphere') {
      await this.swapToCompanion(avatarUrl);
    } else {
      await this.restoreToSphere();
    }
    return this.currentRepresentation;
  }

  // ==========================================================================
  // State
  // ==========================================================================

  /**
   * Get current representation
   */
  getRepresentation(): RepresentationType {
    return this.currentRepresentation;
  }

  /**
   * Get button state for UI
   */
  getButtonState(): CompanionButtonState {
    return {
      viewId: 'eve-core',
      isVisible: this.isRegistered && this.config.enableCompanionButton,
      isEnabled: this.isRegistered,
      currentRepresentation: this.currentRepresentation,
    };
  }

  /**
   * Check if registered
   */
  isRegisteredWithEveCore(): boolean {
    return this.isRegistered;
  }

  /**
   * Set current avatar URL
   */
  setAvatarUrl(url: string): void {
    this.currentAvatarUrl = url;
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  private emitEvent(
    type: IntegrationEvent['type'],
    viewId: string,
    representation?: RepresentationType,
    error?: string
  ): void {
    const event: IntegrationEvent = {
      type,
      viewId,
      representation,
      error,
      timestamp: Date.now(),
    };
    this.emit('integration', event);
    this.emit(type, event);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const eveCoreIntegration = EveCoreIntegrationService.getInstance();

export function getEveCoreIntegration(): EveCoreIntegrationService {
  return EveCoreIntegrationService.getInstance();
}
