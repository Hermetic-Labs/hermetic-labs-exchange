/**
 * ElementTree - Displays capturable elements from a selected package
 * Shows [+] buttons for adding elements to the remix basket
 * Part of Phase 1.4 of the Remix IDE implementation
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGraph, RemixElement } from '@/components/devportal/context/GraphContext';
import {
    elementRegistry,
    CodeElement,
    ElementType,
    ElementCategory
} from '@/services/ElementRegistryService';

interface ElementTreeProps {
    packageId: string | null;
    packageName: string;
    isVisible: boolean;
}

interface GroupedElements {
    category: ElementCategory;
    elements: CodeElement[];
    isExpanded: boolean;
}

const ElementTree: React.FC<ElementTreeProps> = ({
    packageId,
    packageName,
    isVisible
}) => {
    const { addToRemixBasket, remixBasket, appMode } = useGraph();

    const [elements, setElements] = useState<CodeElement[]>([]);
    const [groupedElements, setGroupedElements] = useState<GroupedElements[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<ElementType>>(new Set(['component']));

    // Load elements when package changes
    useEffect(() => {
        const loadElements = async () => {
            if (!packageId || !isVisible) {
                setElements([]);
                setGroupedElements([]);
                return;
            }

            setIsLoading(true);
            try {
                const pkgElements = await elementRegistry.getByPackage(packageId);
                setElements(pkgElements);

                // Group by type
                const categories = elementRegistry.getCategories();
                const grouped: GroupedElements[] = [];

                for (const category of categories) {
                    const categoryElements = pkgElements.filter(el => el.type === category.type);
                    if (categoryElements.length > 0) {
                        grouped.push({
                            category,
                            elements: categoryElements,
                            isExpanded: expandedGroups.has(category.type)
                        });
                    }
                }

                setGroupedElements(grouped);
            } catch (error) {
                console.error('[ElementTree] Failed to load elements:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadElements();
    }, [packageId, isVisible, expandedGroups]);

    // Filter elements by search query
    const filteredGroups = useMemo(() => {
        if (!searchQuery) return groupedElements;

        const lowerQuery = searchQuery.toLowerCase();
        return groupedElements.map(group => ({
            ...group,
            elements: group.elements.filter(el =>
                el.name.toLowerCase().includes(lowerQuery) ||
                el.description.toLowerCase().includes(lowerQuery)
            )
        })).filter(group => group.elements.length > 0);
    }, [groupedElements, searchQuery]);

    // Toggle group expansion
    const toggleGroup = useCallback((type: ElementType) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    }, []);

    // Handle adding element to basket
    const handleAddElement = useCallback((element: CodeElement) => {
        const remixElement: RemixElement = {
            id: element.id,
            name: element.name,
            type: element.type,
            sourcePackage: element.sourcePackage,
            sourcePath: element.sourcePath,
            dependencies: element.dependencies.map(d => d.id).filter(Boolean) as string[],
            code: element.code,
            addedAt: new Date()
        };

        addToRemixBasket(remixElement);
    }, [addToRemixBasket]);

    // Check if element is in basket
    const isInBasket = useCallback((elementId: string) => {
        return remixBasket.has(elementId);
    }, [remixBasket]);

    if (!isVisible || !packageId) {
        return (
            <div className="h-full flex flex-col bg-slate-800/95">
                <div className="p-4 border-b border-slate-600">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>🌳</span>
                        Element Tree
                    </h2>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center text-slate-400">
                        <span className="text-4xl mb-2 block">👈</span>
                        <p>Select a package to browse its elements</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-800/95">
            {/* Header */}
            <div className="p-4 border-b border-slate-600">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>🌳</span>
                    Elements
                </h2>
                <p className="text-xs text-slate-400 mt-1 truncate" title={packageName}>
                    {packageName}
                </p>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-slate-600">
                <input
                    type="text"
                    placeholder="Search elements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
            </div>

            {/* Element Tree */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-slate-400">Loading elements...</div>
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                        <span className="text-4xl mb-2">🔍</span>
                        <div className="text-slate-400">No elements found</div>
                        <div className="text-xs text-slate-500 mt-1">
                            Try a different search term
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700">
                        {filteredGroups.map(group => (
                            <div key={group.category.type}>
                                {/* Group Header */}
                                <button
                                    onClick={() => toggleGroup(group.category.type)}
                                    className="w-full px-4 py-3 flex items-center justify-between bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{group.category.icon}</span>
                                        <span className="font-medium text-white">
                                            {group.category.name}
                                        </span>
                                        <span className="text-xs text-slate-400 bg-slate-600 px-1.5 py-0.5 rounded">
                                            {group.elements.length}
                                        </span>
                                    </div>
                                    <span className="text-slate-400 text-sm">
                                        {expandedGroups.has(group.category.type) ? '▼' : '▶'}
                                    </span>
                                </button>

                                {/* Group Elements */}
                                {expandedGroups.has(group.category.type) && (
                                    <div className="bg-slate-800/50">
                                        {group.elements.map(element => (
                                            <div
                                                key={element.id}
                                                className={`px-4 py-2 flex items-center justify-between hover:bg-slate-700/30 transition-colors border-l-2 ${
                                                    isInBasket(element.id)
                                                        ? 'border-emerald-500 bg-emerald-500/10'
                                                        : 'border-transparent'
                                                }`}
                                            >
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm text-white truncate">
                                                            {element.name}
                                                        </span>
                                                        {element.exportType === 'default' && (
                                                            <span className="text-xs text-amber-400">default</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 truncate mt-0.5">
                                                        {element.description}
                                                    </p>
                                                </div>

                                                {/* Add Button - only show in remix mode */}
                                                {appMode === 'remix' && (
                                                    <button
                                                        onClick={() => handleAddElement(element)}
                                                        disabled={isInBasket(element.id)}
                                                        className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-lg font-bold transition-all ${
                                                            isInBasket(element.id)
                                                                ? 'bg-emerald-600 text-white cursor-default'
                                                                : 'bg-slate-600 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                                                        }`}
                                                        title={isInBasket(element.id) ? 'In basket' : 'Add to remix basket'}
                                                    >
                                                        {isInBasket(element.id) ? '✓' : '+'}
                                                    </button>
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

            {/* Footer Stats */}
            <div className="p-3 border-t border-slate-600 bg-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{elements.length} elements</span>
                    <span>
                        {remixBasket.size} in basket
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ElementTree;
export { ElementTree };
