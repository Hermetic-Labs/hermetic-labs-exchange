/**
 * Exchange API Client
 *
 * In development: Uses local catalog.json (public/catalog.json)
 * In production: Fetches from Azure Blob Storage, falls back to GitHub Pages
 */

import { Product, Category, Author } from '../types';
import { products as mockProducts, categories as mockCategories, authors as mockAuthors } from '../data/mockData';

// Local catalog URL (for development - served by Vite)
const LOCAL_CATALOG_URL = `${import.meta.env.BASE_URL}catalog.json`;

// Azure Blob Storage URL (for production)
const AZURE_CATALOG_URL = 'https://hermeticlabs9f36.blob.core.windows.net/packages/catalog.json';

// In dev mode, use local first. In production, use Azure.
const IS_DEV = import.meta.env.DEV;

interface Catalog {
  version: string;
  generated: string;
  baseUrl: string;
  products: Product[];
  categories: Category[];
  authors: Author[];
}

// Cache for catalog data
let catalogCache: Catalog | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 300000; // 5 minutes (catalog is static, can cache longer)

function isCacheValid(): boolean {
  return Date.now() - cacheTimestamp < CACHE_TTL;
}

/**
 * Fetch and cache the entire catalog
 * DEV: Local catalog.json first, then mock data
 * PROD: Azure first, then local, then mock data
 */
async function fetchCatalog(): Promise<Catalog> {
  if (catalogCache && isCacheValid()) {
    return catalogCache;
  }

  // In development, try local catalog first
  if (IS_DEV) {
    try {
      console.log('[Exchange] DEV MODE - Fetching local catalog.json...');
      const response = await fetch(LOCAL_CATALOG_URL);

      if (response.ok) {
        const catalog: Catalog = await response.json();
        catalogCache = catalog;
        cacheTimestamp = Date.now();
        console.log(`[Exchange] Loaded ${catalog.products?.length || 0} products from local catalog`);
        return catalog;
      }
    } catch (error) {
      console.warn('[Exchange] Local catalog unavailable:', error);
    }
  }

  // In production (or if local fails), try Azure
  if (!IS_DEV) {
    try {
      console.log('[Exchange] Fetching catalog from Azure...');
      const response = await fetch(AZURE_CATALOG_URL);

      if (response.ok) {
        const catalog: Catalog = await response.json();
        catalogCache = catalog;
        cacheTimestamp = Date.now();
        console.log(`[Exchange] Loaded ${catalog.products?.length || 0} products from Azure`);
        return catalog;
      }
    } catch (error) {
      console.warn('[Exchange] Azure catalog unavailable:', error);
    }

    // Fallback to local catalog (GitHub Pages deployment)
    try {
      console.log('[Exchange] Trying local catalog fallback...');
      const response = await fetch(LOCAL_CATALOG_URL);

      if (response.ok) {
        const catalog: Catalog = await response.json();
        catalogCache = catalog;
        cacheTimestamp = Date.now();
        console.log(`[Exchange] Loaded ${catalog.products?.length || 0} products from local catalog`);
        return catalog;
      }
    } catch (error) {
      console.warn('[Exchange] Local catalog unavailable:', error);
    }
  }

  // Final fallback to mock data
  console.warn('[Exchange] Using mock data');
  return {
    version: '0.0.0',
    generated: new Date().toISOString(),
    baseUrl: '',
    products: mockProducts,
    categories: mockCategories,
    authors: mockAuthors,
  };
}

/**
 * Fetch all products from the catalog
 */
export async function fetchProducts(options?: {
  category?: string;
  author?: string;
  freeOnly?: boolean;
  search?: string;
}): Promise<Product[]> {
  const catalog = await fetchCatalog();
  let products = catalog.products;

  // Apply filters
  if (options?.category) {
    products = products.filter(p => p.category === options.category);
  }
  if (options?.author) {
    products = products.filter(p => p.author.id === options.author);
  }
  if (options?.freeOnly) {
    products = products.filter(p => p.price === 0);
  }
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    products = products.filter(p =>
      p.title.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    );
  }

  return products;
}

