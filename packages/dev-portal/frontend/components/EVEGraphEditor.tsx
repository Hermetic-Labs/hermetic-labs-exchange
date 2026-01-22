import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { useGraph } from '@/components/devportal/context/GraphContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedDataFlow } from '@/services/UnifiedDataFlowService';
import { flowMarketplaceService } from '@/services/FlowMarketplaceService';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
  NodeTypes,
  ConnectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node components
import { CustomNode } from './CustomNode';
import { NodeTemplates } from './NodeTemplates';
import { FlowSidebar } from './FlowSidebar';
import { SocialCortexIntegration } from './SocialCortexIntegration';
import { NodePalette } from './NodePalette';
import { JsonDropZone, SpawnedNode } from './JsonDropHandler';
import { NodeDefinition } from '@/services/NodeRegistryService';

// Remix IDE components
import { PackageBrowser, ElementTree, RemixBasket, InstalledPackage } from './remix';

// Import node types
const nodeTypes: NodeTypes = {
  custom: CustomNode,
  processor: CustomNode,
  analyzer: CustomNode,
  input: CustomNode,
  output: CustomNode,
  social: CustomNode,
  medical: CustomNode,
  marketplace: CustomNode,
  // Base node types (from Node Registry)
  core: CustomNode,
  math: CustomNode,
  type: CustomNode,
  comparison: CustomNode
};

const defaultEdgeOptions = {
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#6366f1'
  },
  style: {
    strokeWidth: 2,
    stroke: '#6366f1'
  }
};

const connectionLineStyle = {
  strokeWidth: 3,
  stroke: '#6366f1'
};

