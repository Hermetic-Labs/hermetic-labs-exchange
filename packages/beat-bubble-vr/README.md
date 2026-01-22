# Beat Bubble VR

Immersive 3D spherical beat mixer game. Place beats on a spinning sphere inside a VR-ready environment.

## Overview

Beat Bubble VR is a creative music tool that lets you compose rhythms by placing beats on a rotating 3D sphere. The sphere has 5 track lanes, each producing a different sound through Web Audio API synthesis. No external audio files are needed - everything is generated in real-time.

## Features

- VR-ready 3D sphere environment (also works with mouse/touch)
- Web Audio API sound synthesis (zero loading time)
- 5 sound types: Kick, Snare, Hi-Hat, Bass, Synth
- 5 track lanes for beat placement
- Adjustable tempo (60-180 BPM)
- Click to place/remove beats
- Drag to look around
- Visual pulse feedback on trigger

## Usage

1. Open the Beat Bubble VR component
2. Click on the sphere to place a beat
3. The sphere rotates and triggers sounds as it passes each beat
4. Drag to rotate your view around the sphere
5. Use the tempo slider to adjust BPM
6. Click existing beats to remove them

## Controls

| Input | Action |
|-------|--------|
| Click | Place/remove beat |
| Drag | Rotate view |
| Scroll | Zoom in/out |
| VR Controller | Point and trigger to place beats |

## Technical Details

- Built with Three.js for 3D rendering
- Pure Web Audio API synthesis (works offline)
- No external dependencies beyond Three.js
- VR-compatible via WebXR (with vr-spatial-engine)

## Dependencies

- `three` - 3D rendering

## Optional Dependencies

- `vr-spatial-engine` - For full VR/XR support

## Example

```tsx
import { BeatBubbleVR } from '@eve/beat-bubble-vr';

function App() {
  return <BeatBubbleVR />;
}
```

## License

EVE-MARKET-001
