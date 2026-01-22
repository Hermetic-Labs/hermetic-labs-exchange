/**
 * AWS S3 Connector
 *
 * Provides integration with Amazon S3 for object storage operations.
 * Implements AWS Signature V4 for authentication.
 */

import { EventEmitter } from './EventEmitter';
import crypto from '../../_shared/crypto';
import { Buffer } from '../../_shared/Buffer';

// ============================================================================
// Type Definitions
// ============================================================================

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
  sessionToken?: string;
  forcePathStyle?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  storageClass?: string;
  owner?: {
    id: string;
    displayName?: string;
  };
}

export interface ListObjectsOptions {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListObjectsResult {
  objects: S3Object[];
  commonPrefixes: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

export interface PutObjectOptions {
  contentType?: string;
  contentEncoding?: string;
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  storageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'STANDARD_IA' | 'ONEZONE_IA' | 'INTELLIGENT_TIERING' | 'GLACIER' | 'DEEP_ARCHIVE';
  acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read' | 'bucket-owner-read' | 'bucket-owner-full-control';
  serverSideEncryption?: 'AES256' | 'aws:kms';
  sseKmsKeyId?: string;
}

export interface GetObjectResult {
  data: Buffer;
  contentType?: string;
  contentLength: number;
  etag: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export interface CopyObjectOptions {
  metadata?: Record<string, string>;
  metadataDirective?: 'COPY' | 'REPLACE';
  storageClass?: string;
}

export interface PresignedUrlOptions {
  expiresIn?: number; // seconds, default 3600
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface MultipartUpload {
  uploadId: string;
  key: string;
  initiated: Date;
}

export interface UploadPart {
  partNumber: number;
  etag: string;
  size: number;
}

// ============================================================================
// S3 Connector
// ============================================================================

export class S3Connector extends EventEmitter {
  private config: S3Config | null = null;
  private isConnected: boolean = false;

  constructor() {
    super();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  configure(config: S3Config): void {
    this.validateConfig(config);
    this.config = {
      ...config,
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30000,
      forcePathStyle: config.forcePathStyle ?? false
    };
    this.isConnected = false;
    this.emit('configured', { bucket: config.bucket, region: config.region });
  }

  private validateConfig(config: S3Config): void {
    if (!config.region) {
      throw new Error('S3 region is required');
    }
    if (!config.accessKeyId) {
      throw new Error('S3 accessKeyId is required');
    }
    if (!config.secretAccessKey) {
      throw new Error('S3 secretAccessKey is required');
    }
    if (!config.bucket) {
      throw new Error('S3 bucket is required');
    }
  }

  getConfig(): S3Config | null {
    return this.config;
  }

  // ============================================================================
  // Connection
  // ============================================================================

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    try {
      // Try to HEAD the bucket to verify access
      const response = await this.makeRequest('HEAD', '', undefined, {});

      this.isConnected = response.ok || response.status === 200 || response.status === 404;

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
      throw new Error('S3 connector not configured');
    }

    const queryParams: Record<string, string> = {
      'list-type': '2'
    };

    if (options.prefix) queryParams.prefix = options.prefix;
    if (options.delimiter) queryParams.delimiter = options.delimiter;
    if (options.maxKeys) queryParams['max-keys'] = options.maxKeys.toString();
    if (options.continuationToken) queryParams['continuation-token'] = options.continuationToken;

    try {
      const response = await this.makeRequest('GET', '', undefined, queryParams);

      if (!response.ok) {
        throw new Error(`Failed to list objects: ${response.status}`);
      }

      const xml = await response.text();
      const result = this.parseListObjectsResponse(xml);

      this.emit('listObjects', {
        prefix: options.prefix,
        count: result.objects.length
      });

      return result;
    } catch (error) {
      this.emit('error', { operation: 'listObjects', error });
      throw error;
    }
  }

  async listAllObjects(prefix?: string): Promise<S3Object[]> {
    const allObjects: S3Object[] = [];
    let continuationToken: string | undefined;

    do {
      const result = await this.listObjects({
        prefix,
        continuationToken,
        maxKeys: 1000
      });

      allObjects.push(...result.objects);
      continuationToken = result.nextContinuationToken;
    } while (continuationToken);

    return allObjects;
  }

