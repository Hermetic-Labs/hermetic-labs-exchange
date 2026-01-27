/**
 * Type definitions for Package Name
 *
 * Export all public types from this file.
 * These types are used by:
 * - Your package components internally
 * - Other packages that integrate with yours
 * - The EVE OS plugin loader
 */

// ============================================================================
// View Mode Types
// ============================================================================

/**
 * View mode for the package component
 * - tab: Full page view in DevPortal/main area
 * - panel: Side panel/sidebar view
 */
export type ViewMode = 'tab' | 'panel';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for the package
 */
export interface PackageConfig {
    /** API endpoint URL */
    apiUrl?: string;

    /** Refresh interval in seconds */
    refreshInterval?: number;

    /** Example configuration option */
    option1?: string;

    /** Another configuration option */
    option2?: number;

    /** Callback for when something completes */
    onComplete?: (result: PackageResult) => void;
}

// ============================================================================
// State Types
// ============================================================================

/**
 * Internal state of the package
 */
export interface PackageState {
    /** Whether the package is initialized */
    initialized: boolean;

    /** Whether an operation is in progress */
    loading: boolean;

    /** Any error that occurred */
    error: string | null;

    /** The current data */
    data: unknown | null;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result returned from package operations
 */
export interface PackageResult {
    /** Whether the operation succeeded */
    success: boolean;

    /** Result data on success */
    data?: unknown;

    /** Error message on failure */
    error?: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted by the package
 */
export type PackageEvent =
    | { type: 'initialized' }
    | { type: 'data-changed'; data: unknown }
    | { type: 'error'; error: string };

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for MainComponent
 */
export interface MainComponentProps {
    /** Optional configuration */
    config?: Partial<PackageConfig>;

    /** Optional CSS class name */
    className?: string;

    /** Children to render (if applicable) */
    children?: React.ReactNode;
}
