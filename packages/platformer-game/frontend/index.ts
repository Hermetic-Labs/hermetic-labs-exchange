/**
 * Platformer Game - Marketplace Package
 *
 * Classic side-scrolling platformer game in the style of Mario.
 * Features pixel art graphics, coin collection, enemies, and mobile touch controls.
 *
 * This is a COMPONENT type package for entertainment.
 */

// ============================================================================
// Component Metadata
// ============================================================================

export const COMPONENT_ID = 'platformer-game';
export const COMPONENT_TYPE = 'component';
export const COMPONENT_VERSION = '1.0.0';

// ============================================================================
// Core Exports
// ============================================================================

export { default, default as PlatformerGame } from './PlatformerGame';
export { default as ErrorBoundary } from './components/ErrorBoundary';

// ============================================================================
// Game Constants
// ============================================================================

export const GAME_CONSTANTS = {
  GRAVITY: 0.6,
  JUMP_FORCE: -12,
  MOVE_SPEED: 5,
  ENEMY_SPEED: 1.5,
  TILE_SIZE: 32,
  PLAYER_WIDTH: 28,
  PLAYER_HEIGHT: 32,
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 480,
  LEVEL_WIDTH: 3200,
} as const;

// ============================================================================
// Types
// ============================================================================

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'brick' | 'question';
}

export interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  alive: boolean;
  startX: number;
  range: number;
}

export type GameState = 'playing' | 'won' | 'lost';

// ============================================================================
// Capability Detection API
// ============================================================================

/**
 * Check if Platformer Game is available
 */
export function isPlatformerAvailable(): boolean {
  return true;
}

/**
 * Check if Canvas is supported
 */
export function isCanvasSupported(): boolean {
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext && canvas.getContext('2d'));
}

/**
 * Check if touch is supported (for mobile controls)
 */
export function isTouchSupported(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get game capabilities
 */
export interface PlatformerCapabilities {
  canvas: boolean;
  touch: boolean;
  keyboard: boolean;
}

export function getPlatformerCapabilities(): PlatformerCapabilities {
  return {
    canvas: isCanvasSupported(),
    touch: isTouchSupported(),
    keyboard: true,
  };
}

// ============================================================================
// Integration API
// ============================================================================

export interface PlatformerConfig {
  startScore?: number;
  onGameEnd?: (won: boolean, score: number) => void;
}

export const DEFAULT_CONFIG: PlatformerConfig = {
  startScore: 0,
};
