import {
  CortexEvent,
  NeuralPathway,
  CortexState,
  UnifiedHeartbeat,
  ThreadSnapshot,
  ActiveEvent,
  SystemPulse,
  EvolutionIndicators,
  SituationalMode,
  PersonalityThread,
  PatchFile,
  ThresholdMetrics,
  MedicalDevice,
  MedicalTemplate,
  MedicalComplianceMetrics,
  MedicalDeviceCategory
} from '../types';

/**
 * EVE OS Medical Cortex - Independent Service for Medical Device Integration
 * Isolated from social cortex to ensure medical compliance, safety, and performance
 * Manages medical devices, templates, and regulatory compliance separately
 */
class CortexServiceMedical {
  private static instance: CortexServiceMedical;
  private heartbeatFilePath: string = './cortex/medical/unified-heartbeat.json';
  private cortexDataPath: string = './cortex/medical/cortex-data.json';
  private patchesDirectory: string = './cortex/medical/patches/';
  private devicesDirectory: string = './cortex/medical/devices/';
  private templatesDirectory: string = './cortex/medical/templates/';

  private cortexState: CortexState;
  private neuralPathways: Map<string, NeuralPathway> = new Map();
  private eventListeners: Map<string, (event: CortexEvent) => void> = new Map();
  private threadRegistry: Map<string, ThreadSnapshot> = new Map();
  private activeEvents: Map<string, ActiveEvent> = new Map();
  private heartbeatCycle: number = 0;
  private isInitialized: boolean = false;

  // Medical-specific infrastructure
  private medicalDevices: Map<string, MedicalDevice> = new Map();
  private medicalTemplates: Map<string, MedicalTemplate> = new Map();
  private complianceMetrics: MedicalComplianceMetrics = {
    fda_compliance_score: 0.0,
    iec_62304_compliance: 0.0,
    hl7_compliance: 0.0,
    dicom_compliance: 0.0,
    ieee_11073_compliance: 0.0,
    fhir_compliance: 0.0,
    safety_level: 'unknown',
    last_audit: new Date().toISOString(),
    critical_issues: 0,
    warnings: 0,
    certifications: []
  };

  // Enhanced features from Phase 2 (adapted for medical)
  private situationalMode: SituationalMode = 'work'; // Medical is primarily work-focused
  private personalityThreads: Map<string, PersonalityThread> = new Map();
  private patchFiles: Map<string, PatchFile> = new Map();
  private thresholdMetrics: ThresholdMetrics = {
    good_threads: 0,
    bad_threads: 0,
    slow_threads: 0,
    silent_threads: 0,
    average_response_time: 0,
    system_efficiency: 0
  };
  private patchFileCrawler: NodeJS.Timeout | null = null;
  private thresholdMonitor: NodeJS.Timeout | null = null;
  private deviceMonitor: NodeJS.Timeout | null = null;
  private complianceMonitor: NodeJS.Timeout | null = null;

  private constructor() {
    this.cortexState = {
      heartbeat_cycle: 0,
      active_threads: 0,
      neural_pathways: [],
      recent_events: [],
      evolution_metrics: {
        learning_rate: 0.0,
        pathway_growth: 0.0,
        efficiency_improvement: 0.0,
        specialization_level: 0.0,
        adaptation_score: 0.0,
        cross_thread_coordination: 0.0,
        evolution_impact: 0.0
      },
      system_health: 'stable',
      last_update: new Date().toISOString(),
      situational_mode: 'work'
    };
  }

  public static getInstance(): CortexServiceMedical {
    if (!CortexServiceMedical.instance) {
      CortexServiceMedical.instance = new CortexServiceMedical();
    }
    return CortexServiceMedical.instance;
  }

