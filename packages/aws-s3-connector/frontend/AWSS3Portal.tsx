import { useState } from 'react';
import { Cloud, Folder, File, Upload, Download, Trash2, Settings, CheckCircle, AlertTriangle } from 'lucide-react';

// Types
interface S3Object {
    key: string;
    size: number;
    lastModified: string;
    storageClass: string;
}

interface Bucket {
    name: string;
    region: string;
    createdAt: string;
    objectCount: number;
}

// Seed data
const seedBuckets: Bucket[] = [
    { name: 'my-app-uploads', region: 'us-east-1', createdAt: '2023-06-15', objectCount: 1247 },
    { name: 'backup-archive', region: 'us-west-2', createdAt: '2023-03-01', objectCount: 892 },
    { name: 'static-assets-cdn', region: 'eu-west-1', createdAt: '2024-01-02', objectCount: 156 },
];

const seedObjects: S3Object[] = [
    { key: 'uploads/2024/01/report.pdf', size: 2456789, lastModified: '2024-01-15T10:30:00Z', storageClass: 'STANDARD' },
    { key: 'uploads/2024/01/data.csv', size: 156234, lastModified: '2024-01-14T15:20:00Z', storageClass: 'STANDARD' },
    { key: 'images/hero-banner.jpg', size: 3567890, lastModified: '2024-01-10T09:00:00Z', storageClass: 'STANDARD' },
    { key: 'backups/db-snapshot-20240115.sql.gz', size: 89012345, lastModified: '2024-01-15T02:00:00Z', storageClass: 'GLACIER' },
];

export default function AWSS3Portal() {
    const [tab, setTab] = useState<'buckets' | 'objects' | 'connect'>('buckets');
    const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [accessKey, setAccessKey] = useState('');
    const [secretKey, setSecretKey] = useState('');

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/30 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-orange-500/20 rounded-xl">
                        <Cloud className="w-8 h-8 text-orange-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">AWS S3 Connector</h1>
                        <p className="text-slate-400">Object storage management and file operations</p>
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
                            <Folder className="w-5 h-5 text-orange-400" />
                            <span className="text-slate-400 text-sm">Buckets</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-2">{seedBuckets.length}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <File className="w-5 h-5 text-blue-400" />
                            <span className="text-slate-400 text-sm">Total Objects</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-2">
                            {seedBuckets.reduce((sum, b) => sum + b.objectCount, 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <Upload className="w-5 h-5 text-green-400" />
                            <span className="text-slate-400 text-sm">Storage Used</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-2">24.7 GB</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <Download className="w-5 h-5 text-purple-400" />
                            <span className="text-slate-400 text-sm">This Month</span>
                        </div>
                        <p className="text-2xl font-bold text-white mt-2">1.2 TB</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['buckets', 'objects', 'connect'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize transition-all ${tab === t
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6">
                    {tab === 'buckets' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-white">S3 Buckets</h2>
                                <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors">
                                    Create Bucket
                                </button>
                            </div>
                            <div className="grid gap-4">
                                {seedBuckets.map(bucket => (
                                    <div
                                        key={bucket.name}
                                        onClick={() => {
                                            setSelectedBucket(bucket.name);
                                            setTab('objects');
                                        }}
                                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:border-orange-500/50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                                <Folder className="w-6 h-6 text-orange-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{bucket.name}</p>
                                                <p className="text-slate-400 text-sm">{bucket.region} • Created {bucket.createdAt}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white">{bucket.objectCount.toLocaleString()} objects</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'objects' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Objects</h2>
                                    {selectedBucket && <p className="text-slate-400 text-sm">Bucket: {selectedBucket}</p>}
                                </div>
                                <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors flex items-center gap-2">
                                    <Upload className="w-4 h-4" /> Upload
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-slate-400 text-sm border-b border-white/10">
                                            <th className="pb-3">Key</th>
                                            <th className="pb-3">Size</th>
                                            <th className="pb-3">Storage Class</th>
                                            <th className="pb-3">Last Modified</th>
                                            <th className="pb-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {seedObjects.map(obj => (
                                            <tr key={obj.key} className="border-b border-white/5">
                                                <td className="py-3 text-slate-300 font-mono text-sm">{obj.key}</td>
                                                <td className="py-3 text-white">{formatSize(obj.size)}</td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${obj.storageClass === 'GLACIER' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                                                        }`}>
                                                        {obj.storageClass}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-slate-400 text-sm">{new Date(obj.lastModified).toLocaleDateString()}</td>
                                                <td className="py-3">
                                                    <div className="flex gap-2">
                                                        <button className="p-1 hover:bg-white/10 rounded"><Download className="w-4 h-4 text-slate-400" /></button>
                                                        <button className="p-1 hover:bg-white/10 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <div className="text-center">
                                <Cloud className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-white">Connect to AWS</h2>
                                <p className="text-slate-400 mt-2">Enter your AWS credentials to access S3 buckets</p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-300 text-sm mb-2">Access Key ID</label>
                                    <input
                                        type="text"
                                        value={accessKey}
                                        onChange={e => setAccessKey(e.target.value)}
                                        placeholder="AKIA..."
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 text-sm mb-2">Secret Access Key</label>
                                    <input
                                        type="password"
                                        value={secretKey}
                                        onChange={e => setSecretKey(e.target.value)}
                                        placeholder="••••••••••••••••"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                                <button
                                    onClick={() => setConnected(true)}
                                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                                >
                                    Connect to AWS
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 text-center">
                                We recommend using IAM credentials with least-privilege S3 access.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
