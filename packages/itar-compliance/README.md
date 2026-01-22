# ITAR Compliance Suite

ITAR export control compliance for EVE-OS marketplace.

## Features

- USML classification
- Export license tracking
- Foreign person screening
- Technical data controls
- Audit reporting

## Installation

Install via EVE-OS Marketplace UI or:

```typescript
import { ITARComplianceService } from '@eve-os/itar-compliance';

const itar = new ITARComplianceService({
    companyId: 'company-123',
    ddtcRegistrationNumber: 'M12345'
});
```

## Usage

### Classify an Item

```typescript
const result = await itar.classifyItem({
    itemDescription: 'Night vision targeting system',
    technicalSpecs: { wavelength: '850nm' }
});
```

### Screen Foreign Person

```typescript
const screening = await itar.screenPerson({
    name: 'John Smith',
    nationality: 'UK',
    organization: 'Defense Corp Ltd'
});
```

### Request Export License

```typescript
const license = await itar.requestLicense({
    usmlCategory: 'XII',
    endUser: 'NATO Allied Force',
    destinationCountry: 'DE',
    items: [{ description: 'Targeting optics', quantity: 10 }]
});
```

## API Reference

See [ITARComplianceService.ts](./frontend/ITARComplianceService.ts) for full API documentation.

## Backend Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/itar/classify` | Classify item under USML |
| POST | `/itar/screen` | Screen foreign person |
| POST | `/itar/license` | Request export license |
| GET | `/itar/licenses` | List export licenses |
| GET | `/itar/audit` | Get audit report |

## License

MIT
