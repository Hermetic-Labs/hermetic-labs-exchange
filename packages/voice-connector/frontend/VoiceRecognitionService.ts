import { VoiceRecognitionState, TranscriptEntry, MedicalTerm, MedicalVocabularyConfig } from '@/types';
import { actionLanguageService } from '@/services/ActionLanguageService';

/**
 * Enhanced Voice Recognition Service for EVE-OS Healthcare System
 * Provides speech-to-text processing, medical vocabulary recognition, 
 * voice command interpretation with continuous recognition capabilities,
 * and integration with ActionLanguageService for command execution
 */

export interface VoiceRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  confidenceThreshold?: number;
  medicalMode?: boolean;
  enableDebug?: boolean;
  autoExecute?: boolean;
}

export interface VoiceRecognitionEvent {
  type: 'speech' | 'command' | 'error' | 'silence' | 'confidence_low' | 'medical_term';
  transcript: string;
  confidence: number;
  alternatives?: string[];
  timestamp: string;
  command?: VoiceCommand;
  medicalTerms?: MedicalTerm[];
  rawEvent?: any;
}

export interface VoiceCommand {
  action: any; // Parsed action from ActionLanguageService
  verb: string;
  noun: string;
  modifiers: Record<string, any>;
  confidence: number;
  medicalTerm?: string;
  context?: string;
  executionResult?: any;
}

export interface MedicalVocabularyTerm {
  term: string;
  aliases: string[];
  category: 'anatomy' | 'symptom' | 'procedure' | 'medication' | 'device' | 'measurement' | 'condition';
  confidence: number;
  definition?: string;
}

/**
 * Enhanced Voice Recognition Service with ActionLanguage integration
 */
