/**
 * Node Palette Component
 *
 * Displays base nodes from NodeRegistry organized by category.
 * Supports drag-to-canvas and search.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Plus,
  Calculator,
  Cpu,
  Type,
  GitCompare,
  Loader2,
  GripVertical,
  Globe,
  RefreshCw
} from 'lucide-react';
import {
  nodeRegistry,
  NodeDefinition,
  NodeCategory
} from '@/services/NodeRegistryService';
import { unifiedDataFlow } from '@/services/UnifiedDataFlowService';

interface NodePaletteProps {
  onAddNode: (node: NodeDefinition, position?: { x: number; y: number }) => void;
}

// Icon mapping for categories
const categoryIcons: Record<string, React.ElementType> = {
  core: Cpu,
  math: Calculator,
  type: Type,
  comparison: GitCompare,
  'api-endpoints': Globe,
};

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['core', 'math'])
  );
  const [groupedNodes, setGroupedNodes] = useState<Map<NodeCategory, NodeDefinition[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load nodes on mount (base nodes + API endpoint nodes)
  useEffect(() => {
    const loadNodes = async () => {
      try {
        setLoading(true);

        // Initialize base nodes
        await nodeRegistry.initialize();

        // Also load API endpoint nodes from crawler
        await nodeRegistry.loadApiEndpointNodes();

        // Get grouped nodes (now includes API endpoints)
        const nodes = await nodeRegistry.getGroupedNodes();
        setGroupedNodes(nodes);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load nodes');
      } finally {
        setLoading(false);
      }
    };
    loadNodes();
  }, []);

  // Refresh API nodes (callable from parent or event)
  const refreshApiNodes = useCallback(async () => {
    try {
      await nodeRegistry.refreshApiNodes();
      const nodes = await nodeRegistry.getGroupedNodes();
      setGroupedNodes(nodes);
    } catch (err) {
      console.error('[NodePalette] Failed to refresh API nodes:', err);
    }
  }, []);

  // Subscribe to marketplace events for live updates (Living Word integration)
  useEffect(() => {
    const unsubscribe = unifiedDataFlow.subscribe('marketplace', (event: any) => {
      // Refresh API nodes when modules are installed/uninstalled
      if (event?.data?.type === 'module-installed' ||
          event?.data?.type === 'module-uninstalled' ||
          event?.data?.type === 'plugin:installed' ||
          event?.data?.type === 'plugin:uninstalled') {
        console.log('[NodePalette] Marketplace change detected, refreshing API nodes');
        refreshApiNodes();
      }
    });

    return unsubscribe;
  }, [refreshApiNodes]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const filterNodes = useCallback(
    (nodes: NodeDefinition[]) => {
      if (!searchTerm) return nodes;
      const lowerQuery = searchTerm.toLowerCase();
      return nodes.filter(
        (node) =>
          node.name.toLowerCase().includes(lowerQuery) ||
          node.description.toLowerCase().includes(lowerQuery) ||
          node.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    },
    [searchTerm]
  );

  // Handle drag start for drag-to-canvas
  const handleDragStart = (event: React.DragEvent, node: NodeDefinition) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'baseNode',
      nodeDefinition: node
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading nodes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-red-500">
          <p className="font-medium">Failed to load nodes</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => nodeRegistry.reload()}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Node Palette</h2>
          <button
            onClick={refreshApiNodes}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Refresh API nodes"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories & Nodes */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(groupedNodes.entries()).map(([category, nodes]) => {
          const filteredNodes = filterNodes(nodes);
          const Icon = categoryIcons[category.id] || Cpu;
          const isExpanded = expandedCategories.has(category.id);

          if (filteredNodes.length === 0 && searchTerm) {
            return null;
          }

          return (
            <div key={category.id} className="border-b border-gray-100">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <Icon size={16} style={{ color: category.color }} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                      <p className="text-xs text-gray-500">
                        {filteredNodes.length} nodes
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </div>
              </button>

              {/* Nodes List */}
              {isExpanded && (
                <div className="pb-2 px-2">
                  {filteredNodes.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500 text-center">
                      No nodes found
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredNodes.map((node) => (
                        <div
                          key={node.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, node)}
                          className="p-2 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing bg-white"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <GripVertical size={12} className="text-gray-300" />
                              <span className="font-medium text-gray-900 text-xs">
                                {node.name}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddNode(node);
                              }}
                              className="w-5 h-5 bg-blue-50 text-blue-600 rounded flex items-center justify-center hover:bg-blue-100 transition-colors"
                              title="Add Node"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {node.description}
                          </p>
                          <div className="flex items-center mt-1 text-xs text-gray-400">
                            <span>{node.inputs.length} in</span>
                            <span className="mx-1">→</span>
                            <span>{node.outputs.length} out</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          Drag nodes to canvas or click + to add
        </div>
      </div>
    </div>
  );
};

export default NodePalette;
