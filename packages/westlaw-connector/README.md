# @eve-os/westlaw-connector

Westlaw legal research integration for EVE OS providing comprehensive legal document search, KeyCite validation, and case law analysis.

## Features

### Document Search
- Full-text legal document search
- Case law database access
- Statutory research
- Regulations and administrative materials
- Secondary sources and treatises

### KeyCite Validation
- Citation validity checking
- Negative treatment alerts
- Positive history tracking
- Citing references analysis
- Depth of treatment metrics

### Case Law Research
- Federal and state court coverage
- Headnote and key number system
- Synopsis and holding summaries
- Judge and attorney information
- Procedural history tracking

### Statute Annotations
- Current statute text
- Historical versions
- Amendment tracking
- Cross-references
- Editorial notes and commentary

### Secondary Sources
- Legal encyclopedias
- Law reviews and journals
- Practice guides
- Treatises
- Restatements

## Installation

```bash
pnpm add @eve-os/westlaw-connector
```

## Usage

```typescript
import { WestlawConnector } from '@eve-os/westlaw-connector';

const connector = new WestlawConnector({
  apiKey: 'your-api-key',
  clientId: 'your-client-id'
});

// Connect to Westlaw
await connector.connect();

// Search for case law
const results = await connector.searchCases({
  query: 'breach of contract damages',
  jurisdiction: 'US-FED',
  dateFrom: '2020-01-01'
});

// KeyCite a citation
const keyCiteResult = await connector.keyCite('410 U.S. 113');

console.log('KeyCite Status:', keyCiteResult.status);
console.log('Citing References:', keyCiteResult.citingReferences.length);
```

## API Reference

### WestlawConnector

Main connector class for Westlaw integration.

#### Constructor

```typescript
new WestlawConnector(config: WestlawConfig)
```

#### Methods

- `connect()`: Establish connection to Westlaw
- `disconnect()`: Close connection
- `searchDocuments(params)`: Search legal documents
- `searchCases(params)`: Search case law
- `searchStatutes(params)`: Search statutes
- `getDocument(id)`: Retrieve full document
- `keyCite(citation)`: Get KeyCite information
- `getKeyNumber(number)`: Get key number details
- `getCitingReferences(citation)`: Get citing references

## Events

The connector emits events for connection status and search progress:

```typescript
connector.on('connected', () => console.log('Connected'));
connector.on('disconnected', () => console.log('Disconnected'));
connector.on('search:start', () => console.log('Search started'));
connector.on('search:complete', (results) => console.log('Search complete'));
connector.on('error', (error) => console.error('Error:', error));
```

## License

MIT
