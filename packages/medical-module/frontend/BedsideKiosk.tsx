/**
 * EVE Bedside Kiosk - Raspberry Pi Deployment
 *
 * Standalone kiosk mode for bedside assistant:
 * - Loading screen with Hermetic Labs branding
 * - Network discovery for nurse station connection
 * - System readiness checks
 * - Auto-fullscreen on touch
 * - Graceful degradation for offline mode
 *
 * Target: Raspberry Pi 4/5 with touchscreen
 */

import { useState, useEffect, useCallback } from 'react';
import EveBedsideAssistant from './EveBedsideAssistant';
import { networkDiscovery, DiscoveredNode } from './services/NetworkDiscovery';

// =============================================================================
// TYPES
// =============================================================================

type LoadingPhase = 'init' | 'network' | 'services' | 'discovery' | 'ready' | 'error';
type KioskScreen = 'loading' | 'setup' | 'main';

interface SystemStatus {
    network: boolean;
    backend: boolean;
    camera: boolean;
    audio: boolean;
}

interface KioskConfig {
    roomId: string;
    patientName: string;
    nurseStationIp: string;
    backendUrl: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BACKEND_URL = import.meta.env.VITE_EVE_BACKEND_URL || 'http://localhost:8001';

const PHASE_MESSAGES: Record<LoadingPhase, string> = {
    init: 'Initializing system...',
    network: 'Checking network connectivity...',
    services: 'Connecting to EVE services...',
    discovery: 'Discovering nurse stations...',
    ready: 'System ready',
    error: 'System error - operating in offline mode'
};

const STORAGE_KEY = 'eve-bedside-kiosk-config';

// =============================================================================
// LOADING SCREEN COMPONENT
// =============================================================================

function LoadingScreen({
    phase,
    progress,
    status,
    onRetry
}: {
    phase: LoadingPhase;
    progress: number;
    status: SystemStatus;
    onRetry: () => void;
}) {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#0a0a0f',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#fff',
            overflow: 'hidden'
        }}>
            {/* Background gradient */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%)',
                opacity: 0.8
            }} />

            {/* Animated circles */}
            <div style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                border: '1px solid rgba(59, 130, 246, 0.1)',
                borderRadius: '50%',
                animation: 'pulse 4s ease-in-out infinite'
            }} />
            <div style={{
                position: 'absolute',
                width: '300px',
                height: '300px',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                borderRadius: '50%',
                animation: 'pulse 4s ease-in-out infinite 0.5s'
            }} />
            <div style={{
                position: 'absolute',
                width: '200px',
                height: '200px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '50%',
                animation: 'pulse 4s ease-in-out infinite 1s'
            }} />

            {/* Logo area */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                textAlign: 'center',
                marginBottom: '60px'
            }}>
                {/* Hermetic Labs geometric logo */}
                <svg width="120" height="120" viewBox="0 0 500 500" style={{ marginBottom: '24px' }}>
                    {/* Hexagon (blue) */}
                    <polygon
                        points="250,380 175,340 175,260 250,220 325,260 325,340"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="8"
                    />
                    {/* Square (red) */}
                    <rect
                        x="175" y="80"
                        width="130" height="130"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="8"
                    />
                    {/* Connecting lines (green) */}
                    <line x1="175" y1="210" x2="200" y2="235" stroke="#22c55e" strokeWidth="6" />
                    <line x1="200" y1="235" x2="250" y2="220" stroke="#22c55e" strokeWidth="6" />
                    <line x1="200" y1="235" x2="300" y2="235" stroke="#22c55e" strokeWidth="6" />
                    {/* Circles at joints */}
                    <circle cx="200" cy="235" r="12" fill="#22c55e" />
                    <circle cx="300" cy="235" r="8" fill="none" stroke="#22c55e" strokeWidth="4" />
                </svg>

                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 300,
                    letterSpacing: '8px',
                    margin: '0 0 8px 0',
                    color: '#e5e5e5'
                }}>
                    HERMETIC
                </h1>
                <p style={{
                    fontSize: '14px',
                    letterSpacing: '12px',
                    margin: 0,
                    color: '#888'
                }}>
                    LABS
                </p>
            </div>

            {/* Loading status */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                width: '300px',
                textAlign: 'center'
            }}>
                {/* Progress bar */}
                <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#1f1f2e',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginBottom: '16px'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: phase === 'error'
                            ? 'linear-gradient(90deg, #ef4444, #f97316)'
                            : 'linear-gradient(90deg, #3b82f6, #22c55e)',
                        borderRadius: '2px',
                        transition: 'width 0.5s ease'
                    }} />
                </div>

                {/* Phase message */}
                <p style={{
                    fontSize: '14px',
                    color: '#888',
                    margin: '0 0 24px 0'
                }}>
                    {PHASE_MESSAGES[phase]}
                </p>

                {/* System status indicators */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '20px',
                    marginBottom: '24px'
                }}>
                    <StatusDot label="Network" ok={status.network} />
                    <StatusDot label="Backend" ok={status.backend} />
                    <StatusDot label="Camera" ok={status.camera} />
                    <StatusDot label="Audio" ok={status.audio} />
                </div>

                {/* Retry button for error state */}
                {phase === 'error' && (
                    <button
                        onClick={onRetry}
                        style={{
                            padding: '12px 32px',
                            backgroundColor: 'transparent',
                            border: '1px solid #3b82f6',
                            borderRadius: '6px',
                            color: '#3b82f6',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Retry Connection
                    </button>
                )}
            </div>

            {/* Footer */}
            <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                color: '#555',
                fontSize: '12px',
                zIndex: 10
            }}>
                <p style={{ margin: '0 0 4px 0' }}>EVE Bedside Assistant v2.1</p>
                <p style={{ margin: 0 }}>Medical Professional Suite</p>
            </div>

            {/* CSS animation */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.05); opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}

