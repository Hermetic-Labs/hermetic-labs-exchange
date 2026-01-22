import { useState, useRef } from 'react';
import { Settings as SettingsIcon, Upload, Save } from 'lucide-react';
import { CompanySettings } from '../types';

interface SettingsProps {
  companySettings: CompanySettings;
  setCompanySettings: (settings: CompanySettings) => void;
}

export default function Settings({ companySettings, setCompanySettings }: SettingsProps) {
  const [form, setForm] = useState(companySettings);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setForm({ ...form, logo: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setCompanySettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <SettingsIcon size={28} /> Company Settings
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Company Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Branding</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
                <div className="flex items-center gap-4">
                  {form.logo ? (
                    <img src={form.logo} alt="Logo" className="h-16 w-16 object-contain border rounded" />
                  ) : (
                    <div className="h-16 w-16 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                      No Logo
                    </div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded hover:bg-gray-200">
                    <Upload size={18} /> Upload Logo
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <div className="flex items-center gap-4">
                  <input type="color" value={form.primaryColor} onChange={e => setForm({...form, primaryColor: e.target.value})} className="h-10 w-20 border rounded cursor-pointer" />
                  <input value={form.primaryColor} onChange={e => setForm({...form, primaryColor: e.target.value})} className="border rounded px-3 py-2 w-32" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Pay Stub Preview</h2>
            <div className="border rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4 pb-4 border-b" style={{ borderColor: form.primaryColor }}>
                {form.logo ? (
                  <img src={form.logo} alt="Logo" className="h-12" />
                ) : (
                  <div className="w-12 h-12 rounded flex items-center justify-center text-white font-bold" style={{ backgroundColor: form.primaryColor }}>
                    {form.companyName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold" style={{ color: form.primaryColor }}>{form.companyName}</h3>
                  <p className="text-sm text-gray-600">{form.address}</p>
                  <p className="text-sm text-gray-600">{form.city}, {form.state} {form.zip}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                <p>This preview shows how your company information will appear on pay stubs and other documents.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className={`mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium transition-colors ${
              saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Save size={20} />
            {saved ? 'Settings Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
