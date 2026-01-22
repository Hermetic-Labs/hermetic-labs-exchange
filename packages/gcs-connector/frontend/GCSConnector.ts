/**
 * Google Cloud Storage Connector
 *
 * Provides integration with Google Cloud Storage for object storage operations.
 * Implements OAuth 2.0 service account authentication with JWT.
 */

import { EventEmitter } from './EventEmitter';
import crypto from '../../_shared/crypto';
import { Buffer } from '../../_shared/Buffer';

// ============================================================================
// Type Definitions
// ============================================================================

export interface GCSConfig {
  projectId: string;
  credentials: string | ServiceAccountCredentials;
  bucket: string;
  accessToken?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

export interface GCSObject {
  name: string;
  size: number;
  updated: Date;
  contentType: string;
  etag?: string;
  generation?: string;
  storageClass?: string;
  metadata?: Record<string, string>;
  md5Hash?: string;
  crc32c?: string;
}

export interface ListObjectsOptions {
  prefix?: string;
  delimiter?: string;
  maxResults?: number;
  pageToken?: string;
  versions?: boolean;
}

export interface ListObjectsResult {
  objects: GCSObject[];
  prefixes: string[];
  nextPageToken?: string;
}

export interface UploadOptions {
  contentType?: string;
  contentEncoding?: string;
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  storageClass?: 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
  predefinedAcl?: 'authenticatedRead' | 'bucketOwnerFullControl' | 'bucketOwnerRead' | 'private' | 'projectPrivate' | 'publicRead';
}

export interface GetObjectResult {
  data: Buffer;
  contentType?: string;
  contentLength: number;
  etag: string;
  updated: Date;
  metadata?: Record<string, string>;
  generation?: string;
}

export interface CopyObjectOptions {
  metadata?: Record<string, string>;
  storageClass?: string;
}

export interface SignedUrlOptions {
  action: 'read' | 'write' | 'delete' | 'resumable';
  expires: Date;
  contentType?: string;
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface ResumableUploadSession {
  uploadUri: string;
  objectName: string;
  contentType: string;
}

// ============================================================================
// GCS Connector
// ============================================================================

export class GCSConnector extends EventEmitter {
  private config: GCSConfig | null = null;
  private credentials: ServiceAccountCredentials | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private isConnected: boolean = false;

  private readonly API_BASE = 'https://storage.googleapis.com';
  private readonly UPLOAD_BASE = 'https://storage.googleapis.com/upload/storage/v1';
  private readonly TOKEN_URI = 'https://oauth2.googleapis.com/token';

