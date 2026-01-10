import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, ChevronDown, Menu, X } from 'lucide-react';
import { fetchCategories } from '../api/exchange';
import { Category } from '../types';

export function Header() {
  const [showCategories, setShowCategories] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const navigate = useNavigate();

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyber-cyan to-cyber-green flex items-center justify-center">
              <span className="text-black font-bold text-lg">H</span>
            </div>
            <span className="text-cyber-green text-glow-green font-semibold text-lg hidden sm:block">
              HERMETIC LABS
            </span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cyber-input w-full pl-10 pr-4"
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="flex items-center gap-1 text-sm text-gray-300 hover:text-cyber-green transition-colors"
              >
                Categories
                <ChevronDown className="w-4 h-4" />
              </button>
              {showCategories && (
                <div className="absolute top-full mt-2 left-0 cyber-panel p-2 min-w-[200px]">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/?category=${cat.name}`}
                      onClick={() => setShowCategories(false)}
                      className="block px-4 py-2 text-sm text-gray-300 hover:text-cyber-green hover:bg-white/5 rounded transition-colors"
                    >
                      {cat.name}
                      <span className="text-gray-500 ml-2">({cat.productCount})</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/" className="text-sm text-gray-300 hover:text-cyber-green transition-colors">
              Browse
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
                <div className="absolute top-full mt-2 right-0 cyber-panel p-2 min-w-[160px]">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-cyber-green hover:bg-white/5 rounded transition-colors">
                    Sign In
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-cyber-green hover:bg-white/5 rounded transition-colors">
                    Create Account
                  </button>
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
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="cyber-input w-full pl-10 pr-4"
                />
              </div>
            </form>
            <div className="space-y-2">
              <Link to="/" className="block py-2 text-gray-300 hover:text-cyber-green">
                Browse
              </Link>
              {categories.slice(0, 5).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/?category=${cat.name}`}
                  onClick={() => setMobileMenu(false)}
                  className="block py-2 text-gray-400 hover:text-cyber-green pl-4"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
