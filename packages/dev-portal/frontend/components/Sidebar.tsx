import React from 'react';

interface SidebarItem {
    key: string;
    label: string;
    icon: React.ReactNode;
}

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    items: SidebarItem[];
    activeItem: string;
    onSelect: (key: string) => void;
}

const sidebarStyle = (collapsed: boolean): React.CSSProperties => ({
    width: collapsed ? "70px" : "240px",
    height: "100%",
    backgroundColor: "#1e293b",
    borderRight: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
    paddingTop: "16px",
    paddingBottom: "16px",
    transition: "width 0.3s ease",
    overflowY: "auto",
});

const toggleButtonStyle: React.CSSProperties = {
    width: "100%",
    height: "48px",
    backgroundColor: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    transition: "color 0.2s ease",
    marginBottom: "12px",
};

const navButtonStyle = (collapsed: boolean, isActive: boolean): React.CSSProperties => ({
    width: "100%",
    height: "48px",
    backgroundColor: isActive ? "#334155" : "transparent",
    border: "none",
    color: isActive ? "#60a5fa" : "#cbd5e1",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: collapsed ? "center" : "flex-start",
    fontSize: "14px",
    padding: collapsed ? "0" : "0 16px",
    transition: "background-color 0.2s ease, color 0.2s ease",
    marginBottom: "8px",
});

const iconWrapperStyle = (collapsed: boolean): React.CSSProperties => ({
    marginRight: collapsed ? "0" : "12px",
    fontSize: "18px",
});

function Sidebar({ collapsed, onToggle, items, activeItem, onSelect }: SidebarProps): React.ReactElement {
    return (
        <aside style={sidebarStyle(collapsed)}>
            <button type="button" style={toggleButtonStyle} onClick={onToggle} aria-label="Toggle sidebar">
                {collapsed ? "▶" : "◀"}
            </button>

            {items.map((item) => (
                <button
                    type="button"
                    key={item.key}
                    style={navButtonStyle(collapsed, item.key === activeItem)}
                    onClick={() => onSelect(item.key)}
                    aria-label={item.label}
                >
                    <span style={iconWrapperStyle(collapsed)}>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                </button>
            ))}
        </aside>
    );
}

export default Sidebar;
