import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Department } from '../types';

interface DepartmentsProps {
  departments: Department[];
  setDepartments: (departments: Department[]) => void;
}

export default function Departments({ departments, setDepartments }: DepartmentsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Department | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', head: '', employeeCount: 0, budget: 0 });

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setEditForm({ ...dept });
  };

  const saveEdit = () => {
    if (editForm) {
      setDepartments(departments.map(d => d.id === editForm.id ? editForm : d));
      setEditingId(null);
    }
  };

  const deleteDept = (id: string) => {
    setDepartments(departments.filter(d => d.id !== id));
  };

  const addDept = () => {
    setDepartments([...departments, { ...newDept, id: Date.now().toString() }]);
    setShowAdd(false);
    setNewDept({ name: '', head: '', employeeCount: 0, budget: 0 });
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Add Department
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Department</h2>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Department Name" value={newDept.name} onChange={e => setNewDept({...newDept, name: e.target.value})} className="border rounded px-3 py-2" />
            <input placeholder="Department Head" value={newDept.head} onChange={e => setNewDept({...newDept, head: e.target.value})} className="border rounded px-3 py-2" />
            <input type="number" placeholder="Employee Count" value={newDept.employeeCount || ''} onChange={e => setNewDept({...newDept, employeeCount: +e.target.value})} className="border rounded px-3 py-2" />
            <input type="number" placeholder="Budget" value={newDept.budget || ''} onChange={e => setNewDept({...newDept, budget: +e.target.value})} className="border rounded px-3 py-2" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addDept} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save</button>
            <button onClick={() => setShowAdd(false)} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div key={dept.id} className="bg-white rounded-lg shadow p-6">
            {editingId === dept.id ? (
              <>
                <input value={editForm?.name} onChange={e => setEditForm({...editForm!, name: e.target.value})} className="border rounded px-2 py-1 w-full mb-2 font-semibold" />
                <input value={editForm?.head} onChange={e => setEditForm({...editForm!, head: e.target.value})} className="border rounded px-2 py-1 w-full mb-2 text-sm" placeholder="Head" />
                <input type="number" value={editForm?.employeeCount} onChange={e => setEditForm({...editForm!, employeeCount: +e.target.value})} className="border rounded px-2 py-1 w-full mb-2 text-sm" />
                <input type="number" value={editForm?.budget} onChange={e => setEditForm({...editForm!, budget: +e.target.value})} className="border rounded px-2 py-1 w-full mb-2 text-sm" />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveEdit} className="text-green-600 hover:text-green-800"><Check size={20} /></button>
                  <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-800"><X size={20} /></button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{dept.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(dept)} className="text-blue-600 hover:text-blue-800"><Pencil size={18} /></button>
                    <button onClick={() => deleteDept(dept.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-2">Head: {dept.head}</p>
                <p className="text-sm text-gray-500 mb-2">{dept.employeeCount} employees</p>
                <p className="text-sm font-medium text-green-600">Budget: ${dept.budget.toLocaleString()}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
