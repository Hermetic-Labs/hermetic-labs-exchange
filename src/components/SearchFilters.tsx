/**
 * Search Filters Sidebar
 * 
 * Advanced filtering options for the product listing
 */

import { useState } from 'react';
import { Filter, Star, ChevronDown, ChevronUp, X } from 'lucide-react';

export type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'rating' | 'popular';

export interface FilterState {
    minPrice: number | null;
    maxPrice: number | null;
    minRating: number;
    freeOnly: boolean;
    sort: SortOption;
}

interface SearchFiltersProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
    productCount: number;
    onClear: () => void;
}

export const defaultFilters: FilterState = {
    minPrice: null,
    maxPrice: null,
    minRating: 0,
    freeOnly: false,
    sort: 'popular',
};

export function SearchFilters({ filters, onChange, productCount, onClear }: SearchFiltersProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [priceExpanded, setPriceExpanded] = useState(true);
    const [ratingExpanded, setRatingExpanded] = useState(true);
    const [sortExpanded, setSortExpanded] = useState(true);

    const hasActiveFilters =
        filters.minPrice !== null ||
        filters.maxPrice !== null ||
        filters.minRating > 0 ||
        filters.freeOnly ||
        filters.sort !== 'popular';

    const handlePriceChange = (key: 'minPrice' | 'maxPrice', value: string) => {
        const num = value === '' ? null : parseInt(value, 10);
        onChange({ ...filters, [key]: num });
    };

    const sortOptions: { value: SortOption; label: string }[] = [
        { value: 'popular', label: 'Most Popular' },
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'price-low', label: 'Price: Low to High' },
        { value: 'price-high', label: 'Price: High to Low' },
        { value: 'rating', label: 'Highest Rated' },
    ];

    return (
        <div className="cyber-panel">
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-white"
            >
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-cyber-green" />
                    <span className="font-medium">Filters</span>
                    {hasActiveFilters && (
                        <span className="px-2 py-0.5 bg-cyber-green/20 text-cyber-green text-xs rounded-full">
                            Active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{productCount} results</span>
                    {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Collapsible Content */}
            {isOpen && (
                <div className="p-4 pt-0 space-y-4 border-t border-white/10">
                    {/* Clear All */}
                    {hasActiveFilters && (
                        <button
                            onClick={onClear}
                            className="flex items-center gap-1 text-xs text-cyber-pink hover:underline"
                        >
                            <X className="w-3 h-3" /> Clear All Filters
                        </button>
                    )}

                    {/* Price Range */}
                    <div>
                        <button
                            onClick={() => setPriceExpanded(!priceExpanded)}
                            className="w-full flex items-center justify-between py-2 text-sm font-medium text-white"
                        >
                            Price Range
                            {priceExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                        {priceExpanded && (
                            <div className="space-y-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={filters.freeOnly}
                                        onChange={(e) => onChange({ ...filters, freeOnly: e.target.checked })}
                                        className="rounded border-white/30 bg-white/10 text-cyber-green focus:ring-cyber-green"
                                    />
                                    <span className="text-sm text-gray-300">Free Only</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Min"
                                        value={filters.minPrice ?? ''}
                                        onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                                        className="cyber-input w-full text-sm px-2 py-1"
                                        disabled={filters.freeOnly}
                                    />
                                    <span className="text-gray-500">–</span>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Max"
                                        value={filters.maxPrice ?? ''}
                                        onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                                        className="cyber-input w-full text-sm px-2 py-1"
                                        disabled={filters.freeOnly}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rating Filter */}
                    <div>
                        <button
                            onClick={() => setRatingExpanded(!ratingExpanded)}
                            className="w-full flex items-center justify-between py-2 text-sm font-medium text-white"
                        >
                            Minimum Rating
                            {ratingExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                        {ratingExpanded && (
                            <div className="space-y-2">
                                {[4, 3, 2, 1, 0].map((rating) => (
                                    <label
                                        key={rating}
                                        className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${filters.minRating === rating ? 'bg-cyber-green/10' : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="minRating"
                                            checked={filters.minRating === rating}
                                            onChange={() => onChange({ ...filters, minRating: rating })}
                                            className="sr-only"
                                        />
                                        <div className="flex items-center gap-1">
                                            {rating > 0 ? (
                                                <>
                                                    {[...Array(rating)].map((_, i) => (
                                                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                    ))}
                                                    <span className="text-sm text-gray-400 ml-1">& up</span>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-400">Any rating</span>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sort */}
                    <div>
                        <button
                            onClick={() => setSortExpanded(!sortExpanded)}
                            className="w-full flex items-center justify-between py-2 text-sm font-medium text-white"
                        >
                            Sort By
                            {sortExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                        {sortExpanded && (
                            <div className="space-y-1">
                                {sortOptions.map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={`flex items-center gap-2 cursor-pointer p-2 rounded text-sm transition-colors ${filters.sort === opt.value
                                                ? 'bg-cyber-green/10 text-cyber-green'
                                                : 'text-gray-300 hover:bg-white/5'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="sort"
                                            checked={filters.sort === opt.value}
                                            onChange={() => onChange({ ...filters, sort: opt.value })}
                                            className="sr-only"
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
