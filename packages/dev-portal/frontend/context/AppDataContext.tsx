import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/services/ApiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedDataFlow } from '@/services/UnifiedDataFlowService';

// ---------- Types ----------

export interface Card {
    id: string;
    title: string;
    type: string;
    preview: string;
    lastModified: string;
    description: string;
    schema: {
        input: string;
        output: string;
        model: string;
        temperature: number;
        [key: string]: any;
    };
}

export interface Microtask {
    id: string;
    title: string;
    type: string;
    rating: number;
    price: string | number;
    author: string;
    description: string;
    reward: string | number;
    deadline: string;
    bids: number;
    category: string;
    status: string;
    assignee?: string;
    currency?: string;
}

export interface MarketplaceData {
    featured: any[];
    plugins: any[];
    flows: any[];
    microtasks: Microtask[];
}

export interface Persona {
    id: string;
    name: string;
    role: string;
    description: string;
    tone: string;
    expertise: string;
    created: string;
    icon: string;
    systemPrompt: string;
    exampleResponses: string;
    temperature: number;
    maxTokens: number;
    sampleConversation: Array<{ role: string; content: string }>;
    metrics: {
        totalResponses: number;
        averageRating: number;
        averageResponseTime: string;
    };
}

export interface ThreadMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface Thread {
    id: string;
    title: string;
    lastMessageAt: string;
    participants: string[];
    summary: string;
    status: string;
    persona: string;
    model: string;
    temperature: number;
    tokensUsed: number;
    context: string;
    memory: string;
    messages: ThreadMessage[];
}

export interface CortexMetrics {
    vectorsProcessed: number;
    activeModels: number;
    lastSync: string;
    bridgeStatus: string;
    emotionTrend: Array<{ label: string; value: number; color: string }>;
    [key: string]: any;
}

interface ComponentIntegrationState {
    connected: boolean;
    data: any;
    lastUpdate?: string;
}

interface ComponentIntegrations {
    social: ComponentIntegrationState;
    graph: ComponentIntegrationState;
    cortex: ComponentIntegrationState;
    marketplace: ComponentIntegrationState;
    documentation: ComponentIntegrationState;
    [key: string]: ComponentIntegrationState;
}

interface WorkflowStep {
    component: string;
    action: string;
    [key: string]: any;
}

interface Workflow {
    id: string;
    steps: WorkflowStep[];
    currentStep?: number;
    status?: string;
    startedAt?: string;
    [key: string]: any;
}

interface AppDataContextType {
    cards: Card[];
    loadingCards: boolean;
    cardsError: any;
    selectedCardId: string | null;
    setSelectedCardId: (id: string | null) => void;
    refreshCards: () => Promise<void>;

    marketplace: MarketplaceData;
    loadingMarketplace: boolean;
    marketplaceError: any;
    refreshMarketplace: () => Promise<void>;
    createMicrotask: (task: Partial<Microtask>) => Promise<Microtask | null>;

    personas: Persona[];
    loadingPersonas: boolean;
    personasError: any;
    selectedPersonaId: string | null;
    setSelectedPersonaId: (id: string | null) => void;
    refreshPersonas: () => Promise<void>;

    threads: Thread[];
    loadingThreads: boolean;
    threadsError: any;
    selectedThreadId: string | null;
    setSelectedThreadId: (id: string | null) => void;
    refreshThreads: () => Promise<void>;

    cortex: CortexMetrics;
    loadingCortex: boolean;
    cortexError: any;
    refreshCortex: () => Promise<void>;

    componentIntegrations: ComponentIntegrations;
    updateSharedComponentState: (componentId: string, state: any) => void;
    executeWorkflow: (workflow: Workflow) => any;
    getIntegrationStatus: () => any;

    refreshWithCortexContext: () => Promise<void>;
}

// ---------- Initial Data ----------

