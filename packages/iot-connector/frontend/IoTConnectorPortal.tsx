import { useState } from 'react';
import { Cpu, Radio, Thermometer, Activity, CheckCircle, AlertTriangle, Wifi } from 'lucide-react';

interface Device { id: string; name: string; type: string; status: 'online' | 'offline'; lastSeen: string; battery?: number; }
interface TelemetryPoint { timestamp: string; temperature: number; humidity: number; }

const seedDevices: Device[] = [
    { id: 'dev_001', name: 'Warehouse Sensor A', type: 'temperature', status: 'online', lastSeen: '2024-01-15T10:30:00Z', battery: 85 },
    { id: 'dev_002', name: 'Factory Floor Monitor', type: 'multi-sensor', status: 'online', lastSeen: '2024-01-15T10:29:00Z', battery: 62 },
    { id: 'dev_003', name: 'Outdoor Gateway', type: 'gateway', status: 'offline', lastSeen: '2024-01-14T22:00:00Z' },
];

const seedTelemetry: TelemetryPoint[] = [
    { timestamp: '10:30', temperature: 22.5, humidity: 45 },
    { timestamp: '10:25', temperature: 22.3, humidity: 46 },
    { timestamp: '10:20', temperature: 22.1, humidity: 44 },
    { timestamp: '10:15', temperature: 21.9, humidity: 45 },
];

export default function IoTConnectorPortal() {
    const [tab, setTab] = useState<'devices' | 'telemetry' | 'provision'>('devices');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900/30 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-teal-500/20 rounded-xl">
                        <Cpu className="w-8 h-8 text-teal-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">IoT Fleet Connector</h1>
                        <p className="text-slate-400">Device management and telemetry</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <Cpu className="w-5 h-5 text-teal-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{seedDevices.length}</p>
                        <p className="text-slate-400 text-sm">Total Devices</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <Wifi className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-green-400">2</p>
                        <p className="text-slate-400 text-sm">Online</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <Radio className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">1.2K</p>
                        <p className="text-slate-400 text-sm">Messages/hr</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                        <Activity className="w-5 h-5 text-purple-400 mb-2" />
                        <p className="text-2xl font-bold text-white">99.8%</p>
                        <p className="text-slate-400 text-sm">Uptime</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['devices', 'telemetry', 'provision'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-teal-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6">
                    {tab === 'devices' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Device Fleet</h2>
                            {seedDevices.map(d => (
                                <div key={d.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${d.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                                        <div>
                                            <p className="text-white font-medium">{d.name}</p>
                                            <p className="text-slate-400 text-sm">{d.type} • {d.id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {d.battery && <p className="text-slate-300">🔋 {d.battery}%</p>}
                                        <p className="text-slate-500 text-xs">Last seen: {new Date(d.lastSeen).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'telemetry' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Live Telemetry</h2>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white/5 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-orange-400 mb-2">
                                        <Thermometer className="w-5 h-5" /> Temperature
                                    </div>
                                    <p className="text-3xl font-bold text-white">22.5°C</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                                        <Activity className="w-5 h-5" /> Humidity
                                    </div>
                                    <p className="text-3xl font-bold text-white">45%</p>
                                </div>
                            </div>
                            <table className="w-full">
                                <thead>
                                    <tr className="text-slate-400 text-sm border-b border-white/10">
                                        <th className="pb-2 text-left">Time</th>
                                        <th className="pb-2 text-left">Temp</th>
                                        <th className="pb-2 text-left">Humidity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {seedTelemetry.map(t => (
                                        <tr key={t.timestamp} className="border-b border-white/5">
                                            <td className="py-2 text-slate-300">{t.timestamp}</td>
                                            <td className="py-2 text-white">{t.temperature}°C</td>
                                            <td className="py-2 text-white">{t.humidity}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {tab === 'provision' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Cpu className="w-16 h-16 text-teal-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Provision New Device</h2>
                            <input placeholder="Device Name" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                                <option value="">Select Device Type</option>
                                <option value="temperature">Temperature Sensor</option>
                                <option value="multi">Multi-Sensor</option>
                                <option value="gateway">Gateway</option>
                            </select>
                            <button className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg">Generate Credentials</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
