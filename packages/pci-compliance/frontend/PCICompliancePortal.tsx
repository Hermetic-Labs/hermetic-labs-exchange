import { useState } from 'react';
import { CreditCard, Shield, AlertTriangle, CheckCircle, Search, Lock, Network } from 'lucide-react';

// Types
interface Requirement {
  id: string;
  title: string;
  category: string;
  status: 'compliant' | 'non-compliant' | 'in-progress';
  evidence: number;
}

interface ScanResult {
  id: string;
  timestamp: string;
  type: 'PAN' | 'CVV' | 'Track Data';
  location: string;
  masked: string;
  risk: 'high' | 'medium' | 'low';
}

// Seed data
const seedRequirements: Requirement[] = [
  { id: 'req-1.1', title: 'Install and maintain network security controls', category: 'Network Security', status: 'compliant', evidence: 12 },
  { id: 'req-2.1', title: 'Apply secure configurations to system components', category: 'Secure Configuration', status: 'compliant', evidence: 8 },
  { id: 'req-3.1', title: 'Protect stored account data', category: 'Data Protection', status: 'in-progress', evidence: 5 },
  { id: 'req-4.1', title: 'Protect cardholder data during transmission', category: 'Encryption', status: 'compliant', evidence: 6 },
  { id: 'req-7.1', title: 'Restrict access to system components', category: 'Access Control', status: 'non-compliant', evidence: 3 },
  { id: 'req-10.1', title: 'Log and monitor all access', category: 'Monitoring', status: 'compliant', evidence: 15 },
];

const seedScans: ScanResult[] = [
  { id: 'scan-001', timestamp: '2024-01-15 14:30', type: 'PAN', location: 'logs/payment.log:245', masked: '4111****1111', risk: 'high' },
  { id: 'scan-002', timestamp: '2024-01-15 14:30', type: 'PAN', location: 'db/orders.customers', masked: '5500****0005', risk: 'medium' },
  { id: 'scan-003', timestamp: '2024-01-15 14:30', type: 'CVV', location: 'temp/checkout.tmp', masked: '***', risk: 'high' },
];

export default function PCICompliancePortal() {
  const [activeTab, setActiveTab] = useState<'requirements' | 'scanner' | 'network'>('requirements');
  const [requirements] = useState<Requirement[]>(seedRequirements);
  const [scanResults] = useState<ScanResult[]>(seedScans);

  const compliantCount = requirements.filter(r => r.status === 'compliant').length;
  const totalReqs = requirements.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-700 text-white p-6">
        <div className="flex items-center gap-3">
          <CreditCard size={32} />
          <div>
            <h1 className="text-2xl font-bold">PCI DSS Compliance Suite</h1>
            <p className="text-emerald-100">Payment Card Industry Data Security Standard v4.0</p>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">Compliant: <strong className="text-green-600">{compliantCount}/{totalReqs}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            <span className="text-sm text-gray-600">CHD Found: <strong className="text-red-600">{scanResults.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="text-emerald-500" size={20} />
            <span className="text-sm text-gray-600">SAQ Type: <strong>D</strong></span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <nav className="flex">
          {[
            { id: 'requirements', label: 'Requirements', icon: Shield },
            { id: 'scanner', label: 'CHD Scanner', icon: Search },
            { id: 'network', label: 'Network Segmentation', icon: Network },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
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
        {activeTab === 'requirements' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">PCI DSS v4.0 Requirements</h2>
              <p className="text-sm text-gray-500">Track compliance status and evidence</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Req ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requirements.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{req.id}</td>
                    <td className="px-4 py-3 font-medium">{req.title}</td>
                    <td className="px-4 py-3 text-gray-600">{req.category}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        req.status === 'compliant' ? 'bg-green-100 text-green-700' :
                        req.status === 'non-compliant' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{req.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{req.evidence} items</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'scanner' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Cardholder Data Scanner</h2>
              <p className="text-sm text-gray-500">Detect unprotected card data in your environment</p>
            </div>
            {scanResults.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Masked Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {scanResults.map(scan => (
                    <tr key={scan.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{scan.timestamp}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{scan.type}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{scan.location}</td>
                      <td className="px-4 py-3 font-mono">{scan.masked}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          scan.risk === 'high' ? 'bg-red-100 text-red-700' :
                          scan.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>{scan.risk}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
                <p>No cardholder data detected</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'network' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Network Segmentation</h2>
              <p className="text-sm text-gray-500">CDE boundary validation</p>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4">
              {[
                { zone: 'Cardholder Data Environment', hosts: 3, status: 'isolated', color: 'red' },
                { zone: 'Payment Processing', hosts: 2, status: 'segmented', color: 'amber' },
                { zone: 'Corporate Network', hosts: 45, status: 'separated', color: 'green' },
              ].map(zone => (
                <div key={zone.zone} className={`border-2 rounded-lg p-4 ${
                  zone.color === 'red' ? 'border-red-300 bg-red-50' :
                  zone.color === 'amber' ? 'border-amber-300 bg-amber-50' :
                  'border-green-300 bg-green-50'
                }`}>
                  <Network className={`mb-2 ${
                    zone.color === 'red' ? 'text-red-500' :
                    zone.color === 'amber' ? 'text-amber-500' :
                    'text-green-500'
                  }`} size={24} />
                  <h3 className="font-medium">{zone.zone}</h3>
                  <div className="mt-2 text-sm text-gray-600">
                    <div>{zone.hosts} hosts</div>
                    <div className="capitalize">{zone.status}</div>
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
