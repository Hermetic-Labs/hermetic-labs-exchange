import React, { useState } from 'react';
import {Square, 
  RotateCcw, 
  Save, 
  Share2, 
  Settings, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  Download,
  Upload,
  Grid3X3
} from 'lucide-react';

interface FlowControlsProps {
  onSave?: () => void;
  onShare?: () => void;
  onImport?: (file: File) => void;
  onExport?: () => void;
  onAutoLayout?: () => void;
  onReset?: () => void;
  isPlaying?: boolean;
  canPlay?: boolean;
  className?: string;
}

export const FlowControls: React.FC<FlowControlsProps> = ({
  onSave,
  onShare,
  onImport,
  onExport,
  onAutoLayout,
  onReset,
  isPlaying = false,
  canPlay = true,
  className = ''}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-2 ${className}`}>
      <div className="flex items-center space-x-1">
        {/* Primary Actions */}
        {canPlay && (
          <button
            onClick={isPlaying ? onReset : onSave}
            className={`p-2 rounded transition-colors ${
              isPlaying 
                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
            title={isPlaying ? 'Stop' : 'Save'}
          >
            {isPlaying ? <Square size={16} /> : <Save size={16} />}
          </button>
        )}

        {onShare && (
          <button
            onClick={onShare}
            className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
            title="Share Flow"
          >
            <Share2 size={16} />
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300" />

        {/* Flow Management */}
        {onExport && (
          <button
            onClick={onExport}
            className="p-2 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
            title="Export Flow"
          >
            <Download size={16} />
          </button>
        )}

        {onImport && (
          <button
            onClick={handleImport}
            className="p-2 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
            title="Import Flow"
          >
            <Upload size={16} />
          </button>
        )}

        {onAutoLayout && (
          <button
            onClick={onAutoLayout}
            className="p-2 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors"
            title="Auto Layout"
          >
            <Grid3X3 size={16} />
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300" />

        {/* View Controls */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`p-2 rounded transition-colors ${
            showAdvanced ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
          title="Advanced Controls"
        >
          <Settings size={16} />
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-1">
            <button
              className="p-2 bg-gray-50 text-gray-600 rounded text-xs hover:bg-gray-100 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              className="p-2 bg-gray-50 text-gray-600 rounded text-xs hover:bg-gray-100 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              className="p-2 bg-gray-50 text-gray-600 rounded text-xs hover:bg-gray-100 transition-colors"
              title="Fit View"
            >
              <Maximize size={14} />
            </button>
          </div>
          
          {onReset && (
            <button
              onClick={onReset}
              className="w-full mt-2 flex items-center justify-center space-x-1 px-3 py-2 bg-orange-50 text-orange-600 rounded text-xs font-medium hover:bg-orange-100 transition-colors"
            >
              <RotateCcw size={12} />
              <span>Reset All</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FlowControls;