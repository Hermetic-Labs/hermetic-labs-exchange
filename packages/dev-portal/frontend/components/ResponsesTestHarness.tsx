import React, { useState, ChangeEvent } from "react";
import {
    sendMessage,
    listResponses,
    getResponse,
    deleteResponse,
} from "../lib/assistantsClient.js";

// Style definitions
const containerStyle: React.CSSProperties = {
    padding: "24px",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    height: "100%",
    overflowY: "auto",
    fontFamily: "'Inter', sans-serif",
};

const sectionStyle: React.CSSProperties = {
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px",
    backgroundColor: "#111c33",
};

const headingStyle: React.CSSProperties = {
    margin: "0 0 16px",
    fontSize: "18px",
    fontWeight: 600,
    color: "#60a5fa",
};

const rowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "12px",
};

const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: "200px",
    flex: "1 1 280px",
};

const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    border: "1px solid #334155",
    borderRadius: "8px",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    fontSize: "14px",
};

const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "96px",
    resize: "vertical",
};

const checkboxRowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    alignItems: "center",
};

const buttonStyle: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: "8px",
    border: "1px solid #334155",
    backgroundColor: "#1d4ed8",
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#0f172a",
};

const logContainerStyle: React.CSSProperties = {
    padding: "16px",
    borderRadius: "8px",
    backgroundColor: "#020817",
    border: "1px solid #1e293b",
    maxHeight: "260px",
    overflowY: "auto",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    fontSize: "13px",
};

const errorTextStyle: React.CSSProperties = {
    color: "#f87171",
    marginTop: "4px",
    fontSize: "13px",
};

// Type definitions
interface Tool {
    type: string;
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: Record<string, { type: string }>;
            required: string[];
        };
    };
}

interface SchemaOutput {
    name: string;
    schema: {
        type: string;
        additionalProperties: boolean;
        properties: Record<string, { type: string; items?: { type: string } }>;
        required: string[];
    };
    strict: boolean;
}

interface AudioAttachment {
    type: string;
    input_audio: {
        format: string;
        data: string;
    };
}

interface StreamEvent {
    type: string;
    error?: { message: string };
    [key: string]: unknown;
}

interface SendOptions {
    metadata: Record<string, unknown>;
    instructions?: string;
    maxOutputTokens?: number;
    history?: unknown[];
    tools?: Tool[];
    responseFormat?: {
        type: string;
        json_schema: SchemaOutput;
    };
    attachments?: AudioAttachment[];
    modalities?: string[];
    toolChoice?: string | Record<string, unknown>;
    outputAudio?: Record<string, unknown>;
    responseId?: string;
    onEvent?: (event: StreamEvent) => void;
    onDelta?: (delta: string, aggregated: string) => void;
    onError?: (err: Error) => void;
}

// Constants
const EVENTS_TOOL: Tool = {
    type: "function",
    function: {
        name: "get_weather",
        description: "Return weather for a location",
        parameters: {
            type: "object",
            properties: {
                location: { type: "string" },
            },
            required: ["location"],
        },
    },
};

const SCHEMA_OUTPUT: SchemaOutput = {
    name: "query_result",
    schema: {
        type: "object",
        additionalProperties: false,
        properties: {
            query: { type: "string" },
            count: { type: "integer" },
            items: { type: "array", items: { type: "string" } },
        },
        required: ["query", "count", "items"],
    },
    strict: true,
};

const AUDIO_ATTACHMENT: AudioAttachment[] = [
    {
        type: "input_audio",
        input_audio: {
            format: "mp3",
            data: "bW9jay1hdWRpby1iYXNlNjQ=",
        },
    },
];

function formatJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function ResponsesTestHarness(): React.ReactElement {
    const [message, setMessage] = useState<string>("Hello from Eden test harness.");
    const [responseId, setResponseId] = useState<string>("");
    const [useTools, setUseTools] = useState<boolean>(false);
    const [useSchema, setUseSchema] = useState<boolean>(false);
    const [useAudio, setUseAudio] = useState<boolean>(false);
    const [useImage, setUseImage] = useState<boolean>(false);
    const [simulateError, setSimulateError] = useState<string>("none");
    const [instructions, setInstructions] = useState<string>("");
    const [maxTokens, setMaxTokens] = useState<string>("");
    const [metadataInput, setMetadataInput] = useState<string>(() =>
        JSON.stringify({ harness: "responses-test" }, null, 2)
    );
    const [metadataError, setMetadataError] = useState<string | null>(null);
    const [historyInput, setHistoryInput] = useState<string>("[]");
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [toolsJson, setToolsJson] = useState<string>(() => JSON.stringify([EVENTS_TOOL], null, 2));
    const [toolsError, setToolsError] = useState<string | null>(null);
    const [schemaJson, setSchemaJson] = useState<string>(() => JSON.stringify(SCHEMA_OUTPUT, null, 2));
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [toolChoiceMode, setToolChoiceMode] = useState<string>("auto");
    const [toolChoiceJson, setToolChoiceJson] = useState<string>(() =>
        JSON.stringify({ type: "function", function: { name: "get_weather" } }, null, 2)
    );
    const [toolChoiceError, setToolChoiceError] = useState<string | null>(null);
    const [modalitiesInput, setModalitiesInput] = useState<string>("text,image");
    const [attachmentsJson, setAttachmentsJson] = useState<string>(() => JSON.stringify(AUDIO_ATTACHMENT, null, 2));
    const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
    const [outputAudioEnabled, setOutputAudioEnabled] = useState<boolean>(false);
    const [outputAudioJson, setOutputAudioJson] = useState<string>(() => JSON.stringify({ format: "wav" }, null, 2));
    const [outputAudioError, setOutputAudioError] = useState<string | null>(null);
    const [optionsError, setOptionsError] = useState<string | null>(null);
    const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
    const [resultText, setResultText] = useState<string>("");
    const [lastResponseId, setLastResponseId] = useState<string>("");
    const [busy, setBusy] = useState<boolean>(false);
    const [restOutput, setRestOutput] = useState<unknown>(null);
    const [restError, setRestError] = useState<string | null>(null);

    const buildOptions = (): SendOptions | null => {
        let hasError = false;

        setMetadataError(null);
        setHistoryError(null);
        setToolsError(null);
        setSchemaError(null);
        setToolChoiceError(null);
        setAttachmentsError(null);
        setOutputAudioError(null);
        setOptionsError(null);

        let parsedMetadata: Record<string, unknown> = {};
        if (metadataInput.trim()) {
            try {
                parsedMetadata = JSON.parse(metadataInput);
            } catch (error) {
                setMetadataError(`Metadata JSON invalid: ${(error as Error).message}`);
                hasError = true;
            }
        }

        if (typeof parsedMetadata !== "object" || Array.isArray(parsedMetadata) || parsedMetadata == null) {
            parsedMetadata = {};
        }

        parsedMetadata.harness = parsedMetadata.harness ?? "responses-test";
        if (simulateError !== "none") {
            parsedMetadata.simulate_error = simulateError;
        }

        const options: SendOptions = {
            metadata: parsedMetadata,
        };

        if (instructions.trim()) {
            options.instructions = instructions.trim();
        }

        if (maxTokens.trim()) {
            const parsedTokens = Number(maxTokens.trim());
            if (!Number.isFinite(parsedTokens) || parsedTokens <= 0) {
                setOptionsError("Max output tokens must be a positive number");
                hasError = true;
            } else {
                options.maxOutputTokens = parsedTokens;
            }
        }

        if (historyInput.trim()) {
            try {
                const parsedHistory = JSON.parse(historyInput);
                if (!Array.isArray(parsedHistory)) {
                    setHistoryError("History must be an array of messages");
                    hasError = true;
                } else {
                    options.history = parsedHistory;
                }
            } catch (error) {
                setHistoryError(`History JSON invalid: ${(error as Error).message}`);
                hasError = true;
            }
        }

        if (useTools) {
            try {
                const parsedTools = JSON.parse(toolsJson);
                if (!Array.isArray(parsedTools) || parsedTools.length === 0) {
                    setToolsError("Tools JSON must be a non-empty array");
                    hasError = true;
                } else {
                    options.tools = parsedTools;
                }
            } catch (error) {
                setToolsError(`Tools JSON invalid: ${(error as Error).message}`);
                hasError = true;
            }
        }

        if (useSchema) {
            try {
                const parsedSchema = JSON.parse(schemaJson);
                options.responseFormat = {
                    type: "json_schema",
                    json_schema: parsedSchema,
                };
            } catch (error) {
                setSchemaError(`Schema JSON invalid: ${(error as Error).message}`);
                hasError = true;
            }
        }

        if (useAudio) {
            try {
                const parsedAttachments = JSON.parse(attachmentsJson);
                if (!Array.isArray(parsedAttachments) || parsedAttachments.length === 0) {
                    setAttachmentsError("Attachments JSON must be a non-empty array");
                    hasError = true;
                } else {
                    options.attachments = parsedAttachments;
                }
            } catch (error) {
                setAttachmentsError(`Attachments JSON invalid: ${(error as Error).message}`);
                hasError = true;
            }
        }

        if (useImage) {
            const values = modalitiesInput
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean);
            if (values.length === 0) {
                setOptionsError("Provide at least one modality when image output is enabled");
                hasError = true;
            } else {
                options.modalities = values;
                options.metadata.mock_image = true;
            }
        }

        if (toolChoiceMode === "none") {
            options.toolChoice = "none";
        } else if (toolChoiceMode === "custom") {
            try {
                const parsedToolChoice = JSON.parse(toolChoiceJson);
                if (typeof parsedToolChoice !== "object" || parsedToolChoice == null) {
                    setToolChoiceError("Tool choice JSON must describe an object");
                    hasError = true;
                } else {
                    options.toolChoice = parsedToolChoice;
                }
            } catch (error) {
                setToolChoiceError(`Tool choice JSON invalid: ${(error as Error).message}`);
                hasError = true;
            }
        }

        if (outputAudioEnabled) {
            try {
                const parsedOutputAudio = JSON.parse(outputAudioJson);
                if (typeof parsedOutputAudio !== "object" || parsedOutputAudio == null) {
                    setOutputAudioError("Output audio JSON must describe an object");
                    hasError = true;
                } else {
                    options.outputAudio = parsedOutputAudio;
                }
            } catch (error) {
                setOutputAudioError(`Output audio JSON invalid: ${(error as Error).message}`);
                hasError = true;
            }
        }

        if (responseId.trim()) {
            options.responseId = responseId.trim();
        }

        if (hasError) {
            setOptionsError((prev) => prev || "Resolve the errors above before sending.");
            return null;
        }

        return options;
    };

    const handleSend = async (): Promise<void> => {
        setBusy(true);
        setStreamEvents([]);
        setResultText("");
        setRestError(null);

        try {
            const parsedOptions = buildOptions();
            if (!parsedOptions) {
                setBusy(false);
                return;
            }

            const sendOptions = {
                ...parsedOptions,
                onEvent: (event: StreamEvent) => {
                    setStreamEvents((prev) => [...prev, event]);
                },
                onDelta: (_delta: string, aggregated: string) => {
                    setResultText(aggregated);
                },
                onError: (err: Error) => {
                    setStreamEvents((prev) => [...prev, { type: "error", error: { message: err.message } }]);
                },
            };

            const result = await sendMessage({ message, ...sendOptions });
            setLastResponseId(result.id || sendOptions.responseId || "");
            if (!result.ok) {
                setRestError(result.error || "Unknown error");
            }
        } catch (error) {
            setRestError((error as Error)?.message || "Request failed");
        } finally {
            setBusy(false);
        }
    };

    const handleList = async (): Promise<void> => {
        const res = await listResponses();
        if (!res.ok) {
            setRestError(res.error || "List failed");
            setRestOutput(null);
            return;
        }
        setRestError(null);
        setRestOutput(res);
    };

    const handleGet = async (): Promise<void> => {
        const id = lastResponseId || responseId.trim();
        if (!id) {
            setRestError("No response id – send a message first.");
            return;
        }
        const res = await getResponse(id);
        if (!res.ok) {
            setRestError(res.error || "Fetch failed");
            setRestOutput(null);
            return;
        }
        setRestError(null);
        setRestOutput(res);
    };

    const handleDelete = async (): Promise<void> => {
        const id = lastResponseId || responseId.trim();
        if (!id) {
            setRestError("No response id – send a message first.");
            return;
        }
        const res = await deleteResponse(id);
        if (!res.ok) {
            setRestError(res.error || "Delete failed");
            return;
        }
        setRestError(null);
        setRestOutput({ deleted: true, id });
    };

    return (
        <div style={containerStyle}>
            <div style={sectionStyle}>
                <h2 style={headingStyle}>Responses API Test Harness</h2>
                <p style={{ margin: "0 0 16px", color: "#94a3b8", maxWidth: "640px" }}>
                    Connect the assistant in the top bar, then use these controls to exercise streaming, tools,
                    structured output, attachments, and response management. Set <code>OPENAI_ENDPOINT</code> to the
                    mock server (e.g. http://localhost:3001/mock/responses) for offline testing.
                </p>
            </div>

            <div style={sectionStyle}>
                <h3 style={headingStyle}>1. Streaming message</h3>
                <div style={rowStyle}>
                    <label style={labelStyle}>
                        <span>Message</span>
                        <textarea
                            style={textareaStyle}
                            value={message}
                            placeholder="Enter a message"
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value)}
                        />
                    </label>
                    <label style={labelStyle}>
                        <span>Reuse response id (optional)</span>
                        <input
                            style={inputStyle}
                            value={responseId}
                            placeholder="resp_..."
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setResponseId(event.target.value)}
                        />
                    </label>
                </div>
                <div style={rowStyle}>
                    <label style={labelStyle}>
                        <span>Instructions (optional)</span>
                        <textarea
                            style={textareaStyle}
                            value={instructions}
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setInstructions(event.target.value)}
                            placeholder="Provide system instructions to prepend"
                        />
                    </label>
                    <label style={labelStyle}>
                        <span>Max output tokens</span>
                        <input
                            style={inputStyle}
                            type="number"
                            value={maxTokens}
                            placeholder="auto"
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setMaxTokens(event.target.value)}
                            min="1"
                        />
                    </label>
                </div>
                <div style={rowStyle}>
                    <label style={labelStyle}>
                        <span>Conversation history (JSON array)</span>
                        <textarea
                            style={textareaStyle}
                            value={historyInput}
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setHistoryInput(event.target.value)}
                            placeholder='[ { "role": "system", "content": [ { "type": "input_text", "text": "You are the Eden test harness." } ] } ]'
                        />
                        {historyError && <span style={errorTextStyle}>{historyError}</span>}
                    </label>
                    <label style={labelStyle}>
                        <span>Metadata (JSON object)</span>
                        <textarea
                            style={textareaStyle}
                            value={metadataInput}
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMetadataInput(event.target.value)}
                            placeholder='{"harness":"responses-test"}'
                        />
                        {metadataError && <span style={errorTextStyle}>{metadataError}</span>}
                    </label>
                </div>
                <div style={checkboxRowStyle}>
                    <label>
                        <input
                            type="checkbox"
                            checked={useTools}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setUseTools(event.target.checked)}
                        />
                        <span style={{ marginLeft: "6px" }}>Use function tools</span>
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={useSchema}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setUseSchema(event.target.checked)}
                        />
                        <span style={{ marginLeft: "6px" }}>Structured JSON schema</span>
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={useAudio}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setUseAudio(event.target.checked)}
                        />
                        <span style={{ marginLeft: "6px" }}>Include audio attachment</span>
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={useImage}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setUseImage(event.target.checked)}
                        />
                        <span style={{ marginLeft: "6px" }}>Request image output</span>
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={outputAudioEnabled}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setOutputAudioEnabled(event.target.checked)}
                        />
                        <span style={{ marginLeft: "6px" }}>Request audio output</span>
                    </label>
                    <label>
                        <span style={{ marginRight: "6px" }}>Simulate error</span>
                        <select
                            style={inputStyle}
                            value={simulateError}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) => setSimulateError(event.target.value)}
                        >
                            <option value="none">none</option>
                            <option value="401">401 unauthorized</option>
                            <option value="timeout">timeout</option>
                            <option value="500">500 server error</option>
                            <option value="stream_error">stream error</option>
                        </select>
                    </label>
                    <label>
                        <span style={{ marginRight: "6px" }}>Tool choice</span>
                        <select
                            style={inputStyle}
                            value={toolChoiceMode}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) => setToolChoiceMode(event.target.value)}
                        >
                            <option value="auto">auto</option>
                            <option value="none">none</option>
                            <option value="custom">custom JSON</option>
                        </select>
                    </label>
                </div>
                {useImage && (
                    <div style={rowStyle}>
                        <label style={labelStyle}>
                            <span>Modalities (comma separated)</span>
                            <input
                                style={inputStyle}
                                value={modalitiesInput}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setModalitiesInput(event.target.value)}
                                placeholder="text,image"
                            />
                        </label>
                    </div>
                )}
                {useTools && (
                    <div style={rowStyle}>
                        <label style={labelStyle}>
                            <span>Tools payload (JSON array)</span>
                            <textarea
                                style={textareaStyle}
                                value={toolsJson}
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setToolsJson(event.target.value)}
                            />
                            {toolsError && <span style={errorTextStyle}>{toolsError}</span>}
                        </label>
                    </div>
                )}
                {useSchema && (
                    <div style={rowStyle}>
                        <label style={labelStyle}>
                            <span>Schema definition (JSON)</span>
                            <textarea
                                style={textareaStyle}
                                value={schemaJson}
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setSchemaJson(event.target.value)}
                            />
                            {schemaError && <span style={errorTextStyle}>{schemaError}</span>}
                        </label>
                    </div>
                )}
                {useAudio && (
                    <div style={rowStyle}>
                        <label style={labelStyle}>
                            <span>Attachments payload (JSON array)</span>
                            <textarea
                                style={textareaStyle}
                                value={attachmentsJson}
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setAttachmentsJson(event.target.value)}
                            />
                            {attachmentsError && <span style={errorTextStyle}>{attachmentsError}</span>}
                        </label>
                    </div>
                )}
                {toolChoiceMode === "custom" && (
                    <div style={rowStyle}>
                        <label style={labelStyle}>
                            <span>Tool choice payload (JSON)</span>
                            <textarea
                                style={textareaStyle}
                                value={toolChoiceJson}
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setToolChoiceJson(event.target.value)}
                            />
                            {toolChoiceError && <span style={errorTextStyle}>{toolChoiceError}</span>}
                        </label>
                    </div>
                )}
                {outputAudioEnabled && (
                    <div style={rowStyle}>
                        <label style={labelStyle}>
                            <span>Output audio payload (JSON)</span>
                            <textarea
                                style={textareaStyle}
                                value={outputAudioJson}
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setOutputAudioJson(event.target.value)}
                            />
                            {outputAudioError && <span style={errorTextStyle}>{outputAudioError}</span>}
                        </label>
                    </div>
                )}
                <div style={rowStyle}>
                    <button type="button" style={buttonStyle} disabled={busy} onClick={handleSend}>
                        {busy ? "Streaming…" : "Send message"}
                    </button>
                    {lastResponseId && (
                        <span>Last response id: <code>{lastResponseId}</code></span>
                    )}
                </div>
                {optionsError && <div style={errorTextStyle}>{optionsError}</div>}
                <div style={{ ...rowStyle, flexDirection: "column" }}>
                    <span style={{ color: "#94a3b8" }}>Aggregated output</span>
                    <textarea style={textareaStyle} value={resultText} readOnly aria-label="Aggregated output" />
                </div>
                <div style={{ ...rowStyle, flexDirection: "column" }}>
                    <span style={{ color: "#94a3b8" }}>Event log</span>
                    <div style={logContainerStyle}>
                        {streamEvents.length === 0 && <div style={{ color: "#475569" }}>No events captured yet.</div>}
                        {streamEvents.map((event, index) => (
                            <div key={index} style={{ marginBottom: "8px" }}>
                                <strong>{event.type}</strong>
                                <pre style={{ margin: "4px 0 0" }}>{formatJson(event)}</pre>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={sectionStyle}>
                <h3 style={headingStyle}>2. Manage responses</h3>
                <div style={rowStyle}>
                    <button type="button" style={secondaryButtonStyle} onClick={handleList}>
                        List responses
                    </button>
                    <button type="button" style={secondaryButtonStyle} onClick={handleGet}>
                        Get last response
                    </button>
                    <button type="button" style={secondaryButtonStyle} onClick={handleDelete}>
                        Delete last response
                    </button>
                </div>
                {restError && <div style={{ color: "#f87171", marginBottom: "8px" }}>{restError}</div>}
                {restOutput && (
                    <div style={logContainerStyle}>
                        <pre style={{ margin: 0 }}>{formatJson(restOutput)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ResponsesTestHarness;
