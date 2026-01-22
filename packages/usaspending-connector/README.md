# @eve-os/usaspending-connector

USASpending.gov federal spending data integration for EVE OS providing comprehensive federal award and spending analysis.

## Features

### Award Search
- Search federal awards by keyword, agency, recipient
- Filter by award type (contracts, grants, loans, etc.)
- Date range filtering
- Geographic filtering by state, county, or congressional district
- NAICS and PSC code filtering

### Agency Spending
- Agency spending summaries
- Sub-agency breakdown
- Budget function analysis
- Obligation and outlay tracking
- Year-over-year comparisons

### Recipient Lookup
- Search recipients by name or UEI
- Recipient profile details
- Award history
- Geographic distribution
- Parent-child relationship tracking

### Geographic Analysis
- State-level spending summaries
- County-level breakdowns
- Congressional district analysis
- Place of performance data
- Geographic spending trends

### Time Series Data
- Fiscal year summaries
- Monthly spending trends
- Quarterly reporting
- Budget execution tracking
- Historical comparisons

## Installation

```bash
pnpm add @eve-os/usaspending-connector
```

## Usage

```typescript
import { USASpendingConnector } from '@eve-os/usaspending-connector';

const connector = new USASpendingConnector({
  baseUrl: 'https://api.usaspending.gov'
});

// Connect to USASpending
await connector.connect();

// Search awards
const awards = await connector.searchAwards({
  keywords: ['research', 'development'],
  awardType: 'contract',
  fiscalYear: 2024,
  limit: 50
});

// Get agency spending
const agencySpending = await connector.getAgencySpending({
  agencyCode: '097',
  fiscalYear: 2024
});

// Search recipients
const recipients = await connector.searchRecipients({
  query: 'company name'
});
```

## API Reference

### USASpendingConnector

Main connector class for USASpending.gov API integration.

#### Methods

- `connect()` - Establish connection to USASpending API
- `disconnect()` - Close connection
- `searchAwards(params)` - Search federal awards
- `getAward(awardId)` - Get award details by ID
- `getAgencySpending(params)` - Get agency spending data
- `searchRecipients(params)` - Search award recipients
- `getRecipient(recipientId)` - Get recipient details
- `getGeographicSpending(params)` - Get geographic spending analysis
- `getSpendingByFiscalYear(params)` - Get fiscal year summaries

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| baseUrl | string | No | API base URL (default: https://api.usaspending.gov) |
| timeout | number | No | Request timeout in ms (default: 30000) |

## License

MIT
