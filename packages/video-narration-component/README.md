# Video Narration Editor

Timeline-based video editor with text-to-speech narration overlay. Drop a script, chunk it into segments, assign voices and speeds per chunk, and create professional narration tracks.

## Overview

The Video Narration Editor combines a multi-track timeline with flexible TTS integration. Import video, paste your narration script, highlight sections to create audio chunks, pick different voices for different speakers, adjust timing on the timeline, and export the final video with narration.

## Features

- Drag/drop script import
- Text chunking with highlight-to-select
- Voice selector per chunk (Kokoro AI + browser native)
- Speed control per chunk (0.5x-2.0x)
- Multi-track timeline (audio + video tracks)
- Draggable clips with visual feedback
- Playhead scrubbing
- Video preview player
- Configurable TTS endpoint

## Layout

| Panel | Purpose |
|-------|---------|
| Script Panel (left) | Import and chunk your narration script |
| Video Preview (center) | Preview video with playhead sync |
| Chunk Editor (right) | Configure voice, speed per chunk |
| Timeline (bottom) | Audio/video tracks, draggable clips |

## Workflow

1. **Import Script**: Paste or drag a text file into the Script Panel
2. **Create Chunks**: Highlight text sections and click "Process" to create audio segments
3. **Configure Voice**: Select a voice for each chunk (Kokoro AI or browser native)
4. **Adjust Speed**: Use the speed slider (0.5x-2.0x) per chunk
5. **Generate Audio**: Click "Generate Audio" to create TTS for each chunk
6. **Arrange Timeline**: Drag audio clips on the timeline to sync with video
7. **Preview**: Use playback controls to preview the full composition
8. **Export**: Export the final video with narration overlay

## TTS Providers

| Provider | Description |
|----------|-------------|
| Kokoro AI | High-quality neural TTS (requires Kokoro endpoint) |
| Browser Native | Built-in browser speech synthesis (no setup required) |

## Timeline Controls

| Control | Action |
|---------|--------|
| Play/Pause | Start/stop playback |
| Stop | Stop and reset to beginning |
| Click timeline | Jump to position |
| Drag playhead | Scrub through timeline |
| Drag clips | Reposition audio/video clips |
| Zoom +/- | Adjust timeline zoom level |

## Chunk Editor

| Control | Function |
|---------|----------|
| Voice dropdown | Select TTS voice |
| Speed slider | Adjust playback speed (0.5x-2.0x) |
| Preview Voice | Test voice settings without generating |
| Generate Audio | Create TTS audio and add to timeline |
| Play Generated | Listen to generated audio |

## Usage

```tsx
import { VideoNarrationEditor } from '@eve/video-narration-editor';

function App() {
  return <VideoNarrationEditor />;
}
```

### With Custom Config

```tsx
import { VideoNarrationEditor } from '@eve/video-narration-editor';

function App() {
  return (
    <VideoNarrationEditor
      config={{
        ttsEndpoint: 'http://localhost:8880',
        defaultVoice: 'af_bella',
      }}
    />
  );
}
```

## Components

| Component | Description |
|-----------|-------------|
| VideoNarrationEditor | Main container with full layout |
| ScriptPanel | Script import and text chunking |
| ChunkEditor | Per-chunk voice and speed controls |
| Timeline | Multi-track timeline with playback |
| VideoPreview | Video player with playhead sync |
| SettingsModal | TTS endpoint configuration |
| ExportModal | Export controls |

## Dependencies

- `zustand` - State management

## License

EVE-MARKET-001
