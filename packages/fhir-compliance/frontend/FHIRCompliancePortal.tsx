import { useState } from 'react';
import { Stethoscope, FileCheck, Users, Activity, AlertTriangle, CheckCircle, X } from 'lucide-react';

// Simplified types for the UI
interface Patient {
  id: string;
  name: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  mrn: string;
}

interface ValidationResult {
  valid: boolean;
  resourceType: string;
  issues: { severity: 'error' | 'warning' | 'information'; message: string }[];
}

// Seed data for demo
const seedPatients: Patient[] = [
  { id: 'pt-001', name: 'John Smith', birthDate: '1985-03-15', gender: 'male', mrn: 'MRN-12345' },
  { id: 'pt-002', name: 'Sarah Johnson', birthDate: '1990-07-22', gender: 'female', mrn: 'MRN-12346' },
  { id: 'pt-003', name: 'Michael Chen', birthDate: '1978-11-08', gender: 'male', mrn: 'MRN-12347' },
];

const sampleFHIRResource = `{
  "resourceType": "Patient",
  "id": "example",
  "name": [{
    "use": "official",
    "family": "Smith",
    "given": ["John"]
  }],
  "gender": "male",
  "birthDate": "1985-03-15"
}`;

export default function FHIRCompliancePortal() {
  const [activeTab, setActiveTab] = useState<'patients' | 'validate' | 'resources'>('patients');
  const [patients] = useState<Patient[]>(seedPatients);
  const [resourceJson, setResourceJson] = useState(sampleFHIRResource);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateResource = () => {
    try {
      const parsed = JSON.parse(resourceJson);
      const issues: ValidationResult['issues'] = [];

      // Basic validation checks
      if (!parsed.resourceType) {
        issues.push({ severity: 'error', message: 'Missing required field: resourceType' });
      }
      if (parsed.resourceType === 'Patient') {
        if (!parsed.name || parsed.name.length === 0) {
          issues.push({ severity: 'warning', message: 'Patient should have at least one name' });
        }
        if (!parsed.gender) {
          issues.push({ severity: 'information', message: 'Gender is recommended for Patient resources' });
        }
      }

      setValidationResult({
        valid: issues.filter(i => i.severity === 'error').length === 0,
        resourceType: parsed.resourceType || 'Unknown',
        issues: issues.length > 0 ? issues : [{ severity: 'information', message: 'Resource is valid' }]
      });
    } catch {
      setValidationResult({
        valid: false,
        resourceType: 'Unknown',
        issues: [{ severity: 'error', message: 'Invalid JSON format' }]
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-rose-600 text-white p-6">
        <div className="flex items-center gap-3">
          <Stethoscope size={32} />
          <div>
            <h1 className="text-2xl font-bold">FHIR Compliance Suite</h1>
            <p className="text-rose-100">HL7 FHIR R4 Validation & Resource Management</p>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <Users className="text-rose-500" size={20} />
            <span className="text-sm text-gray-600">Patients: <strong>{patients.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <FileCheck className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">FHIR Version: <strong>R4</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="text-blue-500" size={20} />
            <span className="text-sm text-gray-600">Status: <strong className="text-green-600">Active</strong></span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <nav className="flex">
          {[
            { id: 'patients', label: 'Patients', icon: Users },
            { id: 'validate', label: 'Validate', icon: FileCheck },
            { id: 'resources', label: 'Resources', icon: Activity },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-rose-500 text-rose-600 bg-rose-50'
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
        {activeTab === 'patients' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Patient Registry</h2>
              <p className="text-sm text-gray-500">FHIR R4 Patient resources</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Birth Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FHIR ID</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {patients.map(patient => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{patient.mrn}</td>
                    <td className="px-4 py-3 font-medium">{patient.name}</td>
                    <td className="px-4 py-3 text-gray-600">{patient.birthDate}</td>
                    <td className="px-4 py-3 capitalize">{patient.gender}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{patient.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'validate' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">FHIR Resource Validator</h2>
                <p className="text-sm text-gray-500">Paste FHIR JSON to validate</p>
              </div>
              <div className="p-4">
                <textarea
                  value={resourceJson}
                  onChange={e => setResourceJson(e.target.value)}
                  className="w-full h-64 font-mono text-sm border rounded-lg p-3 bg-gray-50"
                  placeholder="Paste FHIR R4 JSON resource here..."
                />
                <button
                  onClick={validateResource}
                  className="mt-4 w-full bg-rose-600 text-white py-2 rounded-lg hover:bg-rose-700 flex items-center justify-center gap-2"
                >
                  <FileCheck size={18} />
                  Validate Resource
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Validation Results</h2>
              </div>
              <div className="p-4">
                {validationResult ? (
                  <div>
                    <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
                      validationResult.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {validationResult.valid ? (
                        <CheckCircle size={20} />
                      ) : (
                        <X size={20} />
                      )}
                      <span className="font-medium">
                        {validationResult.resourceType}: {validationResult.valid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {validationResult.issues.map((issue, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                            issue.severity === 'error' ? 'bg-red-50 text-red-700' :
                            issue.severity === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-blue-50 text-blue-700'
                          }`}
                        >
                          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                          <span>{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-12">
                    <FileCheck size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Paste a FHIR resource and click validate</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Supported FHIR R4 Resources</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 p-4">
              {[
                { type: 'Patient', desc: 'Demographics and identifiers', count: 3 },
                { type: 'Practitioner', desc: 'Healthcare providers', count: 0 },
                { type: 'Observation', desc: 'Measurements and vitals', count: 0 },
                { type: 'Condition', desc: 'Diagnoses and problems', count: 0 },
                { type: 'MedicationRequest', desc: 'Prescriptions', count: 0 },
                { type: 'Encounter', desc: 'Patient visits', count: 0 },
              ].map(resource => (
                <div key={resource.type} className="border rounded-lg p-4 hover:border-rose-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{resource.type}</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{resource.count}</span>
                  </div>
                  <p className="text-sm text-gray-500">{resource.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
