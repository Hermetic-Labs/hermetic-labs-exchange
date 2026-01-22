/**
 * Dev Portal Page
 * Central hub for developers - Code Graph IDE, user scripts, endpoints
 *
 * Restructured to:
 * - Toolbar with tool icons at top (LLM Console, API Harness, Personas, etc.)
 * - Tabs: Code Graph (IDE), Scripts, Endpoints
 * - Removed meaningless Overview stats
 * - Cleaned up component organization
 *
 * @packageDocumentation
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { useNavigation } from '@/contexts/NavigationContext';
import '../styles/DevPortal.css';

interface UserEndpoint {
    id: string;
    title: string;
    description: string;
    method: string;
    path: string;
    category: string;
    status: string;
    created_at: string;
}

// Tool definitions for toolbar
const TOOLBAR_TOOLS = [
    { id: 'llm-console', icon: '🤖', name: 'LLM Console', desc: 'Direct AI model access' },
    { id: 'responses-harness', icon: '🔌', name: 'API Harness', desc: 'Test endpoints' },
    { id: 'personas', icon: '👤', name: 'Personas', desc: 'AI personalities' },
    { id: 'vector', icon: '🔬', name: 'Vector DB', desc: 'Embeddings inspector' },
    { id: 'cards', icon: '🃏', name: 'Cards', desc: 'Reflex card library' },
    { id: 'graph-editor', icon: '◈', name: 'Node Editor', desc: 'Visual flow builder' },
];

export interface DevPortalPageProps {
    /** Optional callback when navigation is requested */
    onNavigate?: (target: string) => void;
}

