import { useState } from 'react';
import { Building, DollarSign, ArrowUpDown, CheckCircle, AlertTriangle, Shield, RefreshCw } from 'lucide-react';

// Types
interface LinkedAccount {
    id: string;
    institution: string;
    name: string;
    type: 'checking' | 'savings' | 'credit';
    balance: number;
    lastSync: string;
}

interface Transaction {
    id: string;
    date: string;
    name: string;
    amount: number;
    category: string;
    pending: boolean;
}

// Seed data
const seedAccounts: LinkedAccount[] = [
    { id: 'acc_1', institution: 'Chase', name: 'Primary Checking', type: 'checking', balance: 5432.10, lastSync: '2024-01-15T10:00:00Z' },
    { id: 'acc_2', institution: 'Chase', name: 'Savings', type: 'savings', balance: 15000.00, lastSync: '2024-01-15T10:00:00Z' },
    { id: 'acc_3', institution: 'American Express', name: 'Platinum Card', type: 'credit', balance: -2340.50, lastSync: '2024-01-15T09:30:00Z' },
];

const seedTransactions: Transaction[] = [
    { id: 'tx_1', date: '2024-01-15', name: 'Amazon.com', amount: -89.99, category: 'Shopping', pending: false },
    { id: 'tx_2', date: '2024-01-15', name: 'Starbucks', amount: -6.45, category: 'Food & Drink', pending: true },
    { id: 'tx_3', date: '2024-01-14', name: 'Payroll Deposit', amount: 3500.00, category: 'Income', pending: false },
    { id: 'tx_4', date: '2024-01-14', name: 'Netflix', amount: -15.99, category: 'Entertainment', pending: false },
    { id: 'tx_5', date: '2024-01-13', name: 'Uber', amount: -24.50, category: 'Travel', pending: false },
];

export default function PlaidConnectorPortal() {
    const [tab, setTab] = useState<'accounts' | 'transactions' | 'link'>('accounts');
    const [linking, setLinking] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const totalBalance = seedAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-emerald-500/20 rounded-xl">
                        <Building className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Plaid Connector</h1>
                        <p className="text-slate-400">Bank account linking and transaction sync</p>
                    </div>
                    <div className="ml-auto">
                        <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                            <Shield className="w-4 h-4" /> Bank-Level Security
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <Building className="w-5 h-5 text-emerald-400" />
                            <span className="text-slate-400 text-sm">Linked Accounts</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-2">{seedAccounts.length}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <DollarSign className="w-5 h-5 text-blue-400" />
                            <span className="text-slate-400 text-sm">Net Balance</span>
                        </div>
                        <p className={`text-2xl font-bold mt-2 ${totalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(totalBalance)}
                        </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <ArrowUpDown className="w-5 h-5 text-purple-400" />
                            <span className="text-slate-400 text-sm">This Month</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-2">47 txns</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <RefreshCw className="w-5 h-5 text-cyan-400" />
                            <span className="text-slate-400 text-sm">Last Sync</span>
                        </div>
                        <p className="text-lg font-medium text-white mt-2">2 min ago</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['accounts', 'transactions', 'link'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize transition-all ${tab === t
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                        >
                            {t === 'link' ? 'Link Account' : t}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6">
                    {tab === 'accounts' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Linked Accounts</h2>
                            <div className="grid gap-4">
                                {seedAccounts.map(acc => (
                                    <div key={acc.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                                <Building className="w-6 h-6 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{acc.name}</p>
                                                <p className="text-slate-400 text-sm">{acc.institution} • {acc.type}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xl font-semibold ${acc.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                                                {formatCurrency(acc.balance)}
                                            </p>
                                            <p className="text-slate-500 text-xs">
                                                Synced {new Date(acc.lastSync).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'transactions' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
                            <div className="space-y-2">
                                {seedTransactions.map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-white font-medium">{tx.name}</p>
                                                {tx.pending && (
                                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                                        Pending
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-400 text-sm">{tx.category} • {tx.date}</p>
                                        </div>
                                        <p className={`text-lg font-medium ${tx.amount >= 0 ? 'text-green-400' : 'text-white'}`}>
                                            {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'link' && (
                        <div className="max-w-md mx-auto space-y-6 py-8">
                            <div className="text-center">
                                <Building className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-white">Link a Bank Account</h2>
                                <p className="text-slate-400 mt-2">Securely connect your bank using Plaid's encrypted connection</p>
                            </div>

                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="text-emerald-400 font-medium">Bank-Level Security</p>
                                        <p className="text-slate-400 mt-1">
                                            Your credentials are never stored. Plaid uses 256-bit encryption.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setLinking(true);
                                    setTimeout(() => setLinking(false), 2000);
                                }}
                                disabled={linking}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {linking ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        Opening Plaid Link...
                                    </>
                                ) : (
                                    <>
                                        <Building className="w-5 h-5" />
                                        Connect Bank Account
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-slate-500 text-center">
                                Supports 12,000+ financial institutions including Chase, Bank of America, Wells Fargo, and more.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