const fallbackCards: Card[] = [
    {
        id: 'card-emotion-classifier',
        title: 'Emotion Classifier',
        type: 'Emotion',
        preview: 'Detects emotional states',
        lastModified: '2024-01-15',
        description: 'Analyzes sentiment across conversation turns to detect dominant emotions.',
        schema: {
            input: 'string',
            output: 'object',
            model: 'gpt-3.5-turbo',
            temperature: 0.7
        }
    },
    {
        id: 'card-reflex-response',
        title: 'Reflex Response',
        type: 'Reflex',
        preview: 'Quick automated response',
        lastModified: '2024-01-14',
        description: 'Provides templated answers for common user intents with configurable tone.',
        schema: {
            input: 'object {intent: string}',
            output: 'string',
            model: 'gpt-4o-mini',
            temperature: 0.4
        }
    },
    {
        id: 'card-persona-template',
        title: 'Persona Template',
        type: 'Persona',
        preview: 'Creative writing assistant',
        lastModified: '2024-01-13',
        description: 'Persona scaffolding tuned for narrative writing tasks with adjustable voice.',
        schema: {
            input: 'string {prompt}',
            output: 'string',
            model: 'gpt-4o',
            temperature: 0.9
        }
    }
];

const fallbackMarketplace: MarketplaceData = {
    featured: [
        {
            id: 'mk-featured-1',
            title: 'Advanced Text Processing',
            type: 'Plugin',
            rating: 4.8,
            price: 'Free',
            author: 'EVE Team',
            description: 'Comprehensive toolkit covering sentiment, entities, translation, and summarization.',
            badges: ['Staff Pick', 'Trending']
        },
        {
            id: 'mk-featured-2',
            title: 'Creative Writing Assistant',
            type: 'Flow',
            rating: 4.9,
            price: '$19',
            author: 'Community',
            description: 'Story ideation, outline generation, and copy polishing bundled together.',
            badges: ['New', 'Top Rated']
        }
    ],
    plugins: [
        {
            id: 'mk-plugin-1',
            title: 'Audio Processing Suite',
            type: 'Plugin',
            rating: 4.5,
            price: '$25',
            author: 'Audio Labs',
            version: 'v1.6.2',
            description: 'Enhance, transcribe, and classify long-form audio with batch tooling.',
            features: ['Noise Reduction', 'Speaker Diarization', 'Keyword Spotting', 'Export Pipelines'],
            downloads: 8400,
            lastUpdated: '2024-01-11',
            compatibility: ['EVE v1.0+', 'Node.js 18+']
        },
        {
            id: 'mk-plugin-2',
            title: 'API Integration Hub',
            type: 'Plugin',
            rating: 4.8,
            price: 'Free',
            author: 'EVE Team',
            version: 'v2.0.0',
            description: 'Pre-built connectors for Slack, Linear, Jira, and custom webhooks.',
            features: ['OAuth Helpers', 'Retry Queue', 'Dashboard Logs', 'Rate Limit Guardrails'],
            downloads: 12950,
            lastUpdated: '2024-01-09',
            compatibility: ['EVE v1.0+', 'Node.js 16+']
        }
    ],
    flows: [
        {
            id: 'mk-flow-1',
            title: 'Customer Support Bot',
            type: 'Flow',
            rating: 4.7,
            price: '$22',
            author: 'Support Pro',
            category: 'Communication',
            difficulty: 'Intermediate',
            downloads: 890,
            description: 'Escalation-aware support assistant with auto-summary handoffs.'
        },
        {
            id: 'mk-flow-2',
            title: 'Content Generation Flow',
            type: 'Flow',
            rating: 4.9,
            price: '$18',
            author: 'Content AI',
            category: 'Creative',
            difficulty: 'Advanced',
            downloads: 2100,
            description: 'Long-form writing pipeline with fact-check and tone review steps.'
        },
        {
            id: 'mk-flow-3',
            title: 'Data Processing Chain',
            type: 'Flow',
            rating: 4.6,
            price: '$15',
            author: 'Data Insight',
            category: 'Analytics',
            difficulty: 'Intermediate',
            downloads: 756,
            description: 'ETL-style data ingestion, quality checks, and embedding generation.'
        }
    ],
    microtasks: [
        {
            id: 'mk-task-1',
            title: 'Design UI Mockups',
            type: 'Task',
            rating: 4.6,
            price: '$50',
            author: 'Design Agency',
            description: 'Create a modern dashboard interface for analytics workflows.',
            reward: '$50',
            deadline: '2 days',
            bids: 3,
            category: 'Design',
            status: 'open'
        },
        {
            id: 'mk-task-2',
            title: 'Write Product Reviews',
            type: 'Task',
            rating: 4.4,
            price: '$30',
            author: 'E-commerce',
            description: 'Draft 10 engaging reviews highlighting key product benefits.',
            reward: '$30',
            deadline: '1 week',
            bids: 7,
            category: 'Writing',
            status: 'open'
        },
        {
            id: 'mk-task-3',
            title: 'Logo Design Sprint',
            type: 'Task',
            rating: 4.8,
            price: '$75',
            author: 'Brand Studio',
            description: 'Deliver a logo refresh with light/dark variants and favicon.',
            reward: '$75',
            deadline: '1 day',
            bids: 2,
            category: 'Design',
            status: 'running',
            assignee: 'DesignerPro'
        },
        {
            id: 'mk-task-4',
            title: 'Copywriting Pass',
            type: 'Task',
            rating: 4.5,
            price: '$40',
            author: 'Launch Team',
            description: 'Punch up marketing copy for upcoming feature announcement.',
            reward: '$40',
            deadline: 'Reviewing',
            bids: 0,
            category: 'Writing',
            status: 'review',
            assignee: 'CopyMaster'
        },
        {
            id: 'mk-task-5',
            title: 'App Testing Sweep',
            type: 'Task',
            rating: 4.7,
            price: '$60',
            author: 'QA Guild',
            description: 'Regression testing for mobile app including push notifications.',
            reward: '$60',
            deadline: 'Completed',
            bids: 0,
            category: 'Testing',
            status: 'done',
            assignee: 'Tester123'
        }
    ]
};

