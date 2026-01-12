/**
 * Exchange API Client
 *
 * Fetches catalog from static catalog.json (GitHub Pages).
 * Falls back to mockData if catalog is unavailable.
 */

import { Product, Category, Author } from '../types';
import { products as mockProducts, categories as mockCategories, authors as mockAuthors } from '../data/mockData';

// Catalog URL - relative to the site root
const CATALOG_URL = `${import.meta.env.BASE_URL}catalog.json`;

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
 */
async function fetchCatalog(): Promise<Catalog> {
  if (catalogCache && isCacheValid()) {
    return catalogCache;
  }

  try {
    const response = await fetch(CATALOG_URL);

    if (!response.ok) {
      throw new Error(`Catalog fetch error: ${response.status}`);
    }

    const catalog: Catalog = await response.json();
    catalogCache = catalog;
    cacheTimestamp = Date.now();

    return catalog;
  } catch (error) {
    console.warn('Catalog unavailable, using mock data:', error);
    // Return mock data as a catalog structure
    return {
      version: '0.0.0',
      generated: new Date().toISOString(),
      baseUrl: '',
      products: mockProducts,
      categories: mockCategories,
      authors: mockAuthors,
    };
  }
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
  return catalog.products.find(p => p.slug === slug);
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
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51So5KYRrheLnW1znj7SnUiUtMpWDwDCXFJTtKi6aYtiMGTsaevKLCGszqXMOENX47mAGGpNy6dqSL4NsTITxCxs1005kfG17ol';

/**
 * Create a Stripe Checkout session and redirect to payment
 */
export async function createCheckoutSession(product: Product): Promise<void> {
  if (!product.stripePriceId) {
    throw new Error('This product is not available for purchase yet');
  }

  // Dynamically load Stripe.js
  const stripe = await loadStripe();
  if (!stripe) {
    throw new Error('Failed to load payment processor');
  }

  // Redirect to Stripe Checkout
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: product.stripePriceId, quantity: 1 }],
    mode: 'payment',
    successUrl: `${window.location.origin}${import.meta.env.BASE_URL}success?session_id={CHECKOUT_SESSION_ID}&slug=${product.slug}`,
    cancelUrl: `${window.location.origin}${import.meta.env.BASE_URL}product/${product.slug}`,
    clientReferenceId: product.slug,
  });

  if (error) {
    throw new Error(error.message || 'Payment failed');
  }
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

/**
 * Load Stripe.js dynamically
 */
let stripePromise: Promise<any> | null = null;

function loadStripe(): Promise<any> {
  if (stripePromise) return stripePromise;

  stripePromise = new Promise((resolve, reject) => {
    if ((window as any).Stripe) {
      resolve((window as any).Stripe(STRIPE_PUBLISHABLE_KEY));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => {
      if ((window as any).Stripe) {
        resolve((window as any).Stripe(STRIPE_PUBLISHABLE_KEY));
      } else {
        reject(new Error('Stripe.js failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(script);
  });

  return stripePromise;
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

  return data.data.items;
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