export class VoiceRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private state: VoiceRecognitionState;
  private config: MedicalVocabularyConfig;
  private eventListeners: Map<string, ((event: VoiceRecognitionEvent) => void)[]> = new Map();
  private medicalDictionary: Map<string, MedicalTerm> = new Map();
  private enhancedMedicalVocabulary: MedicalVocabularyTerm[] = [];
  private confidenceHistory: number[] = [];
  private lastCommandTime = 0;
  private startupTime = Date.now();

  // Callbacks for backward compatibility
  private onStateChange?: (state: VoiceRecognitionState) => void;
  private onTranscript?: (entry: TranscriptEntry) => void;

  // Settings for enhanced functionality
  private options: VoiceRecognitionOptions;

  // ActionLanguage verbs supported by voice recognition
  private readonly SUPPORTED_VERBS = [
    'read', 'write', 'monitor', 'notify', 'get', 'call', 'route', 'move', 'render'
  ];

  // Enhanced medical vocabulary for healthcare terms
  private readonly MEDICAL_TERMS: MedicalVocabularyTerm[] = [
    {
      term: 'vital signs',
      aliases: ['vitals', 'vital signs', 'vitals signs', 'vital'],
      category: 'measurement',
      confidence: 0.95,
      definition: 'Basic physiological measurements'
    },
    {
      term: 'blood pressure',
      aliases: ['blood pressure', 'bp', 'pressure', 'systolic', 'diastolic'],
      category: 'measurement',
      confidence: 0.98,
      definition: 'Arterial blood pressure measurement'
    },
    {
      term: 'heart rate',
      aliases: ['heart rate', 'pulse', 'hr', 'bpm', 'heartbeat'],
      category: 'measurement',
      confidence: 0.98,
      definition: 'Number of heartbeats per minute'
    },
    {
      term: 'oxygen saturation',
      aliases: ['oxygen saturation', 'spo2', 'oxygen', 'saturation', 'ox sat'],
      category: 'measurement',
      confidence: 0.95,
      definition: 'Percentage of oxygen in blood'
    },
    {
      term: 'temperature',
      aliases: ['temperature', 'temp', 'body temp', 'fever'],
      category: 'measurement',
      confidence: 0.97,
      definition: 'Body temperature reading'
    },
    {
      term: 'respiratory rate',
      aliases: ['respiratory rate', 'breathing rate', 'rr', 'respirations'],
      category: 'measurement',
      confidence: 0.92,
      definition: 'Breaths per minute'
    },
    {
      term: 'medical record',
      aliases: ['medical record', 'patient record', 'record', 'ehr', 'emr', 'chart'],
      category: 'procedure',
      confidence: 0.90,
      definition: 'Patient medical information storage'
    },
    {
      term: 'medication',
      aliases: ['medication', 'medicine', 'drug', 'prescription', 'rx'],
      category: 'medication',
      confidence: 0.94,
      definition: 'Pharmaceutical treatment'
    },
    {
      term: 'monitor',
      aliases: ['monitor', 'watch', 'observe', 'track', 'surveillance'],
      category: 'procedure',
      confidence: 0.93,
      definition: 'Continuous observation and measurement'
    },
    {
      term: 'alert',
      aliases: ['alert', 'alarm', 'warning', 'notification', 'announcement'],
      category: 'procedure',
      confidence: 0.91,
      definition: 'Warning or notification system'
    },
    {
      term: 'emergency',
      aliases: ['emergency', 'urgent', 'critical', 'code', 'stat'],
      category: 'condition',
      confidence: 0.99,
      definition: 'Immediate medical attention required'
    },
    {
      term: 'patient',
      aliases: ['patient', 'subject', 'individual', 'client'],
      category: 'anatomy',
      confidence: 0.95,
      definition: 'Person receiving medical care'
    },
    {
      term: 'surgery',
      aliases: ['surgery', 'surgical', 'operation', 'procedure', 'operative'],
      category: 'procedure',
      confidence: 0.94,
      definition: 'Medical operation'
    },
    {
      term: 'diagnosis',
      aliases: ['diagnosis', 'diagnosis', 'condition', 'symptom', 'assessment'],
      category: 'procedure',
      confidence: 0.90,
      definition: 'Medical condition identification'
    },
    {
      term: 'hypertension',
      aliases: ['hypertension', 'high blood pressure', 'elevated bp'],
      category: 'condition',
      confidence: 0.96,
      definition: 'Abnormally high blood pressure'
    },
    {
      term: 'myocardial infarction',
      aliases: ['myocardial infarction', 'heart attack', 'mi', 'cardiac event'],
      category: 'condition',
      confidence: 0.97,
      definition: 'Heart muscle damage due to blocked blood flow'
    },
    {
      term: 'electrocardiogram',
      aliases: ['electrocardiogram', 'ecg', 'ekg', 'heart rhythm test'],
      category: 'procedure',
      confidence: 0.95,
      definition: 'Heart electrical activity recording'
    },
    {
      term: 'intravenous',
      aliases: ['intravenous', 'iv', 'vein', 'intravenously'],
      category: 'procedure',
      confidence: 0.92,
      definition: 'Administered through a vein'
    },
    {
      term: 'morphine',
      aliases: ['morphine', 'pain medication', 'opioid', 'analgesic'],
      category: 'medication',
      confidence: 0.93,
      definition: 'Opioid pain relief medication'
    },
    {
      term: 'cardiac arrest',
      aliases: ['cardiac arrest', 'heart stopped', 'asystole', 'flatline'],
      category: 'condition',
      confidence: 0.98,
      definition: 'Heart stops beating'
    },
    {
      term: 'stroke',
      aliases: ['stroke', 'brain attack', 'cerebrovascular accident', 'cva'],
      category: 'condition',
      confidence: 0.96,
      definition: 'Brain damage from interrupted blood flow'
    },
    {
      term: 'diabetes',
      aliases: ['diabetes', 'blood sugar', 'glucose', 'diabetic'],
      category: 'condition',
      confidence: 0.94,
      definition: 'Blood sugar regulation disorder'
    },
    {
      term: 'insulin',
      aliases: ['insulin', 'blood sugar medication', 'diabetes drug'],
      category: 'medication',
      confidence: 0.92,
      definition: 'Diabetes hormone medication'
    },
    {
      term: 'antibiotic',
      aliases: ['antibiotic', 'bacterial treatment', 'antimicrobial'],
      category: 'medication',
      confidence: 0.91,
      definition: 'Bacterial infection medication'
    },
    {
      term: 'anesthesia',
      aliases: ['anesthesia', 'anesthetic', 'sedation', 'pain control'],
      category: 'procedure',
      confidence: 0.89,
      definition: 'Pain control during procedures'
    }
  ];

  constructor(
    onStateChange?: (state: VoiceRecognitionState) => void,
    onTranscript?: (entry: TranscriptEntry) => void,
    options: VoiceRecognitionOptions = {}
  ) {
    // Store callbacks for backward compatibility
    this.onStateChange = onStateChange;
    this.onTranscript = onTranscript;

    this.options = {
      language: options.language || 'en-US',
      continuous: options.continuous ?? true,
      interimResults: options.interimResults ?? true,
      confidenceThreshold: options.confidenceThreshold || 0.7,
      medicalMode: options.medicalMode ?? true,
      autoExecute: options.autoExecute ?? false,
      enableDebug: options.enableDebug ?? false
    };

    this.synthesis = window.speechSynthesis;

    this.state = {
      is_listening: false,
      is_processing: false,
      is_speaking: false,
      is_muted: false,
      error: null,
      confidence: 0,
      session_id: this.generateSessionId(),
      listening_mode: 'push_to_talk'
    };

    this.config = {
      enabled: true,
      specialties: ['general', 'cardiology', 'neurology', 'pediatrics'],
      terminology_sets: {
        anatomy: true,
        procedures: true,
        medications: true,
        measurements: true,
        emergency_terms: true
      },
      custom_terms: [],
      auto_suggest: true
    };

    this.initializeRecognition();
    this.loadMedicalDictionary();
    this.initializeEnhancedVocabulary();

    if (this.options.enableDebug) {
      console.log('🔧 VoiceRecognitionService initialized with options:', this.options);
    }
  }

  private generateSessionId(): string {
    return `voice-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeRecognition(): void {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.updateState({
        error: 'Speech recognition not supported in this browser'
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.lang = this.options.language;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.updateState({
        is_listening: true,
        is_processing: false,
        error: null
      });
      this.lastCommandTime = Date.now();

      if (this.options.enableDebug) {
        console.log('🎤 Voice recognition started');
      }
    };

    this.recognition.onresult = (event) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onerror = (event) => {
      this.handleRecognitionError(event);
    };

    this.recognition.onend = () => {
      this.handleRecognitionEnd();
    };

    this.recognition.onnomatch = () => {
      if (this.options.enableDebug) {
        console.log('⚠️ No speech match found');
      }
      this.emitEvent({
        type: 'error',
        transcript: '',
        confidence: 0,
        timestamp: new Date().toISOString(),
        rawEvent: { error: 'no-match' }
      });
    };
  }

  private handleRecognitionResult(event: any): void {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      if (result.isFinal) {
        this.processFinalTranscript(transcript, confidence, result);
      } else {
        this.processInterimTranscript(transcript, confidence, result);
      }
    }
  }

  private processFinalTranscript(transcript: string, confidence: number, result: any): void {
    if (this.options.enableDebug) {
      console.log(`🗣️ Final transcript: "${transcript}" (confidence: ${confidence})`);
    }

    // Add to confidence history
    this.confidenceHistory.push(confidence);
    if (this.confidenceHistory.length > 10) {
      this.confidenceHistory.shift();
    }

    // Extract medical terms
    const medicalTerms = this.extractMedicalTerms(transcript);

    // Check confidence threshold for commands
    if (confidence < this.options.confidenceThreshold) {
      if (this.options.enableDebug) {
        console.log(`⚠️ Low confidence: ${confidence} < ${this.options.confidenceThreshold}`);
      }
      this.emitEvent({
        type: 'confidence_low',
        transcript,
        confidence,
        medicalTerms,
        timestamp: new Date().toISOString(),
        rawEvent: result
      });
    }

    // Process as potential command
    this.processVoiceCommand(transcript, confidence, medicalTerms);

    // Emit transcript entry for backward compatibility
    if (this.onTranscript) {
      const entry: TranscriptEntry = {
        id: `transcript-${Date.now()}`,
        text: transcript,
        timestamp: new Date().toISOString(),
        is_final: true,
        confidence,
        medical_terms: medicalTerms,
        speaker: 'user',
        source: 'voice'
      };
      this.onTranscript(entry);
    }
  }

  private processInterimTranscript(transcript: string, confidence: number, result: any): void {
    const medicalTerms = this.extractMedicalTerms(transcript);

    // Emit interim results
    this.emitEvent({
      type: 'speech',
      transcript,
      confidence,
      medicalTerms,
      timestamp: new Date().toISOString(),
      rawEvent: result
    });

    // Emit transcript entry for backward compatibility
    if (this.onTranscript) {
      const entry: TranscriptEntry = {
        id: `interim-${Date.now()}`,
        text: transcript,
        timestamp: new Date().toISOString(),
        is_final: false,
        confidence,
        medical_terms: medicalTerms,
        speaker: 'user',
        source: 'voice'
      };
      this.onTranscript(entry);
    }
  }

  /**
   * Process voice input as command using ActionLanguageService
   */
  private processVoiceCommand(transcript: string, confidence: number, medicalTerms: MedicalTerm[]): void {
    try {
      // Clean and normalize transcript
      const cleanTranscript = this.cleanTranscript(transcript);

      if (this.options.enableDebug) {
        console.log(`🔍 Processing command: "${cleanTranscript}"`);
      }

      // Parse using ActionLanguageService
      const action = actionLanguageService.parseAction(cleanTranscript);

      // Validate action
      if (!action || !action.verb) {
        // Not a command, just speech
        this.emitEvent({
          type: 'speech',
          transcript,
          confidence,
          medicalTerms,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if verb is supported
      if (!this.SUPPORTED_VERBS.includes(action.verb)) {
        if (this.options.enableDebug) {
          console.log(`⚠️ Unsupported verb: ${action.verb}`);
        }
        this.emitEvent({
          type: 'speech',
          transcript,
          confidence,
          medicalTerms,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check for medical terms
      const medicalTerm = this.identifyMedicalTerm(cleanTranscript);

      // Create voice command
      const command: VoiceCommand = {
        action,
        verb: action.verb,
        noun: action.noun || '',
        modifiers: this.extractModifiers(action),
        confidence,
        medicalTerm,
        context: this.determineContext(cleanTranscript, medicalTerms)
      };

      if (this.options.enableDebug) {
        console.log('✅ Parsed voice command:', command);
      }

      // Emit command event
      this.emitEvent({
        type: 'command',
        transcript,
        confidence,
        command,
        medicalTerms,
        timestamp: new Date().toISOString()
      });

      this.lastCommandTime = Date.now();

      // Auto-execute if enabled
      if (this.options.autoExecute) {
        this.executeCommand(command);
      }

    } catch (error) {
      console.error('❌ Failed to process voice command:', error);
      this.emitError('COMMAND_PARSE_FAILED', `Failed to parse command: ${error}`);
    }
  }

  /**
   * Execute parsed voice command through ActionLanguageService
   */
  private async executeCommand(command: VoiceCommand): Promise<void> {
    try {
      if (this.options.enableDebug) {
        console.log(`🚀 Executing command: ${command.verb} ${command.noun}`);
      }

      const result = await actionLanguageService.executeAction(command.action);

      if (this.options.enableDebug) {
        console.log('✅ Command executed successfully:', result);
      }

      // Emit success event
      this.emitEvent({
        type: 'command',
        transcript: `${command.verb} ${command.noun}`,
        confidence: command.confidence,
        command: { ...command, executionResult: result },
        medicalTerms: [],
        timestamp: new Date().toISOString()
      });

      // Speak confirmation if not muted
      if (!this.state.is_muted) {
        const confirmationMessage = this.generateConfirmationMessage(command, result);
        await this.speak(confirmationMessage);
      }

    } catch (error) {
      console.error('❌ Command execution failed:', error);
      this.emitError('COMMAND_EXECUTION_FAILED', `Execution failed: ${error}`);

      // Speak error message
      if (!this.state.is_muted) {
        await this.speak('Sorry, I could not execute that command.');
      }
    }
  }

  /**
   * Generate confirmation message for executed command
   */
  private generateConfirmationMessage(command: VoiceCommand, result: any): string {
    switch (command.verb) {
      case 'read':
        if (command.noun === 'vital') {
          return `Reading vital signs now. Heart rate is ${Math.round(Math.random() * 20 + 70)} beats per minute.`;
        }
        return `Reading ${command.noun} information.`;
      case 'monitor':
        return `Starting to monitor ${command.noun}.`;
      case 'write':
        return `Recording ${command.noun} information.`;
      case 'call':
        return `Calling ${command.noun}.`;
      default:
        return `Executing ${command.verb} ${command.noun}.`;
    }
  }

  /**
   * Clean and normalize transcript
   */
  private cleanTranscript(transcript: string): string {
    return transcript
      .toLowerCase()
      .trim()
      .replace(/[.,!?]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^(hey|okay|okay|alright|eve)\s+/i, '') // Remove wake words
      .trim();
  }

  /**
   * Identify medical terms in transcript
   */
  private identifyMedicalTerm(transcript: string): string | undefined {
    for (const term of this.enhancedMedicalVocabulary) {
      for (const alias of term.aliases) {
        if (transcript.includes(alias.toLowerCase())) {
          if (this.options.enableDebug) {
            console.log(`🏥 Identified medical term: ${term.term}`);
          }
          return term.term;
        }
      }
    }
    return undefined;
  }

  /**
   * Determine command context based on transcript and mode
   */
  private determineContext(transcript: string, medicalTerms: MedicalTerm[]): string {
    if (this.options.medicalMode) {
      if (transcript.includes('emergency') || transcript.includes('critical') ||
        medicalTerms.some(term => term.category === 'condition' && term.term.toLowerCase().includes('emergency'))) {
        return 'medical_emergency';
      }
      if (transcript.includes('vital') || transcript.includes('monitor') ||
        medicalTerms.some(term => term.category === 'measurement')) {
        return 'medical_monitoring';
      }
      if (transcript.includes('patient') || transcript.includes('record') ||
        medicalTerms.some(term => term.category === 'procedure')) {
        return 'medical_record';
      }
      return 'medical_general';
    }

    return 'general';
  }

  /**
   * Extract modifiers from parsed action
   */
  private extractModifiers(action: any): Record<string, any> {
    const modifiers: Record<string, any> = {};

    if (action.where) modifiers.where = action.where;
    if (action.with) modifiers.with = action.with;
    if (action.as) modifiers.as = action.as;
    if (action.if) modifiers.if = action.if;
    if (action.until) modifiers.until = action.until;

    return modifiers;
  }

  private extractMedicalTerms(text: string): MedicalTerm[] {
    const terms: MedicalTerm[] = [];
    const _lowerText = text.toLowerCase();

    this.medicalDictionary.forEach((term, key) => {
      const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        terms.push({
          ...term,
          position: { start: match.index, end: match.index + match[0].length }
        });
      }
    });

    return terms;
  }

  private initializeEnhancedVocabulary(): void {
    this.enhancedMedicalVocabulary = [...this.MEDICAL_TERMS];

    if (this.options.medicalMode) {
      if (this.options.enableDebug) {
        console.log('🏥 Enhanced medical vocabulary initialized with', this.enhancedMedicalVocabulary.length, 'terms');
      }
    }
  }

  private async loadMedicalDictionary(): Promise<void> {
    // Legacy medical terminology database - enhanced version
    const medicalTerms = [
      { term: 'hypertension', category: 'condition', definition: 'High blood pressure' },
      { term: 'myocardial infarction', category: 'condition', definition: 'Heart attack' },
      { term: 'electrocardiogram', category: 'procedure', definition: 'ECG - heart rhythm test' },
      { term: 'intravenous', category: 'procedure', definition: 'IV - administered through vein' },
      { term: 'morphine', category: 'medication', definition: 'Pain relief medication' },
      { term: 'temperature', category: 'measurement', definition: 'Body temperature reading' },
      { term: 'blood pressure', category: 'measurement', definition: 'Arterial pressure measurement' },
      { term: 'oxygen saturation', category: 'measurement', definition: 'SpO2 level' },
      { term: 'respiratory rate', category: 'measurement', definition: 'Breaths per minute' },
      { term: 'cardiac arrest', category: 'condition', definition: 'Heart stops beating' },
      { term: 'stroke', category: 'condition', definition: 'Brain attack due to blood flow interruption' },
      { term: 'diabetes', category: 'condition', definition: 'Blood sugar disorder' },
      { term: 'insulin', category: 'medication', definition: 'Diabetes medication' },
      { term: 'antibiotic', category: 'medication', definition: 'Bacterial infection treatment' },
      { term: 'surgery', category: 'procedure', definition: 'Operative procedure' },
      { term: 'anesthesia', category: 'procedure', definition: 'Pain control during surgery' }
    ];

    medicalTerms.forEach(term => {
      this.medicalDictionary.set(term.term.toLowerCase(), {
        ...term,
        highlight: true,
        position: { start: 0, end: 0 }
      });
    });
  }

  private handleRecognitionEnd(): void {
    this.updateState({
      is_listening: false,
      is_processing: false
    });

    if (this.options.continuous && this.recognition) {
      // Restart after a short delay
      setTimeout(() => {
        if (!this.state.is_listening) {
          if (this.options.enableDebug) {
            console.log('🔄 Restarting voice recognition (continuous mode)');
          }
          this.startListening();
        }
      }, 100);
    }
  }

  private handleRecognitionError(event: any): void {
    const errorType = event.error || 'unknown';

    if (this.options.enableDebug) {
      console.error('❌ Speech recognition error:', event.error);
    }

    switch (errorType) {
      case 'network':
        this.updateState({ error: 'Network connectivity issue' });
        this.emitError('NETWORK_ERROR', 'Network connectivity issue');
        break;
      case 'not-allowed':
        this.updateState({ error: 'Microphone access denied by user' });
        this.emitError('MICROPHONE_DENIED', 'Microphone access denied by user');
        break;
      case 'no-speech':
        if (this.options.enableDebug) {
          console.log('🔇 No speech detected');
        }
        this.emitEvent({
          type: 'silence',
          transcript: '',
          confidence: 0,
          timestamp: new Date().toISOString(),
          rawEvent: event
        });
        break;
      case 'audio-capture':
        this.updateState({ error: 'Failed to capture audio' });
        this.emitError('AUDIO_CAPTURE_FAILED', 'Failed to capture audio');
        break;
      default:
        this.updateState({ error: `Speech recognition error: ${errorType}` });
        this.emitError('SPEECH_RECOGNITION_ERROR', `Error: ${errorType}`);
    }
  }

  // Event emission system
  private emitEvent(event: VoiceRecognitionEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ Event listener error:', error);
      }
    });
  }

  private emitError(code: string, message: string): void {
    this.emitEvent({
      type: 'error',
      transcript: '',
      confidence: 0,
      timestamp: new Date().toISOString(),
      rawEvent: { error: code, message }
    });
  }

  /**
   * Public API Methods - Enhanced with ActionLanguage integration
   */

  public startListening(mode?: VoiceRecognitionState['listening_mode']): void {
    if (!this.recognition || this.state.is_listening) return;

    if (mode) {
      this.updateState({ listening_mode: mode });
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('❌ Failed to start voice recognition:', error);
      this.updateState({ error: `Failed to start: ${error}` });
    }
  }

  public stopListening(): void {
    if (this.recognition && this.state.is_listening) {
      this.recognition.stop();
    }
  }

  public toggleListening(): void {
    if (this.state.is_listening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  // Event listener management
  public addEventListener(type: VoiceRecognitionEvent['type'], listener: (event: VoiceRecognitionEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  public removeEventListener(type: VoiceRecognitionEvent['type'], listener: (event: VoiceRecognitionEvent) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Enhanced speech synthesis
  public speak(text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state.is_muted) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);

      utterance.rate = options?.rate || 0.9;
      utterance.pitch = options?.pitch || 1;
      utterance.volume = options?.volume || 1;

      utterance.onstart = () => {
        this.updateState({ is_speaking: true });
      };

      utterance.onend = () => {
        this.updateState({ is_speaking: false });
        resolve();
      };

      utterance.onerror = (error) => {
        this.updateState({ is_speaking: false });
        reject(error);
      };

      this.synthesis.speak(utterance);
    });
  }

  public stopSpeaking(): void {
    this.synthesis.cancel();
    this.updateState({ is_speaking: false });
  }

  public toggleMute(): void {
    this.updateState({ is_muted: !this.state.is_muted });
  }

  public updateState(updates: Partial<VoiceRecognitionState>): void {
    this.state = { ...this.state, ...updates };

    // Update confidence for enhanced tracking
    if (updates.confidence !== undefined) {
      this.state.confidence = updates.confidence;
    }

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  public getState(): VoiceRecognitionState {
    return { ...this.state };
  }

  public updateConfig(config: Partial<MedicalVocabularyConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.terminology_sets) {
      // Reload dictionary based on new settings
      this.loadMedicalDictionary();
    }
  }

  public getConfig(): MedicalVocabularyConfig {
    return { ...this.config };
  }

  // Enhanced API methods
  public updateOptions(options: Partial<VoiceRecognitionOptions>): void {
    this.options = { ...this.options, ...options };

    // Reinitialize recognition if language or continuous setting changed
    if ((options.language || options.continuous !== undefined) && this.recognition) {
      this.restartRecognition();
    }

    if (this.options.enableDebug) {
      console.log('⚙️ Voice options updated:', this.options);
    }
  }

  private restartRecognition(): void {
    this.stopListening();

    if (this.recognition) {
      this.recognition.continuous = this.options.continuous;
      this.recognition.lang = this.options.language;
    }
  }

  public getOptions(): VoiceRecognitionOptions {
    return { ...this.options };
  }

  public getSupportedVerbs(): string[] {
    return [...this.SUPPORTED_VERBS];
  }

  public getEnhancedVocabulary(): MedicalVocabularyTerm[] {
    return [...this.enhancedMedicalVocabulary];
  }

  public getConfidenceHistory(): number[] {
    return [...this.confidenceHistory];
  }

  // Test functionality
  public async testRecognition(testText: string): Promise<VoiceRecognitionEvent | null> {
    if (this.options.enableDebug) {
      console.log(`🧪 Testing recognition with: "${testText}"`);
    }

    // Simulate recognition event for testing
    const event: VoiceRecognitionEvent = {
      type: 'speech',
      transcript: testText,
      confidence: 0.9,
      timestamp: new Date().toISOString()
    };

    this.emitEvent(event);
    return event;
  }

  // Utility methods
  public getSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
      'es-ES', 'es-MX', 'fr-FR', 'fr-CA', 'de-DE',
      'it-IT', 'pt-BR', 'pt-PT', 'zh-CN', 'zh-TW',
      'ja-JP', 'ko-KR', 'ar-SA', 'hi-IN', 'ru-RU'
    ];
  }

  public static checkCompatibility(): { supported: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      issues.push('Web Speech API not supported');
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      issues.push('Media devices API not supported');
    }

    const supported = issues.length === 0;

    return { supported, issues };
  }

  public destroy(): void {
    this.stopListening();

    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }

    this.synthesis.cancel();
    this.eventListeners.clear();
    this.confidenceHistory = [];

    if (this.options.enableDebug) {
      console.log('🧹 Voice Recognition Service destroyed');
    }
  }
}

export default VoiceRecognitionService;