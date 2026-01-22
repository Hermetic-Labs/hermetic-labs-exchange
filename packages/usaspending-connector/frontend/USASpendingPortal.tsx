import { useState } from 'react';
import { Wallet, TrendingUp, Building2, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

interface Award { id: string; recipient: string; amount: number; agency: string; type: string; date: string; }

const seedAwards: Award[] = [
    { id: 'AWD-001', recipient: 'TechCorp Solutions', amount: 2500000, agency: 'Department of Defense', type: 'Contract', date: '2024-01-10' },
    { id: 'AWD-002', recipient: 'Healthcare Systems Inc', amount: 1200000, agency: 'HHS', type: 'Grant', date: '2024-01-08' },
    { id: 'AWD-003', recipient: 'Infrastructure Partners', amount: 5800000, agency: 'DOT', type: 'Contract', date: '2024-01-05' },
];

export default function USASpendingPortal() {
    const [tab, setTab] = useState<'awards' | 'analytics' | 'connect'>('awards');
    const [connected, setConnected] = useState(false);

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
    const total = seedAwards.reduce((sum, a) => sum + a.amount, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900/20 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-green-500/20 rounded-xl">
                        <Wallet className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">USASpending Connector</h1>
                        <p className="text-slate-400">Federal spending data and analytics</p>
                    </div>
                    <div className="ml-auto">
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

                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Wallet className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{formatCurrency(total)}</p>
                        <p className="text-slate-400 text-sm">Total Tracked</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <TrendingUp className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedAwards.length}</p>
                        <p className="text-slate-400 text-sm">Recent Awards</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Building2 className="w-5 h-5 text-purple-400 mb-2" />
                        <p className="text-2xl font-bold text-white">3</p>
                        <p className="text-slate-400 text-sm">Agencies</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Activity className="w-5 h-5 text-orange-400 mb-2" />
                        <p className="text-2xl font-bold text-white">$6.8T</p>
                        <p className="text-slate-400 text-sm">FY2024 Budget</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['awards', 'analytics', 'connect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-green-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    {tab === 'awards' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Federal Awards</h2>
                            {seedAwards.map(a => (
                                <div key={a.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div>
                                        <p className="text-white font-medium">{a.recipient}</p>
                                        <p className="text-green-400 text-sm">{a.agency}</p>
                                        <p className="text-slate-500 text-xs">{a.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">{a.type}</span>
                                        <p className="text-white font-semibold mt-1">{formatCurrency(a.amount)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'analytics' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-white">Spending by Agency</h2>
                            <div className="space-y-3">
                                {[{ name: 'DOD', pct: 45, color: 'bg-blue-500' }, { name: 'HHS', pct: 28, color: 'bg-green-500' }, { name: 'DOT', pct: 15, color: 'bg-purple-500' }, { name: 'Other', pct: 12, color: 'bg-slate-500' }].map(a => (
                                    <div key={a.name}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-white">{a.name}</span>
                                            <span className="text-slate-400">{a.pct}%</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`h-full ${a.color}`} style={{ width: `${a.pct}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Wallet className="w-16 h-16 text-green-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Connect to USASpending</h2>
                            <p className="text-slate-400 text-center">USASpending.gov provides open data - no API key required</p>
                            <button onClick={() => setConnected(true)}
                                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg">
                                Connect to USASpending API
                            </button>
                            <p className="text-xs text-slate-500 text-center">Data updated daily from api.usaspending.gov</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
