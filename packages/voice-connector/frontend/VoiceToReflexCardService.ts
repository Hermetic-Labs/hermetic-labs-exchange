/**
 * EVE OS Voice-to-ReflexCard Generator Service
 * 
 * Converts processed voice commands into Reflex Card format with comprehensive
 * safety validation, medical compliance, and integration with existing card ecosystem.
 * 
 * KEY FEATURES:
 * - Voice command processing and parsing
 * - ActionLanguage verbs mapping to card types
 * - Medical safety validation using VerbSafetyService
 * - Card execution integration with CardExecutionEngine
 * - IoTWorkflowEngine integration for device operations
 * - Voice feedback for card creation confirmation
 * - Error handling for invalid voice commands
 * - Support for complex multi-step voice workflows
 * - Full compatibility with existing card ecosystem
 */

import { EventEmitter } from './EventEmitter';
import { ReflexCard, CardOutput, CardMetadata as _CardMetadata } from '@/types';
import { ActionLanguageService, actionLanguageService } from '@/services/ActionLanguageService';
import { cardExecutionEngine } from '@/services/CardExecutionEngine';
import { IoTWorkflowEngine } from '@market/iot-connector/frontend/IoTWorkflowEngine';
import { VerbSafetyValidationResult } from '@/services/VerbSafetyService';
// Import types from a shared location or define locally if strictly internal, 
// strictly these should come from the installed package
import { DeviceCategory, UserContext, MedicalContext, DeviceControlRequest as _DeviceControlRequest } from '@market/iot-connector/frontend/IoTDeviceAdapter';

// Voice Command Processing Types
export interface VoiceCommand {
  id: string;
  rawText: string;
  processedText: string;
  intent: string;
  parameters: Record<string, any>;
  confidence: number;
  timestamp: Date;
  context?: VoiceContext;
}

export interface VoiceContext {
  sessionId: string;
  deviceCategory: DeviceCategory;
  userContext: UserContext;
  medicalContext?: MedicalContext;
  previousCommands: string[];
  currentWorkflow?: string;
}

export interface VoiceWorkflowStep {
  id: string;
  voiceCommand: VoiceCommand;
  reflexCard: ReflexCard;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  executionResult?: CardOutput;
  safetyValidation?: VerbSafetyValidationResult;
}

export interface MultiStepVoiceWorkflow {
  id: string;
  name: string;
  description: string;
  steps: VoiceWorkflowStep[];
  status: 'created' | 'executing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  userContext: UserContext;
  deviceCategory: DeviceCategory;
  medicalContext?: MedicalContext;
  totalSteps: number;
  completedSteps: number;
  safetyScore: number;
}

// Voice-to-Card Mapping Types
export interface VoiceToCardMapping {
  voicePattern: RegExp;
  cardType: 'function' | 'emotion' | 'persona' | 'memory' | 'iot_action';
  actionLanguageVerb: string;
  actionLanguageNoun: string;
  safetyLevel: 'safe' | 'monitored' | 'controlled' | 'restricted' | 'critical';
  medicalCompliant: boolean;
  requiresConfirmation: boolean;
}

export interface VoiceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  safetyScore: number;
  requiresConfirmation: boolean;
  medicalCompliant: boolean;
}

export interface VoiceFeedback {
  message: string;
  tone: 'success' | 'warning' | 'error' | 'info';
  cardCreated?: boolean;
  workflowUpdated?: boolean;
  executionStarted?: boolean;
  safetyWarning?: string;
}

/**
 * Voice-to-ReflexCard Generator Service
 * 
 * Converts voice commands into executable Reflex Cards with safety validation,
 * medical compliance, and seamless integration with the EVE OS card ecosystem.
 */
export class VoiceToReflexCardService extends EventEmitter {
  private static instance: VoiceToReflexCardService;
  private voiceToCardMappings: Map<string, VoiceToCardMapping> = new Map();
  private activeWorkflows: Map<string, MultiStepVoiceWorkflow> = new Map();
  private voiceProcessingHistory: VoiceCommand[] = [];
  private safetyValidationCache: Map<string, VerbSafetyValidationResult> = new Map();

  // Voice processing configuration
  private readonly VOICE_CONFIDENCE_THRESHOLD = 0.7;
  private readonly MAX_WORKFLOW_STEPS = 20;
  private readonly SAFETY_CACHE_TTL = 300000; // 5 minutes

  private constructor(
    private actionLanguageService: ActionLanguageService,
    private iotWorkflowEngine?: IoTWorkflowEngine,
    private verbSafetyService = verbSafetyService
  ) {
    super();
    this.initializeVoiceToCardMappings();
    this.initializeEventListeners();
  }

