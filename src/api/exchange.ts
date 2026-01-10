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
