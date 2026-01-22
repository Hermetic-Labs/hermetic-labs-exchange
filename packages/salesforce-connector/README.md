# @eve-os/salesforce-connector

Full Salesforce CRM integration with OAuth authentication, SOQL queries, object CRUD operations, and bulk data processing.

## Features

- **OAuth2 Authentication**: Secure Salesforce authentication flow
- **SOQL Query Execution**: Execute arbitrary SOQL queries with pagination
- **Object CRUD Operations**: Create, read, update, delete Salesforce objects
- **Bulk Data Operations**: Process large datasets efficiently
- **Real-time Streaming API**: Subscribe to platform events and changes

## Installation

```bash
pnpm add @eve-os/salesforce-connector
```

## Usage

### Frontend

```typescript
import { SalesforceConnector } from '@eve-os/salesforce-connector';

// Initialize the connector
const connector = new SalesforceConnector({
  clientId: 'your-client-id',
  redirectUri: 'your-redirect-uri',
  sandbox: false
});

// Authenticate
await connector.authenticate();

// Execute SOQL query
const accounts = await connector.query('SELECT Id, Name FROM Account LIMIT 10');

// Create record
const newLead = await connector.create('Lead', {
  FirstName: 'John',
  LastName: 'Doe',
  Company: 'Acme Inc'
});
```

### Backend API

```python
from salesforce_connector import router, SalesforceService

# Mount the router
app.include_router(router, prefix="/api/salesforce")

# Use the service directly
service = SalesforceService()
result = await service.execute_soql(
    credentials=credentials,
    query="SELECT Id, Name FROM Account"
)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/oauth/authorize` | Initiate OAuth flow |
| POST | `/oauth/token` | Exchange code for tokens |
| POST | `/oauth/refresh` | Refresh access token |
| POST | `/query` | Execute SOQL query |
| GET | `/objects/{object_type}` | List object records |
| POST | `/objects/{object_type}` | Create object record |
| GET | `/objects/{object_type}/{record_id}` | Get single record |
| PATCH | `/objects/{object_type}/{record_id}` | Update record |
| DELETE | `/objects/{object_type}/{record_id}` | Delete record |
| POST | `/bulk/query` | Bulk query operation |
| POST | `/bulk/insert` | Bulk insert records |
| POST | `/bulk/update` | Bulk update records |
| POST | `/bulk/delete` | Bulk delete records |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SALESFORCE_CLIENT_ID` | OAuth client ID | Yes |
| `SALESFORCE_CLIENT_SECRET` | OAuth client secret | Yes |
| `SALESFORCE_REDIRECT_URI` | OAuth redirect URI | Yes |
| `SALESFORCE_SANDBOX` | Use sandbox environment | No |

## License

MIT © EVE Core Team
