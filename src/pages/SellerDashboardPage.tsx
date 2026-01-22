import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchSellerDashboard,
  fetchSellerSales,
  checkSellerStatus,
  startSellerOnboarding,
  SellerDashboardResponse,
  SellerSalesResponse,
} from '../api/exchange';

export function SellerDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [dashboard, setDashboard] = useState<SellerDashboardResponse | null>(null);
  const [sales, setSales] = useState<SellerSalesResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales'>('overview');

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth?redirect=/seller');
      return;
    }

    loadData();
  }, [isAuthenticated, navigate]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Check if user is a seller
      const status = await checkSellerStatus();
      setIsSeller(status.isSeller);

      if (status.isSeller) {
        // Load dashboard data
        const [dashboardData, salesData] = await Promise.all([
          fetchSellerDashboard(),
          fetchSellerSales(1, 20),
        ]);
        setDashboard(dashboardData);
        setSales(salesData);
      } else {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Load error:', err);
      if (err instanceof Error && err.message.includes('not found')) {
        setShowOnboarding(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;

    try {
      setOnboardingLoading(true);
      const result = await startSellerOnboarding(displayName.trim());

      if (result.stripeOnboardingUrl) {
        // Redirect to Stripe Connect onboarding
        window.location.href = result.stripeOnboardingUrl;
      } else {
        // Seller created without Stripe Connect
        setShowOnboarding(false);
        loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start onboarding');
    } finally {
      setOnboardingLoading(false);
    }
  }

  function formatCurrency(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
        <div className="text-cyber-text animate-pulse">Loading seller dashboard...</div>
      </div>
    );
  }

  // Onboarding flow for non-sellers
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-cyber-bg py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-cyber-card border border-cyber-border rounded-lg p-8">
            <h1 className="text-2xl font-bold text-white mb-2">Become a Seller</h1>
            <p className="text-cyber-text-muted mb-6">
              Start selling your modules, integrations, and workflows on the Hermetic Labs Exchange.
            </p>

            <form onSubmit={handleOnboarding} className="space-y-4">
              <div>
                <label className="block text-sm text-cyber-text mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your seller name"
                  className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-4 py-3 text-white focus:border-cyber-primary focus:outline-none"
                  required
                />
                <p className="text-xs text-cyber-text-muted mt-1">
                  This will be displayed on your products
                </p>
              </div>

              {error && (
                <div className="text-red-400 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={onboardingLoading}
                className="w-full bg-cyber-primary text-cyber-bg font-semibold py-3 rounded-lg hover:bg-cyber-primary-hover transition-colors disabled:opacity-50"
              >
                {onboardingLoading ? 'Setting up...' : 'Start Selling'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-cyber-border">
              <h3 className="text-sm font-medium text-white mb-3">What you get:</h3>
              <ul className="space-y-2 text-sm text-cyber-text-muted">
                <li className="flex items-center gap-2">
                  <span className="text-cyber-primary">%</span>
                  70% revenue share on sales
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyber-primary">$</span>
                  Direct payouts via Stripe Connect
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyber-primary">#</span>
                  Sales analytics dashboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyber-primary">@</span>
                  Email notifications on sales
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const { seller, stats } = dashboard;

  return (
    <div className="min-h-screen bg-cyber-bg py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{seller.displayName}</h1>
            <p className="text-cyber-text-muted">
              {seller.verified && (
                <span className="text-cyber-primary mr-2">Verified</span>
              )}
              {seller.packageCount} product{seller.packageCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-cyber-card border border-cyber-border rounded-lg p-4">
            <div className="text-cyber-text-muted text-sm">Total Sales</div>
            <div className="text-2xl font-bold text-white">{stats.totalSales}</div>
          </div>
          <div className="bg-cyber-card border border-cyber-border rounded-lg p-4">
            <div className="text-cyber-text-muted text-sm">Total Revenue</div>
            <div className="text-2xl font-bold text-cyber-primary">{formatCurrency(stats.totalRevenue)}</div>
          </div>
          <div className="bg-cyber-card border border-cyber-border rounded-lg p-4">
            <div className="text-cyber-text-muted text-sm">This Month Sales</div>
            <div className="text-2xl font-bold text-white">{stats.thisMonthSales}</div>
          </div>
          <div className="bg-cyber-card border border-cyber-border rounded-lg p-4">
            <div className="text-cyber-text-muted text-sm">This Month Revenue</div>
            <div className="text-2xl font-bold text-cyber-primary">{formatCurrency(stats.thisMonthRevenue)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-cyber-border mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-cyber-primary text-white'
                  : 'border-transparent text-cyber-text-muted hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === 'sales'
                  ? 'border-cyber-primary text-white'
                  : 'border-transparent text-cyber-text-muted hover:text-white'
              }`}
            >
              Sales History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-cyber-card border border-cyber-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Top Products</h2>
              {stats.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {stats.topProducts.map((product, i) => (
                    <div key={product.slug} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-cyber-text-muted text-sm w-4">{i + 1}</span>
                        <span className="text-white">{product.slug.replace(/-/g, ' ')}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-cyber-primary font-medium">{formatCurrency(product.revenue)}</div>
                        <div className="text-cyber-text-muted text-xs">{product.sales} sales</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-cyber-text-muted">No sales yet</p>
              )}
            </div>

            {/* Recent Sales */}
            <div className="bg-cyber-card border border-cyber-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Sales</h2>
              {stats.recentSales.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentSales.slice(0, 5).map(sale => (
                    <div key={sale.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-white">{sale.packageSlug.replace(/-/g, ' ')}</div>
                        <div className="text-cyber-text-muted text-xs">{formatDate(sale.purchasedAt)}</div>
                      </div>
                      <div className="text-cyber-primary font-medium">{formatCurrency(sale.amountCents)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-cyber-text-muted">No sales yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sales' && sales && (
          <div className="bg-cyber-card border border-cyber-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-cyber-bg">
                <tr>
                  <th className="text-left text-cyber-text-muted text-sm font-medium px-4 py-3">Product</th>
                  <th className="text-left text-cyber-text-muted text-sm font-medium px-4 py-3">Date</th>
                  <th className="text-right text-cyber-text-muted text-sm font-medium px-4 py-3">Amount</th>
                  <th className="text-right text-cyber-text-muted text-sm font-medium px-4 py-3">Your Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border">
                {sales.sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-cyber-bg/50">
                    <td className="px-4 py-3 text-white">{sale.packageSlug.replace(/-/g, ' ')}</td>
                    <td className="px-4 py-3 text-cyber-text-muted">{formatDate(sale.purchasedAt)}</td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(sale.amountCents)}</td>
                    <td className="px-4 py-3 text-right text-cyber-primary font-medium">{formatCurrency(sale.netEarnings)}</td>
                  </tr>
                ))}
                {sales.sales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-cyber-text-muted">
                      No sales yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {sales.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-cyber-border">
                <div className="text-cyber-text-muted text-sm">
                  Page {sales.pagination.page} of {sales.pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchSellerSales(sales.pagination.page - 1).then(setSales)}
                    disabled={sales.pagination.page === 1}
                    className="px-3 py-1 border border-cyber-border rounded text-cyber-text hover:bg-cyber-bg disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchSellerSales(sales.pagination.page + 1).then(setSales)}
                    disabled={sales.pagination.page >= sales.pagination.totalPages}
                    className="px-3 py-1 border border-cyber-border rounded text-cyber-text hover:bg-cyber-bg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
