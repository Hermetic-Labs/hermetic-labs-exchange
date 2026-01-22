import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGraph } from '@/components/devportal/context/GraphContext';
import { SocialCortexService } from '@/services/SocialCortexService';
import { useUnifiedDataFlow } from '@/services/UnifiedDataFlowService';
import {
  Brain,
  Users,
  Heart,
  ShoppingCart, TrendingUp,
  Settings,
  RefreshCw,
  BarChart3,
  MessageSquare,
  Network,
  Globe,
  Cpu,
  GitBranch,
  Eye,
  Download,
  Share2,
  Plus
} from 'lucide-react';

interface CortexMetrics {
  totalNodes: number;
  activeConnections: number;
  socialPosts: number;
  collaborators: number;
  marketplaceItems: number;
  processingLoad: number;
  efficiency: number;
  lastActivity: Date;
}

interface CortexNode {
  id: string;
  name: string;
  type: string;
  cortex: string;
  status: 'active' | 'idle' | 'processing' | 'error';
  connections: number;
  activity: number;
  description: string;
}

const EVEUnifiedCortex: React.FC = () => {
  const { user: _user, currentCortex, setCurrentCortex, updateSharedContext } = useAuth();
  const { nodes, edges } = useGraph();
  const { shareComponentData } = useUnifiedDataFlow();

  const socialCortex = SocialCortexService.getInstance();
  const [metrics, setMetrics] = useState<CortexMetrics>({
    totalNodes: 0,
    activeConnections: 0,
    socialPosts: 0,
    collaborators: 0,
    marketplaceItems: 0,
    processingLoad: 0,
    efficiency: 0,
    lastActivity: new Date()
  });

  const [activeView, setActiveView] = useState<'overview' | 'social' | 'nodes' | 'analytics' | 'integration'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cortexNodes, setCortexNodes] = useState<CortexNode[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [activeCollaborators, setActiveCollaborators] = useState<any[]>([]);

  // Calculate real-time metrics
  const calculateMetrics = useCallback(async () => {
    const socialPosts = await socialCortex.getSocialPosts();
    const marketplaceItems = await socialCortex.getMarketplaceItems();

    const totalNodes = nodes.length;
    const activeConnections = edges.length;
    const processingLoad = nodes.filter((n: { status?: string }) => n.status === 'processing').length;
    const efficiency = Math.min(100, (totalNodes * 10 + activeConnections * 5 + socialPosts.length * 2) % 100);

    // Extract unique collaborators
    const uniqueCollaborators = socialPosts.flatMap(p => p.collaborators || []).filter((v, i, a) => a.indexOf(v) === i);
    const collaboratorObjects = uniqueCollaborators.map((name, idx) => ({ id: `collab-${idx}`, name, role: 'Collaborator' }));

    setMetrics({
      totalNodes,
      activeConnections,
      socialPosts: socialPosts.length,
      collaborators: uniqueCollaborators.length,
      marketplaceItems: marketplaceItems.length,
      processingLoad,
      efficiency,
      lastActivity: new Date()
    });

    setRecentPosts(socialPosts.slice(0, 3));
    setActiveCollaborators(collaboratorObjects.slice(0, 4));

    // Generate cortex nodes based on current state
    const generatedNodes: CortexNode[] = [
      {
        id: 'social-coordinator',
        name: 'Social Coordinator',
        type: 'Social Engine',
        cortex: 'social',
        status: totalNodes > 0 ? 'active' : 'idle',
        connections: activeConnections,
        activity: efficiency,
        description: 'Coordinates social workflows and user interactions'
      },
      {
        id: 'medical-processor',
        name: 'Medical Processor',
        type: 'Medical AI',
        cortex: 'medical',
        status: processingLoad > 0 ? 'processing' : 'idle',
        connections: Math.floor(activeConnections * 0.3),
        activity: processingLoad > 0 ? 75 : 25,
        description: 'Processes medical data and AI analysis'
      },
      {
        id: 'marketplace-manager',
        name: 'Marketplace Manager',
        type: 'Marketplace Engine',
        cortex: 'marketplace',
        status: marketplaceItems.length > 0 ? 'active' : 'idle',
        connections: Math.floor(activeConnections * 0.4),
        activity: Math.min(90, marketplaceItems.length * 10 + 30),
        description: 'Manages marketplace modules and extensions'
      },
      {
        id: 'content-analyzer',
        name: 'Content Analyzer',
        type: 'Content AI',
        cortex: 'content',
        status: socialPosts.length > 0 ? 'active' : 'idle',
        connections: Math.floor(activeConnections * 0.2),
        activity: Math.min(85, socialPosts.length * 5 + 40),
        description: 'Analyzes and processes social content'
      }
    ];

    setCortexNodes(generatedNodes);
  }, [nodes, edges, socialCortex]);

  // Refresh metrics
  const refreshMetrics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await calculateMetrics();
    } catch (error) {
      console.error('Failed to refresh cortex metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [calculateMetrics]);

  // Update shared context with cortex data
  useEffect(() => {
    const cortexContext = {
      metrics,
      nodes: cortexNodes,
      currentCortex,
      lastUpdate: new Date().toISOString(),
      connectedComponents: {
        social: activeView === 'social',
        graph: nodes.length > 0,
        documentation: true,
        marketplace: metrics.marketplaceItems > 0
      }
    };

    updateSharedContext({ cortex: cortexContext });
  }, [metrics, cortexNodes, currentCortex, activeView, nodes.length, metrics.marketplaceItems, updateSharedContext]);

  // Initial load and periodic updates
  useEffect(() => {
    calculateMetrics();
    const interval = setInterval(calculateMetrics, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [calculateMetrics]);

  const handleCortexSwitch = (cortex: 'social' | 'medical' | 'content' | null) => {
    setCurrentCortex(cortex);

    // Trigger UI updates across components
    updateSharedContext({
      cortexSwitch: {
        newCortex: cortex,
        timestamp: new Date().toISOString()
      }
    });

    // Share cortex switch event with marketplace
    shareComponentData('cortex', {
      type: 'cortex-switched',
      newCortex: cortex,
      previousCortex: currentCortex,
      timestamp: new Date().toISOString()
    });

    console.log(`🧠 Cortex switched from ${currentCortex || 'Base'} to ${cortex || 'Base'}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-yellow-600 bg-yellow-50';
      case 'idle': return 'text-gray-600 bg-gray-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCortexIcon = (cortex: string) => {
    switch (cortex) {
      case 'social': return Users;
      case 'medical': return Heart;
      case 'marketplace': return ShoppingCart;
      case 'content': return MessageSquare;
      default: return Brain;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain size={24} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Unified Cortex</h1>
              <p className="text-sm text-gray-600">
                Social-first AI platform with modular marketplace extensions
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Cortex Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Active Cortex:</span>
              <select
                value={currentCortex || ''}
                onChange={(e) => handleCortexSwitch(e.target.value as any)}
                aria-label="Active Cortex"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Base Platform</option>
                <option value="social">Social Cortex</option>
                <option value="medical">Medical Cortex</option>
                <option value="content">Content Cortex</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={refreshMetrics}
              disabled={isRefreshing}
              aria-label="Refresh metrics"
              title="Refresh metrics"
              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700">
                {metrics.efficiency}% Efficiency
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mt-4">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'social', label: 'Social Layer', icon: Users },
            { id: 'nodes', label: 'Cortex Nodes', icon: Network },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'integration', label: 'Integration', icon: GitBranch },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === tab.id
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Nodes</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.totalNodes}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Cpu className="text-blue-600" size={24} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-green-600">
                  <TrendingUp size={14} className="mr-1" />
                  <span>+12% from last hour</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Connections</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.activeConnections}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Network className="text-green-600" size={24} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-green-600">
                  <TrendingUp size={14} className="mr-1" />
                  <span>+8% from last hour</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Social Posts</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.socialPosts}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="text-purple-600" size={24} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-blue-600">
                  <Eye size={14} className="mr-1" />
                  <span>1.2k total views</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Marketplace Items</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.marketplaceItems}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="text-orange-600" size={24} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-green-600">
                  <Plus size={14} className="mr-1" />
                  <span>3 new this week</span>
                </div>
              </div>
            </div>

            {/* Cortex Nodes Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Cortex Nodes Status</h3>
                <p className="text-sm text-gray-600">Real-time status of all active cortex components</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cortexNodes.map((node) => {
                    const Icon = getCortexIcon(node.cortex);
                    return (
                      <div
                        key={node.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Icon size={16} className="text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{node.name}</h4>
                              <p className="text-xs text-gray-500">{node.type}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(node.status)}`}>
                            {node.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{node.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Connections: {node.connections}</span>
                          <span>Activity: {node.activity}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'social' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Social Layer Integration</h3>
                    <p className="text-sm text-gray-600">Manage social posts, collaborators, and workflows</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      <Plus size={14} className="mr-1" />
                      New Post
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Social Posts</h4>
                    <div className="space-y-3">
                      {recentPosts.map((post: any) => (
                        <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-gray-900">{post.title}</h5>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {post.platform}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{post.content}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>By {post.author}</span>
                            <div className="flex items-center space-x-3">
                              <span>❤️ {post.engagement?.likes || 0}</span>
                              <span>🔄 {post.engagement?.shares || 0}</span>
                              <span>💬 {post.engagement?.comments || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Active Collaborators</h4>
                    <div className="space-y-3">
                      {activeCollaborators.map((collaborator: any) => (
                        <div key={collaborator.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users size={16} className="text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{collaborator.name}</h5>
                            <p className="text-sm text-gray-600">{collaborator.role}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-500">Influence</span>
                            <p className="text-sm font-medium text-gray-900">{collaborator.socialInfluence}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'nodes' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Cortex Node Management</h3>
                    <p className="text-sm text-gray-600">Configure and monitor cortex nodes across all components</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                      <Download size={14} className="mr-1" />
                      Export Config
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Node</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Cortex</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Activity</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Connections</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cortexNodes.map((node) => (
                        <tr key={node.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{node.name}</div>
                              <div className="text-sm text-gray-500">{node.description}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{node.type}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${node.cortex === 'social' ? 'bg-blue-100 text-blue-800' :
                              node.cortex === 'medical' ? 'bg-red-100 text-red-800' :
                                node.cortex === 'marketplace' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {node.cortex}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(node.status)}`}>
                              {node.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{node.activity}%</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{node.connections}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <button className="text-blue-600 hover:text-blue-800 text-sm">Configure</button>
                              <button className="text-green-600 hover:text-green-800 text-sm">Monitor</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cortex Analytics Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{metrics.efficiency}%</div>
                  <div className="text-sm text-gray-600">Overall Efficiency</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${metrics.efficiency}%` }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{metrics.processingLoad}</div>
                  <div className="text-sm text-gray-600">Active Processing</div>
                  <div className="text-xs text-gray-500 mt-1">Nodes currently processing</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{metrics.collaborators}</div>
                  <div className="text-sm text-gray-600">Active Collaborators</div>
                  <div className="text-xs text-gray-500 mt-1">People working in the system</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'integration' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Component Integration Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Connected Components</h4>
                  <div className="space-y-3">
                    {[
                      { name: 'Social Layer', connected: true, icon: Users },
                      { name: 'Graph Editor', connected: metrics.totalNodes > 0, icon: GitBranch },
                      { name: 'Documentation', connected: true, icon: Globe },
                      { name: 'Marketplace', connected: metrics.marketplaceItems > 0, icon: ShoppingCart },
                    ].map((component) => {
                      const Icon = component.icon;
                      return (
                        <div key={component.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Icon size={16} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">{component.name}</span>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${component.connected ? 'bg-green-400' : 'bg-gray-300'}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Integration Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <Share2 size={16} className="text-blue-600" />
                        <span className="text-sm font-medium">Share Cortex State</span>
                      </div>
                    </button>
                    <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <Download size={16} className="text-green-600" />
                        <span className="text-sm font-medium">Export Integration Config</span>
                      </div>
                    </button>
                    <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <Settings size={16} className="text-gray-600" />
                        <span className="text-sm font-medium">Configure Webhooks</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EVEUnifiedCortex;