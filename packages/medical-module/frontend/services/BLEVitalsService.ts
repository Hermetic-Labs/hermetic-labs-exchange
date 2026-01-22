/**
 * BLE Vitals Service
 *
 * Frontend service for connecting to the medical-module backend's BLE endpoints.
 * Handles device scanning, connection, and real-time vitals streaming.
 *
 * Usage:
 *   const bleService = new BLEVitalsService();
 *   await bleService.connect();
 *   const devices = await bleService.scanForDevices();
 *   await bleService.connectToDevice(devices[0].address);
 *   bleService.onVitalsReading((reading) => console.log(reading));
 */

import { EventEmitter } from '../../../_shared/EventEmitter';

// =============================================================================
// Types
// =============================================================================

export interface BLEDevice {
  address: string;
  name: string;
  rssi: number;
  deviceType: 'pulse_oximeter' | 'pulse_oximeter_quintic' | 'blood_pressure' | 'heart_rate' | 'thermometer' | 'quintic_device' | 'unknown';
  services: string[];
  lastSeen: string;
}

export interface VitalsReading {
  deviceId: string;
  deviceType: string;
  readings: {
    // Pulse Oximeter
    spo2?: number;
    pulseRate?: number;
    pulseAmplitudeIndex?: number;
    // Blood Pressure
    systolic?: number;
    diastolic?: number;
    meanArterialPressure?: number;
    // Heart Rate
    heartRate?: number;
    rrIntervals?: number[];
    // Common
    timestamp?: string;
    deviceAddress?: string;
    deviceName?: string;
  };
  timestamp: string;
}

export interface BLEStatus {
  available: boolean;
  bleakInstalled: boolean;
  message: string;
  connectedDevices: ConnectedDeviceInfo[];
  discoveredDevices: BLEDevice[];
}

export interface ConnectedDeviceInfo {
  address: string;
  name: string;
  deviceType: string;
  connectedAt: string;
  lastReading: string | null;
  readingCount: number;
}

export interface ScanResult {
  devices: BLEDevice[];
  count: number;
  scanDuration: number;
}

// WebSocket message types
type WSMessageType =
  | 'STATUS'
  | 'SCAN_STARTED'
  | 'SCAN_COMPLETE'
  | 'DEVICE_CONNECTED'
  | 'DEVICE_DISCONNECTED'
  | 'SUBSCRIBE_RESULT'
  | 'VITALS_READING'
  | 'DISCOVER_RESULT'
  | 'ERROR';

interface WSMessage {
  type: WSMessageType;
  [key: string]: any;
}

// =============================================================================
// BLE Vitals Service
// =============================================================================

export class BLEVitalsService extends EventEmitter {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private apiUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private pendingCallbacks: Map<string, (data: any) => void> = new Map();

  // Cached state
  private _isConnected = false;
  private _bleAvailable = false;
  private _connectedDevices: ConnectedDeviceInfo[] = [];
  private _discoveredDevices: BLEDevice[] = [];

  constructor(baseUrl?: string) {
    super();

    // Determine API URL from environment or default
    const base = baseUrl || this.getApiBase();
    this.apiUrl = `${base}/marketplace/modules/medical-module/medical`;
    this.wsUrl = `${base.replace('http', 'ws')}/marketplace/modules/medical-module/medical/ws/vitals-stream`;

    console.log('[BLEVitalsService] Initialized with:', {
      base,
      apiUrl: this.apiUrl,
      wsUrl: this.wsUrl
    });
  }

