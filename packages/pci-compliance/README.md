# PCI DSS Compliance Suite

PCI DSS compliance for EVE-OS marketplace.

## Features

- Cardholder data protection
- Network security validation
- Access control management
- Vulnerability management
- SAQ preparation

## Installation

Install via EVE-OS Marketplace UI or:

```typescript
import { PCIComplianceService } from '@eve-os/pci-compliance';

const pci = new PCIComplianceService({
    encryptionKey: process.env.PCI_ENCRYPTION_KEY,
    environment: 'production'
});
```

## Usage

### Validate Card Data Handling

```typescript
const result = await pci.validateCardHandling({
    storagePractices: 'tokenized',
    encryptionMethod: 'AES-256'
});
```

### Check PAN Security

```typescript
const secure = await pci.validatePAN({
    pan: '4111111111111111',
    masked: true
});
```

### Run Compliance Assessment

```typescript
const assessment = await pci.runAssessment({
    saqType: 'A',
    requirements: ['1', '2', '3']
});
```

## API Reference

See [PCIComplianceService.ts](./frontend/PCIComplianceService.ts) for full API documentation.

## Backend Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/pci/validate-pan` | Validate PAN handling |
| POST | `/pci/mask-pan` | Mask card number |
| POST | `/pci/assessment` | Run compliance assessment |
| GET | `/pci/requirements` | Get PCI requirements |
| POST | `/pci/scan` | Run vulnerability scan |

## License

MIT
