import { useState } from 'react';
import { Shield, Eye, FileText, AlertTriangle, CheckCircle, Lock, Search } from 'lucide-react';

// Simplified types for UI
interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  success: boolean;
}

interface PHIEntity {
  text: string;
  category: string;
  masked: string;
}

// Seed data
const seedAuditLog: AuditEntry[] = [
  { id: 'aud-001', timestamp: '2024-01-15 09:23:45', user: 'dr.smith', action: 'VIEW', resource: 'Patient/pt-001', success: true },
  { id: 'aud-002', timestamp: '2024-01-15 09:25:12', user: 'nurse.jones', action: 'VIEW', resource: 'Patient/pt-002', success: true },
  { id: 'aud-003', timestamp: '2024-01-15 10:05:33', user: 'admin.doe', action: 'EXPORT', resource: 'Patient/pt-001', success: false },
  { id: 'aud-004', timestamp: '2024-01-15 11:45:00', user: 'dr.smith', action: 'UPDATE', resource: 'Observation/obs-123', success: true },
];

const sampleText = `Patient John Smith (SSN: 123-45-6789) visited on 01/15/2024.
Contact: john.smith@email.com, Phone: (555) 123-4567
Address: 123 Main St, Springfield, IL 62701
MRN: MRN-12345`;

export default function HIPAACompliancePortal() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'audit' | 'access'>('scanner');
  const [inputText, setInputText] = useState(sampleText);
  const [scanResult, setScanResult] = useState<{ entities: PHIEntity[]; maskedText: string } | null>(null);
  const [auditLog] = useState<AuditEntry[]>(seedAuditLog);

  const scanForPHI = () => {
    // Simple pattern matching for demo
    const entities: PHIEntity[] = [];
    const patterns: { regex: RegExp; category: string; maskFn: (m: string) => string }[] = [
      { regex: /\b\d{3}-\d{2}-\d{4}\b/g, category: 'SSN', maskFn: () => '***-**-****' },
      { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, category: 'Email', maskFn: () => '***@***.***' },
      { regex: /\(\d{3}\)\s*\d{3}-\d{4}/g, category: 'Phone', maskFn: () => '(***) ***-****' },
      { regex: /MRN-\d+/g, category: 'MRN', maskFn: () => 'MRN-*****' },
    ];

    let maskedText = inputText;
    patterns.forEach(({ regex, category, maskFn }) => {
      const matches = inputText.match(regex) || [];
      matches.forEach(match => {
        const masked = maskFn(match);
        entities.push({ text: match, category, masked });
        maskedText = maskedText.replace(match, masked);
      });
    });

    setScanResult({ entities, maskedText });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-amber-600 text-white p-6">
        <div className="flex items-center gap-3">
          <Shield size={32} />
          <div>
            <h1 className="text-2xl font-bold">HIPAA Privacy Suite</h1>
            <p className="text-amber-100">PHI Detection, Access Controls & Audit Logging</p>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <Eye className="text-amber-500" size={20} />
            <span className="text-sm text-gray-600">Scans Today: <strong>47</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="text-blue-500" size={20} />
            <span className="text-sm text-gray-600">Audit Entries: <strong>{auditLog.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">Compliance: <strong className="text-green-600">Active</strong></span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <nav className="flex">
          {[
            { id: 'scanner', label: 'PHI Scanner', icon: Search },
            { id: 'audit', label: 'Audit Log', icon: FileText },
            { id: 'access', label: 'Access Rules', icon: Lock },
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
        {activeTab === 'scanner' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">PHI Detection Scanner</h2>
                <p className="text-sm text-gray-500">Paste text to scan for Protected Health Information</p>
              </div>
              <div className="p-4">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="w-full h-48 font-mono text-sm border rounded-lg p-3 bg-gray-50"
                  placeholder="Enter text to scan for PHI..."
                />
                <button
                  onClick={scanForPHI}
                  className="mt-4 w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 flex items-center justify-center gap-2"
                >
                  <Search size={18} />
                  Scan for PHI
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Scan Results</h2>
              </div>
              <div className="p-4">
                {scanResult ? (
                  <div>
                    <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
                      scanResult.entities.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {scanResult.entities.length > 0 ? (
                        <AlertTriangle size={20} />
                      ) : (
                        <CheckCircle size={20} />
                      )}
                      <span className="font-medium">
                        {scanResult.entities.length > 0
                          ? `Found ${scanResult.entities.length} PHI element(s)`
                          : 'No PHI detected'}
                      </span>
                    </div>

                    {scanResult.entities.length > 0 && (
                      <>
                        <h3 className="font-medium mb-2">Detected PHI:</h3>
                        <div className="space-y-2 mb-4">
                          {scanResult.entities.map((entity, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                              <span className="font-mono text-red-600">{entity.text}</span>
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">{entity.category}</span>
                            </div>
                          ))}
                        </div>

                        <h3 className="font-medium mb-2">Masked Output:</h3>
                        <pre className="p-3 bg-green-50 rounded text-sm font-mono whitespace-pre-wrap text-green-800">
                          {scanResult.maskedText}
                        </pre>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-12">
                    <Eye size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Enter text and scan to detect PHI</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Access Audit Log</h2>
              <p className="text-sm text-gray-500">Track all PHI access for compliance</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditLog.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-500">{entry.timestamp}</td>
                    <td className="px-4 py-3 font-medium">{entry.user}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        entry.action === 'VIEW' ? 'bg-blue-100 text-blue-700' :
                        entry.action === 'UPDATE' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>{entry.action}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{entry.resource}</td>
                    <td className="px-4 py-3">
                      {entry.success ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle size={16} /> Allowed</span>
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

        {activeTab === 'access' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Access Control Rules</h2>
              <p className="text-sm text-gray-500">Role-based PHI access policies</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              {[
                { role: 'Physician', resources: ['Patient', 'Observation', 'Condition', 'MedicationRequest'], purpose: 'Treatment' },
                { role: 'Nurse', resources: ['Patient', 'Observation'], purpose: 'Treatment' },
                { role: 'Billing', resources: ['Patient (limited)', 'Encounter'], purpose: 'Payment' },
                { role: 'Admin', resources: ['Audit Log'], purpose: 'Operations' },
              ].map(rule => (
                <div key={rule.role} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-lg">{rule.role}</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">{rule.purpose}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Allowed Resources:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rule.resources.map(r => (
                        <span key={r} className="px-2 py-1 bg-gray-100 rounded text-xs">{r}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
