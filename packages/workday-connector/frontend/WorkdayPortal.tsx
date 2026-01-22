import { useState } from 'react';
import { Users, Calendar, Award, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface Employee { id: string; name: string; position: string; department: string; manager: string; }
interface TimeOff { id: string; employee: string; type: string; start: string; end: string; status: string; }

const seedEmployees: Employee[] = [
    { id: 'EMP001', name: 'Amanda Torres', position: 'Senior Engineer', department: 'Engineering', manager: 'David Kim' },
    { id: 'EMP002', name: 'Brian Lee', position: 'Product Manager', department: 'Product', manager: 'Sarah Chen' },
    { id: 'EMP003', name: 'Carla Martinez', position: 'Designer', department: 'Design', manager: 'Alex Rivera' },
];

const seedTimeOff: TimeOff[] = [
    { id: 'TO001', employee: 'Amanda Torres', type: 'PTO', start: '2024-01-22', end: '2024-01-26', status: 'Approved' },
    { id: 'TO002', employee: 'Brian Lee', type: 'Sick', start: '2024-01-18', end: '2024-01-18', status: 'Approved' },
];

export default function WorkdayPortal() {
    const [tab, setTab] = useState<'employees' | 'timeoff' | 'connect'>('employees');
    const [connected, setConnected] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-900/20 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-rose-500/20 rounded-xl">
                        <Users className="w-8 h-8 text-rose-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Workday Connector</h1>
                        <p className="text-slate-400">HCM integration for workforce data</p>
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
                        <Users className="w-5 h-5 text-rose-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedEmployees.length}</p>
                        <p className="text-slate-400 text-sm">Employees</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Calendar className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedTimeOff.length}</p>
                        <p className="text-slate-400 text-sm">Time Off Pending</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Award className="w-5 h-5 text-yellow-400 mb-2" />
                        <p className="text-2xl font-bold text-white">5</p>
                        <p className="text-slate-400 text-sm">Open Positions</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Clock className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-white">98%</p>
                        <p className="text-slate-400 text-sm">On-Time Rate</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['employees', 'timeoff', 'connect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t === 'timeoff' ? 'Time Off' : t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    {tab === 'employees' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Worker Directory</h2>
                            {seedEmployees.map(e => (
                                <div key={e.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center">
                                            <span className="text-rose-400 font-medium">{e.name.split(' ').map(n => n[0]).join('')}</span>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{e.name}</p>
                                            <p className="text-slate-400 text-sm">{e.position}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-300">{e.department}</p>
                                        <p className="text-slate-500 text-sm">Reports to: {e.manager}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'timeoff' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Time Off Requests</h2>
                            {seedTimeOff.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div>
                                        <p className="text-white font-medium">{t.employee}</p>
                                        <p className="text-slate-400 text-sm">{t.start} → {t.end}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">{t.type}</span>
                                        <p className="text-green-400 text-sm mt-1">{t.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Users className="w-16 h-16 text-rose-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Connect to Workday</h2>
                            <input placeholder="Tenant Name" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <input placeholder="Integration User" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <button onClick={() => setConnected(true)}
                                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg">
                                Authenticate with Workday
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
