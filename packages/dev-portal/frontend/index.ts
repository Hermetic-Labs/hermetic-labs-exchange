/**
 * Developer Portal - EVE-OS Marketplace Package
 *
 * Complete IDE and development toolkit for EVE-OS.
 * Includes Code Graph visualization, Node Editor, API Harness,
 * LLM Console, and the Remix IDE for creating new packages.
 *
 * @packageDocumentation
 */

// ============================================================================
// Package Metadata
// ============================================================================

/** Unique identifier matching manifest.json name */
export const PACKAGE_ID = 'dev-portal';

/** Package type matching manifest.json type */
export const PACKAGE_TYPE = 'component';

/** Package version matching manifest.json version */
export const PACKAGE_VERSION = '1.0.0';

// ============================================================================
// Component Exports (Must match manifest.json components array)
// ============================================================================

// Main component - rendered when users navigate to Developer Portal tab
export { default, default as DevPortalPage } from './components/DevPortalPage';

// Graph Editor - Visual node-based workflow builder
export { EVEGraphEditor } from './components/EVEGraphEditor';

// API Harness - Endpoint testing tool
export { default as ResponsesTestHarness } from './components/ResponsesTestHarness';

// Threads Panel - Conversation thread management
export { default as ThreadsPanel } from './components/ThreadsPanel';

// Unified Cortex - AI model interaction
export { default as EVEUnifiedCortex } from './components/EVEUnifiedCortex';

// Error Boundary
export { ErrorBoundary } from './components/ErrorBoundary';
export { default as ErrorBoundaryDefault } from './components/ErrorBoundary';

// ============================================================================
// Supporting Components
// ============================================================================

export { default as CustomNode } from './components/CustomNode';
export { default as FlowControls } from './components/FlowControls';
export { default as FlowSidebar } from './components/FlowSidebar';
export { default as NodePalette } from './components/NodePalette';
export { default as LogBar } from './components/LogBar';
export { default as ReflexPanel } from './components/ReflexPanel';
export { default as Sidebar } from './components/Sidebar';
export { default as TabBar } from './components/TabBar';
export { default as TopBar } from './components/TopBar';
export { default as WorkbenchPanel } from './components/WorkbenchPanel';

// ============================================================================
// Context Exports
// ============================================================================

export { GraphProvider, useGraph } from './context/GraphContext';
export { UIProvider, useUI } from './context/UIContext';
export { AppDataProvider, useAppData } from './context/AppDataContext';

// ============================================================================
// Remix IDE Components
// ============================================================================

export { PackageBrowser } from './remix/PackageBrowser';
export { ElementTree } from './remix/ElementTree';
export { RemixBasket } from './remix/RemixBasket';

// ============================================================================
// Type Exports
// ============================================================================

export type {
    PackageConfig,
    PackageState,
    DevPortalPageProps,
    EVEGraphEditorProps,
    AppMode,
    RemixElement,
    ToolbarTool,
    UserEndpoint,
} from './types';

// Re-export types from GraphContext
export type { RemixElement as GraphRemixElement } from './context/GraphContext';

// ============================================================================
// Service Exports
// ============================================================================

export { personaService } from './services/personaService';

// ============================================================================
// Constants and Configuration
// ============================================================================

/** Default configuration for Developer Portal */
export const DEFAULT_CONFIG = {
    showToolbar: true,
    defaultTab: 'code-graph' as const,
    enableRemix: true,
};

/** Toolbar tool definitions */
export const TOOLBAR_TOOLS = [
    { id: 'llm-console', icon: '🤖', name: 'LLM Console', desc: 'Direct AI model access' },
    { id: 'responses-harness', icon: '🔌', name: 'API Harness', desc: 'Test endpoints' },
    { id: 'personas', icon: '👤', name: 'Personas', desc: 'AI personalities' },
    { id: 'vector', icon: '🔬', name: 'Vector DB', desc: 'Embeddings inspector' },
    { id: 'cards', icon: '🃏', name: 'Cards', desc: 'Reflex card library' },
    { id: 'graph-editor', icon: '◈', name: 'Node Editor', desc: 'Visual flow builder' },
];

/**
 * Check if Developer Portal capabilities are available
 */
export function isPackageAvailable(): boolean {
    return true;
}

/**
 * Get available capabilities provided by this package
 */
export function getCapabilities(): string[] {
    return ['remix-ide', 'node-editor', 'code-graph', 'api-harness'];
}
