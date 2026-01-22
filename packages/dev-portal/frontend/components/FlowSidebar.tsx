import React, { useState, useRef } from 'react';
import { 
  X, 
  Settings, 
  Play, 
  Square, 
  Download, 
  Upload, 
  Grid3X3,Copy,
  FileText,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface FlowSidebarProps {
  selectedNode: any;
  onClose: () => void;
  isOpen: boolean;
  onUpdateNode: (nodeId: string, updates: any) => void;
  onRunSimulation: (config: any) => void;
  simulation: any;
  resetSimulation: () => void;
  projects: any[];
  loadingProjects: boolean;
  onImportFlow: (file: File) => void;
  exportFlow: () => void;
  autoLayoutNodes: () => void;
}

export const FlowSidebar: React.FC<FlowSidebarProps> = ({
  selectedNode,
  onClose,
  isOpen,
  onUpdateNode,
  onRunSimulation,
  simulation,
  resetSimulation,
  projects,
  loadingProjects,
  onImportFlow,
  exportFlow,
  autoLayoutNodes}) => {
  const [activeTab, setActiveTab] = useState<'node' | 'simulation' | 'flow'>('node');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !selectedNode) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Settings size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-sm">Select a node to view details</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, { [key]: value });
  };

  const handleSettingsChange = (settingsKey: string, value: any) => {
    const updatedSettings = selectedNode.settings?.map((setting: any) =>
      setting.key === settingsKey ? { ...setting, value } : setting
    ) || [];
    onUpdateNode(selectedNode.id, { settings: updatedSettings });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle size={16} className="text-gray-500" />;
      case 'processing': return <Clock size={16} className="text-gray-500" />;
      case 'error': return <AlertTriangle size={16} className="text-gray-500" />;
      default: return <Square size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          {getStatusIcon(selectedNode.status)}
          <h2 className="font-semibold text-gray-900 truncate">
            {selectedNode.name || selectedNode.label}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'node', label: 'Node', icon: Settings },
          { id: 'simulation', label: 'Run', icon: Play },
          { id: 'flow', label: 'Flow', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'node' && (
          <div className="p-4 space-y-4">
            {/* Basic Information */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Node Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={selectedNode.name || selectedNode.label || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={selectedNode.type || 'custom'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="custom">Custom</option>
                    <option value="social">Social</option>
                    <option value="medical">Medical</option>
                    <option value="marketplace">Marketplace</option>
                    <option value="processor">Processor</option>
                    <option value="analyzer">Analyzer</option>
                    <option value="input">Input</option>
                    <option value="output">Output</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedNode.status || 'ready'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ready">Ready</option>
                    <option value="processing">Processing</option>
                    <option value="error">Error</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={selectedNode.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* AI Configuration */}
            {(selectedNode.type === 'analyzer' || selectedNode.type === 'processor') && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">AI Configuration</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <select
                      value={selectedNode.model || 'gpt-3.5-turbo'}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="claude-3">Claude-3</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Temperature: {selectedNode.temperature || '0.7'}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={selectedNode.temperature || '0.7'}
                      onChange={(e) => handleInputChange('temperature', e.target.value)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Conservative</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Tokens: {selectedNode.maxTokens || '512'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="4000"
                      value={selectedNode.maxTokens || '512'}
                      onChange={(e) => handleInputChange('maxTokens', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Custom Settings */}
            {selectedNode.settings && selectedNode.settings.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Settings</h3>
                <div className="space-y-3">
                  {selectedNode.settings.map((setting: any, index: number) => (
                    <div key={index}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {setting.label}
                      </label>
                      {setting.type === 'select' ? (
                        <select
                          value={setting.value}
                          onChange={(e) => handleSettingsChange(setting.key, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {setting.options?.map((option: string) => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : setting.type === 'number' ? (
                        <input
                          type="number"
                          value={setting.value}
                          onChange={(e) => handleSettingsChange(setting.key, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : setting.type === 'boolean' ? (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={setting.value === 'true'}
                            onChange={(e) => handleSettingsChange(setting.key, e.target.checked.toString())}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {setting.value === 'true' ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={setting.value}
                          onChange={(e) => handleSettingsChange(setting.key, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'simulation' && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Node Simulation</h3>
              <p className="text-sm text-gray-600 mb-4">
                Test the selected node with sample data
              </p>

              {/* Simulation Status */}
              {simulation.nodeId === selectedNode.id && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Simulation {simulation.status}
                    </span>
                  </div>
                  
                  {simulation.status === 'running' && (
                    <div className="mb-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${simulation.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Progress: {simulation.progress}%
                      </p>
                    </div>
                  )}

                  {simulation.result && (
                    <div className="bg-white rounded p-2 border">
                      <p className="text-xs text-gray-600 mb-1">Result:</p>
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(simulation.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {simulation.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-600">Error:</p>
                      <p className="text-xs text-red-800">{simulation.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Simulation Controls */}
              <div className="space-y-2">
                <button
                  onClick={() => onRunSimulation({ nodeId: selectedNode.id })}
                  disabled={simulation.nodeId === selectedNode.id && simulation.status === 'running'}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={14} />
                  <span>Run Simulation</span>
                </button>

                {simulation.nodeId === selectedNode.id && (
                  <button
                    onClick={resetSimulation}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
                  >
                    <Square size={14} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Flow Management</h3>
              
              {/* Flow Actions */}
              <div className="space-y-2">
                <button
                  onClick={exportFlow}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  <Download size={14} />
                  <span>Export Flow</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <Upload size={14} />
                  <span>Import Flow</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImportFlow(file);
                  }}
                  className="hidden"
                />

                <button
                  onClick={autoLayoutNodes}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                >
                  <Grid3X3 size={14} />
                  <span>Auto Layout</span>
                </button>
              </div>
            </div>

            {/* Recent Projects */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Recent Projects</h3>
              {loadingProjects ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  Loading projects...
                </div>
              ) : projects.length > 0 ? (
                <div className="space-y-2">
                  {projects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {project.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {project.nodes} nodes • Updated {project.updated}
                          </p>
                        </div>
                        <Copy size={14} className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm py-4">
                  No projects yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowSidebar;