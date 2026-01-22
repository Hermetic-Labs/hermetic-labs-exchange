import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { apiClient } from '@/services/ApiClient';
import { useAuth } from '@/contexts/AuthContext';
import type { FlowObject, RemixAttribution } from '@/types/flow';

// ---------- Types ----------

// App mode for Remix IDE
export type AppMode = 'normal' | 'remix' | 'developer';

// Element for the remix basket - represents a capturable code element
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

export interface GraphNode {
    id: string;
    name: string;
    type: string;
    description: string;
    status: 'ready' | 'processing' | 'error';
    temperature: string;
    maxTokens: string;
    model: string;
    inputs: any[];
    outputs: any[];
    settings: any[];
    layout?: { x: number; y: number };
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
}

export interface GraphProject {
    id: string;
    name: string;
    updated: string;
    nodes: number;
    isLocal?: boolean;
}

export interface SimulationState {
    status: 'idle' | 'running' | 'completed' | 'error' | 'paused';
    progress: number;
    nodeId: string | null;
    runId: string | null;
    result: any;
    error: any;
}

export interface GraphContextType {
    nodes: GraphNode[];
    edges: GraphEdge[];
    nodeLayouts: Record<string, { x: number; y: number }>;
    projects: GraphProject[];
    simulation: SimulationState;

    // App mode for Remix IDE
    appMode: AppMode;
    setAppMode: (mode: AppMode) => void;

    // Remix basket - collected elements from packages
    remixBasket: Map<string, RemixElement>;
    addToRemixBasket: (element: RemixElement) => void;
    removeFromRemixBasket: (elementId: string) => void;
    clearRemixBasket: () => void;

    // Remix attribution - set when a remixed flow is loaded
    currentFlowId: string | null;
    currentFlowName: string | null;
    remixedFrom: RemixAttribution | null;

    loadingNodes: boolean;
    nodesError: any;
    loadingProjects: boolean;
    projectsError: any;

    selectedNodeId: string | null;
    selectedNode: GraphNode | null;
    selectNode: (nodeId: string | null) => void;

    fetchNodes: () => Promise<void>;
    refreshNodes: () => Promise<void>;
    fetchProjects: () => Promise<void>;
    refreshProjects: () => Promise<void>;

    updateNode: (nodeId: string, updates: Partial<GraphNode>) => Promise<void>;
    addNode: (nodeInput: Partial<GraphNode>) => Promise<GraphNode>;

    addEdge: (edgeInput: Partial<GraphEdge>) => GraphEdge | null;
    updateEdge: (edgeId: string, updates: Partial<GraphEdge>) => GraphEdge | null;
    removeEdge: (edgeId: string) => void;

    updateNodeLayout: (nodeId: string, layoutPatch: Partial<{ x: number; y: number }>) => void;
    nudgeNodeLayout: (nodeId: string, dx: number, dy: number) => void;
    autoLayoutNodes: () => void;

    createProject: (name: string) => Promise<GraphProject | null>;
    importFlow: (flowDefinition: any) => void;
    importFlowObject: (flow: FlowObject) => void;
    clearCurrentFlow: () => void;
    runSimulation: (params: { nodeId: string }) => void;
    resetSimulation: () => void;
}

// ---------- Initial Data ----------

