/**
 * gcs-connector - EVE OS Marketplace Package
 *
 * Google Cloud Storage integration with buckets, objects, and signed URLs.
 */

export { default, default as GCSPortal } from './GCSPortal';

// Connector
export { GCSConnector } from './GCSConnector';

// Types
export type {
  GCSConfig,
  ServiceAccountCredentials,
  GCSObject,
  GCSObjectMetadata,
  ListObjectsOptions,
  ListObjectsResult,
  UploadOptions,
  GetObjectResult,
  CopyObjectOptions,
  SignedUrlOptions,
  SignedUrlResult,
  ResumableUploadSession,
  ResumableUploadOptions,
  UploadProgress,
  GCSStorageClass,
  GCSPredefinedACL,
  GCSConnectorEvents,
  GCSError,
} from './types';

export { GCSConnectorError } from './types';

// Utilities
export { EventEmitter } from './EventEmitter';
export { default as crypto } from '../../_shared/crypto';
