# HIPAA Privacy Suite

HIPAA Privacy Rule compliance for EVE-OS marketplace.

## Features

- PHI detection and masking
- Minimum necessary enforcement
- Access control validation
- Audit trail logging
- Breach notification support

## Installation

Install via EVE-OS Marketplace UI or:

```typescript
import { HIPAAPrivacyService } from '@eve-os/hipaa-compliance';

const hipaa = new HIPAAPrivacyService({
    encryptionKey: process.env.HIPAA_ENCRYPTION_KEY,
    auditEnabled: true
});
```

## Usage

### Detect PHI in Text

```typescript
const result = await hipaa.detectPHI({
    text: 'Patient John Doe, SSN 123-45-6789, DOB 01/15/1980'
});
// Returns detected PHI entities with categories
```

### Mask PHI Data

```typescript
const masked = await hipaa.maskPHI({
    text: 'Patient SSN: 123-45-6789',
    maskChar: '*'
});
// Returns: 'Patient SSN: ***-**-****'
```

### Validate Access

```typescript
const valid = await hipaa.validateAccess({
    userId: 'user123',
    resourceType: 'patient_record',
    purpose: 'treatment'
});
```

## API Reference

See [HIPAAPrivacyService.ts](./frontend/HIPAAPrivacyService.ts) for full API documentation.

## Backend Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/hipaa/detect-phi` | Detect PHI in text |
| POST | `/hipaa/mask-phi` | Mask PHI data |
| POST | `/hipaa/validate-access` | Validate access rights |
| GET | `/hipaa/audit-log` | Get audit log entries |
| POST | `/hipaa/report-breach` | Report potential breach |

## License

MIT