  async getObject(key: string): Promise<GetObjectResult | null> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    try {
      const response = await this.makeRequest('GET', key);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get object: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = Buffer.from(arrayBuffer);

      const result: GetObjectResult = {
        data,
        contentType: response.headers.get('content-type') || undefined,
        contentLength: parseInt(response.headers.get('content-length') || '0', 10),
        etag: response.headers.get('etag')?.replace(/"/g, '') || '',
        lastModified: new Date(response.headers.get('last-modified') || Date.now()),
        metadata: this.extractMetadata(response.headers)
      };

      this.emit('getObject', { key, size: result.contentLength });

      return result;
    } catch (error) {
      this.emit('error', { operation: 'getObject', key, error });
      throw error;
    }
  }

  async getObjectAsStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    try {
      const response = await this.makeRequest('GET', key);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get object stream: ${response.status}`);
      }

      return response.body;
    } catch (error) {
      this.emit('error', { operation: 'getObjectAsStream', key, error });
      throw error;
    }
  }

  async putObject(key: string, data: Buffer, options: PutObjectOptions = {}): Promise<string> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': options.contentType || 'application/octet-stream',
      'Content-Length': data.length.toString()
    };

    if (options.contentEncoding) headers['Content-Encoding'] = options.contentEncoding;
    if (options.cacheControl) headers['Cache-Control'] = options.cacheControl;
    if (options.contentDisposition) headers['Content-Disposition'] = options.contentDisposition;
    if (options.storageClass) headers['x-amz-storage-class'] = options.storageClass;
    if (options.acl) headers['x-amz-acl'] = options.acl;
    if (options.serverSideEncryption) headers['x-amz-server-side-encryption'] = options.serverSideEncryption;
    if (options.sseKmsKeyId) headers['x-amz-server-side-encryption-aws-kms-key-id'] = options.sseKmsKeyId;

    // Add custom metadata
    if (options.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k.toLowerCase()}`] = v;
      }
    }

    try {
      const response = await this.makeRequest('PUT', key, data, {}, headers);

      if (!response.ok) {
        throw new Error(`Failed to put object: ${response.status}`);
      }

      const etag = response.headers.get('etag')?.replace(/"/g, '') || '';

      this.emit('putObject', { key, size: data.length, etag });

      return etag;
    } catch (error) {
      this.emit('error', { operation: 'putObject', key, error });
      throw error;
    }
  }

  async deleteObject(key: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    try {
      const response = await this.makeRequest('DELETE', key);

      // 204 No Content is success for DELETE
      const success = response.ok || response.status === 204;

      if (success) {
        this.emit('deleteObject', { key });
      }

      return success;
    } catch (error) {
      this.emit('error', { operation: 'deleteObject', key, error });
      throw error;
    }
  }

  async deleteObjects(keys: string[]): Promise<{ deleted: string[]; errors: Array<{ key: string; error: string }> }> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    if (keys.length === 0) {
      return { deleted: [], errors: [] };
    }

    // Build XML for batch delete
    const objectsXml = keys.map(k => `<Object><Key>${this.escapeXml(k)}</Key></Object>`).join('');
    const body = `<?xml version="1.0" encoding="UTF-8"?><Delete><Quiet>false</Quiet>${objectsXml}</Delete>`;
    const bodyBuffer = Buffer.from(body);

    const contentMd5 = crypto.createHash('md5').update(bodyBuffer).digest('base64');

