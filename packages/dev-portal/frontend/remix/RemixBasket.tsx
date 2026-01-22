/**
 * RemixBasket - Floating panel showing collected elements for remixing
 * Shows elements from the basket with dependency resolution
 * Part of Phase 1.5 of the Remix IDE implementation
 * Phase 3: Now integrates with PackageGeneratorService for actual package generation
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useGraph, RemixElement } from '@/components/devportal/context/GraphContext';
import { elementRegistry, CodeElement } from '@/services/ElementRegistryService';
import { packageGenerator, GeneratedPackage, GeneratedFile } from '../services/PackageGeneratorService';

interface ResolvedDependency {
    id: string;
    name: string;
    sourcePackage: string;
    isExternal: boolean;
    isInBasket: boolean;
}

interface BasketItemWithDeps {
    element: RemixElement;
    resolvedDeps: ResolvedDependency[];
}

interface RemixBasketProps {
    isVisible: boolean;
    onClose?: () => void;
    onGeneratePackage?: (elements: RemixElement[]) => void;
}

type GenerationState = 'idle' | 'generating' | 'preview' | 'error';

interface GenerationResult {
    package: GeneratedPackage | null;
    error: string | null;
}

const RemixBasket: React.FC<RemixBasketProps> = ({
    isVisible,
    onClose,
    onGeneratePackage
}) => {
    const {
        remixBasket,
        removeFromRemixBasket,
        clearRemixBasket,
        appMode
    } = useGraph();

    const [itemsWithDeps, setItemsWithDeps] = useState<BasketItemWithDeps[]>([]);
    const [isResolving, setIsResolving] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [packageName, setPackageName] = useState('my-remix-package');

    // Phase 3: Generation state
    const [generationState, setGenerationState] = useState<GenerationState>('idle');
    const [generationResult, setGenerationResult] = useState<GenerationResult>({ package: null, error: null });
    const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);

    // Convert Map to array for easier rendering
    const basketItems = useMemo(() => {
        return Array.from(remixBasket.values());
    }, [remixBasket]);

    // Resolve dependencies for all items
    useEffect(() => {
        const resolveDependencies = async () => {
            if (basketItems.length === 0) {
                setItemsWithDeps([]);
                return;
            }

            setIsResolving(true);
            try {
                const resolved: BasketItemWithDeps[] = [];

                for (const item of basketItems) {
                    const deps: ResolvedDependency[] = [];

                    // Try to resolve each dependency
                    for (const depId of item.dependencies) {
                        const depElement = await elementRegistry.getElement(depId);
                        if (depElement) {
                            deps.push({
                                id: depElement.id,
                                name: depElement.name,
                                sourcePackage: depElement.sourcePackage,
                                isExternal: false,
                                isInBasket: remixBasket.has(depElement.id)
                            });
                        } else {
                            // External dependency (not in registry)
                            deps.push({
                                id: depId,
                                name: depId.split(':').pop() || depId,
                                sourcePackage: 'external',
                                isExternal: true,
                                isInBasket: false
                            });
                        }
                    }

                    resolved.push({
                        element: item,
                        resolvedDeps: deps
                    });
                }

                setItemsWithDeps(resolved);
            } catch (error) {
                console.error('[RemixBasket] Failed to resolve dependencies:', error);
            } finally {
                setIsResolving(false);
            }
        };

        resolveDependencies();
    }, [basketItems, remixBasket]);

    // Get unique source packages
    const sourcePackages = useMemo(() => {
        const packages = new Set<string>();
        for (const item of basketItems) {
            packages.add(item.sourcePackage);
        }
        return Array.from(packages);
    }, [basketItems]);

    // Get missing dependencies (not in basket)
    const missingDeps = useMemo(() => {
        const missing: ResolvedDependency[] = [];
        for (const item of itemsWithDeps) {
            for (const dep of item.resolvedDeps) {
                if (!dep.isInBasket && !dep.isExternal) {
                    if (!missing.find(m => m.id === dep.id)) {
                        missing.push(dep);
                    }
                }
            }
        }
        return missing;
    }, [itemsWithDeps]);

    // Toggle item expansion
    const toggleItem = useCallback((id: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // Handle generate package - Phase 3 integration
    const handleGenerate = useCallback(async () => {
        if (onGeneratePackage) {
            onGeneratePackage(basketItems);
            return;
        }

        // Phase 3: Use PackageGeneratorService for actual generation
        setGenerationState('generating');
        setGenerationResult({ package: null, error: null });

        try {
            console.log('[RemixBasket] Generating package:', {
                name: packageName,
                elements: basketItems.length,
                sourcePackages
            });

            const generatedPkg = await packageGenerator.generatePackage(basketItems, {
                packageName,
                description: `Package generated from ${sourcePackages.join(', ')}`,
                category: 'Generated',
                generateReadme: true,
                includeTypes: true,
            });

            console.log('[RemixBasket] Package generated:', generatedPkg.name, generatedPkg.files.length, 'files');

            setGenerationResult({ package: generatedPkg, error: null });
            setGenerationState('preview');

            // Select the first file for preview
            if (generatedPkg.files.length > 0) {
                setSelectedFile(generatedPkg.files.find(f => f.path === 'manifest.json') || generatedPkg.files[0]);
            }
        } catch (error) {
            console.error('[RemixBasket] Generation failed:', error);
            setGenerationResult({ package: null, error: String(error) });
            setGenerationState('error');
        }
    }, [basketItems, onGeneratePackage, packageName, sourcePackages]);

    // Handle download as zip
    const handleDownload = useCallback(async () => {
        if (!generationResult.package) return;

        try {
            const blob = await packageGenerator.downloadAsZip(generationResult.package);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${generationResult.package.name}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[RemixBasket] Download failed:', error);
        }
    }, [generationResult.package]);

    // Handle back to basket
    const handleBackToBasket = useCallback(() => {
        setGenerationState('idle');
        setGenerationResult({ package: null, error: null });
        setSelectedFile(null);
    }, []);

    // Get element type icon
    const getTypeIcon = (type: string): string => {
        switch (type) {
            case 'component': return '🧩';
            case 'function': return '⚡';
            case 'hook': return '🪝';
            case 'type': return '📐';
            case 'service': return '⚙️';
            case 'constant': return '📌';
            default: return '📄';
        }
    };

    if (!isVisible || appMode !== 'remix') return null;

    // Render Preview Mode when package is generated
    if (generationState === 'preview' && generationResult.package) {
        const pkg = generationResult.package;
        return (
            <div className="fixed bottom-4 right-4 w-[500px] max-h-[80vh] bg-slate-800 border border-emerald-500/50 rounded-xl shadow-2xl shadow-emerald-500/20 flex flex-col overflow-hidden z-50">
                {/* Preview Header */}
                <div className="p-4 border-b border-slate-600 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📦</span>
                            <div>
                                <h3 className="text-lg font-semibold text-white">{pkg.displayName}</h3>
                                <p className="text-xs text-blue-300">
                                    {pkg.files.length} files generated • v{pkg.version}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleBackToBasket}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Back to basket"
                        >
                            ←
                        </button>
                    </div>
                </div>

                {/* Warnings */}
                {pkg.warnings.length > 0 && (
                    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30">
                        {pkg.warnings.map((warning, i) => (
                            <div key={i} className="flex items-center gap-2 text-amber-400 text-xs">
                                <span>⚠️</span>
                                <span>{warning}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* File List & Preview */}
                <div className="flex-1 flex overflow-hidden">
                    {/* File Tree */}
                    <div className="w-40 border-r border-slate-700 overflow-y-auto">
                        {pkg.files.map(file => (
                            <button
                                key={file.path}
                                onClick={() => setSelectedFile(file)}
                                className={`w-full px-3 py-2 text-left text-xs truncate transition-colors ${
                                    selectedFile?.path === file.path
                                        ? 'bg-blue-500/20 text-blue-300'
                                        : 'text-slate-400 hover:bg-slate-700/50'
                                }`}
                                title={file.path}
                            >
                                {file.path.split('/').pop()}
                            </button>
                        ))}
                    </div>

                    {/* File Content Preview */}
                    <div className="flex-1 overflow-auto">
                        {selectedFile && (
                            <pre className="p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap">
                                <div className="text-slate-500 text-[10px] mb-2 border-b border-slate-700 pb-2">
                                    {selectedFile.path}
                                </div>
                                {selectedFile.content}
                            </pre>
                        )}
                    </div>
                </div>

                {/* Preview Footer Actions */}
                <div className="p-4 border-t border-slate-600 bg-slate-800/90">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBackToBasket}
                            className="flex-1 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Download ZIP
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render Generating State
    if (generationState === 'generating') {
        return (
            <div className="fixed bottom-4 right-4 w-96 bg-slate-800 border border-emerald-500/50 rounded-xl shadow-2xl shadow-emerald-500/20 p-8 z-50">
                <div className="flex flex-col items-center text-center">
                    <div className="text-4xl mb-4 animate-pulse">⚙️</div>
                    <div className="text-white font-medium mb-2">Generating Package...</div>
                    <div className="text-xs text-slate-400">
                        Resolving dependencies and creating files
                    </div>
                </div>
            </div>
        );
    }

    // Render Error State
    if (generationState === 'error') {
        return (
            <div className="fixed bottom-4 right-4 w-96 bg-slate-800 border border-red-500/50 rounded-xl shadow-2xl shadow-red-500/20 p-6 z-50">
                <div className="flex flex-col items-center text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <div className="text-white font-medium mb-2">Generation Failed</div>
                    <div className="text-xs text-red-400 mb-4">
                        {generationResult.error}
                    </div>
                    <button
                        onClick={handleBackToBasket}
                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Render Normal Basket View
    return (
        <div className="fixed bottom-4 right-4 w-96 max-h-[70vh] bg-slate-800 border border-emerald-500/50 rounded-xl shadow-2xl shadow-emerald-500/20 flex flex-col overflow-hidden z-50">
            {/* Header */}
            <div className="p-4 border-b border-slate-600 bg-gradient-to-r from-emerald-600/20 to-teal-600/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🧺</span>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Remix Basket</h3>
                            <p className="text-xs text-emerald-300">
                                {basketItems.length} element{basketItems.length !== 1 ? 's' : ''} from {sourcePackages.length} package{sourcePackages.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Basket Contents */}
            <div className="flex-1 overflow-y-auto">
                {basketItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <span className="text-4xl mb-3">🧺</span>
                        <div className="text-slate-400">Your basket is empty</div>
                        <div className="text-xs text-slate-500 mt-1">
                            Click [+] on elements in the tree to add them
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700">
                        {itemsWithDeps.map(({ element, resolvedDeps }) => (
                            <div key={element.id} className="p-3">
                                {/* Element Header */}
                                <div className="flex items-start justify-between">
                                    <button
                                        onClick={() => toggleItem(element.id)}
                                        className="flex items-start gap-2 text-left flex-1 min-w-0"
                                    >
                                        <span className="text-lg">{getTypeIcon(element.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-mono text-sm text-white truncate">
                                                {element.name}
                                            </div>
                                            <div className="text-xs text-slate-400 truncate">
                                                from {element.sourcePackage}
                                            </div>
                                        </div>
                                        {resolvedDeps.length > 0 && (
                                            <span className="text-xs text-slate-400">
                                                {expandedItems.has(element.id) ? '▼' : '▶'}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => removeFromRemixBasket(element.id)}
                                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                        title="Remove from basket"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Dependencies (expanded) */}
                                {expandedItems.has(element.id) && resolvedDeps.length > 0 && (
                                    <div className="mt-2 ml-7 space-y-1">
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">
                                            Dependencies ({resolvedDeps.length})
                                        </div>
                                        {resolvedDeps.map(dep => (
                                            <div
                                                key={dep.id}
                                                className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                                                    dep.isInBasket
                                                        ? 'bg-emerald-500/20 text-emerald-300'
                                                        : dep.isExternal
                                                        ? 'bg-slate-600/50 text-slate-400'
                                                        : 'bg-amber-500/20 text-amber-300'
                                                }`}
                                            >
                                                <span>
                                                    {dep.isInBasket ? '✓' : dep.isExternal ? '📦' : '⚠️'}
                                                </span>
                                                <span className="truncate">{dep.name}</span>
                                                {!dep.isInBasket && !dep.isExternal && (
                                                    <span className="text-[10px]">(missing)</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Missing Dependencies Warning */}
            {missingDeps.length > 0 && (
                <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/30">
                    <div className="flex items-center gap-2 text-amber-400 text-xs">
                        <span>⚠️</span>
                        <span>{missingDeps.length} missing dependencies - will be auto-included</span>
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            {basketItems.length > 0 && (
                <div className="p-4 border-t border-slate-600 bg-slate-800/90 space-y-3">
                    {/* Package Name Input */}
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Package Name</label>
                        <input
                            type="text"
                            value={packageName}
                            onChange={(e) => setPackageName(e.target.value)}
                            placeholder="my-remix-package"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearRemixBasket}
                            className="flex-1 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={isResolving || generationState === 'generating'}
                            className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResolving ? 'Resolving...' : 'Generate Package'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RemixBasket;
export { RemixBasket };
