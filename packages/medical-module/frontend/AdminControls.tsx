/**
 * Medical Module Admin Controls
 *
 * Configuration panel for medical viewport behavior:
 * - Layer visibility defaults
 * - Animation speeds
 * - Terminology language selection
 * - Data source configuration
 * - Procedure flow management
 *
 * Self-contained - no @/ imports
 */

import { useState, useEffect } from 'react';
import { Settings, Layers, Globe, Activity, Play, Save, RotateCcw } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface LayerConfig {
    id: string;
    name: string;
    defaultVisible: boolean;
    animationSpeed: number; // 0.1 - 3.0
    detailMode: boolean;
}

interface AdminSettings {
    language: 'en' | 'la' | 'fr' | 'es' | 'pt' | 'it';
    defaultLayer: string;
    animationEnabled: boolean;
    globalAnimationSpeed: number;
    vitalsRefreshRate: number; // ms
    autoDetailLoad: boolean;
    attributionVisible: boolean;
    layers: LayerConfig[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_LAYERS: LayerConfig[] = [
    { id: 'L0', name: 'Outline', defaultVisible: true, animationSpeed: 1.0, detailMode: false },
    { id: 'L1', name: 'Skeleton', defaultVisible: false, animationSpeed: 1.0, detailMode: true },
    { id: 'L2', name: 'Muscles', defaultVisible: false, animationSpeed: 1.2, detailMode: true },
    { id: 'L3', name: 'Circulatory', defaultVisible: false, animationSpeed: 1.5, detailMode: true },
    { id: 'L4', name: 'Nervous', defaultVisible: false, animationSpeed: 0.8, detailMode: true },
    { id: 'L5', name: 'Respiratory', defaultVisible: false, animationSpeed: 0.6, detailMode: true },
    { id: 'L6', name: 'Digestive', defaultVisible: false, animationSpeed: 0.9, detailMode: false },
    { id: 'L7', name: 'Immune', defaultVisible: false, animationSpeed: 1.1, detailMode: false },
    { id: 'L8', name: 'Cellular', defaultVisible: false, animationSpeed: 1.0, detailMode: false },
    { id: 'L9', name: 'Molecular', defaultVisible: false, animationSpeed: 1.0, detailMode: false },
    { id: 'L10', name: 'Atomic', defaultVisible: false, animationSpeed: 1.0, detailMode: false },
    { id: 'L11', name: 'Quantum', defaultVisible: false, animationSpeed: 1.0, detailMode: false },
];

const DEFAULT_SETTINGS: AdminSettings = {
    language: 'en',
    defaultLayer: 'L0',
    animationEnabled: true,
    globalAnimationSpeed: 1.0,
    vitalsRefreshRate: 2000,
    autoDetailLoad: false,
    attributionVisible: true,
    layers: DEFAULT_LAYERS
};

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'la', name: 'Latin (Scientific)' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'pt', name: 'Português' },
    { code: 'it', name: 'Italiano' },
];

const STORAGE_KEY = 'medical-admin-settings';

// =============================================================================
// COMPONENT
// =============================================================================

interface AdminControlsProps {
    onSettingsChange?: (settings: AdminSettings) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

export function AdminControls({ onSettingsChange, isOpen = true, onClose }: AdminControlsProps) {
    const [settings, setSettings] = useState<AdminSettings>(() => {
        // Load from localStorage
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load admin settings', e);
        }
        return DEFAULT_SETTINGS;
    });

    const [activeTab, setActiveTab] = useState<'general' | 'layers' | 'data' | 'flows'>('general');
    const [hasChanges, setHasChanges] = useState(false);

    // Notify parent of changes
    useEffect(() => {
        onSettingsChange?.(settings);
    }, [settings, onSettingsChange]);

    const updateSettings = (partial: Partial<AdminSettings>) => {
        setSettings(prev => ({ ...prev, ...partial }));
        setHasChanges(true);
    };

    const updateLayer = (layerId: string, updates: Partial<LayerConfig>) => {
        setSettings(prev => ({
            ...prev,
            layers: prev.layers.map(l =>
                l.id === layerId ? { ...l, ...updates } : l
            )
        }));
        setHasChanges(true);
    };

