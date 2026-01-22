/**
 * JSON Drop Handler
 *
 * Handles JSON drag/drop onto canvas:
 * 1. Parses JSON
 * 2. Detects schema (FHIR, ReflexCard, custom)
 * 3. Spawns appropriate node at drop position
 * 4. Registers with Living Word for auto-discovery
 */

import React, { useCallback, useState } from 'react';
import { nodeRegistry, NodeDefinition } from '@/services/NodeRegistryService';

// ============================================================================
// Schema Detection Types
// ============================================================================

export type DetectedSchema =
  | 'fhir-patient'
  | 'fhir-observation'
  | 'fhir-bundle'
  | 'fhir-generic'
  | 'reflex-card'
  | 'node-definition'
  | 'flow-definition'
  | 'json-object'
  | 'json-array'
  | 'unknown';

export interface SchemaDetectionResult {
  schema: DetectedSchema;
  confidence: number;
  resourceType?: string;
  nodeType?: string;
  suggestedName?: string;
  data: any;
}

// ============================================================================
// Schema Detection Logic
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export function detectJsonSchema(data: any): SchemaDetectionResult {
  if (!data || typeof data !== 'object') {
    return { schema: 'unknown', confidence: 0, data };
  }

  // Check for FHIR resources
  if (data.resourceType) {
    const resourceType = data.resourceType;

    if (resourceType === 'Patient') {
      return {
        schema: 'fhir-patient',
        confidence: 0.95,
        resourceType,
        nodeType: 'medical',
        suggestedName: `Patient: ${data.name?.[0]?.given?.[0] || data.id || 'Unknown'}`,
        data
      };
    }

    if (resourceType === 'Observation') {
      return {
        schema: 'fhir-observation',
        confidence: 0.95,
        resourceType,
        nodeType: 'medical',
        suggestedName: `Observation: ${data.code?.text || data.code?.coding?.[0]?.display || data.id}`,
        data
      };
    }

    if (resourceType === 'Bundle') {
      return {
        schema: 'fhir-bundle',
        confidence: 0.95,
        resourceType,
        nodeType: 'medical',
        suggestedName: `Bundle (${data.entry?.length || 0} entries)`,
        data
      };
    }

    // Generic FHIR resource
    return {
      schema: 'fhir-generic',
      confidence: 0.85,
      resourceType,
      nodeType: 'medical',
      suggestedName: `FHIR: ${resourceType}`,
      data
    };
  }

  // Check for Reflex Card format
  if (data.type === 'reflexCard' || (data.card && data.card.reflexType)) {
    return {
      schema: 'reflex-card',
      confidence: 0.9,
      nodeType: 'custom',
      suggestedName: data.name || data.card?.title || 'Reflex Card',
      data
    };
  }

  // Check for EVE-OS Node Definition
  if (data.id && data.inputs && data.outputs && (data.category || data.execute)) {
    return {
      schema: 'node-definition',
      confidence: 0.95,
      nodeType: 'custom',
      suggestedName: data.name || data.id,
      data
    };
  }

  // Check for Flow Definition (has nodes and edges)
  if (data.nodes && Array.isArray(data.nodes) && data.edges) {
    return {
      schema: 'flow-definition',
      confidence: 0.9,
      nodeType: 'flow',
      suggestedName: data.name || `Flow (${data.nodes.length} nodes)`,
      data
    };
  }

  // Generic JSON object or array
  if (Array.isArray(data)) {
    return {
      schema: 'json-array',
      confidence: 0.5,
      nodeType: 'input',
      suggestedName: `Array (${data.length} items)`,
      data
    };
  }

  return {
    schema: 'json-object',
    confidence: 0.5,
    nodeType: 'input',
    suggestedName: data.name || data.id || 'JSON Data',
    data
  };
}

// ============================================================================
// Node Spawner
// ============================================================================