const fallbackNodes: GraphNode[] = [
    {
        id: 'input-processor',
        name: 'Input Processor',
        type: 'Processor',
        description: 'Preprocess incoming text before routing to downstream nodes.',
        status: 'ready',
        temperature: '0.7',
        maxTokens: '1000',
        model: 'gpt-3.5-turbo',
        inputs: [
            { type: 'string', label: 'input_text', required: true, description: 'Text to process' },
            { type: 'object', label: 'metadata', required: false, description: 'Additional context' },
            { type: 'number', label: 'temperature', required: false, description: 'Model creativity' }
        ],
        outputs: [
            { type: 'string', label: 'processed_text', required: true, description: 'Processed result' },
            { type: 'object', label: 'metadata', required: false, description: 'Processing info' }
        ],
        settings: [
            { key: 'model', label: 'Model', type: 'select', value: 'gpt-3.5-turbo', options: ['gpt-3.5-turbo', 'gpt-4', 'claude-3'] },
            { key: 'temperature', label: 'Temperature', type: 'range', value: '0.7', min: '0', max: '2' },
            { key: 'maxTokens', label: 'Max Tokens', type: 'number', value: '1000' }
        ]
    },
    {
        id: 'summarizer',
        name: 'Summarizer',
        type: 'Analyzer',
        description: 'Condense long-form content into concise summaries.',
        status: 'processing',
        temperature: '0.3',
        maxTokens: '800',
        model: 'gpt-4',
        inputs: [
            { type: 'string', label: 'article_body', required: true, description: 'Body content to summarize' },
            { type: 'string', label: 'summary_style', required: false, description: 'Optional summary tone/style' }
        ],
        outputs: [
            { type: 'string', label: 'summary', required: true, description: 'Generated summary' }
        ],
        settings: [
            { key: 'model', label: 'Model', type: 'select', value: 'gpt-4', options: ['gpt-3.5-turbo', 'gpt-4', 'claude-3'] },
            { key: 'temperature', label: 'Temperature', type: 'range', value: '0.3', min: '0', max: '2' },
            { key: 'maxTokens', label: 'Max Tokens', type: 'number', value: '800' }
        ]
    }
];

const fallbackProjects: GraphProject[] = [
    { id: 'proj-1', name: 'Text Processing', updated: '2024-01-15', nodes: 8 },
    { id: 'proj-2', name: 'Image Analysis', updated: '2024-01-14', nodes: 12 },
    { id: 'proj-3', name: 'API Integration', updated: '2024-01-13', nodes: 5 },
    { id: 'proj-4', name: 'Data Pipeline', updated: '2024-01-12', nodes: 15 }
];

const fallbackEdges: GraphEdge[] = [
    {
        id: 'edge-input-to-summarizer',
        source: 'input-processor',
        target: 'summarizer',
        label: 'Processed text'
    }
];

const initialSimulationState: SimulationState = {
    status: 'idle',
    progress: 0,
    nodeId: null,
    runId: null,
    result: null,
    error: null
};

const layoutStorageKey = 'eve.graph.layouts.v1';
const appModeStorageKey = 'eve.graph.appMode.v1';

const GraphContext = createContext<GraphContextType | null>(null);

