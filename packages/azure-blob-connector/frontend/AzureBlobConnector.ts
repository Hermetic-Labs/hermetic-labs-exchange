/**
 * Azure Blob Storage Connector
 *
 * Provides integration with Azure Blob Storage for object storage operations.
 * Implements Azure Storage Shared Key authentication.
 */

import { EventEmitter } from './EventEmitter';
import crypto from '../../_shared/crypto';
import { Buffer } from '../../_shared/Buffer';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AzureBlobConfig {
  accountName: string;
  accountKey: string;
  containerName: string;
  endpoint?: string;
  sasToken?: string;
  useSAS?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface AzureBlob {
  name: string;
  size: number;
  lastModified: Date;
  contentType: string;
  etag?: string;
  blobType?: 'BlockBlob' | 'PageBlob' | 'AppendBlob';
  accessTier?: string;
  metadata?: Record<string, string>;
}

export interface ListBlobsOptions {
  prefix?: string;
  delimiter?: string;
  maxResults?: number;
  marker?: string;
  includeMetadata?: boolean;
  includeSnapshots?: boolean;
}

export interface ListBlobsResult {
  blobs: AzureBlob[];
  prefixes: string[];
  nextMarker?: string;
}

export interface PutBlobOptions {
  contentType?: string;
  contentEncoding?: string;
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  accessTier?: 'Hot' | 'Cool' | 'Archive';
  blobType?: 'BlockBlob' | 'PageBlob' | 'AppendBlob';
}

export interface GetBlobResult {
  data: Buffer;
  contentType?: string;
  contentLength: number;
  etag: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export interface CopyBlobOptions {
  metadata?: Record<string, string>;
  accessTier?: string;
}

export interface SASTokenOptions {
  permissions: string; // r=read, w=write, d=delete, l=list
  expiryTime: Date;
  startTime?: Date;
  contentType?: string;
  contentDisposition?: string;
}

export interface BlockInfo {
  blockId: string;
  size: number;
}

// ============================================================================
// Azure Blob Connector
// ============================================================================

export class AzureBlobConnector extends EventEmitter {
  private config: AzureBlobConfig | null = null;
  private isConnected: boolean = false;

  constructor() {
    super();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  configure(config: AzureBlobConfig): void {
    this.validateConfig(config);
    this.config = {
      ...config,
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30000,
      useSAS: config.useSAS ?? false
    };
    this.isConnected = false;
    this.emit('configured', { accountName: config.accountName, containerName: config.containerName });
  }

  private validateConfig(config: AzureBlobConfig): void {
    if (!config.accountName) {
      throw new Error('Azure accountName is required');
    }
    if (!config.accountKey && !config.sasToken) {
      throw new Error('Azure accountKey or sasToken is required');
    }
    if (!config.containerName) {
      throw new Error('Azure containerName is required');
    }
  }

  getConfig(): AzureBlobConfig | null {
    return this.config;
  }

  // ============================================================================
  // Connection
  // ============================================================================

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    try {
      // Try to get container properties to verify access
      const response = await this.makeRequest('GET', '', undefined, { restype: 'container' });

      this.isConnected = response.ok || response.status === 200;

      if (this.isConnected) {
        this.emit('connected', { containerName: this.config.containerName });
      }

      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      this.emit('error', { operation: 'testConnection', error });
      return false;
    }
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // ============================================================================
  // Blob Operations
  // ============================================================================

  async listBlobs(options: ListBlobsOptions = {}): Promise<ListBlobsResult> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    const queryParams: Record<string, string> = {
      restype: 'container',
      comp: 'list'
    };

    if (options.prefix) queryParams.prefix = options.prefix;
    if (options.delimiter) queryParams.delimiter = options.delimiter;
    if (options.maxResults) queryParams.maxresults = options.maxResults.toString();
    if (options.marker) queryParams.marker = options.marker;

    const includes: string[] = [];
    if (options.includeMetadata) includes.push('metadata');
    if (options.includeSnapshots) includes.push('snapshots');
    if (includes.length > 0) queryParams.include = includes.join(',');

    try {
      const response = await this.makeRequest('GET', '', undefined, queryParams);

      if (!response.ok) {
        throw new Error(`Failed to list blobs: ${response.status}`);
      }

      const xml = await response.text();
      const result = this.parseListBlobsResponse(xml);

      this.emit('listBlobs', {
        prefix: options.prefix,
        count: result.blobs.length
      });

      return result;
    } catch (error) {
      this.emit('error', { operation: 'listBlobs', error });
      throw error;
    }
  }

  async listAllBlobs(prefix?: string): Promise<AzureBlob[]> {
    const allBlobs: AzureBlob[] = [];
    let marker: string | undefined;

    do {
      const result = await this.listBlobs({
        prefix,
        marker,
        maxResults: 5000
      });

      allBlobs.push(...result.blobs);
      marker = result.nextMarker;
    } while (marker);

    return allBlobs;
  }

  async getBlob(name: string): Promise<GetBlobResult | null> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    try {
      const response = await this.makeRequest('GET', name);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get blob: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = Buffer.from(arrayBuffer);

      const result: GetBlobResult = {
        data,
        contentType: response.headers.get('content-type') || undefined,
        contentLength: parseInt(response.headers.get('content-length') || '0', 10),
        etag: response.headers.get('etag')?.replace(/"/g, '') || '',
        lastModified: new Date(response.headers.get('last-modified') || Date.now()),
        metadata: this.extractMetadata(response.headers)
      };

      this.emit('getBlob', { name, size: result.contentLength });

      return result;
    } catch (error) {
      this.emit('error', { operation: 'getBlob', name, error });
      throw error;
    }
  }

  async getBlobAsStream(name: string): Promise<ReadableStream<Uint8Array> | null> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    try {
      const response = await this.makeRequest('GET', name);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get blob stream: ${response.status}`);
      }

      return response.body;
    } catch (error) {
      this.emit('error', { operation: 'getBlobAsStream', name, error });
      throw error;
    }
  }

  async putBlob(name: string, data: Buffer, options: PutBlobOptions = {}): Promise<string> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    const blobType = options.blobType || 'BlockBlob';

    const headers: Record<string, string> = {
      'Content-Type': options.contentType || 'application/octet-stream',
      'Content-Length': data.length.toString(),
      'x-ms-blob-type': blobType
    };

    if (options.contentEncoding) headers['Content-Encoding'] = options.contentEncoding;
    if (options.cacheControl) headers['Cache-Control'] = options.cacheControl;
    if (options.contentDisposition) headers['Content-Disposition'] = options.contentDisposition;
    if (options.accessTier) headers['x-ms-access-tier'] = options.accessTier;

    // Add custom metadata
    if (options.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-ms-meta-${k}`] = v;
      }
    }

    try {
      const response = await this.makeRequest('PUT', name, data, {}, headers);

      if (!response.ok) {
        throw new Error(`Failed to put blob: ${response.status}`);
      }

      const etag = response.headers.get('etag')?.replace(/"/g, '') || '';

      this.emit('putBlob', { name, size: data.length, etag });

      return etag;
    } catch (error) {
      this.emit('error', { operation: 'putBlob', name, error });
      throw error;
    }
  }

  async deleteBlob(name: string, deleteSnapshots: boolean = true): Promise<boolean> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    const headers: Record<string, string> = {};
    if (deleteSnapshots) {
      headers['x-ms-delete-snapshots'] = 'include';
    }

    try {
      const response = await this.makeRequest('DELETE', name, undefined, {}, headers);

      // 202 Accepted is success for DELETE
      const success = response.ok || response.status === 202;

      if (success) {
        this.emit('deleteBlob', { name });
      }

      return success;
    } catch (error) {
      this.emit('error', { operation: 'deleteBlob', name, error });
      throw error;
    }
  }

  async blobExists(name: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    try {
      const response = await this.makeRequest('HEAD', name);
      return response.ok || response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async headBlob(name: string): Promise<AzureBlob | null> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    try {
      const response = await this.makeRequest('HEAD', name);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to head blob: ${response.status}`);
      }

      return {
        name,
        size: parseInt(response.headers.get('content-length') || '0', 10),
        lastModified: new Date(response.headers.get('last-modified') || Date.now()),
        contentType: response.headers.get('content-type') || 'application/octet-stream',
        etag: response.headers.get('etag')?.replace(/"/g, '') || '',
        blobType: response.headers.get('x-ms-blob-type') as AzureBlob['blobType'],
        accessTier: response.headers.get('x-ms-access-tier') || undefined,
        metadata: this.extractMetadata(response.headers)
      };
    } catch (error) {
      this.emit('error', { operation: 'headBlob', name, error });
      throw error;
    }
  }

  async copyBlob(sourceBlob: string, destBlob: string, options: CopyBlobOptions = {}): Promise<string> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    const sourceUrl = this.getBlobUrl(sourceBlob);

    const headers: Record<string, string> = {
      'x-ms-copy-source': sourceUrl
    };

    if (options.accessTier) {
      headers['x-ms-access-tier'] = options.accessTier;
    }

    if (options.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-ms-meta-${k}`] = v;
      }
    }

    try {
      const response = await this.makeRequest('PUT', destBlob, undefined, {}, headers);

      if (!response.ok) {
        throw new Error(`Failed to copy blob: ${response.status}`);
      }

      const copyId = response.headers.get('x-ms-copy-id') || '';

      this.emit('copyBlob', { sourceBlob, destBlob, copyId });

      return copyId;
    } catch (error) {
      this.emit('error', { operation: 'copyBlob', sourceBlob, destBlob, error });
      throw error;
    }
  }

  async setAccessTier(name: string, tier: 'Hot' | 'Cool' | 'Archive'): Promise<boolean> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    try {
      const response = await this.makeRequest('PUT', name, undefined, { comp: 'tier' }, {
        'x-ms-access-tier': tier
      });

      const success = response.ok || response.status === 200 || response.status === 202;

      if (success) {
        this.emit('setAccessTier', { name, tier });
      }

      return success;
    } catch (error) {
      this.emit('error', { operation: 'setAccessTier', name, error });
      throw error;
    }
  }

  // ============================================================================
  // Block Blob Operations
  // ============================================================================

  async stageBlock(blobName: string, blockId: string, data: Buffer): Promise<boolean> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    const base64BlockId = Buffer.from(blockId).toString('base64');

    try {
      const response = await this.makeRequest('PUT', blobName, data, {
        comp: 'block',
        blockid: base64BlockId
      }, {
        'Content-Length': data.length.toString()
      });

      const success = response.ok || response.status === 201;

      if (success) {
        this.emit('blockStaged', { blobName, blockId, size: data.length });
      }

      return success;
    } catch (error) {
      this.emit('error', { operation: 'stageBlock', blobName, blockId, error });
      throw error;
    }
  }

  async commitBlockList(blobName: string, blocks: BlockInfo[], options: PutBlobOptions = {}): Promise<string> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    // Build block list XML
    const blockListXml = blocks.map(b => {
      const base64Id = Buffer.from(b.blockId).toString('base64');
      return `<Latest>${base64Id}</Latest>`;
    }).join('');

    const body = `<?xml version="1.0" encoding="utf-8"?><BlockList>${blockListXml}</BlockList>`;
    const bodyBuffer = Buffer.from(body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/xml',
      'Content-Length': bodyBuffer.length.toString()
    };

    if (options.contentType) headers['x-ms-blob-content-type'] = options.contentType;
    if (options.contentEncoding) headers['x-ms-blob-content-encoding'] = options.contentEncoding;
    if (options.cacheControl) headers['x-ms-blob-cache-control'] = options.cacheControl;

    if (options.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-ms-meta-${k}`] = v;
      }
    }

    try {
      const response = await this.makeRequest('PUT', blobName, bodyBuffer, { comp: 'blocklist' }, headers);

      if (!response.ok) {
        throw new Error(`Failed to commit block list: ${response.status}`);
      }

      const etag = response.headers.get('etag')?.replace(/"/g, '') || '';

      this.emit('blockListCommitted', { blobName, blockCount: blocks.length, etag });

      return etag;
    } catch (error) {
      this.emit('error', { operation: 'commitBlockList', blobName, error });
      throw error;
    }
  }

  // ============================================================================
  // SAS Token Generation
  // ============================================================================

  generateSASToken(blobName: string, options: SASTokenOptions): string {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    if (!this.config.accountKey) {
      throw new Error('Account key required for SAS token generation');
    }

    const startTime = options.startTime || new Date();
    const expiryTime = options.expiryTime;

    const formatDate = (d: Date) => d.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(0, 17) + 'Z';

    const signedPermissions = options.permissions;
    const signedStart = formatDate(startTime);
    const signedExpiry = formatDate(expiryTime);
    const canonicalizedResource = `/blob/${this.config.accountName}/${this.config.containerName}/${blobName}`;
    const signedIdentifier = '';
    const signedIP = '';
    const signedProtocol = 'https';
    const signedVersion = '2020-12-06';
    const signedResource = 'b'; // blob

    // String to sign
    const stringToSign = [
      signedPermissions,
      signedStart,
      signedExpiry,
      canonicalizedResource,
      signedIdentifier,
      signedIP,
      signedProtocol,
      signedVersion,
      signedResource,
      '', // snapshot time
      '', // encryption scope
      options.cacheControl || '',
      options.contentDisposition || '',
      '', // content encoding
      '', // content language
      options.contentType || ''
    ].join('\n');

    // Calculate signature
    const signature = crypto.createHmac('sha256', Buffer.from(this.config.accountKey, 'base64'))
      .update(stringToSign, 'utf8')
      .digest('base64');

    // Build query string
    const queryParams = new URLSearchParams({
      sv: signedVersion,
      sr: signedResource,
      sp: signedPermissions,
      st: signedStart,
      se: signedExpiry,
      spr: signedProtocol,
      sig: signature
    });

    if (options.contentType) queryParams.set('rsct', options.contentType);
    if (options.contentDisposition) queryParams.set('rscd', options.contentDisposition);

    return queryParams.toString();
  }

  generateSASUrl(blobName: string, options: SASTokenOptions): string {
    const sasToken = this.generateSASToken(blobName, options);
    const blobUrl = this.getBlobUrl(blobName);
    return `${blobUrl}?${sasToken}`;
  }

  // ============================================================================
  // Azure Shared Key Authentication
  // ============================================================================

  private async makeRequest(
    method: string,
    blobName: string,
    body?: Buffer,
    queryParams: Record<string, string> = {},
    additionalHeaders: Record<string, string> = {}
  ): Promise<Response> {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    const now = new Date();
    const dateHeader = now.toUTCString();

    const host = this.getHost();
    const path = blobName ? `/${this.config.containerName}/${encodeURIComponent(blobName)}` : `/${this.config.containerName}`;

    // Build query string
    const queryString = Object.keys(queryParams)
      .sort()
      .map(k => `${k}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    // Build headers
    const headers: Record<string, string> = {
      'x-ms-date': dateHeader,
      'x-ms-version': '2020-12-06',
      ...additionalHeaders
    };

    if (body) {
      headers['Content-Length'] = body.length.toString();
    }

    // Generate authorization if using account key
    if (this.config.accountKey && !this.config.useSAS) {
      const authorization = this.generateSharedKeyAuthorization(method, path, queryParams, headers);
      headers['Authorization'] = authorization;
    }

    // Build URL
    let url = `https://${host}${path}`;
    if (queryString) {
      url += `?${queryString}`;
    }

    // Add SAS token if configured
    if (this.config.sasToken && this.config.useSAS) {
      url += (queryString ? '&' : '?') + this.config.sasToken;
    }

    // Make request with retry
    let lastError: Error | null = null;
    const maxRetries = this.config.maxRetries || 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);

        const response = await fetch(url, {
          method,
          headers,
          body: body as any,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 100);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 100);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private generateSharedKeyAuthorization(
    method: string,
    path: string,
    queryParams: Record<string, string>,
    headers: Record<string, string>
  ): string {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    // Build canonicalized headers
    const msHeaders = Object.keys(headers)
      .filter(k => k.toLowerCase().startsWith('x-ms-'))
      .sort()
      .map(k => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join('\n');

    // Build canonicalized resource
    let canonicalizedResource = `/${this.config.accountName}${path}`;

    // Add sorted query params
    const sortedParams = Object.keys(queryParams).sort();
    for (const param of sortedParams) {
      canonicalizedResource += `\n${param.toLowerCase()}:${queryParams[param]}`;
    }

    // String to sign
    const contentLength = headers['Content-Length'] || '';
    const contentType = headers['Content-Type'] || '';

    const stringToSign = [
      method,
      '', // Content-Encoding
      '', // Content-Language
      method === 'GET' || method === 'HEAD' ? '' : contentLength, // Content-Length
      '', // Content-MD5
      contentType,
      '', // Date (use x-ms-date instead)
      '', // If-Modified-Since
      '', // If-Match
      '', // If-None-Match
      '', // If-Unmodified-Since
      '', // Range
      msHeaders,
      canonicalizedResource
    ].join('\n');

    // Calculate signature
    const signature = crypto.createHmac('sha256', Buffer.from(this.config.accountKey!, 'base64'))
      .update(stringToSign, 'utf8')
      .digest('base64');

    return `SharedKey ${this.config.accountName}:${signature}`;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getHost(): string {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    if (this.config.endpoint) {
      return new URL(this.config.endpoint).host;
    }

    return `${this.config.accountName}.blob.core.windows.net`;
  }

  private getBlobUrl(blobName: string): string {
    if (!this.config) {
      throw new Error('Azure Blob connector not configured');
    }

    const host = this.getHost();
    return `https://${host}/${this.config.containerName}/${encodeURIComponent(blobName)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractMetadata(headers: Headers): Record<string, string> {
    const metadata: Record<string, string> = {};
    headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('x-ms-meta-')) {
        const metaKey = key.substring(10);
        metadata[metaKey] = value;
      }
    });
    return metadata;
  }

  private parseListBlobsResponse(xml: string): ListBlobsResult {
    const blobs: AzureBlob[] = [];
    const prefixes: string[] = [];

    // Parse blobs
    const blobRegex = /<Blob>([\s\S]*?)<\/Blob>/g;
    let match;
    while ((match = blobRegex.exec(xml)) !== null) {
      const blobXml = match[1];
      const name = this.extractXmlValue(blobXml, 'Name');
      const propertiesMatch = blobXml.match(/<Properties>([\s\S]*?)<\/Properties>/);
      const properties = propertiesMatch ? propertiesMatch[1] : '';

      const size = parseInt(this.extractXmlValue(properties, 'Content-Length') || '0', 10);
      const lastModified = new Date(this.extractXmlValue(properties, 'Last-Modified') || '');
      const contentType = this.extractXmlValue(properties, 'Content-Type') || 'application/octet-stream';
      const etag = this.extractXmlValue(properties, 'Etag')?.replace(/"/g, '');
      const blobType = this.extractXmlValue(properties, 'BlobType') as AzureBlob['blobType'];
      const accessTier = this.extractXmlValue(properties, 'AccessTier');

      if (name) {
        blobs.push({ name, size, lastModified, contentType, etag, blobType, accessTier });
      }
    }

    // Parse blob prefixes (virtual directories)
    const prefixRegex = /<BlobPrefix>[\s\S]*?<Name>([^<]+)<\/Name>[\s\S]*?<\/BlobPrefix>/g;
    while ((match = prefixRegex.exec(xml)) !== null) {
      prefixes.push(match[1]);
    }

    // Get next marker
    const nextMarker = this.extractXmlValue(xml, 'NextMarker') || undefined;

    return {
      blobs,
      prefixes,
      nextMarker
    };
  }

  private extractXmlValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
  }
}

// Global instance
export const azureBlobConnector = new AzureBlobConnector();
export default AzureBlobConnector;
