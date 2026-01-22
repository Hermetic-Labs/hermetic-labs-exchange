/**
 * HR & Payroll Portal - Marketplace Package
 *
 * Complete HR management and payroll processing portal.
 * Manage employees, departments, job postings, banking, payroll, and more.
 *
 * This is a PLUGIN type package that adds a full HR system.
 */

// ============================================================================
// Component Metadata
// ============================================================================

export const COMPONENT_ID = 'hr-payroll-portal';
export const COMPONENT_TYPE = 'plugin';
export const COMPONENT_VERSION = '1.0.0';

// ============================================================================
// Core Exports
// ============================================================================

// Main Portal Component - MUST match first item in manifest.json "components"
export { default as HRPortal } from './HRPortal';

// Also export as default for sidebar integration
export { default } from './HRPortal';

// Components
export { default as Sidebar } from './components/Sidebar';
export { default as ErrorBoundary } from './components/ErrorBoundary';

// Pages
export { default as Dashboard } from './pages/Dashboard';
export { default as Employees } from './pages/Employees';
export { default as Departments } from './pages/Departments';
export { default as JobPostings } from './pages/JobPostings';
export { default as Banking } from './pages/Banking';
export { default as Integrations } from './pages/Integrations';
export { default as PayrollCalculator } from './pages/PayrollCalculator';
export { default as BulkUpload } from './pages/BulkUpload';
export { default as PayStubs } from './pages/PayStubs';
export { default as Settings } from './pages/Settings';

// Types
export type {
  Employee,
  Department,
  JobPosting,
  CompanySettings,
  PayrollResult,
} from './types';

// ============================================================================
// Capability Detection API
// ============================================================================

/**
 * Check if HR portal is available
 */
export function isHRPortalAvailable(): boolean {
  return true;
}

/**
 * Get HR portal capabilities
 */
export interface HRPortalCapabilities {
  employees: boolean;
  departments: boolean;
  jobPostings: boolean;
  banking: boolean;
  payroll: boolean;
  payStubs: boolean;
  bulkUpload: boolean;
  integrations: boolean;
}

export function getHRPortalCapabilities(): HRPortalCapabilities {
  return {
    employees: true,
    departments: true,
    jobPostings: true,
    banking: true,
    payroll: true,
    payStubs: true,
    bulkUpload: true,
    integrations: true,
  };
}

// ============================================================================
// Integration API
// ============================================================================

export interface HRPortalConfig {
  companyName?: string;
  primaryColor?: string;
  enablePayroll?: boolean;
  enableJobPostings?: boolean;
  onEmployeeAdd?: (employee: import('./types').Employee) => void;
  onPayrollRun?: (results: import('./types').PayrollResult[]) => void;
}

export const DEFAULT_CONFIG: HRPortalConfig = {
  enablePayroll: true,
  enableJobPostings: true,
};

// ============================================================================
// Page Routes
// ============================================================================

export const HR_ROUTES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'employees', label: 'Employees', icon: 'Users' },
  { id: 'departments', label: 'Departments', icon: 'Building2' },
  { id: 'job-postings', label: 'Job Postings', icon: 'Briefcase' },
  { id: 'banking', label: 'Banking', icon: 'Building' },
  { id: 'integrations', label: 'Integrations', icon: 'Puzzle' },
  { id: 'payroll-calculator', label: 'Payroll Calculator', icon: 'Calculator' },
  { id: 'bulk-upload', label: 'Bulk Upload', icon: 'Upload' },
  { id: 'pay-stubs', label: 'Pay Stubs', icon: 'FileText' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
] as const;
