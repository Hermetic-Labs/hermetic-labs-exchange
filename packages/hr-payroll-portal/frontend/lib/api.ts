/**
 * HR Portal API Client
 *
 * Provides typed API calls to the HR backend endpoints.
 * Falls back to local state if API is unavailable.
 */

import { Employee, Department, JobPosting, PayrollData, PayrollResult } from '../types';

const API_BASE = '/api/hr';

// ============================================================================
// Types matching backend schemas
// ============================================================================

export interface ApiEmployee {
  id: string;
  name: string;
  email: string;
  department_id: string;
  department_name?: string;
  position: string;
  salary: number;
  hourly_rate: number;
  start_date: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiDepartment {
  id: string;
  name: string;
  head_id?: string;
  head_name?: string;
  budget?: number;
  description?: string;
  cost_center?: string;
  employee_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiJobPosting {
  id: string;
  title: string;
  department_id: string;
  department_name?: string;
  location: string;
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  salary_range?: string;
  status: 'draft' | 'open' | 'closed' | 'filled';
  posted_date?: string;
  applicant_count: number;
  created_at?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PayrollInput {
  employee_id: string;
  hourly_rate: number;
  hours_worked: number;
  overtime_hours: number;
  pay_period_start: string;
  pay_period_end: string;
  tax_config?: {
    federal_rate: number;
    state_rate: number;
    social_security_rate: number;
    medicare_rate: number;
  };
  deduction_config?: {
    health_insurance: number;
    retirement_401k_percent: number;
  };
}

export interface ApiPayrollResult {
  employee_id: string;
  employee_name?: string;
  regular_pay: number;
  overtime_pay: number;
  gross_pay: number;
  federal_tax: number;
  state_tax: number;
  social_security: number;
  medicare: number;
  total_taxes: number;
  health_insurance: number;
  retirement_401k: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  pay_period: string;
}

// ============================================================================
// Converters (API ↔ Frontend types)
// ============================================================================

export function apiToEmployee(api: ApiEmployee): Employee {
  return {
    id: api.id,
    name: api.name,
    email: api.email,
    department: api.department_name || api.department_id,
    position: api.position,
    salary: api.salary,
    hourlyRate: api.hourly_rate,
    startDate: api.start_date,
    status: api.status === 'active' ? 'active' : 'inactive',
  };
}

export function employeeToApi(emp: Partial<Employee>, departmentId?: string): Partial<ApiEmployee> {
  return {
    name: emp.name,
    email: emp.email,
    department_id: departmentId || emp.department,
    position: emp.position,
    salary: emp.salary,
    hourly_rate: emp.hourlyRate,
    start_date: emp.startDate,
    status: emp.status,
  };
}

export function apiToDepartment(api: ApiDepartment): Department {
  return {
    id: api.id,
    name: api.name,
    head: api.head_name || api.head_id || '',
    employeeCount: api.employee_count,
    budget: api.budget || 0,
  };
}

export function departmentToApi(dept: Partial<Department>): Partial<ApiDepartment> {
  return {
    name: dept.name,
    budget: dept.budget,
    // head_id would need lookup
  };
}

export function apiToJobPosting(api: ApiJobPosting): JobPosting {
  return {
    id: api.id,
    title: api.title,
    department: api.department_name || api.department_id,
    location: api.location,
    type: api.job_type === 'full-time' ? 'Full-time' :
          api.job_type === 'part-time' ? 'Part-time' :
          api.job_type === 'contract' ? 'Contract' : 'Internship',
    salary: api.salary_range || '',
    status: api.status === 'open' ? 'open' : 'closed',
    postedDate: api.posted_date || api.created_at || '',
  };
}

export function apiToPayrollResult(api: ApiPayrollResult): PayrollResult {
  return {
    employeeId: api.employee_id,
    employeeName: api.employee_name || '',
    grossPay: api.gross_pay,
    netPay: api.net_pay,
    deductions: api.total_deductions,
    payPeriod: api.pay_period,
  };
}

// ============================================================================
// API Client
// ============================================================================

class HRApiClient {
  private baseUrl: string;

  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ========================================================================
  // Status
  // ========================================================================

  async getStatus() {
    return this.fetch<{ status: string; version: string }>('/status');
  }

  // ========================================================================
  // Employees
  // ========================================================================

  async listEmployees(page = 1, perPage = 50): Promise<Employee[]> {
    const data = await this.fetch<PaginatedResponse<ApiEmployee>>(
      `/employees?page=${page}&per_page=${perPage}`
    );
    return data.items.map(apiToEmployee);
  }

  async getEmployee(id: string): Promise<Employee> {
    const data = await this.fetch<ApiEmployee>(`/employees/${id}`);
    return apiToEmployee(data);
  }

  async createEmployee(employee: Partial<Employee>, departmentId: string): Promise<Employee> {
    const data = await this.fetch<ApiEmployee>('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeToApi(employee, departmentId)),
    });
    return apiToEmployee(data);
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    const data = await this.fetch<ApiEmployee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeToApi(updates)),
    });
    return apiToEmployee(data);
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.fetch(`/employees/${id}`, { method: 'DELETE' });
  }

  async bulkUploadEmployees(file: File): Promise<{ imported: number; failed: number; errors: any[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/employees/bulk`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Bulk upload failed');
    }

    return response.json();
  }

  // ========================================================================
  // Departments
  // ========================================================================

  async listDepartments(): Promise<Department[]> {
    const data = await this.fetch<PaginatedResponse<ApiDepartment>>('/departments');
    return data.items.map(apiToDepartment);
  }

  async getDepartment(id: string): Promise<Department> {
    const data = await this.fetch<ApiDepartment>(`/departments/${id}`);
    return apiToDepartment(data);
  }

  async createDepartment(department: Partial<Department>): Promise<Department> {
    const data = await this.fetch<ApiDepartment>('/departments', {
      method: 'POST',
      body: JSON.stringify(departmentToApi(department)),
    });
    return apiToDepartment(data);
  }

  async updateDepartment(id: string, updates: Partial<Department>): Promise<Department> {
    const data = await this.fetch<ApiDepartment>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(departmentToApi(updates)),
    });
    return apiToDepartment(data);
  }

  async deleteDepartment(id: string): Promise<void> {
    await this.fetch(`/departments/${id}`, { method: 'DELETE' });
  }

  // ========================================================================
  // Job Postings
  // ========================================================================

  async listJobPostings(status?: string): Promise<JobPosting[]> {
    const query = status ? `?status=${status}` : '';
    const data = await this.fetch<ApiJobPosting[]>(`/jobs${query}`);
    return data.map(apiToJobPosting);
  }

  async createJobPosting(posting: Partial<JobPosting>, departmentId: string): Promise<JobPosting> {
    const data = await this.fetch<ApiJobPosting>('/jobs', {
      method: 'POST',
      body: JSON.stringify({
        title: posting.title,
        department_id: departmentId,
        location: posting.location,
        job_type: posting.type?.toLowerCase().replace('-', '') || 'full-time',
        salary_range: posting.salary,
      }),
    });
    return apiToJobPosting(data);
  }

  async updateJobStatus(id: string, status: 'draft' | 'open' | 'closed' | 'filled'): Promise<JobPosting> {
    const data = await this.fetch<ApiJobPosting>(`/jobs/${id}/status?status=${status}`, {
      method: 'PUT',
    });
    return apiToJobPosting(data);
  }

  // ========================================================================
  // Payroll
  // ========================================================================

  async calculatePayroll(input: PayrollInput): Promise<PayrollResult> {
    const data = await this.fetch<ApiPayrollResult>('/payroll/calculate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return apiToPayrollResult(data);
  }

  async runPayroll(
    employeeIds: string[],
    payPeriodStart: string,
    payPeriodEnd: string,
    hoursMap?: Record<string, { hours_worked: number; overtime_hours: number }>
  ): Promise<PayrollResult[]> {
    const data = await this.fetch<ApiPayrollResult[]>('/payroll/run', {
      method: 'POST',
      body: JSON.stringify({
        employee_ids: employeeIds,
        pay_period_start: payPeriodStart,
        pay_period_end: payPeriodEnd,
        hours_map: hoursMap,
      }),
    });
    return data.map(apiToPayrollResult);
  }
}

// Singleton instance
export const hrApi = new HRApiClient();

// ============================================================================
// Hooks for React components
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await hrApi.listEmployees();
      setEmployees(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (employee: Partial<Employee>, departmentId: string) => {
    const newEmp = await hrApi.createEmployee(employee, departmentId);
    setEmployees(prev => [...prev, newEmp]);
    return newEmp;
  };

  const update = async (id: string, updates: Partial<Employee>) => {
    const updated = await hrApi.updateEmployee(id, updates);
    setEmployees(prev => prev.map(e => e.id === id ? updated : e));
    return updated;
  };

  const remove = async (id: string) => {
    await hrApi.deleteEmployee(id);
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  return { employees, loading, error, refresh, create, update, remove, setEmployees };
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await hrApi.listDepartments();
      setDepartments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (department: Partial<Department>) => {
    const newDept = await hrApi.createDepartment(department);
    setDepartments(prev => [...prev, newDept]);
    return newDept;
  };

  const update = async (id: string, updates: Partial<Department>) => {
    const updated = await hrApi.updateDepartment(id, updates);
    setDepartments(prev => prev.map(d => d.id === id ? updated : d));
    return updated;
  };

  const remove = async (id: string) => {
    await hrApi.deleteDepartment(id);
    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  return { departments, loading, error, refresh, create, update, remove, setDepartments };
}

export function useJobPostings() {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await hrApi.listJobPostings();
      setJobPostings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job postings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { jobPostings, loading, error, refresh, setJobPostings };
}
