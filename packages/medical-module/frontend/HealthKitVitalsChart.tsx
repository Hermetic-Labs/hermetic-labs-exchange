/**
 * HealthKit Vitals Chart Component
 *
 * Visualizes health data from Apple HealthKit, wearables, and IoT medical devices.
 * Integrates with IoTDeviceAdapter for real-time device data.
 *
 * Displays:
 * - Heart rate trends
 * - Blood pressure history
 * - Oxygen saturation
 * - Activity/steps
 * - Sleep patterns
 * - ECG readings
 *
 * Data Sources:
 * - Apple HealthKit (via native bridge)
 * - Bluetooth medical devices
 * - HTTP/WebSocket medical IoT devices
 * - MQTT sensors
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  DeviceProtocol,
  IoTDeviceAdapter,
  StandardDeviceAdapterFactory
} from './services/IoTDeviceAdapter'
import {
  BLEVitalsService,
  getBLEVitalsService,
  BLEDevice,
  VitalsReading,
  BLEStatus
} from './services/BLEVitalsService'


// Types for HealthKit data
interface HealthDataPoint {
  timestamp: string
  value: number
  unit: string
  source: string
  metadata?: Record<string, any>
}

interface VitalsTimeSeries {
  heartRate: HealthDataPoint[]
  bloodPressureSystolic: HealthDataPoint[]
  bloodPressureDiastolic: HealthDataPoint[]
  oxygenSaturation: HealthDataPoint[]
  respiratoryRate: HealthDataPoint[]
  bodyTemperature: HealthDataPoint[]
  steps: HealthDataPoint[]
  sleepAnalysis: HealthDataPoint[]
  ecgReadings: ECGReading[]
}

interface ECGReading {
  id: string
  timestamp: string
  classification: 'sinusRhythm' | 'atrialFibrillation' | 'inconclusive' | 'highHeartRate' | 'lowHeartRate'
  averageHeartRate: number
  samples: number[]
  duration: number
}

// IoT Device Integration
interface ConnectedDevice {
  deviceId: string
  name: string
  type: 'blood_pressure' | 'pulse_oximeter' | 'ecg' | 'thermometer' | 'glucometer' | 'scale' | 'wearable'
  protocol: DeviceProtocol
  status: 'connected' | 'disconnected' | 'error'
  batteryLevel?: number
  lastReading?: HealthDataPoint
  adapter?: IoTDeviceAdapter
}

interface DeviceReading {
  deviceId: string
  deviceType: string
  readings: Record<string, HealthDataPoint>
  timestamp: string
}

interface HealthKitConfig {
  refreshInterval: number // ms
  historyDays: number
  alertThresholds: {
    heartRateHigh: number
    heartRateLow: number
    oxygenSaturationLow: number
    bloodPressureSystolicHigh: number
    bloodPressureDiastolicHigh: number
  }
}

interface ChartProps {
  patientId: string
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d'
  onAlert?: (alert: VitalsAlert) => void
  onDeviceReading?: (reading: DeviceReading) => void
  config?: Partial<HealthKitConfig>
  connectedDevices?: ConnectedDevice[]
  enableIoT?: boolean
}

interface VitalsAlert {
  type: string
  severity: 'warning' | 'critical'
  value: number
  threshold: number
  timestamp: string
  message: string
}

// Default configuration
const DEFAULT_CONFIG: HealthKitConfig = {
  refreshInterval: 30000,
  historyDays: 30,
  alertThresholds: {
    heartRateHigh: 100,
    heartRateLow: 50,
    oxygenSaturationLow: 92,
    bloodPressureSystolicHigh: 140,
    bloodPressureDiastolicHigh: 90
  }
}

// Generate demo data for visualization
function generateDemoData(timeRange: string): VitalsTimeSeries {
  const now = Date.now()
  const ranges: Record<string, number> = {
    '1h': 3600000,
    '6h': 21600000,
    '24h': 86400000,
    '7d': 604800000,
    '30d': 2592000000
  }
  const range = ranges[timeRange] || ranges['24h']
  const pointCount = timeRange === '1h' ? 60 : timeRange === '6h' ? 72 : timeRange === '24h' ? 96 : timeRange === '7d' ? 168 : 240
  const interval = range / pointCount

  const generatePoints = (
    baseValue: number,
    variance: number,
    unit: string
  ): HealthDataPoint[] => {
    return Array.from({ length: pointCount }, (_, i) => ({
      timestamp: new Date(now - range + i * interval).toISOString(),
      value: baseValue + (Math.random() - 0.5) * variance,
      unit,
      source: 'Apple Watch'
    }))
  }

  return {
    heartRate: generatePoints(72, 20, 'bpm'),
    bloodPressureSystolic: generatePoints(120, 15, 'mmHg'),
    bloodPressureDiastolic: generatePoints(80, 10, 'mmHg'),
    oxygenSaturation: generatePoints(97, 3, '%'),
    respiratoryRate: generatePoints(16, 4, 'breaths/min'),
    bodyTemperature: generatePoints(37, 0.5, '°C'),
    steps: generatePoints(500, 300, 'steps'),
    sleepAnalysis: generatePoints(7, 2, 'hours'),
    ecgReadings: [
      {
        id: 'ecg-1',
        timestamp: new Date(now - 3600000).toISOString(),
        classification: 'sinusRhythm',
        averageHeartRate: 72,
        samples: Array.from({ length: 100 }, () => Math.random() * 0.5 - 0.25),
        duration: 30
      }
    ]
  }
}

// Mini sparkline chart component
function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (data.length === 0) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = ((max - value) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width="100%" height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ECG waveform component
function ECGWaveform({ samples, color = '#10b981' }: { samples: number[]; color?: string }) {
  if (samples.length === 0) return null

  const height = 60
  const centerY = height / 2

  const points = samples.map((value, i) => {
    const x = (i / samples.length) * 100
    const y = centerY - value * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width="100%" height={height} style={{ display: 'block', backgroundColor: '#1a1a1a' }}>
      {/* Grid lines */}
      <defs>
        <pattern id="ecgGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#333" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ecgGrid)" />

      {/* Waveform */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function HealthKitVitalsChart({
  patientId,
  timeRange,
  onAlert,
  onDeviceReading,
  config,
  connectedDevices = [],
  enableIoT = true
}: ChartProps) {
  const [vitalsData, setVitalsData] = useState<VitalsTimeSeries | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<string>('heartRate')
  const [showECG, setShowECG] = useState(false)
  const [showDevices, setShowDevices] = useState(false)
  const [alerts, setAlerts] = useState<VitalsAlert[]>([])
  const [devices, setDevices] = useState<ConnectedDevice[]>(connectedDevices)
  const [deviceReadings, setDeviceReadings] = useState<Map<string, DeviceReading>>(new Map())

  // BLE-specific state
  const [bleStatus, setBleStatus] = useState<BLEStatus | null>(null)
  const [discoveredBleDevices, setDiscoveredBleDevices] = useState<BLEDevice[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [bleConnected, setBleConnected] = useState(false)
  const [bleError, setBleError] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false) // Toggle for simulated data

  // IoT adapter factory reference
  const adapterFactoryRef = useRef<StandardDeviceAdapterFactory | null>(null)
  const bleServiceRef = useRef<BLEVitalsService | null>(null)
  const isMountedRef = useRef(false)

  const mergedConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config,
    alertThresholds: {
      ...DEFAULT_CONFIG.alertThresholds,
      ...config?.alertThresholds
    }
  }), [config])

  // Initialize IoT adapter factory
  useEffect(() => {
    if (enableIoT && !adapterFactoryRef.current) {
      adapterFactoryRef.current = new StandardDeviceAdapterFactory()
    }
  }, [enableIoT])

  // Process IoT device readings and merge with HealthKit data
  // NOTE: This must be defined BEFORE the BLE useEffect that uses it
  const processDeviceReading = useCallback((device: ConnectedDevice, reading: any) => {
    const timestamp = new Date().toISOString()

    const deviceReading: DeviceReading = {
      deviceId: device.deviceId,
      deviceType: device.type,
      readings: {},
      timestamp
    }

    // Map device type to vitals
    switch (device.type) {
      case 'blood_pressure':
        if (reading.systolic !== undefined) {
          deviceReading.readings.bloodPressureSystolic = {
            timestamp,
            value: reading.systolic,
            unit: 'mmHg',
            source: device.name
          }
          deviceReading.readings.bloodPressureDiastolic = {
            timestamp,
            value: reading.diastolic,
            unit: 'mmHg',
            source: device.name
          }
        }
        break

      case 'pulse_oximeter':
        if (reading.spo2 !== undefined) {
          deviceReading.readings.oxygenSaturation = {
            timestamp,
            value: reading.spo2,
            unit: '%',
            source: device.name
          }
        }
        if (reading.pulseRate !== undefined) {
          deviceReading.readings.heartRate = {
            timestamp,
            value: reading.pulseRate,
            unit: 'bpm',
            source: device.name
          }
        }
        break

      case 'thermometer':
        if (reading.temperature !== undefined) {
          deviceReading.readings.bodyTemperature = {
            timestamp,
            value: reading.temperature,
            unit: '°C',
            source: device.name
          }
        }
        break

      case 'ecg':
        // ECG readings handled separately
        break

      case 'wearable':
        // Wearables can provide multiple readings
        if (reading.heartRate !== undefined) {
          deviceReading.readings.heartRate = {
            timestamp,
            value: reading.heartRate,
            unit: 'bpm',
            source: device.name
          }
        }
        if (reading.steps !== undefined) {
          deviceReading.readings.steps = {
            timestamp,
            value: reading.steps,
            unit: 'steps',
            source: device.name
          }
        }
        break
    }

    // Store reading
    setDeviceReadings(prev => new Map(prev).set(device.deviceId, deviceReading))

    // Merge into vitals data
    setVitalsData(prev => {
      if (!prev) return prev

      const updated = { ...prev }

      for (const [metric, reading] of Object.entries(deviceReading.readings)) {
        const metricKey = metric as keyof VitalsTimeSeries
        if (Array.isArray(updated[metricKey])) {
          (updated[metricKey] as HealthDataPoint[]).push(reading as HealthDataPoint)
        }
      }

      return updated
    })

    // Notify parent
    onDeviceReading?.(deviceReading)
  }, [onDeviceReading])

  // Initialize BLE service and set up real-time vitals streaming
  useEffect(() => {
    if (!enableIoT) return

    const bleService = getBLEVitalsService()
    bleServiceRef.current = bleService

    // Set up event handlers for real BLE data
    const unsubscribeVitals = bleService.onVitalsReading((reading: VitalsReading) => {
      // Find matching device in our list or create one
      const existingDevice = devices.find(d => d.deviceId === reading.deviceId)

      if (existingDevice) {
        // Map BLE reading to our processDeviceReading format
        const mappedReading: any = {}

        if (reading.readings.spo2 !== undefined) {
          mappedReading.spo2 = reading.readings.spo2
        }
        if (reading.readings.pulseRate !== undefined) {
          mappedReading.pulseRate = reading.readings.pulseRate
        }
        if (reading.readings.systolic !== undefined) {
          mappedReading.systolic = reading.readings.systolic
          mappedReading.diastolic = reading.readings.diastolic
        }
        if (reading.readings.heartRate !== undefined) {
          mappedReading.heartRate = reading.readings.heartRate
        }

        processDeviceReading(existingDevice, mappedReading)
      }
    })

    const unsubscribeConnected = bleService.onDeviceConnected((data) => {
      console.log('[HealthKitVitalsChart] Device connected event:', data)
      // Add newly connected device to our list
      const newDevice: ConnectedDevice = {
        deviceId: data.deviceId,
        name: data.deviceName,
        type: data.deviceType as any,
        protocol: 'bluetooth',
        status: 'connected'
      }
      setDevices(prev => {
        console.log('[HealthKitVitalsChart] Current devices:', prev)
        const exists = prev.find(d => d.deviceId === data.deviceId)
        if (exists) {
          console.log('[HealthKitVitalsChart] Updating existing device to connected')
          return prev.map(d => d.deviceId === data.deviceId ? { ...d, status: 'connected' } : d)
        }
        console.log('[HealthKitVitalsChart] Adding new connected device:', newDevice)
        return [...prev, newDevice]
      })
    })

    const unsubscribeDisconnected = bleService.onDeviceDisconnected((data) => {
      setDevices(prev =>
        prev.map(d => d.deviceId === data.deviceId ? { ...d, status: 'disconnected' } : d)
      )
    })

    const unsubscribeScan = bleService.onScanComplete((data) => {
      setDiscoveredBleDevices(data.devices)
      setIsScanning(false)
    })

    const unsubscribeError = bleService.onError((error) => {
      console.error('[HealthKitVitalsChart] BLE Error:', error)
      setBleError(error.message)
    })

    // Handle status updates
    bleService.on('status', (status: BLEStatus) => {
      setBleStatus(status)
      setDiscoveredBleDevices(status.discoveredDevices)
    })

    // Mark as mounted and connect to WebSocket
    // This handles React StrictMode double-mount - only connect if still mounted
    isMountedRef.current = true
    bleService.connect().then((connected) => {
      if (isMountedRef.current) {
        setBleConnected(connected)
        if (connected) {
          bleService.requestStatus()
        }
      }
    })

    return () => {
      isMountedRef.current = false
      unsubscribeVitals()
      unsubscribeConnected()
      unsubscribeDisconnected()
      unsubscribeScan()
      unsubscribeError()
      bleService.disconnect()
    }
    // Only run on mount/unmount and when enableIoT changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableIoT])

  // Simulate IoT device readings for demo (only when demoMode is ON and BLE not connected)
  useEffect(() => {
    // Skip simulation if demo mode is off, BLE is connected, or no devices
    if (!demoMode || !enableIoT || devices.length === 0 || bleConnected) return

    const simulateReadings = () => {
      devices.forEach(device => {
        if (device.status !== 'connected') return
        // Skip BLE devices - they get real data
        if (device.protocol === 'bluetooth' && bleConnected) return

        let reading: any = {}

        switch (device.type) {
          case 'blood_pressure':
            reading = {
              systolic: 115 + Math.random() * 30,
              diastolic: 70 + Math.random() * 20
            }
            break
          case 'pulse_oximeter':
            reading = {
              spo2: 95 + Math.random() * 5,
              pulseRate: 65 + Math.random() * 25
            }
            break
          case 'thermometer':
            reading = {
              temperature: 36.5 + Math.random() * 1.5
            }
            break
          case 'wearable':
            reading = {
              heartRate: 70 + Math.random() * 20,
              steps: Math.floor(Math.random() * 100)
            }
            break
        }

        processDeviceReading(device, reading)
      })
    }

    // Initial reading
    simulateReadings()

    // Periodic readings
    const interval = setInterval(simulateReadings, 10000)
    return () => clearInterval(interval)
  }, [demoMode, enableIoT, devices, processDeviceReading, bleConnected])

  // BLE scan handler
  const handleBleScan = useCallback(async () => {
    const bleService = bleServiceRef.current
    console.log('[HealthKitVitalsChart] handleBleScan called', { bleService: !!bleService, isScanning })
    if (!bleService || isScanning) return

    setIsScanning(true)
    setBleError(null)

    try {
      console.log('[HealthKitVitalsChart] Starting BLE scan (30s, all devices)...')
      const devices = await bleService.scanForDevices(30)
      console.log('[HealthKitVitalsChart] Scan complete, devices:', devices)
      setDiscoveredBleDevices(devices)
    } catch (error: any) {
      console.error('[HealthKitVitalsChart] Scan error:', error)
      setBleError(error.message || 'Scan failed')
    } finally {
      setIsScanning(false)
    }
  }, [isScanning])

  // BLE device connect handler
  const handleBleConnect = useCallback(async (deviceAddress: string) => {
    const bleService = bleServiceRef.current
    if (!bleService) return

    setBleError(null)

    try {
      const success = await bleService.connectAndStream(deviceAddress)
      if (!success) {
        setBleError('Failed to connect to device')
      }
    } catch (error: any) {
      setBleError(error.message || 'Connection failed')
    }
  }, [])

  // Check for threshold violations - defined before useEffect that uses it
  const checkAlerts = useCallback((data: VitalsTimeSeries) => {
    const newAlerts: VitalsAlert[] = []
    const thresholds = mergedConfig.alertThresholds

    // Check heart rate
    const latestHR = data.heartRate[data.heartRate.length - 1]
    if (latestHR && latestHR.value > thresholds.heartRateHigh) {
      newAlerts.push({
        type: 'heartRate',
        severity: latestHR.value > thresholds.heartRateHigh + 20 ? 'critical' : 'warning',
        value: latestHR.value,
        threshold: thresholds.heartRateHigh,
        timestamp: latestHR.timestamp,
        message: `High heart rate: ${Math.round(latestHR.value)} bpm`
      })
    }
    if (latestHR && latestHR.value < thresholds.heartRateLow) {
      newAlerts.push({
        type: 'heartRate',
        severity: latestHR.value < thresholds.heartRateLow - 10 ? 'critical' : 'warning',
        value: latestHR.value,
        threshold: thresholds.heartRateLow,
        timestamp: latestHR.timestamp,
        message: `Low heart rate: ${Math.round(latestHR.value)} bpm`
      })
    }

    // Check oxygen saturation
    const latestSpO2 = data.oxygenSaturation[data.oxygenSaturation.length - 1]
    if (latestSpO2 && latestSpO2.value < thresholds.oxygenSaturationLow) {
      newAlerts.push({
        type: 'oxygenSaturation',
        severity: latestSpO2.value < thresholds.oxygenSaturationLow - 5 ? 'critical' : 'warning',
        value: latestSpO2.value,
        threshold: thresholds.oxygenSaturationLow,
        timestamp: latestSpO2.timestamp,
        message: `Low oxygen saturation: ${Math.round(latestSpO2.value)}%`
      })
    }

    // Check blood pressure
    const latestSystolic = data.bloodPressureSystolic[data.bloodPressureSystolic.length - 1]
    if (latestSystolic && latestSystolic.value > thresholds.bloodPressureSystolicHigh) {
      newAlerts.push({
        type: 'bloodPressure',
        severity: latestSystolic.value > thresholds.bloodPressureSystolicHigh + 20 ? 'critical' : 'warning',
        value: latestSystolic.value,
        threshold: thresholds.bloodPressureSystolicHigh,
        timestamp: latestSystolic.timestamp,
        message: `High blood pressure: ${Math.round(latestSystolic.value)} mmHg systolic`
      })
    }

    setAlerts(newAlerts)

    // Notify parent of alerts
    newAlerts.forEach(alert => onAlert?.(alert))
  }, [mergedConfig.alertThresholds, onAlert])

  // Fetch/generate data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    const fetchData = async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Only generate demo data if demo mode is ON
      // When demo mode is OFF, only show real BLE data
      if (demoMode) {
        const data = generateDemoData(timeRange)
        setVitalsData(data)
        checkAlerts(data)
      } else {
        // Initialize with empty data - will be populated by real BLE readings
        setVitalsData({
          heartRate: [],
          bloodPressureSystolic: [],
          bloodPressureDiastolic: [],
          oxygenSaturation: [],
          respiratoryRate: [],
          bodyTemperature: [],
          steps: [],
          sleepAnalysis: [],
          ecgReadings: []
        })
      }
      setLoading(false)
    }

    fetchData()

    // Refresh interval - only refresh demo data, not real data
    const interval = demoMode ? setInterval(fetchData, mergedConfig.refreshInterval) : null
    return () => { if (interval) clearInterval(interval) }
  }, [patientId, timeRange, mergedConfig.refreshInterval, checkAlerts, demoMode])

  // Get current values
  const currentValues = useMemo(() => {
    if (!vitalsData) return null

    return {
      heartRate: vitalsData.heartRate[vitalsData.heartRate.length - 1]?.value,
      bloodPressure: `${Math.round(vitalsData.bloodPressureSystolic[vitalsData.bloodPressureSystolic.length - 1]?.value || 0)}/${Math.round(vitalsData.bloodPressureDiastolic[vitalsData.bloodPressureDiastolic.length - 1]?.value || 0)}`,
      oxygenSaturation: vitalsData.oxygenSaturation[vitalsData.oxygenSaturation.length - 1]?.value,
      respiratoryRate: vitalsData.respiratoryRate[vitalsData.respiratoryRate.length - 1]?.value,
      temperature: vitalsData.bodyTemperature[vitalsData.bodyTemperature.length - 1]?.value,
      steps: vitalsData.steps.reduce((sum, p) => sum + p.value, 0)
    }
  }, [vitalsData])

  // Metric options
  const metrics = [
    { key: 'heartRate', label: 'Heart Rate', color: '#ef4444', unit: 'bpm' },
    { key: 'oxygenSaturation', label: 'SpO2', color: '#3b82f6', unit: '%' },
    { key: 'bloodPressureSystolic', label: 'Blood Pressure', color: '#f59e0b', unit: 'mmHg' },
    { key: 'respiratoryRate', label: 'Respiratory', color: '#10b981', unit: 'br/min' },
    { key: 'bodyTemperature', label: 'Temperature', color: '#8b5cf6', unit: '°C' },
    { key: 'steps', label: 'Activity', color: '#06b6d4', unit: 'steps' }
  ]

  const selectedMetricData = vitalsData?.[selectedMetric as keyof VitalsTimeSeries] as HealthDataPoint[] || []
  const selectedMetricInfo = metrics.find(m => m.key === selectedMetric)

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⌚</div>
          <p style={{ color: '#888' }}>Loading HealthKit data...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      padding: '16px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⌚</span> HealthKit Vitals
        </h3>

        {/* Time Range Selector */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {['1h', '6h', '24h', '7d', '30d'].map(range => (
            <button
              key={range}
              onClick={() => {/* Would update timeRange prop */ }}
              style={{
                padding: '4px 12px',
                backgroundColor: timeRange === range ? '#3b82f6' : '#2a2a2a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div style={{
          backgroundColor: alerts.some(a => a.severity === 'critical') ? '#dc2626' : '#f59e0b',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          {alerts.map((alert, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{alert.severity === 'critical' ? '🚨' : '⚠️'}</span>
              <span style={{ color: '#fff', fontSize: '14px' }}>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Current Values Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Heart Rate */}
        <div
          onClick={() => setSelectedMetric('heartRate')}
          style={{
            backgroundColor: selectedMetric === 'heartRate' ? '#2a2a2a' : '#222',
            padding: '12px',
            borderRadius: '6px',
            cursor: 'pointer',
            border: selectedMetric === 'heartRate' ? '2px solid #ef4444' : '2px solid transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#ef4444' }}>❤️</span>
            <span style={{ color: '#888', fontSize: '12px' }}>Heart Rate</span>
          </div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
            {Math.round(currentValues?.heartRate || 0)} <span style={{ fontSize: '14px', color: '#888' }}>bpm</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Sparkline
              data={vitalsData?.heartRate.map(p => p.value) || []}
              color="#ef4444"
              height={30}
            />
          </div>
        </div>

        {/* Blood Pressure */}
        <div
          onClick={() => setSelectedMetric('bloodPressureSystolic')}
          style={{
            backgroundColor: selectedMetric === 'bloodPressureSystolic' ? '#2a2a2a' : '#222',
            padding: '12px',
            borderRadius: '6px',
            cursor: 'pointer',
            border: selectedMetric === 'bloodPressureSystolic' ? '2px solid #f59e0b' : '2px solid transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#f59e0b' }}>🩸</span>
            <span style={{ color: '#888', fontSize: '12px' }}>Blood Pressure</span>
          </div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
            {currentValues?.bloodPressure} <span style={{ fontSize: '14px', color: '#888' }}>mmHg</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Sparkline
              data={vitalsData?.bloodPressureSystolic.map(p => p.value) || []}
              color="#f59e0b"
              height={30}
            />
          </div>
        </div>

        {/* Oxygen Saturation */}
        <div
          onClick={() => setSelectedMetric('oxygenSaturation')}
          style={{
            backgroundColor: selectedMetric === 'oxygenSaturation' ? '#2a2a2a' : '#222',
            padding: '12px',
            borderRadius: '6px',
            cursor: 'pointer',
            border: selectedMetric === 'oxygenSaturation' ? '2px solid #3b82f6' : '2px solid transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#3b82f6' }}>💨</span>
            <span style={{ color: '#888', fontSize: '12px' }}>SpO2</span>
          </div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
            {Math.round(currentValues?.oxygenSaturation || 0)} <span style={{ fontSize: '14px', color: '#888' }}>%</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Sparkline
              data={vitalsData?.oxygenSaturation.map(p => p.value) || []}
              color="#3b82f6"
              height={30}
            />
          </div>
        </div>

        {/* Respiratory Rate */}
        <div
          onClick={() => setSelectedMetric('respiratoryRate')}
          style={{
            backgroundColor: selectedMetric === 'respiratoryRate' ? '#2a2a2a' : '#222',
            padding: '12px',
            borderRadius: '6px',
            cursor: 'pointer',
            border: selectedMetric === 'respiratoryRate' ? '2px solid #10b981' : '2px solid transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#10b981' }}>🌬️</span>
            <span style={{ color: '#888', fontSize: '12px' }}>Respiratory</span>
          </div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
            {Math.round(currentValues?.respiratoryRate || 0)} <span style={{ fontSize: '14px', color: '#888' }}>br/min</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Sparkline
              data={vitalsData?.respiratoryRate.map(p => p.value) || []}
              color="#10b981"
              height={30}
            />
          </div>
        </div>

        {/* Temperature */}
        <div
          onClick={() => setSelectedMetric('bodyTemperature')}
          style={{
            backgroundColor: selectedMetric === 'bodyTemperature' ? '#2a2a2a' : '#222',
            padding: '12px',
            borderRadius: '6px',
            cursor: 'pointer',
            border: selectedMetric === 'bodyTemperature' ? '2px solid #8b5cf6' : '2px solid transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#8b5cf6' }}>🌡️</span>
            <span style={{ color: '#888', fontSize: '12px' }}>Temperature</span>
          </div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
            {(currentValues?.temperature || 0).toFixed(1)} <span style={{ fontSize: '14px', color: '#888' }}>°C</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Sparkline
              data={vitalsData?.bodyTemperature.map(p => p.value) || []}
              color="#8b5cf6"
              height={30}
            />
          </div>
        </div>

        {/* Activity/Steps */}
        <div
          onClick={() => setSelectedMetric('steps')}
          style={{
            backgroundColor: selectedMetric === 'steps' ? '#2a2a2a' : '#222',
            padding: '12px',
            borderRadius: '6px',
            cursor: 'pointer',
            border: selectedMetric === 'steps' ? '2px solid #06b6d4' : '2px solid transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#06b6d4' }}>🚶</span>
            <span style={{ color: '#888', fontSize: '12px' }}>Activity</span>
          </div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
            {Math.round(currentValues?.steps || 0).toLocaleString()} <span style={{ fontSize: '14px', color: '#888' }}>steps</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Sparkline
              data={vitalsData?.steps.map(p => p.value) || []}
              color="#06b6d4"
              height={30}
            />
          </div>
        </div>
      </div>

      {/* Detailed Chart */}
      <div style={{
        backgroundColor: '#222',
        padding: '16px',
        borderRadius: '6px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ color: '#fff', margin: 0 }}>
            {selectedMetricInfo?.label} History
          </h4>
          <span style={{ color: '#888', fontSize: '12px' }}>
            {selectedMetricData.length} data points
          </span>
        </div>

        <div style={{ height: '150px' }}>
          <Sparkline
            data={selectedMetricData.map(p => p.value)}
            color={selectedMetricInfo?.color || '#fff'}
            height={150}
          />
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #333'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#888', fontSize: '12px' }}>Min</div>
            <div style={{ color: '#fff', fontWeight: 'bold' }}>
              {selectedMetricData.length > 0 ? Math.round(Math.min(...selectedMetricData.map(p => p.value))) : '--'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#888', fontSize: '12px' }}>Avg</div>
            <div style={{ color: '#fff', fontWeight: 'bold' }}>
              {selectedMetricData.length > 0 ? Math.round(selectedMetricData.reduce((sum, p) => sum + p.value, 0) / selectedMetricData.length) : '--'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#888', fontSize: '12px' }}>Max</div>
            <div style={{ color: '#fff', fontWeight: 'bold' }}>
              {selectedMetricData.length > 0 ? Math.round(Math.max(...selectedMetricData.map(p => p.value))) : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* ECG Section */}
      <div style={{
        backgroundColor: '#222',
        padding: '16px',
        borderRadius: '6px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h4 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📈</span> ECG Readings
          </h4>
          <button
            onClick={() => setShowECG(!showECG)}
            style={{
              padding: '4px 12px',
              backgroundColor: '#2a2a2a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {showECG ? 'Hide' : 'Show'} ECG
          </button>
        </div>

        {showECG && vitalsData?.ecgReadings.length ? (
          <div>
            {vitalsData.ecgReadings.map(ecg => (
              <div key={ecg.id} style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      backgroundColor: ecg.classification === 'sinusRhythm' ? '#10b981' :
                        ecg.classification === 'atrialFibrillation' ? '#ef4444' : '#f59e0b',
                      color: '#fff'
                    }}>
                      {ecg.classification === 'sinusRhythm' ? 'Normal Sinus Rhythm' :
                        ecg.classification === 'atrialFibrillation' ? 'Atrial Fibrillation' :
                          'Inconclusive'}
                    </span>
                    <span style={{ color: '#888', fontSize: '12px' }}>
                      {ecg.averageHeartRate} bpm avg
                    </span>
                  </div>
                  <span style={{ color: '#666', fontSize: '11px' }}>
                    {new Date(ecg.timestamp).toLocaleString()}
                  </span>
                </div>

                <ECGWaveform
                  samples={ecg.samples}
                  color={ecg.classification === 'sinusRhythm' ? '#10b981' :
                    ecg.classification === 'atrialFibrillation' ? '#ef4444' : '#f59e0b'}
                />
              </div>
            ))}
          </div>
        ) : showECG ? (
          <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', margin: '20px 0' }}>
            No ECG readings available
          </p>
        ) : null}

        {!showECG && vitalsData?.ecgReadings.length ? (
          <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
            {vitalsData.ecgReadings.length} ECG reading(s) available
          </p>
        ) : null}
      </div>

      {/* IoT Devices Section */}
      {enableIoT && (
        <div style={{
          backgroundColor: '#222',
          padding: '16px',
          borderRadius: '6px',
          marginTop: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h4 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📡</span> Connected Devices
              {bleConnected ? (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#10b981',
                  borderRadius: '4px',
                  color: '#fff'
                }}>BLE Active</span>
              ) : (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#6b7280',
                  borderRadius: '4px',
                  color: '#fff'
                }}>Backend Offline</span>
              )}
            </h4>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={handleBleScan}
                disabled={isScanning || !bleConnected}
                style={{
                  padding: '4px 12px',
                  backgroundColor: isScanning ? '#4b5563' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isScanning || !bleConnected ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: bleConnected ? 1 : 0.5
                }}
              >
                {isScanning ? 'Scanning...' : 'Scan BLE'}
              </button>
              <button
                onClick={() => setShowDevices(!showDevices)}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showDevices ? 'Hide' : 'Show'} Devices
              </button>
              {/* Demo Mode Toggle */}
              <button
                onClick={() => setDemoMode(!demoMode)}
                style={{
                  padding: '4px 12px',
                  backgroundColor: demoMode ? '#f59e0b' : '#374151',
                  color: '#fff',
                  border: demoMode ? '2px solid #fbbf24' : '2px solid transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: demoMode ? 'bold' : 'normal'
                }}
              >
                {demoMode ? '🎭 Demo ON' : 'Demo'}
              </button>
            </div>
          </div>

          {/* BLE Error Display */}
          {bleError && (
            <div style={{
              backgroundColor: '#dc2626',
              padding: '8px 12px',
              borderRadius: '4px',
              marginBottom: '12px'
            }}>
              <p style={{ color: '#fff', fontSize: '12px', margin: 0 }}>{bleError}</p>
            </div>
          )}

          {/* BLE Status */}
          {bleStatus && !bleStatus.available && (
            <div style={{
              backgroundColor: '#f59e0b',
              padding: '8px 12px',
              borderRadius: '4px',
              marginBottom: '12px'
            }}>
              <p style={{ color: '#fff', fontSize: '12px', margin: 0 }}>
                {bleStatus.message || 'BLE not available on this system'}
              </p>
            </div>
          )}

          {showDevices && (
            <div>
              {/* Discovered BLE Devices Section */}
              {discoveredBleDevices.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h5 style={{ color: '#888', fontSize: '12px', margin: '0 0 8px 0' }}>
                    Discovered BLE Health Devices ({discoveredBleDevices.length})
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {discoveredBleDevices.map(device => {
                      // Check if this device is already connected
                      const isDeviceConnected = devices.some(d => d.deviceId === device.address && d.status === 'connected')

                      return (
                        <div
                          key={device.address}
                          style={{
                            backgroundColor: isDeviceConnected ? '#1a3a2a' : '#1a1a1a',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: isDeviceConnected ? '1px solid #10b981' : '1px solid #333'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>
                              {device.deviceType === 'blood_pressure' ? '🩸' :
                                device.deviceType === 'pulse_oximeter' || device.deviceType === 'pulse_oximeter_quintic' ? '💨' :
                                  device.deviceType === 'heart_rate' ? '❤️' :
                                    device.deviceType === 'thermometer' ? '🌡️' : '📡'}
                            </span>
                            <div>
                              <p style={{ color: '#fff', margin: 0, fontSize: '13px' }}>{device.name}</p>
                              <p style={{ color: '#666', margin: '2px 0 0 0', fontSize: '10px' }}>
                                {device.address} • RSSI: {device.rssi}dBm • {device.deviceType.replace(/_/g, ' ')}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleBleConnect(device.address)}
                            disabled={isDeviceConnected}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: isDeviceConnected ? '#064e3b' : '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isDeviceConnected ? 'default' : 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            {isDeviceConnected ? '✓ Connected' : 'Connect'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Connected Devices */}
              {devices.length === 0 && discoveredBleDevices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                    No devices connected
                  </p>
                  <p style={{ color: '#555', fontSize: '12px', margin: '8px 0 0 0' }}>
                    {bleConnected
                      ? 'Click "Scan BLE" to discover nearby health devices'
                      : 'Backend server not running. Start the backend with BLE support (pip install bleak) to scan for real devices.'}
                  </p>
                  <button
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      backgroundColor: '#6b7280',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onClick={() => {
                      // Add demo devices for testing when BLE not available
                      setDevices([
                        {
                          deviceId: 'demo-bp-001',
                          name: 'Demo Blood Pressure Monitor',
                          type: 'blood_pressure',
                          protocol: 'http',
                          status: 'connected',
                          batteryLevel: 85
                        },
                        {
                          deviceId: 'demo-ox-001',
                          name: 'Demo Pulse Oximeter',
                          type: 'pulse_oximeter',
                          protocol: 'http',
                          status: 'connected',
                          batteryLevel: 92
                        }
                      ])
                    }}
                  >
                    + Add Demo Devices (Non-BLE)
                  </button>
                </div>
              ) : devices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {devices.map(device => (
                    <div
                      key={device.deviceId}
                      style={{
                        backgroundColor: '#2a2a2a',
                        padding: '12px',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>
                          {device.type === 'blood_pressure' ? '🩸' :
                            device.type === 'pulse_oximeter' ? '💨' :
                              device.type === 'thermometer' ? '🌡️' :
                                device.type === 'ecg' ? '📈' :
                                  device.type === 'wearable' ? '⌚' : '📡'}
                        </span>
                        <div>
                          <p style={{ color: '#fff', margin: 0, fontSize: '14px' }}>{device.name}</p>
                          <p style={{ color: '#666', margin: '2px 0 0 0', fontSize: '11px' }}>
                            {device.protocol.toUpperCase()} • {device.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {device.batteryLevel !== undefined && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '12px' }}>
                              {device.batteryLevel > 75 ? '🔋' : device.batteryLevel > 25 ? '🪫' : '⚠️'}
                            </span>
                            <span style={{ color: '#888', fontSize: '11px' }}>{device.batteryLevel}%</span>
                          </div>
                        )}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: device.status === 'connected' ? '#10b981' :
                              device.status === 'error' ? '#ef4444' : '#666'
                          }} />
                          <span style={{
                            color: device.status === 'connected' ? '#10b981' :
                              device.status === 'error' ? '#ef4444' : '#666',
                            fontSize: '11px',
                            textTransform: 'capitalize'
                          }}>
                            {device.status}
                          </span>
                        </div>
                        {deviceReadings.get(device.deviceId) && (
                          <span style={{ color: '#888', fontSize: '10px' }}>
                            Last: {new Date(deviceReadings.get(device.deviceId)!.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Device Protocol Info */}
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                backgroundColor: '#1a1a1a',
                borderRadius: '4px'
              }}>
                <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>
                  Supported protocols: Bluetooth LE, HTTP/REST, WebSocket, MQTT, CoAP
                </p>
              </div>
            </div>
          )}

          {!showDevices && devices.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center'
              }}>
                {devices.slice(0, 3).map(device => (
                  <span key={device.deviceId} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: device.status === 'connected' ? '#10b981' : '#666',
                    marginRight: '4px'
                  }} />
                ))}
              </div>
              <span style={{ color: '#888', fontSize: '12px' }}>
                {devices.filter(d => d.status === 'connected').length} of {devices.length} devices connected
              </span>
            </div>
          )}
        </div>
      )}

      {/* Data Source */}
      <div style={{
        marginTop: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: '#666', fontSize: '11px' }}>
          Data source: {bleConnected ? 'BLE Devices' : 'Apple Watch'} • Last updated: {new Date().toLocaleTimeString()}
          {bleConnected && bleStatus?.connectedDevices?.length ? ` • ${bleStatus.connectedDevices.length} active` : ''}
        </span>
        <span style={{ color: '#666', fontSize: '11px' }}>
          Patient ID: {patientId}
        </span>
      </div>
    </div>
  )
}
