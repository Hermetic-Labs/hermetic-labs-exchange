# @eve-os/workday-connector

Workday HCM integration for EVE OS providing comprehensive HR management capabilities.

## Features

### Workers
- Worker profile management
- Employee and contingent worker support
- Organization hierarchy navigation
- Manager relationships
- Worker search and filtering

### Time Off
- Time off request submission
- Balance tracking by type
- Request approval status
- Accrual policies
- Calendar integration

### Payroll
- Payslip retrieval
- Compensation management
- Pay group assignments
- Payroll period tracking
- Earnings and deductions

### Benefits
- Benefit plan enrollment
- Coverage tracking
- Dependent management
- Life events processing
- Open enrollment support

## Installation

```bash
pnpm add @eve-os/workday-connector
```

## Usage

```typescript
import { WorkdayConnector } from '@eve-os/workday-connector';

const connector = new WorkdayConnector({
  tenantUrl: 'https://your-tenant.workday.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  refreshToken: 'your-refresh-token'
});

// Connect to Workday
await connector.connect();

// Get workers
const workers = await connector.getWorkers({
  status: 'Active',
  limit: 100
});

// Get time off balances
const balances = await connector.getTimeOffBalances(workerId);

// Get payslips
const payslips = await connector.getPayslips(workerId, {
  fromDate: new Date('2024-01-01'),
  toDate: new Date('2024-12-31')
});

// Get benefit enrollments
const benefits = await connector.getBenefitEnrollments(workerId);
```

## API Reference

### WorkdayConnector

Main connector class for Workday API integration.

#### Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| tenantUrl | string | Yes | Workday tenant URL |
| clientId | string | Yes | OAuth client ID |
| clientSecret | string | Yes | OAuth client secret |
| refreshToken | string | Yes | OAuth refresh token |
| apiVersion | string | No | API version (default: v1) |
| timeout | number | No | Request timeout in ms |
| maxRetries | number | No | Max retry attempts |

### Methods

#### Workers
- `getWorkers(options?)` - List workers with filtering
- `getWorker(id)` - Get worker by ID
- `searchWorkers(query)` - Search workers

#### Time Off
- `getTimeOffRequests(workerId, options?)` - List time off requests
- `getTimeOffBalances(workerId)` - Get time off balances
- `submitTimeOffRequest(request)` - Submit new request

#### Payroll
- `getPayslips(workerId, options?)` - Get payslips
- `getCompensation(workerId)` - Get compensation details

#### Benefits
- `getBenefitEnrollments(workerId)` - Get benefit enrollments
- `getBenefitPlans()` - List available plans

## License

MIT © EVE Core Team
