/**
 * Device Discovery Module
 * 
 * Network device discovery and capability mapping system.
 * Scans networks for IoT devices and builds comprehensive device catalogs.
 */

import { DeviceCategory, DeviceProtocol, DiscoveredDevice, NetworkConfig } from './IoTDeviceAdapter';

// Discovery Methods
export type DiscoveryMethod = 'mdns' | 'ssdp' | 'ping_sweep' | 'bluetooth_scan' | 'custom';

// Discovery Configuration
export interface DiscoveryConfig {
  methods: DiscoveryMethod[];
  networks: NetworkConfig[];
  timeout: number;
  concurrentScans: number;
  deviceTypes: string[];
  categories: DeviceCategory[];
  excludeDevices?: string[];
  customScanners?: CustomScanner[];
}

// Custom Scanner Interface
export interface CustomScanner {
  name: string;
  protocol: DeviceProtocol;
  scanner: (config: NetworkConfig) => Promise<DiscoveredDevice[]>;
  priority: number;
}

// Discovery Result
export interface DiscoveryResult {
  success: boolean;
  devices: DiscoveredDevice[];
  scanTime: number;
  methods: DiscoveryMethod[];
  networks: string[];
  errors: DiscoveryError[];
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
}

// Discovery Error
export interface DiscoveryError {
  method: DiscoveryMethod;
  network: string;
  error: string;
  code: string;
}

// Device Capability Mapping
export interface CapabilityMapping {
  deviceType: string;
  manufacturer: string;
  capabilities: string[];
  endpoints: string[];
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  documentation?: string;
  icon?: string;
  category: DeviceCategory;
}