  constructor() {
    super();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  configure(config: GCSConfig): void {
    this.validateConfig(config);

    // Parse credentials if string
    if (typeof config.credentials === 'string') {
      try {
        this.credentials = JSON.parse(config.credentials) as ServiceAccountCredentials;
      } catch {
        throw new Error('Invalid credentials JSON string');
      }
    } else {
      this.credentials = config.credentials;
    }

    this.config = {
      ...config,
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30000
    };

    if (config.accessToken) {
      this.accessToken = config.accessToken;
    }

    this.isConnected = false;
    this.emit('configured', { projectId: config.projectId, bucket: config.bucket });
  }

  private validateConfig(config: GCSConfig): void {
    if (!config.projectId) {
      throw new Error('GCS projectId is required');
    }
    if (!config.credentials && !config.accessToken) {
      throw new Error('GCS credentials or accessToken is required');
    }
    if (!config.bucket) {
      throw new Error('GCS bucket is required');
    }
  }

  getConfig(): GCSConfig | null {
    return this.config;
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  private async getAccessToken(): Promise<string> {
    // Return existing token if still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    // Use configured access token if available
    if (this.config?.accessToken) {
      this.accessToken = this.config.accessToken;
      return this.accessToken;
    }

    if (!this.credentials) {
      throw new Error('No credentials configured');
    }

    // Generate JWT for service account
    const jwt = this.generateJWT();

    // Exchange JWT for access token
    const response = await fetch(this.TOKEN_URI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status}`);
    }

    const tokenData = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in - 60) * 1000); // Refresh 60s early

    return this.accessToken;
  }

  private generateJWT(): string {
    if (!this.credentials) {
      throw new Error('No credentials configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: this.credentials.private_key_id
    };

    const payload = {
      iss: this.credentials.client_email,
      sub: this.credentials.client_email,
      aud: this.TOKEN_URI,
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/devstorage.full_control'
    };

    const headerB64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadB64 = this.base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${headerB64}.${payloadB64}`;

    // Sign with private key
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(this.credentials.private_key);
    const signatureB64 = this.base64UrlEncode(signature);

    return `${signatureInput}.${signatureB64}`;
  }

  private base64UrlEncode(data: string | Buffer): string {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    return buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // ============================================================================
  // Connection
  // ============================================================================

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    try {
      // Try to get bucket metadata to verify access
      const response = await this.makeRequest('GET', '', undefined, {});

      this.isConnected = response.ok || response.status === 200;

      if (this.isConnected) {
        this.emit('connected', { bucket: this.config.bucket });
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
  // Object Operations
  // ============================================================================

  async listObjects(options: ListObjectsOptions = {}): Promise<ListObjectsResult> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    const queryParams: Record<string, string> = {};

    if (options.prefix) queryParams.prefix = options.prefix;
    if (options.delimiter) queryParams.delimiter = options.delimiter;
    if (options.maxResults) queryParams.maxResults = options.maxResults.toString();
    if (options.pageToken) queryParams.pageToken = options.pageToken;
    if (options.versions) queryParams.versions = 'true';

    try {
      const response = await this.makeRequest('GET', '', undefined, queryParams);

      if (!response.ok) {
        throw new Error(`Failed to list objects: ${response.status}`);
      }

      const data = await response.json() as {
        items?: Array<{
          name: string;
          size: string;
          updated: string;
          contentType: string;
          etag?: string;
          generation?: string;
          storageClass?: string;
          metadata?: Record<string, string>;
          md5Hash?: string;
          crc32c?: string;
        }>;
        prefixes?: string[];
        nextPageToken?: string;
      };

      const objects: GCSObject[] = (data.items || []).map(item => ({
        name: item.name,
        size: parseInt(item.size, 10),
        updated: new Date(item.updated),
        contentType: item.contentType,
        etag: item.etag,
        generation: item.generation,
        storageClass: item.storageClass,
        metadata: item.metadata,
        md5Hash: item.md5Hash,
        crc32c: item.crc32c
      }));

      const result: ListObjectsResult = {
        objects,
        prefixes: data.prefixes || [],
        nextPageToken: data.nextPageToken
      };

      this.emit('listObjects', {
        prefix: options.prefix,
        count: objects.length
      });

      return result;
    } catch (error) {
      this.emit('error', { operation: 'listObjects', error });
      throw error;
    }
  }

  async listAllObjects(prefix?: string): Promise<GCSObject[]> {
    const allObjects: GCSObject[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.listObjects({
        prefix,
        pageToken,
        maxResults: 1000
      });

      allObjects.push(...result.objects);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allObjects;
  }

  async getObject(name: string): Promise<GetObjectResult | null> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    try {
      const response = await this.makeRequest('GET', name, undefined, { alt: 'media' });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get object: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = Buffer.from(arrayBuffer);

      // Get metadata in separate request
      const metaResponse = await this.makeRequest('GET', name);
      const metadata = metaResponse.ok ? await metaResponse.json() as {
        contentType?: string;
        size?: string;
        etag?: string;
        updated?: string;
        metadata?: Record<string, string>;
        generation?: string;
      } : {};

      const result: GetObjectResult = {
        data,
        contentType: metadata.contentType || response.headers.get('content-type') || undefined,
        contentLength: data.length,
        etag: metadata.etag || response.headers.get('etag')?.replace(/"/g, '') || '',
        updated: new Date(metadata.updated || Date.now()),
        metadata: metadata.metadata,
        generation: metadata.generation
      };

      this.emit('getObject', { name, size: result.contentLength });

      return result;
    } catch (error) {
      this.emit('error', { operation: 'getObject', name, error });
      throw error;
    }
  }

  async getObjectAsStream(name: string): Promise<ReadableStream<Uint8Array> | null> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    try {
      const response = await this.makeRequest('GET', name, undefined, { alt: 'media' });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get object stream: ${response.status}`);
      }

      return response.body;
    } catch (error) {
      this.emit('error', { operation: 'getObjectAsStream', name, error });
      throw error;
    }
  }

  async putObject(name: string, data: Buffer, options: UploadOptions = {}): Promise<GCSObject> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    const contentType = options.contentType || 'application/octet-stream';

    const queryParams: Record<string, string> = {
      uploadType: 'media',
      name
    };

    if (options.predefinedAcl) queryParams.predefinedAcl = options.predefinedAcl;

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': data.length.toString()
    };

    if (options.contentEncoding) headers['Content-Encoding'] = options.contentEncoding;
    if (options.cacheControl) headers['x-goog-meta-Cache-Control'] = options.cacheControl;

    try {
      const token = await this.getAccessToken();

      const url = `${this.UPLOAD_BASE}/b/${encodeURIComponent(this.config.bucket)}/o?${new URLSearchParams(queryParams)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Authorization': `Bearer ${token}`
        },
        body: data as any
      });

      if (!response.ok) {
        throw new Error(`Failed to put object: ${response.status}`);
      }

      const result = await response.json() as {
        name: string;
        size: string;
        updated: string;
        contentType: string;
        etag?: string;
        generation?: string;
        storageClass?: string;
        metadata?: Record<string, string>;
      };

      const object: GCSObject = {
        name: result.name,
        size: parseInt(result.size, 10),
        updated: new Date(result.updated),
        contentType: result.contentType,
        etag: result.etag,
        generation: result.generation,
        storageClass: result.storageClass,
        metadata: result.metadata
      };

      this.emit('putObject', { name, size: data.length });

      return object;
    } catch (error) {
      this.emit('error', { operation: 'putObject', name, error });
      throw error;
    }
  }

  async deleteObject(name: string, generation?: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    const queryParams: Record<string, string> = {};
    if (generation) queryParams.generation = generation;

    try {
      const response = await this.makeRequest('DELETE', name, undefined, queryParams);

      // 204 No Content is success for DELETE
      const success = response.ok || response.status === 204;

      if (success) {
        this.emit('deleteObject', { name });
      }

      return success;
    } catch (error) {
      this.emit('error', { operation: 'deleteObject', name, error });
      throw error;
    }
  }

  async objectExists(name: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    try {
      const response = await this.makeRequest('GET', name);
      return response.ok || response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async headObject(name: string): Promise<GCSObject | null> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    try {
      const response = await this.makeRequest('GET', name);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get object metadata: ${response.status}`);
      }

      const data = await response.json() as {
        name: string;
        size: string;
        updated: string;
        contentType: string;
        etag?: string;
        generation?: string;
        storageClass?: string;
        metadata?: Record<string, string>;
        md5Hash?: string;
        crc32c?: string;
      };

      return {
        name: data.name,
        size: parseInt(data.size, 10),
        updated: new Date(data.updated),
        contentType: data.contentType,
        etag: data.etag,
        generation: data.generation,
        storageClass: data.storageClass,
        metadata: data.metadata,
        md5Hash: data.md5Hash,
        crc32c: data.crc32c
      };
    } catch (error) {
      this.emit('error', { operation: 'headObject', name, error });
      throw error;
    }
  }

  async copyObject(sourceName: string, destName: string, options: CopyObjectOptions = {}): Promise<GCSObject> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    const _queryParams: Record<string, string> = {};

    // Build metadata for the copy
    const body: Record<string, any> = {};
    if (options.metadata) body.metadata = options.metadata;
    if (options.storageClass) body.storageClass = options.storageClass;

    try {
      const token = await this.getAccessToken();

      const url = `${this.API_BASE}/storage/v1/b/${encodeURIComponent(this.config.bucket)}/o/${encodeURIComponent(sourceName)}/copyTo/b/${encodeURIComponent(this.config.bucket)}/o/${encodeURIComponent(destName)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(`Failed to copy object: ${response.status}`);
      }

      const result = await response.json() as {
        name: string;
        size: string;
        updated: string;
        contentType: string;
        etag?: string;
        generation?: string;
        storageClass?: string;
        metadata?: Record<string, string>;
      };

      const object: GCSObject = {
        name: result.name,
        size: parseInt(result.size, 10),
        updated: new Date(result.updated),
        contentType: result.contentType,
        etag: result.etag,
        generation: result.generation,
        storageClass: result.storageClass,
        metadata: result.metadata
      };

      this.emit('copyObject', { sourceName, destName });

      return object;
    } catch (error) {
      this.emit('error', { operation: 'copyObject', sourceName, destName, error });
      throw error;
    }
  }

  async updateMetadata(name: string, metadata: Record<string, string>): Promise<GCSObject> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    try {
      const token = await this.getAccessToken();

      const url = `${this.API_BASE}/storage/v1/b/${encodeURIComponent(this.config.bucket)}/o/${encodeURIComponent(name)}`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ metadata })
      });

