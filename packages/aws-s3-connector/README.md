# AWS S3 Connector

EVE-OS marketplace package for Amazon S3 storage integration.

## Overview

The AWS S3 Connector provides seamless integration with Amazon Simple Storage Service (S3), enabling bucket and object management, presigned URL generation, and multipart uploads.

## Features

- **Bucket Management**: Create, list, and configure S3 buckets
- **Object CRUD**: Upload, download, list, and delete objects
- **Presigned URLs**: Generate time-limited URLs for secure access
- **Multipart Uploads**: Handle large file uploads efficiently
- **Lifecycle Policies**: Configure object expiration and transitions

## Installation

```bash
# Via EVE-OS Marketplace
eve install @eve-os/aws-s3-connector
```

## Configuration

```typescript
import { S3Connector } from '@eve-os/aws-s3-connector';

const connector = new S3Connector();
connector.configure({
  region: 'us-east-1',
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY',
  bucket: 'your-bucket-name'
});
```

## API Reference

### Frontend API

#### `S3Connector`

Main connector class for S3 operations.

**Methods:**
- `configure(config: S3Config): void` - Configure the connector
- `testConnection(): Promise<boolean>` - Test connectivity
- `listObjects(options?: ListObjectsOptions): Promise<ListObjectsResult>` - List objects
- `putObject(key: string, data: Buffer, options?: PutObjectOptions): Promise<void>` - Upload object
- `getObject(key: string): Promise<GetObjectResult>` - Download object
- `deleteObject(key: string): Promise<void>` - Delete object
- `getPresignedUrl(key: string, options?: PresignedUrlOptions): Promise<string>` - Generate presigned URL

### Backend API

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/s3/upload` | Upload file to S3 |
| GET | `/api/s3/download/{key}` | Download file from S3 |
| GET | `/api/s3/list` | List objects in bucket |
| DELETE | `/api/s3/delete/{key}` | Delete object |
| POST | `/api/s3/presigned-url` | Generate presigned URL |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes |
| `AWS_REGION` | AWS region | Yes |
| `AWS_S3_BUCKET` | Default bucket name | No |

## Security

- Uses AWS Signature V4 for authentication
- Supports IAM roles and temporary credentials
- All credentials are stored securely in EVE-OS vault

## License

MIT © EVE Core Team