/**
 * Fetch a single product by slug
 */
export async function fetchProductBySlug(slug: string): Promise<Product | undefined> {
  const catalog = await fetchCatalog();
  const product = catalog.products.find(p => p.slug === slug);
  if (!product) return undefined;

  // Ensure required arrays exist with defaults
  return {
    ...product,
    questions: product.questions || [],
    reviews: product.reviews || [],
    links: product.links || [],
    media: product.media || [],
    techSpecs: product.techSpecs || [],
    author: product.author || { id: 'unknown', name: 'Unknown', avatar: '', bio: '', socialLinks: {}, productCount: 0, totalSales: 0 },
  };
}

/**
 * Fetch all categories
 */
export async function fetchCategories(): Promise<Category[]> {
  const catalog = await fetchCatalog();
  return catalog.categories;
}

/**
 * Fetch all authors
 */
export async function fetchAuthors(): Promise<Author[]> {
  const catalog = await fetchCatalog();
  return catalog.authors;
}

/**
 * Fetch author by ID
 */
export async function fetchAuthorById(id: string): Promise<Author | undefined> {
  const catalog = await fetchCatalog();
  return catalog.authors.find(a => a.id === id);
}

/**
 * Fetch featured products
 */
export async function fetchFeaturedProducts(limit = 6): Promise<Product[]> {
  const catalog = await fetchCatalog();
  return catalog.products.filter(p => p.featured).slice(0, limit);
}

/**
 * Fetch new products
 */
export async function fetchNewProducts(limit = 6): Promise<Product[]> {
  const catalog = await fetchCatalog();
  return catalog.products.filter(p => p.isNew).slice(0, limit);
}

/**
 * Clear the catalog cache (useful after updates)
 */
export function clearCache(): void {
  catalogCache = null;
  cacheTimestamp = 0;
}

/**
 * Get the download URL for a product
 */
export function getDownloadUrl(product: Product): string | undefined {
  return product.downloadUrl;
}

// ============================================
// Azure Backend API (Payments & Auth)
// ============================================

const API_BASE_URL = 'https://hermetic-labs-api-cthme4a9gcgdfwfc.eastus-01.azurewebsites.net/api';

/**
 * Create a Stripe Checkout session via backend and redirect to payment
 */
export async function createCheckoutSession(product: Product): Promise<void> {
  if (!product.stripePriceId) {
    throw new Error('This product is not available for purchase yet');
  }

  const successUrl = `${window.location.origin}${import.meta.env.BASE_URL}success?session_id={CHECKOUT_SESSION_ID}&slug=${product.slug}`;
  const cancelUrl = `${window.location.origin}${import.meta.env.BASE_URL}product/${product.slug}`;

  // Call backend to create checkout session
  const response = await fetch(`${API_BASE_URL}/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: product.stripePriceId,
      slug: product.slug,
      successUrl,
      cancelUrl,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create checkout session');
  }

  // Redirect to Stripe Checkout
  window.location.href = data.data.url;
}

/**
 * Verify a purchase and get download access (called from success page)
 */
export async function verifyPurchase(sessionId: string): Promise<{
  packageSlug: string;
  downloadUrl: string;
  expiresIn: number;
}> {
  const response = await fetch(`${API_BASE_URL}/verify-purchase?session_id=${sessionId}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to verify purchase');
  }

  return data.data;
}

// ============================================
// Authentication API
// ============================================

const AUTH_TOKEN_KEY = 'hermetic_auth_token';
const AUTH_USER_KEY = 'hermetic_auth_user';

export interface AuthUser {
  id: string;
  email: string;
}

export interface LibraryItem {
  packageSlug: string;
  purchasedAt: string;
  transactionId: string;
  downloadAvailable: boolean;
}

/**
 * Register a new user
 */