      if (!response.ok) {
        throw new Error(`Failed to update metadata: ${response.status}`);
      }

      const result = await response.json() as {
        name: string;
        size: string;
        updated: string;
        contentType: string;
        etag?: string;
        generation?: string;
        storageClass?: string;
        metadata?: Record<string, string>;
      };

      return {
        name: result.name,
        size: parseInt(result.size, 10),
        updated: new Date(result.updated),
        contentType: result.contentType,
        etag: result.etag,
        generation: result.generation,
        storageClass: result.storageClass,
        metadata: result.metadata
      };
    } catch (error) {
      this.emit('error', { operation: 'updateMetadata', name, error });
      throw error;
    }
  }

  // ============================================================================
  // Resumable Upload
  // ============================================================================

  async createResumableUpload(name: string, options: UploadOptions = {}): Promise<ResumableUploadSession> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    const contentType = options.contentType || 'application/octet-stream';

    const metadata: Record<string, any> = {
      name,
      contentType
    };

    if (options.metadata) metadata.metadata = options.metadata;
    if (options.storageClass) metadata.storageClass = options.storageClass;
    if (options.cacheControl) metadata.cacheControl = options.cacheControl;

    try {
      const token = await this.getAccessToken();

      const url = `${this.UPLOAD_BASE}/b/${encodeURIComponent(this.config.bucket)}/o?uploadType=resumable`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': contentType
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error(`Failed to create resumable upload: ${response.status}`);
      }

