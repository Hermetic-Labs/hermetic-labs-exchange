import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchAuthorById, fetchProducts } from '../api/exchange';
import { Author, Product } from '../types';
import { upcomingProducts } from '../data/mockData'; // Keep upcoming from mock for now
import { ProductCard } from '../components/ProductCard';
import { Twitter, Globe, MessageCircle, UserPlus, Mail, Calendar, Loader2 } from 'lucide-react';

export function AuthorPage() {
  const { id } = useParams();
  const [author, setAuthor] = useState<Author | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      try {
        const [authorData, productsData] = await Promise.all([
          fetchAuthorById(id),
          fetchProducts({ author: id })
        ]);
        setAuthor(authorData || null);
        setProducts(productsData);
      } catch (err) {
        console.error('Failed to load author:', err);
        setAuthor(null);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyber-green animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading author...</p>
        </div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Author Not Found</h1>
          <Link to="/" className="cyber-btn">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const authorProducts = products.filter((p) => p.author.id === author.id);
  const authorUpcoming = upcomingProducts.filter((p) => p.author.id === author.id);

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Profile Header */}
        <div className="cyber-panel p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-cyber-cyan to-cyber-green flex items-center justify-center shrink-0">
              <span className="text-black font-bold text-5xl">{author.name.charAt(0)}</span>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-white mb-2">{author.name}</h1>
              <p className="text-gray-400 mb-4 max-w-2xl">{author.bio}</p>

              {/* Stats */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-6">
                <div>
                  <span className="text-2xl font-bold text-cyber-green">{author.productCount}</span>
                  <span className="text-gray-500 ml-2">Products</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-cyber-cyan">
                    {author.totalSales.toLocaleString()}
                  </span>
                  <span className="text-gray-500 ml-2">Sales</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {author.socialLinks.twitter && (
                  <a
                    href={author.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cyber-btn-outline flex items-center gap-2 text-sm"
                  >
                    <Twitter className="w-4 h-4" /> Twitter
                  </a>
                )}
                {author.socialLinks.discord && (
                  <a
                    href={author.socialLinks.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cyber-btn-outline flex items-center gap-2 text-sm"
                  >
                    <MessageCircle className="w-4 h-4" /> Discord
                  </a>
                )}
                {author.socialLinks.website && (
                  <a
                    href={author.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cyber-btn-outline flex items-center gap-2 text-sm"
                  >
                    <Globe className="w-4 h-4" /> Website
                  </a>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button className="cyber-btn flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Follow
              </button>
              <button className="cyber-btn-outline flex items-center gap-2">
                <Mail className="w-4 h-4" /> Contact
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <section className="mb-12">
          <h2 className="section-title mb-6">Published Modules</h2>
          {authorProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No products yet</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {authorProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Releases */}
        {authorUpcoming.length > 0 && (
          <section>
            <h2 className="section-title mb-6">Upcoming Releases</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {authorUpcoming.map((item) => (
                <div key={item.id} className="cyber-card p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">{item.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>Expected: {item.releaseDate}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-cyber-purple/20 text-cyber-purple text-xs font-medium rounded">
                      COMING SOON
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
