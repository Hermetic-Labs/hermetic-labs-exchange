# Google Cloud Storage Connector

EVE-OS marketplace package for Google Cloud Storage integration.

## Overview

The Google Cloud Storage (GCS) Connector provides seamless integration with Google Cloud Storage, enabling bucket and object management, signed URL generation, and IAM integration.

## Features

- **Bucket Operations**: Create, list, and configure buckets
- **Object Management**: Upload, download, list, and delete objects
- **Signed URLs**: Generate time-limited URLs for secure access
- **IAM Integration**: Manage bucket and object-level permissions
- **Lifecycle Management**: Configure object expiration and class transitions

## Installation

```bash
# Via EVE-OS Marketplace
eve install @eve-os/gcs-connector
```

## Configuration

```typescript
import { GCSConnector } from '@eve-os/gcs-connector';

const connector = new GCSConnector();
connector.configure({
  projectId: 'your-project-id',
  credentials: 'path/to/service-account.json', // or JSON string
  bucket: 'your-bucket-name'
});
```

## API Reference

### Frontend API

#### `GCSConnector`

Main connector class for GCS operations.

**Methods:**
- `configure(config: GCSConfig): void` - Configure the connector
- `testConnection(): Promise<boolean>` - Test connectivity
- `listObjects(options?: ListObjectsOptions): Promise<ListObjectsResult>` - List objects
- `uploadObject(name: string, data: Buffer, options?: UploadOptions): Promise<void>` - Upload object
- `downloadObject(name: string): Promise<GetObjectResult>` - Download object
- `deleteObject(name: string): Promise<void>` - Delete object
- `generateSignedUrl(name: string, options: SignedUrlOptions): Promise<string>` - Generate signed URL

### Backend API

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/gcs/upload` | Upload file to GCS |
| GET | `/api/gcs/download/{name}` | Download file from GCS |
| GET | `/api/gcs/list` | List objects in bucket |
| DELETE | `/api/gcs/delete/{name}` | Delete object |
| POST | `/api/gcs/signed-url` | Generate signed URL |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON | Yes* |
| `GCS_BUCKET` | Default bucket name | No |

\* Or use Application Default Credentials

## Security

- Uses OAuth 2.0 service account authentication with JWT
- Supports Application Default Credentials
- All credentials are stored securely in EVE-OS vault

## License

MIT © EVE Core Team
