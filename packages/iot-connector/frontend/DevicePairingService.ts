/**
 * Device Pairing Service
 *
 * Secure pairing flow for bedside devices and nurse stations.
 * Ensures only authorized devices can communicate over hospital Wi-Fi.
 *
 * Flow:
 * 1. Device generates a pairing code (6-digit)
 * 2. Code displayed on device screen
 * 3. Nurse station enters code to verify
 * 4. Server validates and creates secure session
 * 5. Devices receive shared secret for encrypted communication
 */

import { MedicalDataPersistence } from '@/services/MedicalDataPersistence'

// Types
export interface DeviceInfo {
  deviceId: string
  deviceType: 'bedside' | 'nurse_station' | 'mobile' | 'tablet'
  deviceName: string
  location: string
  capabilities: string[]
  firmwareVersion?: string
  lastSeen: string
}

export interface PairingRequest {
  requestId: string
  deviceId: string
  deviceType: DeviceInfo['deviceType']
  deviceName: string
  location: string
  pairingCode: string
  expiresAt: string
  status: 'pending' | 'verified' | 'expired' | 'rejected'
}

export interface PairedDevice {
  deviceId: string
  deviceType: DeviceInfo['deviceType']
  deviceName: string
  location: string
  pairedAt: string
  pairedBy: string
  sessionToken: string
  sharedSecret: string
  lastVerified: string
  trusted: boolean
}

export interface PairingSession {
  sessionId: string
  deviceA: string  // Initiating device
  deviceB: string  // Responding device
  createdAt: string
  expiresAt: string
  sharedSecret: string
  verified: boolean
}

// Configuration
const PAIRING_CONFIG = {
  codeLength: 6,
  codeExpiry: 300000, // 5 minutes
  sessionExpiry: 86400000 * 30, // 30 days
  maxPairingAttempts: 3,
  verificationInterval: 3600000, // Re-verify every hour
  storageKey: 'eve_paired_devices'
}

/**
 * Generates a cryptographically secure random string
 */
