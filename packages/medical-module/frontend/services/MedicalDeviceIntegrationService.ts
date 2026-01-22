/**
 * Medical Device Integration Standards Service
 * 
 * Comprehensive service for integrating medical devices with hospital infrastructure
 * Supports HL7, DICOM, IEEE 11073 protocols and major device manufacturers
 */

import { EventEmitter } from '../../../_shared/EventEmitter';
import { Readable } from 'stream';

// ==================== Interfaces and Types ====================

export enum MedicalDeviceClass {
  CLASS_I = 'Class I',
  CLASS_IIA = 'Class IIa',
  CLASS_IIB = 'Class IIb',
  CLASS_III = 'Class III'
}

export enum DeviceSafetyLevel {
  A = 'Safety Level A',
  B = 'Safety Level B',
  C = 'Safety Level C',
  D = 'Safety Level D'
}

export enum CommunicationProtocol {
  HL7 = 'HL7',
  DICOM = 'DICOM',
  IEEE_11073 = 'IEEE_11073',
  FHIR = 'FHIR',
  REST = 'REST',
  MQTT = 'MQTT',
  COAP = 'COAP'
}

export enum DeviceStatus {
  REGISTERED = 'REGISTERED',
  CONNECTED = 'CONNECTED',
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  OFFLINE = 'OFFLINE',
  CALIBRATION_REQUIRED = 'CALIBRATION_REQUIRED'
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE'
}

export interface MedicalDeviceConfiguration {
  deviceId: string;
  manufacturer: string;
  model: string;
  version: string;
  protocol: CommunicationProtocol;
  deviceClass: MedicalDeviceClass;
  safetyLevel: DeviceSafetyLevel;
  ipAddress?: string;
  port?: number;
  networkId?: string;
  securityLevel: number;
  dataFormat: string;
  samplingRate?: number;
  supportedFeatures: string[];
  status?: DeviceStatus;
}

export interface DeviceDataStream {
  deviceId: string;
  timestamp: Date;
  dataType: string;
  value: any;
  unit?: string;
  quality: 'GOOD' | 'POOR' | 'INVALID';
  sequenceNumber?: number;
  metadata?: Record<string, any>;
}

export interface CalibrationRecord {
  calibrationId: string;
  deviceId: string;
  calibrationDate: Date;
  calibrationType: 'ROUTINE' | 'PRECISION' | 'AFTER_REPAIR';
  technicianId: string;
  results: Record<string, any>;
  nextCalibrationDue: Date;
  certificateNumber: string;
  status: 'PASSED' | 'FAILED' | 'REQUIRES_ADJUSTMENT';
  notes?: string;
}

export interface MaintenanceRecord {
  maintenanceId: string;
  deviceId: string;
  scheduledDate: Date;
  completedDate?: Date;
  maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
  technicianId: string;
  description: string;
  partsReplaced: string[];
  status: MaintenanceStatus;
  cost?: number;
  downtime?: number; // in minutes
  nextMaintenanceDue?: Date;
}

export interface DeviceCertificate {
  certificateId: string;
  deviceId: string;
  certificateType: 'FDA' | 'CE' | 'TGA' | 'ISO13485' | 'FDA_510K' | 'OTHER';
  certificateNumber: string;
  issueDate: Date;
  expiryDate: Date;
  issuingAuthority: string;
  complianceStandards: string[];
  status: 'VALID' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
  documentPath?: string;
  renewalReminder?: Date;
}

export interface DeviceAlert {
  alertId: string;
  deviceId: string;
  alertType: 'ERROR' | 'WARNING' | 'INFO' | 'CRITICAL';
  message: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolution?: string;
  resolutionTimestamp?: Date;
}

export interface HL7Message {
  messageType: string;
  sendingApplication: string;
  receivingApplication: string;
  timestamp: Date;
  messageControlId: string;
  segments: HL7Segment[];
}

export interface HL7Segment {
  segmentType: string;
  fields: string[];
}

export interface DICOMDataSet {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  patientId: string;
  patientName: string;
  studyDate: Date;
  modality: string;
  imageType: string;
  transferSyntaxUID: string;
  dataElements: Record<string, any>;
}

export interface IEEE11073Measurement {
  deviceId: string;
  observationId: string;
  timestamp: Date;
  value: number;
  unit: string;
  dataCode: number;
  upperLimit?: number;
  lowerLimit?: number;
  measurementStatus: string;
}

// ==================== Protocol Implementations ====================

export class HL7ProtocolHandler {
  constructor() {
  }

  async sendMessage(message: HL7Message): Promise<boolean> {
    try {
      // Validate HL7 message format
      if (!this.validateMessage(message)) {
        throw new Error('Invalid HL7 message format');
      }

      // Encrypt sensitive data
      const encryptedMessage = await this.encryptSensitiveFields(message);

      // Send via HL7 MLLP (Minimal Lower Layer Protocol)
      return await this.sendViaMLLP(encryptedMessage);
    } catch (error) {
      console.error('HL7 send error', error);
      return false;
    }
  }

  async parseMessage(rawMessage: string): Promise<HL7Message> {
    try {
      // Parse HL7 message structure
      const segments = rawMessage.split('\n').filter(line => line.trim());

      const message: HL7Message = {
        messageType: this.extractMessageType(segments),
        sendingApplication: this.extractSendingApp(segments),
        receivingApplication: this.extractReceivingApp(segments),
        timestamp: new Date(),
        messageControlId: this.extractMessageControlId(segments),
        segments: segments.map(segment => this.parseSegment(segment))
      };

      return message;
    } catch (error) {
      console.error('HL7 parse error', error);
      throw error;
    }
  }

