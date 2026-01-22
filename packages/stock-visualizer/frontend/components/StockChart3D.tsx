import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { CandleData, Signal, normalizeVolume } from '../utils/stockData';
import { IndicatorConfig } from '../utils/strategyParser';

interface StockChart3DProps {
  data: CandleData[];
  indicators: IndicatorConfig[];
  signals: Signal[];
  is3D: boolean;
  visibleRange: [number, number];
}

interface CandlestickProps {
  candle: CandleData;
  index: number;
  normalizedVolume: number;
  is3D: boolean;
  priceRange: { min: number; max: number };
  signal?: Signal;
}

function Candlestick({ candle, index, normalizedVolume, is3D, priceRange, signal }: CandlestickProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isGreen = candle.close >= candle.open;
  const color = isGreen ? '#22c55e' : '#ef4444';
  
  const priceScale = 10;
  const range = priceRange.max - priceRange.min || 1;
  
  const bodyHeight = Math.abs(candle.close - candle.open) / range * priceScale;
  const bodyY = ((Math.min(candle.open, candle.close) + Math.max(candle.open, candle.close)) / 2 - priceRange.min) / range * priceScale;
  const wickHeight = (candle.high - candle.low) / range * priceScale;
  const wickY = ((candle.high + candle.low) / 2 - priceRange.min) / range * priceScale;
  
  const depth = is3D ? 0.3 + normalizedVolume * 1.5 : 0.1;
  const zOffset = is3D ? normalizedVolume * 2 - 1 : 0;

  return (
    <group position={[index * 1.2, 0, zOffset]}>
      {/* Candle body */}
      <mesh ref={meshRef} position={[0, bodyY, 0]}>
        <boxGeometry args={[0.8, Math.max(bodyHeight, 0.05), depth]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Wick */}
      <mesh position={[0, wickY, 0]}>
        <boxGeometry args={[0.08, wickHeight, depth * 0.3]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Buy/Sell signal */}
      {signal && (
        <group position={[0, signal.type === 'buy' ? -1 : priceScale + 1, is3D ? 1 : 0.5]}>
          <mesh>
            <coneGeometry args={[0.3, 0.6, 8]} />
            <meshStandardMaterial 
              color={signal.type === 'buy' ? '#22c55e' : '#ef4444'} 
              emissive={signal.type === 'buy' ? '#22c55e' : '#ef4444'}
              emissiveIntensity={0.5}
            />
          </mesh>
          <Text
            position={[0, signal.type === 'buy' ? -0.8 : 0.8, 0]}
            fontSize={0.4}
            color={signal.type === 'buy' ? '#22c55e' : '#ef4444'}
            anchorX="center"
            anchorY="middle"
          >
            {signal.type === 'buy' ? 'BUY' : 'SELL'}
          </Text>
        </group>
      )}
    </group>
  );
}

function IndicatorLine({ indicator, priceRange, dataLength, is3D }: { 
  indicator: IndicatorConfig; 
  priceRange: { min: number; max: number };
  dataLength: number;
  is3D: boolean;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const range = priceRange.max - priceRange.min || 1;
    const priceScale = 10;

    for (let i = 0; i < indicator.values.length; i++) {
      const val = indicator.values[i];
      if (val !== null) {
        const y = (val - priceRange.min) / range * priceScale;
        pts.push(new THREE.Vector3(i * 1.2, y, is3D ? 2 : 0.2));
      }
    }
    return pts;
  }, [indicator.values, priceRange, is3D]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color={indicator.color}
      lineWidth={2}
      transparent
      opacity={0.8}
    />
  );
}

function PriceAxis({ priceRange, xOffset }: { priceRange: { min: number; max: number }; xOffset: number }) {
  const steps = 5;
  const priceScale = 10;
  const range = priceRange.max - priceRange.min || 1;

  return (
    <group position={[xOffset - 2, 0, 0]}>
      {Array.from({ length: steps + 1 }).map((_, i) => {
        const price = priceRange.min + (range * i) / steps;
        const y = (i / steps) * priceScale;
        return (
          <Text
            key={i}
            position={[0, y, 0]}
            fontSize={0.35}
            color="#9ca3af"
            anchorX="right"
            anchorY="middle"
          >
            ${price.toFixed(2)}
          </Text>
        );
      })}
    </group>
  );
}