  public static getInstance(
    actionLanguageServiceParam?: ActionLanguageService,
    iotWorkflowEngine?: IoTWorkflowEngine
  ): VoiceToReflexCardService {
    if (!VoiceToReflexCardService.instance) {
      // Use provided instance or fall back to imported singleton
      const als = actionLanguageServiceParam || actionLanguageService;
      VoiceToReflexCardService.instance = new VoiceToReflexCardService(
        als,
        iotWorkflowEngine
      );
    }
    return VoiceToReflexCardService.instance;
  }

  /**
   * Initialize voice-to-card mappings for different command patterns
   */
  private initializeVoiceToCardMappings(): void {
    const mappings: VoiceToCardMapping[] = [
      // Medical Voice Commands
      {
        voicePattern: /(read|get|show)\s+(vital|heart\s+rate|blood\s+pressure|temperature|oxygen)/i,
        cardType: 'function',
        actionLanguageVerb: 'read',
        actionLanguageNoun: 'vital',
        safetyLevel: 'controlled',
        medicalCompliant: true,
        requiresConfirmation: false
      },
      {
        voicePattern: /(monitor|track|watch)\s+(vitals?|heart\s+rate|blood\s+pressure)/i,
        cardType: 'function',
        actionLanguageVerb: 'monitor',
        actionLanguageNoun: 'vital',
        safetyLevel: 'controlled',
        medicalCompliant: true,
        requiresConfirmation: false
      },
      {
        voicePattern: /(notify|alert|call)\s+(doctor|nurse|emergency|911)/i,
        cardType: 'function',
        actionLanguageVerb: 'notify',
        actionLanguageNoun: 'alert',
        safetyLevel: 'safe',
        medicalCompliant: true,
        requiresConfirmation: false
      },
      {
        voicePattern: /(write|record|update)\s+(note|record|chart|medication)/i,
        cardType: 'function',
        actionLanguageVerb: 'write',
        actionLanguageNoun: 'record',
        safetyLevel: 'monitored',
        medicalCompliant: true,
        requiresConfirmation: false
      },

      // Personal IoT Voice Commands
      {
        voicePattern: /(turn|switch)\s+(on|off)\s+(\w+)/i,
        cardType: 'iot_action',
        actionLanguageVerb: 'control',
        actionLanguageNoun: 'device',
        safetyLevel: 'safe',
        medicalCompliant: false,
        requiresConfirmation: false
      },
      {
        voicePattern: /(set|adjust|change)\s+(\w+)\s+(to|at)\s+(\w+)/i,
        cardType: 'iot_action',
        actionLanguageVerb: 'set',
        actionLanguageNoun: 'parameter',
        safetyLevel: 'safe',
        medicalCompliant: false,
        requiresConfirmation: false
      },
      {
        voicePattern: /(get|read|show)\s+(temperature|humidity|light|status)/i,
        cardType: 'iot_action',
        actionLanguageVerb: 'read',
        actionLanguageNoun: 'sensor',
        safetyLevel: 'safe',
        medicalCompliant: false,
        requiresConfirmation: false
      },

      // System Control Voice Commands
      {
        voicePattern: /(call|phone|dial)\s+(\w+)/i,
        cardType: 'function',
        actionLanguageVerb: 'call',
        actionLanguageNoun: 'contact',
        safetyLevel: 'monitored',
        medicalCompliant: false,
        requiresConfirmation: false
      },
      {
        voicePattern: /(send|message|text)\s+(to\s+)?(\w+)/i,
        cardType: 'function',
        actionLanguageVerb: 'send',
        actionLanguageNoun: 'message',
        safetyLevel: 'safe',
        medicalCompliant: false,
        requiresConfirmation: false
      },
      {
        voicePattern: /(show|display|render)\s+(chart|graph|visualization|mesh)/i,
        cardType: 'function',
        actionLanguageVerb: 'render',
        actionLanguageNoun: 'visualization',
        safetyLevel: 'safe',
        medicalCompliant: false,
        requiresConfirmation: false
      },

      // Emotion and Persona Commands
      {
        voicePattern: /(be|act|switch)\s+(calm|friendly|professional|caring)/i,
        cardType: 'persona',
        actionLanguageVerb: 'switch',
        actionLanguageNoun: 'persona',
        safetyLevel: 'safe',
        medicalCompliant: true,
        requiresConfirmation: false
      },
      {
        voicePattern: /(feel|show|express)\s+(happy|sad|concerned|excited)/i,
        cardType: 'emotion',
        actionLanguageVerb: 'express',
        actionLanguageNoun: 'emotion',
        safetyLevel: 'safe',
        medicalCompliant: true,
        requiresConfirmation: false
      },

      // Memory and Learning Commands
      {
        voicePattern: /(remember|store|learn)\s+(this|that|information)/i,
        cardType: 'memory',
        actionLanguageVerb: 'store',
        actionLanguageNoun: 'memory',
        safetyLevel: 'safe',
        medicalCompliant: true,
        requiresConfirmation: false
      },
      {
        voicePattern: /(recall|retrieve|get)\s+(memory|information|data)/i,
        cardType: 'memory',
        actionLanguageVerb: 'retrieve',
        actionLanguageNoun: 'memory',
        safetyLevel: 'safe',
        medicalCompliant: true,
        requiresConfirmation: false
      },

      // Emergency Commands
      {
        voicePattern: /(emergency|stop|cancel|abort)/i,
        cardType: 'function',
        actionLanguageVerb: 'emergency_stop',
        actionLanguageNoun: 'operation',
        safetyLevel: 'critical',
        medicalCompliant: true,
        requiresConfirmation: false
      }
    ];

    mappings.forEach(mapping => {
      const key = `${mapping.actionLanguageVerb}-${mapping.actionLanguageNoun}`;
      this.voiceToCardMappings.set(key, mapping);
    });

    console.log(`✅ Initialized ${mappings.length} voice-to-card mappings`);
  }

