import React from 'react';

interface Tab {
    key: string;
    label: string;
}

interface TabBarProps {
    activeTab: string;
    onChange: (tabKey: string) => void;
}

const tabBarStyle: React.CSSProperties = {
    display: "flex",
    height: "56px",
    backgroundColor: "#1e293b",
    borderBottom: "1px solid #334155",
    paddingLeft: "24px",
};

const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    height: "100%",
    border: "none",
    backgroundColor: isActive ? "#0f172a" : "transparent",
    color: isActive ? "#60a5fa" : "#94a3b8",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: isActive ? 600 : 400,
    padding: "0 20px",
    borderBottom: isActive ? "2px solid #60a5fa" : "none",
});

const tabs: Tab[] = [
    { key: "workbench", label: "Workbench" },
    { key: "reflex", label: "Reflex Panel" },
    { key: "threads", label: "Threads" },
    { key: "api-test", label: "API Test" },
];

function TabBar({ activeTab, onChange }: TabBarProps): React.ReactElement {
    return (
        <div style={tabBarStyle}>
            {tabs.map((tab) => (
                <button
                    type="button"
                    key={tab.key}
                    style={tabButtonStyle(tab.key === activeTab)}
                    onClick={() => onChange(tab.key)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export default TabBar;