function generateSecureRandom(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generates a 6-digit pairing code
 */
function generatePairingCode(): string {
  const array = new Uint8Array(3)
  crypto.getRandomValues(array)
  const num = (array[0] << 16) | (array[1] << 8) | array[2]
  return String(num % 1000000).padStart(6, '0')
}

/**
 * Derives a shared secret from the pairing code and device IDs
 * @remarks Reserved for future encrypted communication implementation
 */
async function _deriveSharedSecret(
  pairingCode: string,
  deviceA: string,
  deviceB: string
): Promise<string> {
  const data = `${pairingCode}:${deviceA}:${deviceB}:${Date.now()}`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Device Pairing Service
 *
 * Handles secure pairing between hospital devices.
 */
export class DevicePairingService {
  private deviceId: string
  private deviceType: DeviceInfo['deviceType']
  private deviceName: string
  private location: string
  private pairedDevices: Map<string, PairedDevice> = new Map()
  private pendingRequests: Map<string, PairingRequest> = new Map()
  private persistence: MedicalDataPersistence | null = null
  private wsConnection: WebSocket | null = null

  constructor(
    deviceId: string,
    deviceType: DeviceInfo['deviceType'],
    deviceName: string,
    location: string
  ) {
    this.deviceId = deviceId
    this.deviceType = deviceType
    this.deviceName = deviceName
    this.location = location

    this.loadPairedDevices()
  }

  /**
   * Initialize the service with persistence
   */
  async initialize(): Promise<void> {
    try {
      this.persistence = MedicalDataPersistence.getInstance()
      await this.persistence.initialize({
        hospitalServerUrl: window.location.origin,
        stationId: this.deviceId,
        userId: 'pairing-service'
      })
      await this.loadPairedDevices()
      this.connectToServer()
    } catch (error) {
      console.error('Failed to initialize DevicePairingService:', error)
    }
  }

  /**
   * Load paired devices from storage
   */
  private async loadPairedDevices(): Promise<void> {
    try {
      const stored = localStorage.getItem(PAIRING_CONFIG.storageKey)
      if (stored) {
        const devices: PairedDevice[] = JSON.parse(stored)
        devices.forEach(device => {
          this.pairedDevices.set(device.deviceId, device)
        })
      }
    } catch (error) {
      console.error('Failed to load paired devices:', error)
    }
  }

  /**
   * Save paired devices to storage
   */
  private savePairedDevices(): void {
    try {
      const devices = Array.from(this.pairedDevices.values())
      localStorage.setItem(PAIRING_CONFIG.storageKey, JSON.stringify(devices))
    } catch (error) {
      console.error('Failed to save paired devices:', error)
    }
  }

  /**
   * Connect to pairing server
   */
  private connectToServer(): void {
    const wsUrl = `ws://${window.location.hostname}:8001/api/medical/ws/pairing/${this.deviceId}`

    try {
      this.wsConnection = new WebSocket(wsUrl)

      this.wsConnection.onopen = () => {
        console.log('Pairing WebSocket connected')
        // Register device
        this.wsConnection?.send(JSON.stringify({
          type: 'REGISTER_DEVICE',
          deviceId: this.deviceId,
          deviceType: this.deviceType,
          deviceName: this.deviceName,
          location: this.location
        }))
      }

      this.wsConnection.onmessage = (event) => {
        const data = JSON.parse(event.data)
        this.handleServerMessage(data)
      }

      this.wsConnection.onclose = () => {
        console.log('Pairing WebSocket disconnected, reconnecting...')
        setTimeout(() => this.connectToServer(), 5000)
      }

      this.wsConnection.onerror = (error) => {
        console.error('Pairing WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect to pairing server:', error)
    }
  }

  /**
   * Handle messages from pairing server
   */
  private async handleServerMessage(data: any): Promise<void> {
    switch (data.type) {
      case 'PAIRING_REQUEST':
        // Another device wants to pair with us
        await this.handleIncomingPairingRequest(data)
        break

      case 'PAIRING_VERIFIED':
        // Pairing was successful
        await this.handlePairingVerified(data)
        break

      case 'PAIRING_REJECTED':
        // Pairing was rejected
        this.handlePairingRejected(data)
        break

      case 'VERIFICATION_REQUIRED':
        // Need to re-verify a paired device
        await this.handleVerificationRequired(data)
        break

      case 'DEVICE_UNPAIRED':
        // A paired device was removed
        this.handleDeviceUnpaired(data)
        break
    }
  }

  // =========================================================================
  // Pairing Flow - Initiator Side
  // =========================================================================

  /**
   * Start pairing process (initiator)
   * Generates a pairing code to display
   */
  startPairing(): PairingRequest {
    const pairingCode = generatePairingCode()
    const requestId = generateSecureRandom(16)

    const request: PairingRequest = {
      requestId,
      deviceId: this.deviceId,
      deviceType: this.deviceType,
      deviceName: this.deviceName,
      location: this.location,
      pairingCode,
      expiresAt: new Date(Date.now() + PAIRING_CONFIG.codeExpiry).toISOString(),
      status: 'pending'
    }

    this.pendingRequests.set(requestId, request)

    // Register with server
    this.wsConnection?.send(JSON.stringify({
      type: 'CREATE_PAIRING_REQUEST',
      request
    }))

    // Auto-expire
    setTimeout(() => {
      if (this.pendingRequests.has(requestId)) {
        this.pendingRequests.get(requestId)!.status = 'expired'
        this.pendingRequests.delete(requestId)
      }
    }, PAIRING_CONFIG.codeExpiry)

    return request
  }

  /**
   * Cancel an active pairing request
   */
  cancelPairing(requestId: string): void {
    if (this.pendingRequests.has(requestId)) {
      this.pendingRequests.delete(requestId)
      this.wsConnection?.send(JSON.stringify({
        type: 'CANCEL_PAIRING',
        requestId
      }))
    }
  }

  // =========================================================================
  // Pairing Flow - Responder Side
  // =========================================================================

  /**
   * Enter a pairing code to connect to another device
   */
  async enterPairingCode(code: string): Promise<{ success: boolean; error?: string }> {
    if (code.length !== PAIRING_CONFIG.codeLength) {
      return { success: false, error: 'Invalid code length' }
    }

    // Send to server for verification
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Verification timeout' })
      }, 30000)

      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data)

        if (data.type === 'PAIRING_CODE_RESULT') {
          clearTimeout(timeout)
          this.wsConnection?.removeEventListener('message', handler as any)

          if (data.success) {
            resolve({ success: true })
          } else {
            resolve({ success: false, error: data.error || 'Invalid code' })
          }
        }
      }

      this.wsConnection?.addEventListener('message', handler as any)

      this.wsConnection?.send(JSON.stringify({
        type: 'VERIFY_PAIRING_CODE',
        code,
        fromDeviceId: this.deviceId,
        fromDeviceName: this.deviceName,
        fromDeviceType: this.deviceType,
        fromLocation: this.location
      }))
    })
  }

  /**
   * Handle incoming pairing request
   */
  private async handleIncomingPairingRequest(data: any): Promise<void> {
    // This is called when another device enters our pairing code
    const request = this.pendingRequests.get(data.requestId)

    if (!request) {
      // We didn't initiate this - someone entered a code
      // Notify UI of incoming pairing request
      window.dispatchEvent(new CustomEvent('pairing-request', {
        detail: {
          requestId: data.requestId,
          fromDevice: data.fromDevice,
          fromDeviceName: data.fromDeviceName,
          fromDeviceType: data.fromDeviceType
        }
      }))
    }
  }

  /**
   * Accept an incoming pairing request
   */
  async acceptPairingRequest(requestId: string): Promise<void> {
    this.wsConnection?.send(JSON.stringify({
      type: 'ACCEPT_PAIRING',
      requestId,
      deviceId: this.deviceId
    }))
  }

  /**
   * Reject an incoming pairing request
   */
  rejectPairingRequest(requestId: string): void {
    this.wsConnection?.send(JSON.stringify({
      type: 'REJECT_PAIRING',
      requestId,
      deviceId: this.deviceId
    }))
  }

  /**
   * Handle successful pairing verification
   */
  private async handlePairingVerified(data: any): Promise<void> {
    const pairedDevice: PairedDevice = {
      deviceId: data.pairedDeviceId,
      deviceType: data.deviceType,
      deviceName: data.deviceName,
      location: data.location,
      pairedAt: new Date().toISOString(),
      pairedBy: this.deviceId,
      sessionToken: data.sessionToken,
      sharedSecret: data.sharedSecret,
      lastVerified: new Date().toISOString(),
      trusted: true
    }

    this.pairedDevices.set(pairedDevice.deviceId, pairedDevice)
    this.savePairedDevices()

    // Clean up pending request
    for (const [id, request] of this.pendingRequests) {
      if (request.deviceId === this.deviceId) {
        this.pendingRequests.delete(id)
      }
    }

    // Notify UI
    window.dispatchEvent(new CustomEvent('device-paired', {
      detail: pairedDevice
    }))
  }

  /**
   * Handle pairing rejection
   */
  private handlePairingRejected(data: any): void {
    window.dispatchEvent(new CustomEvent('pairing-rejected', {
      detail: { deviceId: data.deviceId, reason: data.reason }
    }))
  }

  /**
   * Handle verification required
   */
  private async handleVerificationRequired(data: any): Promise<void> {
    const device = this.pairedDevices.get(data.deviceId)
    if (device) {
      // Re-verify the device
      window.dispatchEvent(new CustomEvent('verification-required', {
        detail: { device }
      }))
    }
  }

  /**
   * Handle device unpaired
   */
  private handleDeviceUnpaired(data: any): void {
    this.pairedDevices.delete(data.deviceId)
    this.savePairedDevices()

    window.dispatchEvent(new CustomEvent('device-unpaired', {
      detail: { deviceId: data.deviceId }
    }))
  }

  // =========================================================================
  // Device Management
  // =========================================================================

  /**
   * Get all paired devices
   */
  getPairedDevices(): PairedDevice[] {
    return Array.from(this.pairedDevices.values())
  }

  /**
   * Check if a device is paired
   */
  isDevicePaired(deviceId: string): boolean {
    return this.pairedDevices.has(deviceId)
  }

  /**
   * Get paired device info
   */
  getPairedDevice(deviceId: string): PairedDevice | undefined {
    return this.pairedDevices.get(deviceId)
  }

  /**
   * Unpair a device
   */
  unpairDevice(deviceId: string): void {
    if (this.pairedDevices.has(deviceId)) {
      this.pairedDevices.delete(deviceId)
      this.savePairedDevices()

      this.wsConnection?.send(JSON.stringify({
        type: 'UNPAIR_DEVICE',
        deviceId
      }))
    }
  }

  /**
   * Verify a paired device is still valid
   */
  async verifyPairedDevice(deviceId: string): Promise<boolean> {
    const device = this.pairedDevices.get(deviceId)
    if (!device) return false

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 10000)

      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data)

        if (data.type === 'DEVICE_VERIFIED' && data.deviceId === deviceId) {
          clearTimeout(timeout)
          this.wsConnection?.removeEventListener('message', handler as any)

          device.lastVerified = new Date().toISOString()
          this.savePairedDevices()

          resolve(data.valid)
        }
      }

      this.wsConnection?.addEventListener('message', handler as any)

      this.wsConnection?.send(JSON.stringify({
        type: 'VERIFY_DEVICE',
        deviceId,
        sessionToken: device.sessionToken
      }))
    })
  }

  /**
   * Get session token for communication with a paired device
   */
  getSessionToken(deviceId: string): string | null {
    const device = this.pairedDevices.get(deviceId)
    return device?.sessionToken || null
  }

  /**
   * Get shared secret for encrypted communication
   */
  getSharedSecret(deviceId: string): string | null {
    const device = this.pairedDevices.get(deviceId)
    return device?.sharedSecret || null
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close()
      this.wsConnection = null
    }
  }
}

// Export singleton factory
let _pairingService: DevicePairingService | null = null

export function getDevicePairingService(
  deviceId?: string,
  deviceType?: DeviceInfo['deviceType'],
  deviceName?: string,
  location?: string
): DevicePairingService {
  if (!_pairingService && deviceId && deviceType && deviceName && location) {
    _pairingService = new DevicePairingService(deviceId, deviceType, deviceName, location)
  }
  return _pairingService!
}
