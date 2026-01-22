# Azure Blob Storage Connector

EVE-OS marketplace package for Azure Blob Storage integration.

## Overview

The Azure Blob Storage Connector provides seamless integration with Microsoft Azure Blob Storage, enabling container and blob management, SAS token generation, and access tier management.

## Features

- **Container Management**: Create, list, and configure containers
- **Blob Operations**: Upload, download, list, and delete blobs
- **SAS Token Generation**: Create time-limited Shared Access Signature tokens
- **Access Tier Management**: Set Hot, Cool, or Archive tiers
- **Lease Handling**: Manage blob leases for exclusive access

## Installation

```bash
# Via EVE-OS Marketplace
eve install @eve-os/azure-blob-connector
```

## Configuration

```typescript
import { AzureBlobConnector } from '@eve-os/azure-blob-connector';

const connector = new AzureBlobConnector();
connector.configure({
  accountName: 'your-storage-account',
  accountKey: 'YOUR_ACCOUNT_KEY',
  containerName: 'your-container'
});
```

## API Reference

### Frontend API

#### `AzureBlobConnector`

Main connector class for Azure Blob Storage operations.

**Methods:**
- `configure(config: AzureBlobConfig): void` - Configure the connector
- `testConnection(): Promise<boolean>` - Test connectivity
- `listBlobs(options?: ListBlobsOptions): Promise<ListBlobsResult>` - List blobs
- `putBlob(name: string, data: Buffer, options?: PutBlobOptions): Promise<void>` - Upload blob
- `getBlob(name: string): Promise<GetBlobResult>` - Download blob
- `deleteBlob(name: string): Promise<void>` - Delete blob
- `generateSASToken(name: string, options: SASTokenOptions): Promise<string>` - Generate SAS token

### Backend API

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/azure-blob/upload` | Upload blob to container |
| GET | `/api/azure-blob/download/{name}` | Download blob |
| GET | `/api/azure-blob/list` | List blobs in container |
| DELETE | `/api/azure-blob/delete/{name}` | Delete blob |
| POST | `/api/azure-blob/sas-token` | Generate SAS token |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_STORAGE_ACCOUNT` | Storage account name | Yes |
| `AZURE_STORAGE_KEY` | Storage account key | Yes* |
| `AZURE_STORAGE_SAS_TOKEN` | SAS token | Yes* |
| `AZURE_STORAGE_CONTAINER` | Default container name | No |

\* Either account key or SAS token is required

## Security

- Uses Azure Storage Shared Key authentication
- Supports SAS tokens for delegated access
- All credentials are stored securely in EVE-OS vault

## License

MIT © EVE Core Team