// MDNS Discovery Scanner
export class MDNSScanner {
  async scan(networkConfig: NetworkConfig): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];

    // In a real implementation, this would use mdns-js or similar
    // For now, we'll simulate the discovery process

    try {
      // Simulate MDNS service discovery for common IoT devices
      const services = [
        { type: '_http._tcp', name: 'Smart Light Controller' },
        { type: '_ipps._tcp', name: 'Smart Printer' },
        { type: '_airplay._tcp', name: 'Apple TV' },
        { type: '_airport._tcp', name: 'Airport Express' },
        { type: '_raop._tcp', name: 'Airport Express Audio' },
        { type: '_smb._tcp', name: 'SMB Network Share' },
        { type: '_ftp._tcp', name: 'FTP Server' },
        { type: '_ssh._tcp', name: 'SSH Service' }
      ];

      for (const service of services) {
        if (Math.random() > 0.7) { // Simulate 30% chance of finding each service
          const device = this.createDiscoveredDevice(
            service.name,
            service.type,
            networkConfig,
            'mdns'
          );
          devices.push(device);
        }
      }

    } catch (error) {
      console.error('MDNS scan error:', error);
    }

    return devices;
  }

  private createDiscoveredDevice(name: string, serviceType: string, config: NetworkConfig, method: string): DiscoveredDevice {
    const deviceId = `${method}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const localIp = config.baseUrl || this.generateRandomIP();

    return {
      deviceId,
      name: `${name} (${localIp})`,
      type: this.mapServiceToDeviceType(serviceType),
      category: this.mapServiceToCategory(serviceType),
      protocol: this.mapServiceToProtocol(serviceType),
      capabilities: this.inferCapabilities(name, serviceType),
      status: 'online',
      networkInfo: {
        ip: localIp,
        protocol: this.mapServiceToProtocol(serviceType),
        manufacturer: this.inferManufacturer(name, serviceType)
      },
      lastSeen: new Date(),
      signalStrength: 85 + Math.random() * 15
    };
  }

  private mapServiceToDeviceType(serviceType: string): string {
    const mapping: Record<string, string> = {
      '_http._tcp': 'web_device',
      '_ipps._tcp': 'printer',
      '_airplay._tcp': 'media_player',
      '_airport._tcp': 'wifi_access_point',
      '_raop._tcp': 'audio_device',
      '_smb._tcp': 'network_storage',
      '_ftp._tcp': 'ftp_server',
      '_ssh._tcp': 'ssh_service'
    };

    return mapping[serviceType] || 'unknown_device';
  }

  private mapServiceToCategory(serviceType: string): DeviceCategory {
    const mapping: Record<string, DeviceCategory> = {
      '_http._tcp': 'personal',
      '_ipps._tcp': 'infrastructure',
      '_airplay._tcp': 'personal',
      '_airport._tcp': 'infrastructure',
      '_raop._tcp': 'personal',
      '_smb._tcp': 'infrastructure',
      '_ftp._tcp': 'infrastructure',
      '_ssh._tcp': 'infrastructure'
    };

    return mapping[serviceType] || 'personal';
  }

  private mapServiceToProtocol(serviceType: string): DeviceProtocol {
    const mapping: Record<string, DeviceProtocol> = {
      '_http._tcp': 'http',
      '_ipps._tcp': 'http',
      '_airplay._tcp': 'http',
      '_airport._tcp': 'http',
      '_raop._tcp': 'websocket',
      '_smb._tcp': 'http',
      '_ftp._tcp': 'http',
      '_ssh._tcp': 'local'
    };

    return mapping[serviceType] || 'http';
  }

  private inferCapabilities(name: string, serviceType: string): string[] {
    const capabilities: Record<string, string[]> = {
      '_http._tcp': ['status', 'control'],
      '_ipps._tcp': ['print_status', 'print_control', 'maintenance'],
      '_airplay._tcp': ['playback_control', 'volume_control', 'metadata'],
      '_airport._tcp': ['network_status', 'configuration'],
      '_raop._tcp': ['audio_control', 'metadata'],
      '_smb._tcp': ['file_access', 'storage_status'],
      '_ftp._tcp': ['file_transfer', 'directory_access'],
      '_ssh._tcp': ['remote_access', 'command_execution']
    };

    return capabilities[serviceType] || ['basic_control'];
  }

  private inferManufacturer(name: string, serviceType: string): string {
    const manufacturer = 'Unknown';
    if (name.includes('Apple')) return 'Apple Inc.';
    if (name.includes('LG') || name.includes('Samsung')) return name.split(' ')[0];
    return manufacturer;
  }

  private generateRandomIP(): string {
    const subnet = Math.random() > 0.5 ? '192.168.1' : '192.168.0';
    const host = Math.floor(Math.random() * 254) + 1;
    return `${subnet}.${host}`;
  }
}

// SSDP Discovery Scanner
export class SSDPScanner {
  async scan(networkConfig: NetworkConfig): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];

    try {
      // Simulate SSDP/UPnP device discovery
      const upnpDevices = [
        { name: 'Samsung Smart TV', type: 'urn:schemas-upnp-org:device:MediaRenderer:1' },
        { name: 'LG Smart TV', type: 'urn:schemas-upnp-org:device:MediaRenderer:1' },
        { name: 'Roku Streaming Device', type: 'urn:dial-multiscreen-org:device:dial:1' },
        { name: 'Samsung Router', type: 'urn:schemas-upnp-org:device:WANDevice:1' },
        { name: 'Xiaomi Mi Home', type: 'urn:schemas-upnp-org:device:Basic:1' }
      ];

      for (const device of upnpDevices) {
        if (Math.random() > 0.6) { // Simulate 40% chance of finding each device
          const discovered = this.createSSDPDevice(device, networkConfig);
          devices.push(discovered);
        }
      }

    } catch (error) {
      console.error('SSDP scan error:', error);
    }

    return devices;
  }

  private createSSDPDevice(device: any, config: NetworkConfig): DiscoveredDevice {
    const deviceId = `ssdp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ip = this.generateRandomIP();

    return {
      deviceId,
      name: device.name,
      type: this.mapUPnPTypeToDeviceType(device.type),
      category: 'personal',
      protocol: 'http',
      capabilities: ['status', 'control', 'discovery'],
      status: 'online',
      networkInfo: {
        ip,
        protocol: 'http',
        manufacturer: this.extractManufacturer(device.name)
      },
      lastSeen: new Date(),
      signalStrength: 80 + Math.random() * 20
    };
  }

  private mapUPnPTypeToDeviceType(urnType: string): string {
    if (urnType.includes('MediaRenderer')) return 'media_player';
    if (urnType.includes('WANDevice')) return 'network_router';
    if (urnType.includes('Dial')) return 'streaming_device';
    return 'upnp_device';
  }

  private extractManufacturer(name: string): string {
    if (name.startsWith('Samsung')) return 'Samsung';
    if (name.startsWith('LG')) return 'LG Electronics';
    if (name.startsWith('Roku')) return 'Roku';
    if (name.includes('Xiaomi')) return 'Xiaomi';
    return 'Unknown';
  }

  private generateRandomIP(): string {
    return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
  }
}

// Ping Sweep Scanner
export class PingSweepScanner {
  async scan(networkConfig: NetworkConfig): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    const { baseUrl, timeout = 5000 } = networkConfig;

