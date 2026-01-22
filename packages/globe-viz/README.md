# Globe Data Visualization

Interactive 3D globe visualization with pluggable data adapters for EVE OS marketplace.

## Features

- **3D Globe**: Beautiful Earth visualization with Three.js
- **Data Types**: Points, arcs, heatmaps, and animated paths
- **Pluggable Adapters**: Transform any data source into globe visualizations
- **Real-time Updates**: Live data streaming support
- **Custom Data**: Upload JSON or connect to APIs
- **Interactive**: Click markers for details, auto-rotation

## Usage

```tsx
import { Globe, useDataAdapter, flightAdapter } from '@eve-market/globe-viz';

function MyComponent() {
  const { data, loading } = useDataAdapter(flightAdapter, {});

  return (
    <Globe
      data={data}
      onItemClick={(item) => console.log(item)}
      autoRotate={true}
    />
  );
}
```

## Data Types

### Point
Single location marker:
```typescript
{
  id: 'airport-1',
  type: 'point',
  lat: 40.6413,
  lng: -73.7781,
  label: 'JFK Airport',
  color: '#ffffff',
  value: 1
}
```

### Arc
Connection between two points:
```typescript
{
  id: 'flight-1',
  type: 'arc',
  startLat: 40.6413,
  startLng: -73.7781,
  endLat: 51.4700,
  endLng: -0.4543,
  label: 'NYC → London',
  color: '#eb2226'
}
```

### Heatmap
Intensity at a location:
```typescript
{
  id: 'heatmap-1',
  type: 'heatmap',
  lat: 37.7749,
  lng: -122.4194,
  value: 0.8,
  radius: 5
}
```

## Creating Custom Adapters

```typescript
import { createAdapter } from '@eve-market/globe-viz';

const myAdapter = createAdapter(async (config) => {
  const data = await fetch('/api/my-data').then(r => r.json());
  return data.map(item => ({
    id: item.id,
    type: 'point',
    lat: item.latitude,
    lng: item.longitude,
    label: item.name,
    color: '#00ff00'
  }));
});
```

## Built-in Adapters

- `flightAdapter` - Flight tracking data
- `trafficAdapter` - Network traffic visualization
- `heatmapAdapter` - Geographic intensity data

## License

EVE-MARKET-001
