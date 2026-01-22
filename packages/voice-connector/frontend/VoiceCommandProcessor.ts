/**
 * EVE OS Voice Command Processor
 * 
 * Advanced voice command processing service that converts natural speech into ActionLanguage DSL format.
 * Features medical terminology recognition, context awareness, safety validation, and Reflex Card generation.
 * 
 * Key Features:
 * - Voice input → ActionLanguage DSL conversion
 * - Medical terminology and device name recognition  
 * - Voice context understanding and conversation history
 * - Integration with VerbSafetyService for command validation
 * - Automatic Reflex Card generation
 * - Support for complex medical commands and device operations
 */

import { EventEmitter } from './EventEmitter';
import { ReflexCard } from '@/types';
import { actionLanguageService } from '@/services/ActionLanguageService';
import { verbSafetyService, VerbSafetyValidationResult } from '@/services/VerbSafetyService';


export interface VoiceCommandContext {
  sessionId: string;
  timestamp: string;
  mode: 'medical' | 'vrf' | 'general';
  activePatient?: string;
  activeDevice?: string;
  medicalContext?: {
    urgencyLevel: 'routine' | 'urgent' | 'emergency';
    procedureType?: string;
    department?: string;
  };
  conversationHistory: VoiceCommandEntry[];
}

export interface VoiceCommandEntry {
  id: string;
  originalInput: string;
  processedAction: any;
  reflexCardId?: string;
  timestamp: string;
  confidence: number;
  safetyScore: number;
  success: boolean;
}

export interface VoiceProcessingResult {
  success: boolean;
  action?: any;
  reflexCard?: ReflexCard;
  safetyValidation?: VerbSafetyValidationResult;
  confidence: number;
  suggestions: string[];
  errors: string[];
  warnings: string[];
}

export interface MedicalTerminologyMapping {
  spoken: string;
  dsl: string;
  category: 'vital_type' | 'device_name' | 'medical_term' | 'procedure' | 'location' | 'modifier';
  synonyms: string[];
}

export interface DeviceNameMapping {
  spoken: string;
  canonical: string;
  category: 'monitor' | 'pump' | 'sensor' | 'scanner' | 'ventilator' | 'defibrillator' | 'other';
  manufacturer?: string;
  model?: string;
}

export interface ConversationPattern {
  pattern: RegExp;
  intent: string;
  parameters: string[];
  contextRequirements: {
    requiresPatient?: boolean;
    requiresDevice?: boolean;
    requiresUrgency?: boolean;
  };
}

export class VoiceCommandProcessor extends EventEmitter {
  private currentContext: VoiceCommandContext | null = null;
  private medicalTerminologyMap: Map<string, MedicalTerminologyMapping> = new Map();
  private deviceNameMap: Map<string, DeviceNameMapping> = new Map();
  private conversationPatterns: ConversationPattern[] = [];
  private activeSessions: Map<string, VoiceCommandContext> = new Map();

  constructor() {
    super();
    this.initializeMedicalTerminology();
    this.initializeDeviceNames();
    this.initializeConversationPatterns();
  }

