import React from 'react';

interface Connections {
    ollama: boolean;
    cortex: boolean;
    graphEditor: boolean;  // Renamed from flowerpot - now links to graph editor
}

interface AssistantConnection {
    status: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected' | 'aborted';
    error?: string;
    lastConnected?: string | number;
}

interface TopBarProps {
    connections: Connections;
    onToggleOllama: () => void;
    onToggleGPT: () => void;
    onToggleCortex: () => void;
    onToggleGraphEditor: () => void;
    systemStatus: string;
    assistantConnection?: AssistantConnection;
    onAssistantReconnect?: () => void;
    onOpenAssistantSettings: () => void;
}

const outerShellStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "#0f172a",
    borderBottom: "1px solid #1e293b",
};

const topBarStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "64px",
    paddingLeft: "24px",
    paddingRight: "24px",
    color: "#f1f5f9",
};

const logoTextStyle: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 700,
    letterSpacing: "1.5px",
    color: "#60a5fa",
    display: "flex",
    flexDirection: "column",
    lineHeight: 1.15,
};

const logoSubTextStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 400,
    color: "#94a3b8",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    marginTop: "4px",
};

const indicatorGroupStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "16px",
};

const statusTextStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "#10b981",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    borderLeft: "1px solid #334155",
    paddingLeft: "16px",
};

const dotStyle = (isActive: boolean): React.CSSProperties => ({
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: isActive ? "#10b981" : "#ef4444",
    display: "inline-block",
});

const indicatorButtonStyle = (color: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color,
    backgroundColor: "transparent",
    border: "1px solid #334155",
    borderRadius: "999px",
    padding: "8px 14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
});

const iconButtonStyle = (isActive: boolean): React.CSSProperties => ({
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "1px solid #334155",
    backgroundColor: isActive ? "#1d4ed8" : "transparent",
    color: isActive ? "#f8fafc" : "#94a3b8",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    transition: "all 0.2s ease",
});

const secondaryIconButtonStyle: React.CSSProperties = {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "1px solid #334155",
    backgroundColor: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    transition: "all 0.2s ease",
};

function TopBar({
    connections,
    onToggleOllama,
    onToggleGPT,
    onToggleCortex,
    onToggleGraphEditor,
    systemStatus,
    assistantConnection,
    onAssistantReconnect,
    onOpenAssistantSettings,
}: TopBarProps): React.ReactElement | null {
    const statusIndicatorColor = systemStatus === "Online" ? "#10b981" : systemStatus === "Error" ? "#ef4444" : "#f97316";

    const assistantStatus = assistantConnection?.status || "idle";
    const assistantError = assistantConnection?.error;
    const gptColorMap: Record<string, string> = {
        connected: "#60a5fa",
        connecting: "#facc15",
        error: "#f87171",
        idle: "#cbd5e1",
        disconnected: "#cbd5e1",
        aborted: "#cbd5e1",
    };
    const gptColor = gptColorMap[assistantStatus] || "#cbd5e1";
    const gptDotColor = assistantStatus === "connected" ? "#10b981" : assistantStatus === "connecting" ? "#fde047" : assistantStatus === "error" ? "#ef4444" : "#64748b";

    const gptTitle = (() => {
        switch (assistantStatus) {
            case "connected":
                return "Eden Assistant connected";
            case "connecting":
                return "Connecting to Eden Assistant...";
            case "error":
                return assistantError ? `Connection error: ${assistantError}` : "Assistant connection error";
            default:
                return "Assistant offline. Click to connect.";
        }
    })();

    const handleGptClick = () => {
        if (assistantStatus === "connecting") {
            return;
        }

        if (assistantStatus === "error" && onAssistantReconnect) {
            onAssistantReconnect();
            return;
        }

        onToggleGPT();
    };

    return (
        <div style={outerShellStyle}>
            <div style={topBarStyle}>
                <div style={logoTextStyle}>
                    The Eden Project
                    <span style={logoSubTextStyle}>Modular orchestration shell</span>
                </div>

                <div style={indicatorGroupStyle}>
                    <button
                        type="button"
                        style={indicatorButtonStyle(connections.ollama ? "#60a5fa" : "#cbd5e1")}
                        onClick={onToggleOllama}
                    >
                        <span style={dotStyle(connections.ollama)} />
                        <span>OLAMA</span>
                    </button>

                    <button
                        type="button"
                        style={{
                            ...indicatorButtonStyle(gptColor),
                            borderColor: `${gptDotColor}40`,
                        }}
                        onClick={handleGptClick}
                        title={gptTitle}
                    >
                        <span style={{ ...dotStyle(true), backgroundColor: gptDotColor }} />
                        <span>{assistantStatus === "connecting" ? "Connecting" : "GPT"}</span>
                    </button>

                    <button
                        type="button"
                        style={iconButtonStyle(connections.cortex)}
                        onClick={onToggleCortex}
                        aria-label="Cortex neural engine"
                    >
                        🧠
                    </button>

                    <button
                        type="button"
                        style={iconButtonStyle(connections.graphEditor)}
                        onClick={onToggleGraphEditor}
                        aria-label="Graph Editor"
                    >
                        ◈
                    </button>

                    <button
                        type="button"
                        style={secondaryIconButtonStyle}
                        onClick={onOpenAssistantSettings}
                        title="Assistant connection settings"
                        aria-label="Assistant connection settings"
                    >
                        ⚙️
                    </button>

                    <div style={statusTextStyle}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: statusIndicatorColor }} />
                        System Status: {systemStatus}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TopBar;