  /**
   * Initialize event listeners for ecosystem integration
   */
  private initializeEventListeners(): void {
    // Listen for safety incidents from VerbSafetyService
    this.verbSafetyService.on('emergencyRestrictionApplied', (data) => {
      this.emit('emergencyRestrictionApplied', data);
    });

    // Listen for workflow events from IoTWorkflowEngine
    if (this.iotWorkflowEngine) {
      this.iotWorkflowEngine.on('workflowExecutionStarted', (data) => {
        this.emit('voiceWorkflowExecutionStarted', data);
      });

      this.iotWorkflowEngine.on('workflowCompleted', (data) => {
        this.emit('voiceWorkflowCompleted', data);
      });
    }

    // Listen for card execution events
    this.on('cardExecutionStarted', (data) => {
      this.emit('voiceCardExecutionStarted', data);
    });

    this.on('cardExecutionCompleted', (data) => {
      this.emit('voiceCardExecutionCompleted', data);
    });
  }

  /**
   * Process voice command and convert to ReflexCard
   */
  async processVoiceCommand(
    rawVoiceText: string,
    voiceContext: VoiceContext
  ): Promise<{
    success: boolean;
    reflexCard?: ReflexCard;
    validationResult?: VoiceValidationResult;
    voiceFeedback?: VoiceFeedback;
    workflowStep?: VoiceWorkflowStep;
  }> {
    const commandId = this.generateCommandId();
    const startTime = Date.now();

    try {
      console.log(`🎤 Processing voice command: "${rawVoiceText}"`);

      // 1. Preprocess voice text
      const processedText = this.preprocessVoiceText(rawVoiceText);

      // 2. Parse intent and extract parameters
      const voiceCommand: VoiceCommand = {
        id: commandId,
        rawText: rawVoiceText,
        processedText,
        intent: this.extractIntent(processedText),
        parameters: this.extractParameters(processedText),
        confidence: this.calculateConfidence(processedText),
        timestamp: new Date(),
        context: voiceContext
      };

      // Validate voice processing quality
      if (voiceCommand.confidence < this.VOICE_CONFIDENCE_THRESHOLD) {
        return {
          success: false,
          validationResult: {
            valid: false,
            errors: [`Voice confidence too low: ${voiceCommand.confidence}`],
            warnings: [],
            suggestions: ['Try speaking more clearly or rephrase your command'],
            safetyScore: 0,
            requiresConfirmation: true,
            medicalCompliant: true
          },
          voiceFeedback: {
            message: 'I didn\'t quite catch that. Could you please repeat your command?',
            tone: 'warning'
          }
        };
      }

      // 3. Map voice command to ActionLanguage action
      const actionLanguageAction = await this.mapVoiceToActionLanguage(voiceCommand);
      if (!actionLanguageAction) {
        return {
          success: false,
          validationResult: {
            valid: false,
            errors: ['Could not parse voice command into actionable format'],
            warnings: [],
            suggestions: ['Try using simpler language or check available commands'],
            safetyScore: 0,
            requiresConfirmation: false,
            medicalCompliant: voiceContext.deviceCategory === 'medical'
          },
          voiceFeedback: {
            message: 'I couldn\'t understand that command. Please try again.',
            tone: 'error'
          }
        };
      }

      // 4. Validate voice command for safety
      const validationResult = await this.validateVoiceCommand(
        actionLanguageAction,
        voiceContext
      );

      if (!validationResult.valid) {
        return {
          success: false,
          validationResult,
          voiceFeedback: {
            message: `Command validation failed: ${validationResult.errors.join(', ')}`,
            tone: 'error',
            safetyWarning: validationResult.safetyScore < 50 ? 'Safety score below acceptable threshold' : undefined
          }
        };
      }

      // 5. Generate ReflexCard from ActionLanguage action
      const reflexCard = await this.generateReflexCardFromAction(
        actionLanguageAction,
        voiceContext,
        voiceCommand
      );

      // 6. Create workflow step if part of multi-step workflow
      const workflowStep: VoiceWorkflowStep = {
        id: `step_${commandId}`,
        voiceCommand,
        reflexCard,
        status: 'pending'
      };

      // 7. Store voice processing history
      this.voiceProcessingHistory.push(voiceCommand);
      if (this.voiceProcessingHistory.length > 100) {
        this.voiceProcessingHistory = this.voiceProcessingHistory.slice(-100);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Voice command processed successfully in ${processingTime}ms`);

      return {
        success: true,
        reflexCard,
        validationResult,
        workflowStep,
        voiceFeedback: {
          message: this.generateSuccessFeedback(voiceCommand, reflexCard),
          tone: 'success',
          cardCreated: true
        }
      };

    } catch (error: any) {
      console.error('❌ Voice command processing failed:', error);

      return {
        success: false,
        validationResult: {
          valid: false,
          errors: [`Processing failed: ${error.message}`],
          warnings: [],
          suggestions: ['Please try rephrasing your command or contact support'],
          safetyScore: 0,
          requiresConfirmation: true,
          medicalCompliant: voiceContext.deviceCategory === 'medical'
        },
        voiceFeedback: {
          message: 'Sorry, I encountered an error processing your command.',
          tone: 'error'
        }
      };
    }
  }

  /**
   * Execute generated ReflexCard with integration to existing engines
   */
  async executeVoiceGeneratedCard(
    reflexCard: ReflexCard,
    voiceContext: VoiceContext
  ): Promise<{
    success: boolean;
    executionResult?: CardOutput;
    voiceFeedback?: VoiceFeedback;
    workflowUpdated?: boolean;
  }> {
    try {
      console.log(`🃏 Executing voice-generated card: ${reflexCard.id}`);

      // Emit execution start event
      this.emit('cardExecutionStarted', {
        cardId: reflexCard.id,
        voiceGenerated: true,
        context: voiceContext
      });

      // Execute card using CardExecutionEngine
      const executionResult = await cardExecutionEngine.executeCard(reflexCard);

      // Handle IoT device operations if applicable
      if (this.isIoTOperation(reflexCard) && this.iotWorkflowEngine) {
        await this.executeIoTOperation(reflexCard, voiceContext);
      }

      // Emit execution completion event
      this.emit('cardExecutionCompleted', {
        cardId: reflexCard.id,
        executionResult,
        voiceGenerated: true,
        context: voiceContext
      });

      const voiceFeedback: VoiceFeedback = {
        message: this.generateExecutionFeedback(reflexCard, executionResult),
        tone: executionResult.success ? 'success' : 'error',
        executionStarted: true
      };

      return {
        success: executionResult.success,
        executionResult: {
          result: (executionResult.output || {}) as Record<string, unknown>,
          execution_time: executionResult.execution_time
        },
        voiceFeedback
      };

    } catch (error: any) {
      console.error('❌ Voice card execution failed:', error);

      return {
        success: false,
        voiceFeedback: {
          message: 'Command execution failed. Please try again.',
          tone: 'error'
        }
      };
    }
  }

  /**
   * Create multi-step voice workflow
   */
  async createMultiStepVoiceWorkflow(
    workflowName: string,
    voiceCommands: string[],
    voiceContext: VoiceContext
  ): Promise<{
    success: boolean;
    workflow?: MultiStepVoiceWorkflow;
    errors?: string[];
    voiceFeedback?: VoiceFeedback;
  }> {
    try {
      if (voiceCommands.length === 0) {
        return {
          success: false,
          errors: ['No voice commands provided for workflow'],
          voiceFeedback: {
            message: 'Cannot create empty workflow',
            tone: 'error'
          }
        };
      }

      if (voiceCommands.length > this.MAX_WORKFLOW_STEPS) {
        return {
          success: false,
          errors: [`Workflow exceeds maximum step limit (${this.MAX_WORKFLOW_STEPS})`],
          voiceFeedback: {
            message: `Workflow too long. Maximum ${this.MAX_WORKFLOW_STEPS} steps allowed.`,
            tone: 'warning'
          }
        };
      }

      const workflowId = this.generateWorkflowId();
      const steps: VoiceWorkflowStep[] = [];

      console.log(`📋 Creating multi-step workflow "${workflowName}" with ${voiceCommands.length} steps`);

      // Process each voice command in the workflow
      for (let i = 0; i < voiceCommands.length; i++) {
        const voiceResult = await this.processVoiceCommand(voiceCommands[i], {
          ...voiceContext,
          currentWorkflow: workflowId,
          previousCommands: voiceCommands.slice(0, i)
        });

        if (!voiceResult.success || !voiceResult.reflexCard || !voiceResult.workflowStep) {
          return {
            success: false,
            errors: [`Failed to process step ${i + 1}: ${voiceResult.validationResult?.errors.join(', ')}`],
            voiceFeedback: {
              message: `Workflow creation failed at step ${i + 1}`,
              tone: 'error'
            }
          };
        }

        steps.push(voiceResult.workflowStep);
      }

      // Create the workflow
      const workflow: MultiStepVoiceWorkflow = {
        id: workflowId,
        name: workflowName,
        description: `Multi-step voice workflow created on ${new Date().toLocaleString()}`,
        steps,
        status: 'created',
        createdAt: new Date(),
        userContext: voiceContext.userContext,
        deviceCategory: voiceContext.deviceCategory,
        medicalContext: voiceContext.medicalContext,
        totalSteps: steps.length,
        completedSteps: 0,
        safetyScore: this.calculateWorkflowSafetyScore(steps)
      };

      // Store the workflow
      this.activeWorkflows.set(workflowId, workflow);

      return {
        success: true,
        workflow,
        voiceFeedback: {
          message: `Workflow "${workflowName}" created successfully with ${steps.length} steps`,
          tone: 'success',
          workflowUpdated: true
        }
      };

    } catch (error: any) {
      console.error('❌ Multi-step workflow creation failed:', error);

      return {
        success: false,
        errors: [`Workflow creation failed: ${error.message}`],
        voiceFeedback: {
          message: 'Failed to create workflow. Please try again.',
          tone: 'error'
        }
      };
    }
  }

  /**
   * Execute multi-step voice workflow
   */
  async executeMultiStepVoiceWorkflow(
    workflowId: string,
    options?: {
      pauseOnError?: boolean;
      requireConfirmation?: boolean;
      parallelExecution?: boolean;
    }
  ): Promise<{
    success: boolean;
    executionResult?: any;
    voiceFeedback?: VoiceFeedback;
  }> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return {
        success: false,
        voiceFeedback: {
          message: 'Workflow not found',
          tone: 'error'
        }
      };
    }

    try {
      console.log(`🚀 Executing workflow: ${workflow.name}`);

      workflow.status = 'executing';
      const startTime = Date.now();
      const results: any[] = [];
      let completedSteps = 0;

      // Execute steps based on options
      if (options?.parallelExecution) {
        // Parallel execution - execute all steps simultaneously
        const executionPromises = workflow.steps.map(async (step) => {
          try {
            step.status = 'processing';
            const result = await this.executeVoiceGeneratedCard(step.reflexCard, {
              sessionId: `workflow_${workflowId}`,
              deviceCategory: workflow.deviceCategory,
              userContext: workflow.userContext,
              medicalContext: workflow.medicalContext,
              previousCommands: []
            });

            step.status = result.success ? 'completed' : 'failed';
            if (result.executionResult) {
              step.executionResult = result.executionResult;
            }

            return { step, result };
          } catch (error) {
            step.status = 'failed';
            return { step, error };
          }
        });

        const stepResults = await Promise.all(executionPromises);
        results.push(...stepResults);
        completedSteps = stepResults.filter(r => r.step.status === 'completed').length;

      } else {
        // Sequential execution
        for (const step of workflow.steps) {
          if (options?.requireConfirmation && step.safetyValidation?.requiresConfirmation) {
            // Wait for user confirmation for critical steps
            const confirmed = await this.requestUserConfirmation(step);
            if (!confirmed) {
              step.status = 'failed'; // 'cancelled' is not valid for VoiceWorkflowStep status apparently
              continue;
            }
          }

          step.status = 'processing';
          const result = await this.executeVoiceGeneratedCard(step.reflexCard, {
            sessionId: `workflow_${workflowId}`,
            deviceCategory: workflow.deviceCategory,
            userContext: workflow.userContext,
            medicalContext: workflow.medicalContext,
            previousCommands: workflow.steps.slice(0, workflow.steps.indexOf(step)).map(s => s.voiceCommand.rawText)
          });

          step.status = result.success ? 'completed' : 'failed';
          if (result.executionResult) {
            step.executionResult = result.executionResult;
          }

          results.push({ step, result });
          completedSteps++;

          // Update workflow progress
          workflow.completedSteps = completedSteps;

          // Pause on error if configured
          if (!result.success && options?.pauseOnError) {
            console.log(`⚠️ Pausing workflow execution due to step failure`);
            break;
          }
        }
      }

      const executionTime = Date.now() - startTime;

      // Update workflow status
      workflow.status = completedSteps === workflow.totalSteps ? 'completed' : 'failed';
      workflow.completedAt = new Date();

      console.log(`✅ Workflow execution completed: ${completedSteps}/${workflow.totalSteps} steps`);

      return {
        success: completedSteps > 0,
        executionResult: {
          workflow,
          results,
          executionTime,
          successRate: completedSteps / workflow.totalSteps
        },
        voiceFeedback: {
          message: this.generateWorkflowExecutionFeedback(workflow, completedSteps),
          tone: workflow.status === 'completed' ? 'success' : 'warning',
          workflowUpdated: true,
          executionStarted: true
        }
      };

    } catch (error: any) {
      console.error('❌ Workflow execution failed:', error);

      workflow.status = 'failed';
      workflow.completedAt = new Date();

      return {
        success: false,
        voiceFeedback: {
          message: 'Workflow execution failed',
          tone: 'error'
        }
      };
    }
  }

  // Private helper methods

  private preprocessVoiceText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\b(um|uh|er|ah)\b/g, ''); // Remove filler words
  }

  private extractIntent(text: string): string {
    // Extract primary intent from voice text
    const intents = [
      /read|get|show/,
      /monitor|track|watch/,
      /notify|alert|call/,
      /write|record|update/,
      /turn|switch|control/,
      /set|adjust|change/,
      /emergency|stop|cancel/
    ];

    for (const intentPattern of intents) {
      if (intentPattern.test(text)) {
        return intentPattern.source.replace(/[^\w]/g, '');
      }
    }

    return 'unknown';
  }

  private extractParameters(text: string): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Extract device mentions
    const deviceMatch = text.match(/(?:on|with|using)\s+(\w+)/);
    if (deviceMatch) {
      parameters.device = deviceMatch[1];
    }

    // Extract values
    const valueMatch = text.match(/(?:to|at)\s+(\w+)/);
    if (valueMatch) {
      parameters.value = valueMatch[1];
    }

    // Extract time-related parameters
    const timeMatch = text.match(/(every|for|until)\s+(\w+)/);
    if (timeMatch) {
      parameters.timing = timeMatch[2];
    }

    return parameters;
  }

  private calculateConfidence(text: string): number {
    // Simple confidence calculation based on text quality
    let confidence = 1.0;

    // Reduce confidence for very short commands
    if (text.length < 5) confidence -= 0.3;

    // Reduce confidence for commands with many filler words
    const fillerWords = (text.match(/\b(um|uh|er|ah|like|you know)\b/g) || []).length;
    confidence -= (fillerWords * 0.1);

    // Increase confidence for clear command patterns
    if (/^(read|monitor|notify|turn|set|emergency)\s+/.test(text)) {
      confidence += 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private async mapVoiceToActionLanguage(
    voiceCommand: VoiceCommand
  ): Promise<any> {
    for (const [_key, mapping] of this.voiceToCardMappings) {
      if (mapping.voicePattern.test(voiceCommand.processedText)) {
        const action = {
          verb: mapping.actionLanguageVerb,
          noun: mapping.actionLanguageNoun,
          where: this.extractWhereClause(voiceCommand.processedText),
          with: this.extractWithClause(voiceCommand.processedText, voiceCommand.parameters),
          as: this.extractAsClause(voiceCommand.processedText),
          if: this.extractIfClause(voiceCommand.processedText),
          until: this.extractUntilClause(voiceCommand.processedText)
        };

        // Validate action against ActionLanguageService
        const validation = this.actionLanguageService.validateAction ?
          this.actionLanguageService.validateAction(action) :
          { valid: true, errors: [] };

        if (validation.valid) {
          return action;
        }
      }
    }

    return null;
  }

  private extractWhereClause(text: string): any {
    const whereMatch = text.match(/where\s+(\w+(?:\s*\w+)*)/);
    if (whereMatch) {
      const whereText = whereMatch[1];
      // Parse where clause into key-value pairs
      if (whereText.includes('=')) {
        const pairs = whereText.split(/\s+/).filter(part => part.includes('='));
        return Object.fromEntries(
          pairs.map(pair => pair.split('=').map(s => s.trim()))
        );
      }
      return whereText;
    }
    return undefined;
  }

  private extractWithClause(text: string, parameters: Record<string, any>): any {
    const withClause: any = { ...parameters };

    // Add device context
    if (parameters.device) {
      withClause.device = parameters.device;
    }

    // Add value context
    if (parameters.value) {
      withClause.value = parameters.value;
    }

    // Add timing context
    if (parameters.timing) {
      withClause.timing = parameters.timing;
    }

    return Object.keys(withClause).length > 0 ? withClause : undefined;
  }

  private extractAsClause(text: string): string | undefined {
    const asMatch = text.match(/as\s+(\w+)/);
    return asMatch ? asMatch[1] : undefined;
  }

  private extractIfClause(text: string): string | undefined {
    const ifMatch = text.match(/if\s+([^.]+)/);
    return ifMatch ? ifMatch[1] : undefined;
  }

  private extractUntilClause(text: string): string | undefined {
    const untilMatch = text.match(/until\s+([^.]+)/);
    return untilMatch ? untilMatch[1] : undefined;
  }

  private async validateVoiceCommand(
    action: any,
    voiceContext: VoiceContext
  ): Promise<VoiceValidationResult> {
    try {
      // Use VerbSafetyService for comprehensive validation
      const safetyValidation = await this.verbSafetyService.validateReflexCardCreation(
        action,
        voiceContext.deviceCategory,
        voiceContext.userContext,
        voiceContext.medicalContext
      );

      // Check medical compliance
      const medicalCompliant = this.isMedicalCompliantAction(action, voiceContext);

      // Calculate overall safety score
      const safetyScore = this.calculateActionSafetyScore(action, safetyValidation);

      return {
        valid: safetyValidation.passed,
        errors: safetyValidation.violations.map(v => v.message),
        warnings: safetyValidation.warnings.map(w => w.message),
        suggestions: safetyValidation.suggestions,
        safetyScore,
        requiresConfirmation: safetyValidation.requiresConfirmation,
        medicalCompliant
      };

    } catch (error: any) {
      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
        suggestions: ['Please rephrase your command'],
        safetyScore: 0,
        requiresConfirmation: true,
        medicalCompliant: voiceContext.deviceCategory === 'medical'
      };
    }
  }

  private async generateReflexCardFromAction(
    action: any,
    voiceContext: VoiceContext,
    voiceCommand: VoiceCommand
  ): Promise<ReflexCard> {
    // Use ActionLanguageService to generate the card
    const reflexCard = await this.actionLanguageService.actionToReflexCard(action);

    // Enhance with voice-specific metadata
    reflexCard.metadata = {
      ...reflexCard.metadata,
      voice_generated: true,
      voice_command_id: voiceCommand.id,
      voice_confidence: voiceCommand.confidence,
      original_voice_text: voiceCommand.rawText,
      processed_voice_text: voiceCommand.processedText,
      safety_validated: true,
      medical_compliant: voiceContext.deviceCategory === 'medical',
      voice_timestamp: voiceCommand.timestamp.toISOString()
    };

    // Set voice-specific source
    reflexCard.source = 'user';

    // Add voice context to card input
    reflexCard.input = {
      ...reflexCard.input,
      voice_context: {
        session_id: voiceContext.sessionId,
        device_category: voiceContext.deviceCategory,
        previous_commands: voiceContext.previousCommands,
        current_workflow: voiceContext.currentWorkflow
      }
    };

    return reflexCard;
  }

  private isIoTOperation(reflexCard: ReflexCard): boolean {
    const data = reflexCard.input.data as any;
    return data.verb === 'control' ||
      data.verb === 'set' ||
      data.verb === 'read' ||
      reflexCard.metadata.schema.includes('iot');
  }

  private async executeIoTOperation(
    reflexCard: ReflexCard,
    voiceContext: VoiceContext
  ): Promise<void> {
    if (!this.iotWorkflowEngine) {
      return;
    }

    try {
      // Create a simple workflow for single IoT operation
      const workflow = {
        nodes: [{
          id: 1,
          type: 'api',
          x: 100,
          y: 100,
          data: {
            name: `Voice: ${reflexCard.intent}`,
            method: 'POST',
            endpoint: '/api/device/control',
            deviceId: (reflexCard.input.data as any).with?.device || 'voice_device',
            capability: (reflexCard.input.data as any).verb,
            parameters: (reflexCard.input.data as any).with
          },
          inputs: [],
          outputs: [],
          executionState: null
        }],
        connections: [],
        metadata: {
          name: `Voice IoT: ${reflexCard.intent}`,
          description: `Voice-controlled IoT operation: ${reflexCard.intent}`,
          version: '1.0.0',
          createdAt: new Date(),
          deviceCategory: voiceContext.deviceCategory,
          safetyLevel: 'medium' as const
        }
      };

      // Compile and execute the workflow
      const compiledWorkflow = await this.iotWorkflowEngine.compileWorkflow(workflow);
      await this.iotWorkflowEngine.executeWorkflow(compiledWorkflow, voiceContext.userContext);

    } catch (error) {
      console.warn('IoT operation execution failed:', error);
    }
  }

  private isMedicalCompliantAction(action: any, voiceContext: VoiceContext): boolean {
    if (voiceContext.deviceCategory !== 'medical') {
      return true;
    }

    const medicalVerbs = ['read', 'write', 'render', 'monitor', 'notify', 'get', 'call'];
    const medicalNouns = ['vital', 'record', 'device', 'medication', 'patient'];

    const verbCompliant = medicalVerbs.includes(action.verb);
    const nounCompliant = !action.noun || medicalNouns.includes(action.noun);

    return verbCompliant && nounCompliant;
  }

  private calculateActionSafetyScore(
    action: any,
    safetyValidation: VerbSafetyValidationResult
  ): number {
    let score = safetyValidation.safetyScore || 100;

    // Adjust for medical operations
    if (action.verb === 'monitor' && action.noun === 'vital') {
      score += 10; // Critical monitoring gets bonus
    }

    // Deduct for high-risk operations
    if (['delete', 'override', 'reset'].includes(action.verb)) {
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateWorkflowSafetyScore(steps: VoiceWorkflowStep[]): number {
    if (steps.length === 0) return 100;

    const totalScore = steps.reduce((sum, step) => {
      // This would use the safety validation from each step
      return sum + (step.safetyValidation?.safetyScore || 75);
    }, 0);

    return totalScore / steps.length;
  }

  private generateSuccessFeedback(
    voiceCommand: VoiceCommand,
    reflexCard: ReflexCard
  ): string {
    const verb = voiceCommand.intent;

    const feedbackMap: Record<string, string> = {
      read: 'Reading requested information',
      monitor: 'Starting monitoring',
      notify: 'Sending notification',
      write: 'Recording information',
      control: 'Controlling device',
      set: 'Adjusting settings',
      emergency_stop: 'Emergency stop activated'
    };

    return feedbackMap[verb] || `Executing: ${reflexCard.intent}`;
  }

  private generateExecutionFeedback(
    reflexCard: ReflexCard,
    executionResult: any
  ): string {
    if (executionResult.success) {
      return `✅ ${reflexCard.intent} completed successfully`;
    } else {
      return `❌ ${reflexCard.intent} failed: ${executionResult.error}`;
    }
  }

  private generateWorkflowExecutionFeedback(
    workflow: MultiStepVoiceWorkflow,
    completedSteps: number
  ): string {
    const successRate = (completedSteps / workflow.totalSteps) * 100;

    if (completedSteps === workflow.totalSteps) {
      return `✅ Workflow "${workflow.name}" completed successfully`;
    } else if (successRate >= 50) {
      return `⚠️ Workflow "${workflow.name}" partially completed (${completedSteps}/${workflow.totalSteps} steps)`;
    } else {
      return `❌ Workflow "${workflow.name}" failed (${completedSteps}/${workflow.totalSteps} steps)`;
    }
  }

  private async requestUserConfirmation(step: VoiceWorkflowStep): Promise<boolean> {
    // In a real implementation, this would prompt the user
    // For now, we'll return true to continue
    console.log(`🔒 Requesting confirmation for step: ${step.voiceCommand.rawText}`);
    return true;
  }

  // Utility methods
  private generateCommandId(): string {
    return `voice_cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWorkflowId(): string {
    return `voice_workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters for monitoring
  public getActiveWorkflows(): MultiStepVoiceWorkflow[] {
    return Array.from(this.activeWorkflows.values());
  }

  public getVoiceProcessingHistory(limit?: number): VoiceCommand[] {
    if (limit) {
      return this.voiceProcessingHistory.slice(-limit);
    }
    return [...this.voiceProcessingHistory];
  }

  public getVoiceToCardMappings(): VoiceToCardMapping[] {
    return Array.from(this.voiceToCardMappings.values());
  }

  public cancelWorkflow(workflowId: string): boolean {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.status = 'cancelled';
      workflow.completedAt = new Date();
      return true;
    }
    return false;
  }

  public shutdown(): void {
    // Cancel all active workflows
    for (const workflow of this.activeWorkflows.values()) {
      workflow.status = 'cancelled';
      workflow.completedAt = new Date();
    }

    this.activeWorkflows.clear();
    this.voiceProcessingHistory = [];
    this.safetyValidationCache.clear();

    this.removeAllListeners();

    console.log('VoiceToReflexCardService shutdown complete');
  }
}

// Export singleton instance
export const voiceToReflexCardService = VoiceToReflexCardService.getInstance();
export default voiceToReflexCardService;