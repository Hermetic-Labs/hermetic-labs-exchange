import { useState } from 'react';
import { Scale, Search, FileText, Star, CheckCircle, AlertTriangle } from 'lucide-react';

interface SearchResult { id: string; title: string; citation: string; type: string; date: string; }

const seedResults: SearchResult[] = [
    { id: '1', title: 'Employment Discrimination Standards', citation: '42 U.S.C. § 2000e', type: 'Statute', date: 'Current' },
    { id: '2', title: 'Griggs v. Duke Power Co.', citation: '401 U.S. 424', type: 'Case', date: '1971' },
    { id: '3', title: 'McDonnell Douglas Framework', citation: '411 U.S. 792', type: 'Case', date: '1973' },
];

export default function WestlawPortal() {
    const [tab, setTab] = useState<'search' | 'folders' | 'connect'>('search');
    const [connected, setConnected] = useState(false);
    const [query, setQuery] = useState('');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900/20 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-500/20 rounded-xl">
                        <Scale className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Westlaw Connector</h1>
                        <p className="text-slate-400">Legal research with KeyCite</p>
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
                        <FileText className="w-5 h-5 text-indigo-400 mb-2" />
                        <p className="text-2xl font-bold text-white">1.8M</p>
                        <p className="text-slate-400 text-sm">Documents</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Search className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">89</p>
                        <p className="text-slate-400 text-sm">Searches</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Star className="w-5 h-5 text-yellow-400 mb-2" />
                        <p className="text-2xl font-bold text-white">12</p>
                        <p className="text-slate-400 text-sm">Folders</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['search', 'folders', 'connect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    {tab === 'search' && (
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Terms and Connectors or Natural Language..."
                                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                                <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">Search</button>
                            </div>
                            <div className="space-y-4">
                                {seedResults.map(r => (
                                    <div key={r.id} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer">
                                        <p className="text-white font-medium">{r.title}</p>
                                        <p className="text-indigo-400 text-sm">{r.citation}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-xs">{r.type}</span>
                                            <span className="text-slate-500 text-xs">{r.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {tab === 'folders' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white">Research Folders</h2>
                            {['Employment Cases', 'Contract Disputes', 'IP Research'].map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Star className="w-5 h-5 text-indigo-400" />
                                        <span className="text-white">{f}</span>
                                    </div>
                                    <span className="text-slate-500 text-sm">{5 + i * 3} documents</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Scale className="w-16 h-16 text-indigo-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Connect to Westlaw</h2>
                            <input placeholder="OnePass Username" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <button onClick={() => setConnected(true)}
                                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">
                                Sign In with OnePass
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
