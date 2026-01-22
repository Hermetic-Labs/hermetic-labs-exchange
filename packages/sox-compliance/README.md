# SOX Compliance Suite

Sarbanes-Oxley compliance for EVE-OS marketplace.

## Features

- Control documentation
- Audit trail management
- Segregation of duties
- Access control reviews
- Deficiency reporting

## Installation

Install via EVE-OS Marketplace UI or:

```typescript
import { SOXComplianceService } from '@eve-os/sox-compliance';

const sox = new SOXComplianceService({
    companyId: 'company-123',
    fiscalYear: 2025
});
```

## Usage

### Document a Control

```typescript
const control = await sox.createControl({
    name: 'Revenue Recognition Review',
    type: 'detective',
    frequency: 'monthly',
    owner: 'finance-manager'
});
```

### Log Control Test

```typescript
const test = await sox.logControlTest({
    controlId: 'ctrl-123',
    testDate: new Date(),
    result: 'effective',
    evidence: ['screenshot.png']
});
```

### Check Segregation of Duties

```typescript
const conflicts = await sox.checkSOD({
    userId: 'user-123',
    proposedRole: 'approver'
});
```

## API Reference

See [SOXComplianceService.ts](./frontend/SOXComplianceService.ts) for full API documentation.

## Backend Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sox/control` | Create control |
| GET | `/sox/controls` | List controls |
| POST | `/sox/test` | Log control test |
| POST | `/sox/sod-check` | Check segregation of duties |
| POST | `/sox/deficiency` | Report deficiency |

## License

MIT
