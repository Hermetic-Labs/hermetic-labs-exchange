/**
 * Controls - UI controls for the globe visualization.
 * 
 * Provides adapter selection, file upload, error display, and info panel.
 */

import { useRef, useState } from 'react';
import { GlobeDataItem } from '../adapters/types';

interface ControlsProps {
  activeAdapter: string;
  onAdapterChange: (adapter: string) => void;
  selectedItem: GlobeDataItem | null;
  onClose: () => void;
  error: string | null;
  onDismissError: () => void;
  onFileUpload: (data: GlobeDataItem[]) => void;
}

const ADAPTERS = [
  { id: 'flights', label: 'Flight Tracker', description: 'Live flight routes between airports' },
  { id: 'traffic', label: 'Traffic Cameras', description: 'City traffic congestion data' },
  { id: 'heatmap', label: 'Population Density', description: 'Metropolitan area populations' },
  { id: 'all', label: 'All Data', description: 'Combined visualization' },
  { id: 'custom', label: 'Custom Data', description: 'Upload JSON/CSV file' },
];

/** Parse CSV to JSON */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

/** Transform raw data to GlobeDataItem format */
function transformUploadedData(raw: Record<string, unknown>[]): GlobeDataItem[] {
  return raw.map((item, index) => {
    const type = (item.type as string) || 'point';
    const base = {
      id: String(item.id || `upload-${index}`),
      label: String(item.label || item.name || ''),
      color: String(item.color || '#00ff88'),
      metadata: item,
    };

    if (type === 'arc') {
      return {
        ...base,
        type: 'arc' as const,
        startLat: Number(item.startLat || item.start_lat || item.from_lat || 0),
        startLng: Number(item.startLng || item.start_lng || item.from_lng || 0),
        endLat: Number(item.endLat || item.end_lat || item.to_lat || 0),
        endLng: Number(item.endLng || item.end_lng || item.to_lng || 0),
        value: Number(item.value || 1),
      };
    } else if (type === 'heatmap') {
      return {
        ...base,
        type: 'heatmap' as const,
        lat: Number(item.lat || item.latitude || 0),
        lng: Number(item.lng || item.longitude || 0),
        value: Number(item.value || item.intensity || 0.5),
        radius: Number(item.radius || 3),
      };
    } else if (type === 'path') {
      let coords: [number, number][] = [];
      if (item.coordinates && Array.isArray(item.coordinates)) {
        coords = item.coordinates as [number, number][];
      } else if (item.path && typeof item.path === 'string') {
        coords = JSON.parse(item.path);
      }
      return {
        ...base,
        type: 'path' as const,
        coordinates: coords,
        value: Number(item.value || 1),
      };
    } else {
      return {
        ...base,
        type: 'point' as const,
        lat: Number(item.lat || item.latitude || 0),
        lng: Number(item.lng || item.longitude || 0),
        value: Number(item.value || 1),
      };
    }
  });
}

export function Controls({ 
  activeAdapter, 
  onAdapterChange, 
  selectedItem, 
  onClose,
  error,
  onDismissError,
  onFileUpload
}: ControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      const text = await file.text();
      let rawData: Record<string, unknown>[];

      if (file.name.endsWith('.csv')) {
        rawData = parseCSV(text) as Record<string, unknown>[];
      } else {
        rawData = JSON.parse(text);
        if (!Array.isArray(rawData)) {
          rawData = [rawData];
        }
      }

      const transformed = transformUploadedData(rawData);
      if (transformed.length === 0) {
        throw new Error('No valid data found in file');
      }
      
      onFileUpload(transformed);
      onAdapterChange('custom');
      setShowUploadPanel(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse file');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      {/* Error Toast */}
      {(error || uploadError) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/95 backdrop-blur-sm rounded-lg p-4 text-white max-w-md shadow-lg border border-red-700">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold">Error</h4>
              <p className="text-sm text-red-200">{error || uploadError}</p>
            </div>
            <button
              onClick={() => {
                onDismissError();
                setUploadError(null);
              }}
              className="text-red-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Adapter Selector */}
      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 text-white min-w-64">
        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
          Data Source
        </h2>
        <div className="space-y-2">
          {ADAPTERS.map((adapter) => (
            <button
              key={adapter.id}
              onClick={() => {
                if (adapter.id === 'custom') {
                  setShowUploadPanel(!showUploadPanel);
                } else {
                  onAdapterChange(adapter.id);
                  setShowUploadPanel(false);
                }
              }}
              className={`w-full text-left px-3 py-2 rounded-md transition-all ${
                activeAdapter === adapter.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="font-medium flex items-center gap-2">
                {adapter.label}
                {adapter.id === 'custom' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
              </div>
              <div className="text-xs text-gray-400">{adapter.description}</div>
            </button>
          ))}
        </div>

        {/* File Upload Panel */}
        {showUploadPanel && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-3">
              Upload JSON or CSV with columns: type, lat, lng, value, color, label
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Choose File
            </button>
            <div className="mt-3 text-xs text-gray-500">
              <p className="font-medium mb-1">Expected format:</p>
              <code className="block bg-gray-900 p-2 rounded text-gray-400 overflow-x-auto">
                {`[{"type":"point","lat":40.7,"lng":-74,"value":1}]`}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      {selectedItem && (
        <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 text-white min-w-72 max-w-80">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-lg">{selectedItem.label || 'Selected Item'}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Type</span>
              <span className="capitalize">{selectedItem.type}</span>
            </div>
            
            {selectedItem.metadata && Object.entries(selectedItem.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-right max-w-40 truncate">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
        <span className="text-gray-400">Drag to rotate</span>
        <span className="mx-2 text-gray-600">|</span>
        <span className="text-gray-400">Scroll to zoom</span>
        <span className="mx-2 text-gray-600">|</span>
        <span className="text-gray-400">Click items for details</span>
      </div>
    </>
  );
}

export default Controls;
