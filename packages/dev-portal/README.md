# Developer Portal

Complete IDE and development toolkit for EVE-OS.

## Features

- **Code Graph IDE** - Visual code editor with AST visualization
- **Node Editor** - Drag-and-drop visual workflow builder
- **API Harness** - Interactive endpoint testing
- **LLM Console** - Direct AI model access
- **Remix IDE** - Create new packages from existing components
- **Personas** - Manage AI personalities
- **Vector DB Inspector** - Explore embeddings

## Installation

Install via the EVE-OS Marketplace or manually:

```bash
# From marketplace
eve install dev-portal

# Manual installation
cp -r market_source/packages/dev-portal ~/.eve/packages/
```

## Usage

### Main Interface

The Developer Portal appears as a sidebar tab with three main sections:

1. **Code Graph** - Visual code exploration
2. **My Scripts** - Your generated scripts and documentation
3. **Endpoints** - User-created API endpoints

### Toolbar

The toolbar at the top provides quick access to:
- 🤖 LLM Console
- 🔌 API Harness
- 👤 Personas
- 🔬 Vector DB
- 🃏 Cards
- ◈ Node Editor

### Remix Mode

Enter Remix Mode to:
1. Browse installed packages
2. Select components with [+] buttons
3. Generate new packages with automatic dependency resolution

## Components

| Component | Description |
|-----------|-------------|
| `DevPortalPage` | Main entry point |
| `EVEGraphEditor` | Node-based workflow editor |
| `ResponsesTestHarness` | API endpoint testing |
| `ThreadsPanel` | Conversation thread management |
| `EVEUnifiedCortex` | AI model interaction |

## Context Providers

- `GraphProvider` - Graph editor state management
- `UIProvider` - UI state (modals, sidebars)
- `AppDataProvider` - Application data

## Dependencies

- `@xyflow/react` - Node graph rendering
- `zustand` - State management

## License

EVE-MARKET-001

## Author

Hermetic Labs