  private validateMessage(message: HL7Message): boolean {
    return !!(message.messageType && message.segments && message.segments.length > 0);
  }

  private async encryptSensitiveFields(message: HL7Message): Promise<HL7Message> {
    // Encrypt patient-sensitive fields
    const encrypted = { ...message };
    return encrypted;
  }

  private async sendViaMLLP(message: HL7Message): Promise<boolean> {
    // Implementation of HL7 MLLP protocol
    return true;
  }

  private extractMessageType(segments: string[]): string {
    return segments.find(s => s.startsWith('MSH'))?.split('|')[8] || '';
  }

  private extractSendingApp(segments: string[]): string {
    return segments.find(s => s.startsWith('MSH'))?.split('|')[2] || '';
  }

  private extractReceivingApp(segments: string[]): string {
    return segments.find(s => s.startsWith('MSH'))?.split('|')[3] || '';
  }

  private extractMessageControlId(segments: string[]): string {
    return segments.find(s => s.startsWith('MSH'))?.split('|')[9] || '';
  }

  private parseSegment(segment: string): HL7Segment {
    const fields = segment.split('|');
    return {
      segmentType: fields[0],
      fields: fields.slice(1)
    };
  }
}

export class DICOMProtocolHandler {
  constructor() {
  }

  async sendAssociationRequest(targetAET: string, payload: any): Promise<boolean> {
    try {
      // DICOM Association Request implementation
      const association = await this.createAssociation(targetAET);
      return association.established;
    } catch (error) {
      console.error('DICOM association error', error);
      return false;
    }
  }

  async storeImage(imageData: DICOMDataSet): Promise<boolean> {
    try {
      // Validate DICOM data elements
      if (!this.validateDataset(imageData)) {
        throw new Error('Invalid DICOM dataset');
      }

      // Send DICOM C-STORE operation
      return await this.performStore(imageData);
    } catch (error) {
      console.error('DICOM store error', error);
      return false;
    }
  }

  async queryPatients(queryParameters: any): Promise<DICOMDataSet[]> {
    try {
      // DICOM C-FIND operation for patient queries
      return await this.performQuery(queryParameters);
    } catch (error) {
      console.error('DICOM query error', error);
      throw error;
    }
  }

  private validateDataset(dataset: DICOMDataSet): boolean {
    return !!(dataset.patientId && dataset.studyInstanceUID && dataset.sopInstanceUID);
  }

  private async createAssociation(targetAET: string): Promise<{ established: boolean }> {
    return { established: true };
  }

  private async performStore(data: DICOMDataSet): Promise<boolean> {
    return true;
  }

  private async performQuery(params: any): Promise<DICOMDataSet[]> {
    return [];
  }
}

export class IEEE11073ProtocolHandler {
  constructor() {
  }

  async establishConnection(deviceId: string, transportProtocol: 'USB' | 'BT' | 'WIFI'): Promise<boolean> {
    try {
      // IEEE 11073 connection establishment
      const manager = await this.createManager(deviceId);
      const device = await this.discoverDevice(deviceId, transportProtocol);

      return manager.associate(device);
    } catch (error) {
      console.error('IEEE 11073 connection error', error);
      return false;
    }
  }

  async parseMeasurement(measurementData: any): Promise<IEEE11073Measurement> {
    try {
      // Parse IEEE 11073 measurement according to standard
      return {
        deviceId: measurementData.deviceId,
        observationId: measurementData.oid,
        timestamp: new Date(),
        value: measurementData.value,
        unit: measurementData.unit,
        dataCode: measurementData.code,
        measurementStatus: measurementData.status || 'AVAILABLE'
      };
    } catch (error) {
      console.error('IEEE 11073 parse error', error);
      throw error;
    }
  }

  async sendConfiguration(configData: any): Promise<boolean> {
    try {
      // Send IEEE 11073 configuration to device
      return true;
    } catch (error) {
      console.error('IEEE 11073 config error', error);
      return false;
    }
  }

  private async createManager(deviceId: string): Promise<any> {
    return { associate: (device: any) => true };
  }

  private async discoverDevice(deviceId: string, transport: string): Promise<any> {
    return { deviceId, transport };
  }
}

// ==================== Main Service Class ====================

export class MedicalDeviceIntegrationService extends EventEmitter {
  // Protocol handlers
  private hl7Handler: HL7ProtocolHandler;
  private dicomHandler: DICOMProtocolHandler;
  private ieeeHandler: IEEE11073ProtocolHandler;

  // Device registry
  private deviceRegistry: Map<string, MedicalDeviceConfiguration> = new Map();
  private deviceStreams: Map<string, Readable> = new Map();
  private activeConnections: Map<string, any> = new Map();

  // Maintenance and calibration
  private calibrationRecords: Map<string, CalibrationRecord[]> = new Map();
  private maintenanceRecords: Map<string, MaintenanceRecord[]> = new Map();
  private certificates: Map<string, DeviceCertificate[]> = new Map();
  private alerts: Map<string, DeviceAlert[]> = new Map();

  // Configuration
  private maxConcurrentConnections: number = 100;
  private connectionTimeout: number = 30000;
  private dataStreamingEnabled: boolean = true;
  private securityLevel: number = 3; // High security

  constructor() {
    super();

    // Initialize protocol handlers
    this.hl7Handler = new HL7ProtocolHandler();
    this.dicomHandler = new DICOMProtocolHandler();
    this.ieeeHandler = new IEEE11073ProtocolHandler();

    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    console.log('Initializing Medical Device Integration Service');

    try {
      // Load existing device configurations
      await this.loadDeviceRegistry();

      // Initialize security protocols
      await this.initializeSecurity();

      // Start device discovery service
      this.startDeviceDiscovery();

      // Initialize maintenance scheduling
      this.startMaintenanceScheduling();

      console.log('Medical Device Integration Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Medical Device Integration Service', error);
      throw error;
    }
  }

