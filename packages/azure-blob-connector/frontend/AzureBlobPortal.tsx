import { useState } from 'react';
import { Database, Container, File, Upload, Download, CheckCircle, AlertTriangle } from 'lucide-react';

interface BlobContainer {
    name: string;
    accessLevel: string;
    blobCount: number;
}

const seedContainers: BlobContainer[] = [
    { name: 'documents', accessLevel: 'private', blobCount: 456 },
    { name: 'media-uploads', accessLevel: 'blob', blobCount: 1234 },
    { name: 'public-assets', accessLevel: 'container', blobCount: 89 },
];

export default function AzureBlobPortal() {
    const [tab, setTab] = useState<'containers' | 'connect'>('containers');
    const [connected, setConnected] = useState(false);
    const [connectionString, setConnectionString] = useState('');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/30 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                        <Database className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Azure Blob Storage</h1>
                        <p className="text-slate-400">Container and blob management</p>
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
                        <Container className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedContainers.length}</p>
                        <p className="text-slate-400 text-sm">Containers</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <File className="w-5 h-5 text-cyan-400 mb-2" />
                        <p className="text-2xl font-bold text-white">1,779</p>
                        <p className="text-slate-400 text-sm">Total Blobs</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <Upload className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-white">18.3 GB</p>
                        <p className="text-slate-400 text-sm">Storage Used</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['containers', 'connect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6">
                    {tab === 'containers' && (
                        <div className="space-y-4">
                            {seedContainers.map(c => (
                                <div key={c.name} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Container className="w-6 h-6 text-blue-400" />
                                        <div>
                                            <p className="text-white font-medium">{c.name}</p>
                                            <p className="text-slate-400 text-sm">Access: {c.accessLevel}</p>
                                        </div>
                                    </div>
                                    <p className="text-white">{c.blobCount} blobs</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Database className="w-16 h-16 text-blue-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Connect to Azure</h2>
                            <textarea value={connectionString} onChange={e => setConnectionString(e.target.value)}
                                placeholder="DefaultEndpointsProtocol=https;..."
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" rows={3} />
                            <button onClick={() => setConnected(true)}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                                Connect
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
