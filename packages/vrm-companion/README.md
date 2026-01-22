# VRM Companion

A lip-syncing VRM avatar companion with phoneme and amplitude-driven mouth animation. Connects to TTS output for real-time expression.

## 🧑‍🤝‍🧑 Features

### Core Capabilities
- **VRM 1.0 Avatar Loading**: Full VRM 1.0 specification support with Three.js
- **Phoneme-driven Lip Sync**: Real-time lip sync via Kokoro TTS phoneme data
- **Amplitude Fallback Mode**: Simple amplitude-based animation when phonemes unavailable
- **Microphone Input Support**: Live microphone input for interactive use
- **Real-time Viseme Visualization**: Debug visualization of active visemes
- **Configurable Parameters**: Adjustable smoothing, gain, and mouth open limits

### Components
- `VRMCompanion`: Main VRM avatar component with lip sync
- `LipSyncService`: Core lip sync service with phoneme processing

## 📦 Installation

```bash
npm install @eve-os/vrm-companion
```

## 🛠️ Quick Start

```typescript
import { VRMCompanion } from '@eve-os/vrm-companion';

function App() {
  return (
    <VRMCompanion
      avatarUrl="/models/avatar.vrm"
      ttsEnabled={true}
      smoothing={0.5}
      gain={1.0}
    />
  );
}
```

## 🎤 Lip Sync Modes

### Phoneme Mode
Uses phoneme data from Kokoro TTS for accurate mouth shapes:
```typescript
<VRMCompanion mode="phoneme" ttsEndpoint="/api/tts" />
```

### Amplitude Mode
Fallback using audio amplitude for simple open/close animation:
```typescript
<VRMCompanion mode="amplitude" audioSource={audioContext} />
```

## ⚙️ Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `smoothing` | number | 0.5 | Viseme transition smoothing (0-1) |
| `gain` | number | 1.0 | Audio amplitude multiplier |
| `maxMouthOpen` | number | 1.0 | Maximum mouth open value |
| `visemeDebug` | boolean | false | Show viseme debug overlay |

## 📡 Backend API

The backend provides endpoints for:
- Audio processing
- Phoneme extraction
- VRM model validation

## 📄 License

MIT © Hermetic Labs
