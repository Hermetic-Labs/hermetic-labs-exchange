# FHIR Compliance Suite

HL7 FHIR R4 compliance validation for EVE-OS marketplace.

## Features

- FHIR R4 resource validation
- Patient/Practitioner management
- Observation and Condition handling
- MedicationRequest processing
- Bundle/Transaction support

## Installation

Install via EVE-OS Marketplace UI or:

```typescript
import { FHIRComplianceService } from '@eve-os/fhir-compliance';

const fhir = new FHIRComplianceService({
    baseUrl: 'https://fhir.example.com/r4',
    version: 'R4'
});
```

## Usage

### Validate FHIR Resource

```typescript
const result = await fhir.validateResource({
    resourceType: 'Patient',
    resource: patientData
});
```

### Create Patient Resource

```typescript
const patient = await fhir.createPatient({
    name: [{ family: 'Doe', given: ['John'] }],
    birthDate: '1980-01-15',
    gender: 'male'
});
```

### Search Resources

```typescript
const results = await fhir.search({
    resourceType: 'Observation',
    params: { patient: 'Patient/123', code: '8867-4' }
});
```

## API Reference

See [FHIRComplianceService.ts](./frontend/FHIRComplianceService.ts) for full API documentation.

## Backend Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/fhir/validate` | Validate FHIR resource |
| POST | `/fhir/{resourceType}` | Create resource |
| GET | `/fhir/{resourceType}/{id}` | Get resource by ID |
| PUT | `/fhir/{resourceType}/{id}` | Update resource |
| GET | `/fhir/{resourceType}` | Search resources |

## License

MIT