export async function register(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  // Store auth data
  localStorage.setItem(AUTH_TOKEN_KEY, data.data.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.data.user));

  return data.data;
}

/**
 * Login an existing user
 */
export async function login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  // Store auth data
  localStorage.setItem(AUTH_TOKEN_KEY, data.data.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.data.user));

  return data.data;
}

/**
 * Logout the current user
 */
export function logout(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

/**
 * Get the current authenticated user (if any)
 */
export function getCurrentUser(): AuthUser | null {
  const userJson = localStorage.getItem(AUTH_USER_KEY);
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

/**
 * Get the current auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Fetch user's library (purchased packages)
 */
export async function fetchLibrary(): Promise<LibraryItem[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/library`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch library');
  }

  return data.data;
}

/**
 * Get a signed download URL for a purchased package
 */
export async function getPackageDownload(packageSlug: string): Promise<{ downloadUrl: string; expiresIn: number }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/download/${packageSlug}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get download');
  }

  return data.data;
}

// ============================================
// Reviews API
// ============================================

export interface ReviewInput {
  packageSlug: string;
  rating: number;
  title: string;
  content: string;
}

export interface ReviewsResponse {
  reviews: {
    id: string;
    packageSlug: string;
    userId: string;
    userName: string;
    rating: number;
    title: string;
    content: string;
    helpful: number;
    verified: boolean;
    createdAt: string;
  }[];
  summary: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

/**
 * Fetch reviews for a package
 */
export async function fetchReviews(packageSlug: string): Promise<ReviewsResponse> {
  const response = await fetch(`${API_BASE_URL}/reviews/${packageSlug}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch reviews');
  }

  return data.data;
}

/**
 * Submit a new review (requires authentication)
 */
export async function submitReview(review: ReviewInput): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(review),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit review');
  }
}

/**
 * Mark a review as helpful
 */
export async function markReviewHelpful(reviewId: string): Promise<{ helpful: number }> {
  const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/helpful`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to mark review as helpful');
  }

  return data.data;
}

/**
 * Report a review
 */
export async function reportReview(reviewId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/report`, {
    method: 'POST',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to report review');
  }
}

// ============================================
// Seller Dashboard API
// ============================================

export interface SellerDashboardStats {
  totalSales: number;
  totalRevenue: number;
  thisMonthSales: number;
  thisMonthRevenue: number;
  averageOrderValue: number;
  topProducts: { slug: string; sales: number; revenue: number }[];
  recentSales: {
    id: string;
    packageSlug: string;
    amountCents: number;
    purchasedAt: string;
  }[];
}

export interface SellerInfo {
  id: string;
  displayName: string;
  verified: boolean;
  packageCount: number;
}

export interface SellerDashboardResponse {
  seller: SellerInfo;
  stats: SellerDashboardStats;
}

export interface SellerSale {
  id: string;
  packageSlug: string;
  amountCents: number;
  purchasedAt: string;
  netEarnings: number;
}

export interface SellerSalesResponse {
  sales: SellerSale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch seller dashboard data (requires authentication)
 */
export async function fetchSellerDashboard(): Promise<SellerDashboardResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE_URL}/seller/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch seller dashboard');
  }

  return data.data;
}

/**
 * Fetch seller sales history (requires authentication)
 */
export async function fetchSellerSales(page = 1, limit = 20): Promise<SellerSalesResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE_URL}/seller/sales?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch seller sales');
  }

  return data.data;
}

/**
 * Check seller status (requires authentication)
 */
export async function checkSellerStatus(): Promise<{
  isSeller: boolean;
  displayName?: string;
  verified?: boolean;
  stripeConnected?: boolean;
}> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE_URL}/seller/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to check seller status');
  }

  return data.data;
}

/**
 * Start seller onboarding (requires authentication)
 */
export async function startSellerOnboarding(displayName: string): Promise<{
  stripeOnboardingUrl?: string;
}> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE_URL}/seller/onboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ displayName }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to start seller onboarding');
  }

  return data.data;
}

