# FedRAMP Compliance Suite

FedRAMP authorization compliance for EVE-OS marketplace.

## Features

- Control baseline assessment
- Continuous monitoring
- POA&M management
- SSP documentation
- Vulnerability scanning integration

## Installation

Install via EVE-OS Marketplace UI or:

```typescript
import { FedRAMPComplianceService } from '@eve-os/fedramp-compliance';

const fedramp = new FedRAMPComplianceService({
    impactLevel: 'moderate',
    systemId: 'system-123'
});
```

## Usage

### Assess Control Implementation

```typescript
const result = await fedramp.assessControl({
    controlId: 'AC-2',
    implementation: 'Implemented via SSO integration...'
});
```

### Create POA&M Item

```typescript
const poam = await fedramp.createPOAM({
    weakness: 'Missing MFA for admin accounts',
    controlId: 'IA-2(1)',
    milestone: 'Implement MFA solution',
    scheduledCompletionDate: new Date('2025-06-01')
});
```

### Run Continuous Monitoring

```typescript
const report = await fedramp.runConMon({
    month: 'January',
    year: 2025,
    includeVulnScan: true
});
```

## API Reference

See [FedRAMPComplianceService.ts](./frontend/FedRAMPComplianceService.ts) for full API documentation.

## Backend Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/fedramp/assess` | Assess control |
| GET | `/fedramp/controls` | List controls by baseline |
| POST | `/fedramp/poam` | Create POA&M item |
| GET | `/fedramp/poam` | List POA&M items |
| POST | `/fedramp/conmon` | Run continuous monitoring |

## License

MIT
