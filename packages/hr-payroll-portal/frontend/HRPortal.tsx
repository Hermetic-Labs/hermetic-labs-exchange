/**
 * HRPortal - Main wrapper component for the HR & Payroll Portal
 *
 * This component provides the layout shell with sidebar navigation
 * and routes between the different HR portal pages.
 *
 * Uses API hooks with automatic fallback to seed data if backend unavailable.
 */
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Departments from './pages/Departments';
import JobPostings from './pages/JobPostings';
import Banking from './pages/Banking';
import Integrations from './pages/Integrations';
import PayrollCalculator from './pages/PayrollCalculator';
import BulkUpload from './pages/BulkUpload';
import PayStubs from './pages/PayStubs';
import Settings from './pages/Settings';
import { Employee, Department, JobPosting, CompanySettings } from './types';
import { useEmployees, useDepartments, useJobPostings, hrApi } from './lib/api';

export interface HRPortalProps {
  initialPage?: string;
  onNavigate?: (page: string) => void;
}

// Seed data for fallback when API unavailable
const seedEmployees: Employee[] = [
  { id: '1', name: 'John Smith', email: 'john@company.com', department: 'Engineering', position: 'Senior Developer', salary: 95000, hourlyRate: 45.67, startDate: '2022-03-15', status: 'active' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', department: 'Marketing', position: 'Marketing Manager', salary: 78000, hourlyRate: 37.50, startDate: '2021-08-01', status: 'active' },
  { id: '3', name: 'Mike Chen', email: 'mike@company.com', department: 'Engineering', position: 'DevOps Engineer', salary: 88000, hourlyRate: 42.31, startDate: '2023-01-10', status: 'active' },
];

const seedDepartments: Department[] = [
  { id: '1', name: 'Engineering', head: 'John Smith', employeeCount: 12, budget: 1500000 },
  { id: '2', name: 'Marketing', head: 'Sarah Johnson', employeeCount: 6, budget: 500000 },
  { id: '3', name: 'Human Resources', head: 'Emily Davis', employeeCount: 4, budget: 300000 },
];

const seedJobPostings: JobPosting[] = [
  { id: '1', title: 'Frontend Developer', department: 'Engineering', location: 'Remote', type: 'Full-time', salary: '$80,000 - $100,000', status: 'open', postedDate: '2024-12-01' },
  { id: '2', title: 'Product Designer', department: 'Design', location: 'Hybrid', type: 'Full-time', salary: '$70,000 - $90,000', status: 'open', postedDate: '2024-12-10' },
];

const defaultCompanySettings: CompanySettings = {
  companyName: 'Acme Corporation',
  address: '123 Main Street',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102',
  phone: '(555) 123-4567',
  email: 'hr@acme.com',
  logo: null,
  primaryColor: '#3B82F6',
};

export default function HRPortal({ initialPage = 'dashboard', onNavigate }: HRPortalProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  // API hooks
  const employeesHook = useEmployees();
  const departmentsHook = useDepartments();
  const jobPostingsHook = useJobPostings();

  // Local state fallbacks
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(seedEmployees);
  const [localDepartments, setLocalDepartments] = useState<Department[]>(seedDepartments);
  const [localJobPostings, setLocalJobPostings] = useState<JobPosting[]>(seedJobPostings);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);

  // Check API availability on mount
  useEffect(() => {
    hrApi.getStatus()
      .then(() => setApiAvailable(true))
      .catch(() => setApiAvailable(false));
  }, []);

  // Use API data if available, otherwise fall back to local
  const employees = apiAvailable && employeesHook.employees.length > 0
    ? employeesHook.employees
    : localEmployees;

  const departments = apiAvailable && departmentsHook.departments.length > 0
    ? departmentsHook.departments
    : localDepartments;

  const jobPostings = apiAvailable && jobPostingsHook.jobPostings.length > 0
    ? jobPostingsHook.jobPostings
    : localJobPostings;

  // Unified setters that update both API and local state
  const setEmployees = (newEmployees: Employee[] | ((prev: Employee[]) => Employee[])) => {
    if (typeof newEmployees === 'function') {
      setLocalEmployees(newEmployees);
      employeesHook.setEmployees(newEmployees);
    } else {
      setLocalEmployees(newEmployees);
      employeesHook.setEmployees(newEmployees);
    }
  };

  const setDepartments = (newDepts: Department[] | ((prev: Department[]) => Department[])) => {
    if (typeof newDepts === 'function') {
      setLocalDepartments(newDepts);
      departmentsHook.setDepartments(newDepts);
    } else {
      setLocalDepartments(newDepts);
      departmentsHook.setDepartments(newDepts);
    }
  };

  const setJobPostings = (newPostings: JobPosting[] | ((prev: JobPosting[]) => JobPosting[])) => {
    if (typeof newPostings === 'function') {
      setLocalJobPostings(newPostings);
      jobPostingsHook.setJobPostings(newPostings);
    } else {
      setLocalJobPostings(newPostings);
      jobPostingsHook.setJobPostings(newPostings);
    }
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    onNavigate?.(page);
  };

  // Wrapper for BulkUpload's functional setState
  const handleBulkUploadSetEmployees = (fn: (employees: Employee[]) => Employee[]) => {
    setEmployees(fn);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard employees={employees} departments={departments} />;
      case 'employees':
        return <Employees employees={employees} setEmployees={setEmployees} departments={departments} />;
      case 'departments':
        return <Departments departments={departments} setDepartments={setDepartments} />;
      case 'job-postings':
        return <JobPostings jobPostings={jobPostings} setJobPostings={setJobPostings} />;
      case 'banking':
        return <Banking />;
      case 'integrations':
        return <Integrations />;
      case 'payroll-calculator':
        return <PayrollCalculator />;
      case 'bulk-upload':
        return <BulkUpload setEmployees={handleBulkUploadSetEmployees} />;
      case 'pay-stubs':
        return <PayStubs employees={employees} companySettings={companySettings} />;
      case 'settings':
        return <Settings companySettings={companySettings} setCompanySettings={setCompanySettings} />;
      default:
        return <Dashboard employees={employees} departments={departments} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-full bg-slate-950">
        <Sidebar currentPage={currentPage} setCurrentPage={handlePageChange} />
        <main className="flex-1 overflow-auto">
          {/* API status indicator */}
          {apiAvailable === false && (
            <div className="bg-amber-900/50 text-amber-200 text-xs px-4 py-1 text-center">
              Running in offline mode - changes are local only
            </div>
          )}
          {renderPage()}
        </main>
      </div>
    </ErrorBoundary>
  );
}