const fallbackPersonas: Persona[] = [
    {
        id: 'persona-author',
        name: 'Author Bot',
        role: 'Creative Writing Assistant',
        description: 'Creative writing assistant focused on narrative structure and tone.',
        tone: 'Encouraging',
        expertise: 'Writing',
        created: '2024-01-10',
        icon: '✍️',
        systemPrompt: 'You are Author Bot, an encouraging creative-writing assistant who helps users brainstorm stories and refine their narrative voice.',
        exampleResponses: 'Absolutely! Let\'s craft something imaginative together. We can outline the plot, develop characters, and fine-tune tone step by step.',
        temperature: 0.8,
        maxTokens: 1000,
        sampleConversation: [
            { role: 'user', content: 'Help me write a creative story.' },
            { role: 'assistant', content: 'I\'d love to help craft that story! Do you have a genre or character in mind to get us started?' }
        ],
        metrics: {
            totalResponses: 847,
            averageRating: 4.8,
            averageResponseTime: '2.3s'
        }
    },
    {
        id: 'persona-reviewer',
        name: 'Code Reviewer',
        role: 'Senior Developer',
        description: 'Provides detailed, actionable feedback on code changes and design decisions.',
        tone: 'Professional',
        expertise: 'Development',
        created: '2024-01-09',
        icon: '👨‍💻',
        systemPrompt: 'You are Code Reviewer, a pragmatic senior engineer. Deliver concise but thorough feedback with clear next steps.',
        exampleResponses: 'The overall structure looks solid. Consider extracting the validation logic into a helper to keep render paths clean.',
        temperature: 0.4,
        maxTokens: 800,
        sampleConversation: [
            { role: 'user', content: 'Does this React component need optimization?' },
            { role: 'assistant', content: 'It renders frequently, so memoizing heavy computations or using React.memo could help. Here\'s what I\'d adjust...' }
        ],
        metrics: {
            totalResponses: 612,
            averageRating: 4.6,
            averageResponseTime: '1.8s'
        }
    },
    {
        id: 'persona-helper',
        name: 'Help Assistant',
        role: 'Customer Support Specialist',
        description: 'Resolves product questions quickly with a friendly tone and clear instructions.',
        tone: 'Friendly',
        expertise: 'Support',
        created: '2024-01-08',
        icon: '🤝',
        systemPrompt: 'You are Help Assistant, an empathetic support agent. Guide users calmly and provide step-by-step fixes.',
        exampleResponses: 'Thanks for reaching out! Let\'s walk through a quick check to get you back on track. First, confirm whether the API key is active...',
        temperature: 0.6,
        maxTokens: 900,
        sampleConversation: [
            { role: 'user', content: 'Customers see timeouts in the EU region.' },
            { role: 'assistant', content: 'I\'m on it! Let\'s verify the CDN routes and latency metrics. Could you confirm whether this started after the latest deploy?' }
        ],
        metrics: {
            totalResponses: 512,
            averageRating: 4.7,
            averageResponseTime: '2.0s'
        }
    }
];

