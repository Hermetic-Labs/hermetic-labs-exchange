import React from 'react';

interface LogBarProps {
    logs: string[];
}

const outerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1e293b",
    borderTop: "1px solid #334155",
};

const barStyle: React.CSSProperties = {
    height: "40px",
    display: "flex",
    alignItems: "center",
    paddingLeft: "24px",
    paddingRight: "24px",
    overflowX: "auto",
    overflowY: "hidden",
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#94a3b8",
    gap: "32px",
    whiteSpace: "nowrap",
};

const logItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
};

function LogBar({ logs }: LogBarProps): React.ReactElement {
    return (
        <div style={outerStyle}>
            <div style={barStyle}>
                {logs.map((entry, index) => (
                    <div key={`${entry}-${index}`} style={logItemStyle}>
                        <span style={{ color: "#10b981" }}>[{String(index + 1).padStart(2, "0")}]</span>
                        <span>{entry}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default LogBar;
