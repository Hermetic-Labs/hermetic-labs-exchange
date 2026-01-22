/**
 * AWS S3 Connector Types
 *
 * TypeScript type definitions for the S3 connector.
 */

// ============================================================================
// Configuration Types
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

// ============================================================================
// Object Types
// ============================================================================

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

export interface S3ObjectMetadata {
  contentType?: string;
  contentEncoding?: string;
  contentLength: number;
  etag: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

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
  storageClass?: S3StorageClass;
  acl?: S3ACL;
  serverSideEncryption?: 'AES256' | 'aws:kms';
  sseKmsKeyId?: string;
}

export interface GetObjectResult {
  data: ArrayBuffer;
  contentType?: string;
  contentLength: number;
  etag: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export interface CopyObjectOptions {
  metadata?: Record<string, string>;
  metadataDirective?: 'COPY' | 'REPLACE';
  storageClass?: S3StorageClass;
}

// ============================================================================
// Presigned URL Types
// ============================================================================

export interface PresignedUrlOptions {
  expiresIn?: number;
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface PresignedUrlResult {
  url: string;
  key: string;
  expiresAt: Date;
  method: 'GET' | 'PUT';
}

// ============================================================================
// Multipart Upload Types
// ============================================================================

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

export interface MultipartUploadOptions {
  partSize?: number;
  concurrency?: number;
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

export type S3StorageClass =
  | 'STANDARD'
  | 'REDUCED_REDUNDANCY'
  | 'STANDARD_IA'
  | 'ONEZONE_IA'
  | 'INTELLIGENT_TIERING'
  | 'GLACIER'
  | 'DEEP_ARCHIVE';

export type S3ACL =
  | 'private'
  | 'public-read'
  | 'public-read-write'
  | 'authenticated-read'
  | 'bucket-owner-read'
  | 'bucket-owner-full-control';

// ============================================================================
// Event Types
// ============================================================================

export interface S3ConnectorEvents {
  configured: { bucket: string; region: string };
  connected: { bucket: string };
  disconnected: { reason?: string };
  error: { message: string; code?: string };
  uploadProgress: UploadProgress;
  uploadComplete: { key: string; etag: string };
  downloadComplete: { key: string; size: number };
}

// ============================================================================
// Error Types
// ============================================================================

export interface S3Error {
  code: string;
  message: string;
  requestId?: string;
  resource?: string;
}

export class S3ConnectorError extends Error {
  code?: string;
  requestId?: string;

  constructor(message: string, code?: string, requestId?: string) {
    super(message);
    this.name = 'S3ConnectorError';
    this.code = code;
    this.requestId = requestId;
  }
}
