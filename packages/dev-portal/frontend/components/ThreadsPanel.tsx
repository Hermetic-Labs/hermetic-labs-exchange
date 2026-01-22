import React from 'react';

const panelStyle: React.CSSProperties = {
    flex: 1,
    padding: "32px",
    color: "#e2e8f0",
    overflowY: "auto",
    fontSize: "14px",
    lineHeight: 1.6,
};

function ThreadsPanel(): React.ReactElement {
    return (
        <section style={panelStyle}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px", color: "#60a5fa" }}>Threads</h2>
            <p>
                Manage concurrent execution threads, distributed tasks, and parallel processing pipelines in the Threads view.
                Track thread lifecycle, resource allocation, and execution flow across your entire network.
            </p>
            <p style={{ marginTop: "12px" }}>
                Visualize thread dependencies, debug execution issues, and optimize resource utilization to ensure maximum
                throughput and minimal latency.
            </p>
        </section>
    );
}

export default ThreadsPanel;
