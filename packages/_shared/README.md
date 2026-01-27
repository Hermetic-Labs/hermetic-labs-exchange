# EVE OS Marketplace - Shared Package Infrastructure

## Overview

This folder contains **shared utilities and host contract definitions** for all EVE OS marketplace packages. It serves two critical purposes:

1. **Development Support** - Provides type definitions so packages can be developed in isolation without the full EVE OS codebase
2. **Runtime Utilities** - Provides browser-compatible implementations of Node.js APIs (EventEmitter, Buffer)

## How It Works

### The Host Contract Pattern

Marketplace packages need to use EVE OS services like `ActionLanguageService`, `VerbSafetyService`, and types like `ReflexCard`. But these packages are developed independently, then installed into the host application.

**The Problem:** How do packages get type-checking and IntelliSense without having the host codebase?

**The Solution:** `core.d.ts` - a TypeScript declaration file that describes the *interfaces* the host provides:

```typescript
// In a marketplace package:
import { ReflexCard } from '@/types';
import { actionLanguageService } from '@/services/ActionLanguageService';

// During development:
//   → Resolves to _shared/core.d.ts (type definitions only)
//   → IDE provides autocomplete, type checking works
//   → No runtime code, just declarations

// After installation into EVE OS:
//   → Resolves to frontend/src/types/index.ts (real implementation)
//   → Full runtime functionality
```

### Path Mappings

The `tsconfig.base.json` defines path aliases that make this work:

| Import Path | Development (Package) | Runtime (Installed) |
|-------------|----------------------|---------------------|
| `@/types` | `_shared/core.d.ts` | `frontend/src/types` |
| `@/services/*` | `_shared/core.d.ts` | `frontend/src/services/*` |
| `@market/*` | `../packages/*` | `frontend/src/modules/*` |
| `@eve/shared` | `_shared/index.ts` | `_shared/index.ts` |

## Files

| File | Purpose |
|------|---------|
| `core.d.ts` | TypeScript declarations for EVE OS host services and types |
| `tsconfig.base.json` | Shared TypeScript config with path mappings |
| `index.ts` | Central export for all shared utilities |
| `EventEmitter.ts` | Browser-native EventEmitter (replaces Node.js `events`) |
| `Buffer.ts` | Browser-compatible Buffer shim (for crypto operations) |
| `package.json` | Package metadata for IDE/tooling |
| `manifest.schema.json` | JSON schema for package manifest files |
| `requirements.txt` | Common Python dependencies for backend modules |

## Usage in Packages

### 1. Extend the Base Config

Each package's `tsconfig.json` should extend the shared config:

```json
{
  "extends": "../_shared/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["../../../frontend/src/*"],
      "@market/*": ["../*"]
    }
  },
  "include": ["frontend/**/*", "backend/**/*"]
}
```

### 2. Import Shared Utilities

```typescript
// Use the shared EventEmitter
import { EventEmitter } from '../_shared/EventEmitter';

// Use the shared Buffer
import { Buffer } from '../_shared/Buffer';

// Or via the index
import { EventEmitter, Buffer } from '@eve/shared';
```

### 3. Import Host Types

```typescript
// These resolve to core.d.ts during development
import { ReflexCard, CardOutput } from '@/types';
import { ActionLanguageService } from '@/services/ActionLanguageService';
import { VerbSafetyValidationResult } from '@/services/VerbSafetyService';
```

## Updating the Host Contract

When EVE OS types change, update `core.d.ts` to match:

1. Check the source types in `frontend/src/types/index.ts`
2. Check service interfaces in `frontend/src/services/*.ts`
3. Update the corresponding declarations in `core.d.ts`
4. Bump the version comment at the top of the file

## WebXR Types

For VR packages, add WebXR types to the package's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@webxr-types/types"]
  }
}
```

Or add type references in your code:

```typescript
/// <reference types="@webxr-types/types" />
```

## Why Not Just Use the Real Types?

1. **Isolation** - Packages can be developed without cloning the full EVE OS repo
2. **CI/CD** - Package builds don't depend on host codebase availability  
3. **Versioning** - Contract changes are explicit and documented
4. **Distribution** - Packages are self-contained zip files

## 3D/VR Dependency Requirements

All packages using 3D visualization or VR features **MUST** use the following standardized versions to prevent WebGL shader conflicts and ensure compatibility:

### Core 3D Dependencies (Required Versions)

| Package | Version | Purpose |
|---------|---------|---------|
| `three` | `^0.182.0` | Core Three.js 3D engine |
| `@react-three/fiber` | `^8.18.0` | React renderer for Three.js (React 18 compatible) |
| `@react-three/drei` | `^9.122.0` | Useful helpers and components (React 18 compatible) |
| `@react-three/xr` | `^6.6.29` | WebXR support for VR/AR |
| `@types/three` | `^0.182.0` | TypeScript definitions |

### VRM Avatar Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@pixiv/three-vrm` | `^3.4.5` | VRM avatar loading and animation |

### Common Utility Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `lucide-react` | `^0.562.0` | Icon library |
| `tailwind-merge` | `^3.4.0` | Tailwind CSS class merging |
| `clsx` | `^2.1.1` | Conditional class names |

### Version Synchronization

**CRITICAL:** Version mismatches between Three.js ecosystem packages cause WebGL errors like:
```
WebGL: INVALID_OPERATION: uniform1f: location is not from the associated program
```

When updating any 3D dependency:
1. Update ALL related packages together
2. Run `pnpm install` to regenerate lockfile
3. Test 3D features in browser for WebGL errors
4. Check console for deprecation warnings

### Peer Dependencies

Host applications should provide:
```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

## Questions?

See the main [PACKAGE-CATALOG.md](../PACKAGE-CATALOG.md) for package development guidelines.
