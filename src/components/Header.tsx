import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShoppingCart, User, ChevronDown, Menu, X, LogOut, Library, Wrench, Store, Filter, Star, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type SortOption = 'popular' | 'newest' | 'price-low' | 'price-high' | 'rating';

export function Header() {
  const [showFilters, setShowFilters] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const currentSort = (searchParams.get('sort') as SortOption) || 'popular';
  const freeOnly = searchParams.get('free') === 'true';
  const minRating = parseInt(searchParams.get('rating') || '0', 10);

  const handleSortChange = (sort: SortOption) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    setSearchParams(params);
  };

  const handleFreeToggle = () => {
    const params = new URLSearchParams(searchParams);
    if (freeOnly) {
      params.delete('free');
    } else {
      params.set('free', 'true');
    }
    setSearchParams(params);
  };

  const handleRatingChange = (rating: number) => {
    const params = new URLSearchParams(searchParams);
    if (rating === 0) {
      params.delete('rating');
    } else {
      params.set('rating', rating.toString());
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('sort');
    params.delete('free');
    params.delete('rating');
    setSearchParams(params);
    setShowFilters(false);
  };

  const hasActiveFilters = currentSort !== 'popular' || freeOnly || minRating > 0;

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-cyber-green/20">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}images/Hermetci Labs Exchange Logo.png`}
              alt="Hermetic Labs"
              className="w-10 h-10 object-contain"
            />
            <span className="text-cyber-green text-glow-green font-semibold text-lg hidden sm:block">
              HERMETIC LABS
            </span>
          </Link>

          {/* Search Bar - Icon only, no placeholder text */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cyber-input w-full pl-10 pr-4"
                aria-label="Search"
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 text-sm text-gray-300 hover:text-cyber-green transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filter
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-cyber-green rounded-full"></span>
                )}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showFilters && (
                <div className="absolute top-full mt-2 left-0 cyber-panel p-4 min-w-[280px]">
                  {/* Sort By */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sort By</div>
                    <div className="space-y-1">
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleSortChange(opt.value)}
                          className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                            currentSort === opt.value
                              ? 'bg-cyber-green/20 text-cyber-green'
                              : 'text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div className="mb-4 border-t border-white/10 pt-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Price</div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={freeOnly}
                        onChange={handleFreeToggle}
                        className="rounded border-white/30 bg-white/10 text-cyber-green focus:ring-cyber-green"
                      />
                      <span className="text-sm text-gray-300">Free Only</span>
                    </label>
                  </div>

                  {/* Rating Filter */}
                  <div className="mb-4 border-t border-white/10 pt-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Min Rating</div>
                    <div className="space-y-1">
                      {[4, 3, 2, 1, 0].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => handleRatingChange(rating)}
                          className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center gap-2 ${
                            minRating === rating
                              ? 'bg-cyber-green/20'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          {rating > 0 ? (
                            <>
                              {[...Array(rating)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              ))}
                              <span className="text-gray-400 text-xs">& up</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Any rating</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full text-center text-sm text-cyber-pink hover:underline"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            <Link to="/" className="text-sm text-gray-300 hover:text-cyber-green transition-colors">
              Browse
            </Link>
            <Link to="/devtools" className="text-sm text-gray-300 hover:text-cyber-cyan transition-colors flex items-center gap-1">
              <Wrench className="w-4 h-4" />
              DevTools
            </Link>

            {/* Cart */}
            <button className="relative p-2 text-gray-300 hover:text-cyber-cyan transition-colors">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyber-pink text-xs font-bold rounded-full flex items-center justify-center">
                0
              </span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2 text-gray-300 hover:text-cyber-green transition-colors"
              >
                <User className="w-5 h-5" />
              </button>
              {showUserMenu && (
                <div className="absolute top-full mt-2 right-0 cyber-panel p-2 min-w-[180px]">
                  {user ? (
                    <>
                      <div className="px-4 py-2 text-xs text-gray-500 border-b border-white/10 mb-1">
                        {user.email}
                      </div>
                      <Link
                        to="/account"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-cyber-green hover:bg-white/5 rounded transition-colors flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" /> Account Settings
                      </Link>
                      <Link
                        to="/library"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-cyber-green hover:bg-white/5 rounded transition-colors flex items-center gap-2"
                      >
                        <Library className="w-4 h-4" /> My Library
                      </Link>
                      <Link
                        to="/seller"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-cyber-cyan hover:bg-white/5 rounded transition-colors flex items-center gap-2"
                      >
                        <Store className="w-4 h-4" /> Seller Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-cyber-pink hover:bg-white/5 rounded transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/auth"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-cyber-green hover:bg-white/5 rounded transition-colors block"
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/auth?mode=register"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-cyber-green hover:bg-white/5 rounded transition-colors block"
                      >
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden p-2 text-gray-300"
          >
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="cyber-input w-full pl-10 pr-4"
                  aria-label="Search"
                />
              </div>
            </form>
            <div className="space-y-2">
              <Link to="/" className="block py-2 text-gray-300 hover:text-cyber-green">
                Browse
              </Link>
              <Link to="/devtools" className="block py-2 text-gray-300 hover:text-cyber-cyan">
                DevTools
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