function StatusDot({ label, ok }: { label: string; ok: boolean }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: ok ? '#22c55e' : '#ef4444',
                margin: '0 auto 4px',
                boxShadow: ok ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
            }} />
            <span style={{ fontSize: '10px', color: '#666' }}>{label}</span>
        </div>
    );
}

// =============================================================================
// SETUP SCREEN COMPONENT
// =============================================================================

function SetupScreen({
    config,
    onSave,
    discoveredNodes
}: {
    config: KioskConfig;
    onSave: (config: KioskConfig) => void;
    discoveredNodes: DiscoveredNode[];
}) {
    const [roomId, setRoomId] = useState(config.roomId);
    const [patientName, setPatientName] = useState(config.patientName);
    const [nurseStationIp, setNurseStationIp] = useState(config.nurseStationIp);
    const [backendUrl, setBackendUrl] = useState(config.backendUrl);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const nurseStations = discoveredNodes.filter(n => n.type === 'nurse-station');

    const handleSave = () => {
        onSave({ roomId, patientName, nurseStationIp, backendUrl });
    };

    const selectNurseStation = (node: DiscoveredNode) => {
        setNurseStationIp(`${node.ip}:${node.port}`);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#0a0a0f',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#fff',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: '#1a1a2e',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
            }}>
                <h2 style={{
                    margin: '0 0 8px 0',
                    fontSize: '24px',
                    fontWeight: 500
                }}>
                    Bedside Setup
                </h2>
                <p style={{
                    margin: '0 0 24px 0',
                    color: '#888',
                    fontSize: '14px'
                }}>
                    Configure this bedside unit
                </p>

                {/* Room ID */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#aaa', fontSize: '12px' }}>
                        Room ID
                    </label>
                    <input
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder="e.g., ICU-203"
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#0a0a0f',
                            border: '1px solid #333',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '16px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* Patient Name */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#aaa', fontSize: '12px' }}>
                        Patient Name (optional)
                    </label>
                    <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g., John Mitchell"
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#0a0a0f',
                            border: '1px solid #333',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '16px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* Nurse Station Selection */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#aaa', fontSize: '12px' }}>
                        Nurse Station
                    </label>

                    {nurseStations.length > 0 ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginBottom: '12px'
                        }}>
                            {nurseStations.map(node => (
                                <button
                                    key={node.id}
                                    onClick={() => selectNurseStation(node)}
                                    style={{
                                        padding: '12px',
                                        backgroundColor: nurseStationIp === `${node.ip}:${node.port}`
                                            ? '#3b82f6'
                                            : '#1f1f2e',
                                        border: '1px solid #333',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span>{node.name}</span>
                                    <span style={{
                                        fontSize: '10px',
                                        color: node.status === 'online' ? '#22c55e' : '#888'
                                    }}>
                                        {node.status === 'online' ? '● Online' : '○ Offline'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: '#666', fontSize: '12px', marginBottom: '12px' }}>
                            No nurse stations found on network. Enter IP manually below.
                        </p>
                    )}

                    <input
                        type="text"
                        value={nurseStationIp}
                        onChange={(e) => setNurseStationIp(e.target.value)}
                        placeholder="IP:Port (e.g., 192.168.1.100:8001)"
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#0a0a0f',
                            border: '1px solid #333',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* Advanced Settings Toggle */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginBottom: '16px',
                        padding: 0
                    }}
                >
                    {showAdvanced ? '▼ Hide Advanced' : '▶ Advanced Settings'}
                </button>

                {showAdvanced && (
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', color: '#aaa', fontSize: '12px' }}>
                            Backend URL
                        </label>
                        <input
                            type="text"
                            value={backendUrl}
                            onChange={(e) => setBackendUrl(e.target.value)}
                            placeholder="http://localhost:8001"
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#0a0a0f',
                                border: '1px solid #333',
                                borderRadius: '6px',
                                color: '#fff',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={!roomId.trim()}
                    style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: roomId.trim() ? '#22c55e' : '#333',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 500,
                        cursor: roomId.trim() ? 'pointer' : 'not-allowed',
                        marginTop: '8px'
                    }}
                >
                    Start Bedside Assistant
                </button>
            </div>

            {/* Footer */}
            <div style={{
                position: 'absolute',
                bottom: '24px',
                textAlign: 'center',
                color: '#555',
                fontSize: '12px'
            }}>
                <p style={{ margin: 0 }}>EVE Medical Professional Suite v2.1</p>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN KIOSK COMPONENT
