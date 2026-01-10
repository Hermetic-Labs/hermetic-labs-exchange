/**
 * Exchange API Client
 *
 * Fetches live data from the EVE-OS backend Exchange API.
 * Falls back to mockData if API is unavailable.
 */

import { Product, Category, Author } from '../types';
import { products as mockProducts, categories as mockCategories, authors as mockAuthors } from '../data/mockData';

// API base URL - uses the EVE-OS backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface CategoriesResponse {
  categories: Category[];
  total: number;
}

interface AuthorsResponse {
  authors: Author[];
  total: number;
}

// Cache for API responses
let productsCache: Product[] | null = null;
let categoriesCache: Category[] | null = null;
let authorsCache: Author[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

function isCacheValid(): boolean {
  return Date.now() - cacheTimestamp < CACHE_TTL;
}

/**
 * Fetch all products from the API
 */
export async function fetchProducts(options?: {
  category?: string;
  author?: string;
  freeOnly?: boolean;
  search?: string;
}): Promise<Product[]> {
  // Try cache first
  if (productsCache && isCacheValid() && !options) {
    return productsCache;
  }

  try {
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.author) params.set('author', options.author);
    if (options?.freeOnly) params.set('free_only', 'true');
    if (options?.search) params.set('search', options.search);

    const url = `${API_BASE}/api/exchange/products${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ProductsResponse = await response.json();

    // Cache if no filters applied
    if (!options) {
      productsCache = data.products;
      cacheTimestamp = Date.now();
    }

    return data.products;
  } catch (error) {
    console.warn('Exchange API unavailable, using mock data:', error);
    return mockProducts;
  }
}

/**
 * Fetch a single product by slug
 */
export async function fetchProductBySlug(slug: string): Promise<Product | undefined> {
  try {
    const response = await fetch(`${API_BASE}/api/exchange/products/${slug}`);

    if (!response.ok) {
      if (response.status === 404) {
        return undefined;
      }
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Exchange API unavailable, using mock data:', error);
    return mockProducts.find(p => p.slug === slug);
  }
}

/**
 * Fetch all categories
 */
export async function fetchCategories(): Promise<Category[]> {
  // Try cache first
  if (categoriesCache && isCacheValid()) {
    return categoriesCache;
  }

  try {
    const response = await fetch(`${API_BASE}/api/exchange/categories`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: CategoriesResponse = await response.json();
    categoriesCache = data.categories;
    cacheTimestamp = Date.now();

    return data.categories;
  } catch (error) {
    console.warn('Exchange API unavailable, using mock data:', error);
    return mockCategories;
  }
}

/**
 * Fetch all authors
 */
export async function fetchAuthors(): Promise<Author[]> {
  // Try cache first
  if (authorsCache && isCacheValid()) {
    return authorsCache;
  }

  try {
    const response = await fetch(`${API_BASE}/api/exchange/authors`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: AuthorsResponse = await response.json();
    authorsCache = data.authors;
    cacheTimestamp = Date.now();

    return data.authors;
  } catch (error) {
    console.warn('Exchange API unavailable, using mock data:', error);
    return mockAuthors;
  }
}

/**
 * Fetch author by ID
 */
export async function fetchAuthorById(id: string): Promise<Author | undefined> {
  const authors = await fetchAuthors();
  return authors.find(a => a.id === id);
}

/**
 * Fetch featured products
 */
export async function fetchFeaturedProducts(limit = 6): Promise<Product[]> {
  try {
    const response = await fetch(`${API_BASE}/api/exchange/featured?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.products;
  } catch (error) {
    console.warn('Exchange API unavailable, using mock data:', error);
    return mockProducts.filter(p => p.featured).slice(0, limit);
  }
}

/**
 * Fetch new products
 */
export async function fetchNewProducts(limit = 6): Promise<Product[]> {
  try {
    const response = await fetch(`${API_BASE}/api/exchange/new?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.products;
  } catch (error) {
    console.warn('Exchange API unavailable, using mock data:', error);
    return mockProducts.filter(p => p.isNew).slice(0, limit);
  }
}

/**
 * Clear the API cache (useful after mutations)
 */
export function clearCache(): void {
  productsCache = null;
  categoriesCache = null;
  authorsCache = null;
  cacheTimestamp = 0;
}
