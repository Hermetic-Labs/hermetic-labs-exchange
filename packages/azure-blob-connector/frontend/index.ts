/**
 * azure-blob-connector - EVE OS Marketplace Package
 *
 * Azure Blob Storage integration with containers, blobs, and SAS tokens.
 */

// Main UI component (default export for sidebar)
export { default, default as AzureBlobPortal } from './AzureBlobPortal';

// Connector service
export { AzureBlobConnector } from './AzureBlobConnector';

// Types
export type {
  AzureBlobConfig,
  AzureBlob,
  BlobMetadata,
  ListBlobsOptions,
  ListBlobsResult,
  PutBlobOptions,
  GetBlobResult,
  CopyBlobOptions,
  SASTokenOptions,
  SASTokenResult,
  BlockInfo,
  BlockUploadOptions,
  UploadProgress,
  BlobType,
  AccessTier,
  LeaseState,
  LeaseStatus,
  AzureBlobConnectorEvents,
  AzureBlobError,
} from './types';

export { AzureBlobConnectorError } from './types';

// Utilities
export { EventEmitter } from './EventEmitter';
export { default as crypto } from '../../_shared/crypto';
