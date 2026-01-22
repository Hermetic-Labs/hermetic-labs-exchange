import { useState } from 'react';
import { FileCheck, Users, AlertTriangle, CheckCircle, Clock, BarChart3, Shield } from 'lucide-react';

// Types
interface Control {
  id: string;
  name: string;
  category: string;
  owner: string;
  status: 'effective' | 'deficient' | 'pending';
  lastTested: string;
}

interface AuditItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  control: string;
  approved: boolean;
}

// Seed data
const seedControls: Control[] = [
  { id: 'ctrl-001', name: 'Journal Entry Approval', category: 'Financial Close', owner: 'CFO', status: 'effective', lastTested: '2024-01-10' },
  { id: 'ctrl-002', name: 'Access Review Quarterly', category: 'Access Control', owner: 'IT Director', status: 'effective', lastTested: '2024-01-05' },
  { id: 'ctrl-003', name: 'Segregation of Duties', category: 'Authorization', owner: 'Controller', status: 'deficient', lastTested: '2024-01-12' },
  { id: 'ctrl-004', name: 'Reconciliation Sign-off', category: 'Financial Close', owner: 'Accounting Mgr', status: 'pending', lastTested: '2023-12-15' },
];

const seedAuditTrail: AuditItem[] = [
  { id: 'aud-001', timestamp: '2024-01-15 09:00', user: 'j.smith', action: 'Journal Entry Created', control: 'ctrl-001', approved: true },
  { id: 'aud-002', timestamp: '2024-01-15 09:15', user: 'm.jones', action: 'Journal Entry Approved', control: 'ctrl-001', approved: true },
  { id: 'aud-003', timestamp: '2024-01-15 10:30', user: 'a.wilson', action: 'Access Request', control: 'ctrl-002', approved: false },
  { id: 'aud-004', timestamp: '2024-01-15 11:00', user: 'b.chen', action: 'Reconciliation Completed', control: 'ctrl-004', approved: true },
];

export default function SOXCompliancePortal() {
  const [activeTab, setActiveTab] = useState<'controls' | 'audit' | 'sod'>('controls');
  const [controls] = useState<Control[]>(seedControls);
  const [auditTrail] = useState<AuditItem[]>(seedAuditTrail);

  const effectiveCount = controls.filter(c => c.status === 'effective').length;
  const deficientCount = controls.filter(c => c.status === 'deficient').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-amber-700 text-white p-6">
        <div className="flex items-center gap-3">
          <BarChart3 size={32} />
          <div>
            <h1 className="text-2xl font-bold">SOX Compliance Suite</h1>
            <p className="text-amber-100">Sarbanes-Oxley Internal Controls & Audit Management</p>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">Effective: <strong className="text-green-600">{effectiveCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            <span className="text-sm text-gray-600">Deficient: <strong className="text-red-600">{deficientCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="text-amber-500" size={20} />
            <span className="text-sm text-gray-600">Pending Test: <strong>{controls.filter(c => c.status === 'pending').length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="text-blue-500" size={20} />
            <span className="text-sm text-gray-600">SOX 404: <strong className="text-blue-600">Active</strong></span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <nav className="flex">
          {[
            { id: 'controls', label: 'Controls', icon: FileCheck },
            { id: 'audit', label: 'Audit Trail', icon: Clock },
            { id: 'sod', label: 'Segregation of Duties', icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-amber-500 text-amber-600 bg-amber-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main className="p-6">
        {activeTab === 'controls' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Internal Control Documentation</h2>
              <p className="text-sm text-gray-500">SOX 404 control testing and effectiveness</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Tested</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {controls.map(ctrl => (
                  <tr key={ctrl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{ctrl.name}</div>
                      <div className="text-xs text-gray-500">{ctrl.id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ctrl.category}</td>
                    <td className="px-4 py-3">{ctrl.owner}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        ctrl.status === 'effective' ? 'bg-green-100 text-green-700' :
                        ctrl.status === 'deficient' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{ctrl.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{ctrl.lastTested}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Immutable Audit Trail</h2>
              <p className="text-sm text-gray-500">All financial control activities logged</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditTrail.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-500">{entry.timestamp}</td>
                    <td className="px-4 py-3 font-medium">{entry.user}</td>
                    <td className="px-4 py-3">{entry.action}</td>
                    <td className="px-4 py-3 font-mono text-xs">{entry.control}</td>
                    <td className="px-4 py-3">
                      {entry.approved ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle size={16} /> Approved</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600"><AlertTriangle size={16} /> Denied</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'sod' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Segregation of Duties Matrix</h2>
              <p className="text-sm text-gray-500">Conflict detection for critical functions</p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { role1: 'Journal Entry Creator', role2: 'Journal Entry Approver', conflict: false },
                  { role1: 'Payment Initiator', role2: 'Payment Approver', conflict: false },
                  { role1: 'Vendor Master Editor', role2: 'Payment Approver', conflict: true },
                  { role1: 'Access Administrator', role2: 'Access Reviewer', conflict: true },
                ].map((pair, i) => (
                  <div key={i} className={`border rounded-lg p-4 ${pair.conflict ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      {pair.conflict ? (
                        <AlertTriangle className="text-red-500" size={20} />
                      ) : (
                        <CheckCircle className="text-green-500" size={20} />
                      )}
                      <span className={`text-xs px-2 py-1 rounded ${pair.conflict ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'}`}>
                        {pair.conflict ? 'CONFLICT' : 'OK'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{pair.role1}</span>
                      <span className="text-gray-400 mx-2">vs</span>
                      <span className="font-medium">{pair.role2}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