const fallbackThreads: Thread[] = [
    {
        id: 'thread-alpha',
        title: 'Release Notes Review',
        lastMessageAt: '2024-01-16T09:30:00Z',
        participants: ['Author Bot', 'Product Manager'],
        summary: 'Drafted highlights for 0.4.2 release',
        status: 'active',
        persona: 'Author Bot',
        model: 'gpt-4o',
        temperature: 0.8,
        tokensUsed: 2450,
        context: 'Brainstorming product release narratives for customer-facing notes.',
        memory: 'Prefers concise bullet summaries and release impact framing.',
        messages: [
            { id: 'msg-1', role: 'user', content: 'Summarise the new features in 0.4.2', timestamp: '2024-01-16T09:00:00Z' },
            { id: 'msg-2', role: 'assistant', content: 'Here are the key additions...', timestamp: '2024-01-16T09:01:30Z' }
        ]
    },
    {
        id: 'thread-beta',
        title: 'Support Escalation',
        lastMessageAt: '2024-01-15T18:12:00Z',
        participants: ['Help Assistant', 'Support Engineer'],
        summary: 'Resolved API timeout reports for EU regions',
        status: 'paused',
        persona: 'Help Assistant',
        model: 'gpt-4o-mini',
        temperature: 0.6,
        tokensUsed: 1875,
        context: 'Tracking ongoing latency reports and mitigation actions for EU clusters.',
        memory: 'Recognizes affected customer tiers and recent hotfix rollouts.',
        messages: [
            { id: 'msg-3', role: 'user', content: 'Customers in EU hitting timeouts.', timestamp: '2024-01-15T18:05:00Z' },
            { id: 'msg-4', role: 'assistant', content: 'Investigating CDN routing now.', timestamp: '2024-01-15T18:06:10Z' }
        ]
    }
];