    try {
      if (!baseUrl) {
        throw new Error('Ping sweep requires baseUrl in networkConfig');
      }

      // Extract network range from baseUrl
      const networkRange = this.extractNetworkRange(baseUrl);
      const ips = this.generateIPRange(networkRange);

      // Limit concurrent scans for performance
      const batchSize = 10;
      for (let i = 0; i < ips.length; i += batchSize) {
        const batch = ips.slice(i, i + batchSize);
        const batchPromises = batch.map(ip => this.pingIP(ip, timeout));
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            devices.push(this.createPingDevice(ips[i + index], result.value));
          }
        });
      }

    } catch (error) {
      console.error('Ping sweep error:', error);
    }

    return devices;
  }

  private extractNetworkRange(baseUrl: string): string {
    // Extract first three octets for network range
    const parts = baseUrl.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return '192.168.1';
  }

  private generateIPRange(networkRange: string): string[] {
    const ips: string[] = [];
    for (let i = 1; i < 255; i++) {
      ips.push(`${networkRange}.${i}`);
    }
    return ips;
  }

  private async pingIP(ip: string, timeout: number): Promise<any> {
    // In a real implementation, this would use ping command or network library
    // For now, we'll simulate based on probability

    const isReachable = Math.random() > 0.85; // 15% of IPs respond

    if (!isReachable) {
      throw new Error('Host unreachable');
    }

    // Simulate device response
    const delay = Math.random() * 50 + 10; // 10-60ms
    await new Promise(resolve => setTimeout(resolve, delay));

    return {
      ip,
      hostname: `device-${ip.split('.').pop()}`,
      latency: delay,
      ports: [80, 443], // Common web ports
      mac: this.generateRandomMAC()
    };
  }

  private generateRandomMAC(): string {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      mac += hex[Math.floor(Math.random() * 16)];
      mac += hex[Math.floor(Math.random() * 16)];
      if (i < 5) mac += ':';
    }
    return mac;
  }

  private createPingDevice(ip: string, response: any): DiscoveredDevice {
    const deviceId = `ping_${ip.replace(/\./g, '_')}`;

    return {
      deviceId,
      name: response.hostname || `Device at ${ip}`,
      type: this.identifyDeviceType(ip),
      category: 'infrastructure',
      protocol: 'http',
      capabilities: ['status', 'ping'],
      status: 'online',
      networkInfo: {
        ip,
        mac: response.mac,
        protocol: 'http',
        model: response.hostname
      },
      lastSeen: new Date(),
      signalStrength: 90
    };
  }

  private identifyDeviceType(ip: string): string {
    const hostPart = parseInt(ip.split('.').pop() || '0');

    if (hostPart === 1) return 'router';
    if (hostPart === 100) return 'smart_hub';
    if (hostPart >= 200) return 'iot_device';
    return 'unknown_device';
  }
}

// Bluetooth Scanner
export class BluetoothScanner {
  async scan(networkConfig: NetworkConfig): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];

    try {
      // Simulate Bluetooth device discovery
      const bluetoothDevices = [
        { name: 'iPhone', type: 'smartphone', rssi: -45 },
        { name: 'AirPods Pro', type: 'audio_device', rssi: -60 },
        { name: 'Apple Watch', type: 'wearable', rssi: -55 },
        { name: 'Smart Bulb', type: 'smart_home', rssi: -70 },
        { name: 'Fitness Tracker', type: 'fitness_device', rssi: -65 }
      ];

      for (const device of bluetoothDevices) {
        const discovered = this.createBluetoothDevice(device);
        devices.push(discovered);
      }

    } catch (error) {
      console.error('Bluetooth scan error:', error);
    }

    return devices;
  }

  private createBluetoothDevice(device: any): DiscoveredDevice {
    const deviceId = `bt_${device.name.replace(/\s+/g, '_')}_${Date.now()}`;

    return {
      deviceId,
      name: device.name,
      type: device.type,
      category: this.mapDeviceTypeToCategory(device.type),
      protocol: 'bluetooth',
      capabilities: this.getBluetoothCapabilities(device.type),
      status: 'online',
      networkInfo: {
        protocol: 'bluetooth',
        model: device.name,
        firmware: '1.0.0'
      },
      lastSeen: new Date(),
      signalStrength: device.rssi
    };
  }

  private mapDeviceTypeToCategory(deviceType: string): DeviceCategory {
    const mapping: Record<string, DeviceCategory> = {
      'smartphone': 'personal',
      'wearable': 'personal',
      'audio_device': 'personal',
      'smart_home': 'personal',
      'fitness_device': 'personal'
    };

    return mapping[deviceType] || 'personal';
  }

  private getBluetoothCapabilities(deviceType: string): string[] {
    const capabilities: Record<string, string[]> = {
      'smartphone': ['data_sync', 'notifications', 'control'],
      'wearable': ['health_monitoring', 'notifications', 'control'],
      'audio_device': ['audio_control', 'metadata', 'status'],
      'smart_home': ['on_off', 'dimming', 'color_control'],
      'fitness_device': ['data_export', 'health_monitoring', 'sync']
    };

    return capabilities[deviceType] || ['basic_control'];
  }
}

