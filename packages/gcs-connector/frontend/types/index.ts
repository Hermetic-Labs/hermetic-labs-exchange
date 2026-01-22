/**
 * Google Cloud Storage Connector Types
 *
 * TypeScript type definitions for the GCS connector.
 */

// ============================================================================
// Configuration Types
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

// ============================================================================
// Object Types
// ============================================================================

export interface GCSObject {
  name: string;
  size: number;
  updated: Date;
  contentType: string;
  etag?: string;
  generation?: string;
  storageClass?: GCSStorageClass;
  metadata?: Record<string, string>;
  md5Hash?: string;
  crc32c?: string;
}

export interface GCSObjectMetadata {
  contentType?: string;
  contentEncoding?: string;
  contentLength: number;
  etag: string;
  updated: Date;
  metadata?: Record<string, string>;
  generation?: string;
}

// ============================================================================
// Request/Response Types
// ============================================================================

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
  storageClass?: GCSStorageClass;
  predefinedAcl?: GCSPredefinedACL;
}

export interface GetObjectResult {
  data: ArrayBuffer;
  contentType?: string;
  contentLength: number;
  etag: string;
  updated: Date;
  metadata?: Record<string, string>;
  generation?: string;
}

export interface CopyObjectOptions {
  metadata?: Record<string, string>;
  storageClass?: GCSStorageClass;
}

// ============================================================================
// Signed URL Types
// ============================================================================

export interface SignedUrlOptions {
  action: 'read' | 'write' | 'delete' | 'resumable';
  expires: Date;
  contentType?: string;
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface SignedUrlResult {
  url: string;
  objectName: string;
  expiresAt: Date;
  method: 'GET' | 'PUT' | 'DELETE' | 'POST';
}

// ============================================================================
// Resumable Upload Types
// ============================================================================

export interface ResumableUploadSession {
  uploadUri: string;
  objectName: string;
  contentType: string;
}

export interface ResumableUploadOptions {
  chunkSize?: number;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
}

// ============================================================================
// Enums and Literals
// ============================================================================

export type GCSStorageClass = 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';

export type GCSPredefinedACL =
  | 'authenticatedRead'
  | 'bucketOwnerFullControl'
  | 'bucketOwnerRead'
  | 'private'
  | 'projectPrivate'
  | 'publicRead';

// ============================================================================
// Event Types
// ============================================================================

export interface GCSConnectorEvents {
  configured: { projectId: string; bucket: string };
  connected: { bucket: string };
  disconnected: { reason?: string };
  error: { message: string; code?: string };
  uploadProgress: UploadProgress;
  uploadComplete: { name: string; generation: string };
  downloadComplete: { name: string; size: number };
}

// ============================================================================
// Error Types
// ============================================================================

export interface GCSError {
  code: string;
  message: string;
  status?: number;
  resource?: string;
}

export class GCSConnectorError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'GCSConnectorError';
    this.code = code;
    this.status = status;
  }
}