export function GraphProvider({ children }: { children: React.ReactNode }) {
    const { user, currentCortex, updateSharedContext } = useAuth();

    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [loadingNodes, setLoadingNodes] = useState(true);
    const [nodesError, setNodesError] = useState<any>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [nodeLayouts, setNodeLayouts] = useState<Record<string, { x: number; y: number }>>({});

    const [projects, setProjects] = useState<GraphProject[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [projectsError, setProjectsError] = useState<any>(null);

    const [simulation, setSimulation] = useState<SimulationState>(initialSimulationState);

    // App mode for Remix IDE - persisted to localStorage
    const [appMode, setAppModeState] = useState<AppMode>(() => {
        if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem(appModeStorageKey);
            if (stored === 'remix' || stored === 'developer') {
                return stored;
            }
        }
        return 'normal';
    });

    // Remix basket - collected elements from packages
    const [remixBasket, setRemixBasket] = useState<Map<string, RemixElement>>(new Map());

    // Flow metadata - for tracking remixed flows loaded into the editor
    const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
    const [currentFlowName, setCurrentFlowName] = useState<string | null>(null);
    const [remixedFrom, setRemixedFrom] = useState<RemixAttribution | null>(null);

    const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
    const nodesRef = useRef<GraphNode[]>([]);
    const edgesRef = useRef<GraphEdge[]>([]);
    const nodeLayoutsRef = useRef<Record<string, { x: number; y: number }>>({});
    const layoutPersistTimers = useRef(new Map<string, NodeJS.Timeout>());
    const bulkLayoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const bulkEdgeTimerRef = useRef<NodeJS.Timeout | null>(null);

    const clearSimulationTimer = useCallback(() => {
        if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
        }
    }, []);

    // App mode setter with localStorage persistence
    const setAppMode = useCallback((mode: AppMode) => {
        setAppModeState(mode);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(appModeStorageKey, mode);
        }
        console.log('[GraphContext] App mode changed:', mode);
    }, []);

    // Remix basket management
    const addToRemixBasket = useCallback((element: RemixElement) => {
        setRemixBasket(prev => {
            const next = new Map(prev);
            next.set(element.id, { ...element, addedAt: new Date() });
            console.log('[GraphContext] Added to remix basket:', element.name, 'from', element.sourcePackage);
            return next;
        });
    }, []);

    const removeFromRemixBasket = useCallback((elementId: string) => {
        setRemixBasket(prev => {
            const next = new Map(prev);
            const removed = next.get(elementId);
            next.delete(elementId);
            if (removed) {
                console.log('[GraphContext] Removed from remix basket:', removed.name);
            }
            return next;
        });
    }, []);

    const clearRemixBasket = useCallback(() => {
        setRemixBasket(new Map());
        console.log('[GraphContext] Remix basket cleared');
    }, []);

    const applyNodeUpdates = useCallback((node: GraphNode, updates: Partial<GraphNode>): GraphNode => {
        if (!updates) return node;

        const next = { ...node, ...updates };

        if (Array.isArray(updates.settings)) {
            next.settings = updates.settings;
        }

        if (updates.inputs) {
            next.inputs = updates.inputs;
        }

        if (updates.outputs) {
            next.outputs = updates.outputs;
        }

        return next;
    }, []);

    const loadStoredLayouts = useCallback(() => {
        if (typeof window === 'undefined') {
            return {};
        }

        try {
            const raw = window.localStorage.getItem(layoutStorageKey);
            if (!raw) {
                return {};
            }

            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        } catch (error) {
            console.warn('Failed to parse stored graph layouts.', error);
        }

        return {};
    }, []);

    useEffect(() => {
        setNodeLayouts(loadStoredLayouts());
    }, [loadStoredLayouts]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.setItem(layoutStorageKey, JSON.stringify(nodeLayouts));
        } catch (error) {
            console.warn('Unable to persist graph layouts.', error);
        }
    }, [nodeLayouts]);

    const computeDefaultLayout = useCallback((index = 0) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        const x = column * 260 + 40;
        const y = row * 160 + 40;
        return { x, y };
    }, []);

    const fetchNodes = useCallback(async () => {
        setLoadingNodes(true);
        try {
            const data: any = await apiClient.get('/api/graph');
            let incomingNodes: GraphNode[] = [];
            let incomingEdges: GraphEdge[] = [];
            let incomingLayouts: Record<string, { x: number; y: number }> | null = null;

            if (Array.isArray(data)) {
                incomingNodes = data;
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.nodes)) {
                    incomingNodes = data.nodes;
                }

                if (Array.isArray(data.edges)) {
                    incomingEdges = data.edges;
                }

                if (data.layouts && typeof data.layouts === 'object') {
                    incomingLayouts = data.layouts;
                }
            }

            if (incomingNodes.length) {
                setNodes(incomingNodes);
                nodesRef.current = incomingNodes;
                setEdges(incomingEdges);
                edgesRef.current = incomingEdges;
                if (incomingLayouts) {
                    setNodeLayouts(incomingLayouts);
                    nodeLayoutsRef.current = incomingLayouts;
                }
                setSelectedNodeId(prev => {
                    if (prev && incomingNodes.some(node => node.id === prev)) {
                        return prev;
                    }
                    return incomingNodes[0]?.id ?? null;
                });
                setNodesError(null);
            } else {
                setNodes(fallbackNodes);
                nodesRef.current = fallbackNodes;
                setEdges(fallbackEdges);
                edgesRef.current = fallbackEdges;
                setNodeLayouts(prev => {
                    if (Object.keys(prev).length) {
                        return prev;
                    }

                    const next = fallbackNodes.reduce((acc, _, index) => {
                        acc[fallbackNodes[index].id] = computeDefaultLayout(index);
                        return acc;
                    }, {} as Record<string, { x: number; y: number }>);

                    nodeLayoutsRef.current = next;
                    return next;
                });
                setSelectedNodeId(prev => prev ?? fallbackNodes[0]?.id ?? null);
                setNodesError(null);
            }
        } catch (error) {
            console.warn('Graph nodes request failed, falling back to local data.', error);
            setNodes(fallbackNodes);
            nodesRef.current = fallbackNodes;
            setEdges(fallbackEdges);
            edgesRef.current = fallbackEdges;
            setNodeLayouts(prev => {
                if (Object.keys(prev).length) {
                    return prev;
                }

                const next = fallbackNodes.reduce((acc, node, index) => {
                    acc[node.id] = computeDefaultLayout(index);
                    return acc;
                }, {} as Record<string, { x: number; y: number }>);

                nodeLayoutsRef.current = next;
                return next;
            });
            setSelectedNodeId(prev => prev ?? fallbackNodes[0]?.id ?? null);
            setNodesError(error);
        } finally {
            setLoadingNodes(false);
        }
    }, [computeDefaultLayout]);

    const fetchProjects = useCallback(async () => {
        setLoadingProjects(true);
        try {
            const data: any = await apiClient.get('/api/graph/projects');
            const projectList = data?.projects || data;
            if (Array.isArray(projectList) && projectList.length) {
                setProjects(projectList);
                setProjectsError(null);
            } else {
                setProjects(fallbackProjects);
                setProjectsError(null);
            }
        } catch (error) {
            console.warn('Graph projects request failed, falling back to local data.', error);
            setProjects(fallbackProjects);
            setProjectsError(error);
        } finally {
            setLoadingProjects(false);
        }
    }, []);

    // Bridge GraphContext with AuthContext
    useEffect(() => {
        const graphContext = {
            selectedNodeId,
            nodesCount: nodes.length,
            edgesCount: edges.length,
            currentCortex,
            lastGraphActivity: new Date().toISOString()
        };
        updateSharedContext({ graphContext });
    }, [selectedNodeId, nodes.length, edges.length, currentCortex, updateSharedContext]);

    // Sync with AuthContext shared data
    useEffect(() => {
        if (user && user.preferences && user.preferences.selectedNodeId) {
            const savedNodeId = user.preferences.selectedNodeId;
            if (savedNodeId && savedNodeId !== selectedNodeId && nodes.some(node => node.id === savedNodeId)) {
                setSelectedNodeId(savedNodeId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Persist graph state to user profile
    useEffect(() => {
        if (user && selectedNodeId) {
            const updates = {
                ...user,
                preferences: {
                    ...user.preferences,
                    selectedNodeId,
                    lastGraphActivity: currentCortex
                }
            };
            localStorage.setItem(`eve.user.${user.user_id}`, JSON.stringify(updates));
        }
    }, [user, selectedNodeId, currentCortex]);

    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    useEffect(() => {
        edgesRef.current = edges;
    }, [edges]);

    useEffect(() => {
        nodeLayoutsRef.current = nodeLayouts;
    }, [nodeLayouts]);

    useEffect(() => {
        setNodeLayouts(prev => {
            let changed = false;
            const next = { ...prev };

            nodes.forEach((node, index) => {
                if (!next[node.id]) {
                    next[node.id] = computeDefaultLayout(index);
                    changed = true;
                }
            });

            Object.keys(next).forEach((id) => {
                if (!nodes.some(node => node.id === id)) {
                    delete next[id];
                    changed = true;
                }
            });

            if (changed) {
                nodeLayoutsRef.current = next;
                return next;
            }

            return prev;
        });
    }, [nodes, computeDefaultLayout]);

    const selectNode = useCallback((nodeId: string | null) => {
        setSelectedNodeId(nodeId);
    }, []);

    useEffect(() => {
        setSimulation(prev => {
            if (!selectedNodeId || prev.nodeId === selectedNodeId) {
                return prev;
            }
            return { ...initialSimulationState };
        });
    }, [selectedNodeId]);

    const scheduleNodeLayoutPersist = useCallback((nodeId: string, layout: { x: number; y: number }) => {
        if (!nodeId) {
            return;
        }

        const timers = layoutPersistTimers.current;
        const existing = timers.get(nodeId);

        if (existing) {
            clearTimeout(existing);
        }

        const timer = setTimeout(async () => {
            timers.delete(nodeId);

            try {
                await apiClient.put(`/api/graph/layouts/${nodeId}`, layout);
            } catch (error) {
                console.warn('Persisting node layout failed.', error);
            }
        }, 600);

        timers.set(nodeId, timer);
    }, []);

    const scheduleLayoutsPersist = useCallback(() => {
        if (bulkLayoutTimerRef.current) {
            clearTimeout(bulkLayoutTimerRef.current);
        }

        bulkLayoutTimerRef.current = setTimeout(async () => {
            try {
                await apiClient.put('/api/graph/layouts', { layouts: nodeLayoutsRef.current });
            } catch (error) {
                console.warn('Persisting graph layouts failed.', error);
            }
        }, 800);
    }, []);

    const scheduleEdgesPersist = useCallback(() => {
        if (bulkEdgeTimerRef.current) {
            clearTimeout(bulkEdgeTimerRef.current);
        }

        bulkEdgeTimerRef.current = setTimeout(async () => {
            const currentEdges = edgesRef.current;
            try {
                await apiClient.put('/api/graph/edges', currentEdges);
            } catch (error) {
                console.warn('Persisting graph edges failed.', error);
            }
        }, 800);
    }, []);

    const importFlow = useCallback((flowDefinition: any) => {
        const graph = flowDefinition?.nodes ? flowDefinition : flowDefinition?.graph;

        if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
            throw new Error('Imported flow must include a non-empty "nodes" array.');
        }

        const nextNodes = graph.nodes;
        const nextEdges = Array.isArray(graph.edges) ? graph.edges : [];
        const nextLayouts = graph.layouts && typeof graph.layouts === 'object' ? graph.layouts : null;

        clearSimulationTimer();
        setNodes(nextNodes);
        nodesRef.current = nextNodes;
        setEdges(nextEdges);
        edgesRef.current = nextEdges;
        scheduleEdgesPersist();
        if (nextLayouts) {
            setNodeLayouts(nextLayouts);
            nodeLayoutsRef.current = nextLayouts;
            scheduleLayoutsPersist();
        }
        setSelectedNodeId(prev => {
            if (prev && nextNodes.some((node: GraphNode) => node.id === prev)) {
                return prev;
            }
            return nextNodes[0]?.id ?? null;
        });
        setLoadingNodes(false);
        setNodesError(null);
        setSimulation(initialSimulationState);
    }, [clearSimulationTimer, scheduleLayoutsPersist, scheduleEdgesPersist]);

    /**
     * Import a FlowObject (from marketplace/remix) into the editor
     * This method handles the full FlowObject type with proper remix attribution
     */
    const importFlowObject = useCallback((flow: FlowObject) => {
        console.log('[GraphContext] Importing FlowObject:', flow.id, flow.name);

        // Convert FlowObject nodes to GraphNode format if needed
        const graphNodes: GraphNode[] = (flow.nodes || []).map((node, index) => ({
            id: node.id,
            name: node.data?.label || `Node ${index + 1}`,
            type: node.type || 'Custom',
            description: String(node.data?.config?.description || ''),
            status: 'ready' as const,
            temperature: String(node.data?.config?.temperature || '0.7'),
            maxTokens: String(node.data?.config?.maxTokens || '512'),
            model: String(node.data?.config?.model || 'gpt-3.5-turbo'),
            inputs: Array.isArray(node.data?.config?.inputs) ? node.data.config.inputs : [],
            outputs: Array.isArray(node.data?.config?.outputs) ? node.data.config.outputs : [],
            settings: Array.isArray(node.data?.config?.settings) ? node.data.config.settings : [],
            layout: node.position ? { x: node.position.x, y: node.position.y } : undefined
        }));

        // Convert FlowObject edges to GraphEdge format
        const graphEdges: GraphEdge[] = (flow.edges || []).map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle || null,
            targetHandle: edge.targetHandle || null,
            label: edge.label || ''
        }));

        // Extract layouts from nodes
        const layouts: Record<string, { x: number; y: number }> = {};
        graphNodes.forEach((node, index) => {
            if (node.layout) {
                layouts[node.id] = node.layout;
            } else {
                layouts[node.id] = computeDefaultLayout(index);
            }
        });

        // Clear simulation and set new state
        clearSimulationTimer();

        // Set flow metadata
        setCurrentFlowId(flow.id);
        setCurrentFlowName(flow.name);
        setRemixedFrom(flow.remixedFrom || null);

        // Set graph state
        setNodes(graphNodes);
        nodesRef.current = graphNodes;
        setEdges(graphEdges);
        edgesRef.current = graphEdges;
        setNodeLayouts(layouts);
        nodeLayoutsRef.current = layouts;

        // Persist
        scheduleEdgesPersist();
        scheduleLayoutsPersist();

        // Select first node
        setSelectedNodeId(graphNodes[0]?.id ?? null);
        setLoadingNodes(false);
        setNodesError(null);
        setSimulation(initialSimulationState);

        console.log('[GraphContext] FlowObject imported successfully:', {
            flowId: flow.id,
            flowName: flow.name,
            nodeCount: graphNodes.length,
            edgeCount: graphEdges.length,
            remixedFrom: flow.remixedFrom?.originalName || 'none'
        });
    }, [clearSimulationTimer, computeDefaultLayout, scheduleEdgesPersist, scheduleLayoutsPersist]);

    /**
     * Clear the current flow metadata (when starting fresh)
     */
    const clearCurrentFlow = useCallback(() => {
        setCurrentFlowId(null);
        setCurrentFlowName(null);
        setRemixedFrom(null);
    }, []);

    const updateNode = useCallback(async (nodeId: string, updates: Partial<GraphNode>) => {
        setNodes(prev => {
            const next = prev.map(node => (
                node.id === nodeId ? applyNodeUpdates(node, updates) : node
            ));
            nodesRef.current = next;
            return next;
        });

        try {
            await apiClient.put(`/api/graph/nodes/${nodeId}`, updates);
        } catch (error) {
            console.warn('Failed to persist node update; state reflects optimistic value.', error);
        }
    }, [applyNodeUpdates]);

    const addNode = useCallback(async (nodeInput: Partial<GraphNode>): Promise<GraphNode> => {
        const timestamp = Date.now();
        const baseId = typeof nodeInput?.id === 'string' && nodeInput.id.trim()
            ? nodeInput.id.trim()
            : `${nodeInput?.type || 'node'}-${timestamp}`;

        const name = nodeInput?.name?.trim() || `${nodeInput?.type || 'Node'} ${nodesRef.current.length + 1}`;
        const type = nodeInput?.type || 'Custom';
        const description = nodeInput?.description || 'Newly added node';

        const template: GraphNode = {
            id: baseId,
            name,
            type,
            description,
            status: 'ready',
            temperature: nodeInput?.temperature ?? '0.7',
            maxTokens: nodeInput?.maxTokens ?? '512',
            model: nodeInput?.model ?? 'gpt-3.5-turbo',
            inputs: nodeInput?.inputs ?? [],
            outputs: nodeInput?.outputs ?? [],
            settings: nodeInput?.settings ?? []
        };

        const layout = computeDefaultLayout(nodesRef.current.length);

        setNodes(prev => [...prev, template]);
        nodesRef.current = [...nodesRef.current, template];
        setSelectedNodeId(template.id);
        setNodeLayouts(prev => ({
            ...prev,
            [template.id]: layout
        }));
        nodeLayoutsRef.current = {
            ...nodeLayoutsRef.current,
            [template.id]: layout
        };
        scheduleNodeLayoutPersist(template.id, layout);

        try {
            const created: any = await apiClient.post('/api/graph/nodes', { ...template, layout });
            const persisted = created?.node ?? created;

            if (persisted?.id) {
                const persistedLayout = persisted.layout || layout;

                if (persisted.id !== template.id) {
                    const pendingTimer = layoutPersistTimers.current.get(template.id);
                    if (pendingTimer) {
                        clearTimeout(pendingTimer);
                        layoutPersistTimers.current.delete(template.id);
                    }
                }

                setNodes(prev => {
                    const next = prev.map(node => (
                        node.id === template.id ? { ...node, ...persisted } : node
                    ));
                    nodesRef.current = next;
                    return next;
                });

                setNodeLayouts(prev => {
                    if (persisted.id === template.id && !persisted.layout) {
                        return prev;
                    }

                    const next = { ...prev };

                    if (persisted.id !== template.id) {
                        delete next[template.id];
                    }

                    next[persisted.id] = persistedLayout;
                    nodeLayoutsRef.current = next;
                    return next;
                });

                setSelectedNodeId(prev => (prev === template.id ? persisted.id : prev));
                scheduleNodeLayoutPersist(persisted.id, persistedLayout);
            }
        } catch (error) {
            console.warn('createGraphNode failed; node stored locally.', error);
        }

        // Since we're using async inside, we return the template immediately
        // Ideally this function would wait, but for current usage patterns it returns the optimistic template
        // If strict waiting is needed, we would restructure this.
        return template;
    }, [computeDefaultLayout, scheduleNodeLayoutPersist]);

    const addEdge = useCallback((edgeInput: Partial<GraphEdge> = {}) => {
        const source = edgeInput.source?.trim();
        const target = edgeInput.target?.trim();

        if (!source || !target || source === target) {
            return null;
        }

        const generatedId = edgeInput.id?.trim() || `${source}-${edgeInput.sourceHandle || 'out'}-${target}-${edgeInput.targetHandle || 'in'}-${Date.now()}`;

        let createdEdge: GraphEdge | null = null;

        setEdges(prev => {
            const duplicate = prev.find(edge => (
                edge.id === generatedId || (
                    edge.source === source &&
                    edge.target === target &&
                    (edge.sourceHandle || null) === (edgeInput.sourceHandle || null) &&
                    (edge.targetHandle || null) === (edgeInput.targetHandle || null)
                )
            ));

            if (duplicate) {
                createdEdge = duplicate;
                return prev;
            }

            const nextEdge: GraphEdge = {
                id: generatedId,
                source,
                target,
                sourceHandle: edgeInput.sourceHandle || null,
                targetHandle: edgeInput.targetHandle || null,
                label: edgeInput.label ?? ''
            };

            const next = [...prev, nextEdge];
            edgesRef.current = next;
            createdEdge = nextEdge;
            return next;
        });

        if (!createdEdge) {
            return null;
        }

        ; (async () => {
            try {
                const persisted: any = await apiClient.post('/api/graph/edges', createdEdge);
                const normalized = persisted?.edge ?? persisted;

                if (normalized?.id && normalized.id !== (createdEdge as GraphEdge).id) {
                    setEdges(prev => {
                        const next = prev.map(edge => (
                            edge.id === (createdEdge as GraphEdge).id ? { ...createdEdge, ...normalized } : edge
                        ));
                        edgesRef.current = next;
                        return next;
                    });
                }
            } catch (error) {
                console.warn('createGraphEdge failed; using local edge only.', error);
            }
        })();

        scheduleEdgesPersist();
        return createdEdge;
    }, [scheduleEdgesPersist]);

    const updateEdge = useCallback((edgeId: string, updates: Partial<GraphEdge>) => {
        if (!edgeId || !updates) {
            return null;
        }

        let nextEdgeRef: GraphEdge | null = null;

        setEdges(prev => {
            const next = prev.map(edge => {
                if (edge.id !== edgeId) {
                    return edge;
                }

                const updated = { ...edge, ...updates };
                nextEdgeRef = updated;
                return updated;
            });
            edgesRef.current = next;
            return next;
        });

        if (!nextEdgeRef) {
            return null;
        }

        ; (async () => {
            try {
                await apiClient.put(`/api/graph/edges/${edgeId}`, updates);
            } catch (error) {
                console.warn('updateGraphEdge failed; state reflects optimistic value.', error);
            }
        })();

        scheduleEdgesPersist();
        return nextEdgeRef;
    }, [scheduleEdgesPersist]);

    const removeEdge = useCallback((edgeId: string) => {
        if (!edgeId) {
            return;
        }

        let removed: GraphEdge | null = null;

        setEdges(prev => {
            const next = prev.filter(edge => {
                if (edge.id === edgeId) {
                    removed = edge;
                    return false;
                }
                return true;
            });
            edgesRef.current = next;
            return next;
        });

        if (!removed) {
            return;
        }

        ; (async () => {
            try {
                await apiClient.delete(`/api/graph/edges/${edgeId}`);
            } catch (error) {
                console.warn('deleteGraphEdge failed; edge removed locally.', error);
            }
        })();

        scheduleEdgesPersist();
    }, [scheduleEdgesPersist]);

    const updateNodeLayout = useCallback((nodeId: string, layoutPatch: Partial<{ x: number; y: number }>) => {
        if (!nodeId) {
            return;
        }

        let nextLayout: { x: number; y: number } | null = null;

        setNodeLayouts(prev => {
            const current = prev[nodeId] || computeDefaultLayout();
            const targetX = typeof layoutPatch?.x === 'number' ? layoutPatch.x : current.x;
            const targetY = typeof layoutPatch?.y === 'number' ? layoutPatch.y : current.y;

            nextLayout = {
                x: Math.max(0, Math.round(targetX * 100) / 100),
                y: Math.max(0, Math.round(targetY * 100) / 100)
            };

            return {
                ...prev,
                [nodeId]: nextLayout
            };
        });

        if (nextLayout) {
            nodeLayoutsRef.current = {
                ...nodeLayoutsRef.current,
                [nodeId]: nextLayout
            };
            scheduleNodeLayoutPersist(nodeId, nextLayout);
        }
    }, [computeDefaultLayout, scheduleNodeLayoutPersist]);

    const nudgeNodeLayout = useCallback((nodeId: string, dx = 0, dy = 0) => {
        if (!nodeId) {
            return;
        }

        const current = nodeLayoutsRef.current[nodeId] || computeDefaultLayout();
        const nextLayout = {
            x: Math.max(0, Math.round((current.x + dx) * 100) / 100),
            y: Math.max(0, Math.round((current.y + dy) * 100) / 100)
        };

        setNodeLayouts(prev => ({
            ...prev,
            [nodeId]: nextLayout
        }));

        nodeLayoutsRef.current = {
            ...nodeLayoutsRef.current,
            [nodeId]: nextLayout
        };

        scheduleNodeLayoutPersist(nodeId, nextLayout);
    }, [computeDefaultLayout, scheduleNodeLayoutPersist]);

    const autoLayoutNodes = useCallback(() => {
        setNodeLayouts(prev => {
            const next = { ...prev };
            nodes.forEach((node, index) => {
                next[node.id] = computeDefaultLayout(index);
            });
            nodeLayoutsRef.current = next;
            return next;
        });
        scheduleLayoutsPersist();
    }, [nodes, computeDefaultLayout, scheduleLayoutsPersist]);

    const createProject = useCallback(async (name: string): Promise<GraphProject | null> => {
        const trimmed = name?.trim();
        if (!trimmed) {
            return null;
        }

        try {
            const created: any = await apiClient.post('/api/graph/projects', { name: trimmed });
            if (created) {
                setProjects(prev => [created, ...prev]);
                return created;
            }
        } catch (error) {
            console.warn('createProject failed.', error);
        }
        return null;
    }, []);

    const refreshNodes = useCallback(async () => {
        await fetchNodes();
    }, [fetchNodes]);

    const refreshProjects = useCallback(async () => {
        await fetchProjects();
    }, [fetchProjects]);

    const selectedNode = useMemo(() => {
        return nodes.find(node => node.id === selectedNodeId) || null;
    }, [nodes, selectedNodeId]);

    const runSimulation = useCallback((params: { nodeId: string }) => {
        if (!params.nodeId) {
            return;
        }

        const runId = `sim-${Date.now()}`;

        setSimulation({
            status: 'running',
            progress: 0,
            nodeId: params.nodeId,
            runId,
            result: null,
            error: null
        });

        clearSimulationTimer();

        let progress = 0;
        simulationTimerRef.current = setInterval(() => {
            progress += 10;

            if (progress >= 100) {
                clearSimulationTimer();
                setSimulation(prev => ({
                    ...prev,
                    status: 'completed',
                    progress: 100,
                    result: {
                        nodeId: params.nodeId,
                        output: 'Simulation completed successfully',
                        timestamp: new Date().toISOString()
                    }
                }));
            } else {
                setSimulation(prev => ({
                    ...prev,
                    progress
                }));
            }
        }, 300);
    }, [clearSimulationTimer]);

    const resetSimulation = useCallback(() => {
        clearSimulationTimer();
        setSimulation(initialSimulationState);
    }, [clearSimulationTimer]);

    const value: GraphContextType = {
        nodes, edges, nodeLayouts, projects, simulation,

        // App mode for Remix IDE
        appMode, setAppMode,

        // Remix basket
        remixBasket, addToRemixBasket, removeFromRemixBasket, clearRemixBasket,

        // Flow metadata
        currentFlowId, currentFlowName, remixedFrom,

        loadingNodes, nodesError, loadingProjects, projectsError,

        selectedNodeId, selectedNode, selectNode,
        fetchNodes, refreshNodes, fetchProjects, refreshProjects,
        updateNode, addNode,
        addEdge, updateEdge, removeEdge,

        updateNodeLayout, nudgeNodeLayout, autoLayoutNodes,
        createProject, importFlow, importFlowObject, clearCurrentFlow, runSimulation, resetSimulation
    };

    return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGraph() {
    const context = useContext(GraphContext);
    if (!context) {
        throw new Error('useGraph must be used within a GraphProvider');
    }
    return context;
}
