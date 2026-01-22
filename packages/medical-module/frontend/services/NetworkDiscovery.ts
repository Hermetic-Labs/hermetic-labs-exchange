/**
 * Network Discovery Service for Medical Module
 *
 * Enables bedside assistants and nurse stations to discover each other
 * on the local network. Uses multiple strategies:
 *
 * 1. mDNS/Bonjour-style broadcast (via backend relay)
 * 2. WebSocket beacon system
 * 3. Manual IP configuration fallback
 *
 * Target: Raspberry Pi mesh network
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DiscoveredNode {
    id: string;
    type: 'bedside' | 'nurse-station' | 'admin';
    name: string;
    room?: string;
    ip: string;
    port: number;
    lastSeen: number;
    status: 'online' | 'busy' | 'offline';
    capabilities: string[];
}

export interface NetworkConfig {
    nodeId: string;
    nodeType: 'bedside' | 'nurse-station' | 'admin';
    nodeName: string;
    room?: string;
    backendUrl: string;
    discoveryInterval: number;
    heartbeatInterval: number;
}

type DiscoveryCallback = (nodes: DiscoveredNode[]) => void;

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: Partial<NetworkConfig> = {
    discoveryInterval: 5000,  // Check for nodes every 5s
    heartbeatInterval: 3000,  // Send heartbeat every 3s
    backendUrl: 'http://localhost:8001'
};

const NODE_TIMEOUT = 15000; // Consider node offline after 15s

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
    nodeId: 'eve-medical-node-id',
    knownNodes: 'eve-medical-known-nodes',
    manualNodes: 'eve-medical-manual-nodes'
};

// =============================================================================
// NETWORK DISCOVERY SERVICE
// =============================================================================

class NetworkDiscoveryService {
    private config: NetworkConfig | null = null;
    private ws: WebSocket | null = null;
    private discoveredNodes: Map<string, DiscoveredNode> = new Map();
    private listeners: Set<DiscoveryCallback> = new Set();
    private heartbeatTimer: number | null = null;
    private cleanupTimer: number | null = null;
    private reconnectTimer: number | null = null;
    private isRunning = false;

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initialize the discovery service
     */
    async init(config: Partial<NetworkConfig>): Promise<void> {
        // Generate or retrieve persistent node ID
        let nodeId = localStorage.getItem(STORAGE_KEYS.nodeId);
        if (!nodeId) {
            nodeId = `node-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
            localStorage.setItem(STORAGE_KEYS.nodeId, nodeId);
        }

        this.config = {
            nodeId,
            nodeType: config.nodeType || 'bedside',
            nodeName: config.nodeName || `EVE ${config.nodeType || 'Bedside'}`,
            room: config.room,
            backendUrl: config.backendUrl || DEFAULT_CONFIG.backendUrl!,
            discoveryInterval: config.discoveryInterval || DEFAULT_CONFIG.discoveryInterval!,
            heartbeatInterval: config.heartbeatInterval || DEFAULT_CONFIG.heartbeatInterval!
        };

        // Load any manually configured nodes
        this.loadManualNodes();

        // Load previously known nodes
        this.loadKnownNodes();
    }

    /**
     * Start the discovery service
     */
    start(): void {
        if (this.isRunning || !this.config) return;
        this.isRunning = true;

        // Connect to discovery WebSocket
        this.connectWebSocket();

        // Start heartbeat
        this.startHeartbeat();

        // Start cleanup timer for stale nodes
        this.cleanupTimer = window.setInterval(() => {
            this.cleanupStaleNodes();
        }, this.config.discoveryInterval);

        console.log('[NetworkDiscovery] Started', this.config.nodeId);
    }

    /**
     * Stop the discovery service
     */
    stop(): void {
        this.isRunning = false;

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        console.log('[NetworkDiscovery] Stopped');
    }

    // =========================================================================
    // WEBSOCKET CONNECTION
    // =========================================================================

    private connectWebSocket(): void {
        if (!this.config) return;

        const wsUrl = this.config.backendUrl.replace(/^http/, 'ws') + '/ws/discovery';

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[NetworkDiscovery] WebSocket connected');
                this.announcePresence();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (e) {
                    console.warn('[NetworkDiscovery] Invalid message:', e);
                }
            };

            this.ws.onclose = () => {
                console.log('[NetworkDiscovery] WebSocket disconnected');
                this.scheduleReconnect();
            };

            this.ws.onerror = (error) => {
                console.warn('[NetworkDiscovery] WebSocket error:', error);
            };

        } catch (error) {
            console.warn('[NetworkDiscovery] Failed to connect:', error);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        if (!this.isRunning) return;

        this.reconnectTimer = window.setTimeout(() => {
            console.log('[NetworkDiscovery] Attempting reconnect...');
            this.connectWebSocket();
        }, 5000);
    }

    // =========================================================================
    // MESSAGE HANDLING
    // =========================================================================

    private handleMessage(message: any): void {
        switch (message.type) {
            case 'NODE_ANNOUNCE':
                this.handleNodeAnnounce(message);
                break;

            case 'NODE_LIST':
                this.handleNodeList(message.nodes);
                break;

            case 'NODE_LEAVE':
                this.handleNodeLeave(message.nodeId);
                break;

            case 'PING':
                this.sendPong();
                break;

            default:
                // Forward to listeners for custom handling
                break;
        }
    }

    private handleNodeAnnounce(message: any): void {
        const node: DiscoveredNode = {
            id: message.nodeId,
            type: message.nodeType,
            name: message.nodeName,
            room: message.room,
            ip: message.ip || 'unknown',
            port: message.port || 8001,
            lastSeen: Date.now(),
            status: 'online',
            capabilities: message.capabilities || []
        };

        this.discoveredNodes.set(node.id, node);
        this.notifyListeners();
        this.saveKnownNodes();
    }

    private handleNodeList(nodes: any[]): void {
        for (const nodeData of nodes) {
            const node: DiscoveredNode = {
                id: nodeData.nodeId,
                type: nodeData.nodeType,
                name: nodeData.nodeName,
                room: nodeData.room,
                ip: nodeData.ip || 'unknown',
                port: nodeData.port || 8001,
                lastSeen: Date.now(),
                status: 'online',
                capabilities: nodeData.capabilities || []
            };
            this.discoveredNodes.set(node.id, node);
        }
        this.notifyListeners();
        this.saveKnownNodes();
    }

    private handleNodeLeave(nodeId: string): void {
        const node = this.discoveredNodes.get(nodeId);
        if (node) {
            node.status = 'offline';
            this.notifyListeners();
        }
    }

    // =========================================================================
    // ANNOUNCEMENTS
    // =========================================================================

    private announcePresence(): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.config) return;

        this.ws.send(JSON.stringify({
            type: 'NODE_ANNOUNCE',
            nodeId: this.config.nodeId,
            nodeType: this.config.nodeType,
            nodeName: this.config.nodeName,
            room: this.config.room,
            capabilities: this.getCapabilities()
        }));
    }

    private sendPong(): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.config) return;

        this.ws.send(JSON.stringify({
            type: 'PONG',
            nodeId: this.config.nodeId
        }));
    }

    private startHeartbeat(): void {
        if (!this.config) return;

        this.heartbeatTimer = window.setInterval(() => {
            this.announcePresence();
        }, this.config.heartbeatInterval);
    }

    private getCapabilities(): string[] {
        const caps: string[] = ['vitals', 'chat'];

        // Check for camera
        if (navigator.mediaDevices) {
            caps.push('video-call');
        }

        // Check for speech
        if ('speechRecognition' in window || 'webkitSpeechRecognition' in window) {
            caps.push('voice');
        }

        return caps;
    }

    // =========================================================================
    // NODE MANAGEMENT
    // =========================================================================

    private cleanupStaleNodes(): void {
        const now = Date.now();
        let changed = false;

        for (const [id, node] of this.discoveredNodes) {
            if (now - node.lastSeen > NODE_TIMEOUT && node.status === 'online') {
                node.status = 'offline';
                changed = true;
            }
        }

        if (changed) {
            this.notifyListeners();
        }
    }

    private loadKnownNodes(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.knownNodes);
            if (stored) {
                const nodes = JSON.parse(stored) as DiscoveredNode[];
                for (const node of nodes) {
                    node.status = 'offline'; // Mark as offline until confirmed
                    this.discoveredNodes.set(node.id, node);
                }
            }
        } catch (e) {
            console.warn('[NetworkDiscovery] Failed to load known nodes:', e);
        }
    }

    private saveKnownNodes(): void {
        try {
            const nodes = Array.from(this.discoveredNodes.values());
            localStorage.setItem(STORAGE_KEYS.knownNodes, JSON.stringify(nodes));
        } catch (e) {
            console.warn('[NetworkDiscovery] Failed to save known nodes:', e);
        }
    }

    private loadManualNodes(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.manualNodes);
            if (stored) {
                const nodes = JSON.parse(stored) as DiscoveredNode[];
                for (const node of nodes) {
                    this.discoveredNodes.set(node.id, node);
                }
            }
        } catch (e) {
            console.warn('[NetworkDiscovery] Failed to load manual nodes:', e);
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Get all discovered nodes
     */
    getNodes(): DiscoveredNode[] {
        return Array.from(this.discoveredNodes.values());
    }

    /**
     * Get nodes of a specific type
     */
    getNodesByType(type: DiscoveredNode['type']): DiscoveredNode[] {
        return this.getNodes().filter(n => n.type === type);
    }

    /**
     * Get online nurse stations
     */
    getNurseStations(): DiscoveredNode[] {
        return this.getNodesByType('nurse-station').filter(n => n.status === 'online');
    }

    /**
     * Get online bedside units
     */
    getBedsideUnits(): DiscoveredNode[] {
        return this.getNodesByType('bedside').filter(n => n.status === 'online');
    }

    /**
     * Add a manual node (e.g., from IP input)
     */
    addManualNode(ip: string, port: number, type: DiscoveredNode['type'], name: string): void {
        const node: DiscoveredNode = {
            id: `manual-${ip}:${port}`,
            type,
            name,
            ip,
            port,
            lastSeen: Date.now(),
            status: 'offline', // Will be confirmed on connection
            capabilities: []
        };

        this.discoveredNodes.set(node.id, node);

        // Save manual nodes separately
        const manualNodes = this.getNodes().filter(n => n.id.startsWith('manual-'));
        localStorage.setItem(STORAGE_KEYS.manualNodes, JSON.stringify(manualNodes));

        this.notifyListeners();
    }

    /**
     * Remove a manual node
     */
    removeManualNode(nodeId: string): void {
        if (nodeId.startsWith('manual-')) {
            this.discoveredNodes.delete(nodeId);

            const manualNodes = this.getNodes().filter(n => n.id.startsWith('manual-'));
            localStorage.setItem(STORAGE_KEYS.manualNodes, JSON.stringify(manualNodes));

            this.notifyListeners();
        }
    }

    /**
     * Subscribe to node updates
     */
    subscribe(callback: DiscoveryCallback): () => void {
        this.listeners.add(callback);

        // Immediately call with current state
        callback(this.getNodes());

        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
        };
    }

    private notifyListeners(): void {
        const nodes = this.getNodes();
        for (const listener of this.listeners) {
            try {
                listener(nodes);
            } catch (e) {
                console.error('[NetworkDiscovery] Listener error:', e);
            }
        }
    }

    /**
     * Get this node's ID
     */
    getNodeId(): string {
        return this.config?.nodeId || '';
    }

    /**
     * Get connection URL for a node
     */
    getNodeUrl(node: DiscoveredNode): string {
        return `http://${node.ip}:${node.port}`;
    }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const networkDiscovery = new NetworkDiscoveryService();
export default networkDiscovery;