export function DevPortalPage({ onNavigate }: DevPortalPageProps) {
    const [userEndpoints, setUserEndpoints] = useState<UserEndpoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'code-graph' | 'scripts' | 'endpoints'>('code-graph');
    const { navigateTo } = useNavigation();

    // Use provided callback or default navigation
    const handleNavigate = (target: string) => {
        if (onNavigate) {
            onNavigate(target);
        } else {
            navigateTo(target);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load user endpoints
            const apiEndpoints = await api.listUserEndpoints();
            const mappedEndpoints: UserEndpoint[] = apiEndpoints.map(ep => ({
                id: ep.id,
                title: ep.name,
                description: ep.description || '',
                method: ep.method,
                path: ep.path,
                category: 'user',
                status: 'active',
                created_at: new Date().toISOString()
            }));
            setUserEndpoints(mappedEndpoints);
        } catch {
            // Use demo data
            setUserEndpoints([
                {
                    id: 'ep-1',
                    title: 'Get Patient Vitals',
                    description: 'Fetch patient vital signs via FHIR API',
                    method: 'GET',
                    path: '/api/user/patient-vitals',
                    category: 'medical',
                    status: 'active',
                    created_at: new Date().toISOString(),
                },
                {
                    id: 'ep-2',
                    title: 'Process Lab Results',
                    description: 'Parse and analyze lab result data',
                    method: 'POST',
                    path: '/api/user/lab-results',
                    category: 'medical',
                    status: 'testing',
                    created_at: new Date().toISOString(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const getMethodClassModifier = (method: string) => {
        switch (method.toUpperCase()) {
            case 'GET': return 'dev-portal__endpoint-method--get';
            case 'POST': return 'dev-portal__endpoint-method--post';
            case 'PUT': return 'dev-portal__endpoint-method--put';
            case 'DELETE': return 'dev-portal__endpoint-method--delete';
            default: return 'dev-portal__endpoint-method--default';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return { label: 'Active', color: 'success' };
            case 'testing': return { label: 'Testing', color: 'warning' };
            case 'inactive': return { label: 'Inactive', color: 'muted' };
            default: return { label: status, color: 'muted' };
        }
    };

    return (
        <div className="dev-portal">
            {/* Header with Toolbar */}
            <header className="dev-portal__header">
                <div className="dev-portal__header-content">
                    <div className="dev-portal__branding">
                        <span className="dev-portal__logo">⚡</span>
                        <div>
                            <h1 className="dev-portal__title">Developer Portal</h1>
                            <p className="dev-portal__subtitle">IDE & Development Tools</p>
                        </div>
                    </div>

                    {/* Toolbar with tool icons */}
                    <div className="dev-portal__toolbar">
                        {TOOLBAR_TOOLS.map(tool => (
                            <button
                                key={tool.id}
                                className="dev-portal__tool-btn"
                                onClick={() => handleNavigate(tool.id)}
                                title={`${tool.name}: ${tool.desc}`}
                            >
                                <span className="dev-portal__tool-icon">{tool.icon}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabs - Code Graph (IDE), Scripts, Endpoints */}
                <nav className="dev-portal__tabs">
                    {[
                        { id: 'code-graph', label: 'Code Graph', icon: '🌐' },
                        { id: 'scripts', label: 'My Scripts', icon: '📝' },
                        { id: 'endpoints', label: 'Endpoints', icon: '🔌' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`dev-portal__tab ${activeTab === tab.id ? 'dev-portal__tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        >
                            <span className="dev-portal__tab-icon">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </header>

            {/* Content */}
            <main className="dev-portal__content">
                {/* Code Graph Tab - IDE for code visualization and editing */}
                {activeTab === 'code-graph' && (
                    <div className="dev-portal__code-graph">
                        {/* Summary Card */}
                        <Card className="dev-portal__summary-card">
                            <CardHeader>
                                <CardTitle className="dev-portal__summary-title">
                                    <span className="dev-portal__summary-icon">🌐</span>
                                    Code Graph IDE
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="dev-portal__summary-text">
                                    Visual code editor with AST visualization. Browse project files,
                                    view code as 2D/3D node graphs, and navigate your codebase visually.
                                </p>
                                <div className="dev-portal__summary-features">
                                    <span className="dev-portal__feature-tag">AST Visualization</span>
                                    <span className="dev-portal__feature-tag">2D/3D Canvas</span>
                                    <span className="dev-portal__feature-tag">File Browser</span>
                                    <span className="dev-portal__feature-tag">Diagnostics</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Demo Section - Placeholder for Code Graph component */}
                        <Card className="dev-portal__demo-card">
                            <CardContent>
                                <div className="dev-portal__demo-placeholder">
                                    <div className="dev-portal__demo-icon">🌐</div>
                                    <h3 className="dev-portal__demo-title">Code Graph Workspace</h3>
                                    <p className="dev-portal__demo-text">
                                        Interactive code graph visualization will be rendered here.
                                        Connect to a project folder to begin exploring.
                                    </p>
                                    <div className="dev-portal__demo-actions">
                                        <Button variant="default" onClick={() => handleNavigate('code-writer')}>
                                            Open Code Writer
                                        </Button>
                                        <Button variant="ghost" onClick={() => handleNavigate('graph-editor')}>
                                            Open Node Editor
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Endpoints Tab */}
                {activeTab === 'endpoints' && (
                    <div className="dev-portal__endpoints">
                        <div className="dev-portal__endpoints-header">
                            <h2 className="dev-portal__section-title">Your Generated Endpoints</h2>
                            <Link to="/code-writer">
                                <Button variant="default">+ Create New</Button>
                            </Link>
                        </div>

                        {isLoading ? (
                            <div className="dev-portal__loading">Loading endpoints...</div>
                        ) : userEndpoints.length === 0 ? (
                            <Card className="dev-portal__empty">
                                <CardContent>
                                    <div className="dev-portal__empty-content">
                                        <span className="dev-portal__empty-icon">🔌</span>
                                        <h3>No endpoints yet</h3>
                                        <p>Create your first endpoint using the Code Writer</p>
                                        <Link to="/code-writer">
                                            <Button variant="default">Get Started</Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="dev-portal__endpoints-list">
                                {userEndpoints.map(endpoint => {
                                    const status = getStatusBadge(endpoint.status);
                                    return (
                                        <Card key={endpoint.id} className="dev-portal__endpoint-card">
                                            <CardContent>
                                                <div className="dev-portal__endpoint-header">
                                                    <span
                                                        className={`dev-portal__endpoint-method ${getMethodClassModifier(endpoint.method)}`}
                                                    >
                                                        {endpoint.method}
                                                    </span>
                                                    <code className="dev-portal__endpoint-path">{endpoint.path}</code>
                                                    <span className={`dev-portal__endpoint-status dev-portal__endpoint-status--${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <h3 className="dev-portal__endpoint-title">{endpoint.title}</h3>
                                                <p className="dev-portal__endpoint-desc">{endpoint.description}</p>
                                                <div className="dev-portal__endpoint-meta">
                                                    <span className="dev-portal__endpoint-category">{endpoint.category}</span>
                                                    <span className="dev-portal__endpoint-date">
                                                        Created {new Date(endpoint.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Scripts Tab */}
                {activeTab === 'scripts' && (
                    <div className="dev-portal__scripts">
                        <div className="dev-portal__scripts-header">
                            <h2 className="dev-portal__section-title">My Scripts & Documentation</h2>
                            <Link to="/code-writer">
                                <Button variant="default">+ New Script</Button>
                            </Link>
                        </div>

                        <div className="dev-portal__scripts-grid">
                            <Card className="dev-portal__scripts-section">
                                <CardHeader>
                                    <CardTitle>📝 Code Interpreter Scripts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="dev-portal__scripts-desc">
                                        Scripts created with the Code Writer are compiled and documented automatically.
                                    </p>
                                    <div className="dev-portal__scripts-list">
                                        <div className="dev-portal__script-item">
                                            <span className="dev-portal__script-icon">📘</span>
                                            <div className="dev-portal__script-info">
                                                <span className="dev-portal__script-name">Get Patient Vitals</span>
                                                <span className="dev-portal__script-meta">TypeScript • @fhir-compliant</span>
                                            </div>
                                            <Button variant="ghost" size="sm">View</Button>
                                        </div>
                                        <div className="dev-portal__script-item">
                                            <span className="dev-portal__script-icon">🐍</span>
                                            <div className="dev-portal__script-info">
                                                <span className="dev-portal__script-name">Lab Results Parser</span>
                                                <span className="dev-portal__script-meta">Python • @hipaa-safe</span>
                                            </div>
                                            <Button variant="ghost" size="sm">View</Button>
                                        </div>
                                    </div>
                                    <Link to="/code-writer" className="dev-portal__scripts-link">
                                        View all scripts →
                                    </Link>
                                </CardContent>
                            </Card>

                            <Card className="dev-portal__scripts-section">
                                <CardHeader>
                                    <CardTitle>📚 Generated Documentation</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="dev-portal__scripts-desc">
                                        Auto-generated documentation from your code, growing as you write.
                                    </p>
                                    <div className="dev-portal__docs-stats">
                                        <div className="dev-portal__docs-stat">
                                            <span className="dev-portal__docs-stat-value">12</span>
                                            <span className="dev-portal__docs-stat-label">Functions</span>
                                        </div>
                                        <div className="dev-portal__docs-stat">
                                            <span className="dev-portal__docs-stat-value">5</span>
                                            <span className="dev-portal__docs-stat-label">Interfaces</span>
                                        </div>
                                        <div className="dev-portal__docs-stat">
                                            <span className="dev-portal__docs-stat-value">3</span>
                                            <span className="dev-portal__docs-stat-label">Modules</span>
                                        </div>
                                    </div>
                                    <Link to="/docs" className="dev-portal__scripts-link">
                                        View documentation →
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

export default DevPortalPage;
