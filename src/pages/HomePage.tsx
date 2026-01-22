import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { HeroCarousel } from '../components/HeroCarousel';
import { SearchFilters, FilterState, defaultFilters } from '../components/SearchFilters';
import { fetchProducts, fetchCategories } from '../api/exchange';
import { Product, Category } from '../types';
import { ChevronRight, Sparkles, Zap, Clock, Loader2 } from 'lucide-react';

export function HomePage() {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const searchQuery = searchParams.get('search');

  const [activeCategory, setActiveCategory] = useState<string | null>(categoryFilter);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  // Fetch data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(),
          fetchCategories()
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (err) {
        setError('Failed to load products. Please try again.');
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync activeCategory with URL
  useEffect(() => {
    setActiveCategory(categoryFilter);
  }, [categoryFilter]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Category filter
    if (activeCategory) {
      filtered = filtered.filter((p) => p.category === activeCategory);
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.author.name.toLowerCase().includes(q)
      );
    }

    // Price filters
    if (filters.freeOnly) {
      filtered = filtered.filter((p) => p.price === 0);
    } else {
      if (filters.minPrice !== null) {
        filtered = filtered.filter((p) => p.price >= filters.minPrice!);
      }
      if (filters.maxPrice !== null) {
        filtered = filtered.filter((p) => p.price <= filters.maxPrice!);
      }
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter((p) => p.rating >= filters.minRating);
    }

    // Sorting
    switch (filters.sort) {
      case 'newest':
        filtered = [...filtered].sort((a, b) =>
          new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
        );
        break;
      case 'oldest':
        filtered = [...filtered].sort((a, b) =>
          new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
        );
        break;
      case 'price-low':
        filtered = [...filtered].sort((a, b) =>
          (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price)
        );
        break;
      case 'price-high':
        filtered = [...filtered].sort((a, b) =>
          (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price)
        );
        break;
      case 'rating':
        filtered = [...filtered].sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
      default:
        filtered = [...filtered].sort((a, b) => b.reviewCount - a.reviewCount);
        break;
    }

    return filtered;
  }, [products, activeCategory, searchQuery, filters]);

  const featuredProducts = useMemo(() => products.filter((p) => p.featured), [products]);
  const newProducts = useMemo(() => products.filter((p) => p.isNew), [products]);
  const popularProducts = useMemo(
    () => [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 4),
    [products]
  );

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyber-green animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Exchange...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-cyber-pink mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="cyber-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Carousel */}
      {!activeCategory && !searchQuery && (
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <HeroCarousel />
          </div>
        </section>
      )}

      {/* Categories Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Categories
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                className={`cyber-card p-4 text-center transition-all ${activeCategory === cat.name
                  ? 'border-cyber-green shadow-neon-green'
                  : 'hover:border-cyber-cyan/50'
                  }`}
              >
                <span className="block text-sm font-medium text-white mb-1">{cat.name}</span>
                <span className="text-xs text-gray-500">{cat.productCount}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Carousel */}
      {!activeCategory && !searchQuery && featuredProducts.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title flex items-center gap-2">
                <Zap className="w-4 h-4" /> Featured
              </h2>
              <Link
                to="/?featured=true"
                className="text-cyber-cyan text-sm flex items-center gap-1 hover:underline"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.slice(0, 6).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Releases */}
      {!activeCategory && !searchQuery && newProducts.length > 0 && (
        <section className="py-12 px-4 bg-gradient-to-b from-transparent via-cyber-green/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title flex items-center gap-2">
                <Clock className="w-4 h-4" /> New Releases
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular / Filtered Results */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">
              {activeCategory || searchQuery
                ? `Results ${searchQuery ? `for "${searchQuery}"` : `in ${activeCategory}`}`
                : 'Popular Modules'}
            </h2>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="text-cyber-pink text-sm hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Filters + Results Grid */}
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <SearchFilters
                filters={filters}
                onChange={setFilters}
                productCount={activeCategory || searchQuery ? filteredProducts.length : popularProducts.length}
                onClear={() => setFilters(defaultFilters)}
              />
            </div>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeCategory || searchQuery ? filteredProducts : popularProducts).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {filteredProducts.length === 0 && (activeCategory || searchQuery) && (
                <div className="text-center py-12 text-gray-500">No products found</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
