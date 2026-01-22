import { useState } from 'react';
import { Link2, CheckCircle2, XCircle } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected';
  logo: string;
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: '1', name: 'ADP Workforce Now', description: 'Payroll processing and HR management', status: 'disconnected', logo: 'ADP' },
    { id: '2', name: 'QuickBooks', description: 'Accounting and financial management', status: 'disconnected', logo: 'QB' },
    { id: '3', name: 'Gusto', description: 'Payroll, benefits, and HR', status: 'disconnected', logo: 'G' },
    { id: '4', name: 'Paychex', description: 'Payroll and HR solutions', status: 'disconnected', logo: 'PX' },
  ]);

  const toggleConnection = (id: string) => {
    setIntegrations(integrations.map(i => {
      if (i.id === id) {
        const newStatus = i.status === 'connected' ? 'disconnected' : 'connected';
        alert(`Mock: ${newStatus === 'connected' ? 'Connecting to' : 'Disconnecting from'} ${i.name}...`);
        return { ...i, status: newStatus };
      }
      return i;
    }));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Third-Party Integrations</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold">
                  {integration.logo}
                </div>
                <div>
                  <h3 className="font-semibold">{integration.name}</h3>
                  <p className="text-sm text-gray-500">{integration.description}</p>
                </div>
              </div>
              {integration.status === 'connected' ? (
                <CheckCircle2 className="text-green-500" size={24} />
              ) : (
                <XCircle className="text-gray-300" size={24} />
              )}
            </div>
            <button
              onClick={() => toggleConnection(integration.id)}
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                integration.status === 'connected'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Link2 size={20} /> API Configuration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input type="password" value="••••••••••••••••" readOnly className="w-full border rounded px-3 py-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
            <input type="text" value="https://api.yourcompany.com/webhooks/payroll" readOnly className="w-full border rounded px-3 py-2 bg-gray-50" />
          </div>
          <button className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">
            Regenerate API Key
          </button>
        </div>
      </div>
    </div>
  );
}