export interface SpawnedNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  data: any;
  schema: DetectedSchema;
  inputs: Array<{ name: string; type: string; required: boolean }>;
  outputs: Array<{ name: string; type: string }>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function createNodeFromJson(
  detection: SchemaDetectionResult,
  position: { x: number; y: number }
): SpawnedNode {
  const nodeId = `json-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Generate inputs/outputs based on schema
  const inputs: SpawnedNode['inputs'] = [];
  const outputs: SpawnedNode['outputs'] = [];

  switch (detection.schema) {
    case 'fhir-patient':
    case 'fhir-observation':
    case 'fhir-generic':
    case 'fhir-bundle':
      inputs.push({ name: 'resource', type: 'object', required: false });
      outputs.push({ name: 'data', type: 'object' });
      outputs.push({ name: 'id', type: 'string' });
      if (detection.schema === 'fhir-bundle') {
        outputs.push({ name: 'entries', type: 'array' });
        outputs.push({ name: 'count', type: 'number' });
      }
      break;

    case 'reflex-card':
      inputs.push({ name: 'trigger', type: 'signal', required: false });
      outputs.push({ name: 'card', type: 'object' });
      outputs.push({ name: 'reflexData', type: 'any' });
      break;

    case 'node-definition':
      // Use the node's own inputs/outputs
      if (detection.data.inputs) {
        detection.data.inputs.forEach((inp: any) => {
          inputs.push({
            name: inp.name,
            type: inp.type || 'any',
            required: inp.required ?? false
          });
        });
      }
      if (detection.data.outputs) {
        detection.data.outputs.forEach((out: any) => {
          outputs.push({
            name: out.name,
            type: out.type || 'any'
          });
        });
      }
      break;

    case 'flow-definition':
      inputs.push({ name: 'flowInput', type: 'any', required: false });
      outputs.push({ name: 'flowOutput', type: 'any' });
      outputs.push({ name: 'status', type: 'string' });
      break;

    case 'json-array':
      inputs.push({ name: 'items', type: 'array', required: false });
      outputs.push({ name: 'items', type: 'array' });
      outputs.push({ name: 'length', type: 'number' });
      outputs.push({ name: 'first', type: 'any' });
      break;

    default:
      // Generic JSON object
      inputs.push({ name: 'data', type: 'object', required: false });
      outputs.push({ name: 'data', type: 'object' });
      // Add outputs for top-level keys
      Object.keys(detection.data).slice(0, 5).forEach(key => {
        outputs.push({ name: key, type: 'any' });
      });
  }

  return {
    id: nodeId,
    type: detection.nodeType || 'input',
    name: detection.suggestedName || 'JSON Node',
    position,
    data: detection.data,
    schema: detection.schema,
    inputs,
    outputs
  };
}

// ============================================================================
// Drop Handler Hook
// ============================================================================

interface UseJsonDropHandlerProps {
  onNodeSpawn: (node: SpawnedNode) => void;
  onError?: (error: string) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useJsonDropHandler({ onNodeSpawn, onError }: UseJsonDropHandlerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number } | null>(null);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
    setDropPreview({ x: event.clientX, y: event.clientY });
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
    setDropPreview(null);
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent, canvasOffset?: { x: number; y: number }) => {
      event.preventDefault();
      setIsDragging(false);
      setDropPreview(null);

      // Calculate drop position relative to canvas
      const position = canvasOffset
        ? { x: event.clientX - canvasOffset.x, y: event.clientY - canvasOffset.y }
        : { x: event.clientX, y: event.clientY };

      // Try to get JSON data
      let jsonData: any = null;

      // Check for text/plain or application/json
      const textData = event.dataTransfer.getData('text/plain');
      const jsonString = event.dataTransfer.getData('application/json');

      const rawData = jsonString || textData;

      if (rawData) {
        try {
          jsonData = JSON.parse(rawData);
        } catch (_e) {
          onError?.('Invalid JSON format');
          return;
        }
      }

      // Check for files
      if (!jsonData && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          try {
            const text = await file.text();
            jsonData = JSON.parse(text);
          } catch (_e) {
            onError?.('Failed to parse JSON file');
            return;
          }
        }
      }

      if (!jsonData) {
        // Check if it's a base node being dragged from palette
        const reactFlowData = event.dataTransfer.getData('application/reactflow');
        if (reactFlowData) {
          try {
            const parsed = JSON.parse(reactFlowData);
            if (parsed.type === 'baseNode' && parsed.nodeDefinition) {
              // This is a palette node, not a JSON drop
              return;
            }
          } catch (_e) {
            // Not a palette node
          }
        }

        onError?.('No valid JSON data found');
        return;
      }

      // Detect schema and spawn node
      const detection = detectJsonSchema(jsonData);
      const spawnedNode = createNodeFromJson(detection, position);

      // Notify about spawned node
      onNodeSpawn(spawnedNode);

      // Register with Living Word if it's a node definition
      if (detection.schema === 'node-definition') {
        try {
          const nodeDef: NodeDefinition = {
            id: jsonData.id,
            name: jsonData.name || jsonData.id,
            category: jsonData.category || 'custom',
            icon: jsonData.icon || 'code',
            description: jsonData.description || 'Custom node from JSON',
            inputs: jsonData.inputs || [],
            outputs: jsonData.outputs || [],
            execute: jsonData.execute,
            tags: jsonData.tags,
            version: jsonData.version || '1.0.0'
          };
          nodeRegistry.registerNode(nodeDef);
          console.log('[JsonDropHandler] Registered node with Living Word:', nodeDef.id);
        } catch (e) {
          console.warn('[JsonDropHandler] Failed to register with Living Word:', e);
        }
      }
    },
    [onNodeSpawn, onError]
  );

  return {
    isDragging,
    dropPreview,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}

// ============================================================================
// Drop Zone Component
// ============================================================================

interface JsonDropZoneProps {
  children: React.ReactNode;
  onNodeSpawn: (node: SpawnedNode) => void;
  onError?: (error: string) => void;
  getCanvasOffset?: () => { x: number; y: number };
}

export const JsonDropZone: React.FC<JsonDropZoneProps> = ({
  children,
  onNodeSpawn,
  onError,
  getCanvasOffset
}) => {
  const { isDragging, dropPreview, handleDragOver, handleDragLeave, handleDrop } =
    useJsonDropHandler({ onNodeSpawn, onError });

  return (
    <div
      className="relative w-full h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, getCanvasOffset?.())}
    >
      {children}

      {/* Drop Preview Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-4 text-center">
            <div className="text-blue-600 font-medium mb-1">Drop JSON to create node</div>
            <div className="text-sm text-gray-500">
              Supports: FHIR, Reflex Cards, Node Definitions, JSON
            </div>
          </div>
        </div>
      )}

      {/* Drop position indicator */}
      {dropPreview && (
        <div
          className="absolute w-4 h-4 bg-blue-500 rounded-full opacity-50 pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: dropPreview.x, top: dropPreview.y }}
        />
      )}
    </div>
  );
};

export default JsonDropZone;
