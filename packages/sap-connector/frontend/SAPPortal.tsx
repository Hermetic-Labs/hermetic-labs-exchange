import { useState } from 'react';
import { Box, FileText, Truck, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';

interface Material { id: string; description: string; plant: string; stock: number; unit: string; }
interface PurchaseOrder { id: string; vendor: string; amount: number; status: string; date: string; }

const seedMaterials: Material[] = [
    { id: 'MAT-001', description: 'Steel Sheet 4mm', plant: 'P100', stock: 1500, unit: 'KG' },
    { id: 'MAT-002', description: 'Copper Wire 2.5mm', plant: 'P100', stock: 2300, unit: 'M' },
    { id: 'MAT-003', description: 'Aluminum Profile', plant: 'P200', stock: 890, unit: 'PC' },
];

const seedPOs: PurchaseOrder[] = [
    { id: 'PO-2024-0156', vendor: 'Global Materials Inc', amount: 45000, status: 'Approved', date: '2024-01-15' },
    { id: 'PO-2024-0155', vendor: 'Steel Dynamics', amount: 28500, status: 'Pending', date: '2024-01-14' },
];

export default function SAPPortal() {
    const [tab, setTab] = useState<'materials' | 'purchasing' | 'connect'>('materials');
    const [connected, setConnected] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900/20 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-amber-500/20 rounded-xl">
                        <Box className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">SAP Connector</h1>
                        <p className="text-slate-400">ERP integration for materials and purchasing</p>
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
                        <Box className="w-5 h-5 text-amber-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedMaterials.length}</p>
                        <p className="text-slate-400 text-sm">Materials</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Truck className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">24</p>
                        <p className="text-slate-400 text-sm">Vendors</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <FileText className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedPOs.length}</p>
                        <p className="text-slate-400 text-sm">Open POs</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <DollarSign className="w-5 h-5 text-purple-400 mb-2" />
                        <p className="text-2xl font-bold text-white">$73.5K</p>
                        <p className="text-slate-400 text-sm">PO Value</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['materials', 'purchasing', 'connect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    {tab === 'materials' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Material Master</h2>
                            <table className="w-full">
                                <thead>
                                    <tr className="text-slate-400 text-sm border-b border-white/10">
                                        <th className="pb-2 text-left">Material ID</th>
                                        <th className="pb-2 text-left">Description</th>
                                        <th className="pb-2 text-left">Plant</th>
                                        <th className="pb-2 text-left">Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {seedMaterials.map(m => (
                                        <tr key={m.id} className="border-b border-white/5">
                                            <td className="py-3 text-amber-400 font-mono">{m.id}</td>
                                            <td className="py-3 text-white">{m.description}</td>
                                            <td className="py-3 text-slate-300">{m.plant}</td>
                                            <td className="py-3 text-white">{m.stock} {m.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {tab === 'purchasing' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Purchase Orders</h2>
                            {seedPOs.map(po => (
                                <div key={po.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div>
                                        <p className="text-amber-400 font-mono">{po.id}</p>
                                        <p className="text-white">{po.vendor}</p>
                                        <p className="text-slate-400 text-sm">{po.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs ${po.status === 'Approved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {po.status}
                                        </span>
                                        <p className="text-white font-semibold mt-1">${po.amount.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Box className="w-16 h-16 text-amber-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Connect to SAP</h2>
                            <input placeholder="SAP Host" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <input placeholder="Client" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <button onClick={() => setConnected(true)}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg">
                                Connect via RFC
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