// =============================================================================

export function BedsideKiosk() {
    const [screen, setScreen] = useState<KioskScreen>('loading');
    const [phase, setPhase] = useState<LoadingPhase>('init');
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<SystemStatus>({
        network: false,
        backend: false,
        camera: false,
        audio: false
    });
    const [discoveredNodes, setDiscoveredNodes] = useState<DiscoveredNode[]>([]);
    const [config, setConfig] = useState<KioskConfig>(() => {
        // Load saved config
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch {}
        return {
            roomId: '',
            patientName: '',
            nurseStationIp: '',
            backendUrl: BACKEND_URL
        };
    });

    // Check network connectivity
    const checkNetwork = useCallback(async (): Promise<boolean> => {
        try {
            // Try to reach a known endpoint
            const response = await fetch(`${BACKEND_URL}/health`, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            return true;
        } catch {
            // Even if fetch fails, navigator.onLine might be true
            return navigator.onLine;
        }
    }, []);

    // Check backend availability
    const checkBackend = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch(`${BACKEND_URL}/health`, {
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }, []);

    // Check camera permission
    const checkCamera = useCallback(async (): Promise<boolean> => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasCamera = devices.some(d => d.kind === 'videoinput');
            if (!hasCamera) return false;

            // Try to get permission
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(t => t.stop());
            return true;
        } catch {
            return false;
        }
    }, []);

    // Check audio permission
    const checkAudio = useCallback(async (): Promise<boolean> => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasMic = devices.some(d => d.kind === 'audioinput');
            if (!hasMic) return false;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            return true;
        } catch {
            return false;
        }
    }, []);

    // Run system checks
    const runSystemChecks = useCallback(async () => {
        setPhase('init');
        setProgress(10);

        // Phase 1: Network
        setPhase('network');
        setProgress(20);
        const networkOk = await checkNetwork();
        setStatus(s => ({ ...s, network: networkOk }));
        await new Promise(r => setTimeout(r, 400));

        // Phase 2: Services
        setPhase('services');
        setProgress(40);
        const backendOk = await checkBackend();
        setStatus(s => ({ ...s, backend: backendOk }));
        setProgress(55);

        const cameraOk = await checkCamera();
        setStatus(s => ({ ...s, camera: cameraOk }));
        setProgress(70);

        const audioOk = await checkAudio();
        setStatus(s => ({ ...s, audio: audioOk }));
        setProgress(80);

        // Phase 3: Network Discovery
        setPhase('discovery');
        setProgress(90);
        try {
            await networkDiscovery.init({
                nodeType: 'bedside',
                nodeName: config.roomId ? `Bedside ${config.roomId}` : 'EVE Bedside',
                room: config.roomId,
                backendUrl: config.backendUrl || BACKEND_URL
            });
            networkDiscovery.start();
        } catch (e) {
            console.warn('[BedsideKiosk] Discovery init failed:', e);
        }
        await new Promise(r => setTimeout(r, 1000));

        setProgress(100);

        // Determine next screen
        if (!networkOk && !backendOk) {
            setPhase('error');
            // Still proceed after delay (offline mode)
            setTimeout(() => {
                if (config.roomId) {
                    setScreen('main');
                } else {
                    setScreen('setup');
                }
            }, 2000);
        } else {
            setPhase('ready');
            setTimeout(() => {
                // If no room configured, show setup
                if (!config.roomId) {
                    setScreen('setup');
                } else {
                    setScreen('main');
                }
            }, 1000);
        }
    }, [checkNetwork, checkBackend, checkCamera, checkAudio, config]);

    // Initial boot sequence
    useEffect(() => {
        runSystemChecks();
    }, [runSystemChecks]);

    // Request fullscreen on first touch (for kiosk mode)
    useEffect(() => {
        const requestFullscreen = () => {
            if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
            document.removeEventListener('touchstart', requestFullscreen);
            document.removeEventListener('click', requestFullscreen);
        };

        document.addEventListener('touchstart', requestFullscreen, { once: true });
        document.addEventListener('click', requestFullscreen, { once: true });

        return () => {
            document.removeEventListener('touchstart', requestFullscreen);
            document.removeEventListener('click', requestFullscreen);
        };
    }, []);

    // Subscribe to discovered nodes
    useEffect(() => {
        const unsubscribe = networkDiscovery.subscribe((nodes) => {
            setDiscoveredNodes(nodes);
        });
        return () => unsubscribe();
    }, []);

    // Handle config save from setup screen
    const handleConfigSave = useCallback((newConfig: KioskConfig) => {
        setConfig(newConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));

        // Re-init discovery with new config
        networkDiscovery.stop();
        networkDiscovery.init({
            nodeType: 'bedside',
            nodeName: `Bedside ${newConfig.roomId}`,
            room: newConfig.roomId,
            backendUrl: newConfig.backendUrl || BACKEND_URL
        }).then(() => {
            networkDiscovery.start();
        });

        setScreen('main');
    }, []);

    // Loading screen
    if (screen === 'loading') {
        return (
            <LoadingScreen
                phase={phase}
                progress={progress}
                status={status}
                onRetry={runSystemChecks}
            />
        );
    }

    // Setup screen
    if (screen === 'setup') {
        return (
            <SetupScreen
                config={config}
                onSave={handleConfigSave}
                discoveredNodes={discoveredNodes}
            />
        );
    }

    // Main bedside assistant
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#0a0a0f',
            overflow: 'hidden'
        }}>
            {/* Settings button (corner) */}
            <button
                onClick={() => setScreen('setup')}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 1000,
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    border: '1px solid #333',
                    color: '#666',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                }}
                title="Settings"
            >
                ⚙
            </button>

            <EveBedsideAssistant />
        </div>
    );
}

export default BedsideKiosk;
