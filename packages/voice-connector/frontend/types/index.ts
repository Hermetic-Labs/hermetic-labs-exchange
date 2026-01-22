/**
 * Voice Connector Types
 * 
 * TypeScript type definitions for voice recognition,
 * command processing, and voice-to-reflex-card integration
 */

// Event Types
export type VoiceEventType = 'speech' | 'command' | 'error' | 'silence' | 'confidence_low' | 'medical_term';
export type SessionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
export type MedicalTermCategory = 'anatomy' | 'symptom' | 'procedure' | 'medication' | 'device' | 'measurement' | 'condition';

// Configuration Types
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

export interface VoiceCredentials {
  apiKey?: string;
  provider: 'browser' | 'google' | 'azure' | 'aws';
}

export interface VoiceConnectionResponse {
  connected: boolean;
  language: string;
  medicalMode: boolean;
  provider: string;
}

// Recognition Types
export interface VoiceRecognitionState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  language: string;
  confidence: number;
  error?: string;
}

export interface TranscriptEntry {
  text: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: string[];
  timestamp: string;
  medicalTerms?: MedicalTerm[];
}

export interface MedicalTerm {
  term: string;
  aliases: string[];
  category: MedicalTermCategory;
  confidence: number;
  definition?: string;
}

export interface MedicalVocabularyConfig {
  enabled: boolean;
  customTerms?: MedicalTerm[];
  strictMode?: boolean;
}

// Event Types
export interface VoiceRecognitionEvent {
  type: VoiceEventType;
  transcript: string;
  confidence: number;
  alternatives?: string[];
  timestamp: string;
  command?: VoiceCommand;
  medicalTerms?: MedicalTerm[];
  rawEvent?: any;
}

// Command Types
export interface VoiceCommand {
  verb: string;
  noun: string;
  modifiers: Record<string, any>;
  confidence: number;
  medicalTerm?: string;
  context?: string;
  originalTranscript: string;
  executionResult?: any;
}

export interface VoiceCommandResponse {
  success: boolean;
  command: VoiceCommand;
  result?: Record<string, any>;
  error?: string;
  executionTimeMs: number;
}

export interface VoiceCommandHandler {
  verb: string;
  handler: (command: VoiceCommand) => Promise<any>;
  description?: string;
}

// Session Types
export interface VoiceSessionState {
  state: SessionState;
  isListening: boolean;
  language: string;
  medicalMode: boolean;
  transcriptCount: number;
  commandCount: number;
  lastActivity?: string;
}

// Reflex Card Types
export interface ReflexCardAction {
  cardType: string;
  title: string;
  description: string;
  actionData: Record<string, any>;
  sourceCommand: VoiceCommand;
}

export interface VoiceToReflexRequest {
  transcript: string;
  context?: string;
  medicalMode?: boolean;
}

export interface VoiceToReflexResponse {
  success: boolean;
  card?: ReflexCardAction;
  command?: VoiceCommand;
  error?: string;
}

// Service Event Handlers
export interface VoiceServiceEventHandlers {
  onStateChange?: (state: VoiceRecognitionState) => void;
  onTranscript?: (entry: TranscriptEntry) => void;
  onCommand?: (command: VoiceCommand) => void;
  onError?: (error: string) => void;
  onMedicalTerm?: (term: MedicalTerm) => void;
}

// Recognition Request/Response
export interface VoiceRecognitionRequest {
  audioData?: string;
  audioUrl?: string;
  language?: string;
  medicalMode?: boolean;
}

export interface VoiceRecognitionResponse {
  success: boolean;
  transcript?: TranscriptEntry;
  error?: string;
  processingTimeMs: number;
}

// Synthesis Types
export interface VoiceSynthesisOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

export interface VoiceSynthesisRequest {
  text: string;
  options?: VoiceSynthesisOptions;
}
