# @eve-os/lexisnexis-connector

LexisNexis legal research integration for EVE OS providing comprehensive access to legal documents, case law, and statutes.

## Features

### Document Search
- Full-text search across legal databases
- Boolean and natural language queries
- Filter by jurisdiction, date, document type
- Relevance ranking and sorting
- Search within results

### Case Law Retrieval
- Search federal and state case law
- Court filtering and hierarchical browsing
- Headnotes and key number access
- Parallel citations
- Related cases discovery

### Statutory Research
- Federal and state statutes
- Code section lookup
- Historical versions
- Annotations and notes
- Cross-reference linking

### Citation Analysis
- Citation validation
- Citing references
- Treatment analysis
- Citation format conversion
- Parallel citation discovery

### Shepardizing
- Shepard's citation service
- Treatment indicators
- Negative treatment alerts
- History analysis
- Headnote-level analysis

## Installation

```bash
pnpm add @eve-os/lexisnexis-connector
```

## Usage

```typescript
import { LexisNexisConnector } from '@eve-os/lexisnexis-connector';

const connector = new LexisNexisConnector({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  baseUrl: 'https://api.lexisnexis.com'
});

// Connect to LexisNexis
await connector.connect();

// Search documents
const results = await connector.searchDocuments({
  query: 'breach of contract damages',
  jurisdiction: 'US-FED',
  documentType: 'cases',
  limit: 25
});

// Get case details
const caseDoc = await connector.getCase('123-456-789');

// Shepardize a citation
const shepards = await connector.shepardize({
  citation: '539 U.S. 558'
});
```

## API Reference

### LexisNexisConnector

Main connector class for LexisNexis API integration.

#### Methods

- `connect()` - Establish connection to LexisNexis API
- `disconnect()` - Close connection
- `searchDocuments(params)` - Search legal documents
- `getDocument(documentId)` - Get document by ID
- `getCase(caseId)` - Get case document
- `searchCases(params)` - Search case law
- `searchStatutes(params)` - Search statutes
- `getStatute(statuteId)` - Get statute by ID
- `shepardize(params)` - Get Shepard's citations
- `getCitingReferences(documentId)` - Get citing references

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| clientId | string | Yes | OAuth client ID |
| clientSecret | string | Yes | OAuth client secret |
| baseUrl | string | No | API base URL (default: https://api.lexisnexis.com) |
| timeout | number | No | Request timeout in ms (default: 30000) |

## License

MIT
