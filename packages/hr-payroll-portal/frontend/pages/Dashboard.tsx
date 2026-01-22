import { Users, Building2, DollarSign, TrendingUp } from 'lucide-react';
import { Employee, Department } from '../types';

interface DashboardProps {
  employees: Employee[];
  departments: Department[];
}

export default function Dashboard({ employees, departments }: DashboardProps) {
  const totalPayroll = employees.reduce((sum, e) => sum + e.salary, 0);
  const activeEmployees = employees.filter(e => e.status === 'active').length;

  const stats = [
    { label: 'Total Employees', value: employees.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Departments', value: departments.length, icon: Building2, color: 'bg-green-500' },
    { label: 'Annual Payroll', value: `$${totalPayroll.toLocaleString()}`, icon: DollarSign, color: 'bg-purple-500' },
    { label: 'Active', value: activeEmployees, icon: TrendingUp, color: 'bg-orange-500' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Employees</h2>
          <div className="space-y-3">
            {employees.slice(0, 5).map((emp) => (
              <div key={emp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{emp.name}</p>
                  <p className="text-sm text-gray-500">{emp.position}</p>
                </div>
                <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">{emp.department}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Department Overview</h2>
          <div className="space-y-3">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{dept.name}</p>
                  <p className="text-sm text-gray-500">{dept.employeeCount} employees</p>
                </div>
                <span className="text-sm text-gray-600">${(dept.budget / 1000).toFixed(0)}K budget</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
