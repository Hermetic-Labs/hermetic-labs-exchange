# @eve-os/sap-connector

SAP ERP integration with RFC function calls, BAPI execution, OData services, and IDoc processing.

## Features

- **RFC Function Calls**: Execute remote function calls to SAP systems
- **BAPI Execution**: Call Business Application Programming Interfaces
- **OData Service Integration**: Access SAP data via OData v2/v4 protocols
- **IDoc Processing**: Send and receive Intermediate Documents
- **Material/Vendor Management**: Manage master data entities

## Installation

```bash
pnpm add @eve-os/sap-connector
```

## Usage

### Frontend

```typescript
import { SAPConnector } from '@eve-os/sap-connector';

// Initialize the connector
const connector = new SAPConnector({
  host: 'sap-server.example.com',
  systemNumber: '00',
  client: '100',
  language: 'EN'
});

// Authenticate
await connector.authenticate({
  username: 'sapuser',
  password: 'password'
});

// Execute RFC
const result = await connector.callRFC('BAPI_MATERIAL_GETLIST', {
  MATNRSELECTION: [{ SIGN: 'I', OPTION: 'CP', MATNR_LOW: 'MAT*' }]
});

// Call OData service
const materials = await connector.odata.get('/sap/opu/odata/sap/API_MATERIAL/A_Material');
```

### Backend API

```python
from sap_connector import router, SAPService

# Mount the router
app.include_router(router, prefix="/api/sap")

# Use the service directly
service = SAPService()
result = await service.call_rfc(
    credentials=credentials,
    function_name="BAPI_MATERIAL_GETLIST",
    parameters={"MATNRSELECTION": [...]}
)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/connect` | Establish SAP connection |
| POST | `/disconnect` | Close SAP connection |
| POST | `/rfc/call` | Execute RFC function |
| GET | `/rfc/metadata/{function}` | Get RFC function metadata |
| POST | `/bapi/call` | Execute BAPI |
| POST | `/bapi/commit` | Commit BAPI transaction |
| POST | `/bapi/rollback` | Rollback BAPI transaction |
| GET | `/odata/{service_path}` | OData GET request |
| POST | `/odata/{service_path}` | OData POST request |
| PATCH | `/odata/{service_path}` | OData PATCH request |
| DELETE | `/odata/{service_path}` | OData DELETE request |
| POST | `/idoc/send` | Send IDoc |
| GET | `/idoc/{idoc_number}` | Get IDoc status |
| GET | `/idoc/types` | List IDoc types |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SAP_HOST` | SAP server hostname | Yes |
| `SAP_SYSTEM_NUMBER` | SAP system number | Yes |
| `SAP_CLIENT` | SAP client number | Yes |
| `SAP_LANGUAGE` | Login language | No |
| `SAP_POOL_SIZE` | Connection pool size | No |

## License

MIT © EVE Core Team
