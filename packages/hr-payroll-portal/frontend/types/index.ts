export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  hourlyRate: number;
  startDate: string;
  status: 'active' | 'inactive';
}

export interface Department {
  id: string;
  name: string;
  head: string;
  employeeCount: number;
  budget: number;
}

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salary: string;
  status: 'open' | 'closed';
  postedDate: string;
}

export interface CompanySettings {
  companyName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  logo: string | null;
  primaryColor: string;
}

export interface PayrollData {
  hourlyRate: number;
  hoursWorked: number;
  overtimeHours: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  healthInsurance: number;
  retirement401k: number;
}

export interface PayrollResult {
  employeeId: string;
  employeeName: string;
  grossPay: number;
  netPay: number;
  deductions: number;
  payPeriod: string;
}