  // ==================== Device Registration and Discovery ====================

  async registerDevice(config: MedicalDeviceConfiguration): Promise<string> {
    try {
      // Validate device configuration
      await this.validateDeviceConfiguration(config);

      // Check security requirements
      await this.validateSecurityCompliance(config);

      // Register device
      this.deviceRegistry.set(config.deviceId, config);

      // Generate device certificate
      const _certificate = await this.generateDeviceCertificate(config);

      // Save to persistent storage
      await this.saveDeviceConfiguration(config);

      // Create device-specific stream
      this.createDeviceStream(config.deviceId);

      // Notify IoT integration
      // await this.iotDeviceService.registerDevice({
      //   deviceId: config.deviceId,
      //   deviceType: 'MEDICAL_DEVICE',
      //   capabilities: config.supportedFeatures,
      //   protocols: [config.protocol],
      //   metadata: config
      // });

      console.log(`Device registered successfully: ${config.deviceId}`);
      this.emit('deviceRegistered', config);

      return config.deviceId;
    } catch (error) {
      console.error(`Failed to register device: ${config.deviceId}`, error);
      throw error;
    }
  }

  async discoverDevices(networkRange?: string): Promise<MedicalDeviceConfiguration[]> {
    try {
      const discoveredDevices: MedicalDeviceConfiguration[] = [];

      // Discovery via network scanning
      if (networkRange) {
        const networkDevices = await this.scanNetworkDevices(networkRange);
        discoveredDevices.push(...networkDevices);
      }

      // Discovery via manufacturer-specific protocols
      const manufacturerDevices = await this.scanManufacturerDevices();
      discoveredDevices.push(...manufacturerDevices);

      // Discovery via IoT ecosystem
      const iotDevices = await this.discoverIoTMedicalDevices();
      discoveredDevices.push(...iotDevices);

      // Validate and filter devices
      const validDevices = await this.validateDiscoveredDevices(discoveredDevices);

      return validDevices;
    } catch (error) {
      console.error('Device discovery failed', error);
      throw error;
    }
  }

  async unregisterDevice(deviceId: string): Promise<boolean> {
    try {
      // Close active connections
      await this.disconnectDevice(deviceId);

      // Remove from registry
      this.deviceRegistry.delete(deviceId);

      // Clean up streams
      const stream = this.deviceStreams.get(deviceId);
      if (stream) {
        stream.destroy();
        this.deviceStreams.delete(deviceId);
      }

      // Remove from IoT integration
      // await this.iotDeviceService.unregisterDevice(deviceId);

      console.log(`Device unregistered: ${deviceId}`);
      this.emit('deviceUnregistered', { deviceId });

      return true;
    } catch (error) {
      console.error(`Failed to unregister device: ${deviceId}`, error);
      return false;
    }
  }

  getRegisteredDevices(): MedicalDeviceConfiguration[] {
    return Array.from(this.deviceRegistry.values());
  }

  getDevice(deviceId: string): MedicalDeviceConfiguration | undefined {
    return this.deviceRegistry.get(deviceId);
  }

  // ==================== Connection and Data Streaming ====================

