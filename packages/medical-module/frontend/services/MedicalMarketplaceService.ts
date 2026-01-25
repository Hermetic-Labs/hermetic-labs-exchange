import { MedicalTemplate, MedicalDevice } from '../types';
import { cortexServiceMedical } from './CortexServiceMedical';

/**
 * EVE OS Medical Marketplace Service
 * Manages medical device templates, installations, and marketplace operations
 * Provides safety-compliant template management for medical device integration
 */
class MedicalMarketplaceService {
  private static instance: MedicalMarketplaceService;
  private marketplaceDirectory: string = './cortex/medical/marketplace/';
  private installedTemplates: Map<string, MedicalTemplate> = new Map();
  private templateRegistry: Map<string, MedicalTemplate> = new Map();
  private compatibilityMatrix: Map<string, string[]> = new Map(); // device_id -> compatible_template_ids
  private installationHistory: Array<{
    template_id: string;
    device_id: string;
    installation_date: string;
    status: 'success' | 'failed' | 'warning';
    issues: string[];
  }> = [];
  
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): MedicalMarketplaceService {
    if (!MedicalMarketplaceService.instance) {
      MedicalMarketplaceService.instance = new MedicalMarketplaceService();
    }
    return MedicalMarketplaceService.instance;
  }

  /**
   * Initialize the Medical Marketplace Service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[Medical] Initializing Marketplace Service');
    
    try {
      await this.ensureDirectoryExists(this.marketplaceDirectory);
      await this.loadInstalledTemplates();
      await this.loadTemplateRegistry();
      await this.loadInstallationHistory();
      await this.initializeDefaultTemplates();
      await this.buildCompatibilityMatrix();

      this.isInitialized = true;
      console.log('✅ Medical Marketplace Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Medical Marketplace Service:', error);
      throw error;
    }
  }

  /**
   * Install a medical template for a specific device
   */
  public async installTemplate(
    templateId: string,
    deviceId: string,
    installationParams?: Record<string, any>
  ): Promise<{
    success: boolean;
    message: string;
    compatibility_score: number;
    compliance_issues: string[];
    safety_warnings: string[];
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`[Medical] Installing template ${templateId} for device ${deviceId}`);

    try {
      // Get template and device
      const template = this.templateRegistry.get(templateId);
      const device = cortexServiceMedical.getMedicalDevices().find(d => d.device_id === deviceId);

      if (!template) {
        return {
          success: false,
          message: `Template ${templateId} not found`,
          compatibility_score: 0,
          compliance_issues: ['Template not registered'],
          safety_warnings: []
        };
      }

      if (!device) {
        return {
          success: false,
          message: `Device ${deviceId} not found`,
          compatibility_score: 0,
          compliance_issues: ['Device not registered'],
          safety_warnings: []
        };
      }

      // Perform compatibility check
      const compatibilityResult = await this.checkTemplateCompatibility(template, device);
      
      // Perform compliance verification
      const complianceResult = await this.verifyTemplateCompliance(template, device);
      
      // Perform safety assessment
      const safetyResult = await this.assessTemplateSafety(template, device, installationParams);

      const overallScore = (compatibilityResult.score + complianceResult.score + safetyResult.score) / 3;

      if (overallScore < 0.6) {
        // Installation would be unsafe
        const installationRecord = {
          template_id: templateId,
          device_id: deviceId,
          installation_date: new Date().toISOString(),
          status: 'failed' as const,
          issues: [...complianceResult.issues, ...safetyResult.warnings]
        };
        
        this.installationHistory.push(installationRecord);
        await this.saveInstallationHistory();

        return {
          success: false,
          message: 'Installation blocked due to safety/compliance concerns',
          compatibility_score: compatibilityResult.score,
          compliance_issues: complianceResult.issues,
          safety_warnings: safetyResult.warnings
        };
      }

      // Installation approved - proceed with actual installation
      const installationResult = await this.performTemplateInstallation(template, device, installationParams);

      // Update template usage and device capabilities
      template.usage_count++;
      template.last_updated = new Date().toISOString();
      device.capabilities.push(...template.device_requirements);

      // Update compatibility matrix
      if (!this.compatibilityMatrix.has(deviceId)) {
        this.compatibilityMatrix.set(deviceId, []);
      }
      this.compatibilityMatrix.get(deviceId)!.push(templateId);

      // Record successful installation
      const installationRecord = {
        template_id: templateId,
        device_id: deviceId,
        installation_date: new Date().toISOString(),
        status: 'success' as const,
        issues: installationResult.warnings || []
      };

      this.installationHistory.push(installationRecord);
      
      // Save updated data
      await this.saveInstalledTemplate(template);
      await this.saveDeviceUpdate(device);
      await this.saveInstallationHistory();
      await this.saveCompatibilityMatrix();

      // Broadcast installation event
      await cortexServiceMedical.broadcastEvent({
        id: this.generateEventId(),
        type: 'system_evolution',
        thread_id: deviceId,
        timestamp: new Date().toISOString(),
        data: { 
          template_id: templateId, 
          device_id: deviceId,
          compatibility_score: overallScore 
        },
        priority: 'normal',
        source: 'system',
        feedback_color: 'green',
        metadata: {
          medical_context: true
        }
      });

      console.log(`✅ Template ${templateId} installed successfully on device ${deviceId}`);

      return {
        success: true,
        message: 'Template installed successfully',
        compatibility_score: overallScore,
        compliance_issues: complianceResult.issues,
        safety_warnings: safetyResult.warnings
      };

    } catch (error) {
      console.error(`❌ Template installation failed:`, error);
      
      return {
        success: false,
        message: `Installation failed: ${(error as Error).message}`,
        compatibility_score: 0,
        compliance_issues: ['Installation error'],
        safety_warnings: []
      };
    }
  }

  /**
   * Check template compatibility with device
   */
  private async checkTemplateCompatibility(
    template: MedicalTemplate, 
    device: MedicalDevice
  ): Promise<{ score: number; issues: string[] }> {
    const issues: string[] = [];
    let score = 1.0;

    // Check device category compatibility
    if (!this.isCategoryCompatible(template.category, device.category)) {
      score -= 0.4;
      issues.push(`Template category ${template.category} not compatible with device category ${device.category}`);
    }

    // Check device requirements
    for (const requirement of template.device_requirements) {
      if (!device.capabilities.includes(requirement)) {
        score -= 0.2;
        issues.push(`Device missing required capability: ${requirement}`);
      }
    }

    // Check manufacturer compatibility
    if (template.compliance_standards.includes('manufacturer_specific')) {
      if (template.template_name.includes(device.manufacturer)) {
        // Compatible manufacturer
      } else {
        score -= 0.3;
        issues.push('Template requires specific manufacturer compatibility');
      }
    }

    // Check performance requirements
    if (template.performance_score > 0.9 && device.performance_metrics.accuracy < 0.95) {
      score -= 0.2;
      issues.push('Template requires higher device accuracy than current device provides');
    }

    return {
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Verify template compliance with medical standards
   */
  private async verifyTemplateCompliance(
    template: MedicalTemplate,
    device: MedicalDevice
  ): Promise<{ score: number; issues: string[] }> {
    const issues: string[] = [];
    let score = 1.0;

    // Check required safety checks
    for (const safetyCheck of template.safety_checks) {
      if (!this.isSafetyCheckAvailable(safetyCheck, device)) {
        score -= 0.15;
        issues.push(`Required safety check not available: ${safetyCheck}`);
      }
    }

    // Check compliance standards
    for (const standard of template.compliance_standards) {
      if (!this.isComplianceStandardMet(standard, device)) {
        score -= 0.2;
        issues.push(`Compliance standard not met: ${standard}`);
      }
    }

    // Check device safety level
    if (device.safety_level === 'critical' && template.risk_assessment !== 'low') {
      score -= 0.3;
      issues.push('Critical device requires low-risk template');
    }

    return {
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Assess template safety for installation
   */
  private async assessTemplateSafety(
    template: MedicalTemplate,
    device: MedicalDevice,
    installationParams?: Record<string, any>
  ): Promise<{ score: number; warnings: string[] }> {
    const warnings: string[] = [];
    let score = 1.0;

    // Check risk assessment
    if (template.risk_assessment === 'high') {
      score -= 0.4;
      warnings.push('Template has high risk assessment');
    } else if (template.risk_assessment === 'medium') {
      score -= 0.2;
      warnings.push('Template has medium risk assessment');
    }

    // Check device maintenance requirements
    if (device.performance_metrics.uptime < 99) {
      score -= 0.2;
      warnings.push('Device uptime below recommended threshold for safe installation');
    }

    // Check error rate
    if (device.performance_metrics.error_rate > 0.01) {
      score -= 0.3;
      warnings.push('Device error rate above safe threshold');
    }

    // Check installation parameters
    if (installationParams) {
      for (const [param, value] of Object.entries(installationParams)) {
        if (!this.validateInstallationParameter(param, value, template)) {
          score -= 0.1;
          warnings.push(`Installation parameter ${param} may be unsafe`);
        }
      }
    }

    return {
      score: Math.max(0, score),
      warnings
    };
  }

  /**
   * Perform the actual template installation
   */
  private async performTemplateInstallation(
    template: MedicalTemplate,
    device: MedicalDevice,
    installationParams?: Record<string, any>
  ): Promise<{ warnings?: string[] }> {
    // Simulate template installation process
    const warnings: string[] = [];

    // Execute installation instructions
    for (const instruction of template.installation_instructions) {
      try {
        await this.executeInstallationInstruction(instruction, device, installationParams);
      } catch (error) {
        warnings.push(`Installation instruction failed: ${instruction}`);
      }
    }

    // Verify installation success
    const verificationResult = await this.verifyInstallationSuccess(template, device);
    if (!verificationResult.success) {
      warnings.push(...verificationResult.issues);
    }

    return { warnings };
  }

  /**
   * Get available templates for a device
   */
  public async getCompatibleTemplates(deviceId: string): Promise<MedicalTemplate[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const device = cortexServiceMedical.getMedicalDevices().find(d => d.device_id === deviceId);
    if (!device) {
      return [];
    }

    const compatibleTemplates: MedicalTemplate[] = [];
    
    for (const template of this.templateRegistry.values()) {
      const compatibility = await this.checkTemplateCompatibility(template, device);
      if (compatibility.score >= 0.6) {
        compatibleTemplates.push(template);
      }
    }

    return compatibleTemplates.sort((a, b) => b.performance_score - a.performance_score);
  }

  /**
   * Get installed templates for a device
   */
  public getInstalledTemplates(deviceId: string): MedicalTemplate[] {
    return Array.from(this.installedTemplates.values()).filter(template => {
      const history = this.installationHistory.find(h => 
        h.template_id === template.template_id && 
        h.device_id === deviceId && 
        h.status === 'success'
      );
      return history !== undefined;
    });
  }

  /**
   * Uninstall a template from a device
   */
  public async uninstallTemplate(templateId: string, deviceId: string): Promise<{
    success: boolean;
    message: string;
    rollback_warnings: string[];
  }> {
    console.log(`[Medical] Uninstalling template ${templateId} from device ${deviceId}`);

    try {
      const template = this.templateRegistry.get(templateId);
      const device = cortexServiceMedical.getMedicalDevices().find(d => d.device_id === deviceId);

      if (!template || !device) {
        return {
          success: false,
          message: 'Template or device not found',
          rollback_warnings: []
        };
      }

      // Perform uninstallation
      await this.performTemplateUninstallation(template, device);

      // Update device capabilities
      device.capabilities = device.capabilities.filter(cap => 
        !template.device_requirements.includes(cap)
      );

      // Update compatibility matrix
      const deviceCompatible = this.compatibilityMatrix.get(deviceId);
      if (deviceCompatible) {
        const index = deviceCompatible.indexOf(templateId);
        if (index > -1) {
          deviceCompatible.splice(index, 1);
        }
      }

      // Save updates
      await this.saveDeviceUpdate(device);
      await this.saveCompatibilityMatrix();

      // Broadcast uninstall event
      await cortexServiceMedical.broadcastEvent({
        id: this.generateEventId(),
        type: 'system_evolution',
        thread_id: deviceId,
        timestamp: new Date().toISOString(),
        data: { template_id: templateId, device_id: deviceId },
        priority: 'normal',
        source: 'system',
        feedback_color: 'yellow',
        metadata: { medical_context: true }
      });

      console.log(`✅ Template ${templateId} uninstalled from device ${deviceId}`);

      return {
        success: true,
        message: 'Template uninstalled successfully',
        rollback_warnings: []
      };

    } catch (error) {
      console.error(`❌ Template uninstallation failed:`, error);
      
      return {
        success: false,
        message: `Uninstallation failed: ${(error as Error).message}`,
        rollback_warnings: ['Manual rollback may be required']
      };
    }
  }

  /**
   * Get installation history
   */
  public getInstallationHistory(deviceId?: string): Array<{
    template_id: string;
    device_id: string;
    installation_date: string;
    status: 'success' | 'failed' | 'warning';
    issues: string[];
  }> {
    if (deviceId) {
      return this.installationHistory.filter(h => h.device_id === deviceId);
    }
    return [...this.installationHistory];
  }

  /**
   * Get marketplace statistics
   */
  public getMarketplaceStats(): {
    total_templates: number;
    installed_templates: number;
    compatibility_matrix_size: number;
    installation_success_rate: number;
    average_compatibility_score: number;
  } {
    const totalInstallations = this.installationHistory.length;
    const successfulInstallations = this.installationHistory.filter(h => h.status === 'success').length;
    
    return {
      total_templates: this.templateRegistry.size,
      installed_templates: this.installedTemplates.size,
      compatibility_matrix_size: this.compatibilityMatrix.size,
      installation_success_rate: totalInstallations > 0 ? successfulInstallations / totalInstallations : 0,
      average_compatibility_score: this.calculateAverageCompatibilityScore()
    };
  }

  // Helper methods
  private async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        template_id: 'blood_pressure_monitor_v1',
        template_name: 'Blood Pressure Monitoring Suite',
        category: 'monitoring',
        device_requirements: ['bluetooth_connectivity', 'pressure_sensing', 'data_recording'],
        safety_checks: ['pressure_calibration', 'leak_detection', 'accuracy_verification'],
        compliance_standards: ['IEEE_11073', 'FDA_510k', 'HL7_FHIR'],
        performance_score: 0.92,
        risk_assessment: 'low',
        installation_instructions: [
          'calibrate_pressure_sensors',
          'configure_bluetooth_connection',
          'setup_data_recording'
        ],
        maintenance_requirements: [
          { interval: 'monthly', task: 'pressure_calibration' },
          { interval: 'quarterly', task: 'sensor_replacement_check' }
        ]
      },
      {
        template_id: 'ecg_analysis_v2',
        template_name: 'ECG Analysis and Alert System',
        category: 'diagnostic',
        device_requirements: ['ecg_sensing', 'signal_processing', 'alert_system'],
        safety_checks: ['signal_quality_check', 'alert_validation', 'data_integrity_verification'],
        compliance_standards: ['IEC_62304', 'FDA_510k', 'DICOM_Compliant'],
        performance_score: 0.88,
        risk_assessment: 'medium',
        installation_instructions: [
          'configure_ecg_leads',
          'setup_signal_processing',
          'calibrate_alert_thresholds'
        ],
        maintenance_requirements: [
          { interval: 'weekly', task: 'ecg_signal_quality_check' },
          { interval: 'monthly', task: 'alert_system_validation' }
        ]
      },
      {
        template_id: 'insulin_pump_controller_v3',
        template_name: 'Insulin Pump Control System',
        category: 'therapeutic',
        device_requirements: ['pump_control', 'dosage_calculation', 'safety_monitoring'],
        safety_checks: ['dosage_verification', 'pump_integrity_check', 'emergency_shutdown_test'],
        compliance_standards: ['IEC_62304', 'FDA_510k', 'ISO_13485'],
        performance_score: 0.95,
        risk_assessment: 'high',
        installation_instructions: [
          'calibrate_dosage_calculation',
          'configure_safety_limits',
          'setup_emergency_protocols'
        ],
        maintenance_requirements: [
          { interval: 'daily', task: 'dosage_accuracy_check' },
          { interval: 'weekly', task: 'emergency_protocol_test' }
        ]
      }
    ];

    for (const templateData of defaultTemplates) {
      const template: MedicalTemplate = {
        template_id: templateData.template_id,
        template_name: templateData.template_name,
        category: templateData.category,
        device_requirements: templateData.device_requirements,
        safety_checks: templateData.safety_checks,
        compliance_standards: templateData.compliance_standards,
        performance_score: templateData.performance_score,
        risk_assessment: templateData.risk_assessment as 'low' | 'medium' | 'high' | 'critical',
        installation_instructions: templateData.installation_instructions,
        maintenance_requirements: templateData.maintenance_requirements.map(m => `${m.interval}: ${m.task}`),
        status: 'active',
        usage_count: 0,
        last_updated: new Date().toISOString(),
        certifications: this.getTemplateCertifications(templateData.compliance_standards),
        tested_devices: []
      };

      this.templateRegistry.set(template.template_id, template);
    }

    console.log(`[Medical] Initialized ${defaultTemplates.length} default templates`);
  }

  private getTemplateCertifications(complianceStandards: string[]): string[] {
    const certificationMap: Record<string, string> = {
      'FDA_510k': 'FDA_510k_Certified',
      'IEC_62304': 'IEC_62304_Software_Class_C',
      'HL7_FHIR': 'HL7_FHIR_Compliant',
      'DICOM_Compliant': 'DICOM_Compliant',
      'IEEE_11073': 'IEEE_11073_Compliant',
      'ISO_13485': 'ISO_13485_Quality_Management'
    };

    return complianceStandards
      .map(standard => certificationMap[standard])
      .filter(cert => cert !== undefined);
  }

  private isCategoryCompatible(templateCategory: string, deviceCategory: string): boolean {
    const compatibilityMatrix: Record<string, string[]> = {
      'monitoring': ['monitoring', 'diagnostic'],
      'diagnostic': ['diagnostic', 'monitoring'],
      'therapeutic': ['therapeutic'],
      'imaging': ['imaging', 'diagnostic'],
      'laboratory': ['laboratory', 'monitoring'],
      'surgical': ['surgical', 'therapeutic'],
      'emergency': ['emergency', 'monitoring']
    };

    const compatibleCategories = compatibilityMatrix[templateCategory] || [];
    return compatibleCategories.includes(deviceCategory);
  }

  private isSafetyCheckAvailable(safetyCheck: string, device: MedicalDevice): boolean {
    // Simplified safety check availability - in production would check actual device capabilities
    const availableChecks = [
      'pressure_calibration', 'signal_quality_check', 'dosage_verification',
      'leak_detection', 'accuracy_verification', 'alert_validation',
      'data_integrity_verification', 'pump_integrity_check', 'emergency_shutdown_test'
    ];
    
    return availableChecks.includes(safetyCheck) && device.capabilities.includes('safety_monitoring');
  }

  private isComplianceStandardMet(standard: string, device: MedicalDevice): boolean {
    // Simplified compliance checking - in production would verify actual compliance
    const complianceMap: Record<string, number> = {
      'FDA_510k': 0.85,
      'IEC_62304': 0.90,
      'HL7_FHIR': 0.88,
      'DICOM_Compliant': 0.92,
      'IEEE_11073': 0.87,
      'ISO_13485': 0.89
    };

    return (complianceMap[standard] || 0) >= 0.8;
  }

  private validateInstallationParameter(param: string, value: any, template: MedicalTemplate): boolean {
    // Simplified parameter validation
    const validations: Record<string, (value: any) => boolean> = {
      'timeout': (v) => typeof v === 'number' && v > 0 && v <= 3600,
      'max_retries': (v) => typeof v === 'number' && v >= 0 && v <= 10,
      'safety_margin': (v) => typeof v === 'number' && v >= 0 && v <= 1
    };

    return validations[param] ? validations[param](value) : true;
  }

  private async executeInstallationInstruction(
    instruction: string, 
    device: MedicalDevice, 
    params?: Record<string, any>
  ): Promise<void> {
    // Simulate instruction execution
    console.log(`[Medical] Executing installation: ${instruction}`);
    
    switch (instruction) {
      case 'calibrate_pressure_sensors':
        // Simulate calibration
        device.performance_metrics.accuracy = Math.min(0.99, device.performance_metrics.accuracy + 0.02);
        break;
        
      case 'configure_bluetooth_connection':
        // Simulate Bluetooth configuration
        device.capabilities.push('bluetooth_configured');
        break;
        
      case 'setup_data_recording':
        // Simulate data recording setup
        device.capabilities.push('data_recording_enabled');
        break;
        
      default:
        console.log(`ℹ️ Unknown instruction: ${instruction}`);
    }
  }

  private async verifyInstallationSuccess(
    template: MedicalTemplate, 
    device: MedicalDevice
  ): Promise<{ success: boolean; issues: string[] }> {
    const issues: string[] = [];
    let success = true;

    // Verify all required capabilities are present
    for (const requirement of template.device_requirements) {
      if (!device.capabilities.includes(requirement)) {
        issues.push(`Missing required capability: ${requirement}`);
        success = false;
      }
    }

    // Verify performance meets template requirements
    if (device.performance_metrics.accuracy < template.performance_score * 0.9) {
      issues.push('Device accuracy below template requirements');
      success = false;
    }

    return { success, issues };
  }

  private async performTemplateUninstallation(template: MedicalTemplate, device: MedicalDevice): Promise<void> {
    console.log(`[Medical] Uninstalling template: ${template.template_name}`);
    
    // Remove template-specific capabilities
    device.capabilities = device.capabilities.filter(cap => 
      !template.device_requirements.includes(cap)
    );
  }

  private calculateAverageCompatibilityScore(): number {
    if (this.installationHistory.length === 0) return 0;
    
    // This would calculate actual compatibility scores from history
    // For now, return a simulated score
    return 0.85;
  }

  private async buildCompatibilityMatrix(): Promise<void> {
    const devices = cortexServiceMedical.getMedicalDevices();
    const templates = Array.from(this.templateRegistry.values());

    for (const device of devices) {
      const compatibleTemplates: string[] = [];
      
      for (const template of templates) {
        const compatibility = await this.checkTemplateCompatibility(template, device);
        if (compatibility.score >= 0.6) {
          compatibleTemplates.push(template.template_id);
        }
      }
      
      this.compatibilityMatrix.set(device.device_id, compatibleTemplates);
    }

    console.log(`[Medical] Built compatibility matrix for ${devices.length} devices`);
  }

  // File system methods
  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      await fs.mkdir(path, { recursive: true });
    } catch (error) {
      if ((error as any).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async loadInstalledTemplates(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const files = await fs.readdir(this.marketplaceDirectory);
      
      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('installed_')) {
          const filePath = `${this.marketplaceDirectory}${file}`;
          const content = await fs.readFile(filePath, 'utf-8');
          const template = JSON.parse(content);
          this.installedTemplates.set(template.template_id, template);
        }
      }
      
      console.log(`[Medical] Loaded ${this.installedTemplates.size} installed templates`);
    } catch (error) {
      console.log('[Medical] No existing installed templates found');
    }
  }

  private async loadTemplateRegistry(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const files = await fs.readdir(this.marketplaceDirectory);
      
      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('template_')) {
          const filePath = `${this.marketplaceDirectory}${file}`;
          const content = await fs.readFile(filePath, 'utf-8');
          const template = JSON.parse(content);
          this.templateRegistry.set(template.template_id, template);
        }
      }
      
      console.log(`[Medical] Loaded ${this.templateRegistry.size} templates in registry`);
    } catch (error) {
      console.log('[Medical] No existing template registry found');
    }
  }

  private async loadInstallationHistory(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const filePath = `${this.marketplaceDirectory}installation_history.json`;
      const content = await fs.readFile(filePath, 'utf-8');
      this.installationHistory = JSON.parse(content);
      
      console.log(`[Medical] Loaded ${this.installationHistory.length} installation records`);
    } catch (error) {
      console.log('[Medical] No existing installation history found');
    }
  }

  private async saveInstalledTemplate(template: MedicalTemplate): Promise<void> {
    try {
      const fs = require('fs').promises;
      const filePath = `${this.marketplaceDirectory}installed_${template.template_id}.json`;
      await fs.writeFile(filePath, JSON.stringify(template, null, 2));
    } catch (error) {
      console.error('Failed to save installed template:', error);
    }
  }

  private async saveDeviceUpdate(device: MedicalDevice): Promise<void> {
    try {
      const fs = require('fs').promises;
      const filePath = `./cortex/medical/devices/${device.device_id}.json`;
      await fs.writeFile(filePath, JSON.stringify(device, null, 2));
    } catch (error) {
      console.error('Failed to save device update:', error);
    }
  }

  private async saveInstallationHistory(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const filePath = `${this.marketplaceDirectory}installation_history.json`;
      await fs.writeFile(filePath, JSON.stringify(this.installationHistory, null, 2));
    } catch (error) {
      console.error('Failed to save installation history:', error);
    }
  }

  private async saveCompatibilityMatrix(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const compatibilityData = Object.fromEntries(this.compatibilityMatrix);
      const filePath = `${this.marketplaceDirectory}compatibility_matrix.json`;
      await fs.writeFile(filePath, JSON.stringify(compatibilityData, null, 2));
    } catch (error) {
      console.error('Failed to save compatibility matrix:', error);
    }
  }

  private generateEventId(): string {
    return `marketplace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const medicalMarketplaceService = MedicalMarketplaceService.getInstance();
export default medicalMarketplaceService;