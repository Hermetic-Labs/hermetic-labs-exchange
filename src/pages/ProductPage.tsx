import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchProductBySlug, createCheckoutSession } from '../api/exchange';
import { Product } from '../types';
import { MediaCarousel } from '../components/MediaCarousel';
import { StarRating } from '../components/StarRating';
import { formatPrice } from '../lib/utils';
import {
  ShoppingCart,
  Heart,
  ExternalLink,
  MessageCircle,
  ThumbsUp,
  User,
  Calendar,
  Loader2,
  Download,
} from 'lucide-react';

export function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'qa' | 'reviews'>('description');
  const [newQuestion, setNewQuestion] = useState('');

  const handlePurchase = async () => {
    if (!product) return;

    setPurchasing(true);
    setPurchaseError(null);

    try {
      await createCheckoutSession(product);
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Purchase failed');
      setPurchasing(false);
    }
  };

  useEffect(() => {
    async function loadProduct() {
      if (!slug) return;
      setLoading(true);
      try {
        const data = await fetchProductBySlug(slug);
        setProduct(data || null);
      } catch (err) {
        console.error('Failed to load product:', err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyber-green animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Product Not Found</h1>
          <Link to="/" className="cyber-btn">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="py-4 text-sm text-gray-500">
          <Link to="/" className="hover:text-cyber-green">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link to={`/?category=${product.category}`} className="hover:text-cyber-green">
            {product.category}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">{product.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Media Carousel */}
            <MediaCarousel media={product.media} />

            {/* Title & Price (Mobile) */}
            <div className="lg:hidden">
              <h1 className="text-2xl font-bold text-white mb-2">{product.title}</h1>
              <div className="flex items-center gap-4 mb-4">
                <StarRating rating={product.rating} />
                <span className="text-gray-500">({product.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-4">
                {product.discountPrice ? (
                  <>
                    <span className="text-3xl font-bold text-cyber-green">
                      {formatPrice(product.discountPrice)}
                    </span>
                    <span className="text-xl text-gray-500 line-through">{formatPrice(product.price)}</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-cyber-green">{formatPrice(product.price)}</span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10">
              <div className="flex gap-6">
                {[
                  { key: 'description', label: 'Description' },
                  { key: 'qa', label: `Q&A (${product.questions.length})` },
                  { key: 'reviews', label: `Reviews (${product.reviews.length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`pb-3 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-cyber-green border-b-2 border-cyber-green'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {activeTab === 'description' && (
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 whitespace-pre-line">{product.description}</p>
                  {product.links.length > 0 && (
                    <div className="mt-8">
                      <h3 className="section-title mb-4">Links & Resources</h3>
                      <div className="flex flex-wrap gap-3">
                        {product.links.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cyber-btn-outline flex items-center gap-2 text-sm"
                          >
                            {link.label}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'qa' && (
                <div className="space-y-6">
                  {/* Ask Question */}
                  <div className="cyber-panel p-4">
                    <h4 className="text-sm font-medium text-white mb-3">Ask a Question</h4>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Type your question..."
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        className="cyber-input flex-1"
                      />
                      <button className="cyber-btn">Submit</button>
                    </div>
                  </div>

                  {/* Questions List */}
                  {product.questions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No questions yet. Be the first to ask!
                    </div>
                  ) : (
                    product.questions.map((q) => (
                      <div key={q.id} className="cyber-card p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyber-cyan/20 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-cyber-cyan" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white">{q.user}</span>
                              <span className="text-xs text-gray-500">{q.date}</span>
                            </div>
                            <p className="text-gray-300 mb-3">{q.question}</p>
                            {q.answer && (
                              <div className="pl-4 border-l-2 border-cyber-green/50">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-cyber-green font-medium">
                                    SELLER RESPONSE
                                  </span>
                                </div>
                                <p className="text-gray-400 text-sm">{q.answer}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Rating Summary */}
                  <div className="cyber-panel p-6 flex flex-wrap items-center gap-8">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-white mb-2">{product.rating}</div>
                      <StarRating rating={product.rating} size="lg" showValue={false} />
                      <div className="text-sm text-gray-500 mt-1">{product.reviewCount} reviews</div>
                    </div>
                    <button className="cyber-btn">Write a Review</button>
                  </div>

                  {/* Reviews List */}
                  {product.reviews.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No reviews yet.</div>
                  ) : (
                    product.reviews.map((review) => (
                      <div key={review.id} className="cyber-card p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white">{review.user}</span>
                              <StarRating rating={review.rating} size="sm" showValue={false} />
                            </div>
                            <h4 className="text-cyber-green font-medium">{review.title}</h4>
                          </div>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {review.date}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-3">{review.content}</p>
                        <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-cyber-cyan transition-colors">
                          <ThumbsUp className="w-3 h-3" /> Helpful ({review.helpful})
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Purchase Panel */}
            <div className="cyber-panel p-6 sticky top-24">
              <h1 className="text-xl font-bold text-white mb-2 hidden lg:block">{product.title}</h1>
              <div className="hidden lg:flex items-center gap-4 mb-4">
                <StarRating rating={product.rating} />
                <span className="text-gray-500 text-sm">({product.reviewCount})</span>
              </div>

              <div className="hidden lg:block mb-6">
                {product.discountPrice ? (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-cyber-green">
                      {formatPrice(product.discountPrice)}
                    </span>
                    <span className="text-lg text-gray-500 line-through">{formatPrice(product.price)}</span>
                    <span className="px-2 py-1 bg-cyber-pink/20 text-cyber-pink text-xs font-bold rounded">
                      {Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                      OFF
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-cyber-green">{formatPrice(product.price)}</span>
                )}
              </div>

              <div className="flex gap-3 mb-6">
                {product.price === 0 ? (
                  <a
                    href={product.downloadUrl}
                    className="cyber-btn flex-1 flex items-center justify-center gap-2"
                    download
                  >
                    <Download className="w-4 h-4" /> Download Free
                  </a>
                ) : product.stripePriceId ? (
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="cyber-btn flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {purchasing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" /> Buy Now
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="cyber-btn flex-1 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                  >
                    <ShoppingCart className="w-4 h-4" /> Coming Soon
                  </button>
                )}
                <button className="cyber-btn-outline p-3">
                  <Heart className="w-5 h-5" />
                </button>
              </div>
              {purchaseError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                  {purchaseError}
                </div>
              )}

              {/* Tech Specs */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="section-title mb-3">Technical Details</h3>
                <div className="space-y-2">
                  {product.techSpecs.map((spec, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-500">{spec.label}</span>
                      <span className="text-gray-300">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Author Card */}
            <Link to={`/author/${product.author.id}`} className="cyber-card p-4 block group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyber-cyan to-cyber-green flex items-center justify-center">
                  <span className="text-black font-bold text-lg">
                    {product.author.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-white group-hover:text-cyber-green transition-colors">
                    {product.author.name}
                  </h4>
                  <p className="text-sm text-gray-500">{product.author.productCount} products</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
