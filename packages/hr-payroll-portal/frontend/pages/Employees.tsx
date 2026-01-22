import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Employee, Department } from '../types';

interface EmployeesProps {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  departments: Department[];
}

export default function Employees({ employees, setEmployees, departments }: EmployeesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Employee | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    name: '', email: '', department: departments[0]?.name || '', position: '', 
    salary: 0, hourlyRate: 0, startDate: '', status: 'active'
  });

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({ ...emp });
  };

  const saveEdit = () => {
    if (editForm) {
      setEmployees(employees.map(e => e.id === editForm.id ? editForm : e));
      setEditingId(null);
      setEditForm(null);
    }
  };

  const deleteEmployee = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
  };

  const addEmployee = () => {
    const emp: Employee = {
      ...newEmployee as Employee,
      id: Date.now().toString(),
    };
    setEmployees([...employees, emp]);
    setShowAdd(false);
    setNewEmployee({ name: '', email: '', department: departments[0]?.name || '', position: '', salary: 0, hourlyRate: 0, startDate: '', status: 'active' });
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Add Employee
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Employee</h2>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Name" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className="border rounded px-3 py-2" />
            <input placeholder="Email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} className="border rounded px-3 py-2" />
            <select value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} className="border rounded px-3 py-2">
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <input placeholder="Position" value={newEmployee.position} onChange={e => setNewEmployee({...newEmployee, position: e.target.value})} className="border rounded px-3 py-2" />
            <input type="number" placeholder="Salary" value={newEmployee.salary || ''} onChange={e => setNewEmployee({...newEmployee, salary: +e.target.value, hourlyRate: +e.target.value / 2080})} className="border rounded px-3 py-2" />
            <input type="date" value={newEmployee.startDate} onChange={e => setNewEmployee({...newEmployee, startDate: e.target.value})} className="border rounded px-3 py-2" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addEmployee} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save</button>
            <button onClick={() => setShowAdd(false)} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id}>
                {editingId === emp.id ? (
                  <>
                    <td className="px-6 py-4"><input value={editForm?.name} onChange={e => setEditForm({...editForm!, name: e.target.value})} className="border rounded px-2 py-1 w-full" /></td>
                    <td className="px-6 py-4">
                      <select value={editForm?.department} onChange={e => setEditForm({...editForm!, department: e.target.value})} className="border rounded px-2 py-1">
                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4"><input value={editForm?.position} onChange={e => setEditForm({...editForm!, position: e.target.value})} className="border rounded px-2 py-1 w-full" /></td>
                    <td className="px-6 py-4"><input type="number" value={editForm?.salary} onChange={e => setEditForm({...editForm!, salary: +e.target.value})} className="border rounded px-2 py-1 w-24" /></td>
                    <td className="px-6 py-4"><input type="date" value={editForm?.startDate} onChange={e => setEditForm({...editForm!, startDate: e.target.value})} className="border rounded px-2 py-1" /></td>
                    <td className="px-6 py-4 flex gap-2">
                      <button onClick={saveEdit} className="text-green-600 hover:text-green-800"><Check size={20} /></button>
                      <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-800"><X size={20} /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 font-medium">{emp.name}</td>
                    <td className="px-6 py-4">{emp.department}</td>
                    <td className="px-6 py-4">{emp.position}</td>
                    <td className="px-6 py-4">${emp.salary.toLocaleString()}</td>
                    <td className="px-6 py-4">{emp.startDate}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button onClick={() => startEdit(emp)} className="text-blue-600 hover:text-blue-800"><Pencil size={20} /></button>
                      <button onClick={() => deleteEmployee(emp.id)} className="text-red-600 hover:text-red-800"><Trash2 size={20} /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