  private getApiBase(): string {
    // Try to get from environment or use default
    if (typeof window !== 'undefined') {
      // Check for Vite env
      const viteUrl = (import.meta as any)?.env?.VITE_API_URL;
      if (viteUrl) {
        console.log('[BLEVitalsService] Using VITE_API_URL:', viteUrl);
        return viteUrl;
      }

      // Check for window global
      const globalUrl = (window as any).__EVE_API_URL__;
      if (globalUrl) {
        console.log('[BLEVitalsService] Using __EVE_API_URL__:', globalUrl);
        return globalUrl;
      }

      // In development (Vite dev server), use current origin to go through proxy
      // This allows WebSocket connections to work via Vite's proxy
      const isDev = (import.meta as any)?.env?.DEV;
      console.log('[BLEVitalsService] isDev check:', isDev, 'origin:', window.location.origin);
      if (isDev) {
        return window.location.origin;
      }
    }

    // Default to localhost:8001 (production or fallback)
    console.log('[BLEVitalsService] Falling back to localhost:8001');
    return 'http://localhost:8001';
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  get isConnected(): boolean {
    return this._isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  get bleAvailable(): boolean {
    return this._bleAvailable;
  }

  get connectedDevices(): ConnectedDeviceInfo[] {
    return [...this._connectedDevices];
  }

  get discoveredDevices(): BLEDevice[] {
    return [...this._discoveredDevices];
  }

  /**
   * Connect to the vitals WebSocket stream
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) return true;
    if (this.isConnecting) return false;

    this.isConnecting = true;
    console.log('[BLEVitalsService] Connecting to WebSocket:', this.wsUrl);

    return new Promise((resolve) => {
      let resolved = false;
      const safeResolve = (value: boolean) => {
        if (!resolved) {
          resolved = true;
          resolve(value);
        }
      };

      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('[BLEVitalsService] WebSocket connected successfully');
          this._isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit('connected');
          safeResolve(true);
        };

        this.ws.onclose = (event) => {
          console.log('[BLEVitalsService] WebSocket closed:', event.code, event.reason);
          this._isConnected = false;
          this.isConnecting = false;
          this.emit('disconnected');
          // Only resolve to false if we were still trying to connect
          safeResolve(false);
          // Only attempt reconnect if this wasn't the initial connection attempt
          if (!resolved || this.reconnectAttempts > 0) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[BLEVitalsService] WebSocket error:', error);
          this.emit('error', error);
          // Connection errors resolve to false
          safeResolve(false);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // Timeout for connection
        setTimeout(() => {
          if (this.isConnecting) {
            console.log('[BLEVitalsService] Connection timeout after 5s');
            this.isConnecting = false;
            this.ws?.close();
            safeResolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('[BLEVitalsService] Connection error:', error);
        this.isConnecting = false;
        safeResolve(false);
      }
    });
  }

  /**
   * Disconnect from the vitals stream
   */
  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnect
    this.isConnecting = false; // Reset connecting state
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
    // Reset reconnect attempts after disconnect so future connects can retry
    // Use setTimeout to allow any pending reconnect attempts to be cancelled
    setTimeout(() => {
      this.reconnectAttempts = 0;
    }, 100);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(`[BLEVitalsService] Reconnect attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }

  // ===========================================================================
  // Message Handling
  // ===========================================================================

  private handleMessage(data: string): void {
    try {
      const message: WSMessage = JSON.parse(data);

      switch (message.type) {
        case 'STATUS':
          this._bleAvailable = message.bleAvailable;
          this._connectedDevices = message.connectedDevices || [];
          this._discoveredDevices = message.discoveredDevices || [];
          this.emit('status', message);
          break;

        case 'SCAN_STARTED':
          this.emit('scanStarted', { timeout: message.timeout });
          break;

        case 'SCAN_COMPLETE':
          this._discoveredDevices = message.devices || [];
          this.emit('scanComplete', {
            devices: message.devices,
            count: message.count,
          });
          break;

        case 'DEVICE_CONNECTED':
          this.emit('deviceConnected', {
            deviceId: message.deviceId,
            deviceName: message.deviceName,
            deviceType: message.deviceType,
          });
          break;

        case 'DEVICE_DISCONNECTED':
          this.emit('deviceDisconnected', {
            deviceId: message.deviceId,
          });
          break;

        case 'SUBSCRIBE_RESULT':
          this.emit('subscribeResult', {
            deviceId: message.deviceId,
            subscribed: message.subscribed,
          });
          break;

        case 'VITALS_READING':
          const reading: VitalsReading = {
            deviceId: message.deviceId,
            deviceType: message.deviceType,
            readings: message.readings,
            timestamp: message.timestamp,
          };
          this.emit('vitalsReading', reading);
          break;

        case 'DISCOVER_RESULT':
          // Log discovered services for debugging
          console.log('[BLEVitalsService] DISCOVER_RESULT for device:', message.deviceId);
          console.log('[BLEVitalsService] Device name:', message.name);
          console.log('[BLEVitalsService] Device type:', message.deviceType);
          if (message.services) {
            console.log('[BLEVitalsService] Services discovered:');
            message.services.forEach((service: any) => {
              console.log(`  Service: ${service.uuid} (${service.description})`);
              service.characteristics?.forEach((char: any) => {
                console.log(`    Characteristic: ${char.uuid}`);
                console.log(`      Description: ${char.description}`);
                console.log(`      Properties: ${char.properties?.join(', ')}`);
                if (char.value) {
                  console.log(`      Value: ${char.value}`);
                }
              });
            });
          }
          if (message.error) {
            console.error('[BLEVitalsService] Discovery error:', message.error);
          }
          this.emit('discoverResult', message);
          break;

        case 'ERROR':
          console.error('[BLEVitalsService] Error:', message.message);
          this.emit('error', new Error(message.message));
          break;
      }

      // Resolve any pending callbacks
      const callback = this.pendingCallbacks.get(message.type);
      if (callback) {
        callback(message);
        this.pendingCallbacks.delete(message.type);
      }

    } catch (error) {
      console.error('[BLEVitalsService] Message parse error:', error);
    }
  }

  private send(message: object): boolean {
    if (!this.isConnected) {
      console.warn('[BLEVitalsService] Not connected');
      return false;
    }

    try {
      this.ws!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[BLEVitalsService] Send error:', error);
      return false;
    }
  }

  // ===========================================================================
  // Device Operations
  // ===========================================================================

  /**
   * Scan for BLE health devices
   */
  async scanForDevices(timeout: number = 10): Promise<BLEDevice[]> {
    console.log('[BLEVitalsService] scanForDevices called, isConnected:', this.isConnected);
    if (!this.isConnected) {
      console.log('[BLEVitalsService] Not connected, connecting first...');
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      console.log('[BLEVitalsService] Setting up scan callbacks...');

      // Set up callback for scan complete
      this.pendingCallbacks.set('SCAN_COMPLETE', (data) => {
        console.log('[BLEVitalsService] SCAN_COMPLETE received:', data);
        resolve(data.devices || []);
      });

      // Timeout
      const timeoutId = setTimeout(() => {
        console.log('[BLEVitalsService] Scan timeout reached');
        this.pendingCallbacks.delete('SCAN_COMPLETE');
        reject(new Error('Scan timeout'));
      }, (timeout + 5) * 1000);

      // Clean up timeout on success
      const originalCallback = this.pendingCallbacks.get('SCAN_COMPLETE');
      this.pendingCallbacks.set('SCAN_COMPLETE', (data) => {
        clearTimeout(timeoutId);
        originalCallback?.(data);
      });

      // Send scan request
      console.log('[BLEVitalsService] Sending SCAN message with timeout:', timeout);
      if (!this.send({ type: 'SCAN', timeout })) {
        console.error('[BLEVitalsService] Failed to send SCAN message');
        clearTimeout(timeoutId);
        reject(new Error('Failed to send scan request'));
      }
    });
  }

  /**
   * Connect to a specific BLE device
   */
  async connectToDevice(deviceAddress: string): Promise<boolean> {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve) => {
      // Listen for connection result
      const handleConnected = (data: any) => {
        if (data.deviceId === deviceAddress) {
          this.off('deviceConnected', handleConnected);
          this.off('error', handleError);
          resolve(true);
        }
      };

      const handleError = (error: any) => {
        this.off('deviceConnected', handleConnected);
        this.off('error', handleError);
        resolve(false);
      };

      this.on('deviceConnected', handleConnected);
      this.on('error', handleError);

      // Timeout
      setTimeout(() => {
        this.off('deviceConnected', handleConnected);
        this.off('error', handleError);
        resolve(false);
      }, 30000);

      // Send connect request
      this.send({ type: 'CONNECT', deviceAddress });
    });
  }

  /**
   * Disconnect from a BLE device
   */
  async disconnectDevice(deviceAddress: string): Promise<void> {
    this.send({ type: 'DISCONNECT', deviceAddress });
  }

  /**
   * Subscribe to measurements from a connected device
   */
  async subscribeToDevice(deviceAddress: string): Promise<boolean> {
    return new Promise((resolve) => {
      const handleResult = (data: any) => {
        if (data.deviceId === deviceAddress) {
          this.off('subscribeResult', handleResult);
          resolve(data.subscribed);
        }
      };

      this.on('subscribeResult', handleResult);

      // Timeout
      setTimeout(() => {
        this.off('subscribeResult', handleResult);
        resolve(false);
      }, 10000);

      this.send({ type: 'SUBSCRIBE', deviceAddress });
    });
  }

  /**
   * Connect and subscribe to a device in one call
   */
  async connectAndStream(deviceAddress: string): Promise<boolean> {
    const connected = await this.connectToDevice(deviceAddress);
    if (!connected) return false;

    return await this.subscribeToDevice(deviceAddress);
  }

  /**
   * Get current status
   */
  requestStatus(): void {
    this.send({ type: 'GET_STATUS' });
  }

  // ===========================================================================
  // Event Subscriptions (Convenience Methods)
  // ===========================================================================

  /**
   * Subscribe to vitals readings
   */
  onVitalsReading(callback: (reading: VitalsReading) => void): () => void {
    this.on('vitalsReading', callback);
    return () => this.off('vitalsReading', callback);
  }

  /**
   * Subscribe to device connection events
   */
  onDeviceConnected(callback: (data: { deviceId: string; deviceName: string; deviceType: string }) => void): () => void {
    this.on('deviceConnected', callback);
    return () => this.off('deviceConnected', callback);
  }

  /**
   * Subscribe to device disconnection events
   */
  onDeviceDisconnected(callback: (data: { deviceId: string }) => void): () => void {
    this.on('deviceDisconnected', callback);
    return () => this.off('deviceDisconnected', callback);
  }

  /**
   * Subscribe to scan completion
   */
  onScanComplete(callback: (data: { devices: BLEDevice[]; count: number }) => void): () => void {
    this.on('scanComplete', callback);
    return () => this.off('scanComplete', callback);
  }

  /**
   * Subscribe to errors
   */
  onError(callback: (error: Error) => void): () => void {
    this.on('error', callback);
    return () => this.off('error', callback);
  }

  // ===========================================================================
  // REST API Methods (Alternative to WebSocket)
  // ===========================================================================

  /**
   * Check BLE status via REST API
   */
  async getStatus(): Promise<BLEStatus> {
    const response = await fetch(`${this.apiUrl}/ble/status`);
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Scan for devices via REST API
   */
  async scanViaRest(timeout: number = 10, healthOnly: boolean = true): Promise<ScanResult> {
    const params = new URLSearchParams({
      timeout: timeout.toString(),
      health_only: healthOnly.toString(),
    });

    const response = await fetch(`${this.apiUrl}/ble/scan?${params}`);
    if (!response.ok) {
      throw new Error(`Scan failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Connect to device via REST API
   */
  async connectViaRest(deviceAddress: string): Promise<{ connected: boolean; message: string }> {
    const response = await fetch(`${this.apiUrl}/ble/connect/${encodeURIComponent(deviceAddress)}`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Connection failed');
    }
    return response.json();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _instance: BLEVitalsService | null = null;

export function getBLEVitalsService(): BLEVitalsService {
  if (!_instance) {
    _instance = new BLEVitalsService();
  }
  return _instance;
}

export default BLEVitalsService;
