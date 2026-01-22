import { useState } from 'react';
import { Users, TrendingUp, Building2, Phone, CheckCircle, AlertTriangle } from 'lucide-react';

interface Lead { id: string; name: string; company: string; status: string; value: number; }
interface Opportunity { id: string; name: string; stage: string; amount: number; closeDate: string; }

const seedLeads: Lead[] = [
    { id: 'lead_1', name: 'John Smith', company: 'Acme Corp', status: 'New', value: 50000 },
    { id: 'lead_2', name: 'Sarah Johnson', company: 'TechStart Inc', status: 'Contacted', value: 75000 },
    { id: 'lead_3', name: 'Mike Chen', company: 'Global Systems', status: 'Qualified', value: 120000 },
];

const seedOpps: Opportunity[] = [
    { id: 'opp_1', name: 'Enterprise License - Acme', stage: 'Proposal', amount: 150000, closeDate: '2024-02-15' },
    { id: 'opp_2', name: 'Platform Expansion - TechStart', stage: 'Negotiation', amount: 85000, closeDate: '2024-01-30' },
];

export default function SalesforcePortal() {
    const [tab, setTab] = useState<'leads' | 'opportunities' | 'connect'>('leads');
    const [connected, setConnected] = useState(false);

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-900/30 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-sky-500/20 rounded-xl">
                        <Building2 className="w-8 h-8 text-sky-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Salesforce Connector</h1>
                        <p className="text-slate-400">CRM sync and sales automation</p>
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
                        <Users className="w-5 h-5 text-sky-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedLeads.length}</p>
                        <p className="text-slate-400 text-sm">Active Leads</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedOpps.length}</p>
                        <p className="text-slate-400 text-sm">Open Opps</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Building2 className="w-5 h-5 text-purple-400 mb-2" />
                        <p className="text-2xl font-bold text-white">$235K</p>
                        <p className="text-slate-400 text-sm">Pipeline</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Phone className="w-5 h-5 text-orange-400 mb-2" />
                        <p className="text-2xl font-bold text-white">12</p>
                        <p className="text-slate-400 text-sm">Activities Today</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['leads', 'opportunities', 'connect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    {tab === 'leads' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Recent Leads</h2>
                            {seedLeads.map(l => (
                                <div key={l.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div>
                                        <p className="text-white font-medium">{l.name}</p>
                                        <p className="text-slate-400 text-sm">{l.company}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs ${l.status === 'Qualified' ? 'bg-green-500/20 text-green-400' : 'bg-sky-500/20 text-sky-400'}`}>
                                            {l.status}
                                        </span>
                                        <p className="text-slate-300 mt-1">{formatCurrency(l.value)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'opportunities' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Open Opportunities</h2>
                            {seedOpps.map(o => (
                                <div key={o.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div>
                                        <p className="text-white font-medium">{o.name}</p>
                                        <p className="text-slate-400 text-sm">Close: {o.closeDate}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">{o.stage}</span>
                                        <p className="text-white font-semibold mt-1">{formatCurrency(o.amount)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Building2 className="w-16 h-16 text-sky-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Connect to Salesforce</h2>
                            <p className="text-slate-400 text-center">Authenticate with your Salesforce org using OAuth</p>
                            <button onClick={() => setConnected(true)}
                                className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg">
                                Sign in with Salesforce
                            </button>
                            <p className="text-xs text-slate-500 text-center">Supports both Production and Sandbox environments</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
