/**
 * Azure Blob Storage Connector Types
 *
 * TypeScript type definitions for the Azure Blob connector.
 */

// ============================================================================
// Configuration Types
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

// ============================================================================
// Blob Types
// ============================================================================

export interface AzureBlob {
  name: string;
  size: number;
  lastModified: Date;
  contentType: string;
  etag?: string;
  blobType?: BlobType;
  accessTier?: AccessTier;
  metadata?: Record<string, string>;
}

export interface BlobMetadata {
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
  accessTier?: AccessTier;
  blobType?: BlobType;
}

export interface GetBlobResult {
  data: ArrayBuffer;
  contentType?: string;
  contentLength: number;
  etag: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export interface CopyBlobOptions {
  metadata?: Record<string, string>;
  accessTier?: AccessTier;
}

// ============================================================================
// SAS Token Types
// ============================================================================

export interface SASTokenOptions {
  permissions: string;
  expiryTime: Date;
  startTime?: Date;
  contentType?: string;
  contentDisposition?: string;
  ipRange?: string;
  protocol?: 'https' | 'https,http';
}

export interface SASTokenResult {
  token: string;
  url: string;
  expiresAt: Date;
  permissions: string;
}

// ============================================================================
// Block Operations Types
// ============================================================================

export interface BlockInfo {
  blockId: string;
  size: number;
}

export interface BlockUploadOptions {
  blockSize?: number;
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

export type BlobType = 'BlockBlob' | 'PageBlob' | 'AppendBlob';

export type AccessTier = 'Hot' | 'Cool' | 'Archive';

export type LeaseState = 'available' | 'leased' | 'expired' | 'breaking' | 'broken';

export type LeaseStatus = 'locked' | 'unlocked';

// ============================================================================
// Event Types
// ============================================================================

export interface AzureBlobConnectorEvents {
  configured: { accountName: string; containerName: string };
  connected: { containerName: string };
  disconnected: { reason?: string };
  error: { message: string; code?: string };
  uploadProgress: UploadProgress;
  uploadComplete: { name: string; etag: string };
  downloadComplete: { name: string; size: number };
}

// ============================================================================
// Error Types
// ============================================================================

export interface AzureBlobError {
  code: string;
  message: string;
  requestId?: string;
  resource?: string;
}

export class AzureBlobConnectorError extends Error {
  code?: string;
  requestId?: string;

  constructor(message: string, code?: string, requestId?: string) {
    super(message);
    this.name = 'AzureBlobConnectorError';
    this.code = code;
    this.requestId = requestId;
  }
}
