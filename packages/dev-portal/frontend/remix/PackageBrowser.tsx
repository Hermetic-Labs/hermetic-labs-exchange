/**
 * PackageBrowser - Browse installed marketplace packages for remixing
 * Part of Phase 1.2 of the Remix IDE implementation
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';

export interface InstalledPackage {
    id: string;
    name: string;
    displayName: string;
    version: string;
    description: string;
    icon: string;
    category: string;
    author: string;
    components: string[];
    installedAt: Date;
    path: string;
}

interface PackageBrowserProps {
    onPackageSelect: (pkg: InstalledPackage) => void;
    selectedPackageId: string | null;
    isVisible: boolean;
}

// Mock data for installed packages - will be replaced with actual marketplace service
const mockInstalledPackages: InstalledPackage[] = [
    {
        id: 'medical-module',
        name: 'medical-module',
        displayName: 'Medical Professional Suite',
        version: '2.2.0',
        description: 'HIPAA-compliant healthcare workflows with FHIR integration',
        icon: '🏥',
        category: 'Medical',
        author: 'Hermetic Labs',
        components: [
            'MedicalModulePage',
            'MedicalDashboard',
            'AdminPortal',
            'AdminControls',
            'MedicalViewport',
            'MedicalViewportLite',
            'EveBedsideAssistant',
            'BedsideKiosk',
            'NurseStationDashboard',
            'FHIRImportExport',
            'HealthKitVitalsChart',
            'PatientIntakeForms'
        ],
        installedAt: new Date('2024-12-15'),
        path: 'market_source/packages/medical-module'
    },
    {
        id: 'vrm-companion',
        name: 'vrm-companion',
        displayName: 'VRM Companion',
        version: '1.0.0',
        description: '3D avatar system with VRM and FBX support',
        icon: '🎭',
        category: 'Visual',
        author: 'Hermetic Labs',
        components: [
            'VRMCompanion',
            'LipSyncService',
            'AnimationService',
            'ModelLoader'
        ],
        installedAt: new Date('2024-12-10'),
        path: 'market_source/packages/vrm-companion'
    },
    {
        id: 'stock-visualizer',
        name: 'stock-visualizer',
        displayName: 'Stock Visualizer',
        version: '1.0.0',
        description: '3D candlestick charts with strategy DSL',
        icon: '📈',
        category: 'Finance',
        author: 'Hermetic Labs',
        components: [
            'StockChart3D',
            'StrategyEditor',
            'TimelineControls',
            'IndicatorOverlay'
        ],
        installedAt: new Date('2024-12-08'),
        path: 'market_source/packages/stock-visualizer'
    },
    {
        id: 'form-builder',
        name: 'form-builder',
        displayName: 'Form Builder',
        version: '1.0.0',
        description: 'Drag-and-drop form creation tool',
        icon: '📝',
        category: 'Utilities',
        author: 'Hermetic Labs',
        components: [
            'BuilderPage',
            'FieldPalette',
            'FieldEditor',
            'FormCanvas',
            'FormRenderer'
        ],
        installedAt: new Date('2024-12-05'),
        path: 'market_source/packages/form-builder'
    },
    {
        id: 'beat-bubble-vr',
        name: 'beat-bubble-vr',
        displayName: 'Beat Bubble VR',
        version: '1.0.0',
        description: '3D beat sequencer with VR support',
        icon: '🎵',
        category: 'Entertainment',
        author: 'Hermetic Labs',
        components: [
            'BeatBubbleVR',
            'BeatGrid',
            'AudioEngine'
        ],
        installedAt: new Date('2024-12-01'),
        path: 'market_source/packages/beat-bubble-vr'
    },
    {
        id: 'globe-viz',
        name: 'globe-viz',
        displayName: 'Globe Viz',
        version: '1.0.0',
        description: '3D globe with pluggable data adapters',
        icon: '🌍',
        category: 'Analytics',
        author: 'Hermetic Labs',
        components: [
            'GlobeView',
            'DataLayer',
            'FlightAdapter',
            'HeatmapAdapter',
            'Controls'
        ],
        installedAt: new Date('2024-11-28'),
        path: 'market_source/packages/globe-viz'
    }
];

const PackageBrowser: React.FC<PackageBrowserProps> = ({
    onPackageSelect,
    selectedPackageId,
    isVisible
}) => {
    const [packages, setPackages] = useState<InstalledPackage[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load installed packages
    useEffect(() => {
        const loadPackages = async () => {
            setIsLoading(true);
            try {
                // TODO: Replace with actual marketplace service call
                // const installed = await marketplaceService.getInstalledPackages();
                setPackages(mockInstalledPackages);
            } catch (error) {
                console.error('[PackageBrowser] Failed to load packages:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isVisible) {
            loadPackages();
        }
    }, [isVisible]);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(packages.map(p => p.category));
        return Array.from(cats).sort();
    }, [packages]);

    // Filter packages
    const filteredPackages = useMemo(() => {
        return packages.filter(pkg => {
            const matchesSearch = !searchQuery ||
                pkg.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pkg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pkg.components.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = !selectedCategory || pkg.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [packages, searchQuery, selectedCategory]);

    const handlePackageClick = useCallback((pkg: InstalledPackage) => {
        onPackageSelect(pkg);
    }, [onPackageSelect]);

    if (!isVisible) return null;

    return (
        <div className="h-full flex flex-col bg-slate-800/95">
            {/* Header */}
            <div className="p-4 border-b border-slate-600">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>📦</span>
                    Installed Packages
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                    Select a package to browse its elements
                </p>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-slate-600">
                <input
                    type="text"
                    placeholder="Search packages or components..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
            </div>

            {/* Category Filter */}
            <div className="p-3 border-b border-slate-600">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            !selectedCategory
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                selectedCategory === cat
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Package List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-slate-400">Loading packages...</div>
                    </div>
                ) : filteredPackages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <span className="text-4xl mb-2">📭</span>
                        <div className="text-slate-400">No packages found</div>
                        <div className="text-xs text-slate-500 mt-1">
                            Try adjusting your search or filters
                        </div>
                    </div>
                ) : (
                    filteredPackages.map(pkg => (
                        <button
                            key={pkg.id}
                            onClick={() => handlePackageClick(pkg)}
                            className={`w-full text-left p-3 rounded-lg transition-all ${
                                selectedPackageId === pkg.id
                                    ? 'bg-emerald-600/30 border border-emerald-500/50 ring-2 ring-emerald-500/30'
                                    : 'bg-slate-700/50 border border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{pkg.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white truncate">
                                            {pkg.displayName}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            v{pkg.version}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                                        {pkg.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-slate-500">
                                            {pkg.components.length} components
                                        </span>
                                        <span className="text-xs px-1.5 py-0.5 bg-slate-600 text-slate-300 rounded">
                                            {pkg.category}
                                        </span>
                                    </div>
                                </div>
                                {selectedPackageId === pkg.id && (
                                    <span className="text-emerald-400 text-lg">✓</span>
                                )}
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* Footer Stats */}
            <div className="p-3 border-t border-slate-600 bg-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{packages.length} packages installed</span>
                    <span>
                        {packages.reduce((acc, p) => acc + p.components.length, 0)} total components
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PackageBrowser;
export { PackageBrowser };
