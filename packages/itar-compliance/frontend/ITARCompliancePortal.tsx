import { useState } from 'react';
import { Shield, FileWarning, Users, Globe, AlertTriangle, CheckCircle, Lock, Search } from 'lucide-react';

// Types
interface Article {
  id: string;
  name: string;
  usmlCategory: string;
  classification: 'Unclassified' | 'CUI' | 'Confidential';
  exportLicense: string | null;
}

interface PersonnelRecord {
  id: string;
  name: string;
  citizenship: string;
  clearance: 'None' | 'Secret' | 'Top Secret';
  foreignPerson: boolean;
  accessGranted: boolean;
}

// Seed data
const seedArticles: Article[] = [
  { id: 'art-001', name: 'Navigation System Component', usmlCategory: 'XI(a)', classification: 'CUI', exportLicense: 'DSP-5-2024-001' },
  { id: 'art-002', name: 'Guidance Software Module', usmlCategory: 'IV(h)', classification: 'Confidential', exportLicense: null },
  { id: 'art-003', name: 'Communication Subsystem', usmlCategory: 'XI(b)', classification: 'CUI', exportLicense: 'DSP-5-2024-002' },
  { id: 'art-004', name: 'Training Documentation', usmlCategory: 'IV(i)', classification: 'Unclassified', exportLicense: 'DSP-5-2024-003' },
];

const seedPersonnel: PersonnelRecord[] = [
  { id: 'per-001', name: 'John Smith', citizenship: 'US', clearance: 'Secret', foreignPerson: false, accessGranted: true },
  { id: 'per-002', name: 'Maria Garcia', citizenship: 'US', clearance: 'Top Secret', foreignPerson: false, accessGranted: true },
  { id: 'per-003', name: 'Hans Mueller', citizenship: 'Germany', clearance: 'None', foreignPerson: true, accessGranted: false },
  { id: 'per-004', name: 'Chen Wei', citizenship: 'China', clearance: 'None', foreignPerson: true, accessGranted: false },
];

export default function ITARCompliancePortal() {
  const [activeTab, setActiveTab] = useState<'articles' | 'personnel' | 'licenses'>('articles');
  const [articles] = useState<Article[]>(seedArticles);
  const [personnel] = useState<PersonnelRecord[]>(seedPersonnel);

  const foreignPersons = personnel.filter(p => p.foreignPerson).length;
  const licensedItems = articles.filter(a => a.exportLicense).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-800 text-white p-6">
        <div className="flex items-center gap-3">
          <Shield size={32} />
          <div>
            <h1 className="text-2xl font-bold">ITAR Compliance Suite</h1>
            <p className="text-slate-300">International Traffic in Arms Regulations</p>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <FileWarning className="text-slate-500" size={20} />
            <span className="text-sm text-gray-600">USML Articles: <strong>{articles.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="text-red-500" size={20} />
            <span className="text-sm text-gray-600">Foreign Persons: <strong className="text-red-600">{foreignPersons}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">Licensed: <strong className="text-green-600">{licensedItems}</strong></span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <nav className="flex">
          {[
            { id: 'articles', label: 'USML Articles', icon: FileWarning },
            { id: 'personnel', label: 'Personnel Screening', icon: Users },
            { id: 'licenses', label: 'Export Licenses', icon: Globe },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-slate-500 text-slate-600 bg-slate-50'
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
        {activeTab === 'articles' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">USML Classification</h2>
              <p className="text-sm text-gray-500">Defense articles and technical data</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">USML Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classification</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Export License</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {articles.map(article => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{article.name}</div>
                      <div className="text-xs text-gray-500">{article.id}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{article.usmlCategory}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        article.classification === 'Confidential' ? 'bg-red-100 text-red-700' :
                        article.classification === 'CUI' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>{article.classification}</span>
                    </td>
                    <td className="px-4 py-3">
                      {article.exportLicense ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={16} />
                          {article.exportLicense}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle size={16} />
                          Required
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'personnel' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Foreign Person Screening</h2>
              <p className="text-sm text-gray-500">Personnel access to controlled technical data</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Citizenship</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clearance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Foreign Person</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {personnel.map(person => (
                  <tr key={person.id} className={`hover:bg-gray-50 ${person.foreignPerson ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-medium">{person.name}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        <Globe size={14} className={person.citizenship === 'US' ? 'text-blue-500' : 'text-amber-500'} />
                        {person.citizenship}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        person.clearance === 'Top Secret' ? 'bg-purple-100 text-purple-700' :
                        person.clearance === 'Secret' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{person.clearance}</span>
                    </td>
                    <td className="px-4 py-3">
                      {person.foreignPerson ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <AlertTriangle size={16} /> Yes
                        </span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {person.accessGranted ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={16} /> Granted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <Lock size={16} /> Denied
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'licenses' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Export License Tracking</h2>
              <p className="text-sm text-gray-500">DSP-5 and other DDTC licenses</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              {[
                { license: 'DSP-5-2024-001', type: 'Permanent Export', destination: 'UK', status: 'Approved', expires: '2025-01-15' },
                { license: 'DSP-5-2024-002', type: 'Permanent Export', destination: 'Australia', status: 'Approved', expires: '2025-03-20' },
                { license: 'DSP-5-2024-003', type: 'Technical Data', destination: 'Canada', status: 'Pending', expires: null },
                { license: 'DSP-73-2024-001', type: 'Temp Import', destination: 'N/A', status: 'Approved', expires: '2024-06-30' },
              ].map(lic => (
                <div key={lic.license} className={`border rounded-lg p-4 ${
                  lic.status === 'Approved' ? 'border-green-200' : 'border-amber-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-medium">{lic.license}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      lic.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>{lic.status}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>{lic.type}</div>
                    <div>Destination: {lic.destination}</div>
                    {lic.expires && <div className="text-xs mt-1">Expires: {lic.expires}</div>}
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
