# Super Platformer

Classic side-scrolling platformer game in the style of Mario. Features pixel art graphics, coin collection, enemies to defeat, platforms to navigate, and a flag to reach.

## Overview

Super Platformer is a complete platformer game built with pure Canvas rendering. It features classic Mario-style gameplay with pixel art graphics, enemy AI, and mobile touch controls. No external dependencies - just instant fun.

## Features

- Classic platformer gameplay mechanics
- Pixel art retro graphics
- Coin collection system with score tracking
- Enemy AI with patrol patterns
- Stomp-to-defeat mechanic
- Multiple platform types (ground, brick, question blocks)
- Side-scrolling camera following the player
- Mobile touch controls
- Win/lose states
- Keyboard and touch input support

## Controls

### Keyboard
| Key | Action |
|-----|--------|
| Arrow Left / A | Move left |
| Arrow Right / D | Move right |
| Space / Arrow Up / W | Jump |

### Touch
| Input | Action |
|-------|--------|
| Left side tap | Move left |
| Right side tap | Move right |
| Swipe up | Jump |

## Gameplay

1. Navigate through platforms using arrow keys or touch controls
2. Collect coins for points
3. Stomp on enemies to defeat them (jump on top)
4. Avoid touching enemies from the side or below
5. Reach the flag at the end to win

## Technical Details

- Pure Canvas 2D rendering
- No external dependencies
- Mobile-first touch controls
- Runs at 60 FPS
- Responsive to any container size

## Usage

```tsx
import { PlatformerGame } from '@eve/platformer-game';

function App() {
  return <PlatformerGame />;
}
```

## Game Elements

| Element | Description |
|---------|-------------|
| Player | Red character, controlled by user |
| Ground | Brown platforms, solid collision |
| Bricks | Orange blocks, can be broken |
| Question Blocks | Yellow blocks with ? mark |
| Coins | Yellow spinning coins, +10 points |
| Enemies | Red creatures with patrol AI |
| Flag | Green flag, reach to win |

## Dependencies

None - pure Canvas rendering.

## License

EVE-MARKET-001