      const uploadUri = response.headers.get('location');
      if (!uploadUri) {
        throw new Error('No upload URI returned');
      }

      const session: ResumableUploadSession = {
        uploadUri,
        objectName: name,
        contentType
      };

      this.emit('resumableUploadCreated', { name, uploadUri });

      return session;
    } catch (error) {
      this.emit('error', { operation: 'createResumableUpload', name, error });
      throw error;
    }
  }

  async uploadResumableChunk(
    uploadUri: string,
    data: Buffer,
    offset: number,
    totalSize: number
  ): Promise<{ complete: boolean; nextOffset?: number; object?: GCSObject }> {
    const endOffset = offset + data.length - 1;
    const contentRange = totalSize > 0
      ? `bytes ${offset}-${endOffset}/${totalSize}`
      : `bytes ${offset}-${endOffset}/*`;

    try {
      const response = await fetch(uploadUri, {
        method: 'PUT',
        headers: {
          'Content-Length': data.length.toString(),
          'Content-Range': contentRange
        },
        body: data as any
      });

      if (response.status === 308) {
        // Incomplete - need to continue
        const range = response.headers.get('range');
        const nextOffset = range ? parseInt(range.split('-')[1], 10) + 1 : offset + data.length;

        return { complete: false, nextOffset };
      }

      if (!response.ok) {
        throw new Error(`Failed to upload chunk: ${response.status}`);
      }

      // Upload complete
      const result = await response.json() as {
        name: string;
        size: string;
        updated: string;
        contentType: string;
        etag?: string;
        generation?: string;
      };

      const object: GCSObject = {
        name: result.name,
        size: parseInt(result.size, 10),
        updated: new Date(result.updated),
        contentType: result.contentType,
        etag: result.etag,
        generation: result.generation
      };

      this.emit('resumableUploadCompleted', { name: object.name });

      return { complete: true, object };
    } catch (error) {
      this.emit('error', { operation: 'uploadResumableChunk', error });
      throw error;
    }
  }

  // ============================================================================
  // Signed URLs
  // ============================================================================

  generateSignedUrl(name: string, options: SignedUrlOptions): string {
    if (!this.config || !this.credentials) {
      throw new Error('GCS connector not configured with service account credentials');
    }

    const now = new Date();
    const expiry = options.expires;
    const expiresIn = Math.floor((expiry.getTime() - now.getTime()) / 1000);

    const httpMethod = {
      read: 'GET',
      write: 'PUT',
      delete: 'DELETE',
      resumable: 'POST'
    }[options.action];

    const host = 'storage.googleapis.com';
    const path = `/${this.config.bucket}/${encodeURIComponent(name)}`;

    const credentialScope = `${this.formatDate(now)}/auto/storage/goog4_request`;
    const credential = `${this.credentials.client_email}/${credentialScope}`;

    const queryParams: Record<string, string> = {
      'X-Goog-Algorithm': 'GOOG4-RSA-SHA256',
      'X-Goog-Credential': credential,
      'X-Goog-Date': this.formatGoogleDate(now),
      'X-Goog-Expires': expiresIn.toString(),
      'X-Goog-SignedHeaders': 'host'
    };

    if (options.responseContentType) {
      queryParams['response-content-type'] = options.responseContentType;
    }
    if (options.responseContentDisposition) {
      queryParams['response-content-disposition'] = options.responseContentDisposition;
    }

    // Build canonical request
    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalRequest = [
      httpMethod,
      path,
      canonicalQueryString,
      `host:${host}`,
      '',
      'host',
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    // Build string to sign
    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const stringToSign = [
      'GOOG4-RSA-SHA256',
      this.formatGoogleDate(now),
      credentialScope,
      canonicalRequestHash
    ].join('\n');

    // Sign
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(stringToSign);
    const signature = sign.sign(this.credentials.private_key, 'hex');

    return `https://${host}${path}?${canonicalQueryString}&X-Goog-Signature=${signature}`;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async makeRequest(
    method: string,
    objectName: string,
    body?: Buffer,
    queryParams: Record<string, string> = {}
  ): Promise<Response> {
    if (!this.config) {
      throw new Error('GCS connector not configured');
    }

    const token = await this.getAccessToken();

    let url: string;
    if (objectName) {
      url = `${this.API_BASE}/storage/v1/b/${encodeURIComponent(this.config.bucket)}/o/${encodeURIComponent(objectName)}`;
    } else {
      url = `${this.API_BASE}/storage/v1/b/${encodeURIComponent(this.config.bucket)}/o`;
    }

    const queryString = Object.keys(queryParams)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    if (queryString) {
      url += `?${queryString}`;
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`
    };

    if (body) {
      headers['Content-Length'] = body.length.toString();
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

  private formatDate(date: Date): string {
    return date.toISOString().replace(/[:-]|(\.\d{3})/g, '').substring(0, 8);
  }

  private formatGoogleDate(date: Date): string {
    return date.toISOString().replace(/[:-]|(\.\d{3})/g, '').substring(0, 15) + 'Z';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global instance
export const gcsConnector = new GCSConnector();
export default GCSConnector;
