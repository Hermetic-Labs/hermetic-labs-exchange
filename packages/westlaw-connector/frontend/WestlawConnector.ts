import { EventEmitter } from './EventEmitter';

// Browser-compatible cache storage (uses localStorage/IndexedDB)
// fs/path modules are not available in browser environment
const isBrowser = typeof window !== 'undefined';

// ============================================================================
// Westlaw Connector - Full Implementation
// Supports legal document search, KeyCite, court documents, briefs, and more
// ============================================================================

export interface WestlawConfig {
  apiKey: string;
  clientId: string;
  clientSecret?: string;
  baseUrl?: string;
  cacheDir?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface LegalCitation {
  cite: string;
  title: string;
  court: string;
  date: string;
  jurisdiction: string;
  parallelCitations?: string[];
  reporterVolume?: string;
  reporterPage?: string;
  reporter?: string;
}

export interface LegalDocument {
  id: string;
  citation: LegalCitation;
  content: string;
  headnotes: Headnote[];
  keyNumbers: KeyNumber[];
  synopsis?: string;
  judges?: string[];
  attorneys?: string[];
  disposition?: string;
  procedureHistory?: string[];
  relatedDocuments?: string[];
  cachedLocally: boolean;
}

export interface Headnote {
  number: number;
  text: string;
  keyNumbers: string[];
  topics: string[];
}

export interface KeyNumber {
  number: string;
  topic: string;
  description: string;
  hierarchy: string[];
}

export interface KeyCiteResult {
  citation: string;
  status: 'good' | 'caution' | 'negative' | 'unknown';
  statusIcon: 'green' | 'yellow' | 'red' | 'none';
  statusDescription: string;
  citingReferences: CitingReference[];
  negativeHistory: NegativeHistory[];
  positiveHistory: PositiveHistory[];
  relatedReferences: RelatedReference[];
  totalCitingReferences: number;
  lastUpdated: Date;
}

export interface CitingReference {
  citation: string;
  caseName: string;
  court: string;
  date: string;
  depth: number;
  headnoteNumbers?: number[];
  quotedText?: string;
  treatment?: string;
}

export interface NegativeHistory {
  citation: string;
  caseName: string;
  action: 'overruled' | 'reversed' | 'vacated' | 'superseded' | 'abrogated';
  court: string;
  date: string;
  description: string;
}

export interface PositiveHistory {
  citation: string;
  caseName: string;
  action: 'affirmed' | 'followed' | 'cited' | 'distinguished';
  court: string;
  date: string;
}

export interface RelatedReference {
  citation: string;
  title: string;
  type: 'secondary' | 'statute' | 'regulation' | 'treatise' | 'law_review';
  relevance: number;
}

export interface Brief {
  id: string;
  title: string;
  caseNumber: string;
  court: string;
  filingDate: string;
  briefType: 'appellant' | 'appellee' | 'amicus' | 'reply' | 'motion';
  attorneys: string[];
  lawFirms: string[];
  content?: string;
}

export interface Docket {
  id: string;
  caseNumber: string;
  caseName: string;
  court: string;
  filingDate: string;
  status: string;
  judge?: string;
  parties: {
    plaintiffs: string[];
    defendants: string[];
  };
  entries: DocketEntry[];
}

export interface DocketEntry {
  number: number;
  date: string;
  description: string;
  documentId?: string;
  filedBy?: string;
}

export interface SecondarySource {
  id: string;
  title: string;
  type: 'treatise' | 'law_review' | 'practice_guide' | 'encyclopedia' | 'forms';
  author?: string;
  publication: string;
  volume?: string;
  section?: string;
  content?: string;
  lastUpdated?: string;
}

export interface SearchFilters {
  jurisdiction?: string[];
  court?: string[];
  dateFrom?: string;
  dateTo?: string;
  keyNumber?: string[];
  topic?: string[];
  judge?: string;
  attorney?: string;
  documentType?: ('case' | 'statute' | 'regulation' | 'brief' | 'secondary')[];
  sortBy?: 'relevance' | 'date' | 'cited';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  results: T[];
  totalResults: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  searchId?: string;
  suggestedTerms?: string[];
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

export class WestlawConnector extends EventEmitter {
  private config: WestlawConfig | null = null;
  private localCache: Map<string, CacheEntry<LegalDocument>> = new Map();
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private baseUrl: string = 'https://api.westlaw.com';
  private timeout: number = 30000;
  private maxRetries: number = 3;
  private cacheDir: string = '';

  configure(config: WestlawConfig): void {
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
   * Test Westlaw API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      const response = await this.apiRequest('/v1/ping', { method: 'GET' });
      return response.status === 'ok';
    } catch (error) {
      this.emit('error', { type: 'connection', error });
      return false;
    }
  }