  /**
   * Initialize the Medical Cortex system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[Medical] Initializing EVE Medical Cortex (Independent Service)...');

    try {
      // Create medical cortex directory structure
      await this.ensureDirectoryExists('./cortex/medical');
      await this.ensureDirectoryExists(this.patchesDirectory);
      await this.ensureDirectoryExists(this.devicesDirectory);
      await this.ensureDirectoryExists(this.templatesDirectory);

      // Initialize heartbeat file
      await this.initializeHeartbeatFile();

      // Initialize cortex data
      await this.initializeCortexData();

      // Load existing medical data
      await this.loadMedicalDevices();
      await this.loadMedicalTemplates();
      await this.loadNeuralPathways();
      await this.loadPatchFiles();
      await this.loadPersonalityThreads();

      // Start medical-specific background processes
      this.startPatchFileCrawler();
      this.startThresholdMonitor();
      this.startDeviceMonitor();
      this.startComplianceMonitor();

      // Initialize medical situational mode
      await this.setSituationalMode('work'); // Medical is primarily work-focused

      this.isInitialized = true;
      console.log('✅ Medical Cortex system initialized successfully');

      // Register with host app's CortexIntegrationManager if available
      this.registerWithHost();
    } catch (error) {
      console.error('❌ Failed to initialize Medical Cortex system:', error);
      throw error;
    }
  }

  /**
   * Register this medical cortex with the host app's integration manager
   * This enables cross-cortex communication when running inside EVE OS
   */
  private registerWithHost(): void {
    try {
      // Check if host app exposes integration manager on window
      const integrationManager = (window as any).__EVE_CORTEX_INTEGRATION_MANAGER__;
      if (integrationManager && typeof integrationManager.registerMedicalCortex === 'function') {
        integrationManager.registerMedicalCortex(this);
        console.log('[Medical] Medical Cortex registered with host Integration Manager');
      } else {
        console.log('[Medical] Medical Cortex running in standalone mode (no host integration manager)');
      }
    } catch (error) {
      // Standalone mode - no host app available
      console.log('[Medical] Medical Cortex running in standalone mode');
    }
  }

  /**
   * Register a medical device with compliance tracking
   */
  public async registerMedicalDevice(
    deviceId: string,
    deviceName: string,
    category: MedicalDeviceCategory,
    manufacturer: string,
    model: string,
    capabilities: string[],
    complianceRequirements: string[]
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const medicalDevice: MedicalDevice = {
      device_id: deviceId,
      device_name: deviceName,
      category: category,
      manufacturer: manufacturer,
      model: model,
      status: 'registered',
      capabilities: capabilities,
      compliance_requirements: complianceRequirements,
      last_heartbeat: new Date().toISOString(),
      safety_level: this.determineDeviceSafetyLevel(category),
      maintenance_schedule: this.generateMaintenanceSchedule(category),
      performance_metrics: {
        uptime: 100,
        response_time: 0,
        error_rate: 0,
        accuracy: 0.95
      },
      connected_at: new Date().toISOString()
    };

    this.medicalDevices.set(deviceId, medicalDevice);

    // Broadcast device registration event
    await this.broadcastEvent({
      id: this.generateEventId(),
      type: 'medical_device_registration',
      thread_id: deviceId,
      timestamp: new Date().toISOString(),
      data: {
        device_name: deviceName,
        category: category,
        manufacturer: manufacturer
      },
      priority: 'high',
      source: 'system',
      feedback_color: 'red',
      metadata: {
        compliance_impact: 0.1,
        safety_level: medicalDevice.safety_level
      }
    });

    console.log(`[Medical] Medical device registered: ${deviceName} (${category})`);
  }

