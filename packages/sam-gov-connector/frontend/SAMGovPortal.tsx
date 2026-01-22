import { useState } from 'react';
import { Building2, Search, CheckCircle, AlertTriangle, Star, Zap } from 'lucide-react';

interface Entity { uei: string; name: string; status: string; cageCode: string; expDate: string; }
interface Opportunity { id: string; title: string; agency: string; deadline: string; type: string; }

const seedEntities: Entity[] = [
    { uei: 'ABC123DEF456', name: 'TechCorp Solutions LLC', status: 'Active', cageCode: '1ABC2', expDate: '2025-03-15' },
    { uei: 'XYZ789GHI012', name: 'Federal Services Inc', status: 'Active', cageCode: '3XYZ4', expDate: '2024-11-30' },
];

const seedOpps: Opportunity[] = [
    { id: 'SAM-2024-001', title: 'IT Modernization Support', agency: 'Department of Defense', deadline: '2024-02-15', type: 'Full & Open' },
    { id: 'SAM-2024-002', title: 'Cloud Migration Services', agency: 'GSA', deadline: '2024-02-28', type: 'Small Business Set-Aside' },
];

export default function SAMGovPortal() {
    const [tab, setTab] = useState<'entities' | 'opportunities' | 'connect'>('entities');
    const [connected, setConnected] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/30 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                        <Building2 className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">SAM.gov Connector</h1>
                        <p className="text-slate-400">Federal procurement and entity management</p>
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
                        <Building2 className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedEntities.length}</p>
                        <p className="text-slate-400 text-sm">Registered Entities</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-green-400">Active</p>
                        <p className="text-slate-400 text-sm">Registration Status</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Search className="w-5 h-5 text-purple-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedOpps.length}</p>
                        <p className="text-slate-400 text-sm">Matching Opps</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Star className="w-5 h-5 text-yellow-400 mb-2" />
                        <p className="text-2xl font-bold text-white">5</p>
                        <p className="text-slate-400 text-sm">Active Awards</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['entities', 'opportunities', 'connect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    {tab === 'entities' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Registered Entities</h2>
                            {seedEntities.map(e => (
                                <div key={e.uei} className="p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-white font-medium">{e.name}</p>
                                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">{e.status}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div><span className="text-slate-500">UEI:</span> <span className="text-slate-300">{e.uei}</span></div>
                                        <div><span className="text-slate-500">CAGE:</span> <span className="text-slate-300">{e.cageCode}</span></div>
                                        <div><span className="text-slate-500">Expires:</span> <span className="text-slate-300">{e.expDate}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'opportunities' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Contract Opportunities</h2>
                            {seedOpps.map(o => (
                                <div key={o.id} className="p-4 bg-white/5 rounded-lg">
                                    <p className="text-white font-medium">{o.title}</p>
                                    <p className="text-blue-400 text-sm">{o.agency}</p>
                                    <div className="flex gap-4 mt-2 text-sm">
                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">{o.type}</span>
                                        <span className="text-slate-400">Due: {o.deadline}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Building2 className="w-16 h-16 text-blue-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Connect to SAM.gov</h2>
                            <input placeholder="API Key" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <button onClick={() => setConnected(true)}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                                Connect with API Key
                            </button>
                            <p className="text-xs text-slate-500 text-center">Get your API key from api.sam.gov</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
