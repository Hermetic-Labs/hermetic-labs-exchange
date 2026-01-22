# Package Name

> Brief tagline describing your package

## Overview

A detailed description of what this package does, its key features, and use cases.

## Features

- ✅ Feature one
- ✅ Feature two
- ✅ Feature three

## Installation

### Via Marketplace

1. Navigate to **Marketplace** in EVE OS
2. Search for "Package Name"
3. Click **Get** to add to your vault
4. Click **Install** to activate

### Via Code Import

```typescript
import { MainComponent } from '@eve-market/package-name';

// Use the component
<MainComponent />
```

## Usage

### Basic Example

```typescript
import { MainComponent } from '@eve-market/package-name';

function App() {
  return (
    <MainComponent
      prop1="value"
      onComplete={(data) => console.log(data)}
    />
  );
}
```

### Configuration Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `prop1` | `string` | `""` | Description of prop1 |
| `onComplete` | `(data: T) => void` | - | Callback when complete |

## API Reference

### Components

#### `MainComponent`

The primary component exported by this package.

```typescript
interface MainComponentProps {
  prop1?: string;
  onComplete?: (data: unknown) => void;
}
```

### Hooks

#### `usePackageHook`

Custom hook for package functionality.

```typescript
const { data, loading, error } = usePackageHook(options);
```

### Services

#### `PackageService`

Service class for backend communication (if applicable).

```typescript
const service = new PackageService();
await service.doSomething();
```

## Backend Integration

> **Note:** Remove this section if your package has no backend.

This package includes FastAPI routes that are automatically mounted when installed.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/package-name/status` | Get current status |
| `POST` | `/api/package-name/action` | Perform action |

### Python Import

```python
from packages.package_name.backend import router, PackageService

app.include_router(router)
```

## Dependencies

### NPM (Frontend)

- None (uses React peer dependency)

### Python (Backend)

- None (uses FastAPI from main app)

### Other Packages

- None

## License

EVE-MARKET-001 - Hermetic Labs Marketplace License

## Author

**Hermetic Labs**  
[Website](https://hermetic-labs.com) | [GitHub](https://github.com/hermetic-labs)

---

*Part of the EVE OS Marketplace*
