# @eve-os/sam-gov-connector

SAM.gov federal contractor registration and entity search integration for EVE OS.

## Features

### Entity Search
- Search registered entities by name, UEI, or CAGE code
- Retrieve entity details and registration status
- Filter by entity type and status
- Pagination support for large result sets

### Registration Status
- Active registration verification
- Expiration date tracking
- Debarment and exclusion checks
- NAICS code lookup

### Exclusion Records
- Search exclusion database
- Exclusion type and cause
- Agency and program restrictions
- Active period tracking

### Contract Opportunities
- Search federal contract opportunities
- Filter by NAICS, set-aside type, agency
- Track opportunity status
- Award notifications

### CAGE Code Lookup
- Validate CAGE codes
- Cross-reference with entity data
- Status verification

## Installation

```bash
pnpm add @eve-os/sam-gov-connector
```

## Usage

```typescript
import { SAMConnector } from '@eve-os/sam-gov-connector';

const connector = new SAMConnector({
  apiKey: 'your-sam-api-key',
  baseUrl: 'https://api.sam.gov'
});

// Connect to SAM.gov
await connector.connect();

// Search entities
const entities = await connector.searchEntities({
  query: 'company name',
  status: 'Active',
  limit: 50
});

// Get entity details
const entity = await connector.getEntity('UEI123456789');

// Check exclusions
const exclusions = await connector.searchExclusions({
  name: 'entity name'
});
```

## API Reference

### SAMConnector

Main connector class for SAM.gov API integration.

#### Methods

- `connect()` - Establish connection to SAM.gov API
- `disconnect()` - Close connection
- `searchEntities(params)` - Search registered entities
- `getEntity(uei)` - Get entity by UEI
- `getEntityByCage(cage)` - Get entity by CAGE code
- `searchExclusions(params)` - Search exclusion records
- `getOpportunities(params)` - Search contract opportunities

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| apiKey | string | Yes | SAM.gov API key |
| baseUrl | string | No | API base URL (default: https://api.sam.gov) |
| timeout | number | No | Request timeout in ms (default: 30000) |

## License

MIT
