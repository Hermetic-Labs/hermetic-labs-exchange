/**
 * aws-s3-connector - EVE OS Marketplace Package
 *
 * Amazon S3 storage integration with buckets, objects, presigned URLs,
 * and multipart uploads.
 */

// Main UI component (default export for sidebar)
export { default, default as AWSS3Portal } from './AWSS3Portal';

// Connector service
export { S3Connector } from './S3Connector';

// Types
export type {
  S3Config,
  S3Object,
  S3ObjectMetadata,
  ListObjectsOptions,
  ListObjectsResult,
  PutObjectOptions,
  GetObjectResult,
  CopyObjectOptions,
  PresignedUrlOptions,
  PresignedUrlResult,
  MultipartUpload,
  UploadPart,
  MultipartUploadOptions,
  UploadProgress,
  S3StorageClass,
  S3ACL,
  S3ConnectorEvents,
  S3Error,
} from './types';

export { S3ConnectorError } from './types';

// Utilities
export { EventEmitter } from './EventEmitter';
export { default as crypto } from '../../_shared/crypto';
