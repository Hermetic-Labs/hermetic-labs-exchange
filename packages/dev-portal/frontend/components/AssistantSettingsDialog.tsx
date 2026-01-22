import React from 'react';

interface AssistantSettings {
    modelId?: string;
    assistantId?: string;
    apiKey?: string;
    projectId?: string;
    organizationId?: string;
}

interface AssistantSettingsDialogProps {
    open: boolean;
    settings: AssistantSettings;
    onChange: (settings: AssistantSettings) => void;
    onClose: () => void;
    onSave: () => void;
    saving: boolean;
    error?: string | null;
}

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.76)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
};

const dialogStyle: React.CSSProperties = {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "12px",
    width: "420px",
    padding: "24px",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.6)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
};

const headerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
};

const titleStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 600,
    color: "#e2e8f0",
};

const descriptionStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "#94a3b8",
    lineHeight: 1.4,
};

const fieldsetStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
};

const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "12px",
    color: "#cbd5e1",
};

const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #334155",
    backgroundColor: "#0b1220",
    color: "#e2e8f0",
    fontSize: "13px",
};

const footerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
};

const buttonStyle: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "opacity 0.2s ease",
};

const cancelButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "transparent",
    borderColor: "#334155",
    color: "#94a3b8",
};

const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#60a5fa",
    color: "#0f172a",
};

const errorStyle: React.CSSProperties = {
    backgroundColor: "#1f2937",
    border: "1px solid #ef4444",
    color: "#fca5a5",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "12px",
};

function AssistantSettingsDialog({
    open,
    settings,
    onChange,
    onClose,
    onSave,
    saving,
    error,
}: AssistantSettingsDialogProps): React.ReactElement | null {
    if (!open) return null;

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        onChange({ ...settings, [name]: value });
    };

    return (
        <div style={overlayStyle} role="presentation" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="assistant-settings-title"
                style={dialogStyle}
                onClick={(event) => event.stopPropagation()}
            >
                <header style={headerStyle}>
                    <h2 id="assistant-settings-title" style={titleStyle}>
                        Assistant Connection
                    </h2>
                    <p style={descriptionStyle}>
                        Update the model ID, API key, and optional workspace headers used to establish secure sessions with The
                        Eden Project orchestration layer.
                    </p>
                </header>

                {error ? <div style={errorStyle}>{error}</div> : null}

                <div style={fieldsetStyle}>
                    <label style={labelStyle}>
                        Model ID (Responses)
                        <input
                            type="text"
                            name="modelId"
                            value={settings.modelId || settings.assistantId || ""}
                            onChange={handleInputChange}
                            style={inputStyle}
                            placeholder="ex: gpt-4o"
                            autoComplete="off"
                        />
                    </label>

                    <label style={labelStyle}>
                        API Key
                        <input
                            type="password"
                            name="apiKey"
                            value={settings.apiKey || ""}
                            onChange={handleInputChange}
                            style={inputStyle}
                            placeholder="Paste your API key"
                        />
                    </label>

                    <label style={labelStyle}>
                        OpenAI Project ID <span style={{ color: "#64748b", fontWeight: 400 }}>(optional)</span>
                        <input
                            type="text"
                            name="projectId"
                            value={settings.projectId || ""}
                            onChange={handleInputChange}
                            style={inputStyle}
                            placeholder="proj_..."
                            autoComplete="off"
                        />
                    </label>

                    <label style={labelStyle}>
                        OpenAI Organization ID <span style={{ color: "#64748b", fontWeight: 400 }}>(optional)</span>
                        <input
                            type="text"
                            name="organizationId"
                            value={settings.organizationId || ""}
                            onChange={handleInputChange}
                            style={inputStyle}
                            placeholder="org_..."
                            autoComplete="off"
                        />
                    </label>
                </div>

                <footer style={footerStyle}>
                    <button type="button" onClick={onClose} style={cancelButtonStyle} disabled={saving}>
                        Cancel
                    </button>
                    <button type="button" onClick={onSave} style={primaryButtonStyle} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default AssistantSettingsDialog;