  /**
   * Process voice input and convert to ActionLanguage DSL
   * Main entry point for voice command processing
   */
  async processVoiceCommand(
    voiceInput: string,
    sessionId?: string,
    options: {
      forceMode?: 'medical' | 'vrf' | 'general';
      requiresSafetyCheck?: boolean;
      generateReflexCard?: boolean;
    } = {}
  ): Promise<VoiceProcessingResult> {
    const result: VoiceProcessingResult = {
      success: false,
      confidence: 0,
      suggestions: [],
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Initialize or get session context
      const context = this.getOrCreateSessionContext(sessionId);
      this.currentContext = context;

      // Step 2: Preprocess voice input
      const preprocessedInput = this.preprocessVoiceInput(voiceInput);
      result.warnings.push(...preprocessedInput.warnings);

      // Step 3: Extract medical terminology and device names
      const extractedTerms = this.extractMedicalTerms(preprocessedInput.processed);
      result.warnings.push(...extractedTerms.warnings);

      // Step 4: Parse voice command into ActionLanguage DSL
      const dslAction = await this.parseToDSL(preprocessedInput.processed, extractedTerms.extracted);
      if (!dslAction.success) {
        result.errors.push(...dslAction.errors);
        result.suggestions.push(...dslAction.suggestions);
        return result;
      }

      result.action = dslAction.action;
      result.confidence = dslAction.confidence;

      // Step 5: Apply context understanding and resolution
      const contextAction = await this.applyContextUnderstanding(dslAction.action, context);
      result.confidence = Math.min(result.confidence, contextAction.confidence);
      result.warnings.push(...contextAction.warnings);

      // Step 6: Validate with VerbSafetyService if required
      let safetyValidation: VerbSafetyValidationResult | undefined;
      if (options.requiresSafetyCheck !== false) {
        safetyValidation = await this.validateSafety(contextAction.action, context);
        result.safetyValidation = safetyValidation;

        if (!safetyValidation.passed) {
          result.errors.push(...safetyValidation.violations.map(v => v.message));
          result.suggestions.push(...safetyValidation.suggestions);
          result.warnings.push(...safetyValidation.warnings.map(w => w.message));
          return result;
        }
      }

      // Step 7: Generate Reflex Card if requested
      if (options.generateReflexCard !== false) {
        const reflexCard = await actionLanguageService.actionToReflexCard(contextAction.action);
        result.reflexCard = reflexCard;

        // Store the command entry in conversation history
        const entry: VoiceCommandEntry = {
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalInput: voiceInput,
          processedAction: contextAction.action,
          reflexCardId: reflexCard.id,
          timestamp: new Date().toISOString(),
          confidence: result.confidence,
          safetyScore: safetyValidation?.safetyScore || 100,
          success: true
        };

        context.conversationHistory.push(entry);
        this.activeSessions.set(context.sessionId, context);
      }

      result.success = true;
      this.emit('voiceCommandProcessed', {
        sessionId: context.sessionId,
        command: voiceInput,
        action: result.action,
        reflexCard: result.reflexCard
      });

      return result;

    } catch (error: any) {
      result.errors.push(`Voice processing failed: ${error.message}`);
      this.emit('voiceCommandError', {
        sessionId: sessionId,
        command: voiceInput,
        error: error.message
      });
      return result;
    }
  }

  /**
   * Preprocess voice input for better recognition
   */
  private preprocessVoiceInput(input: string): {
    processed: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let processed = input.toLowerCase().trim();

    // Remove filler words
    const fillerWords = ['um', 'uh', 'er', 'ah', 'like', 'you know', 'sort of', 'kind of'];
    fillerWords.forEach(filler => {
      processed = processed.replace(new RegExp(`\\b${filler}\\b`, 'g'), '');
    });

    // Fix common speech recognition errors
    const speechFixes: Record<string, string> = {
      'vitals': 'vital',
      'heartrates': 'heart rate',
      'blood pressures': 'blood pressure',
      'blood oxygen': 'blood oxygen',
      'temperatures': 'temperature',
      'respiratory rate': 'respiratory rate',
      'ecg': 'ecg',
      'ekg': 'ecg',
      'patient': 'patient',
      'patients': 'patient',
      'room': 'room',
      'ward': 'ward',
      'unit': 'unit'
    };

    Object.entries(speechFixes).forEach(([wrong, correct]) => {
      if (processed.includes(wrong)) {
        processed = processed.replace(new RegExp(wrong, 'g'), correct);
        warnings.push(`Fixed speech recognition: "${wrong}" → "${correct}"`);
      }
    });

    // Normalize spacing and punctuation
    processed = processed.replace(/\s+/g, ' ').trim();

    return { processed, warnings };
  }

