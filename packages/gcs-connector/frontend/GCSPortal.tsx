import { useState } from 'react';
import { Cloud, Folder, File, Upload, CheckCircle, AlertTriangle } from 'lucide-react';

interface Bucket { name: string; location: string; objectCount: number; }

const seedBuckets: Bucket[] = [
    { name: 'my-app-data', location: 'us-central1', objectCount: 892 },
    { name: 'media-storage', location: 'us-east1', objectCount: 2341 },
    { name: 'backup-archive', location: 'eu-west1', objectCount: 156 },
];

export default function GCSPortal() {
    const [tab, setTab] = useState<'buckets' | 'connect'>('buckets');
    const [connected, setConnected] = useState(false);
    const [projectId, setProjectId] = useState('');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-red-500/20 rounded-xl">
                        <Cloud className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Google Cloud Storage</h1>
                        <p className="text-slate-400">Bucket and object management</p>
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
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <Folder className="w-5 h-5 text-red-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedBuckets.length}</p>
                        <p className="text-slate-400 text-sm">Buckets</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <File className="w-5 h-5 text-yellow-400 mb-2" />
                        <p className="text-2xl font-bold text-white">3,389</p>
                        <p className="text-slate-400 text-sm">Objects</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <Upload className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">42.1 GB</p>
                        <p className="text-slate-400 text-sm">Storage</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['buckets', 'connect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6">
                    {tab === 'buckets' && (
                        <div className="space-y-4">
                            {seedBuckets.map(b => (
                                <div key={b.name} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Folder className="w-6 h-6 text-red-400" />
                                        <div>
                                            <p className="text-white font-medium">{b.name}</p>
                                            <p className="text-slate-400 text-sm">{b.location}</p>
                                        </div>
                                    </div>
                                    <p className="text-white">{b.objectCount} objects</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Cloud className="w-16 h-16 text-red-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Connect to GCP</h2>
                            <input value={projectId} onChange={e => setProjectId(e.target.value)}
                                placeholder="Project ID" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <button onClick={() => setConnected(true)}
                                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg">
                                Connect with Service Account
                            </button>
                            <p className="text-xs text-slate-500 text-center">Upload a service account JSON key file</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
