# HR & Payroll Portal

Complete HR management and payroll processing portal. Manage employees, departments, job postings, banking, payroll calculations, pay stubs, and integrations.

## Overview

The HR & Payroll Portal is a full-featured white-label HR solution that runs locally with persistent data storage. It includes 10 pages covering all major HR workflows, from employee onboarding to payroll processing.

## Features

- Employee management with detailed profiles
- Department organization and budgets
- Job posting board with status tracking
- Banking integrations (mock)
- Third-party integrations (Gusto, ADP, QuickBooks, Paychex)
- Payroll calculator with taxes and deductions
- Bulk employee upload via CSV
- Pay stub generation with PDF export
- Company settings and branding customization
- Dashboard analytics

## Pages

| Page | Description |
|------|-------------|
| Dashboard | Overview with stats, recent employees, departments |
| Employees | Employee table with add/edit/delete |
| Departments | Department cards with budget tracking |
| Job Postings | Job board with posting management |
| Banking | Mock banking integration setup |
| Integrations | Third-party payroll provider connections |
| Payroll Calculator | Real-time payroll calculation tool |
| Bulk Upload | CSV import for multiple employees |
| Pay Stubs | Pay stub generation and history |
| Settings | Company branding and configuration |

## Backend API

All data persists locally using JSON file storage (upgradable to SQLite).

### Endpoints

```
GET    /hr/status              - Health check
POST   /hr/employees           - Create employee
GET    /hr/employees           - List employees (paginated)
GET    /hr/employees/{id}      - Get employee
PUT    /hr/employees/{id}      - Update employee
DELETE /hr/employees/{id}      - Delete employee
POST   /hr/employees/bulk      - CSV bulk upload

POST   /hr/departments         - Create department
GET    /hr/departments         - List departments
GET    /hr/departments/{id}    - Get department
PUT    /hr/departments/{id}    - Update department
DELETE /hr/departments/{id}    - Delete department

POST   /hr/payroll/calculate   - Calculate payroll (pure)
POST   /hr/payroll/run         - Run batch payroll
POST   /hr/payroll/stubs       - Create pay stub
GET    /hr/payroll/stubs       - List pay stubs

POST   /hr/jobs                - Create job posting
GET    /hr/jobs                - List job postings
PUT    /hr/jobs/{id}/status    - Update job status
```

## Storage

The backend supports pluggable storage:

- **JsonFileStorage** (default) - Simple JSON file persistence
- **SQLiteStorage** - For larger deployments
- **Custom** - Implement `StorageProtocol` for any database

## Usage

```tsx
import { HRPortal } from '@eve/hr-payroll-portal';

function App() {
  return <HRPortal />;
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| HR_DATA_DIR | ./data | Directory for data storage |

## Dependencies

### Frontend
- `lucide-react` - Icons
- `recharts` - Dashboard charts

### Backend
- `fastapi>=0.100.0`
- `pydantic>=2.0.0`
- `python-multipart>=0.0.6`
- `aiosqlite>=0.19.0`

## Exports

### Schemas
- Employee, EmployeeCreate, Department, DepartmentCreate
- PayrollInput, PayrollResult, PayStub
- TaxConfig, DeductionConfig

### Services
- HRService - Employee and department CRUD
- PayrollService - Payroll calculation (pure functions)

### Storage
- JsonFileStorage, SQLiteStorage, StorageProtocol

## License

EVE-MARKET-001