const EVEGraphEditor: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectNode,
    addNode,
    addEdge,
    updateNode,
    updateNodeLayout,
    simulation,
    runSimulation,
    resetSimulation,
    importFlow,
    importFlowObject,
    currentFlowName,
    remixedFrom,
    autoLayoutNodes,
    nodeLayouts,
    loadingNodes,
    loadingProjects,
    projects,
    // Remix IDE mode
    appMode,
    setAppMode,
    remixBasket
  } = useGraph();

  const { user, currentCortex } = useAuth();
  const { shareComponentData, subscribeToUpdates } = useUnifiedDataFlow();

  // React Flow state
  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCortex, setShowCortex] = useState(false);
  const [showBaseNodes, setShowBaseNodes] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Remix IDE state
  const [selectedRemixPackage, setSelectedRemixPackage] = useState<InstalledPackage | null>(null);
  const [showRemixBasket, setShowRemixBasket] = useState(true);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Get canvas offset for drop positioning
  // Note: This function should only be called in event handlers, not during render
  const getCanvasOffset = useCallback(() => {
    if (reactFlowWrapper.current) {
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    return { x: 0, y: 0 };
  }, []);

  // Add base node from NodePalette
  const addBaseNode = useCallback((nodeDef: NodeDefinition, position?: { x: number; y: number }) => {
    const baseNode = {
      name: nodeDef.name,
      type: nodeDef.category, // core, math, type, comparison
      description: nodeDef.description,
      status: 'ready',
      inputs: nodeDef.inputs.map(inp => ({
        type: inp.type,
        label: inp.name,
        required: inp.required,
        description: inp.description || ''
      })),
      outputs: nodeDef.outputs.map(out => ({
        type: out.type,
        label: out.name,
        required: true,
        description: out.description || ''
      })),
      settings: [],
      metadata: {
        nodeDefId: nodeDef.id,
        category: nodeDef.category,
        source: 'base-nodes',
        icon: nodeDef.icon
      }
    };

    const newNode = addNode(baseNode);

    // Update position if provided
    if (position && newNode) {
      updateNodeLayout(newNode.id, position);
    }

    console.log(`🧩 Added base node "${nodeDef.name}" (${nodeDef.id}) to graph`);
  }, [addNode, updateNodeLayout]);

  // Handle JSON drop → spawn node
  const handleJsonSpawn = useCallback((spawnedNode: SpawnedNode) => {
    const jsonNode = {
      name: spawnedNode.name,
      type: spawnedNode.type,
      description: `Spawned from ${spawnedNode.schema} schema`,
      status: 'ready',
      inputs: spawnedNode.inputs.map(inp => ({
        type: inp.type,
        label: inp.name,
        required: inp.required,
        description: ''
      })),
      outputs: spawnedNode.outputs.map(out => ({
        type: out.type,
        label: out.name,
        required: true,
        description: ''
      })),
      settings: [],
      metadata: {
        schema: spawnedNode.schema,
        source: 'json-drop',
        originalData: spawnedNode.data
      }
    };

    const newNode = addNode(jsonNode);

    if (spawnedNode.position && newNode) {
      updateNodeLayout(newNode.id, spawnedNode.position);
    }

    console.log(`📦 Spawned node "${spawnedNode.name}" from ${spawnedNode.schema} JSON`);
  }, [addNode, updateNodeLayout]);

  // Convert GraphContext nodes/edges to React Flow format
  const convertToReactFlow = useCallback(() => {
    const convertedNodes: Node[] = nodes.map((node: any) => {
      const layout = nodeLayouts[node.id] || { x: 0, y: 0 };

      return {
        id: node.id,
        type: node.type?.toLowerCase() || 'custom',
        position: { x: layout.x, y: layout.y },
        data: {
          ...node,
          label: node.name,
          status: node.status || 'ready',
          isSelected: selectedNodeId === node.id
        },
        selected: selectedNodeId === node.id
      };
    });

    const convertedEdges: Edge[] = edges.map((edge: any) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      style: {
        stroke: edge.label ? '#f59e0b' : '#6366f1',
        strokeWidth: edge.label ? 2 : 1
      }
    }));

    return { convertedNodes, convertedEdges };
  }, [nodes, edges, nodeLayouts, selectedNodeId]);

  // Check for pending flow on mount (from remix or marketplace)
  useEffect(() => {
    const pendingFlow = flowMarketplaceService.getPendingFlowForEditor();
    if (pendingFlow) {
      console.log('[EVEGraphEditor] Loading pending flow:', pendingFlow.name);
      importFlowObject(pendingFlow);
    }
  }, [importFlowObject]);

  // Sync React Flow state with GraphContext
  useEffect(() => {
    const { convertedNodes, convertedEdges } = convertToReactFlow();
    setReactFlowNodes(convertedNodes);
    setReactFlowEdges(convertedEdges);
  }, [convertToReactFlow, setReactFlowNodes, setReactFlowEdges]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    selectNode(node.id);
    setSelectedNode(node);
    setIsPanelOpen(true);
  }, [selectNode]);

  // Handle edge creation
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        addEdge({
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle
        });
      }
    },
    [addEdge]
  );

  // Handle node drag end
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node, draggedNodes: Node[]) => {
      if (draggedNodes && draggedNodes.length > 0) {
        const draggedNode = draggedNodes[0];
        updateNodeLayout(node.id, {
          x: draggedNode.position.x,
          y: draggedNode.position.y
        });
      }
    },
    [updateNodeLayout]
  );

  // Handle pane click
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setIsPanelOpen(false);
  }, []);

  // Add new node from template
  const addNodeFromTemplate = useCallback((template: any) => {
    const newNode = addNode(template);
    // Center the view on the new node
    if (reactFlowInstance) {
      const layout = nodeLayouts[newNode.id] || { x: 100, y: 100 };
      reactFlowInstance.setCenter(layout.x + 200, layout.y + 100);
    }
  }, [addNode, nodeLayouts, reactFlowInstance]);

  // Handle marketplace module addition
  const addMarketplaceNode = useCallback((moduleData: any) => {
    const marketplaceNode = {
      id: moduleData.id,
      name: moduleData.name,
      type: 'marketplace',
      description: moduleData.description,
      status: 'ready',
      inputs: [
        { type: 'any', label: 'input_data', required: true, description: 'Input data from previous nodes' }
      ],
      outputs: [
        { type: 'any', label: 'output_data', required: true, description: 'Processed output data' }
      ],
      settings: [
        { key: 'module_version', label: 'Module Version', type: 'string', value: moduleData.version },
        { key: 'module_id', label: 'Module ID', type: 'string', value: moduleData.moduleId }
      ],
      metadata: {
        moduleId: moduleData.moduleId,
        category: moduleData.category,
        source: 'marketplace'
      }
    };

    const newNode = addNode(marketplaceNode);

    // Share marketplace node creation with marketplace
    shareComponentData('marketplace', {
      type: 'node-added-to-graph',
      moduleId: moduleData.moduleId,
      nodeId: newNode.id,
      timestamp: new Date().toISOString()
    });

    console.log(`📦 Added marketplace module "${moduleData.name}" to graph as node`);
  }, [addNode, shareComponentData]);

  // Subscribe to marketplace events
  useEffect(() => {
    const unsubscribe = subscribeToUpdates('marketplace', (data) => {
      if (data?.data?.type === 'add-marketplace-node') {
        addMarketplaceNode(data.data.moduleData);
      }
    });

    return unsubscribe;
  }, [addMarketplaceNode, subscribeToUpdates]);

  // Check for pending flow to import (from marketplace remix)
  useEffect(() => {
    // Lazy import to avoid circular dependencies
    import('@/services/FlowMarketplaceService').then(({ flowMarketplaceService }) => {
      const pendingFlow = flowMarketplaceService.getPendingFlowForEditor();
      if (pendingFlow) {
        console.log('[EVEGraphEditor] Importing pending flow:', pendingFlow.name);
        // Convert FlowObject to GraphContext format
        const flowDefinition = {
          nodes: pendingFlow.nodes || [],
          edges: pendingFlow.edges || [],
          layouts: {},
          metadata: {
            id: pendingFlow.id,
            name: pendingFlow.name,
            remixedFrom: pendingFlow.remixedFrom
          }
        };
        importFlow(flowDefinition);
      }
    });
  }, [importFlow]);

  // Node templates for different domains
  const getNodeTemplates = useCallback(() => {
    const templates = [
      // Social Layer Templates
      {
        id: 'social-user',
        name: 'Social User',
        type: 'social',
        description: 'Represents a user in the social layer',
        status: 'ready',
        inputs: [
          { type: 'string', label: 'user_id', required: true, description: 'User identifier' },
          { type: 'object', label: 'profile_data', required: false, description: 'User profile information' }
        ],
        outputs: [
          { type: 'object', label: 'user_context', required: true, description: 'User context for social features' }
        ],
        settings: [
          { key: 'role', label: 'Role', type: 'select', value: 'user', options: ['user', 'expert', 'admin'] },
          { key: 'permissions', label: 'Permissions', type: 'select', value: 'read', options: ['read', 'write', 'admin'] }
        ]
      },
      {
        id: 'peer-review',
        name: 'Peer Review',
        type: 'social',
        description: 'Enable peer review and voting on responses',
        status: 'ready',
        inputs: [
          { type: 'string', label: 'content', required: true, description: 'Content to be reviewed' },
          { type: 'array', label: 'reviewers', required: true, description: 'Assigned reviewers' }
        ],
        outputs: [
          { type: 'object', label: 'review_result', required: true, description: 'Review outcome and voting results' }
        ],
        settings: [
          { key: 'min_votes', label: 'Minimum Votes', type: 'number', value: '3' },
          { key: 'approval_threshold', label: 'Approval %', type: 'number', value: '70' }
        ]
      },
      {
        id: 'social-collaboration',
        name: 'Social Collaboration',
        type: 'social',
        description: 'Enable collaborative workflows between users',
        status: 'ready',
        inputs: [
          { type: 'object', label: 'collaboration_request', required: true, description: 'Collaboration request details' },
          { type: 'array', label: 'participants', required: true, description: 'List of participants' }
        ],
        outputs: [
          { type: 'object', label: 'collaboration_session', required: true, description: 'Active collaboration session' }
        ],
        settings: [
          { key: 'collaboration_type', label: 'Type', type: 'select', value: 'document', options: ['document', 'discussion', 'voting'] },
          { key: 'max_participants', label: 'Max Participants', type: 'number', value: '10' }
        ]
      },

      // Medical Module Templates
      {
        id: 'medical-doctor',
        name: 'Doctor Verification',
        type: 'medical',
        description: 'Verify doctor credentials and qualifications',
        status: 'processing',
        inputs: [
          { type: 'string', label: 'doctor_id', required: true, description: 'Doctor identifier' },
          { type: 'object', label: 'credentials', required: true, description: 'Medical credentials and licenses' }
        ],
        outputs: [
          { type: 'object', label: 'verification_result', required: true, description: 'Verification status and details' }
        ],
        settings: [
          { key: 'verification_level', label: 'Verification Level', type: 'select', value: 'standard', options: ['basic', 'standard', 'enhanced'] },
          { key: 'auto_approve', label: 'Auto Approve', type: 'boolean', value: 'false' }
        ]
      },
      {
        id: 'drug-review',
        name: 'Drug Company Review',
        type: 'medical',
        description: 'Process drug company and medication reviews',
        status: 'ready',
        inputs: [
          { type: 'string', label: 'drug_company', required: true, description: 'Drug company identifier' },
          { type: 'object', label: 'drug_info', required: true, description: 'Drug information and studies' }
        ],
        outputs: [
          { type: 'object', label: 'review_analysis', required: true, description: 'Comprehensive review analysis' }
        ],
        settings: [
          { key: 'review_depth', label: 'Review Depth', type: 'select', value: 'standard', options: ['basic', 'standard', 'comprehensive'] },
          { key: 'include_studies', label: 'Include Studies', type: 'boolean', value: 'true' }
        ]
      },

      // Marketplace Templates
      {
        id: 'marketplace-module',
        name: 'Marketplace Module',
        type: 'marketplace',
        description: 'Create modular marketplace extensions',
        status: 'ready',
        inputs: [
          { type: 'string', label: 'module_type', required: true, description: 'Type of marketplace module' },
          { type: 'object', label: 'module_config', required: true, description: 'Module configuration' }
        ],
        outputs: [
          { type: 'object', label: 'module_instance', required: true, description: 'Created module instance' }
        ],
        settings: [
          { key: 'module_category', label: 'Category', type: 'select', value: 'utility', options: ['utility', 'medical', 'business', 'community'] },
          { key: 'access_level', label: 'Access Level', type: 'select', value: 'public', options: ['public', 'private', 'premium'] }
        ]
      },
      {
        id: 'api-integration',
        name: 'API Integration',
        type: 'processor',
        description: 'Connect to external APIs and services',
        status: 'ready',
        inputs: [
          { type: 'string', label: 'api_endpoint', required: true, description: 'API endpoint URL' },
          { type: 'object', label: 'request_config', required: true, description: 'API request configuration' }
        ],
        outputs: [
          { type: 'object', label: 'api_response', required: true, description: 'API response data' }
        ],
        settings: [
          { key: 'method', label: 'HTTP Method', type: 'select', value: 'GET', options: ['GET', 'POST', 'PUT', 'DELETE'] },
          { key: 'timeout', label: 'Timeout (ms)', type: 'number', value: '5000' }
        ]
      },

      // Flow Processing Templates
      {
        id: 'data-processor',
        name: 'Data Processor',
        type: 'processor',
        description: 'Process and transform data flows',
        status: 'ready',
        inputs: [
          { type: 'any', label: 'input_data', required: true, description: 'Data to be processed' },
          { type: 'object', label: 'processing_config', required: false, description: 'Processing configuration' }
        ],
        outputs: [
          { type: 'any', label: 'output_data', required: true, description: 'Processed data' }
        ],
        settings: [
          { key: 'processing_type', label: 'Processing Type', type: 'select', value: 'transform', options: ['transform', 'filter', 'aggregate'] },
          { key: 'batch_size', label: 'Batch Size', type: 'number', value: '100' }
        ]
      },
      {
        id: 'ai-analyzer',
        name: 'AI Analyzer',
        type: 'analyzer',
        description: 'Analyze content using AI capabilities',
        status: 'ready',
        inputs: [
          { type: 'string', label: 'content', required: true, description: 'Content to analyze' },
          { type: 'string', label: 'analysis_type', required: true, description: 'Type of analysis to perform' }
        ],
        outputs: [
          { type: 'object', label: 'analysis_result', required: true, description: 'AI analysis results' }
        ],
        settings: [
          { key: 'model', label: 'AI Model', type: 'select', value: 'gpt-4', options: ['gpt-3.5-turbo', 'gpt-4', 'claude-3'] },
          { key: 'analysis_depth', label: 'Analysis Depth', type: 'select', value: 'standard', options: ['basic', 'standard', 'deep'] }
        ]
      }
    ];

    // Categorize templates
    return {
      social: templates.filter(t => t.type === 'social'),
      medical: templates.filter(t => t.type === 'medical'),
      marketplace: templates.filter(t => t.type === 'marketplace'),
      processing: templates.filter(t => t.type === 'processor' || t.type === 'analyzer')
    };
  }, []);

  // Export current flow
  const exportFlow = useCallback(() => {
    const flowData = {
      nodes,
      edges,
      layouts: nodeLayouts,
      metadata: {
        exported: new Date().toISOString(),
        user: user?.user_id,
        cortex: currentCortex,
        version: '1.0'
      }
    };

    const dataStr = JSON.stringify(flowData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `eve-flow-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }, [nodes, edges, nodeLayouts, user, currentCortex]);

  // Import flow
  const importFlowFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const flowData = JSON.parse(e.target?.result as string);
        importFlow(flowData);
      } catch (error) {
        console.error('Failed to import flow:', error);
        alert('Failed to import flow. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }, [importFlow]);

  // Get current statistics
  const flowStats = useMemo(() => ({
    nodes: nodes.length,
    edges: edges.length,
    socialNodes: nodes.filter((n: Node) => n.type === 'social').length,
    medicalNodes: nodes.filter((n: Node) => n.type === 'medical').length,
    marketplaceNodes: nodes.filter((n: Node) => n.type === 'marketplace').length,
    processingNodes: nodes.filter((n: Node) => ['processor', 'analyzer'].includes(n.type || '')).length,
    baseNodes: nodes.filter((n: Node) => ['core', 'math', 'type', 'comparison'].includes(n.type || '')).length
  }), [nodes, edges]);

  const rfStyle = { width: '100%', height: '100%', backgroundColor: '#0f172a' };

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Remix Attribution Banner */}
      {remixedFrom && (
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/30 px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-purple-300 text-sm">🔁 Remixed from:</span>
              <span className="text-white font-medium">{remixedFrom.originalName}</span>
              <span className="text-slate-400 text-sm">by {remixedFrom.originalAuthor.name}</span>
            </div>
            <div className="text-xs text-slate-400">
              Original ID: {remixedFrom.originalId.slice(0, 8)}...
            </div>
          </div>
        </div>
      )}

      {/* Remix Mode Banner */}
      {appMode === 'remix' && (
        <div className="bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-b border-emerald-500/50 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🧬</span>
              <div>
                <span className="text-emerald-300 font-medium">Remix Mode Active</span>
                <span className="text-slate-300 text-sm ml-2">
                  Browse packages and click [+] on elements to add them to your remix basket
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-emerald-300">
                <span className="font-medium">{remixBasket.size}</span> elements in basket
              </div>
              <button
                onClick={() => setAppMode('normal')}
                className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 transition-colors"
              >
                Exit Remix Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Developer Mode Banner */}
      {appMode === 'developer' && (
        <div className="bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-b border-amber-500/50 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🛠️</span>
              <div>
                <span className="text-amber-300 font-medium">Developer Mode</span>
                <span className="text-slate-300 text-sm ml-2">
                  Advanced tools and debugging enabled
                </span>
              </div>
            </div>
            <button
              onClick={() => setAppMode('normal')}
              className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 transition-colors"
            >
              Exit Developer Mode
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">
              {currentFlowName || 'EVE-OS Graph Editor'}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-slate-300">
              <span>Social Cortex:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${currentCortex === 'social' ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-700 text-slate-300'
                }`}>
                {currentCortex || 'Base'}
              </span>
            </div>

            {/* App Mode Toggle */}
            <div className="flex items-center space-x-1 ml-4 bg-slate-900/50 rounded-lg p-1">
              <button
                onClick={() => setAppMode('normal')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  appMode === 'normal'
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setAppMode('remix')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  appMode === 'remix'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                🧬 Remix
              </button>
              <button
                onClick={() => setAppMode('developer')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  appMode === 'developer'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                🛠️ Dev
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBaseNodes(!showBaseNodes)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showBaseNodes
                ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
            >
              Base Nodes
            </button>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showTemplates
                ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
            >
              Templates
            </button>
            <button
              onClick={() => setShowCortex(!showCortex)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showCortex
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
            >
              Cortex
            </button>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
            >
              {showSidebar ? 'Hide' : 'Show'} Sidebar
            </button>
            <button
              onClick={exportFlow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Export Flow
            </button>
          </div>
        </div>

        {/* Flow Statistics */}
        <div className="mt-4 flex items-center space-x-6 text-sm text-slate-400">
          <span>Nodes: {flowStats.nodes}</span>
          <span>Edges: {flowStats.edges}</span>
          <span className="text-green-400">Base: {flowStats.baseNodes}</span>
          <span className="text-blue-400">Social: {flowStats.socialNodes}</span>
          <span className="text-red-400">Medical: {flowStats.medicalNodes}</span>
          <span className="text-amber-400">Marketplace: {flowStats.marketplaceNodes}</span>
          <span className="text-purple-400">Processing: {flowStats.processingNodes}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Remix Mode: Package Browser Panel */}
        {appMode === 'remix' && (
          <div className="w-72 bg-slate-800/90 border-r border-slate-600 overflow-y-auto">
            <PackageBrowser
              onPackageSelect={setSelectedRemixPackage}
              selectedPackageId={selectedRemixPackage?.id || null}
              isVisible={true}
            />
          </div>
        )}

        {/* Remix Mode: Element Tree Panel */}
        {appMode === 'remix' && selectedRemixPackage && (
          <div className="w-80 bg-slate-800/90 border-r border-slate-600 overflow-y-auto">
            <ElementTree
              packageId={selectedRemixPackage.id}
              packageName={selectedRemixPackage.displayName}
              isVisible={true}
            />
          </div>
        )}

        {/* Base Nodes Panel (NodePalette) - hidden in remix mode */}
        {showBaseNodes && appMode !== 'remix' && (
          <div className="w-72 bg-slate-800/90 border-r border-slate-600 overflow-y-auto">
            <NodePalette onAddNode={addBaseNode} />
          </div>
        )}

        {/* Templates Panel - hidden in remix mode */}
        {showTemplates && appMode !== 'remix' && (
          <div className="w-80 bg-slate-800/90 border-r border-slate-600 overflow-y-auto">
            <NodeTemplates
              templates={getNodeTemplates()}
              onAddNode={addNodeFromTemplate}
              currentCortex={currentCortex}
            />
          </div>
        )}

        {/* React Flow Canvas with JSON Drop Zone */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <JsonDropZone
            onNodeSpawn={handleJsonSpawn}
            onError={(error) => console.error('[JsonDrop]', error)}
            getCanvasOffset={getCanvasOffset}
          >
            <ReactFlow
              nodes={reactFlowNodes}
              edges={reactFlowEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              onPaneClick={onPaneClick}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              connectionLineStyle={connectionLineStyle}
              connectionMode={ConnectionMode.Loose}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              style={rfStyle}
              attributionPosition="bottom-left"
            >
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  switch (node.type) {
                    case 'social': return '#3b82f6';
                    case 'medical': return '#ef4444';
                    case 'marketplace': return '#f59e0b';
                    case 'processor': return '#10b981';
                    case 'analyzer': return '#8b5cf6';
                    default: return '#6b7280';
                  }
                }}
                maskColor="rgba(255, 255, 255, 0.8)"
              />
            </ReactFlow>
          </JsonDropZone>

          {/* Loading overlay - only show when truly loading with no nodes */}
          {loadingNodes && nodes.length === 0 && (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
              <div className="text-slate-300">Loading graph...</div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-slate-800/90 border-l border-slate-600 overflow-y-auto">
            <FlowSidebar
              selectedNode={selectedNode}
              onClose={() => setIsPanelOpen(false)}
              isOpen={isPanelOpen}
              onUpdateNode={updateNode}
              onRunSimulation={runSimulation}
              simulation={simulation}
              resetSimulation={resetSimulation}
              projects={projects}
              loadingProjects={loadingProjects}
              onImportFlow={importFlowFile}
              exportFlow={exportFlow}
              autoLayoutNodes={autoLayoutNodes}
            />
          </div>
        )}
      </div>

      {/* Social Cortex Integration Panel */}
      {showCortex && (
        <SocialCortexIntegration
          currentCortex={currentCortex}
          nodes={nodes}
          edges={edges}
          onNodeAdd={addNodeFromTemplate}
          onClose={() => setShowCortex(false)}
        />
      )}

      {/* Remix Basket Floating Panel */}
      <RemixBasket
        isVisible={showRemixBasket && appMode === 'remix'}
        onClose={() => setShowRemixBasket(false)}
      />
    </div>
  );
};

export default EVEGraphEditor;