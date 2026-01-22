import { useState } from 'react';
import { Scale, Search, FileText, Folder, CheckCircle, AlertTriangle } from 'lucide-react';

interface SearchResult { id: string; title: string; citation: string; court: string; date: string; relevance: number; }

const seedResults: SearchResult[] = [
    { id: '1', title: 'Smith v. Johnson Corp.', citation: '567 F.3d 123', court: '9th Cir.', date: '2023-08-15', relevance: 98 },
    { id: '2', title: 'In re Global Industries', citation: '234 B.R. 567', court: 'Bankr. D. Del.', date: '2023-06-22', relevance: 87 },
    { id: '3', title: 'State v. Martinez', citation: '456 P.3d 789', court: 'Cal. Ct. App.', date: '2023-05-10', relevance: 82 },
];

export default function LexisNexisPortal() {
    const [tab, setTab] = useState<'search' | 'history' | 'connect'>('search');
    const [connected, setConnected] = useState(false);
    const [query, setQuery] = useState('');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-red-500/20 rounded-xl">
                        <Scale className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">LexisNexis Connector</h1>
                        <p className="text-slate-400">Legal research and case law search</p>
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

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <FileText className="w-5 h-5 text-red-400 mb-2" />
                        <p className="text-2xl font-bold text-white">2.1M</p>
                        <p className="text-slate-400 text-sm">Cases Available</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Search className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">156</p>
                        <p className="text-slate-400 text-sm">Searches This Month</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Folder className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-white">23</p>
                        <p className="text-slate-400 text-sm">Saved Documents</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['search', 'history', 'connect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    {tab === 'search' && (
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search cases, statutes, or secondary sources..."
                                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                                <button className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg">Search</button>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-slate-400 text-sm">Sample Results</h3>
                                {seedResults.map(r => (
                                    <div key={r.id} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-white font-medium">{r.title}</p>
                                                <p className="text-red-400 text-sm">{r.citation}</p>
                                                <p className="text-slate-400 text-sm">{r.court} • {r.date}</p>
                                            </div>
                                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">{r.relevance}% match</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {tab === 'history' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white">Recent Searches</h2>
                            {['breach of fiduciary duty', 'employment discrimination wrongful termination', 'patent infringement software'].map((q, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Search className="w-4 h-4 text-slate-400" />
                                        <span className="text-white">{q}</span>
                                    </div>
                                    <span className="text-slate-500 text-sm">{3 - i} days ago</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Scale className="w-16 h-16 text-red-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Connect to LexisNexis</h2>
                            <input placeholder="LexisNexis ID" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <button onClick={() => setConnected(true)}
                                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg">
                                Sign In
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