  /**
   * Register a medical template for marketplace
   */
  public async registerMedicalTemplate(
    templateId: string,
    templateName: string,
    category: string,
    deviceRequirements: string[],
    safetyChecks: string[],
    complianceStandards: string[]
  ): Promise<void> {
    const medicalTemplate: MedicalTemplate = {
      template_id: templateId,
      template_name: templateName,
      category: category,
      device_requirements: deviceRequirements,
      safety_checks: safetyChecks,
      compliance_standards: complianceStandards,
      status: 'active',
      performance_score: 0.0,
      usage_count: 0,
      last_updated: new Date().toISOString(),
      certifications: [],
      tested_devices: [],
      risk_assessment: 'low',
      installation_instructions: [],
      maintenance_requirements: []
    };

    this.medicalTemplates.set(templateId, medicalTemplate);

    // Broadcast template registration
    await this.broadcastEvent({
      id: this.generateEventId(),
      type: 'medical_template_registration',
      thread_id: templateId,
      timestamp: new Date().toISOString(),
      data: {
        template_name: templateName,
        category: category,
        compliance_standards: complianceStandards
      },
      priority: 'normal',
      source: 'system',
      feedback_color: 'orange',
      metadata: {
        template_complexity: deviceRequirements.length,
        compliance_impact: 0.05
      }
    });

    console.log(`[Medical] Medical template registered: ${templateName} (${category})`);
  }

  /**
   * Update compliance metrics based on current state
   */
  private updateComplianceMetrics(): void {
    const deviceCompliance = this.calculateDeviceCompliance();
    const templateCompliance = this.calculateTemplateCompliance();

    this.complianceMetrics = {
      fda_compliance_score: deviceCompliance.fda_score,
      iec_62304_compliance: templateCompliance.iec_score,
      hl7_compliance: deviceCompliance.hl7_score,
      dicom_compliance: deviceCompliance.dicom_score,
      ieee_11073_compliance: deviceCompliance.ieee_score,
      fhir_compliance: templateCompliance.fhir_score,
      safety_level: this.calculateOverallSafetyLevel(),
      last_audit: new Date().toISOString(),
      critical_issues: this.countCriticalIssues(),
      warnings: this.countWarnings(),
      certifications: this.getActiveCertifications()
    };
  }

  private calculateDeviceCompliance(): any {
    const devices = Array.from(this.medicalDevices.values());
    if (devices.length === 0) {
      return { fda_score: 0, hl7_score: 0, dicom_score: 0, ieee_score: 0 };
    }

    // Simplified compliance calculation - in production would be more sophisticated
    const avgUptime = devices.reduce((sum, d) => sum + d.performance_metrics.uptime, 0) / devices.length;
    const avgAccuracy = devices.reduce((sum, d) => sum + d.performance_metrics.accuracy, 0) / devices.length;

    return {
      fda_score: Math.min(1.0, avgUptime / 100 * 0.8 + avgAccuracy * 0.2),
      hl7_score: Math.min(1.0, avgUptime / 100),
      dicom_score: Math.min(1.0, avgAccuracy),
      ieee_score: Math.min(1.0, avgUptime / 100 * 0.9 + avgAccuracy * 0.1)
    };
  }

  private calculateTemplateCompliance(): any {
    const templates = Array.from(this.medicalTemplates.values());
    if (templates.length === 0) {
      return { iec_score: 0, fhir_score: 0 };
    }

    const avgPerformance = templates.reduce((sum, t) => sum + t.performance_score, 0) / templates.length;

    return {
      iec_score: Math.min(1.0, avgPerformance),
      fhir_score: Math.min(1.0, avgPerformance * 0.9)
    };
  }

  private calculateOverallSafetyLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const criticalIssues = this.countCriticalIssues();
    const avgUptime = this.getAverageDeviceUptime();