// Main Device Discovery Service
export class DeviceDiscoveryService {
  private scanners = new Map<DiscoveryMethod, any>();
  private capabilityMappings = new Map<string, CapabilityMapping>();
  private discoveredDevices = new Map<string, DiscoveredDevice>();

  constructor() {
    this.setupScanners();
    this.setupCapabilityMappings();
  }

  private setupScanners(): void {
    this.scanners.set('mdns', new MDNSScanner());
    this.scanners.set('ssdp', new SSDPScanner());
    this.scanners.set('ping_sweep', new PingSweepScanner());
    this.scanners.set('bluetooth_scan', new BluetoothScanner());
  }

  private setupCapabilityMappings(): void {
    // Initialize common device capability mappings
    const mappings: CapabilityMapping[] = [
      {
        deviceType: 'smart_light',
        manufacturer: 'Philips',
        capabilities: ['power', 'brightness', 'color', 'temperature'],
        endpoints: ['/api/v1/power', '/api/v1/brightness', '/api/v1/color'],
        securityLevel: 'medium',
        category: 'personal'
      },
      {
        deviceType: 'smart_switch',
        manufacturer: 'TP-Link',
        capabilities: ['power', 'timer', 'schedule'],
        endpoints: ['/api/power', '/api/timer', '/api/schedule'],
        securityLevel: 'medium',
        category: 'personal'
      },
      {
        deviceType: 'router',
        manufacturer: 'Ubiquiti',
        capabilities: ['status', 'configuration', 'monitoring'],
        endpoints: ['/api/status', '/api/config', '/api/metrics'],
        securityLevel: 'high',
        category: 'infrastructure'
      },
      {
        deviceType: 'infusion_pump',
        manufacturer: 'Becton Dickinson',
        capabilities: ['start', 'stop', 'rate', 'volume', 'status'],
        endpoints: ['/control/start', '/control/stop', '/monitor/status'],
        securityLevel: 'critical',
        category: 'medical'
      }
    ];

    mappings.forEach(mapping => {
      const key = `${mapping.manufacturer}_${mapping.deviceType}`;
      this.capabilityMappings.set(key, mapping);
    });
  }

  async discoverDevices(config: DiscoveryConfig): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const devices: DiscoveredDevice[] = [];
    const errors: DiscoveryError[] = [];
    const networks = new Set<string>();

    // Add custom scanners
    if (config.customScanners) {
      config.customScanners.forEach(scanner => {
        this.scanners.set('custom', scanner.scanner);
      });
    }

    // Run discovery methods
    for (const method of config.methods) {
      for (const network of config.networks) {
        try {
          const networkName = network.baseUrl || `network_${network.port || 0}`;
          networks.add(networkName);

          const scanner = this.scanners.get(method);
          if (scanner) {
            const methodDevices = await scanner.scan(network);
            const filteredDevices = this.filterDevices(methodDevices, config);
            devices.push(...filteredDevices);
          }
        } catch (error) {
          errors.push({
            method,
            network: network.baseUrl || 'unknown',
            error: error instanceof Error ? error.message : String(error),
            code: 'DISCOVERY_ERROR'
          });
        }
      }
    }

    // Remove duplicates based on IP and MAC address
    const uniqueDevices = this.deduplicateDevices(devices);

    // Enrich devices with capability mappings
    const enrichedDevices = await this.enrichDevicesWithCapabilities(uniqueDevices);

