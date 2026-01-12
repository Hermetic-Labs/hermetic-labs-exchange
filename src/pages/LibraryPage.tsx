import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchLibrary, getPackageDownload, fetchProductBySlug, LibraryItem } from '../api/exchange';
import { Product } from '../types';
import { Loader2, Download, Package, Calendar, AlertCircle } from 'lucide-react';

interface LibraryItemWithProduct extends LibraryItem {
  product?: Product;
  downloading?: boolean;
}

export function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<LibraryItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLibrary() {
      if (!user) return;

      try {
        const libraryItems = await fetchLibrary();

        // Enrich with product details
        const enrichedItems = await Promise.all(
          libraryItems.map(async (item) => {
            const product = await fetchProductBySlug(item.packageSlug);
            return { ...item, product };
          })
        );

        setItems(enrichedItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadLibrary();
    }
  }, [user]);

  const handleDownload = async (item: LibraryItemWithProduct) => {
    setItems((prev) =>
      prev.map((i) =>
        i.packageSlug === item.packageSlug ? { ...i, downloading: true } : i
      )
    );

    try {
      const { downloadUrl } = await getPackageDownload(item.packageSlug);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setItems((prev) =>
        prev.map((i) =>
          i.packageSlug === item.packageSlug ? { ...i, downloading: false } : i
        )
      );
    }
  };

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth?redirect=/library" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyber-green animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your library...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="cyber-panel p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="cyber-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
        <p className="text-gray-400 mb-8">Your purchased packages</p>

        {items.length === 0 ? (
          <div className="cyber-panel p-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Purchases Yet</h2>
            <p className="text-gray-400 mb-6">
              Your purchased packages will appear here.
            </p>
            <Link to="/" className="cyber-btn">
              Browse Store
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.packageSlug}
                className="cyber-card p-4 flex items-center gap-4"
              >
                {/* Product Image */}
                <div className="w-20 h-20 bg-cyber-bg rounded overflow-hidden shrink-0">
                  {item.product?.media[0]?.url ? (
                    <img
                      src={item.product.media[0].url}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.packageSlug}`}
                    className="text-lg font-medium text-white hover:text-cyber-green transition-colors"
                  >
                    {item.product?.title || item.packageSlug}
                  </Link>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.purchasedAt).toLocaleDateString()}
                    </span>
                    {item.product?.author && (
                      <span>by {item.product.author.name}</span>
                    )}
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(item)}
                  disabled={item.downloading}
                  className="cyber-btn flex items-center gap-2 shrink-0"
                >
                  {item.downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
