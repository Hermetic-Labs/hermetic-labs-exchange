import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  User, 
  Heart, 
  ShoppingCart, 
  Cpu, 
  BarChart3, 
  Settings, 
  Clock, 
  CheckCircle,XCircle 
} from 'lucide-react';

const nodeIcons: { [key: string]: React.ComponentType<any> } = {
  social: User,
  medical: Heart,
  marketplace: ShoppingCart,
  processor: Cpu,
  analyzer: BarChart3,
  input: Settings,
  output: Settings,
  custom: Settings};

const nodeColors: { [key: string]: string } = {
  social: '#3b82f6',
  medical: '#ef4444',
  marketplace: '#f59e0b',
  processor: '#10b981',
  analyzer: '#8b5cf6',
  input: '#6366f1',
  output: '#6366f1',
  custom: '#6b7280'};

const statusColors: { [key: string]: string } = {
  ready: '#10b981',
  processing: '#f59e0b',
  error: '#ef4444',
  disabled: '#6b7280'};

const statusIcons: { [key: string]: React.ComponentType<any> } = {
  ready: CheckCircle,
  processing: Clock,
  error: XCircle,
  disabled: XCircle};

interface CustomNodeData {
  label: string;
  name: string;
  type: string;
  description: string;
  status: string;
  temperature?: string;
  model?: string;
  inputs?: Array<{ type: string; label: string; required: boolean }>;
  outputs?: Array<{ type: string; label: string; required: boolean }>;
  settings?: Array<{ key: string; label: string; value: string }>;
  isSelected?: boolean;
}

export const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const Icon = nodeIcons[data.type] || nodeIcons.custom;
  const StatusIcon = statusIcons[data.status] || statusIcons.ready;
  const nodeColor = nodeColors[data.type] || nodeColors.custom;
  const statusColor = statusColors[data.status] || statusColors.ready;

  return (
    <div 
      className={`px-4 py-3 shadow-lg rounded-lg border-2 transition-all duration-200 min-w-[200px] ${
        selected || data.isSelected
          ? 'border-blue-400 shadow-blue-200/50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      style={{ 
        backgroundColor: 'white',
        borderColor: selected || data.isSelected ? '#60a5fa' : '#e5e7eb'
      }}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ 
          background: nodeColor, 
          width: '8px', 
          height: '8px',
          border: '2px solid white'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ 
          background: nodeColor, 
          width: '8px', 
          height: '8px',
          border: '2px solid white'
        }}
      />

      {/* Node Header */}
      <div className="flex items-center space-x-3 mb-2">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${nodeColor}20` }}
        >
          <Icon size={16} style={{ color: nodeColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">
            {data.name || data.label}
          </h3>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <span className="capitalize">{data.type}</span>
            <span>•</span>
            <span className="capitalize">{data.status}</span>
          </div>
        </div>
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: statusColor }}
          title={`Status: ${data.status}`}
        />
      </div>

      {/* Description */}
      {data.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {data.description}
        </p>
      )}

      {/* Node Details */}
      <div className="space-y-1 text-xs">
        {/* AI Model Info for AI nodes */}
        {data.model && (
          <div className="flex justify-between text-gray-600">
            <span>Model:</span>
            <span className="font-mono text-xs">{data.model}</span>
          </div>
        )}
        
        {/* Temperature for AI nodes */}
        {data.temperature && (
          <div className="flex justify-between text-gray-600">
            <span>Temp:</span>
            <span className="font-mono text-xs">{data.temperature}</span>
          </div>
        )}

        {/* I/O Count */}
        {data.inputs && data.outputs && (
          <div className="flex justify-between text-gray-600">
            <span>I/O:</span>
            <span>{data.inputs.length}/{data.outputs.length}</span>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center space-x-1">
          <StatusIcon size={12} style={{ color: statusColor }} />
          <span className="text-xs text-gray-500 capitalize">{data.status}</span>
        </div>
        {selected || data.isSelected && (
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default memo(CustomNode);