    try {
      const response = await this.makeRequest('POST', '', bodyBuffer, { delete: '' }, {
        'Content-Type': 'application/xml',
        'Content-MD5': contentMd5
      });

      if (!response.ok) {
        throw new Error(`Failed to delete objects: ${response.status}`);
      }

      const xml = await response.text();
      const result = this.parseDeleteObjectsResponse(xml);

      this.emit('deleteObjects', { count: result.deleted.length });

      return result;
    } catch (error) {
      this.emit('error', { operation: 'deleteObjects', error });
      throw error;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    try {
      const response = await this.makeRequest('HEAD', key);
      return response.ok || response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async headObject(key: string): Promise<S3Object | null> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    try {
      const response = await this.makeRequest('HEAD', key);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to head object: ${response.status}`);
      }

      return {
        key,
        size: parseInt(response.headers.get('content-length') || '0', 10),
        lastModified: new Date(response.headers.get('last-modified') || Date.now()),
        etag: response.headers.get('etag')?.replace(/"/g, '') || '',
        storageClass: response.headers.get('x-amz-storage-class') || 'STANDARD'
      };
    } catch (error) {
      this.emit('error', { operation: 'headObject', key, error });
      throw error;
    }
  }

  async copyObject(sourceKey: string, destKey: string, options: CopyObjectOptions = {}): Promise<string> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    const headers: Record<string, string> = {
      'x-amz-copy-source': `/${this.config.bucket}/${encodeURIComponent(sourceKey)}`
    };

    if (options.metadataDirective) {
      headers['x-amz-metadata-directive'] = options.metadataDirective;
    }

    if (options.storageClass) {
      headers['x-amz-storage-class'] = options.storageClass;
    }

    if (options.metadata && options.metadataDirective === 'REPLACE') {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k.toLowerCase()}`] = v;
      }
    }

    try {
      const response = await this.makeRequest('PUT', destKey, undefined, {}, headers);

      if (!response.ok) {
        throw new Error(`Failed to copy object: ${response.status}`);
      }

      const xml = await response.text();
      const etagMatch = xml.match(/<ETag>"?([^"<]+)"?<\/ETag>/);
      const etag = etagMatch ? etagMatch[1] : '';

      this.emit('copyObject', { sourceKey, destKey, etag });

      return etag;
    } catch (error) {
      this.emit('error', { operation: 'copyObject', sourceKey, destKey, error });
      throw error;
    }
  }

  // ============================================================================
  // Presigned URLs
  // ============================================================================

  generatePresignedUrl(key: string, method: 'GET' | 'PUT' = 'GET', options: PresignedUrlOptions = {}): string {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    const expiresIn = options.expiresIn || 3600;
    const now = new Date();
    const dateStamp = this.formatDate(now);
    const amzDate = this.formatAmzDate(now);

    const host = this.getHost();
    const path = this.getObjectPath(key);

    const credential = `${this.config.accessKeyId}/${dateStamp}/${this.config.region}/s3/aws4_request`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host'
    };

    if (this.config.sessionToken) {
      queryParams['X-Amz-Security-Token'] = this.config.sessionToken;
    }

    if (options.responseContentType) {
      queryParams['response-content-type'] = options.responseContentType;
    }

    if (options.responseContentDisposition) {
      queryParams['response-content-disposition'] = options.responseContentDisposition;
    }