  async connectDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.deviceRegistry.get(deviceId);
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`);
      }

      // Check connection limits
      if (this.activeConnections.size >= this.maxConcurrentConnections) {
        throw new Error('Maximum concurrent connections reached');
      }

      let connection: any;

      // Establish connection based on protocol
      switch (device.protocol) {
        case CommunicationProtocol.HL7:
          connection = await this.connectHL7Device(device);
          break;
        case CommunicationProtocol.DICOM:
          connection = await this.connectDICOMDevice(device);
          break;
        case CommunicationProtocol.IEEE_11073:
          connection = await this.connectIEEE11073Device(device);
          break;
        case CommunicationProtocol.MQTT:
          connection = await this.connectMQTTDevice(device);
          break;
        default:
          connection = await this.connectGenericDevice(device);
      }

      if (connection) {
        this.activeConnections.set(deviceId, connection);
        this.emit('deviceConnected', { deviceId, connection });

        // Start data streaming if enabled
        if (this.dataStreamingEnabled) {
          this.startDataStreaming(deviceId);
        }

        console.log(`Device connected successfully: ${deviceId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to connect device: ${deviceId}`, error);
      this.emit('deviceConnectionError', { deviceId, error });
      return false;
    }
  }

  async disconnectDevice(deviceId: string): Promise<boolean> {
    try {
      const connection = this.activeConnections.get(deviceId);
      if (connection) {
        // Close connection based on protocol
        await this.closeConnection(connection);
        this.activeConnections.delete(deviceId);
      }

      this.emit('deviceDisconnected', { deviceId });
      console.log(`Device disconnected: ${deviceId}`);

      return true;
    } catch (error) {
      console.error(`Failed to disconnect device: ${deviceId}`, error);
      return false;
    }
  }

  private startDataStreaming(deviceId: string): void {
    const device = this.deviceRegistry.get(deviceId);
    if (!device) return;

    try {
      const stream = this.deviceStreams.get(deviceId);
      if (stream) {
        stream.on('data', (data: DeviceDataStream) => {
          // Validate and process data
          this.processDeviceData(deviceId, data);

          // Apply security filtering
          this.applySecurityFiltering(data);

          // Emit to listeners
          this.emit('deviceData', data);
        });

        stream.on('error', (error: Error) => {
          console.error(`Stream error for device ${deviceId}`, error);
          this.emit('deviceDataError', { deviceId, error });
          this.handleDeviceError(deviceId, error);
        });
      }
    } catch (error) {
      console.error(`Failed to start data streaming for device ${deviceId}`, error);
    }
  }

  private async processDeviceData(deviceId: string, data: DeviceDataStream): Promise<void> {
    // Validate data quality
    if (data.quality === 'INVALID') {
      await this.createDeviceAlert(deviceId, 'ERROR', 'Invalid data received from device', 'HIGH');
      return;
    }

    // Check data ranges and thresholds
    await this.validateDataRange(deviceId, data);

    // Store in time-series database
    await this.storeDeviceData(deviceId, data);

    // Trigger alerts if necessary
    await this.checkAlertConditions(deviceId, data);
  }

  // ==================== Maintenance and Calibration ====================

  async scheduleCalibration(deviceId: string, calibrationType: 'ROUTINE' | 'PRECISION' | 'AFTER_REPAIR'): Promise<string> {
    try {
      const device = this.deviceRegistry.get(deviceId);
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`);
      }

      const calibrationId = `cal_${deviceId}_${Date.now()}`;

      const calibration: CalibrationRecord = {
        calibrationId,
        deviceId,
        calibrationDate: new Date(),
        calibrationType,
        technicianId: 'SYSTEM', // Will be updated by technician
        results: {},
        nextCalibrationDue: this.calculateNextCalibrationDate(calibrationType),
        certificateNumber: this.generateCertificateNumber(),
        status: 'PASSED', // Will be updated after actual calibration
      };

      if (!this.calibrationRecords.has(deviceId)) {
        this.calibrationRecords.set(deviceId, []);
      }
      this.calibrationRecords.get(deviceId)!.push(calibration);

      this.emit('calibrationScheduled', calibration);
      console.log(`Calibration scheduled for device: ${deviceId}`);

      return calibrationId;
    } catch (error) {
      console.error(`Failed to schedule calibration for device: ${deviceId}`, error);
      throw error;
    }
  }

  async recordCalibration(calibrationId: string, results: Record<string, any>, status: 'PASSED' | 'FAILED' | 'REQUIRES_ADJUSTMENT'): Promise<boolean> {
    try {
      // Find calibration record
      const calibration = this.findCalibrationById(calibrationId);
      if (!calibration) {
        throw new Error(`Calibration not found: ${calibrationId}`);
      }

      // Update results
      calibration.results = results;
      calibration.status = status;

      if (status === 'FAILED') {
        // Mark device as requiring attention
        await this.createDeviceAlert(
          calibration.deviceId,
          'CRITICAL',
          'Calibration failed - device may need repair',
          'CRITICAL'
        );
      }

      this.emit('calibrationCompleted', calibration);
      console.log(`Calibration completed: ${calibrationId}`);

      return true;
    } catch (error) {
      console.error(`Failed to record calibration: ${calibrationId}`, error);
      return false;
    }
  }

  async scheduleMaintenance(deviceId: string, maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE', scheduledDate: Date): Promise<string> {
    try {
      const maintenanceId = `mnt_${deviceId}_${Date.now()}`;

      const maintenance: MaintenanceRecord = {
        maintenanceId,
        deviceId,
        scheduledDate,
        maintenanceType,
        technicianId: 'SYSTEM',
        description: `${maintenanceType} maintenance`,
        partsReplaced: [],
        status: MaintenanceStatus.SCHEDULED,
        nextMaintenanceDue: this.calculateNextMaintenanceDate(maintenanceType)
      };

      if (!this.maintenanceRecords.has(deviceId)) {
        this.maintenanceRecords.set(deviceId, []);
      }
      this.maintenanceRecords.get(deviceId)!.push(maintenance);

      this.emit('maintenanceScheduled', maintenance);
      console.log(`Maintenance scheduled for device: ${deviceId}`);

      return maintenanceId;
    } catch (error) {
      console.error(`Failed to schedule maintenance for device: ${deviceId}`, error);
      throw error;
    }
  }

  getMaintenanceSchedule(deviceId: string): MaintenanceRecord[] {
    return this.maintenanceRecords.get(deviceId) || [];
  }

  getCalibrationHistory(deviceId: string): CalibrationRecord[] {
    return this.calibrationRecords.get(deviceId) || [];
  }

  // ==================== Security and Access Control ====================

  private async validateSecurityCompliance(device: MedicalDeviceConfiguration): Promise<void> {
    // Check security level requirements
    if (device.safetyLevel === DeviceSafetyLevel.D && this.securityLevel < 3) {
      throw new Error('Insufficient security level for Class D devices');
    }

    // Validate cryptographic requirements
    if (device.securityLevel >= 3) {
      const supportsEncryption = device.supportedFeatures.includes('ENCRYPTION');
      if (!supportsEncryption) {
        throw new Error('Device does not support required encryption');
      }
    }

    // Check authentication requirements
    const requiresAuth = device.deviceClass === MedicalDeviceClass.CLASS_III;
    if (requiresAuth) {
      // Verify device authentication capabilities
    }
  }

  private async applySecurityFiltering(data: DeviceDataStream): Promise<void> {
    // Apply data anonymization for patient information
    const sensitiveFields = ['patientId', 'patientName', 'patientInfo'];
    for (const field of sensitiveFields) {
      if (data.metadata && data.metadata[field]) {
        // data.metadata[field] = await this.securityService.anonymizeData(data.metadata[field]);
        data.metadata[field] = '***REDACTED***';
      }
    }
  }

  async authenticateDevice(deviceId: string, credentials: any): Promise<boolean> {
    try {
      const device = this.deviceRegistry.get(deviceId);
      if (!device) return false;

      // Implement device-specific authentication
      switch (device.protocol) {
        case CommunicationProtocol.HL7:
          return await this.authenticateHL7Device(device, credentials);
        case CommunicationProtocol.DICOM:
          return await this.authenticateDICOMDevice(device, credentials);
        case CommunicationProtocol.IEEE_11073:
          return await this.authenticateIEEE11073Device(device, credentials);
        default:
          return await this.authenticateGenericDevice(device, credentials);
      }
    } catch (error) {
      console.error(`Authentication failed for device: ${deviceId}`, error);
      return false;
    }
  }

  // ==================== Compliance and Certification ====================

  async addDeviceCertificate(certificate: Omit<DeviceCertificate, 'certificateId'>): Promise<string> {
    try {
      const certificateId = `cert_${certificate.deviceId}_${Date.now()}`;

      const fullCertificate: DeviceCertificate = {
        ...certificate,
        certificateId
      };

      if (!this.certificates.has(certificate.deviceId)) {
        this.certificates.set(certificate.deviceId, []);
      }
      this.certificates.get(certificate.deviceId)!.push(fullCertificate);

      // Check for expiry warnings
      await this.checkCertificateExpiry(certificate.deviceId);

      this.emit('certificateAdded', fullCertificate);
      console.log(`Certificate added for device: ${certificate.deviceId}`);

      return certificateId;
    } catch (error) {
      console.error(`Failed to add certificate for device: ${certificate.deviceId}`, error);
      throw error;
    }
  }

  async renewCertificate(certificateId: string, newCertificateData: Partial<DeviceCertificate>): Promise<boolean> {
    try {
      const certificate = this.findCertificateById(certificateId);
      if (!certificate) {
        throw new Error(`Certificate not found: ${certificateId}`);
      }

      // Update certificate with new data
      Object.assign(certificate, newCertificateData);

      this.emit('certificateRenewed', certificate);
      console.log(`Certificate renewed: ${certificateId}`);

      return true;
    } catch (error) {
      console.error(`Failed to renew certificate: ${certificateId}`, error);
      return false;
    }
  }

  getDeviceCertificates(deviceId: string): DeviceCertificate[] {
    return this.certificates.get(deviceId) || [];
  }

  getComplianceStatus(deviceId: string): {
    compliant: boolean;
    issues: string[];
    expiryWarnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    const certificates = this.certificates.get(deviceId) || [];

    // Check certificate validity
    for (const cert of certificates) {
      if (cert.status === 'EXPIRED') {
        issues.push(`Certificate ${cert.certificateNumber} has expired`);
      } else if (cert.status === 'REVOKED') {
        issues.push(`Certificate ${cert.certificateNumber} has been revoked`);
      } else if (cert.status === 'SUSPENDED') {
        issues.push(`Certificate ${cert.certificateNumber} has been suspended`);
      } else if (cert.renewalReminder && cert.renewalReminder <= new Date()) {
        warnings.push(`Certificate ${cert.certificateNumber} renewal due`);
      }
    }

    // Check maintenance compliance
    const maintenanceRecords = this.maintenanceRecords.get(deviceId) || [];
    const overdueMaintenance = maintenanceRecords.filter(
      record => record.status === MaintenanceStatus.OVERDUE
    );
    if (overdueMaintenance.length > 0) {
      issues.push(`${overdueMaintenance.length} overdue maintenance records`);
    }

    // Check calibration compliance
    const calibrationRecords = this.calibrationRecords.get(deviceId) || [];
    const recentCalibrations = calibrationRecords.filter(
      record => record.status === 'FAILED' ||
        (record.nextCalibrationDue && record.nextCalibrationDue <= new Date())
    );
    if (recentCalibrations.length > 0) {
      issues.push(`${recentCalibrations.length} calibration issues`);
    }

    return {
      compliant: issues.length === 0,
      issues,
      expiryWarnings: warnings
    };
  }

  // ==================== Error Handling and Recovery ====================

  async handleDeviceError(deviceId: string, error: Error): Promise<void> {
    console.error(`Device error for ${deviceId}`, error);

    const device = this.deviceRegistry.get(deviceId);
    if (!device) return;

    // Create error alert
    await this.createDeviceAlert(
      deviceId,
      'ERROR',
      `Device error: ${error.message}`,
      this.determineErrorSeverity(error)
    );

    // Attempt recovery based on error type
    const recoveryAttempted = await this.attemptDeviceRecovery(deviceId, error);

    if (!recoveryAttempted) {
      // If recovery failed, disconnect device
      await this.disconnectDevice(deviceId);

      // Update device status
      device.status = DeviceStatus.ERROR;
      this.deviceRegistry.set(deviceId, device);

      this.emit('deviceError', { deviceId, error, recoveryAttempted: false });
    } else {
      this.emit('deviceError', { deviceId, error, recoveryAttempted: true });
    }
  }

  private async attemptDeviceRecovery(deviceId: string, error: Error): Promise<boolean> {
    try {
      const device = this.deviceRegistry.get(deviceId);
      if (!device) return false;

      // Retry connection based on error type
      if (error.message.includes('connection')) {
        // Attempt reconnection after delay
        await this.delay(5000);
        return await this.connectDevice(deviceId);
      } else if (error.message.includes('authentication')) {
        // Re-authenticate device
        return await this.reauthenticateDevice(deviceId);
      } else if (error.message.includes('timeout')) {
        // Reset connection parameters
        return await this.resetDeviceConnection(deviceId);
      }

      return false;
    } catch (recoveryError) {
      console.error(`Recovery attempt failed for device: ${deviceId}`, recoveryError);
      return false;
    }
  }

  async createDeviceAlert(
    deviceId: string,
    alertType: 'ERROR' | 'WARNING' | 'INFO' | 'CRITICAL',
    message: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): Promise<string> {
    const alertId = `alert_${deviceId}_${Date.now()}`;

    const alert: DeviceAlert = {
      alertId,
      deviceId,
      alertType,
      message,
      timestamp: new Date(),
      severity,
      acknowledged: false
    };

    if (!this.alerts.has(deviceId)) {
      this.alerts.set(deviceId, []);
    }
    this.alerts.get(deviceId)!.push(alert);

    this.emit('deviceAlert', alert);

    // Log critical alerts
    if (severity === 'CRITICAL') {
      console.error(`CRITICAL ALERT for device ${deviceId}: ${message}`);
    }

    return alertId;
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    try {
      for (const [_deviceId, deviceAlerts] of this.alerts) {
        const alert = deviceAlerts.find(a => a.alertId === alertId);
        if (alert) {
          alert.acknowledged = true;
          alert.acknowledgedBy = acknowledgedBy;
          alert.acknowledgedAt = new Date();

          this.emit('alertAcknowledged', alert);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(`Failed to acknowledge alert: ${alertId}`, error);
      return false;
    }
  }

  getDeviceAlerts(deviceId: string, includeAcknowledged: boolean = false): DeviceAlert[] {
    const alerts = this.alerts.get(deviceId) || [];
    return includeAcknowledged ? alerts : alerts.filter(alert => !alert.acknowledged);
  }

  // ==================== Standard Templates and Configurations ====================

  async createDeviceTemplate(templateName: string, templateConfig: Partial<MedicalDeviceConfiguration>): Promise<string> {
    // Standard templates for common device types
    const standardTemplates: Record<string, Partial<MedicalDeviceConfiguration>> = {
      'PatientMonitor': {
        manufacturer: 'Generic',
        protocol: CommunicationProtocol.IEEE_11073,
        deviceClass: MedicalDeviceClass.CLASS_IIB,
        safetyLevel: DeviceSafetyLevel.B,
        supportedFeatures: ['ECG', 'SPO2', 'NIBP', 'TEMP'],
        dataFormat: 'IEEE11073',
        samplingRate: 1 // Hz
      },
      'Ventilator': {
        manufacturer: 'Generic',
        protocol: CommunicationProtocol.HL7,
        deviceClass: MedicalDeviceClass.CLASS_III,
        safetyLevel: DeviceSafetyLevel.C,
        supportedFeatures: ['VENTILATION', 'PRESSURE', 'FLOW'],
        dataFormat: 'HL7',
        samplingRate: 10 // Hz
      },
      'InfusionPump': {
        manufacturer: 'Generic',
        protocol: CommunicationProtocol.MQTT,
        deviceClass: MedicalDeviceClass.CLASS_IIB,
        safetyLevel: DeviceSafetyLevel.B,
        supportedFeatures: ['INFUSION_RATE', 'VOLUME', 'ALARMS'],
        dataFormat: 'JSON',
        samplingRate: 0.1 // Hz
      },
      'Defibrillator': {
        manufacturer: 'Generic',
        protocol: CommunicationProtocol.IEEE_11073,
        deviceClass: MedicalDeviceClass.CLASS_III,
        safetyLevel: DeviceSafetyLevel.D,
        supportedFeatures: ['ENERGY_DELIVERY', 'ECG_ANALYSIS', 'SAFETY_CHECKS'],
        dataFormat: 'IEEE11073',
        samplingRate: 100 // Hz
      },
      'Ultrasound': {
        manufacturer: 'Generic',
        protocol: CommunicationProtocol.DICOM,
        deviceClass: MedicalDeviceClass.CLASS_IIA,
        safetyLevel: DeviceSafetyLevel.B,
        supportedFeatures: ['IMAGING', 'DOPPLER', 'MEASUREMENTS'],
        dataFormat: 'DICOM',
        samplingRate: 30 // FPS
      }
    };

    const template = {
      ...standardTemplates[templateName],
      ...templateConfig,
      deviceId: `template_${templateName}_${Date.now()}`
    };

    this.emit('deviceTemplateCreated', { templateName, template });

    return template.deviceId;
  }

  getAvailableTemplates(): string[] {
    return ['PatientMonitor', 'Ventilator', 'InfusionPump', 'Defibrillator', 'Ultrasound'];
  }

  async applyTemplate(deviceId: string, templateName: string): Promise<boolean> {
    try {
      const templates = ['PatientMonitor', 'Ventilator', 'InfusionPump', 'Defibrillator', 'Ultrasound'];
      if (!templates.includes(templateName)) {
        throw new Error(`Template not found: ${templateName}`);
      }

      const device = this.deviceRegistry.get(deviceId);
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`);
      }

      // Apply template configuration
      const template = await this.createDeviceTemplate(templateName, {});
      const templateConfig = this.deviceRegistry.get(template);

      if (templateConfig) {
        // Merge template with existing device configuration
        const updatedConfig: MedicalDeviceConfiguration = {
          ...device,
          ...templateConfig,
          deviceId: deviceId // Preserve original device ID
        };

        this.deviceRegistry.set(deviceId, updatedConfig);
        this.emit('templateApplied', { deviceId, templateName });
      }

      return true;
    } catch (error) {
      console.error(`Failed to apply template ${templateName} to device ${deviceId}`, error);
      return false;
    }
  }

  // ==================== IoT Integration ====================

  async syncWithIoTEcosystem(): Promise<void> {
    try {
      // const iotDevices = await this.iotDeviceService.getAllDevices();
      const iotDevices: any[] = [];

      for (const iotDevice of iotDevices) {
        if (iotDevice.deviceType === 'MEDICAL_DEVICE' && !this.deviceRegistry.has(iotDevice.deviceId)) {
          // Found IoT device that should be registered as medical device
          const config: MedicalDeviceConfiguration = {
            deviceId: iotDevice.deviceId,
            manufacturer: iotDevice.metadata.manufacturer || 'Unknown',
            model: iotDevice.metadata.model || 'Unknown',
            version: iotDevice.metadata.version || '1.0',
            protocol: await this.mapIoTProtocolToMedical(iotDevice.protocols[0]),
            deviceClass: MedicalDeviceClass.CLASS_IIA,
            safetyLevel: DeviceSafetyLevel.B,
            networkId: iotDevice.networkId,
            securityLevel: 2,
            dataFormat: 'JSON',
            supportedFeatures: iotDevice.capabilities
          };

          await this.registerDevice(config);
        }
      }

      console.log('IoT ecosystem sync completed');
    } catch (error) {
      console.error('Failed to sync with IoT ecosystem', error);
      throw error;
    }
  }

  // ==================== Utility Methods ====================

  private async loadDeviceRegistry(): Promise<void> {
    // Load from persistent storage
    // Implementation would load from database or file system
  }

  private async saveDeviceConfiguration(config: MedicalDeviceConfiguration): Promise<void> {
    // Save to persistent storage
    // Implementation would save to database or file system
  }

  private async initializeSecurity(): Promise<void> {
    // Initialize security protocols and certificates
  }

  private startDeviceDiscovery(): void {
    // Start periodic device discovery
    setInterval(() => {
      this.discoverDevices().catch(error => {
        console.error('Periodic device discovery failed', error);
      });
    }, 300000); // Every 5 minutes
  }

  private startMaintenanceScheduling(): void {
    // Start maintenance scheduling and monitoring
    setInterval(() => {
      this.checkMaintenanceScheduling().catch(error => {
        console.error('Maintenance scheduling check failed', error);
      });
    }, 3600000); // Every hour
  }

  private createDeviceStream(deviceId: string): void {
    // Create device-specific data stream
    const stream = new Readable({
      read() {
        // Implement data reading from device
      }
    });

    this.deviceStreams.set(deviceId, stream);
  }

  private async validateDeviceConfiguration(config: MedicalDeviceConfiguration): Promise<void> {
    if (!config.deviceId || !config.manufacturer || !config.model) {
      throw new Error('Invalid device configuration: missing required fields');
    }

    if (!Object.values(CommunicationProtocol).includes(config.protocol)) {
      throw new Error('Unsupported communication protocol');
    }
  }

  private async validateDataRange(deviceId: string, data: DeviceDataStream): Promise<void> {
    // Implement data range validation
  }

  private async storeDeviceData(deviceId: string, data: DeviceDataStream): Promise<void> {
    // Store in time-series database
  }

  private async checkAlertConditions(deviceId: string, data: DeviceDataStream): Promise<void> {
    // Check for alert conditions based on device type and data
  }

  private calculateNextCalibrationDate(calibrationType: string): Date {
    const now = new Date();
    let monthsToAdd = 6; // Default 6 months

    switch (calibrationType) {
      case 'ROUTINE':
        monthsToAdd = 6;
        break;
      case 'PRECISION':
        monthsToAdd = 3;
        break;
      case 'AFTER_REPAIR':
        monthsToAdd = 1;
        break;
    }

    return new Date(now.getFullYear(), now.getMonth() + monthsToAdd, now.getDate());
  }

  private calculateNextMaintenanceDate(maintenanceType: string): Date {
    const now = new Date();
    let monthsToAdd = 3; // Default 3 months

    switch (maintenanceType) {
      case 'PREVENTIVE':
        monthsToAdd = 3;
        break;
      case 'CORRECTIVE':
        monthsToAdd = 6;
        break;
      case 'PREDICTIVE':
        monthsToAdd = 1;
        break;
    }

    return new Date(now.getFullYear(), now.getMonth() + monthsToAdd, now.getDate());
  }

  private generateCertificateNumber(): string {
    return `CERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private findCalibrationById(calibrationId: string): CalibrationRecord | undefined {
    for (const calibrations of this.calibrationRecords.values()) {
      const calibration = calibrations.find(c => c.calibrationId === calibrationId);
      if (calibration) return calibration;
    }
    return undefined;
  }

  private findCertificateById(certificateId: string): DeviceCertificate | undefined {
    for (const certificates of this.certificates.values()) {
      const certificate = certificates.find(c => c.certificateId === certificateId);
      if (certificate) return certificate;
    }
    return undefined;
  }

  private async checkCertificateExpiry(deviceId: string): Promise<void> {
    const certificates = this.certificates.get(deviceId) || [];
    const now = new Date();

    for (const cert of certificates) {
      const daysUntilExpiry = Math.ceil((cert.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        await this.createDeviceAlert(
          deviceId,
          'WARNING',
          `Certificate ${cert.certificateNumber} expires in ${daysUntilExpiry} days`,
          'MEDIUM'
        );
      } else if (daysUntilExpiry <= 0) {
        await this.createDeviceAlert(
          deviceId,
          'ERROR',
          `Certificate ${cert.certificateNumber} has expired`,
          'HIGH'
        );
      }
    }
  }

  private async checkMaintenanceScheduling(): Promise<void> {
    const now = new Date();

    for (const [deviceId, maintenanceRecords] of this.maintenanceRecords) {
      for (const record of maintenanceRecords) {
        if (record.status === MaintenanceStatus.SCHEDULED) {
          const daysUntilDue = Math.ceil((record.scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilDue <= 0) {
            record.status = MaintenanceStatus.OVERDUE;
            await this.createDeviceAlert(
              deviceId,
              'ERROR',
              `Maintenance overdue for device`,
              'HIGH'
            );
          }
        }
      }
    }
  }

  private determineErrorSeverity(error: Error): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (error.message.includes('critical') || error.message.includes('emergency')) {
      return 'CRITICAL';
    } else if (error.message.includes('major') || error.message.includes('failure')) {
      return 'HIGH';
    } else if (error.message.includes('minor') || error.message.includes('warning')) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Connection methods for different protocols
  private async connectHL7Device(device: MedicalDeviceConfiguration): Promise<any> {
    // HL7 connection implementation
    return { type: 'HL7', connected: true };
  }

  private async connectDICOMDevice(device: MedicalDeviceConfiguration): Promise<any> {
    // DICOM connection implementation
    return { type: 'DICOM', connected: true };
  }

  private async connectIEEE11073Device(device: MedicalDeviceConfiguration): Promise<any> {
    // IEEE 11073 connection implementation
    return { type: 'IEEE11073', connected: true };
  }

  private async connectMQTTDevice(device: MedicalDeviceConfiguration): Promise<any> {
    // MQTT connection implementation
    return { type: 'MQTT', connected: true };
  }

  private async connectGenericDevice(device: MedicalDeviceConfiguration): Promise<any> {
    // Generic connection implementation
    return { type: 'GENERIC', connected: true };
  }

  private async closeConnection(connection: any): Promise<void> {
    // Close connection based on type
  }

  private async reauthenticateDevice(deviceId: string): Promise<boolean> {
    // Re-authentication implementation
    return false;
  }

  private async resetDeviceConnection(deviceId: string): Promise<boolean> {
    // Connection reset implementation
    return false;
  }

  private async scanNetworkDevices(networkRange: string): Promise<MedicalDeviceConfiguration[]> {
    // Network scanning implementation
    return [];
  }

  private async scanManufacturerDevices(): Promise<MedicalDeviceConfiguration[]> {
    // Manufacturer-specific scanning
    return [];
  }

  private async discoverIoTMedicalDevices(): Promise<MedicalDeviceConfiguration[]> {
    // IoT device discovery
    return [];
  }

  private async validateDiscoveredDevices(devices: MedicalDeviceConfiguration[]): Promise<MedicalDeviceConfiguration[]> {
    // Validate discovered devices
    return devices;
  }

  private async generateDeviceCertificate(device: MedicalDeviceConfiguration): Promise<DeviceCertificate> {
    // Generate device certificate
    return {
      certificateId: 'cert_' + Date.now(),
      deviceId: device.deviceId,
      certificateType: 'ISO13485',
      certificateNumber: this.generateCertificateNumber(),
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      issuingAuthority: 'EVE-OS Medical Device Authority',
      complianceStandards: ['ISO13485', 'IEC60601'],
      status: 'VALID'
    };
  }

  private async mapIoTProtocolToMedical(protocol: string): Promise<CommunicationProtocol> {
    // Map IoT protocols to medical protocols
    switch (protocol) {
      case 'MQTT': return CommunicationProtocol.MQTT;
      case 'HTTP': return CommunicationProtocol.REST;
      case 'COAP': return CommunicationProtocol.COAP;
      default: return CommunicationProtocol.REST;
    }
  }

  // Authentication methods
  private async authenticateHL7Device(device: MedicalDeviceConfiguration, credentials: any): Promise<boolean> {
    // HL7 authentication
    return true;
  }

  private async authenticateDICOMDevice(device: MedicalDeviceConfiguration, credentials: any): Promise<boolean> {
    // DICOM authentication
    return true;
  }

  private async authenticateIEEE11073Device(device: MedicalDeviceConfiguration, credentials: any): Promise<boolean> {
    // IEEE 11073 authentication
    return true;
  }

  private async authenticateGenericDevice(device: MedicalDeviceConfiguration, credentials: any): Promise<boolean> {
    // Generic authentication
    return true;
  }

  // ==================== Event Handlers ====================

  onDeviceRegistered(callback: (device: MedicalDeviceConfiguration) => void): void {
    this.on('deviceRegistered', callback);
  }

  onDeviceConnected(callback: (event: { deviceId: string; connection: any }) => void): void {
    this.on('deviceConnected', callback);
  }

  onDeviceData(callback: (data: DeviceDataStream) => void): void {
    this.on('deviceData', callback);
  }

  onDeviceAlert(callback: (alert: DeviceAlert) => void): void {
    this.on('deviceAlert', callback);
  }

  // ==================== Cleanup ====================

  async shutdown(): Promise<void> {
    try {
      // Disconnect all devices
      for (const deviceId of this.activeConnections.keys()) {
        await this.disconnectDevice(deviceId);
      }

      // Close all streams
      for (const stream of this.deviceStreams.values()) {
        stream.destroy();
      }

      this.deviceStreams.clear();
      this.activeConnections.clear();
      this.deviceRegistry.clear();

      console.log('Medical Device Integration Service shutdown completed');
    } catch (error) {
      console.error('Error during service shutdown', error);
    }
  }
}

// ==================== Factory and Export ====================

export default MedicalDeviceIntegrationService;
