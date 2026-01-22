import { useState } from 'react';
import { CreditCard, DollarSign, RefreshCw, CheckCircle, AlertTriangle, Users, TrendingUp } from 'lucide-react';

// Types
interface Transaction {
    id: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'pending' | 'failed';
    customer: string;
    created: string;
}

interface Customer {
    id: string;
    email: string;
    name: string;
    balance: number;
    subscriptions: number;
}

// Seed data
const seedTransactions: Transaction[] = [
    { id: 'pi_3Ox2...', amount: 9999, currency: 'usd', status: 'succeeded', customer: 'cus_Alice', created: '2024-01-15T10:30:00Z' },
    { id: 'pi_3Ox1...', amount: 4999, currency: 'usd', status: 'succeeded', customer: 'cus_Bob', created: '2024-01-15T09:15:00Z' },
    { id: 'pi_3Ox0...', amount: 2499, currency: 'usd', status: 'pending', customer: 'cus_Carol', created: '2024-01-15T08:45:00Z' },
    { id: 'pi_3Owz...', amount: 19999, currency: 'usd', status: 'failed', customer: 'cus_Dave', created: '2024-01-14T16:20:00Z' },
];

const seedCustomers: Customer[] = [
    { id: 'cus_Alice', email: 'alice@example.com', name: 'Alice Johnson', balance: 0, subscriptions: 2 },
    { id: 'cus_Bob', email: 'bob@example.com', name: 'Bob Smith', balance: -5000, subscriptions: 1 },
    { id: 'cus_Carol', email: 'carol@example.com', name: 'Carol White', balance: 0, subscriptions: 0 },
];

export default function StripeConnectorPortal() {
    const [tab, setTab] = useState<'transactions' | 'customers' | 'connect'>('transactions');
    const [connected, setConnected] = useState(false);
    const [apiKey, setApiKey] = useState('');

    const formatAmount = (cents: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(cents / 100);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                        <CreditCard className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Stripe Connector</h1>
                        <p className="text-slate-400">Payment processing and subscription management</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {connected ? (
                            <span className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                                <CheckCircle className="w-4 h-4" /> Connected
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                                <AlertTriangle className="w-4 h-4" /> Not Connected
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <DollarSign className="w-5 h-5 text-green-400" />
                            <span className="text-slate-400 text-sm">Today's Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-2">$374.97</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            <span className="text-slate-400 text-sm">Transactions</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-2">24</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-purple-400" />
                            <span className="text-slate-400 text-sm">Customers</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-2">156</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <RefreshCw className="w-5 h-5 text-cyan-400" />
                            <span className="text-slate-400 text-sm">Active Subs</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-2">89</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['transactions', 'customers', 'connect'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize transition-all ${tab === t
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6">
                    {tab === 'transactions' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-slate-400 text-sm border-b border-white/10">
                                            <th className="pb-3">ID</th>
                                            <th className="pb-3">Amount</th>
                                            <th className="pb-3">Status</th>
                                            <th className="pb-3">Customer</th>
                                            <th className="pb-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {seedTransactions.map(tx => (
                                            <tr key={tx.id} className="border-b border-white/5">
                                                <td className="py-3 text-slate-300 font-mono text-sm">{tx.id}</td>
                                                <td className="py-3 text-white font-medium">{formatAmount(tx.amount, tx.currency)}</td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${tx.status === 'succeeded' ? 'bg-green-500/20 text-green-400' :
                                                            tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-slate-300">{tx.customer}</td>
                                                <td className="py-3 text-slate-400 text-sm">{new Date(tx.created).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === 'customers' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Customers</h2>
                            <div className="grid gap-4">
                                {seedCustomers.map(cust => (
                                    <div key={cust.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                        <div>
                                            <p className="text-white font-medium">{cust.name}</p>
                                            <p className="text-slate-400 text-sm">{cust.email}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-300">{cust.subscriptions} subscription{cust.subscriptions !== 1 ? 's' : ''}</p>
                                            {cust.balance < 0 && (
                                                <p className="text-sm text-green-400">{formatAmount(Math.abs(cust.balance), 'usd')} credit</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <div className="text-center">
                                <CreditCard className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-white">Connect Your Stripe Account</h2>
                                <p className="text-slate-400 mt-2">Enter your Stripe API key to enable payment processing</p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-300 text-sm mb-2">Secret Key</label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder="sk_live_..."
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                                <button
                                    onClick={() => setConnected(true)}
                                    className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                                >
                                    Connect to Stripe
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 text-center">
                                Your API key is stored securely and never transmitted outside your environment.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
