import { EventEmitter } from './EventEmitter';

// Browser-compatible cache storage (uses IndexedDB via localforage pattern)
// fs/path modules are not available in browser environment
const isBrowser = typeof window !== 'undefined';

// ============================================================================
// LexisNexis Connector - Full Implementation
// Supports case law search, statutes, Shepard's Citations, news/public records
// ============================================================================

export interface LexisNexisConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  cacheDir?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface CaseLaw {
  id: string;
  caseName: string;
  citation: string;
  court: string;
  dateDecided: string;
  jurisdiction: string;
  summary: string;
  fullText?: string;
  headnotes?: string[];
  topics?: string[];
  judges?: string[];
  parties?: {
    plaintiff: string[];
    defendant: string[];
  };
  procedureHistory?: string[];
  disposition?: string;
  citations?: {
    citingCases: string[];
    citedCases: string[];
  };
}

export interface Statute {
  id: string;
  title: string;
  section: string;
  jurisdiction: string;
  effectiveDate: string;
  text: string;
  history?: string[];
  amendments?: Array<{
    date: string;
    description: string;
  }>;
  annotations?: string[];
  relatedStatutes?: string[];
  codeTitle?: string;
  codeChapter?: string;
}

export interface ShepardsCitation {
  citation: string;
  treatment: 'positive' | 'negative' | 'caution' | 'neutral' | 'unknown';
  treatmentLabel: string;
  citingReferences: Array<{
    citation: string;
    caseName: string;
    court: string;
    date: string;
    treatment: string;
    headnotes?: string[];
    discussion?: string;
  }>;
  negativeHistory?: Array<{
    citation: string;
    action: string;
    court: string;
    date: string;
  }>;
  priorHistory?: Array<{
    citation: string;
    court: string;
    date: string;
    action: string;
  }>;
  subsequentHistory?: Array<{
    citation: string;
    court: string;
    date: string;
    action: string;
  }>;
  totalCitingReferences: number;
  lastUpdated: Date;
}

export interface NewsArticle {
  id: string;
  headline: string;
  source: string;
  publishDate: string;
  byline?: string;
  body: string;
  topics?: string[];
  persons?: string[];
  organizations?: string[];
  locations?: string[];
}

export interface PublicRecord {
  id: string;
  type: 'court_filing' | 'property' | 'lien' | 'judgment' | 'bankruptcy' | 'ucc' | 'vital_record';
  jurisdiction: string;
  filingDate: string;
  parties?: string[];
  description: string;
  caseNumber?: string;
  court?: string;
  amount?: number;
  status?: string;
}

export interface CompanyRecord {
  id: string;
  companyName: string;
  dbaNames?: string[];
  status: string;
  stateOfIncorporation: string;
  incorporationDate?: string;
  registeredAgent?: {
    name: string;
    address: string;
  };
  officers?: Array<{
    name: string;
    title: string;
  }>;
  filings?: Array<{
    type: string;
    date: string;
    number: string;
  }>;
}

export interface SearchFilters {
  jurisdiction?: string[];
  court?: string[];
  dateFrom?: string;
  dateTo?: string;
  topic?: string[];
  judge?: string;
  practiceArea?: string[];
  documentType?: string[];
  sortBy?: 'relevance' | 'date' | 'court';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  results: T[];
  totalResults: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  searchId?: string;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

export class LexisNexisConnector extends EventEmitter {
  private config: LexisNexisConfig | null = null;
  private caseLawCache: Map<string, CacheEntry<CaseLaw>> = new Map();
  private statuteCache: Map<string, CacheEntry<Statute>> = new Map();
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private baseUrl: string = 'https://api.lexisnexis.com';
  private timeout: number = 30000;
  private maxRetries: number = 3;
  private cacheDir: string = '';
  private cacheTTL: number = 86400000; // 24 hours

  configure(config: LexisNexisConfig): void {
    this.config = config;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
    if (config.timeout) {
      this.timeout = config.timeout;
    }
    if (config.maxRetries) {
      this.maxRetries = config.maxRetries;
    }
    if (config.cacheDir) {
      this.cacheDir = config.cacheDir;
      this.ensureCacheDir();
    }
    this.emit('configured');
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      const response = await this.apiRequest('/v1/status', { method: 'GET' });
      return response.status === 'ok';
    } catch (error) {
      this.emit('error', { type: 'connection', error });
      return false;
    }
  }