    // Update discovered devices cache
    enrichedDevices.forEach(device => {
      this.discoveredDevices.set(device.deviceId, device);
    });

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      devices: enrichedDevices,
      scanTime: executionTime,
      methods: config.methods,
      networks: Array.from(networks),
      errors,
      totalDevices: enrichedDevices.length,
      onlineDevices: enrichedDevices.filter(d => d.status === 'online').length,
      offlineDevices: enrichedDevices.filter(d => d.status !== 'online').length
    };
  }

  private filterDevices(devices: DiscoveredDevice[], config: DiscoveryConfig): DiscoveredDevice[] {
    return devices.filter(device => {
      // Filter by device types if specified
      if (config.deviceTypes.length > 0 && !config.deviceTypes.includes(device.type)) {
        return false;
      }

      // Filter by categories if specified
      if (config.categories.length > 0 && !config.categories.includes(device.category)) {
        return false;
      }

      // Exclude specific devices if specified
      if (config.excludeDevices?.includes(device.deviceId)) {
        return false;
      }

      return true;
    });
  }

  private deduplicateDevices(devices: DiscoveredDevice[]): DiscoveredDevice[] {
    const seen = new Set<string>();
    return devices.filter(device => {
      // Create a unique key based on IP or device ID
      const key = device.networkInfo.ip || device.deviceId;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async enrichDevicesWithCapabilities(devices: DiscoveredDevice[]): Promise<DiscoveredDevice[]> {
    return devices.map(device => {
      const capabilityMapping = this.findCapabilityMapping(device);

      if (capabilityMapping) {
        // Merge discovered capabilities with mapped ones
        const mergedCapabilities = [...new Set([
          ...device.capabilities,
          ...capabilityMapping.capabilities
        ])];

        return {
          ...device,
          capabilities: mergedCapabilities,
          networkInfo: {
            ...device.networkInfo,
            manufacturer: capabilityMapping.manufacturer,
            model: device.type
          }
        };
      }

      return device;
    });
  }

  private findCapabilityMapping(device: DiscoveredDevice): CapabilityMapping | undefined {
    // Try exact match first
    const exactKey = `${device.networkInfo.manufacturer}_${device.type}`;
    let mapping = this.capabilityMappings.get(exactKey);

    // Try partial match by device type
    if (!mapping) {
      mapping = Array.from(this.capabilityMappings.values())
        .find(m => m.deviceType === device.type);
    }

    return mapping;
  }

  async getDevice(deviceId: string): Promise<DiscoveredDevice | undefined> {
    return this.discoveredDevices.get(deviceId);
  }

  async getAllDevices(): Promise<DiscoveredDevice[]> {
    return Array.from(this.discoveredDevices.values());
  }

  async getDevicesByCategory(category: DeviceCategory): Promise<DiscoveredDevice[]> {
    return Array.from(this.discoveredDevices.values())
      .filter(device => device.category === category);
  }

  async getDevicesByProtocol(protocol: DeviceProtocol): Promise<DiscoveredDevice[]> {
    return Array.from(this.discoveredDevices.values())
      .filter(device => device.protocol === protocol);
  }

  addCapabilityMapping(mapping: CapabilityMapping): void {
    const key = `${mapping.manufacturer}_${mapping.deviceType}`;
    this.capabilityMappings.set(key, mapping);
  }

  getCapabilityMappings(): CapabilityMapping[] {
    return Array.from(this.capabilityMappings.values());
  }

  async refreshDiscovery(config: DiscoveryConfig): Promise<DiscoveryResult> {
    // Clear existing devices
    this.discoveredDevices.clear();

    // Run new discovery
    return await this.discoverDevices(config);
  }

  async stopDiscovery(): Promise<void> {
    // In a real implementation, this would stop ongoing scans
    // For now, just clear the discovered devices
    this.discoveredDevices.clear();
  }
}

// Global discovery service instance
export const deviceDiscovery = new DeviceDiscoveryService();

// Utility functions
export class DiscoveryUtils {
  static createDiscoveryConfig(methods: DiscoveryMethod[], networks: NetworkConfig[]): DiscoveryConfig {
    return {
      methods,
      networks,
      timeout: 30000,
      concurrentScans: 5,
      deviceTypes: [],
      categories: []
    };
  }

  static createNetworkConfig(baseUrl: string, options?: Partial<NetworkConfig>): NetworkConfig {
    return {
      baseUrl,
      ssl: false,
      timeout: 10000,
      ...options
    };
  }

  static validateDiscoveryConfig(config: DiscoveryConfig): string[] {
    const errors: string[] = [];

    if (config.methods.length === 0) {
      errors.push('At least one discovery method must be specified');
    }

    if (config.networks.length === 0) {
      errors.push('At least one network configuration must be specified');
    }

    if (config.timeout < 1000) {
      errors.push('Timeout must be at least 1000ms');
    }

    if (config.concurrentScans < 1 || config.concurrentScans > 20) {
      errors.push('Concurrent scans must be between 1 and 20');
    }

    return errors;
  }
}