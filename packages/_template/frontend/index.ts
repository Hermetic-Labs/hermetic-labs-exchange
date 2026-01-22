/**
 * Package Name - EVE-OS Marketplace Package
 *
 * This is the main entry point (barrel export) for your package.
 *
 * ============================================================================
 * CRITICAL: THE DEFAULT EXPORT RULE
 * ============================================================================
 *
 * For sidebar modules (sidebar: true in manifest.json):
 *
 *   1. The DEFAULT EXPORT must be a React component
 *   2. This is what PluginLoaderService uses for sidebar rendering
 *   3. The manifest.json components[0] is just a label for this default export
 *
 * Pattern: export { default, default as PortalName } from './components/Portal';
 *
 * @packageDocumentation
 */

// ============================================================================
// MAIN COMPONENT - DEFAULT EXPORT (REQUIRED for sidebar: true)
// ============================================================================

/**
 * The default export is what renders in the sidebar.
 *
 * This MUST be a React component, NOT a service class.
 * Service classes will crash with: "Class constructor cannot be invoked without 'new'"
 */
export { default, default as PackageNamePortal } from './components/MainComponent';

// ============================================================================
// ADDITIONAL COMPONENTS (Optional)
// ============================================================================

// ErrorBoundary - Recommended for all packages
export { default as ErrorBoundary } from './components/ErrorBoundary';

// ============================================================================
// SERVICE EXPORTS (Optional - for programmatic access)
// ============================================================================

// Services are for code use, NOT for React rendering
// export { PackageService, packageService } from './services/PackageService';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
    ViewMode,
    PackageConfig,
    PackageState,
    MainComponentProps,
} from './types';

// ============================================================================
// PACKAGE METADATA
// ============================================================================

export const PACKAGE_ID = 'package-name';
export const PACKAGE_VERSION = '1.0.0';
