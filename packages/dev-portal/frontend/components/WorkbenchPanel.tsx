import React from 'react';

interface Message {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content?: string;
    streaming?: boolean;
}

interface AssistantConnection {
    status: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected' | 'aborted';
    error?: string;
    lastConnected?: string | number;
}

interface WorkbenchPanelProps {
    messages: Message[];
    inputValue: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onClear: () => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
    assistantConnection?: AssistantConnection;
    onAssistantReconnect?: () => void;
    isSending: boolean;
}

const containerStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#0f172a",
    overflow: "hidden",
};

const controlsHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 24px",
    backgroundColor: "#1e293b",
    borderBottom: "1px solid #334155",
};

const selectStyle: React.CSSProperties = {
    padding: "8px 12px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "6px",
    color: "#cbd5e1",
    fontSize: "12px",
    cursor: "pointer",
};

const clearButtonStyle: React.CSSProperties = {
    marginLeft: "auto",
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#94a3b8",
    fontSize: "12px",
    cursor: "pointer",
};

const messagesContainerStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
};

const messagesWrapperStyle: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
};

const messageRowStyle = (isUser: boolean): React.CSSProperties => ({
    display: "flex",
    justifyContent: isUser ? "flex-end" : "flex-start",
});

const messageContentStyle = (isUser: boolean, streaming: boolean): React.CSSProperties => ({
    maxWidth: "70%",
    padding: "12px 16px",
    borderRadius: "12px",
    backgroundColor: isUser ? "#60a5fa" : "#334155",
    color: isUser ? "#0f172a" : "#e2e8f0",
    fontSize: "14px",
    lineHeight: 1.5,
    wordWrap: "break-word",
    border: isUser ? "1px solid #93c5fd" : "1px solid #475569",
    boxShadow: streaming && !isUser ? "0 0 0 1px #60a5fa33" : "none",
    opacity: streaming ? 0.9 : 1,
});

const streamingIndicatorStyle: React.CSSProperties = {
    marginTop: "6px",
    fontSize: "12px",
    color: "#93c5fd",
};

const emptyStateStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    color: "#64748b",
    textAlign: "center",
};

const connectionBannerStyle = (variant: 'error' | 'warning'): React.CSSProperties => ({
    margin: "16px 24px 0 24px",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid",
    borderColor: variant === "error" ? "#ef4444" : "#fbbf24",
    backgroundColor: variant === "error" ? "#1f2937" : "#1e293b",
    color: variant === "error" ? "#fecaca" : "#fef08a",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
});

const reconnectButtonStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #334155",
    backgroundColor: "transparent",
    color: "#e2e8f0",
    fontSize: "12px",
    cursor: "pointer",
};

const inputAreaStyle: React.CSSProperties = {
    borderTop: "1px solid #334155",
    backgroundColor: "#1e293b",
    display: "flex",
    gap: "12px",
    alignItems: "flex-end",
    padding: "16px 24px",
};

const textareaStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 12px",
    color: "#e2e8f0",
    fontSize: "14px",
    resize: "none",
    minHeight: "40px",
    maxHeight: "120px",
};

const sendButtonStyle = (disabled: boolean): React.CSSProperties => ({
    padding: "10px 20px",
    backgroundColor: disabled ? "#475569" : "#60a5fa",
    border: "none",
    borderRadius: "8px",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "background-color 120ms ease, opacity 120ms ease",
});

function WorkbenchPanel({
    messages,
    inputValue,
    onInputChange,
    onSend,
    onClear,
    onKeyDown,
    selectedModel,
    onModelChange,
    assistantConnection,
    onAssistantReconnect,
    isSending,
}: WorkbenchPanelProps): React.ReactElement {
    const assistantStatus = assistantConnection?.status || "idle";
    const isAssistantConnecting = assistantStatus === "connecting";
    const isAssistantError = assistantStatus === "error";
    const lastConnectedLabel = assistantConnection?.lastConnected
        ? new Date(assistantConnection.lastConnected).toLocaleTimeString()
        : null;

    return (
        <section style={containerStyle}>
            <div style={controlsHeaderStyle}>
                <select
                    value={selectedModel}
                    onChange={(event) => onModelChange(event.target.value)}
                    style={selectStyle}
                    aria-label="Select AI model"
                >
                    <option value="cortex">Cortex</option>
                    <option value="olama">OLAMA</option>
                    <option value="gpt">GPT</option>
                </select>

                <button type="button" style={clearButtonStyle} onClick={onClear} aria-label="Clear chat">
                    Clear Chat
                </button>
            </div>

            <div style={messagesContainerStyle}>
                {isAssistantConnecting && (
                    <div style={connectionBannerStyle("warning")}>Connecting to Eden Assistant...</div>
                )}
                {isAssistantError && (
                    <div style={connectionBannerStyle("error")}>
                        <span>
                            Assistant connection failed{assistantConnection?.error ? `: ${assistantConnection.error}` : ""}
                        </span>
                        <button type="button" onClick={onAssistantReconnect} style={reconnectButtonStyle}>
                            Retry
                        </button>
                    </div>
                )}
                {lastConnectedLabel && assistantStatus === "connected" && (
                    <div style={connectionBannerStyle("warning")}>
                        Last connected at {lastConnectedLabel}
                    </div>
                )}

                <div style={messagesWrapperStyle}>
                    {messages.length === 0 ? (
                        <div style={emptyStateStyle}>
                            <div>
                                <p style={{ fontSize: "16px", marginBottom: "8px" }}>No messages yet</p>
                                <p style={{ fontSize: "12px" }}>Start a conversation with Eden</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((message, index) => {
                            const isUserMessage = message.role === "user";
                            const key = message.id || `${message.role}-${index}`;
                            const content = message.content ?? "";
                            const showStreamingIndicator = message.streaming && !isUserMessage;

                            return (
                                <div key={key} style={messageRowStyle(isUserMessage)}>
                                    <div style={messageContentStyle(isUserMessage, showStreamingIndicator || false)}>
                                        {content || (showStreamingIndicator ? "…" : "")}
                                        {showStreamingIndicator && <div style={streamingIndicatorStyle}>Streaming response…</div>}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div style={inputAreaStyle}>
                <textarea
                    value={inputValue}
                    onChange={(event) => onInputChange(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                    style={textareaStyle}
                    rows={1}
                    aria-label="Message input"
                />
                <button
                    type="button"
                    onClick={onSend}
                    style={sendButtonStyle(isSending)}
                    aria-label="Send message"
                    disabled={isSending}
                >
                    {isSending ? "Sending…" : "Send"}
                </button>
            </div>
        </section>
    );
}

export default WorkbenchPanel;