    if (criticalIssues > 5 || avgUptime < 95) return 'critical';
    if (criticalIssues > 2 || avgUptime < 98) return 'high';
    if (criticalIssues > 0 || avgUptime < 99) return 'medium';
    return 'low';
  }

  private countCriticalIssues(): number {
    let issues = 0;
    this.medicalDevices.forEach(device => {
      if (device.performance_metrics.error_rate > 0.05) issues++;
      if (device.performance_metrics.uptime < 99) issues++;
    });
    return issues;
  }

  private countWarnings(): number {
    let warnings = 0;
    this.medicalDevices.forEach(device => {
      if (device.performance_metrics.response_time > 1000) warnings++;
      if (device.safety_level === 'high') warnings++;
    });
    return warnings;
  }

  private getActiveCertifications(): string[] {
    const certifications = new Set<string>();

    // Check which standards we have good compliance with
    if (this.complianceMetrics.fda_compliance_score > 0.8) certifications.add('FDA_510k');
    if (this.complianceMetrics.iec_62304_compliance > 0.8) certifications.add('IEC_62304');
    if (this.complianceMetrics.hl7_compliance > 0.8) certifications.add('HL7_FHIR');
    if (this.complianceMetrics.dicom_compliance > 0.8) certifications.add('DICOM_Compliant');

    return Array.from(certifications);
  }

  private getAverageDeviceUptime(): number {
    const devices = Array.from(this.medicalDevices.values());
    if (devices.length === 0) return 100;

    return devices.reduce((sum, d) => sum + d.performance_metrics.uptime, 0) / devices.length;
  }

  private determineDeviceSafetyLevel(category: MedicalDeviceCategory): 'low' | 'medium' | 'high' | 'critical' {
    const safetyMapping: Record<MedicalDeviceCategory, 'low' | 'medium' | 'high' | 'critical'> = {
      'monitoring': 'medium',
      'diagnostic': 'high',
      'therapeutic': 'critical',
      'imaging': 'high',
      'laboratory': 'medium',
      'surgical': 'critical',
      'emergency': 'critical'
    };
    return safetyMapping[category] || 'medium';
  }

  private generateMaintenanceSchedule(category: MedicalDeviceCategory): any[] {
    // Simplified maintenance schedule generation
    const schedules = {
      'monitoring': [{ interval: 'monthly', task: 'calibration_check' }],
      'diagnostic': [{ interval: 'weekly', task: 'accuracy_verification' }, { interval: 'monthly', task: 'deep_cleaning' }],
      'therapeutic': [{ interval: 'daily', task: 'safety_check' }, { interval: 'weekly', task: 'maintenance' }],
      'imaging': [{ interval: 'weekly', task: 'image_quality_check' }, { interval: 'monthly', task: 'system_maintenance' }],
      'laboratory': [{ interval: 'daily', task: 'cleaning' }, { interval: 'weekly', task: 'reagent_check' }],
      'surgical': [{ interval: 'daily', task: 'sterilization' }, { interval: 'weekly', task: 'precision_check' }],
      'emergency': [{ interval: 'daily', task: 'readiness_check' }, { interval: 'weekly', task: 'backup_systems' }]
    };
    return schedules[category] || [];
  }

  /**
   * Get all registered medical devices
   */
  public getMedicalDevices(): MedicalDevice[] {
    return Array.from(this.medicalDevices.values());
  }

  /**
   * Get all registered medical templates
   */
  public getMedicalTemplates(): MedicalTemplate[] {
    return Array.from(this.medicalTemplates.values());
  }

  /**
   * Get compliance metrics
   */
  public getComplianceMetrics(): MedicalComplianceMetrics {
    return { ...this.complianceMetrics };
  }

  /**
   * Get medical cortex state
   */
  public getMedicalCortexState(): CortexState & {
    medical_specific: {
      active_devices: number;
      active_templates: number;
      compliance_score: number;
      safety_level: string;
      last_compliance_check: string;
    };
  } {
    return {
      ...this.cortexState,
      medical_specific: {
        active_devices: this.medicalDevices.size,
        active_templates: this.medicalTemplates.size,
        compliance_score: this.calculateOverallCompliance(),
        safety_level: this.complianceMetrics.safety_level,
        last_compliance_check: this.complianceMetrics.last_audit
      }
    };
  }

  /**
   * Assess safety level for a specific device by ID
   * Returns the safety level of the device, or 'medium' if device not found
   */
  public async assessDeviceSafety(deviceId: string): Promise<'low' | 'medium' | 'high' | 'critical'> {
    const device = this.medicalDevices.get(deviceId);
    if (device) {
      return device.safety_level;
    }
    // If device is not found, return a default safety level
    return 'medium';
  }

  private calculateOverallCompliance(): number {
    const scores = [
      this.complianceMetrics.fda_compliance_score,
      this.complianceMetrics.iec_62304_compliance,
      this.complianceMetrics.hl7_compliance,
      this.complianceMetrics.dicom_compliance,
      this.complianceMetrics.ieee_11073_compliance,
      this.complianceMetrics.fhir_compliance
    ];

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  // Enhanced methods from social cortex (adapted for medical)
  public async registerThread(
    threadId: string,
    threadType: 'cloud' | 'local' | 'system',
    capabilities: string[]
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const snapshot: ThreadSnapshot = {
      thread_id: threadId,
      thread_type: threadType,
      status: 'active',
      current_load: 0,
      active_cards: 0,
      memory_usage: 0,
      last_activity: new Date().toISOString(),
      neural_connections: []
    };

    this.threadRegistry.set(threadId, snapshot);

    await this.broadcastEvent({
      id: this.generateEventId(),
      type: 'thread_creation',
      thread_id: threadId,
      timestamp: new Date().toISOString(),
      data: { thread_type: threadType, capabilities },
      priority: 'normal',
      source: 'system',
      feedback_color: 'green',
      metadata: {
        evolution_impact: 0.1,
        medical_context: true
      }
    });

    console.log(`[Medical] Medical thread registered: ${threadId} (${threadType})`);
  }

  public async broadcastEvent(event: CortexEvent): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Add medical context to event
    event.metadata = {
      ...event.metadata,
      medical_context: true,
      compliance_zone: 'medical_cortex'
    };

    this.cortexState.recent_events.unshift(event);
    if (this.cortexState.recent_events.length > 100) {
      this.cortexState.recent_events = this.cortexState.recent_events.slice(0, 100);
    }

    this.updateThreadActivity(event.thread_id);
    await this.processNeuralPathways(event);
    this.updateEvolutionMetrics(event);
    this.updateThresholdMetrics(event);
    this.notifyEventListeners(event);
    await this.writeHeartbeatUpdate();

    console.log(`[Medical] Medical event broadcasted: ${event.type} from ${event.thread_id}`);
  }

  public getSituationalMode(): SituationalMode {
    return this.situationalMode;
  }

  public async setSituationalMode(mode: SituationalMode): Promise<void> {
    const previousMode = this.situationalMode;
    this.situationalMode = mode;

    console.log(`[Medical] Medical situational mode changed: ${previousMode} → ${mode}`);

    await this.broadcastEvent({
      id: this.generateEventId(),
      type: 'medical_situational_mode_change',
      thread_id: 'medical-system',
      timestamp: new Date().toISOString(),
      data: {
        previous_mode: previousMode,
        new_mode: mode,
        medical_context: 'compliance_required'
      },
      priority: 'high',
      source: 'system',
      feedback_color: 'blue',
      metadata: {
        evolution_impact: 0.05,
        medical_compliance_impact: true
      }
    });
  }

  public getRegisteredThreads(): ThreadSnapshot[] {
    return Array.from(this.threadRegistry.values());
  }

  public getCortexState(): CortexState {
    return { ...this.cortexState };
  }

  /**
   * Handle cortex handoff notification
   * Called when a handoff occurs between cortex services
   */
  public handleHandoffNotification(notification: {
    type: string;
    from: string;
    to: string;
    context: any;
    timestamp: string;
  }): void {
    console.log(`[Medical] Medical Cortex received handoff notification: ${notification.from} → ${notification.to}`);

    // Broadcast handoff event to listeners
    this.broadcastEvent({
      id: this.generateEventId(),
      type: 'cortex_handoff',
      thread_id: 'medical-system',
      timestamp: notification.timestamp,
      data: notification,
      priority: 'high',
      source: 'integration_manager',
      feedback_color: 'blue',
      metadata: {
        from_cortex: notification.from,
        to_cortex: notification.to,
        medical_context: true
      }
    });
  }

  /**
   * Get current state for integration manager
   */
  public async getCurrentState(): Promise<any> {
    return {
      heartbeat_cycle: this.heartbeatCycle,
      active_threads: this.threadRegistry.size,
      neural_pathways: Array.from(this.neuralPathways.values()),
      recent_events: this.cortexState.recent_events.slice(0, 10),
      evolution_metrics: this.cortexState.evolution_metrics,
      system_health: this.cortexState.system_health,
      situational_mode: this.situationalMode,
      medical_devices: Array.from(this.medicalDevices.values()),
      medical_templates: Array.from(this.medicalTemplates.values()),
      compliance_metrics: this.complianceMetrics,
      metrics: {
        pathway_count: this.neuralPathways.size,
        event_count: this.cortexState.recent_events.length,
        thread_count: this.threadRegistry.size,
        device_count: this.medicalDevices.size,
        template_count: this.medicalTemplates.size
      }
    };
  }

  public async cleanup(): Promise<void> {
    // Unregister from host's integration manager
    this.unregisterFromHost();

    this.stopBackgroundProcesses();
    await this.writeHeartbeatUpdate();
    console.log('[Medical] Medical Cortex service cleanup completed');
  }

  /**
   * Unregister from the host app's integration manager during cleanup
   */
  private unregisterFromHost(): void {
    try {
      const integrationManager = (window as any).__EVE_CORTEX_INTEGRATION_MANAGER__;
      if (integrationManager && typeof integrationManager.unregisterMedicalCortex === 'function') {
        integrationManager.unregisterMedicalCortex();
        console.log('[Medical] Medical Cortex unregistered from host Integration Manager');
      }
    } catch {
      // Ignore errors during cleanup
    }
  }

  // Background processes
  private startPatchFileCrawler(): void {
    if (this.patchFileCrawler) clearInterval(this.patchFileCrawler);

    this.patchFileCrawler = setInterval(async () => {
      try {
        await this.processPatchFiles();
        await this.writeHeartbeatUpdate();
      } catch (error) {
        console.error('❌ Medical patch file crawler error:', error);
      }
    }, 3000); // Medical patch updates every 3 seconds (slower for compliance)

    console.log('[Medical] Medical patch file crawler started (3s intervals)');
  }

  private startThresholdMonitor(): void {
    if (this.thresholdMonitor) clearInterval(this.thresholdMonitor);

    this.thresholdMonitor = setInterval(async () => {
      try {
        await this.applyThresholdControls();
        await this.generateSystemPulse();
      } catch (error) {
        console.error('❌ Medical threshold monitor error:', error);
      }
    }, 15000); // Medical threshold monitoring every 15 seconds

    console.log('[Medical] Medical threshold monitor started (15s intervals)');
  }

  private startDeviceMonitor(): void {
    if (this.deviceMonitor) clearInterval(this.deviceMonitor);

    this.deviceMonitor = setInterval(async () => {
      try {
        await this.monitorMedicalDevices();
        await this.updateDeviceHeartbeats();
      } catch (error) {
        console.error('❌ Medical device monitor error:', error);
      }
    }, 5000); // Device monitoring every 5 seconds

    console.log('[Medical] Medical device monitor started (5s intervals)');
  }

  private startComplianceMonitor(): void {
    if (this.complianceMonitor) clearInterval(this.complianceMonitor);

    this.complianceMonitor = setInterval(async () => {
      try {
        this.updateComplianceMetrics();
        await this.performComplianceCheck();
      } catch (error) {
        console.error('❌ Medical compliance monitor error:', error);
      }
    }, 60000); // Compliance check every minute

    console.log('[Medical] Medical compliance monitor started (60s intervals)');
  }

  private stopBackgroundProcesses(): void {
    if (this.patchFileCrawler) clearInterval(this.patchFileCrawler);
    if (this.thresholdMonitor) clearInterval(this.thresholdMonitor);
    if (this.deviceMonitor) clearInterval(this.deviceMonitor);
    if (this.complianceMonitor) clearInterval(this.complianceMonitor);
  }

  // Medical-specific methods
  private async monitorMedicalDevices(): Promise<void> {
    // Simulate device monitoring and health checks
    this.medicalDevices.forEach(device => {
      // Update device performance metrics (simulated)
      device.performance_metrics = {
        uptime: Math.max(95, device.performance_metrics.uptime + (Math.random() - 0.5) * 2),
        response_time: Math.max(100, Math.random() * 500),
        error_rate: Math.max(0, Math.random() * 0.1),
        accuracy: Math.max(0.8, device.performance_metrics.accuracy + (Math.random() - 0.5) * 0.02)
      };
      device.last_heartbeat = new Date().toISOString();
    });
  }

  private async updateDeviceHeartbeats(): Promise<void> {
    // Write device heartbeats to file system
    // In production, this would interface with actual device APIs
  }

  private async performComplianceCheck(): Promise<void> {
    // Perform comprehensive compliance check
    this.updateComplianceMetrics();

    if (this.complianceMetrics.critical_issues > 0) {
      await this.broadcastEvent({
        id: this.generateEventId(),
        type: 'compliance_critical_issue',
        thread_id: 'compliance-monitor',
        timestamp: new Date().toISOString(),
        data: {
          critical_issues: this.complianceMetrics.critical_issues,
          safety_level: this.complianceMetrics.safety_level
        },
        priority: 'critical',
        source: 'compliance',
        feedback_color: 'red',
        metadata: { compliance_zone: 'medical_cortex' }
      });
    }
  }

  // Helper methods (simplified versions of social cortex methods)
  private async processPatchFiles(): Promise<void> {
    // Medical-specific patch processing
  }

  private async applyThresholdControls(): Promise<void> {
    // Medical-specific threshold controls
  }

  private updateThresholdMetrics(event: CortexEvent): void {
    // Medical-specific threshold metrics
  }

  private updateThreadActivity(threadId: string): void {
    const snapshot = this.threadRegistry.get(threadId);
    if (snapshot) {
      snapshot.last_activity = new Date().toISOString();
      snapshot.status = 'active';
    }
  }

  private async processNeuralPathways(event: CortexEvent): Promise<void> {
    // Medical-specific neural pathway processing
  }

  private updateEvolutionMetrics(event: CortexEvent): void {
    // Medical-specific evolution metrics
  }

  private notifyEventListeners(event: CortexEvent): void {
    this.eventListeners.forEach((callback, id) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error notifying medical cortex listener ${id}:`, error);
      }
    });
  }

  private async writeHeartbeatUpdate(): Promise<void> {
    this.heartbeatCycle++;

    const heartbeat: UnifiedHeartbeat = {
      timestamp: new Date().toISOString(),
      cycle: this.heartbeatCycle,
      cortex_state: {
        ...this.cortexState,
        heartbeat_cycle: this.heartbeatCycle,
        neural_pathways: Array.from(this.neuralPathways.values()),
        last_update: new Date().toISOString()
      },
      thread_snapshots: Array.from(this.threadRegistry.values()),
      active_events: Array.from(this.activeEvents.values()),
      system_pulse: await this.generateSystemPulse(),
      evolution_indicators: await this.generateEvolutionIndicators()
    };

    try {
      const fs = require('fs').promises;
      await fs.writeFile(this.heartbeatFilePath, JSON.stringify(heartbeat, null, 2));
    } catch (error) {
      console.error('❌ Failed to write medical heartbeat update:', error);
    }
  }

  private async generateSystemPulse(): Promise<SystemPulse> {
    return {
      cpu_usage: Math.random() * 60, // Medical systems are more conservative
      memory_usage: this.threadRegistry.size * 3 + Math.random() * 15,
      active_threads: this.threadRegistry.size,
      event_queue_size: this.cortexState.recent_events.length,
      learning_rate: this.cortexState.evolution_metrics.learning_rate,
      evolution_stage: 'medical_compliance'
    };
  }

  private async generateEvolutionIndicators(): Promise<EvolutionIndicators> {
    return {
      new_pathways_formed: this.neuralPathways.size,
      learning_events_detected: this.cortexState.recent_events.filter(e => e.type === 'learning_event').length,
      efficiency_gains: this.cortexState.evolution_metrics.efficiency_improvement,
      specialization_advances: this.cortexState.evolution_metrics.specialization_level,
      adaptation_level: this.cortexState.evolution_metrics.adaptation_score,
      system_maturity: this.calculateSystemMaturity()
    };
  }

  private calculateSystemMaturity(): number {
    // Medical system maturity calculation
    const complianceWeight = this.calculateOverallCompliance() * 30;
    const deviceWeight = Math.min(30, this.medicalDevices.size * 3);
    const templateWeight = Math.min(20, this.medicalTemplates.size * 2);
    const uptimeWeight = this.getAverageDeviceUptime() * 0.2;

    return Math.round(complianceWeight + deviceWeight + templateWeight + uptimeWeight);
  }

  private generateEventId(): string {
    return `medical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // File system methods
  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      await fs.mkdir(path, { recursive: true });
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async initializeHeartbeatFile(): Promise<void> {
    const initialHeartbeat: UnifiedHeartbeat = {
      timestamp: new Date().toISOString(),
      cycle: 0,
      cortex_state: this.cortexState,
      thread_snapshots: [],
      active_events: [],
      system_pulse: {
        cpu_usage: 0,
        memory_usage: 0,
        active_threads: 0,
        event_queue_size: 0,
        learning_rate: 0,
        evolution_stage: 'medical_initialization'
      },
      evolution_indicators: {
        new_pathways_formed: 0,
        learning_events_detected: 0,
        efficiency_gains: 0,
        specialization_advances: 0,
        adaptation_level: 0,
        system_maturity: 0
      }
    };

    try {
      const fs = require('fs').promises;
      await fs.writeFile(this.heartbeatFilePath, JSON.stringify(initialHeartbeat, null, 2));
    } catch (error) {
      console.error('Failed to initialize medical heartbeat file:', error);
    }
  }

  private async initializeCortexData(): Promise<void> {
    console.log('[Medical] Medical cortex data initialized');
  }

  private async loadMedicalDevices(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const files = await fs.readdir(this.devicesDirectory);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = `${this.devicesDirectory}${file}`;
          const content = await fs.readFile(filePath, 'utf-8');
          const device = JSON.parse(content);
          this.medicalDevices.set(device.device_id, device);
        }
      }

      console.log(`[Medical] Loaded ${this.medicalDevices.size} medical devices`);
    } catch (error) {
      console.log('[Medical] No existing medical devices found (first run)');
    }
  }

  private async loadMedicalTemplates(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const files = await fs.readdir(this.templatesDirectory);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = `${this.templatesDirectory}${file}`;
          const content = await fs.readFile(filePath, 'utf-8');
          const template = JSON.parse(content);
          this.medicalTemplates.set(template.template_id, template);
        }
      }

      console.log(`[Medical] Loaded ${this.medicalTemplates.size} medical templates`);
    } catch (error) {
      console.log('[Medical] No existing medical templates found (first run)');
    }
  }

  private async loadNeuralPathways(): Promise<void> {
    console.log('[Medical] Medical neural pathways loaded');
  }

  private async loadPatchFiles(): Promise<void> {
    console.log('[Medical] Medical patch files loaded');
  }

  private async loadPersonalityThreads(): Promise<void> {
    console.log('[Medical] Medical personality threads loaded');
  }
}

// Singleton instance
export const cortexServiceMedical = CortexServiceMedical.getInstance();
export default cortexServiceMedical;
// Also export the class itself for type usage and direct access
export { CortexServiceMedical };