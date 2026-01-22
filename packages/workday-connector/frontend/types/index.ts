/**
 * Workday Connector Types
 * 
 * TypeScript type definitions for Workday HCM integration
 */

// Configuration Types
export interface WorkdayConfig {
  tenantUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  apiVersion?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface WorkdayConnectionResponse {
  connected: boolean;
  tenantUrl: string;
  apiVersion: string;
  tokenExpiresAt?: Date;
}

// Worker Types
export type WorkerStatus = 'Active' | 'Terminated' | 'On Leave' | 'Inactive';

export interface ManagerInfo {
  id: string;
  name: string;
}

export interface WorkdayWorker {
  id: string;
  workerId: string;
  employeeId?: string;
  contingentWorkerId?: string;
  fullName: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  workEmail?: string;
  phone?: string;
  workPhone?: string;
  jobTitle?: string;
  businessTitle?: string;
  department?: string;
  location?: string;
  manager?: ManagerInfo;
  hireDate?: Date;
  terminationDate?: Date;
  status: WorkerStatus;
  employeeType?: string;
  payGroup?: string;
  costCenter?: string;
  company?: string;
}

export interface WorkerListResponse {
  workers: WorkdayWorker[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface WorkerSearchOptions {
  query?: string;
  status?: WorkerStatus;
  department?: string;
  location?: string;
  managerId?: string;
  offset?: number;
  limit?: number;
}

// Organization Types
export interface WorkdayOrganization {
  id: string;
  name: string;
  code: string;
  type: string;
  parentOrg?: {
    id: string;
    name: string;
  };
  manager?: ManagerInfo;
  level?: number;
  effectiveDate?: Date;
  inactive: boolean;
  subOrganizations?: WorkdayOrganization[];
}

// Job Profile Types
export interface WorkdayJobProfile {
  id: string;
  name: string;
  jobCode: string;
  jobFamily?: string;
  jobFamilyGroup?: string;
  managementLevel?: string;
  payRateType?: string;
  inactive: boolean;
}

// Time Off Types
export type TimeOffStatus = 'Pending' | 'Approved' | 'Denied' | 'Cancelled';

export interface TimeOffRequest {
  workerId: string;
  timeOffType: string;
  startDate: Date;
  endDate: Date;
  comments?: string;
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
}

export interface WorkdayTimeOff {
  requestId: string;
  workerId: string;
  timeOffType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalHours: number;
  status: TimeOffStatus;
  comments?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface TimeOffBalance {
  timeOffType: string;
  typeName: string;
  balance: number;
  unit: string;
  asOfDate: Date;
  pendingRequests: number;
  available: number;
}

// Payroll Types
export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annual';

export interface EarningsDeduction {
  name: string;
  code: string;
  amount: number;
  hours?: number;
  rate?: number;
}

export interface WorkdayPayslip {
  payslipId: string;
  workerId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  paymentDate: Date;
  grossPay: number;
  netPay: number;
  currency: string;
  earnings: EarningsDeduction[];
  deductions: EarningsDeduction[];
  taxes: EarningsDeduction[];
}

export interface PayslipListResponse {
  payslips: WorkdayPayslip[];
  total: number;
  workerId: string;
}

export interface WorkdayCompensation {
  workerId: string;
  compensationType: string;
  amount: number;
  currency: string;
  frequency: PayFrequency;
  effectiveDate: Date;
  endDate?: Date;
  reason?: string;
  annualEquivalent: number;
}

// Benefits Types
export interface DependentInfo {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth?: Date;
  covered: boolean;
}

export interface BenefitEnrollment {
  enrollmentId: string;
  workerId: string;
  planId: string;
  planName: string;
  planType: string;
  coverageLevel: string;
  employeeCost: number;
  employerCost: number;
  totalCost: number;
  currency: string;
  payFrequency: PayFrequency;
  effectiveDate: Date;
  endDate?: Date;
  dependents: DependentInfo[];
}

export interface BenefitPlan {
  planId: string;
  planName: string;
  planType: string;
  description?: string;
  coverageOptions: string[];
  employeeCostRange?: string;
  active: boolean;
}

// Event Types
export interface WorkdayEvent {
  type: string;
  timestamp: Date;
  data: unknown;
}

export type WorkdayEventHandler = (event: WorkdayEvent) => void;

// API Response Types
export interface WorkdayApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

// WQL Types
export interface WQLQuery {
  query: string;
  parameters?: Record<string, unknown>;
}

export interface WQLResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
}

// Report Types
export interface RAASReport {
  reportId: string;
  reportName: string;
  parameters?: Record<string, unknown>;
}

export interface RAASResult {
  data: Record<string, unknown>[];
  metadata: {
    reportName: string;
    generatedAt: Date;
    rowCount: number;
  };
}
