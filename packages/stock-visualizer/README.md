# 3D Stock Visualizer

Interactive 3D candlestick chart with real-time strategy coding. Write trading strategies in a simple DSL, see buy/sell signals visualized on the chart.

## Overview

The 3D Stock Visualizer combines financial charting with a strategy DSL editor. View candlestick data in both 2D and 3D, add technical indicators (SMA, EMA), and write trading strategies that generate visual buy/sell signals on the chart.

## Features

- 3D and 2D candlestick charts
- Real-time strategy DSL editor
- SMA and EMA indicators
- Buy/sell signal visualization
- Timeline scrubbing and zoom
- Adjustable window size
- Price change tracking
- Drag-to-rotate 3D view

## Components

| Component | Description |
|-----------|-------------|
| StockVisualizer | Main container with all features |
| StockChart3D | 3D candlestick chart component |
| StrategyEditor | DSL editor for trading strategies |
| TimelineControls | Timeline scrubbing and zoom |

## Strategy DSL

Write strategies in readable English-like syntax:

```
// Simple Moving Average Crossover
when SMA(10) crosses above SMA(20)
  then BUY

when SMA(10) crosses below SMA(20)
  then SELL
```

```
// RSI Oversold/Overbought
when RSI(14) < 30
  then BUY

when RSI(14) > 70
  then SELL
```

## Technical Indicators

| Indicator | Description |
|-----------|-------------|
| SMA(n) | Simple Moving Average over n periods |
| EMA(n) | Exponential Moving Average over n periods |
| RSI(n) | Relative Strength Index over n periods |

## Controls

### 3D View
| Input | Action |
|-------|--------|
| Drag | Rotate view |
| Scroll | Zoom in/out |
| Click candle | Show details |

### Timeline
| Input | Action |
|-------|--------|
| Drag slider | Scrub through time |
| +/- buttons | Adjust visible window |

## Usage

```tsx
import { StockVisualizer } from '@eve/stock-visualizer';

function App() {
  return <StockVisualizer symbol="AAPL" />;
}
```

### With Custom Data

```tsx
import { StockChart3D } from '@eve/stock-visualizer';

const data = [
  { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103 },
  { date: '2024-01-02', open: 103, high: 108, low: 101, close: 106 },
  // ...
];

function App() {
  return <StockChart3D data={data} />;
}
```

## Dependencies

- `@react-three/fiber` - React Three.js renderer
- `@react-three/drei` - Useful helpers for R3F
- `three` - 3D rendering
- `lucide-react` - Icons

## License

EVE-MARKET-001
