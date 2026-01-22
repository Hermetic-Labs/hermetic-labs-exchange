import { useState } from 'react';
import { Landmark, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  routingNumber: string;
  status: 'connected' | 'pending' | 'error';
}

export default function Banking() {
  const [accounts, setAccounts] = useState<BankAccount[]>([
    { id: '1', bankName: 'Chase Business', accountType: 'Checking', accountNumber: '****4532', routingNumber: '****1234', status: 'connected' },
  ]);
  const [showConnect, setShowConnect] = useState(false);
  const [newAccount, setNewAccount] = useState({ bankName: '', accountType: 'Checking', accountNumber: '', routingNumber: '' });

  const connectAccount = () => {
    setAccounts([...accounts, {
      id: Date.now().toString(),
      ...newAccount,
      accountNumber: '****' + newAccount.accountNumber.slice(-4),
      routingNumber: '****' + newAccount.routingNumber.slice(-4),
      status: 'pending'
    }]);
    setShowConnect(false);
    setNewAccount({ bankName: '', accountType: 'Checking', accountNumber: '', routingNumber: '' });
    alert('Mock: Bank connection initiated. Verification in progress...');
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'connected') return <CheckCircle2 className="text-green-500" size={20} />;
    if (status === 'pending') return <AlertCircle className="text-yellow-500" size={20} />;
    return <AlertCircle className="text-red-500" size={20} />;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Banking Information</h1>
        <button onClick={() => setShowConnect(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Connect Bank
        </button>
      </div>

      {showConnect && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Connect New Bank Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Bank Name" value={newAccount.bankName} onChange={e => setNewAccount({...newAccount, bankName: e.target.value})} className="border rounded px-3 py-2" />
            <select value={newAccount.accountType} onChange={e => setNewAccount({...newAccount, accountType: e.target.value})} className="border rounded px-3 py-2">
              <option>Checking</option>
              <option>Savings</option>
            </select>
            <input placeholder="Account Number" value={newAccount.accountNumber} onChange={e => setNewAccount({...newAccount, accountNumber: e.target.value})} className="border rounded px-3 py-2" />
            <input placeholder="Routing Number" value={newAccount.routingNumber} onChange={e => setNewAccount({...newAccount, routingNumber: e.target.value})} className="border rounded px-3 py-2" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={connectAccount} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Connect</button>
            <button onClick={() => setShowConnect(false)} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {accounts.map((account) => (
          <div key={account.id} className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Landmark className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold">{account.bankName}</h3>
                <p className="text-sm text-gray-500">{account.accountType} - {account.accountNumber}</p>
                <p className="text-sm text-gray-500">Routing: {account.routingNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={account.status} />
              <span className="capitalize">{account.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          <strong>Note:</strong> This is a mock banking interface. In production, this would integrate with secure banking APIs and comply with financial regulations.
        </p>
      </div>
    </div>
  );
}