function GridLines({ dataLength, priceRange }: { dataLength: number; priceRange: { min: number; max: number } }) {
  const priceScale = 10;
  const gridColor = '#374151';

  return (
    <group>
      {/* Horizontal grid lines */}
      {Array.from({ length: 6 }).map((_, i) => {
        const y = (i / 5) * priceScale;
        return (
          <Line
            key={`h-${i}`}
            points={[
              new THREE.Vector3(0, y, -2),
              new THREE.Vector3(dataLength * 1.2, y, -2),
            ]}
            color={gridColor}
            lineWidth={1}
            transparent
            opacity={0.3}
          />
        );
      })}
      {/* Vertical grid lines */}
      {Array.from({ length: Math.ceil(dataLength / 10) + 1 }).map((_, i) => {
        const x = i * 10 * 1.2;
        if (x > dataLength * 1.2) return null;
        return (
          <Line
            key={`v-${i}`}
            points={[
              new THREE.Vector3(x, 0, -2),
              new THREE.Vector3(x, priceScale, -2),
            ]}
            color={gridColor}
            lineWidth={1}
            transparent
            opacity={0.3}
          />
        );
      })}
    </group>
  );
}

function CameraController({ is3D, dataLength }: { is3D: boolean; dataLength: number }) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    const centerX = (dataLength * 1.2) / 2;
    if (is3D) {
      targetPosition.current.set(centerX, 8, 25);
      targetLookAt.current.set(centerX, 5, 0);
    } else {
      targetPosition.current.set(centerX, 5, 40);
      targetLookAt.current.set(centerX, 5, 0);
    }
  }, [is3D, dataLength]);

  useFrame(() => {
    camera.position.lerp(targetPosition.current, 0.05);
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    camera.lookAt(targetLookAt.current);
  });

  return null;
}

function Scene({ data, indicators, signals, is3D, visibleRange }: StockChart3DProps) {
  const visibleData = useMemo(() => {
    return data.slice(visibleRange[0], visibleRange[1]);
  }, [data, visibleRange]);

  const normalizedVolumes = useMemo(() => normalizeVolume(visibleData), [visibleData]);

  const priceRange = useMemo(() => {
    if (visibleData.length === 0) return { min: 0, max: 100 };
    const prices = visibleData.flatMap(d => [d.high, d.low]);
    const indicatorValues = indicators.flatMap(ind => 
      ind.values.slice(visibleRange[0], visibleRange[1]).filter((v): v is number => v !== null)
    );
    const allValues = [...prices, ...indicatorValues];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [visibleData, indicators, visibleRange]);

  const signalMap = useMemo(() => {
    const map = new Map<number, Signal>();
    signals.forEach(s => {
      if (s.index >= visibleRange[0] && s.index < visibleRange[1]) {
        map.set(s.index - visibleRange[0], s);
      }
    });
    return map;
  }, [signals, visibleRange]);

  const visibleIndicators = useMemo(() => {
    return indicators.map(ind => ({
      ...ind,
      values: ind.values.slice(visibleRange[0], visibleRange[1]),
    }));
  }, [indicators, visibleRange]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <pointLight position={[-10, 10, 10]} intensity={0.5} />

      <CameraController is3D={is3D} dataLength={visibleData.length} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI * 0.9}
        minPolarAngle={0.1}
      />

      <GridLines dataLength={visibleData.length} priceRange={priceRange} />
      <PriceAxis priceRange={priceRange} xOffset={0} />

      {visibleData.map((candle, i) => (
        <Candlestick
          key={i}
          candle={candle}
          index={i}
          normalizedVolume={normalizedVolumes[i]}
          is3D={is3D}
          priceRange={priceRange}
          signal={signalMap.get(i)}
        />
      ))}

      {visibleIndicators.map((indicator, i) => (
        <IndicatorLine
          key={`${indicator.type}-${indicator.period}-${i}`}
          indicator={indicator}
          priceRange={priceRange}
          dataLength={visibleData.length}
          is3D={is3D}
        />
      ))}
    </>
  );
}

export default function StockChart3D(props: StockChart3DProps) {
  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [50, 8, 40], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#111827']} />
        <fog attach="fog" args={['#111827', 30, 100]} />
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
