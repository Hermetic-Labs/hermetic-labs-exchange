import { useState, useRef } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { Employee, CompanySettings } from '../types';

interface PayStubsProps {
  employees: Employee[];
  companySettings: CompanySettings;
}

export default function PayStubs({ employees, companySettings }: PayStubsProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [payPeriod, setPayPeriod] = useState({ start: '2025-12-16', end: '2025-12-31' });
  const [hoursWorked, setHoursWorked] = useState(80);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const stubRef = useRef<HTMLDivElement>(null);

  const calculatePayStub = () => {
    if (!selectedEmployee) return null;

    const regularPay = selectedEmployee.hourlyRate * hoursWorked;
    const overtimePay = selectedEmployee.hourlyRate * 1.5 * overtimeHours;
    const grossPay = regularPay + overtimePay;

    const federalTax = grossPay * 0.12;
    const stateTax = grossPay * 0.05;
    const socialSecurity = grossPay * 0.062;
    const medicare = grossPay * 0.0145;
    const healthInsurance = 150;
    const retirement = grossPay * 0.06;

    const totalDeductions = federalTax + stateTax + socialSecurity + medicare + healthInsurance + retirement;
    const netPay = grossPay - totalDeductions;

    return {
      regularPay, overtimePay, grossPay,
      federalTax, stateTax, socialSecurity, medicare, healthInsurance, retirement,
      totalDeductions, netPay
    };
  };

  const payStub = calculatePayStub();

  const handleDownload = () => {
    alert('Mock: Downloading pay stub as PDF...');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <FileText size={28} /> Pay Stub Generator
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Select Employee</h2>
            <select
              value={selectedEmployee?.id || ''}
              onChange={e => setSelectedEmployee(employees.find(emp => emp.id === e.target.value) || null)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} - {emp.department}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Pay Period</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                <input type="date" value={payPeriod.start} onChange={e => setPayPeriod({...payPeriod, start: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date</label>
                <input type="date" value={payPeriod.end} onChange={e => setPayPeriod({...payPeriod, end: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Hours</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Regular Hours</label>
                <input type="number" value={hoursWorked} onChange={e => setHoursWorked(+e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Overtime Hours</label>
                <input type="number" value={overtimeHours} onChange={e => setOvertimeHours(+e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedEmployee && payStub ? (
            <div ref={stubRef} className="bg-white rounded-lg shadow print:shadow-none">
              <div className="p-8 border-b" style={{ borderColor: companySettings.primaryColor }}>
                <div className="flex justify-between items-start">
                  <div>
                    {companySettings.logo ? (
                      <img src={companySettings.logo} alt="Logo" className="h-12 mb-2" />
                    ) : (
                      <div className="w-12 h-12 rounded flex items-center justify-center text-white font-bold mb-2" style={{ backgroundColor: companySettings.primaryColor }}>
                        {companySettings.companyName.charAt(0)}
                      </div>
                    )}
                    <h2 className="text-xl font-bold">{companySettings.companyName}</h2>
                    <p className="text-sm text-gray-600">{companySettings.address}</p>
                    <p className="text-sm text-gray-600">{companySettings.city}, {companySettings.state} {companySettings.zip}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-lg font-semibold">PAY STUB</h3>
                    <p className="text-sm text-gray-600">Pay Period: {payPeriod.start} to {payPeriod.end}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-b">
                <h3 className="font-semibold mb-2">Employee Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Name:</span> {selectedEmployee.name}</div>
                  <div><span className="text-gray-500">Department:</span> {selectedEmployee.department}</div>
                  <div><span className="text-gray-500">Position:</span> {selectedEmployee.position}</div>
                  <div><span className="text-gray-500">Pay Rate:</span> ${selectedEmployee.hourlyRate.toFixed(2)}/hr</div>
                </div>
              </div>

              <div className="p-8 grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">Earnings</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Regular ({hoursWorked} hrs)</span><span>${payStub.regularPay.toFixed(2)}</span></div>
                    {overtimeHours > 0 && <div className="flex justify-between"><span>Overtime ({overtimeHours} hrs)</span><span>${payStub.overtimePay.toFixed(2)}</span></div>}
                    <div className="flex justify-between font-semibold pt-2 border-t"><span>Gross Pay</span><span>${payStub.grossPay.toFixed(2)}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Deductions</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Federal Tax</span><span>-${payStub.federalTax.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>State Tax</span><span>-${payStub.stateTax.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Social Security</span><span>-${payStub.socialSecurity.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Medicare</span><span>-${payStub.medicare.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Health Insurance</span><span>-${payStub.healthInsurance.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>401(k)</span><span>-${payStub.retirement.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold pt-2 border-t"><span>Total Deductions</span><span>-${payStub.totalDeductions.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50 rounded-b-lg">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>NET PAY</span>
                  <span className="text-green-600">${payStub.netPay.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-4 flex gap-3 print:hidden">
                <button onClick={handleDownload} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  <Download size={18} /> Download PDF
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                  <Printer size={18} /> Print
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select an employee to generate a pay stub</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