  /**
   * Search case law
   */
  async searchCaseLaw(
    query: string,
    filters?: SearchFilters,
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<CaseLaw>> {
    await this.ensureAuthenticated();

    const payload: any = {
      query,
      sources: ['cases'],
      page: options?.page || 1,
      pageSize: options?.pageSize || 25
    };

    if (filters) {
      payload.filters = this.buildFilters(filters);
      if (filters.sortBy) {
        payload.sort = {
          field: filters.sortBy,
          order: filters.sortOrder || 'desc'
        };
      }
    }

    const response = await this.apiRequest('/v1/search', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = response.results.map((r: any) => this.mapCaseLaw(r));

    // Cache results
    for (const caselaw of results) {
      this.cacheItem('caselaw', caselaw.id, caselaw);
    }

    this.emit('searchComplete', { type: 'caselaw', resultCount: results.length });

    return {
      results,
      totalResults: response.totalResults,
      page: response.page,
      pageSize: response.pageSize,
      hasMore: response.page * response.pageSize < response.totalResults,
      searchId: response.searchId,
      facets: response.facets
    };
  }

  /**
   * Get case law by ID
   */
  async getCaseLaw(id: string, options?: { includeFullText?: boolean }): Promise<CaseLaw | null> {
    // Check memory cache first
    const cached = this.caseLawCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Check disk cache
    const diskCached = await this.loadFromDiskCache<CaseLaw>('caselaw', id);
    if (diskCached) {
      this.caseLawCache.set(id, {
        data: diskCached,
        cachedAt: Date.now(),
        expiresAt: Date.now() + this.cacheTTL
      });
      return diskCached;
    }

    // Fetch from API
    try {
      await this.ensureAuthenticated();

      const params = new URLSearchParams();
      if (options?.includeFullText) {
        params.set('fullText', 'true');
      }

      const response = await this.apiRequest(
        `/v1/cases/${encodeURIComponent(id)}?${params.toString()}`,
        { method: 'GET' }
      );

      const caselaw = this.mapCaseLaw(response);
      this.cacheItem('caselaw', id, caselaw);
      await this.saveToDiskCache('caselaw', id, caselaw);

      return caselaw;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search statutes
   */
  async searchStatutes(
    query: string,
    jurisdiction?: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<Statute>> {
    await this.ensureAuthenticated();

    const payload: any = {
      query,
      sources: ['statutes', 'regulations'],
      page: options?.page || 1,
      pageSize: options?.pageSize || 25
    };

    if (jurisdiction) {
      payload.filters = { jurisdiction: [jurisdiction] };
    }

    const response = await this.apiRequest('/v1/search', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = response.results.map((r: any) => this.mapStatute(r));

    // Cache results
    for (const statute of results) {
      this.cacheItem('statute', statute.id, statute);
    }

    return {
      results,
      totalResults: response.totalResults,
      page: response.page,
      pageSize: response.pageSize,
      hasMore: response.page * response.pageSize < response.totalResults,
      facets: response.facets
    };
  }

  /**
   * Get statute by ID
   */
  async getStatute(id: string): Promise<Statute | null> {
    // Check memory cache first
    const cached = this.statuteCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Check disk cache
    const diskCached = await this.loadFromDiskCache<Statute>('statute', id);
    if (diskCached) {
      this.statuteCache.set(id, {
        data: diskCached,
        cachedAt: Date.now(),
        expiresAt: Date.now() + this.cacheTTL
      });
      return diskCached;
    }

    // Fetch from API
    try {
      await this.ensureAuthenticated();

      const response = await this.apiRequest(
        `/v1/statutes/${encodeURIComponent(id)}`,
        { method: 'GET' }
      );

      const statute = this.mapStatute(response);
      this.cacheItem('statute', id, statute);
      await this.saveToDiskCache('statute', id, statute);

      return statute;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get Shepard's citation analysis
   */
  async getShepardsCitations(citation: string): Promise<ShepardsCitation> {
    await this.ensureAuthenticated();

    const response = await this.apiRequest(
      `/v1/shepards/${encodeURIComponent(citation)}`,
      { method: 'GET' }
    );

    return {
      citation: response.citation,
      treatment: this.mapTreatment(response.treatment),
      treatmentLabel: response.treatmentLabel || this.getTreatmentLabel(response.treatment),
      citingReferences: (response.citingReferences || []).map((ref: any) => ({
        citation: ref.citation,
        caseName: ref.caseName,
        court: ref.court,
        date: ref.dateDecided,
        treatment: ref.treatment,
        headnotes: ref.headnotes,
        discussion: ref.discussion
      })),
      negativeHistory: response.negativeHistory,
      priorHistory: response.priorHistory,
      subsequentHistory: response.subsequentHistory,
      totalCitingReferences: response.totalCitingReferences || 0,
      lastUpdated: new Date(response.lastUpdated || Date.now())
    };
  }

  /**
   * Search news articles
   */
  async searchNews(
    query: string,
    filters?: {
      sources?: string[];
      dateFrom?: string;
      dateTo?: string;
      topics?: string[];
    },
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<NewsArticle>> {
    await this.ensureAuthenticated();

    const payload: any = {
      query,
      sources: filters?.sources || ['news'],
      page: options?.page || 1,
      pageSize: options?.pageSize || 25
    };

    if (filters) {
      payload.filters = {};
      if (filters.dateFrom) {
        payload.filters.dateFrom = filters.dateFrom;
      }
      if (filters.dateTo) {
        payload.filters.dateTo = filters.dateTo;
      }
      if (filters.topics) {
        payload.filters.topics = filters.topics;
      }
    }

    const response = await this.apiRequest('/v1/news/search', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = response.results.map((r: any) => ({
      id: r.id,
      headline: r.headline || r.title,
      source: r.source,
      publishDate: r.publishDate || r.date,
      byline: r.byline,
      body: r.body || r.content,
      topics: r.topics,
      persons: r.persons,
      organizations: r.organizations,
      locations: r.locations
    }));

    return {
      results,
      totalResults: response.totalResults,
      page: response.page,
      pageSize: response.pageSize,
      hasMore: response.page * response.pageSize < response.totalResults
    };
  }

  /**
   * Search public records
   */
  async searchPublicRecords(
    query: string,
    recordType?: PublicRecord['type'],
    options?: {
      jurisdiction?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<SearchResult<PublicRecord>> {
    await this.ensureAuthenticated();

    const payload: any = {
      query,
      page: options?.page || 1,
      pageSize: options?.pageSize || 25
    };

    if (recordType) {
      payload.recordType = recordType;
    }
    if (options?.jurisdiction) {
      payload.jurisdiction = options.jurisdiction;
    }
    if (options?.dateFrom) {
      payload.dateFrom = options.dateFrom;
    }
    if (options?.dateTo) {
      payload.dateTo = options.dateTo;
    }

    const response = await this.apiRequest('/v1/publicrecords/search', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = response.results.map((r: any) => ({
      id: r.id,
      type: r.type,
      jurisdiction: r.jurisdiction,
      filingDate: r.filingDate,
      parties: r.parties,
      description: r.description,
      caseNumber: r.caseNumber,
      court: r.court,
      amount: r.amount,
      status: r.status
    }));

    return {
      results,
      totalResults: response.totalResults,
      page: response.page,
      pageSize: response.pageSize,
      hasMore: response.page * response.pageSize < response.totalResults
    };
  }

  /**
   * Search company records
   */
  async searchCompanyRecords(
    query: string,
    options?: {
      state?: string;
      status?: 'active' | 'inactive' | 'all';
      page?: number;
      pageSize?: number;
    }
  ): Promise<SearchResult<CompanyRecord>> {
    await this.ensureAuthenticated();

    const payload: any = {
      query,
      page: options?.page || 1,
      pageSize: options?.pageSize || 25
    };

    if (options?.state) {
      payload.state = options.state;
    }
    if (options?.status) {
      payload.status = options.status;
    }

    const response = await this.apiRequest('/v1/company/search', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = response.results.map((r: any) => ({
      id: r.id,
      companyName: r.companyName || r.name,
      dbaNames: r.dbaNames,
      status: r.status,
      stateOfIncorporation: r.stateOfIncorporation || r.state,
      incorporationDate: r.incorporationDate,
      registeredAgent: r.registeredAgent,
      officers: r.officers,
      filings: r.filings
    }));

    return {
      results,
      totalResults: response.totalResults,
      page: response.page,
      pageSize: response.pageSize,
      hasMore: response.page * response.pageSize < response.totalResults
    };
  }

  /**
   * Batch sync documents to local cache for offline access
   */
  async syncToLocal(
    ids: string[],
    type: 'caselaw' | 'statute'
  ): Promise<{ synced: number; failed: number; errors: Array<{ id: string; error: string }> }> {
    let synced = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        if (type === 'caselaw') {
          const caselaw = await this.getCaseLaw(id, { includeFullText: true });
          if (caselaw) {
            await this.saveToDiskCache('caselaw', id, caselaw);
            synced++;
          } else {
            failed++;
            errors.push({ id, error: 'Not found' });
          }
        } else {
          const statute = await this.getStatute(id);
          if (statute) {
            await this.saveToDiskCache('statute', id, statute);
            synced++;
          } else {
            failed++;
            errors.push({ id, error: 'Not found' });
          }
        }
      } catch (error: any) {
        failed++;
        errors.push({ id, error: error.message });
      }
    }

    this.emit('syncComplete', { type, synced, failed });
    return { synced, failed, errors };
  }

  /**
   * Get document from local cache only (offline mode)
   */
  async getFromLocalCache<T>(type: 'caselaw' | 'statute', id: string): Promise<T | null> {
    return await this.loadFromDiskCache<T>(type, id);
  }

  /**
   * List locally cached documents
   */
  async listCachedDocuments(type: 'caselaw' | 'statute'): Promise<string[]> {
    if (!this.cacheDir) {
      return [];
    }

    if (isBrowser) {
      // List from localStorage
      const prefix = `lexisnexis_${type}_`;
      return Object.keys(localStorage)
        .filter(k => k.startsWith(prefix))
        .map(k => k.replace(prefix, ''));
    }
    // Server-side listing handled by backend
    return [];
  }

  /**
   * Clear caches
   */
  async clearCache(type?: 'caselaw' | 'statute'): Promise<void> {
    if (!type || type === 'caselaw') {
      this.caseLawCache.clear();
      if (this.cacheDir) {
        await this.clearDiskCache('caselaw');
      }
    }

    if (!type || type === 'statute') {
      this.statuteCache.clear();
      if (this.cacheDir) {
        await this.clearDiskCache('statute');
      }
    }

    this.emit('cacheCleared', { type: type || 'all' });
  }

  /**
   * Get jurisdictions list
   */
  async getJurisdictions(): Promise<Array<{ code: string; name: string; type: 'federal' | 'state' }>> {
    await this.ensureAuthenticated();

    const response = await this.apiRequest('/v1/metadata/jurisdictions', { method: 'GET' });
    return response.jurisdictions || [];
  }

  /**
   * Get courts list
   */
  async getCourts(jurisdiction?: string): Promise<Array<{ code: string; name: string; level: string }>> {
    await this.ensureAuthenticated();

    const params = jurisdiction ? `?jurisdiction=${encodeURIComponent(jurisdiction)}` : '';
    const response = await this.apiRequest(`/v1/metadata/courts${params}`, { method: 'GET' });
    return response.courts || [];
  }

  /**
   * Get practice areas/topics
   */
  async getPracticeAreas(): Promise<Array<{ code: string; name: string; parent?: string }>> {
    await this.ensureAuthenticated();

    const response = await this.apiRequest('/v1/metadata/practice-areas', { method: 'GET' });
    return response.practiceAreas || [];
  }

  // ==================== Private Methods ====================

  private async ensureAuthenticated(): Promise<void> {
    if (!this.config) {
      throw new Error('LexisNexis connector not configured');
    }

    if (this.accessToken && this.tokenExpiresAt > Date.now() + 60000) {
      return;
    }

    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    const authString = `${this.config!.apiKey}:${this.config!.apiSecret}`;
    const authHeader = Buffer.from(authString).toString('base64');

    const response = await this.httpRequest(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    this.emit('authenticated');
  }

  private async apiRequest<T = any>(endpoint: string, options: RequestInit): Promise<T> {
    await this.ensureAuthenticated();

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.httpRequest(url, {
          ...options,
          headers
        });

        if (response.status === 401) {
          await this.authenticate();
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          continue;
        }

        if (!response.ok) {
          const error = new Error(`API request failed: ${response.status}`);
          (error as any).statusCode = response.status;
          throw error;
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private async httpRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildFilters(filters: SearchFilters): Record<string, any> {
    const result: Record<string, any> = {};

    if (filters.jurisdiction?.length) {
      result.jurisdiction = filters.jurisdiction;
    }
    if (filters.court?.length) {
      result.court = filters.court;
    }
    if (filters.dateFrom) {
      result.dateFrom = filters.dateFrom;
    }
    if (filters.dateTo) {
      result.dateTo = filters.dateTo;
    }
    if (filters.topic?.length) {
      result.topic = filters.topic;
    }
    if (filters.judge) {
      result.judge = filters.judge;
    }
    if (filters.practiceArea?.length) {
      result.practiceArea = filters.practiceArea;
    }
    if (filters.documentType?.length) {
      result.documentType = filters.documentType;
    }

    return result;
  }

  private mapCaseLaw(data: any): CaseLaw {
    return {
      id: data.id || data.documentId,
      caseName: data.caseName || data.title,
      citation: data.citation || data.cite,
      court: data.court,
      dateDecided: data.dateDecided || data.date,
      jurisdiction: data.jurisdiction,
      summary: data.summary || data.synopsis || '',
      fullText: data.fullText || data.content,
      headnotes: data.headnotes,
      topics: data.topics,
      judges: data.judges,
      parties: data.parties,
      procedureHistory: data.procedureHistory,
      disposition: data.disposition,
      citations: data.citations
    };
  }

  private mapStatute(data: any): Statute {
    return {
      id: data.id || data.documentId,
      title: data.title,
      section: data.section,
      jurisdiction: data.jurisdiction,
      effectiveDate: data.effectiveDate,
      text: data.text || data.content,
      history: data.history,
      amendments: data.amendments,
      annotations: data.annotations,
      relatedStatutes: data.relatedStatutes,
      codeTitle: data.codeTitle,
      codeChapter: data.codeChapter
    };
  }

  private mapTreatment(treatment: string): ShepardsCitation['treatment'] {
    const treatmentMap: Record<string, ShepardsCitation['treatment']> = {
      'positive': 'positive',
      'followed': 'positive',
      'cited': 'positive',
      'negative': 'negative',
      'overruled': 'negative',
      'reversed': 'negative',
      'caution': 'caution',
      'distinguished': 'caution',
      'questioned': 'caution',
      'neutral': 'neutral',
      'explained': 'neutral'
    };
    return treatmentMap[treatment?.toLowerCase()] || 'unknown';
  }

  private getTreatmentLabel(treatment: string): string {
    const labels: Record<string, string> = {
      'positive': 'Positive Treatment',
      'negative': 'Negative Treatment - Warning',
      'caution': 'Caution - Possible Negative Treatment',
      'neutral': 'Neutral Treatment',
      'unknown': 'Treatment Unknown'
    };
    return labels[treatment] || 'Treatment Unknown';
  }

  private cacheItem<T>(type: 'caselaw' | 'statute', id: string, data: T): void {
    const cache = type === 'caselaw' ? this.caseLawCache : this.statuteCache;
    (cache as Map<string, CacheEntry<T>>).set(id, {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.cacheTTL
    });
  }

  private ensureCacheDir(): void {
    // Browser environment uses IndexedDB/localStorage instead of filesystem
    if (isBrowser) return;
    // Server-side caching would be handled by backend service
  }

  private async saveToDiskCache<T>(type: string, id: string, data: T): Promise<void> {
    if (!this.cacheDir) return;

    if (isBrowser) {
      // Use localStorage for browser caching
      try {
        const key = `lexisnexis_${type}_${this.sanitizeFilename(id)}`;
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        this.emit('warning', { message: 'Failed to save to browser cache', id, error });
      }
      return;
    }
    // Server-side disk caching handled by backend
  }

  private async loadFromDiskCache<T>(type: string, id: string): Promise<T | null> {
    if (!this.cacheDir) return null;

    if (isBrowser) {
      // Use localStorage for browser caching
      try {
        const key = `lexisnexis_${type}_${this.sanitizeFilename(id)}`;
        const content = localStorage.getItem(key);
        return content ? JSON.parse(content) : null;
      } catch {
        return null;
      }
    }
    // Server-side disk caching handled by backend
    return null;
  }

  private async clearDiskCache(type: string): Promise<void> {
    if (!this.cacheDir) return;

    if (isBrowser) {
      // Clear localStorage items for this type
      const prefix = `lexisnexis_${type}_`;
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      keysToRemove.forEach(k => localStorage.removeItem(k));
      return;
    }
    // Server-side disk caching handled by backend
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const lexisNexisConnector = new LexisNexisConnector();
export default LexisNexisConnector;