  /**
   * Extract medical terminology and map to DSL parameters
   */
  private extractMedicalTerms(input: string): {
    extracted: Map<string, any>;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const extracted = new Map<string, any>();

    // Extract vital types
    const vitalPatterns = [
      { pattern: /\b(heart\s*rate|pulse|hr)\b/i, key: 'vital_type', value: 'heart_rate' },
      { pattern: /\b(blood\s*pressure|bp)\b/i, key: 'vital_type', value: 'blood_pressure' },
      { pattern: /\b(blood\s*oxygen|oxygen\s*saturation|spo2)\b/i, key: 'vital_type', value: 'blood_oxygen' },
      { pattern: /\b(temperature|temp|tmp)\b/i, key: 'vital_type', value: 'temperature' },
      { pattern: /\b(respiratory\s*rate|breathing\s*rate|rr)\b/i, key: 'vital_type', value: 'respiratory_rate' },
      { pattern: /\b(ecg|ekg)\b/i, key: 'vital_type', value: 'ecg' }
    ];

    vitalPatterns.forEach(({ pattern, key, value }) => {
      if (pattern.test(input)) {
        extracted.set(key, value);
      }
    });

    // Extract patient/location context
    const patientPatterns = [
      { pattern: /\bpatient\s*(\w+)\b/i, group: 1, key: 'patient' },
      { pattern: /\broom\s*(\w+)\b/i, group: 1, key: 'room' },
      { pattern: /\bward\s*(\w+)\b/i, group: 1, key: 'ward' },
      { pattern: /\bunit\s*(\w+)\b/i, group: 1, key: 'unit' }
    ];

    patientPatterns.forEach(({ pattern, group, key }) => {
      const match = input.match(pattern);
      if (match) {
        extracted.set(key, match[group]);
      }
    });

    // Extract device names
    Object.entries(this.deviceNameMap).forEach(([spoken, device]) => {
      const regex = new RegExp(`\\b${spoken.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(input)) {
        extracted.set('device', device.canonical);
        extracted.set('device_category', device.category);
      }
    });

    // Extract urgency modifiers
    const urgencyPatterns = [
      { pattern: /\b(emergency|critical|urgent)\b/i, urgency: 'emergency' },
      { pattern: /\b(asap|immediately|now)\b/i, urgency: 'urgent' },
      { pattern: /\b(routine|normal|standard)\b/i, urgency: 'routine' }
    ];

    urgencyPatterns.forEach(({ pattern, urgency }) => {
      if (pattern.test(input)) {
        extracted.set('urgency', urgency);
      }
    });

    return { extracted, warnings };
  }

  /**
   * Parse voice input into ActionLanguage DSL format
   */
  private async parseToDSL(
    input: string,
    extracted: Map<string, any>
  ): Promise<{
    success: boolean;
    action?: any;
    confidence: number;
    errors: string[];
    suggestions: string[];
  }> {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let confidence = 0.5;

    try {
      // Step 1: Identify verb and noun from input
      const verbNounMatch = this.extractVerbNoun(input);
      if (!verbNounMatch) {
        errors.push('Could not identify verb and noun in voice command');
        suggestions.push('Try using clearer action words like "monitor", "read", "write", or "notify"');
        return { success: false, confidence: 0, errors, suggestions };
      }

      const { verb, noun, confidence: vnConfidence } = verbNounMatch;
      confidence = Math.min(confidence, vnConfidence);

      // Step 2: Build action object
      const action: any = {
        verb,
        noun
      };

      // Step 3: Map extracted terms to DSL modifiers
      if (extracted.has('patient') || extracted.has('room') || extracted.has('ward') || extracted.has('unit')) {
        const where: any = {};
        if (extracted.has('patient')) where.patient = extracted.get('patient');
        if (extracted.has('room')) where.room = extracted.get('room');
        if (extracted.has('ward')) where.ward = extracted.get('ward');
        if (extracted.has('unit')) where.unit = extracted.get('unit');
        action.where = where;
      }

      if (extracted.has('vital_type')) {
        action.vital_type = extracted.get('vital_type');
      }

      if (extracted.has('device')) {
        action.device = extracted.get('device');
        if (extracted.has('device_category')) {
          action.device_category = extracted.get('device_category');
        }
      }

      if (extracted.has('urgency')) {
        action.urgency = extracted.get('urgency');
      }

      // Step 4: Apply specific medical command patterns
      const medicalPatternResult = this.applyMedicalPatterns(input, action, extracted);
      if (medicalPatternResult.success) {
        Object.assign(action, medicalPatternResult.action);
        confidence = Math.min(confidence, medicalPatternResult.confidence);
      } else {
        errors.push(...medicalPatternResult.errors);
        suggestions.push(...medicalPatternResult.suggestions);
      }

      // Step 5: Validate against ActionLanguageService
      try {
        const validation = actionLanguageService.parseAction(`${action.verb} ${action.noun}`);
        action.verb = validation.verb;
        action.noun = validation.noun;

        // Merge additional parameters from parsed action
        ['where', 'with', 'as', 'if', 'until'].forEach(key => {
          if (validation[key] && !action[key]) {
            action[key] = validation[key];
          }
        });

        confidence += 0.2; // Bonus for valid verb/noun combination
      } catch (error) {
        // ActionLanguageService will handle validation later
      }

      // Step 6: Enhance with context understanding
      const enhanced = await this.enhanceWithContext(action, input, extracted);
      Object.assign(action, enhanced.action);
      confidence = Math.min(confidence, enhanced.confidence);
      suggestions.push(...enhanced.suggestions);

      return {
        success: true,
        action,
        confidence: Math.min(1.0, confidence),
        errors,
        suggestions
      };

    } catch (error: any) {
      errors.push(`DSL parsing failed: ${error.message}`);
      return { success: false, confidence: 0, errors, suggestions };
    }
  }

  /**
   * Extract verb and noun from voice input
   */
  private extractVerbNoun(input: string): {
    verb: string;
    noun: string;
    confidence: number;
  } | null {
    const words = input.trim().split(/\s+/);

    // Common medical voice command patterns
    const patterns = [
      // "monitor patient heart rate"
      /^(monitor|check|track)\s+(patient\s+\w+\s+)?(\w+\s+)*(\w+)$/,
      // "read vital signs"
      /^(read|get|show)\s+(vital\s+signs?|vital|\w+)$/,
      // "write medical record"
      /^(write|update|add|record)\s+(\w+\s+)*(\w+)$/,
      // "notify nurse"
      /^(notify|alert|inform|call)\s+(\w+)$/,
      // "render mesh"
      /^(render|display|show)\s+(\w+)$/
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const verb = match[1];
        let noun = 'unknown';

        // Extract noun from remaining words
        const remainingWords = words.slice(1);
        noun = this.mapToCanonicalNoun(remainingWords.join(' '), verb);

        return {
          verb: verb.toLowerCase(),
          noun: noun,
          confidence: 0.8
        };
      }
    }

    // Fallback: first two words
    if (words.length >= 2) {
      const verb = words[0].toLowerCase();
      const noun = this.mapToCanonicalNoun(words.slice(1).join(' '), verb);

      return {
        verb,
        noun,
        confidence: 0.6
      };
    }

    return null;
  }

  /**
   * Map spoken noun to canonical noun
   */
  private mapToCanonicalNoun(spoken: string, verb: string): string {
    const nounMappings: Record<string, string> = {
      // Vital signs
      'vital signs': 'vital',
      'vitals': 'vital',
      'vital': 'vital',
      'heart rate': 'vital',
      'blood pressure': 'vital',
      'oxygen level': 'vital',
      'temperature': 'vital',

      // Medical records
      'medical record': 'record',
      'record': 'record',
      'chart': 'record',
      'file': 'record',

      // Devices
      'monitor': 'device',
      'machine': 'device',
      'equipment': 'device',

      // Contacts
      'nurse': 'contact',
      'doctor': 'contact',
      'physician': 'contact',
      'staff': 'contact'
    };

    const mapped = nounMappings[spoken.toLowerCase()];
    return mapped || spoken.toLowerCase();
  }

  /**
   * Apply specific medical command patterns
   */
  private applyMedicalPatterns(
    input: string,
    action: any,
    extracted: Map<string, any>
  ): {
    success: boolean;
    action: any;
    confidence: number;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let confidence = 0.7;

    // Pattern: "monitor patient [vital] rate"
    if (action.verb === 'monitor' && (input.includes('patient') || extracted.has('patient'))) {
      if (extracted.has('vital_type')) {
        action.noun = 'vital';
        confidence += 0.2;
      } else if (input.includes('vital')) {
        action.noun = 'vital';
        confidence += 0.1;
      }
    }

    // Pattern: "read vital signs"
    if (action.verb === 'read' && (input.includes('vital') || extracted.has('vital_type'))) {
      action.noun = 'vital';
      if (extracted.has('vital_type')) {
        action.vital_type = extracted.get('vital_type');
        confidence += 0.2;
      }
    }

    // Pattern: "write medical record [note]"
    if (action.verb === 'write' && input.includes('record')) {
      action.noun = 'record';
      if (input.includes('note') || input.includes('medication')) {
        action.record_type = 'note';
        confidence += 0.1;
      }
    }

    // Pattern: "notify [contact] [message]"
    if (action.verb === 'notify') {
      action.noun = 'alert';
      if (input.includes('nurse') || input.includes('doctor')) {
        action.notification_type = 'contact';
        confidence += 0.1;
      }
    }

    return {
      success: errors.length === 0,
      action,
      confidence,
      errors,
      suggestions
    };
  }

  /**
   * Enhance action with context understanding
   */
  private async enhanceWithContext(
    action: any,
    input: string,
    extracted: Map<string, any>
  ): Promise<{
    action: any;
    confidence: number;
    suggestions: string[];
  }> {
    const suggestions: string[] = [];
    const confidence = 1.0;

    // Add inferred context from conversation history
    if (this.currentContext) {
      // Use active patient if not specified
      if (!action.where?.patient && this.currentContext.activePatient) {
        action.where = action.where || {};
        action.where.patient = this.currentContext.activePatient;
        suggestions.push(`Using active patient context: ${this.currentContext.activePatient}`);
      }

      // Use active device if not specified
      if (!action.device && this.currentContext.activeDevice) {
        action.device = this.currentContext.activeDevice;
        suggestions.push(`Using active device context: ${this.currentContext.activeDevice}`);
      }

      // Apply medical context
      if (this.currentContext.medicalContext && !action.urgency) {
        action.urgency = this.currentContext.medicalContext.urgencyLevel;
        suggestions.push(`Applying medical context urgency: ${this.currentContext.medicalContext.urgencyLevel}`);
      }
    }

    // Enhance device information
    if (action.device) {
      const deviceInfo = this.deviceNameMap.get(action.device.toLowerCase());
      if (deviceInfo) {
        action.device_category = deviceInfo.category;
        action.manufacturer = deviceInfo.manufacturer;
        action.model = deviceInfo.model;
      }
    }

    // Set priority based on urgency
    if (action.urgency) {
      const priorityMap = {
        'emergency': 'critical',
        'urgent': 'high',
        'routine': 'normal'
      };
      action.priority = priorityMap[action.urgency as keyof typeof priorityMap] || 'normal';
    }

    return { action, confidence, suggestions };
  }

  /**
   * Apply context understanding and resolution
   */
  private async applyContextUnderstanding(
    action: any,
    context: VoiceCommandContext
  ): Promise<{
    action: any;
    confidence: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const confidence = 1.0;

    // Update active context if provided
    if (action.where?.patient) {
      context.activePatient = action.where.patient;
    }

    if (action.device) {
      context.activeDevice = action.device;
    }

    if (action.urgency) {
      context.medicalContext = context.medicalContext || {
        urgencyLevel: 'routine'
      };
      context.medicalContext!.urgencyLevel = action.urgency as any;
    }

    this.activeSessions.set(context.sessionId, context);

    return { action, confidence, warnings };
  }

  /**
   * Validate command safety using VerbSafetyService
   */
  private async validateSafety(
    action: any,
    context: VoiceCommandContext
  ): Promise<VerbSafetyValidationResult> {
    const deviceCategory = this.determineDeviceCategory(action, context);
    const userContext = this.createUserContext(context);
    const medicalContext = context.medicalContext ? {
      urgencyLevel: context.medicalContext.urgencyLevel,
      procedureType: context.medicalContext.procedureType,
      department: context.medicalContext.department
    } : undefined;

    return await verbSafetyService.validateReflexCardCreation(
      action,
      deviceCategory as any,
      userContext,
      medicalContext
    );
  }

  /**
   * Determine device category for safety validation
   */
  private determineDeviceCategory(
    action: any,
    context: VoiceCommandContext
  ): 'medical' | 'personal' | 'research' | 'admin' {
    if (context.mode === 'medical' || action.vital_type || action.device_category === 'monitor') {
      return 'medical';
    }

    if (action.device_category && ['scanner', 'research'].includes(action.device_category)) {
      return 'research';
    }

    return 'personal';
  }

  /**
   * Create user context for safety validation
   */
  private createUserContext(context: VoiceCommandContext): {
    userId: string;
    permissions: string[];
    emergencyMode: boolean;
  } {
    return {
      userId: context.sessionId,
      permissions: this.getDefaultPermissions(context.mode),
      emergencyMode: context.medicalContext?.urgencyLevel === 'emergency'
    };
  }

  /**
   * Get default permissions based on mode
   */
  private getDefaultPermissions(mode: 'medical' | 'vrf' | 'general'): string[] {
    const permissions = {
      medical: ['read_access', 'write_access', 'monitor_access', 'notify_access'],
      vrf: ['read_access', 'get_access', 'monitor_access', 'render_access'],
      general: ['read_access', 'write_access', 'get_access', 'call_access']
    };
    return permissions[mode] || permissions.general;
  }

  /**
   * Get or create session context
   */
  private getOrCreateSessionContext(sessionId?: string): VoiceCommandContext {
    if (sessionId && this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }

    const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context: VoiceCommandContext = {
      sessionId: newSessionId,
      timestamp: new Date().toISOString(),
      mode: 'medical',
      conversationHistory: []
    };

    this.activeSessions.set(newSessionId, context);
    return context;
  }

  /**
   * Initialize medical terminology mappings
   */
  private initializeMedicalTerminology(): void {
    const terminology: MedicalTerminologyMapping[] = [
      // Vital types
      { spoken: 'heart rate', dsl: 'heart_rate', category: 'vital_type', synonyms: ['pulse', 'hr'] },
      { spoken: 'blood pressure', dsl: 'blood_pressure', category: 'vital_type', synonyms: ['bp'] },
      { spoken: 'oxygen saturation', dsl: 'blood_oxygen', category: 'vital_type', synonyms: ['oxygen level', 'spo2'] },
      { spoken: 'temperature', dsl: 'temperature', category: 'vital_type', synonyms: ['temp', 'body temp'] },
      { spoken: 'respiratory rate', dsl: 'respiratory_rate', category: 'vital_type', synonyms: ['breathing rate', 'rr'] },
      { spoken: 'ecg', dsl: 'ecg', category: 'vital_type', synonyms: ['ekg', 'heart rhythm'] },

      // Medical terms
      { spoken: 'vital signs', dsl: 'vital_signs', category: 'medical_term', synonyms: ['vitals', 'vitals'] },
      { spoken: 'medical record', dsl: 'medical_record', category: 'medical_term', synonyms: ['patient record', 'chart'] },
      { spoken: 'patient data', dsl: 'patient_data', category: 'medical_term', synonyms: ['patient info'] },

      // Procedures
      { spoken: 'monitoring', dsl: 'monitor', category: 'procedure', synonyms: ['tracking', 'watching'] },
      { spoken: 'reading', dsl: 'read', category: 'procedure', synonyms: ['checking', 'getting'] },
      { spoken: 'writing', dsl: 'write', category: 'procedure', synonyms: ['updating', 'recording'] }
    ];

    terminology.forEach(term => {
      this.medicalTerminologyMap.set(term.spoken.toLowerCase(), term);
      term.synonyms.forEach(synonym => {
        this.medicalTerminologyMap.set(synonym.toLowerCase(), term);
      });
    });
  }

  /**
   * Initialize device name mappings
   */
  private initializeDeviceNames(): void {
    const devices: DeviceNameMapping[] = [
      // Monitors
      { spoken: 'vital monitor', canonical: 'vital_monitor', category: 'monitor', manufacturer: 'General', model: 'VM-100' },
      { spoken: 'heart monitor', canonical: 'heart_monitor', category: 'monitor', manufacturer: 'Philips', model: 'IntelliVue' },
      { spoken: 'patient monitor', canonical: 'patient_monitor', category: 'monitor', manufacturer: 'GE', model: 'Carescape' },

      // Sensors
      { spoken: 'pulse oximeter', canonical: 'pulse_oximeter', category: 'sensor', manufacturer: 'Masimo', model: 'SET' },
      { spoken: 'blood pressure cuff', canonical: 'bp_cuff', category: 'sensor', manufacturer: 'Welch Allyn', model: 'Spot' },
      { spoken: 'temperature probe', canonical: 'temp_probe', category: 'sensor', manufacturer: 'Exergen', model: 'TAT-5000' },

      // Other devices
      { spoken: 'infusion pump', canonical: 'infusion_pump', category: 'pump', manufacturer: 'B. Braun', model: 'Infusomat' },
      { spoken: 'ventilator', canonical: 'ventilator', category: 'ventilator', manufacturer: 'Dräger', model: 'Evita' },
      { spoken: 'defibrillator', canonical: 'defibrillator', category: 'defibrillator', manufacturer: 'Zoll', model: 'X Series' }
    ];

    devices.forEach(device => {
      this.deviceNameMap.set(device.spoken.toLowerCase(), device);
    });
  }

  /**
   * Initialize conversation patterns for better understanding
   */
  private initializeConversationPatterns(): void {
    this.conversationPatterns = [
      {
        pattern: /^(monitor|check|track)\s+patient\s+(\w+)\s+(heart\s*rate|blood\s*pressure|oxygen|temperature)$/,
        intent: 'monitor_vital',
        parameters: ['patient_id', 'vital_type'],
        contextRequirements: { requiresPatient: true, requiresUrgency: false }
      },
      {
        pattern: /^(read|get|show)\s+(vital\s+signs?|vital\s+(\w+))$/,
        intent: 'read_vital',
        parameters: ['vital_type'],
        contextRequirements: { requiresPatient: true, requiresDevice: false }
      },
      {
        pattern: /^(notify|alert)\s+(nurse|doctor|staff)\s+(.+)$/,
        intent: 'notify_contact',
        parameters: ['contact_type', 'message'],
        contextRequirements: { requiresPatient: true, requiresDevice: false }
      },
      {
        pattern: /^(write|update)\s+(medical\s+record|patient\s+record)\s+(.+)$/,
        intent: 'write_record',
        parameters: ['record_type', 'content'],
        contextRequirements: { requiresPatient: true, requiresDevice: false }
      }
    ];
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): VoiceCommandEntry[] {
    const context = this.activeSessions.get(sessionId);
    return context ? [...context.conversationHistory] : [];
  }

  /**
   * Clear conversation history for a session
   */
  clearConversationHistory(sessionId: string): void {
    const context = this.activeSessions.get(sessionId);
    if (context) {
      context.conversationHistory = [];
      this.activeSessions.set(sessionId, context);
    }
  }

  /**
   * Update session context
   */
  updateSessionContext(sessionId: string, updates: Partial<VoiceCommandContext>): void {
    const context = this.getOrCreateSessionContext(sessionId);
    Object.assign(context, updates);
    this.activeSessions.set(sessionId, context);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Shutdown service and cleanup resources
   */
  shutdown(): void {
    this.activeSessions.clear();
    this.removeAllListeners();
    console.log('VoiceCommandProcessor shutdown complete');
  }
}

// Export singleton instance
export const voiceCommandProcessor = new VoiceCommandProcessor();
export default voiceCommandProcessor;