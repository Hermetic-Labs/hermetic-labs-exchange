import { useState } from 'react';
import { Phone, Activity, Mic, Volume2, CheckCircle, AlertTriangle } from 'lucide-react';

interface CallLog { id: string; direction: 'inbound' | 'outbound'; number: string; duration: string; status: string; date: string; }

const seedCalls: CallLog[] = [
    { id: '1', direction: 'inbound', number: '+1 (555) 123-4567', duration: '5:32', status: 'completed', date: '2024-01-15 10:30' },
    { id: '2', direction: 'outbound', number: '+1 (555) 987-6543', duration: '2:15', status: 'completed', date: '2024-01-15 09:45' },
    { id: '3', direction: 'inbound', number: '+1 (555) 456-7890', duration: '0:00', status: 'missed', date: '2024-01-15 09:00' },
];

export default function VoiceConnectorPortal() {
    const [tab, setTab] = useState<'calls' | 'settings' | 'connect'>('calls');
    const [connected, setConnected] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900/20 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-violet-500/20 rounded-xl">
                        <Phone className="w-8 h-8 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Voice Connector</h1>
                        <p className="text-slate-400">Telephony integration with STT/TTS</p>
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
                        <Phone className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-white">24</p>
                        <p className="text-slate-400 text-sm">Inbound Today</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Phone className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">18</p>
                        <p className="text-slate-400 text-sm">Outbound Today</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Mic className="w-5 h-5 text-violet-400 mb-2" />
                        <p className="text-2xl font-bold text-white">2.4h</p>
                        <p className="text-slate-400 text-sm">Talk Time</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Volume2 className="w-5 h-5 text-orange-400 mb-2" />
                        <p className="text-2xl font-bold text-white">156</p>
                        <p className="text-slate-400 text-sm">Transcripts</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {(['calls', 'settings', 'connect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg capitalize ${tab === t ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    {tab === 'calls' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Recent Calls</h2>
                            {seedCalls.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Phone className={`w-5 h-5 ${c.direction === 'inbound' ? 'text-green-400' : 'text-blue-400'}`} />
                                        <div>
                                            <p className="text-white font-medium">{c.number}</p>
                                            <p className="text-slate-400 text-sm">{c.date} • {c.direction}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs ${c.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {c.status}
                                        </span>
                                        <p className="text-slate-300 text-sm mt-1">{c.duration}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'settings' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-white">Voice Settings</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div>
                                        <p className="text-white">Speech-to-Text</p>
                                        <p className="text-slate-400 text-sm">Enable real-time transcription</p>
                                    </div>
                                    <div className="w-12 h-6 bg-violet-500 rounded-full relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div>
                                        <p className="text-white">Text-to-Speech</p>
                                        <p className="text-slate-400 text-sm">Enable voice responses</p>
                                    </div>
                                    <div className="w-12 h-6 bg-violet-500 rounded-full relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div>
                                        <p className="text-white">Call Recording</p>
                                        <p className="text-slate-400 text-sm">Record calls for compliance</p>
                                    </div>
                                    <div className="w-12 h-6 bg-slate-600 rounded-full relative cursor-pointer">
                                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {tab === 'connect' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <Phone className="w-16 h-16 text-violet-400 mx-auto" />
                            <h2 className="text-xl font-semibold text-white text-center">Connect Voice Provider</h2>
                            <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                                <option value="">Select Provider</option>
                                <option value="twilio">Twilio</option>
                                <option value="vonage">Vonage</option>
                                <option value="bandwidth">Bandwidth</option>
                            </select>
                            <input placeholder="Account SID" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <input type="password" placeholder="Auth Token" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                            <button onClick={() => setConnected(true)}
                                className="w-full py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-lg">
                                Connect Provider
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