const fallbackCortex: CortexMetrics = {
    vectorsProcessed: 128,
    activeModels: 4,
    lastSync: '2024-01-15T20:00:00Z',
    bridgeStatus: 'connected',
    emotionTrend: [
        { label: 'Joy', value: 45, color: '#f59e0b' },
        { label: 'Focus', value: 30, color: '#8b5cf6' },
        { label: 'Stress', value: 15, color: '#ef4444' },
        { label: 'Fatigue', value: 10, color: '#06b6d4' }
    ]
};

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
    const { user, updateSharedContext } = useAuth();
    const { shareComponentData, subscribeToUpdates, initializeSync } = useUnifiedDataFlow();

    const [cards, setCards] = useState<Card[]>([]);
    const [loadingCards, setLoadingCards] = useState(true);
    const [cardsError, setCardsError] = useState<any>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

    const [marketplace, setMarketplace] = useState<MarketplaceData>(fallbackMarketplace);
    const [loadingMarketplace, setLoadingMarketplace] = useState(true);
    const [marketplaceError, setMarketplaceError] = useState<any>(null);

    const [personas, setPersonas] = useState<Persona[]>([]);
    const [loadingPersonas, setLoadingPersonas] = useState(true);
    const [personasError, setPersonasError] = useState<any>(null);
    const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

    const [threads, setThreads] = useState<Thread[]>([]);
    const [loadingThreads, setLoadingThreads] = useState(true);
    const [threadsError, setThreadsError] = useState<any>(null);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

    const [cortex, setCortex] = useState<CortexMetrics>(fallbackCortex);
    const [loadingCortex, setLoadingCortex] = useState(true);
    const [cortexError, setCortexError] = useState<any>(null);

    // Unified cross-component data state
    const [componentIntegrations, setComponentIntegrations] = useState<ComponentIntegrations>({
        social: { connected: false, data: {} },
        graph: { connected: false, data: {} },
        cortex: { connected: false, data: {} },
        marketplace: { connected: false, data: {} },
        documentation: { connected: true, data: {} }
    });

    const [workflows, setWorkflows] = useState<Workflow[]>([]);

    const refreshCards = useCallback(async () => {
        setLoadingCards(true);
        try {
            const data = await apiClient.getCards();
            if (Array.isArray(data) && data.length) {
                setCards(data);
                setCardsError(null);
                setSelectedCardId(prev => prev ?? data[0]?.id ?? null);
            } else {
                setCards(fallbackCards);
                setSelectedCardId(prev => prev ?? fallbackCards[0]?.id ?? null);
            }
        } catch (error) {
            console.warn('getCards failed, falling back to local data.', error);
            setCardsError(error);
            setCards(fallbackCards);
            setSelectedCardId(prev => prev ?? fallbackCards[0]?.id ?? null);
        } finally {
            setLoadingCards(false);
        }
    }, []);

    const refreshMarketplace = useCallback(async () => {
        setLoadingMarketplace(true);
        try {
            const data = await apiClient.getMarketplace();
            if (data && typeof data === 'object') {
                setMarketplace({ ...fallbackMarketplace, ...data });
                setMarketplaceError(null);
            } else {
                setMarketplace(fallbackMarketplace);
            }
        } catch (error) {
            console.warn('getMarketplace failed, using fallback catalog.', error);
            setMarketplaceError(error);
            setMarketplace(fallbackMarketplace);
        } finally {
            setLoadingMarketplace(false);
        }
    }, []);

    const createMicrotask = useCallback(async (microtask: Partial<Microtask>): Promise<Microtask | null> => {
        const rawRewardStr = String(microtask.reward || '0');
        const numericReward = Number.parseFloat(rawRewardStr);
        const rewardValue = Number.isFinite(numericReward) ? numericReward : 0;

        const coerceMicrotask = (task: any): Microtask => {
            if (!task) return task;
            const taskRewardStr = String(task.reward || '0');
            const taskPriceStr = String(task.price || '0');

            return {
                ...task,
                reward: Number.isFinite(parseFloat(taskRewardStr)) ? parseFloat(taskRewardStr) : rewardValue,
                price: Number.isFinite(parseFloat(taskPriceStr)) ? parseFloat(taskPriceStr) : rewardValue,
                currency: task.currency || 'USD',
                id: task.id || `microtask-${Date.now()}`,
                title: task.title || 'Untitled Task',
                type: task.type || 'Task',
                rating: task.rating || 0,
                author: task.author || 'Anonymous',
                description: task.description || '',
                deadline: task.deadline || 'Unknown',
                bids: task.bids || 0,
                category: task.category || 'General',
                status: task.status || 'open'
            };
        };

        const payload: any = {
            ...microtask,
            reward: rewardValue,
            price: microtask.price ? Number.parseFloat(String(microtask.price)) || rewardValue : rewardValue,
            currency: microtask.currency || 'USD',
            status: microtask.status || 'open',
            id: microtask.id || `microtask-${Date.now()}`
        };

        try {
            const saved = await apiClient.createMicrotask(payload);
            const normalized = coerceMicrotask(saved?.microtask ?? saved);

            setMarketplace(prev => ({
                ...prev,
                microtasks: [normalized, ...(prev.microtasks || [])]
            }));
            setMarketplaceError(null);
            return normalized;
        } catch (error) {
            console.warn('createMicrotask failed; storing locally.', error);
            const localTask = coerceMicrotask(payload);
            setMarketplace(prev => ({
                ...prev,
                microtasks: [localTask, ...(prev.microtasks || [])]
            }));
            return localTask;
        }
    }, []);

    const refreshPersonas = useCallback(async () => {
        setLoadingPersonas(true);
        try {
            const data = await apiClient.getPersonas();
            if (Array.isArray(data) && data.length) {
                setPersonas(data);
                setPersonasError(null);
                setSelectedPersonaId(prev => prev ?? data[0]?.id ?? null);
            } else {
                setPersonas(fallbackPersonas);
                setSelectedPersonaId(prev => prev ?? fallbackPersonas[0]?.id ?? null);
            }
        } catch (error) {
            console.warn('getPersonas failed, using fallback personas.', error);
            setPersonasError(error);
            setPersonas(fallbackPersonas);
            setSelectedPersonaId(prev => prev ?? fallbackPersonas[0]?.id ?? null);
        } finally {
            setLoadingPersonas(false);
        }
    }, []);

    const refreshThreads = useCallback(async () => {
        setLoadingThreads(true);
        try {
            const data = await apiClient.getThreads();
            if (Array.isArray(data) && data.length) {
                setThreads(data);
                setThreadsError(null);
                setSelectedThreadId(prev => prev ?? data[0]?.id ?? null);
            } else {
                setThreads(fallbackThreads);
                setSelectedThreadId(prev => prev ?? fallbackThreads[0]?.id ?? null);
            }
        } catch (error) {
            console.warn('getThreads failed, reverting to local conversations.', error);
            setThreadsError(error);
            setThreads(fallbackThreads);
            setSelectedThreadId(prev => prev ?? fallbackThreads[0]?.id ?? null);
        } finally {
            setLoadingThreads(false);
        }
    }, []);

    const refreshCortex = useCallback(async () => {
        setLoadingCortex(true);
        try {
            let data: CortexMetrics | null = null;

            // Try local AI service first
            if (typeof window !== 'undefined' && (window as any).localAI) {
                try {
                    data = await (window as any).localAI.getCortexMetrics();
                } catch (error) {
                    console.warn('Local AI cortex metrics failed:', error);
                }
            }

            // Fallback to HTTP API
            if (!data) {
                data = await apiClient.getCortexMetrics();
            }

            if (data && typeof data === 'object') {
                const merged = { ...fallbackCortex, ...data };
                setCortex(merged);
                setCortexError(null);

                // Share cortex data with other components via unified data flow
                shareComponentData('cortex', {
                    ...merged,
                    timestamp: new Date().toISOString(),
                    source: 'appDataContext'
                });
            } else {
                setCortex(fallbackCortex);
            }
        } catch (error) {
            console.warn('getCortexMetrics failed, using fallback telemetry.', error);
            setCortexError(error);
            setCortex(fallbackCortex);
        } finally {
            setLoadingCortex(false);
        }
    }, [shareComponentData]);

    // === UNIFIED DATA FLOW FUNCTIONS ===

    /**
     * Update local component state only (NO broadcast)
     * Used when RECEIVING updates from other components to avoid re-broadcasting
     */
    const updateLocalComponentState = useCallback((componentId: string, state: any) => {
        setComponentIntegrations(prev => ({
            ...prev,
            [componentId]: {
                ...prev[componentId],
                data: state,
                connected: true,
                lastUpdate: new Date().toISOString()
            }
        }));
    }, []);

    /**
     * Update shared state AND broadcast to other components
     * Used when THIS component has NEW data to share
     */
    const broadcastComponentState = useCallback((componentId: string, state: any) => {
        // Update local state
        updateLocalComponentState(componentId, state);

        // Broadcast to unified data flow
        shareComponentData(componentId, {
            state,
            timestamp: new Date().toISOString(),
            integrationId: `appdata-${componentId}`
        });

        console.log(`🔗 AppDataContext: Broadcast ${componentId} state:`, state);
    }, [updateLocalComponentState, shareComponentData]);

    /**
     * Legacy alias for backward compatibility
     * @deprecated Use broadcastComponentState for outgoing, updateLocalComponentState for incoming
     */
    const updateSharedComponentState = broadcastComponentState;

    /**
     * Execute cross-component workflow
     */
    const executeWorkflow = useCallback((workflow: Workflow) => {
        const workflowState = {
            ...workflow,
            status: 'executing',
            startedAt: new Date().toISOString()
        };

        setWorkflows(prev => [...prev.filter(w => w.id !== workflow.id), workflowState]);

        // Execute each step
        workflow.steps.forEach((step, index) => {
            setTimeout(() => {
                switch (step.component) {
                    case 'marketplace':
                        if (step.action === 'installModule') {
                            refreshMarketplace();
                        }
                        break;
                    case 'cortex':
                        if (step.action === 'refreshMetrics') {
                            refreshCortex();
                        }
                        break;
                    case 'social':
                        if (step.action === 'syncCollaborators') {
                            shareComponentData('social', { action: 'syncCollaborators' });
                        }
                        break;
                    case 'graph':
                        if (step.action === 'validateFlow') {
                            shareComponentData('graph', { action: 'validateFlow' });
                        }
                        break;
                }

                setWorkflows(prev => prev.map(w =>
                    w.id === workflow.id
                        ? { ...w, currentStep: index + 1, status: index + 1 >= workflow.steps.length ? 'completed' : 'executing' }
                        : w
                ));
            }, index * 2000);
        });

        return workflowState;
    }, [refreshMarketplace, refreshCortex, shareComponentData]);

    /**
     * Get component integration status
     */
    const getIntegrationStatus = useCallback(() => {
        return {
            totalComponents: Object.keys(componentIntegrations).length,
            connectedComponents: Object.values(componentIntegrations).filter(c => c.connected).length,
            integrations: componentIntegrations,
            workflows: workflows.length,
            lastActivity: Object.values(componentIntegrations)
                .reduce((latest, comp) =>
                    comp.lastUpdate && (!latest || new Date(comp.lastUpdate) > new Date(latest))
                        ? comp.lastUpdate
                        : latest
                    , null as string | null)
        };
    }, [componentIntegrations, workflows]);

    /**
     * Initialize all component integrations
     */
    const initializeComponentIntegrations = useCallback(() => {
        console.log('🚀 Initializing component integrations...');

        // Use broadcastComponentState for initial outgoing data
        broadcastComponentState('appdata', {
            cardsCount: cards.length,
            marketplaceItems: marketplace.featured?.length || 0,
            personasCount: personas.length,
            threadsCount: threads.length,
            cortexMetrics: cortex,
            timestamp: new Date().toISOString()
        });

        // Subscribe to updates - use updateLocalComponentState (NO re-broadcast!)
        // This prevents the circular dependency:
        // receive update → update local state → (do NOT broadcast again)
        const unsubscribes = [
            subscribeToUpdates('graph', (update) => {
                console.log('📊 Graph update received:', update);
                updateLocalComponentState('graph', {
                    ...update.data,
                    receivedAt: new Date().toISOString()
                });
            }),

            subscribeToUpdates('social', (update) => {
                console.log('👥 Social update received:', update);
                updateLocalComponentState('social', {
                    ...update.data,
                    receivedAt: new Date().toISOString()
                });
            }),

            subscribeToUpdates('marketplace', (update) => {
                console.log('🛒 Marketplace update received:', update);
                updateLocalComponentState('marketplace', {
                    ...update.data,
                    receivedAt: new Date().toISOString()
                });
            }),

            subscribeToUpdates('cortex', (update) => {
                console.log('🧠 Cortex update received:', update);
                updateLocalComponentState('cortex', {
                    ...update.data,
                    receivedAt: new Date().toISOString()
                });
            })
        ];

        initializeSync();

        return () => {
            unsubscribes.forEach(unsubscribe => unsubscribe());
        };
    }, [cards.length, marketplace, personas.length, threads.length, cortex, broadcastComponentState, updateLocalComponentState, subscribeToUpdates, initializeSync]);

    // Initialize integrations when provider mounts
    useEffect(() => {
        const cleanup = initializeComponentIntegrations();
        return cleanup;
    }, [initializeComponentIntegrations]);

    // Share data changes with other components
    useEffect(() => {
        if (cards.length > 0) {
            updateSharedComponentState('appdata', {
                cardsCount: cards.length,
                lastCardUpdate: new Date().toISOString()
            });
        }
    }, [cards.length, updateSharedComponentState]);

    useEffect(() => {
        if (marketplace && Object.keys(marketplace).length > 0) {
            updateSharedComponentState('appdata', {
                marketplaceItems: Object.values(marketplace).flat().length,
                lastMarketplaceUpdate: new Date().toISOString()
            });
        }
    }, [marketplace, updateSharedComponentState]);

    // Bridge selected items with AuthContext for cross-context sharing
    useEffect(() => {
        const selectedItems = {
            selectedCardId,
            selectedPersonaId,
            selectedThreadId,
            cortex,
            lastActivity: new Date().toISOString()
        };
        updateSharedContext({ selectedItems });
    }, [selectedCardId, selectedPersonaId, selectedThreadId, cortex, updateSharedContext]);

    // Sync with AuthContext shared data
    useEffect(() => {
        if (user && user.preferences) {
            if (user.preferences.selectedCardId && user.preferences.selectedCardId !== selectedCardId) {
                setSelectedCardId(user.preferences.selectedCardId);
            }
            if (user.preferences.selectedPersonaId && user.preferences.selectedPersonaId !== selectedPersonaId) {
                setSelectedPersonaId(user.preferences.selectedPersonaId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Persist user selections to user profile
    useEffect(() => {
        if (user && (selectedCardId || selectedPersonaId || selectedThreadId)) {
            const updates = {
                ...user,
                preferences: {
                    ...user.preferences,
                    selectedCardId,
                    selectedPersonaId,
                    selectedThreadId,
                    lastCortexActivity: cortex
                }
            };
            localStorage.setItem(`eve.user.${user.user_id}`, JSON.stringify(updates));
        }
    }, [user, selectedCardId, selectedPersonaId, selectedThreadId, cortex]);

    // Enhanced refresh with cortex-specific data
    const refreshWithCortexContext = useCallback(async () => {
        await Promise.all([
            refreshCards(),
            refreshMarketplace(),
            refreshPersonas(),
            refreshThreads(),
            refreshCortex()
        ]);

        updateSharedContext({
            lastCortexActivity: cortex,
            lastActivityTime: new Date().toISOString()
        });
    }, [refreshCards, refreshMarketplace, refreshPersonas, refreshThreads, refreshCortex, cortex, updateSharedContext]);

    useEffect(() => {
        refreshWithCortexContext();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value: AppDataContextType = {
        cards, loadingCards, cardsError, selectedCardId, setSelectedCardId, refreshCards,
        marketplace, loadingMarketplace, marketplaceError, refreshMarketplace, createMicrotask,
        personas, loadingPersonas, personasError, selectedPersonaId, setSelectedPersonaId, refreshPersonas,
        threads, loadingThreads, threadsError, selectedThreadId, setSelectedThreadId, refreshThreads,
        cortex, loadingCortex, cortexError, refreshCortex,
        componentIntegrations, updateSharedComponentState, executeWorkflow, getIntegrationStatus,
        refreshWithCortexContext
    };

    return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData() {
    const context = useContext(AppDataContext);
    if (!context) {
        throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
}
