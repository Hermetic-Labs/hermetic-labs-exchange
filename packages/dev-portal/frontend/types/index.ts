/**
 * Type definitions for Developer Portal package
 */

export interface PackageConfig {
    /** Enable toolbar icons */
    showToolbar: boolean;
    /** Default active tab */
    defaultTab: 'code-graph' | 'scripts' | 'endpoints';
    /** Enable remix mode */
    enableRemix: boolean;
}

export interface PackageState {
    /** Current active tab */
    activeTab: string;
    /** Remix basket contents */
    remixBasket: Map<string, RemixElement>;
    /** Application mode */
    appMode: AppMode;
}

export interface DevPortalPageProps {
    /** Optional callback when navigation is requested */
    onNavigate?: (target: string) => void;
}

export interface EVEGraphEditorProps {
    /** Initial workflow to load */
    initialWorkflow?: string;
    /** Callback when workflow changes */
    onWorkflowChange?: (workflow: any) => void;
}

export type AppMode = 'normal' | 'remix' | 'developer';

export interface RemixElement {
    id: string;
    name: string;
    type: 'component' | 'function' | 'hook' | 'type' | 'service' | 'constant';
    sourcePackage: string;
    sourcePath: string;
    dependencies: string[];
    code?: string;
    addedAt: Date;
}

export interface ToolbarTool {
    id: string;
    icon: string;
    name: string;
    desc: string;
}

export interface UserEndpoint {
    id: string;
    title: string;
    description: string;
    method: string;
    path: string;
    category: string;
    status: string;
    created_at: string;
}