    // Sort query params
    const sortedParams = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedParams
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    // Create canonical request
    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      `host:${host}`,
      '',
      'host',
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    // Create string to sign
    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      `${dateStamp}/${this.config.region}/s3/aws4_request`,
      canonicalRequestHash
    ].join('\n');

    // Calculate signature
    const signature = this.calculateSignature(stringToSign, dateStamp);

    const protocol = this.config.endpoint?.startsWith('http://') ? 'http' : 'https';
    return `${protocol}://${host}${path}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  // ============================================================================
  // Multipart Upload
  // ============================================================================

  async createMultipartUpload(key: string, options: PutObjectOptions = {}): Promise<string> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': options.contentType || 'application/octet-stream'
    };

    if (options.storageClass) headers['x-amz-storage-class'] = options.storageClass;
    if (options.acl) headers['x-amz-acl'] = options.acl;

    try {
      const response = await this.makeRequest('POST', key, undefined, { uploads: '' }, headers);

      if (!response.ok) {
        throw new Error(`Failed to create multipart upload: ${response.status}`);
      }

      const xml = await response.text();
      const uploadIdMatch = xml.match(/<UploadId>([^<]+)<\/UploadId>/);

      if (!uploadIdMatch) {
        throw new Error('Failed to parse upload ID from response');
      }

      const uploadId = uploadIdMatch[1];
      this.emit('multipartUploadCreated', { key, uploadId });

      return uploadId;
    } catch (error) {
      this.emit('error', { operation: 'createMultipartUpload', key, error });
      throw error;
    }
  }

  async uploadPart(key: string, uploadId: string, partNumber: number, data: Buffer): Promise<UploadPart> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    try {
      const response = await this.makeRequest('PUT', key, data, {
        partNumber: partNumber.toString(),
        uploadId
      });

      if (!response.ok) {
        throw new Error(`Failed to upload part: ${response.status}`);
      }

      const etag = response.headers.get('etag')?.replace(/"/g, '') || '';

      const part: UploadPart = {
        partNumber,
        etag,
        size: data.length
      };

      this.emit('partUploaded', { key, uploadId, partNumber, size: data.length });

      return part;
    } catch (error) {
      this.emit('error', { operation: 'uploadPart', key, partNumber, error });
      throw error;
    }
  }

  async completeMultipartUpload(key: string, uploadId: string, parts: UploadPart[]): Promise<string> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    // Build completion XML
    const partsXml = parts
      .sort((a, b) => a.partNumber - b.partNumber)
      .map(p => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>"${p.etag}"</ETag></Part>`)
      .join('');
    const body = `<?xml version="1.0" encoding="UTF-8"?><CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`;

    try {
      const response = await this.makeRequest('POST', key, Buffer.from(body), { uploadId }, {
        'Content-Type': 'application/xml'
      });

      if (!response.ok) {
        throw new Error(`Failed to complete multipart upload: ${response.status}`);
      }

      const xml = await response.text();
      const etagMatch = xml.match(/<ETag>"?([^"<]+)"?<\/ETag>/);
      const etag = etagMatch ? etagMatch[1] : '';

      this.emit('multipartUploadCompleted', { key, uploadId, etag });

      return etag;
    } catch (error) {
      this.emit('error', { operation: 'completeMultipartUpload', key, uploadId, error });
      throw error;
    }
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    try {
      const response = await this.makeRequest('DELETE', key, undefined, { uploadId });

      const success = response.ok || response.status === 204;

      if (success) {
        this.emit('multipartUploadAborted', { key, uploadId });
      }

      return success;
    } catch (error) {
      this.emit('error', { operation: 'abortMultipartUpload', key, uploadId, error });
      throw error;
    }
  }

  // ============================================================================
  // AWS Signature V4
  // ============================================================================

  private async makeRequest(
    method: string,
    key: string,
    body?: Buffer,
    queryParams: Record<string, string> = {},
    additionalHeaders: Record<string, string> = {}
  ): Promise<Response> {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    const now = new Date();
    const amzDate = this.formatAmzDate(now);
    const dateStamp = this.formatDate(now);

    const host = this.getHost();
    const path = key ? this.getObjectPath(key) : '/';

    // Build query string
    const sortedParams = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedParams
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    // Calculate payload hash
    const payloadHash = body
      ? crypto.createHash('sha256').update(body).digest('hex')
      : crypto.createHash('sha256').update('').digest('hex');

    // Build headers
    const headers: Record<string, string> = {
      Host: host,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-Sha256': payloadHash,
      ...additionalHeaders
    };

    if (this.config.sessionToken) {
      headers['X-Amz-Security-Token'] = this.config.sessionToken;
    }

    if (body) {
      headers['Content-Length'] = body.length.toString();
    }

    // Create canonical request
    const signedHeaders = Object.keys(headers)
      .map(k => k.toLowerCase())
      .sort()
      .join(';');

    const canonicalHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(k => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join('\n');

    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      canonicalHeaders,
      '',
      signedHeaders,
      payloadHash
    ].join('\n');

    // Create string to sign
    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash
    ].join('\n');

    // Calculate signature
    const signature = this.calculateSignature(stringToSign, dateStamp);

    // Add authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    headers['Authorization'] = authorization;

    // Build URL
    const protocol = this.config.endpoint?.startsWith('http://') ? 'http' : 'https';
    let url = `${protocol}://${host}${path}`;
    if (canonicalQueryString) {
      url += `?${canonicalQueryString}`;
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

  private calculateSignature(stringToSign: string, dateStamp: string): string {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    const kDate = crypto.createHmac('sha256', `AWS4${this.config.secretAccessKey}`)
      .update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate)
      .update(this.config.region).digest();
    const kService = crypto.createHmac('sha256', kRegion)
      .update('s3').digest();
    const kSigning = crypto.createHmac('sha256', kService)
      .update('aws4_request').digest();

    return crypto.createHmac('sha256', kSigning)
      .update(stringToSign).digest('hex');
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getHost(): string {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    if (this.config.endpoint) {
      const url = new URL(this.config.endpoint);
      return this.config.forcePathStyle
        ? url.host
        : `${this.config.bucket}.${url.host}`;
    }

    return this.config.forcePathStyle
      ? `s3.${this.config.region}.amazonaws.com`
      : `${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
  }

  private getObjectPath(key: string): string {
    if (!this.config) {
      throw new Error('S3 connector not configured');
    }

    const encodedKey = key.split('/').map(encodeURIComponent).join('/');

    if (this.config.forcePathStyle || this.config.endpoint) {
      return `/${this.config.bucket}/${encodedKey}`;
    }

    return `/${encodedKey}`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().replace(/[:-]|(\.\d{3})/g, '').substring(0, 8);
  }

  private formatAmzDate(date: Date): string {
    return date.toISOString().replace(/[:-]|(\.\d{3})/g, '').substring(0, 15) + 'Z';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private extractMetadata(headers: Headers): Record<string, string> {
    const metadata: Record<string, string> = {};
    headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('x-amz-meta-')) {
        const metaKey = key.substring(11);
        metadata[metaKey] = value;
      }
    });
    return metadata;
  }

  private parseListObjectsResponse(xml: string): ListObjectsResult {
    const objects: S3Object[] = [];
    const commonPrefixes: string[] = [];

    // Parse objects
    const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match;
    while ((match = contentsRegex.exec(xml)) !== null) {
      const content = match[1];
      const key = this.extractXmlValue(content, 'Key');
      const size = parseInt(this.extractXmlValue(content, 'Size') || '0', 10);
      const lastModified = new Date(this.extractXmlValue(content, 'LastModified') || '');
      const etag = this.extractXmlValue(content, 'ETag')?.replace(/"/g, '') || '';
      const storageClass = this.extractXmlValue(content, 'StorageClass');

      if (key) {
        objects.push({ key, size, lastModified, etag, storageClass });
      }
    }

    // Parse common prefixes
    const prefixRegex = /<CommonPrefixes>[\s\S]*?<Prefix>([^<]+)<\/Prefix>[\s\S]*?<\/CommonPrefixes>/g;
    while ((match = prefixRegex.exec(xml)) !== null) {
      commonPrefixes.push(match[1]);
    }

    const isTruncated = this.extractXmlValue(xml, 'IsTruncated') === 'true';
    const nextContinuationToken = this.extractXmlValue(xml, 'NextContinuationToken');

    return {
      objects,
      commonPrefixes,
      isTruncated,
      nextContinuationToken: nextContinuationToken || undefined
    };
  }

  private parseDeleteObjectsResponse(xml: string): { deleted: string[]; errors: Array<{ key: string; error: string }> } {
    const deleted: string[] = [];
    const errors: Array<{ key: string; error: string }> = [];

    const deletedRegex = /<Deleted>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<\/Deleted>/g;
    let match;
    while ((match = deletedRegex.exec(xml)) !== null) {
      deleted.push(match[1]);
    }

    const errorRegex = /<Error>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<Message>([^<]+)<\/Message>[\s\S]*?<\/Error>/g;
    while ((match = errorRegex.exec(xml)) !== null) {
      errors.push({ key: match[1], error: match[2] });
    }

    return { deleted, errors };
  }

  private extractXmlValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
    const match = xml.match(regex);
    return match ? match[1] : null;
  }
}

// Global instance
export const s3Connector = new S3Connector();
export default S3Connector;
