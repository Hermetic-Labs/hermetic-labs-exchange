import { useState } from 'react';
import { Building2, Shield, AlertTriangle, CheckCircle, FileText, Target, Clock } from 'lucide-react';

// Types
interface Control {
  id: string;
  family: string;
  title: string;
  baseline: 'Low' | 'Moderate' | 'High';
  status: 'implemented' | 'planned' | 'not-applicable';
}

interface POAM {
  id: string;
  control: string;
  weakness: string;
  milestone: string;
  dueDate: string;
  status: 'open' | 'closed' | 'delayed';
}

// Seed data
const seedControls: Control[] = [
  { id: 'AC-1', family: 'Access Control', title: 'Policy and Procedures', baseline: 'Low', status: 'implemented' },
  { id: 'AC-2', family: 'Access Control', title: 'Account Management', baseline: 'Low', status: 'implemented' },
  { id: 'AU-2', family: 'Audit', title: 'Event Logging', baseline: 'Low', status: 'implemented' },
  { id: 'CA-7', family: 'Assessment', title: 'Continuous Monitoring', baseline: 'Moderate', status: 'planned' },
  { id: 'RA-5', family: 'Risk Assessment', title: 'Vulnerability Monitoring', baseline: 'Low', status: 'implemented' },
  { id: 'SC-7', family: 'System Communications', title: 'Boundary Protection', baseline: 'Moderate', status: 'implemented' },
];

const seedPOAMs: POAM[] = [
  { id: 'POAM-001', control: 'CA-7', weakness: 'ConMon process not fully automated', milestone: 'Implement automated scanning', dueDate: '2024-03-15', status: 'open' },
  { id: 'POAM-002', control: 'AC-2(4)', weakness: 'Automated account disabling not configured', milestone: 'Configure IdP automation', dueDate: '2024-02-28', status: 'delayed' },
  { id: 'POAM-003', control: 'AU-6', weakness: 'Log review frequency below requirement', milestone: 'Implement SIEM alerting', dueDate: '2024-01-30', status: 'closed' },
];

export default function FedRAMPCompliancePortal() {
  const [activeTab, setActiveTab] = useState<'controls' | 'poam' | 'ssp'>('controls');
  const [controls] = useState<Control[]>(seedControls);
  const [poams] = useState<POAM[]>(seedPOAMs);

  const implementedCount = controls.filter(c => c.status === 'implemented').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white p-6">
        <div className="flex items-center gap-3">
          <Building2 size={32} />
          <div>
            <h1 className="text-2xl font-bold">FedRAMP Compliance Suite</h1>
            <p className="text-blue-200">Federal Risk and Authorization Management Program</p>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-500" size={20} />
            <span className="text-sm text-gray-600">Baseline: <strong className="text-blue-600">Moderate</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">Implemented: <strong className="text-green-600">{implementedCount}/{controls.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="text-amber-500" size={20} />
            <span className="text-sm text-gray-600">Open POA&Ms: <strong>{poams.filter(p => p.status !== 'closed').length}</strong></span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <nav className="flex">
          {[
            { id: 'controls', label: 'Control Baseline', icon: Shield },
            { id: 'poam', label: 'POA&M', icon: Target },
            { id: 'ssp', label: 'SSP Documentation', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
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
              <h2 className="text-lg font-semibold">NIST 800-53 Control Baseline</h2>
              <p className="text-sm text-gray-500">FedRAMP Moderate baseline controls</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Family</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Baseline</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {controls.map(ctrl => (
                  <tr key={ctrl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium">{ctrl.id}</td>
                    <td className="px-4 py-3 text-gray-600">{ctrl.family}</td>
                    <td className="px-4 py-3">{ctrl.title}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        ctrl.baseline === 'Low' ? 'bg-green-100 text-green-700' :
                        ctrl.baseline === 'Moderate' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>{ctrl.baseline}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        ctrl.status === 'implemented' ? 'bg-green-100 text-green-700' :
                        ctrl.status === 'planned' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{ctrl.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'poam' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Plan of Action & Milestones</h2>
              <p className="text-sm text-gray-500">Track remediation of control deficiencies</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weakness</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Milestone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {poams.map(poam => (
                  <tr key={poam.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{poam.id}</td>
                    <td className="px-4 py-3 font-mono font-medium">{poam.control}</td>
                    <td className="px-4 py-3 text-gray-600">{poam.weakness}</td>
                    <td className="px-4 py-3">{poam.milestone}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{poam.dueDate}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 ${
                        poam.status === 'closed' ? 'text-green-600' :
                        poam.status === 'delayed' ? 'text-red-600' :
                        'text-amber-600'
                      }`}>
                        {poam.status === 'closed' ? <CheckCircle size={16} /> :
                         poam.status === 'delayed' ? <AlertTriangle size={16} /> :
                         <Clock size={16} />}
                        {poam.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ssp' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">System Security Plan</h2>
              <p className="text-sm text-gray-500">SSP documentation sections</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              {[
                { section: 'System Information', complete: true, lastUpdated: '2024-01-10' },
                { section: 'System Environment', complete: true, lastUpdated: '2024-01-08' },
                { section: 'System Implementation', complete: true, lastUpdated: '2024-01-12' },
                { section: 'Control Implementation', complete: false, lastUpdated: '2024-01-05' },
                { section: 'Attachments', complete: true, lastUpdated: '2024-01-11' },
                { section: 'Contingency Plan', complete: false, lastUpdated: '2023-12-20' },
              ].map(doc => (
                <div key={doc.section} className={`border rounded-lg p-4 ${doc.complete ? 'border-green-200' : 'border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <FileText className={doc.complete ? 'text-green-500' : 'text-amber-500'} size={20} />
                    {doc.complete ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Complete</span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">In Progress</span>
                    )}
                  </div>
                  <h3 className="font-medium">{doc.section}</h3>
                  <p className="text-xs text-gray-500 mt-1">Updated: {doc.lastUpdated}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