  /**
   * Search Westlaw content
   */
  async search(
    query: string,
    filters?: SearchFilters,
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<LegalCitation>> {
    await this.ensureAuthenticated();

    const payload: any = {
      query,
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

    const results = response.results.map((r: any) => this.mapCitation(r));

    this.emit('searchComplete', { resultCount: results.length });

    return {
      results,
      totalResults: response.totalResults,
      page: response.page,
      pageSize: response.pageSize,
      hasMore: response.page * response.pageSize < response.totalResults,
      searchId: response.searchId,
      suggestedTerms: response.suggestedTerms
    };
  }

  /**
   * Get citation by cite string
   */
  async getCitation(cite: string): Promise<LegalDocument | null> {
    // Check memory cache
    const cached = this.localCache.get(cite);
    if (cached) {
      return cached.data;
    }

    // Check disk cache
    const diskCached = await this.loadFromDiskCache(cite);
    if (diskCached) {
      this.localCache.set(cite, { data: diskCached, cachedAt: Date.now() });
      return diskCached;
    }

    // Fetch from API
    try {
      await this.ensureAuthenticated();

      const response = await this.apiRequest(
        `/v1/documents/cite/${encodeURIComponent(cite)}`,
        { method: 'GET' }
      );

      const document = this.mapDocument(response);
      this.localCache.set(cite, { data: document, cachedAt: Date.now() });
      await this.saveToDiskCache(cite, document);

      return document;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<LegalDocument | null> {
    try {
      await this.ensureAuthenticated();

      const response = await this.apiRequest(
        `/v1/documents/${encodeURIComponent(documentId)}`,
        { method: 'GET' }
      );

      const document = this.mapDocument(response);
      this.localCache.set(document.citation.cite, { data: document, cachedAt: Date.now() });
      await this.saveToDiskCache(document.citation.cite, document);

      return document;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get KeyCite analysis for a citation
   */
  async getKeyCite(citation: string): Promise<KeyCiteResult> {
    await this.ensureAuthenticated();

    const response = await this.apiRequest(
      `/v1/keycite/${encodeURIComponent(citation)}`,
      { method: 'GET' }
    );

    return {
      citation: response.citation,
      status: this.mapKeyCiteStatus(response.status),
      statusIcon: this.mapKeyCiteIcon(response.status),
      statusDescription: response.statusDescription || this.getStatusDescription(response.status),
      citingReferences: (response.citingReferences || []).map((ref: any) => ({
        citation: ref.citation,
        caseName: ref.caseName,
        court: ref.court,
        date: ref.date,
        depth: ref.depth || 1,
        headnoteNumbers: ref.headnoteNumbers,
        quotedText: ref.quotedText,
        treatment: ref.treatment
      })),
      negativeHistory: (response.negativeHistory || []).map((h: any) => ({
        citation: h.citation,
        caseName: h.caseName,
        action: h.action,
        court: h.court,
        date: h.date,
        description: h.description
      })),
      positiveHistory: (response.positiveHistory || []).map((h: any) => ({
        citation: h.citation,
        caseName: h.caseName,
        action: h.action,
        court: h.court,
        date: h.date
      })),
      relatedReferences: (response.relatedReferences || []).map((r: any) => ({
        citation: r.citation,
        title: r.title,
        type: r.type,
        relevance: r.relevance || 0
      })),
      totalCitingReferences: response.totalCitingReferences || 0,
      lastUpdated: new Date(response.lastUpdated || Date.now())
    };
  }

  /**
   * Search briefs
   */
  async searchBriefs(
    query: string,
    filters?: {
      court?: string[];
      briefType?: Brief['briefType'][];
      dateFrom?: string;
      dateTo?: string;
    },
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<Brief>> {
    await this.ensureAuthenticated();

    const payload: any = {
      query,
      documentTypes: ['brief'],
      page: options?.page || 1,
      pageSize: options?.pageSize || 25
    };

    if (filters) {
      payload.filters = {};
      if (filters.court) {
        payload.filters.court = filters.court;
      }
      if (filters.briefType) {
        payload.filters.briefType = filters.briefType;
      }
      if (filters.dateFrom) {
        payload.filters.dateFrom = filters.dateFrom;
      }
      if (filters.dateTo) {
        payload.filters.dateTo = filters.dateTo;
      }
    }

    const response = await this.apiRequest('/v1/briefs/search', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = response.results.map((r: any) => ({
      id: r.id,
      title: r.title,
      caseNumber: r.caseNumber,
      court: r.court,
      filingDate: r.filingDate,
      briefType: r.briefType,
      attorneys: r.attorneys || [],
      lawFirms: r.lawFirms || [],
      content: r.content
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
   * Get brief by ID
   */
  async getBrief(briefId: string): Promise<Brief | null> {
    try {
      await this.ensureAuthenticated();

      const response = await this.apiRequest(
        `/v1/briefs/${encodeURIComponent(briefId)}`,
        { method: 'GET' }
      );

      return {
        id: response.id,
        title: response.title,
        caseNumber: response.caseNumber,
        court: response.court,
        filingDate: response.filingDate,
        briefType: response.briefType,
        attorneys: response.attorneys || [],
        lawFirms: response.lawFirms || [],
        content: response.content
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get docket information
   */
  async getDocket(caseNumber: string, court: string): Promise<Docket | null> {
    try {
      await this.ensureAuthenticated();

      const response = await this.apiRequest(
        `/v1/dockets/${encodeURIComponent(court)}/${encodeURIComponent(caseNumber)}`,
        { method: 'GET' }
      );

      return {
        id: response.id,
        caseNumber: response.caseNumber,
        caseName: response.caseName,
        court: response.court,
        filingDate: response.filingDate,
        status: response.status,
        judge: response.judge,
        parties: {
          plaintiffs: response.parties?.plaintiffs || [],
          defendants: response.parties?.defendants || []
        },
        entries: (response.entries || []).map((e: any) => ({
          number: e.number,
          date: e.date,
          description: e.description,
          documentId: e.documentId,
          filedBy: e.filedBy
        }))
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search secondary sources
   */
  async searchSecondarySources(
    query: string,
    sourceType?: SecondarySource['type'],
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<SecondarySource>> {
    await this.ensureAuthenticated();

    const payload: any = {
      query,
      documentTypes: ['secondary'],
      page: options?.page || 1,
      pageSize: options?.pageSize || 25
    };

    if (sourceType) {
      payload.filters = { sourceType };
    }

    const response = await this.apiRequest('/v1/secondary/search', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = response.results.map((r: any) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      author: r.author,
      publication: r.publication,
      volume: r.volume,
      section: r.section,
      content: r.content,
      lastUpdated: r.lastUpdated
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
   * Browse Key Number System
   */
  async browseKeyNumbers(parentNumber?: string): Promise<KeyNumber[]> {
    await this.ensureAuthenticated();

    const params = parentNumber ? `?parent=${encodeURIComponent(parentNumber)}` : '';
    const response = await this.apiRequest(`/v1/keynumbers${params}`, { method: 'GET' });

    return (response.keyNumbers || []).map((k: any) => ({
      number: k.number,
      topic: k.topic,
      description: k.description,
      hierarchy: k.hierarchy || []
    }));
  }

  /**
   * Search by Key Number
   */
  async searchByKeyNumber(
    keyNumber: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<LegalCitation>> {
    await this.ensureAuthenticated();

    const payload = {
      keyNumber,
      page: options?.page || 1,
      pageSize: options?.pageSize || 25
    };

    const response = await this.apiRequest('/v1/keynumbers/search', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = response.results.map((r: any) => this.mapCitation(r));

    return {
      results,
      totalResults: response.totalResults,
      page: response.page,
      pageSize: response.pageSize,
      hasMore: response.page * response.pageSize < response.totalResults
    };
  }

  /**
   * Sync documents to local cache
   */
  async syncToLocal(citations: string[]): Promise<{ synced: number; failed: number; errors: Array<{ cite: string; error: string }> }> {
    let synced = 0;
    let failed = 0;
    const errors: Array<{ cite: string; error: string }> = [];

    for (const cite of citations) {
      try {
        const doc = await this.getCitation(cite);
        if (doc) {
          await this.saveToDiskCache(cite, doc);
          synced++;
        } else {
          failed++;
          errors.push({ cite, error: 'Not found' });
        }
      } catch (error: any) {
        failed++;
        errors.push({ cite, error: error.message });
      }
    }

    this.emit('syncComplete', { synced, failed });
    return { synced, failed, errors };
  }

  /**
   * Get from cache only (offline mode)
   */
  async getFromCache(cite: string): Promise<LegalDocument | null> {
    // Check memory first
    const memoryCached = this.localCache.get(cite);
    if (memoryCached) {
      return memoryCached.data;
    }

    // Check disk
    return await this.loadFromDiskCache(cite);
  }

  /**
   * List cached documents
   */
  async listCachedDocuments(): Promise<string[]> {
    if (!this.cacheDir) {
      return [];
    }

    if (isBrowser) {
      // List from localStorage
      const prefix = 'westlaw_';
      return Object.keys(localStorage)
        .filter(k => k.startsWith(prefix))
        .map(k => k.replace(prefix, '').replace(/_/g, ' '));
    }
    // Server-side listing handled by backend
    return [];
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.localCache.clear();

    if (this.cacheDir && isBrowser) {
      // Clear from localStorage
      const prefix = 'westlaw_';
      Object.keys(localStorage)
        .filter(k => k.startsWith(prefix))
        .forEach(k => localStorage.removeItem(k));
    }

    this.emit('cacheCleared');
  }

  // ==================== Private Methods ====================

  private async ensureAuthenticated(): Promise<void> {
    if (!this.config) {
      throw new Error('Westlaw connector not configured');
    }

    if (this.accessToken && this.tokenExpiresAt > Date.now() + 60000) {
      return;
    }

    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config!.clientId
    });

    if (this.config!.clientSecret) {
      body.set('client_secret', this.config!.clientSecret);
    }

    const response = await this.httpRequest(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': this.config!.apiKey
      },
      body: body.toString()
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
      'X-API-Key': this.config!.apiKey,
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
    if (filters.keyNumber?.length) {
      result.keyNumber = filters.keyNumber;
    }
    if (filters.topic?.length) {
      result.topic = filters.topic;
    }
    if (filters.judge) {
      result.judge = filters.judge;
    }
    if (filters.attorney) {
      result.attorney = filters.attorney;
    }
    if (filters.documentType?.length) {
      result.documentType = filters.documentType;
    }

    return result;
  }

  private mapCitation(data: any): LegalCitation {
    return {
      cite: data.cite || data.citation,
      title: data.title || data.caseName,
      court: data.court,
      date: data.date || data.decisionDate,
      jurisdiction: data.jurisdiction,
      parallelCitations: data.parallelCitations,
      reporterVolume: data.reporterVolume,
      reporterPage: data.reporterPage,
      reporter: data.reporter
    };
  }

  private mapDocument(data: any): LegalDocument {
    return {
      id: data.id || data.documentId,
      citation: this.mapCitation(data),
      content: data.content || data.fullText || '',
      headnotes: (data.headnotes || []).map((h: any, i: number) => ({
        number: h.number || i + 1,
        text: h.text,
        keyNumbers: h.keyNumbers || [],
        topics: h.topics || []
      })),
      keyNumbers: (data.keyNumbers || []).map((k: any) => ({
        number: k.number,
        topic: k.topic,
        description: k.description,
        hierarchy: k.hierarchy || []
      })),
      synopsis: data.synopsis,
      judges: data.judges,
      attorneys: data.attorneys,
      disposition: data.disposition,
      procedureHistory: data.procedureHistory,
      relatedDocuments: data.relatedDocuments,
      cachedLocally: true
    };
  }

  private mapKeyCiteStatus(status: string): KeyCiteResult['status'] {
    const statusMap: Record<string, KeyCiteResult['status']> = {
      'good': 'good',
      'positive': 'good',
      'caution': 'caution',
      'yellow': 'caution',
      'negative': 'negative',
      'red': 'negative',
      'overruled': 'negative'
    };
    return statusMap[status?.toLowerCase()] || 'unknown';
  }

  private mapKeyCiteIcon(status: string): KeyCiteResult['statusIcon'] {
    const iconMap: Record<string, KeyCiteResult['statusIcon']> = {
      'good': 'green',
      'positive': 'green',
      'caution': 'yellow',
      'yellow': 'yellow',
      'negative': 'red',
      'red': 'red',
      'overruled': 'red'
    };
    return iconMap[status?.toLowerCase()] || 'none';
  }

  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      'good': 'Positive treatment - Good law',
      'caution': 'Some negative treatment - Use with caution',
      'negative': 'Negative treatment - May no longer be good law',
      'unknown': 'No treatment information available'
    };
    return descriptions[status?.toLowerCase()] || descriptions.unknown;
  }

  private ensureCacheDir(): void {
    // Browser environment uses localStorage instead of filesystem
    if (isBrowser || !this.cacheDir) return;
    // Server-side caching would be handled by backend service
  }

  private async saveToDiskCache(cite: string, document: LegalDocument): Promise<void> {
    if (!this.cacheDir) return;

    if (isBrowser) {
      // Use localStorage for browser caching
      const key = `westlaw_${this.sanitizeFilename(cite)}`;
      try {
        localStorage.setItem(key, JSON.stringify(document));
      } catch (error) {
        this.emit('warning', { message: 'Failed to save to browser cache', cite, error });
      }
      return;
    }
    // Server-side disk caching handled by backend
  }

  private async loadFromDiskCache(cite: string): Promise<LegalDocument | null> {
    if (!this.cacheDir) return null;

    if (isBrowser) {
      // Use localStorage for browser caching
      const key = `westlaw_${this.sanitizeFilename(cite)}`;
      try {
        const content = localStorage.getItem(key);
        return content ? JSON.parse(content) : null;
      } catch {
        return null;
      }
    }
    // Server-side disk caching handled by backend
    return null;
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const westlawConnector = new WestlawConnector();
export default WestlawConnector;