    const saveSettings = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            setHasChanges(false);
            console.log('Settings saved');
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.removeItem(STORAGE_KEY);
        setHasChanges(false);
    };

    if (!isOpen) return null;

    return (
        <div className="medical-admin-controls bg-black/95 backdrop-blur-lg text-white rounded-lg border border-cyan-500/30 overflow-hidden max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-900/30 to-transparent">
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-cyan-400" />
                    <h2 className="font-semibold text-cyan-100">Admin Controls</h2>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        ×
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-cyan-500/20">
                {[
                    { key: 'general', icon: Settings, label: 'General' },
                    { key: 'layers', icon: Layers, label: 'Layers' },
                    { key: 'data', icon: Activity, label: 'Data' },
                    { key: 'flows', icon: Play, label: 'Flows' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as typeof activeTab)}
                        className={`flex-1 px-3 py-2 text-xs flex items-center justify-center gap-1.5 transition-colors ${
                            activeTab === tab.key
                                ? 'bg-cyan-900/40 text-cyan-300 border-b-2 border-cyan-400'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {/* General Tab */}
                {activeTab === 'general' && (
                    <>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    <Globe className="w-3 h-3 inline mr-1" />
                                    Terminology Language
                                </label>
                                <select
                                    value={settings.language}
                                    onChange={(e) => updateSettings({ language: e.target.value as AdminSettings['language'] })}
                                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm text-white"
                                >
                                    {LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code} className="bg-gray-900">
                                            {lang.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Default Layer</label>
                                <select
                                    value={settings.defaultLayer}
                                    onChange={(e) => updateSettings({ defaultLayer: e.target.value })}
                                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm text-white"
                                >
                                    {settings.layers.map(layer => (
                                        <option key={layer.id} value={layer.id} className="bg-gray-900">
                                            {layer.id} - {layer.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    Global Animation Speed: {settings.globalAnimationSpeed.toFixed(1)}x
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="3"
                                    step="0.1"
                                    value={settings.globalAnimationSpeed}
                                    onChange={(e) => updateSettings({ globalAnimationSpeed: parseFloat(e.target.value) })}
                                    className="w-full accent-cyan-500"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Animations Enabled</span>
                                <button
                                    onClick={() => updateSettings({ animationEnabled: !settings.animationEnabled })}
                                    className={`w-10 h-5 rounded-full transition-colors ${
                                        settings.animationEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                                    }`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                        settings.animationEnabled ? 'translate-x-5' : 'translate-x-0.5'
                                    }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Auto-Load Detail Models</span>
                                <button
                                    onClick={() => updateSettings({ autoDetailLoad: !settings.autoDetailLoad })}
                                    className={`w-10 h-5 rounded-full transition-colors ${
                                        settings.autoDetailLoad ? 'bg-cyan-500' : 'bg-gray-600'
                                    }`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                        settings.autoDetailLoad ? 'translate-x-5' : 'translate-x-0.5'
                                    }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Show Attribution</span>
                                <button
                                    onClick={() => updateSettings({ attributionVisible: !settings.attributionVisible })}
                                    className={`w-10 h-5 rounded-full transition-colors ${
                                        settings.attributionVisible ? 'bg-cyan-500' : 'bg-gray-600'
                                    }`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                        settings.attributionVisible ? 'translate-x-5' : 'translate-x-0.5'
                                    }`} />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Layers Tab */}
                {activeTab === 'layers' && (
                    <div className="space-y-2">
                        {settings.layers.map(layer => (
                            <div
                                key={layer.id}
                                className="bg-white/5 rounded-lg p-3 border border-white/10"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">
                                        {layer.id}: {layer.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {layer.detailMode && (
                                            <span className="text-xs px-1.5 py-0.5 bg-green-600/30 text-green-400 rounded">
                                                3D
                                            </span>
                                        )}
                                        <button
                                            onClick={() => updateLayer(layer.id, { defaultVisible: !layer.defaultVisible })}
                                            className={`text-xs px-2 py-1 rounded ${
                                                layer.defaultVisible
                                                    ? 'bg-cyan-600/50 text-cyan-200'
                                                    : 'bg-gray-700/50 text-gray-400'
                                            }`}
                                        >
                                            {layer.defaultVisible ? 'Visible' : 'Hidden'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 w-16">Speed</span>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="3"
                                        step="0.1"
                                        value={layer.animationSpeed}
                                        onChange={(e) => updateLayer(layer.id, { animationSpeed: parseFloat(e.target.value) })}
                                        className="flex-1 accent-cyan-500"
                                    />
                                    <span className="text-xs text-gray-400 w-8">{layer.animationSpeed.toFixed(1)}x</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Data Tab */}
                {activeTab === 'data' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">
                                Vitals Refresh Rate: {settings.vitalsRefreshRate}ms
                            </label>
                            <input
                                type="range"
                                min="500"
                                max="5000"
                                step="500"
                                value={settings.vitalsRefreshRate}
                                onChange={(e) => updateSettings({ vitalsRefreshRate: parseInt(e.target.value) })}
                                className="w-full accent-cyan-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Fast (500ms)</span>
                                <span>Slow (5s)</span>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-gray-400 mb-2">Data Sources</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span>Vitals</span>
                                    <span className="text-yellow-400">Simulated</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Live Stream</span>
                                    <span className="text-yellow-400">Simulated</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>BLE Connection</span>
                                    <span className="text-gray-500">Not Connected</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">
                                Connect real data sources via WebSocket or BLE in production.
                            </p>
                        </div>
                    </div>
                )}

                {/* Flows Tab */}
                {activeTab === 'flows' && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-400">
                            Procedure flows define sequences of layer views, camera positions,
                            and narration for guided medical explanations.
                        </p>

                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <h4 className="text-sm font-medium mb-2">Available Flows</h4>
                            <div className="space-y-2">
                                {[
                                    { name: 'Blood Flow Overview', layers: 3, status: 'ready' },
                                    { name: 'Medication Pathway', layers: 5, status: 'ready' },
                                    { name: 'Hip Replacement', layers: 4, status: 'draft' },
                                ].map((flow, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-300">{flow.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">{flow.layers} steps</span>
                                            <span className={`px-1.5 py-0.5 rounded ${
                                                flow.status === 'ready'
                                                    ? 'bg-green-600/30 text-green-400'
                                                    : 'bg-yellow-600/30 text-yellow-400'
                                            }`}>
                                                {flow.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button className="w-full py-2 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded text-xs font-medium transition-colors">
                            + Create New Flow
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-cyan-500/20 bg-white/5">
                <button
                    onClick={resetSettings}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
                >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                </button>
                <button
                    onClick={saveSettings}
                    disabled={!hasChanges}
                    className={`flex items-center gap-1 px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                        hasChanges
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    <Save className="w-3 h-3" />
                    Save Settings
                </button>
            </div>
        </div>
    );
}

export default AdminControls;
export type { AdminSettings, LayerConfig };
