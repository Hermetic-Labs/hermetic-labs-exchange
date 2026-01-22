/**
 * IoT Workflow Execution Engine
 * 
 * Connects visual workflows from GraphEditor to IoT framework backend.
 * Parses visual workflow JSON, compiles to executable IoT operations, executes with safety validation,
 * and provides real-time feedback for both medical and personal IoT device workflows.
 * 
 * INTEGRATION WITH ACTION LANGUAGE SERVICE:
 * - Uses ActionLanguageService.parseAction() to process node configurations
 * - Validates actions against available verbs and nouns for each device category
 * - Generates ActionLanguage DSL for workflow nodes
 * - Creates ReflexCards from actions using actionToReflexCard()
 * - Maps verbs to IoT operations (e.g., 'read temperature', 'monitor vitals', 'notify alert')
 * - Supports medical/personal/general modes based on device category
 * 
 * USAGE EXAMPLE:
 * ```typescript
 * const engine = new IoTWorkflowEngine(siEngine, templateEngine, actionLanguageService);
 * 
 * // Parse workflow with ActionLanguage validation
 * const workflow = engine.parseVisualWorkflow(workflowJson);
 * 
 * // Get available verbs for medical devices
 * const medicalVerbs = engine.getAvailableVerbsForDeviceCategory('medical');
 * // ['read', 'write', 'render', 'monitor', 'notify', 'get', 'call']
 * 
 * // Generate ActionLanguage DSL
 * const dsl = engine.generateWorkflowDSL(workflow);
 * // "read vital where patient=123 with precision=high"
 * 
 * // Validate workflow constraints
 * const validation = await engine.validateWorkflowConstraints(workflow);
 * ```
 */

import { EventEmitter } from './EventEmitter';
import { SIEngineService } from '@/services/SIEngineService';
import { IoTTemplateEngine } from './IoTTemplateEngine';
import { deviceSafetyManager, SafetyContext, SafetyCheckResult } from './DeviceSafety';
import { DeviceControlRequest, DeviceCategory } from './IoTDeviceAdapter';
import { actionLanguageService } from '@/services/ActionLanguageService';
import { ReflexCard } from '@/types';

// Visual Workflow Types
export interface VisualWorkflowNode {
  id: number;
  type: string;
  x: number;
  y: number;
  data: {
    name: string;
    method: string;
    endpoint?: string;
    deviceId?: string;
    capability?: string;
    parameters?: Record<string, any>;
    // ActionLanguage integration properties
    action?: string; // Raw action string (e.g., "read temperature where device=thermo1")
    actionLanguage?: string; // Generated DSL
    reflexCard?: ReflexCard; // Generated ReflexCard
    iotVerbMapping?: {
      capability: string;
      parameters: Record<string, any>;
      description: string;
    };
    [key: string]: any;
  };
  inputs: Array<{
    x: number;
    y: number;
    connected: boolean;
    connection: any;
  }>;
  outputs: Array<{
    x: number;
    y: number;
    connected: boolean;
    connection: any;
  }>;
  executionState: string | null;
}

export interface VisualWorkflowConnection {
  from: { node: VisualWorkflowNode; pinIndex: number };
  to: { node: VisualWorkflowNode; pinIndex: number };
  path: string;
}

export interface VisualWorkflow {
  nodes: VisualWorkflowNode[];
  connections: VisualWorkflowConnection[];
  metadata: {
    name: string;
    description: string;
    version: string;
    createdAt: Date;
    deviceCategory: DeviceCategory;
    safetyLevel: 'low' | 'medium' | 'high' | 'critical';
    complexity_score?: number;
  };
}

// Compiled Workflow Types
export interface CompiledWorkflow {
  id: string;
  name: string;
  originalWorkflow: VisualWorkflow;
  executionPlan: ExecutionStep[];
  compiledAt: Date;
  compilationWarnings: string[];
  safetyValidated: boolean;
  estimatedDuration: number;
}

export interface ExecutionStep {
  id: string;
  nodeId: number;
  nodeType: string;
  deviceOperations: DeviceOperationSequence[];
  dependencies: string[]; // IDs of steps this depends on
  parallelGroup?: string; // For steps that can run in parallel
  safetyChecks: string[];
  rollbackPlan?: RollbackStep[];
}

export interface DeviceOperationSequence {
  deviceId: string;
  deviceCategory: DeviceCategory;
  operations: DeviceOperation[];
  safetyContext: SafetyContext;
  timeout: number;
  retryCount: number;
}

export interface DeviceOperation {
  sequence: number;
  capability: string;
  parameters: Record<string, any>;
  expectedResult?: any;
  validationRules?: string[];
  templateId?: string;
}

export interface RollbackStep {
  sequence: number;
  operation: DeviceOperation;
  condition: string; // When to execute this rollback
}

// Execution Types
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  currentStep?: string;
  progress: number; // 0-100
  steps: StepExecution[];
  results: WorkflowResult[];
  error?: ExecutionError;
  userContext?: UserContext;
}

export interface StepExecution {
  id: string;
  stepId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  deviceOperations: DeviceOperationExecution[];
  safetyResults: SafetyCheckResult[];
  error?: ExecutionError;
}

export interface DeviceOperationExecution {
  sequence: number;
  deviceId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'cancelled';
  result?: any;
  error?: string;
  safetyViolations: string[];
  retryAttempt: number;
}

export interface WorkflowResult {
  nodeId: number;
  result: any;
  timestamp: Date;
  deviceId?: string;
  safetyCompliant: boolean;
}

export interface ExecutionError {
  code: string;
  message: string;
  stepId?: string;
  deviceId?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  suggestion?: string;
}

export interface UserContext {
  userId: string;
  permissions: string[];
  medicalContext?: {
    patientId?: string;
    procedureType?: string;
    urgencyLevel: 'routine' | 'urgent' | 'emergency';
    attendingPhysician?: string;
  };
  location?: string;
  emergencyMode?: boolean;
}

// Status and Monitoring Types
export interface WorkflowStatus {
  executionId: string;
  workflowId: string;
  status: WorkflowExecution['status'];
  progress: number;
  currentStep?: string;
  estimatedTimeRemaining: number; // seconds
  activeDevices: number;
  safetyScore: number; // 0-100
  lastUpdate: Date;
}

export interface RealTimeStatusUpdate {
  type: 'step_started' | 'step_completed' | 'device_connected' | 'safety_violation' | 'progress_update' | 'error';
  executionId: string;
  timestamp: Date;
  data: any;
}

export class IoTWorkflowEngine extends EventEmitter {
  private siEngine: SIEngineService;
  private templateEngine: IoTTemplateEngine;
  private actionLanguageService: typeof actionLanguageService;
  private compiledWorkflows: Map<string, CompiledWorkflow> = new Map();
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private executionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private deviceConnections: Map<string, any> = new Map();

  constructor(
    siEngine: SIEngineService,
    templateEngine: IoTTemplateEngine,
    actionLanguageServiceParam?: typeof actionLanguageService
  ) {
    super();
    this.siEngine = siEngine;
    this.templateEngine = templateEngine;
    this.actionLanguageService = actionLanguageServiceParam || actionLanguageService;

    // Set up event listeners for safety and template events
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for safety incidents from SI Engine
    this.siEngine.on('safetyIncident', (incident) => {
      this.handleSafetyIncident(incident);
    });

    // Listen for template compilation events
    this.templateEngine.on('template:compiled', (compiled) => {
      this.emit('templateCompiled', compiled);
    });

    // Listen for template execution events
    this.templateEngine.on('template:executed', (outcome) => {
      this.handleTemplateExecution(outcome);
    });
  }

  /**
   * Parse visual workflow JSON from GraphEditor
   */
  async parseVisualWorkflow(workflowJson: string): Promise<VisualWorkflow> {
    try {
      const parsed = JSON.parse(workflowJson);

      // Validate required structure
      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        throw new Error('Invalid workflow: nodes array is required');
      }

      if (!parsed.connections || !Array.isArray(parsed.connections)) {
        throw new Error('Invalid workflow: connections array is required');
      }

      if (!parsed.metadata) {
        throw new Error('Invalid workflow: metadata is required');
      }

      // Enhance workflow with validation and default values
      const enhancedWorkflow: VisualWorkflow = {
        nodes: parsed.nodes.map((node: VisualWorkflowNode) => this.enhanceNode(node, parsed.metadata.deviceCategory)),
        connections: parsed.connections,
        metadata: {
          name: parsed.metadata.name || 'Untitled Workflow',
          description: parsed.metadata.description || '',
          version: parsed.metadata.version || '1.0.0',
          createdAt: new Date(parsed.metadata.createdAt || Date.now()),
          deviceCategory: parsed.metadata.deviceCategory || 'personal',
          safetyLevel: parsed.metadata.safetyLevel || 'medium',
          complexity_score: this.calculateComplexityScore(parsed)
        }
      };

      // Validate workflow using ActionLanguageService
      await this.validateWorkflowWithActionLanguage(enhancedWorkflow);

      this.emit('workflowParsed', enhancedWorkflow);
      return enhancedWorkflow;

    } catch (error) {
      throw new Error(`Failed to parse visual workflow: ${(error as Error).message}`);
    }
  }

  /**
   * Compile workflow into executable IoT operations using Template Engine
   */
  async compileWorkflow(workflow: VisualWorkflow): Promise<CompiledWorkflow> {
    const compilationId = `compile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.emit('compilationStarted', { id: compilationId, workflow: workflow.metadata.name });

      // Parse workflow to execution plan
      const executionPlan = await this.parseWorkflowToExecutionPlan(workflow);

      // Compile each execution step
      const compiledSteps: ExecutionStep[] = [];
      const compilationWarnings: string[] = [];

      for (const step of executionPlan) {
        try {
          const compiledStep = await this.compileExecutionStep(step, workflow.metadata);
          compiledSteps.push(compiledStep);
        } catch (error) {
          compilationWarnings.push(`Failed to compile step ${step.nodeId}: ${(error as Error).message}`);
        }
      }

      // Validate compilation results
      if (compiledSteps.length === 0) {
        throw new Error('No steps could be compiled successfully');
      }

      // Calculate estimated duration
      const estimatedDuration = this.calculateEstimatedDuration(compiledSteps);

      // Create compiled workflow
      const compiledWorkflow: CompiledWorkflow = {
        id: `workflow_${Date.now()}`,
        name: workflow.metadata.name,
        originalWorkflow: workflow,
        executionPlan: compiledSteps,
        compiledAt: new Date(),
        compilationWarnings,
        safetyValidated: true, // Will be set based on actual safety validation
        estimatedDuration
      };

      // Store compiled workflow
      this.compiledWorkflows.set(compiledWorkflow.id, compiledWorkflow);

      this.emit('compilationCompleted', {
        id: compilationId,
        compiledWorkflow,
        warnings: compilationWarnings
      });

      return compiledWorkflow;

    } catch (error) {
      this.emit('compilationFailed', { id: compilationId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Execute compiled workflow with real-time status feedback
   */
  async executeWorkflow(
    compiledWorkflow: CompiledWorkflow,
    userContext: UserContext,
    options?: {
      timeout?: number;
      parallelExecution?: boolean;
      skipSafetyChecks?: boolean;
      startFromStep?: string;
    }
  ): Promise<WorkflowExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create workflow execution context
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: compiledWorkflow.id,
      startTime: new Date(),
      status: 'running',
      progress: 0,
      steps: compiledWorkflow.executionPlan.map(step => ({
        id: step.id,
        stepId: step.id,
        startTime: new Date(),
        status: 'pending',
        deviceOperations: step.deviceOperations.flatMap(seq =>
          seq.operations.map(op => ({
            sequence: op.sequence,
            deviceId: seq.deviceId,
            startTime: new Date(),
            status: 'pending',
            safetyViolations: [],
            retryAttempt: 0
          }))
        ),
        safetyResults: [],
        error: undefined
      })),
      results: [],
      userContext
    };

    // Store execution context
    this.activeExecutions.set(executionId, execution);

    // Set execution timeout
    const timeoutMs = options?.timeout || (compiledWorkflow.estimatedDuration * 1000 * 2);
    const timeoutHandle = setTimeout(() => {
      this.handleExecutionTimeout(executionId);
    }, timeoutMs);
    this.executionTimeouts.set(executionId, timeoutHandle);

    try {
      this.emit('executionStarted', { executionId, workflowId: compiledWorkflow.id });

      // Execute workflow steps
      await this.executeWorkflowSteps(execution, compiledWorkflow, options);

      // Update final status
      execution.endTime = new Date();
      execution.status = 'completed';
      execution.progress = 100;

      this.emit('executionCompleted', {
        executionId,
        results: execution.results,
        duration: execution.endTime.getTime() - execution.startTime.getTime()
      });

    } catch (error) {
      execution.endTime = new Date();
      execution.status = 'failed';
      execution.error = {
        code: 'EXECUTION_FAILED',
        message: (error as Error).message,
        timestamp: new Date(),
        severity: 'critical',
        recoverable: false
      };

      this.emit('executionFailed', {
        executionId,
        error: execution.error
      });

      // Attempt rollback if needed
      await this.attemptRollback(execution, compiledWorkflow);
    }

    // Clean up timeout
    const timeout = this.executionTimeouts.get(executionId);
    if (timeout) {
      clearTimeout(timeout);
      this.executionTimeouts.delete(executionId);
    }

    return execution;
  }

  /**
   * Get real-time status of workflow execution
   */
  getExecutionStatus(executionId: string): WorkflowStatus | null {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return null;

    const completedSteps = execution.steps.filter(s => s.status === 'completed').length;
    const totalSteps = execution.steps.length;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    const currentStep = execution.steps.find(s => s.status === 'running');
    const activeDevices = execution.steps
      .filter(s => s.deviceOperations.some(op => op.status === 'running'))
      .reduce((sum, s) => sum + s.deviceOperations.filter(op => op.status === 'running').length, 0);

    // Calculate estimated time remaining
    const elapsedTime = Date.now() - execution.startTime.getTime();
    const estimatedTotalTime = elapsedTime / (progress / 100);
    const timeRemaining = Math.max(0, estimatedTotalTime - elapsedTime) / 1000;

    // Calculate safety score based on violations
    const safetyViolations = execution.steps
      .reduce((sum, step) => sum + step.safetyResults.reduce((vSum, result) =>
        vSum + result.violations.length, 0), 0);
    const safetyScore = Math.max(0, 100 - (safetyViolations * 10));

    return {
      executionId,
      workflowId: execution.workflowId,
      status: execution.status,
      progress,
      currentStep: currentStep?.stepId,
      estimatedTimeRemaining: timeRemaining,
      activeDevices,
      safetyScore,
      lastUpdate: new Date()
    };
  }

  /**
   * Cancel running workflow execution
   */
  async cancelExecution(executionId: string, reason?: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== 'running') {
      throw new Error(`Cannot cancel execution with status: ${execution.status}`);
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();

    // Stop all active operations
    await this.stopActiveOperations(execution);

    // Clean up resources
    await this.cleanupExecution(executionId);

    this.emit('executionCancelled', {
      executionId,
      reason: reason || 'User requested cancellation',
      partialResults: execution.results
    });
  }

  /**
   * Get workflow execution history
   */
  getExecutionHistory(limit: number = 10): WorkflowExecution[] {
    const allExecutions = Array.from(this.activeExecutions.values());
    return allExecutions
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  // Private helper methods

  private enhanceNode(node: any, deviceCategory: DeviceCategory): VisualWorkflowNode {
    const enhanced = {
      ...node,
      data: {
        name: node.data?.name || 'Unknown Node',
        method: node.data?.method || 'UNKNOWN',
        ...node.data
      },
      executionState: node.executionState || null
    };

    // Process node configuration using ActionLanguageService
    if (node.data?.action) {
      try {
        // Parse action using ActionLanguageService
        const action = this.actionLanguageService.parseAction(node.data.action);

        // Set mode based on device category
        const mode = this.getModeFromDeviceCategory(deviceCategory);
        this.actionLanguageService.setMode(mode);

        // Validate action against available verbs and nouns
        const validation = this.validateNodeAction(action, deviceCategory);
        if (!validation.valid) {
          console.warn(`Node ${node.id} has invalid action: ${validation.errors.join(', ')}`);
        }

        // Generate ActionLanguage DSL and add to node data
        enhanced.data.actionLanguage = this.generateActionLanguageDSL(action, deviceCategory);
        enhanced.data.reflexCard = this.createReflexCardFromAction(action, deviceCategory);
        enhanced.data.iotVerbMapping = this.mapVerbToIoTOperation(action, deviceCategory);

      } catch (error) {
        console.warn(`Failed to process action for node ${node.id}:`, error);
      }
    }

    return enhanced;
  }

  private calculateComplexityScore(workflow: any): number {
    const nodeCount = workflow.nodes?.length || 0;
    const connectionCount = workflow.connections?.length || 0;
    const deviceNodes = workflow.nodes?.filter((n: any) =>
      n.data?.deviceId || n.type === 'device'
    ).length || 0;

    // Simple complexity calculation
    return Math.min(100, (nodeCount * 2) + connectionCount + (deviceNodes * 3));
  }

  private async parseWorkflowToExecutionPlan(workflow: VisualWorkflow): Promise<ExecutionStep[]> {
    const steps: ExecutionStep[] = [];

    for (const node of workflow.nodes) {
      const step = await this.nodeToExecutionStep(node, workflow);
      steps.push(step);
    }

    // Establish dependencies based on connections
    this.establishStepDependencies(steps, workflow.connections);

    return steps;
  }

  private async nodeToExecutionStep(node: VisualWorkflowNode, workflow: VisualWorkflow): Promise<ExecutionStep> {
    const deviceOperations: DeviceOperationSequence[] = [];

    // Determine if this node requires device operations
    if (node.type === 'api' && node.data.endpoint && node.data.deviceId) {
      const sequence = await this.createDeviceOperationSequence(node, workflow.metadata.deviceCategory);
      deviceOperations.push(sequence);
    }

    return {
      id: `step_${node.id}`,
      nodeId: node.id,
      nodeType: node.type,
      deviceOperations,
      dependencies: [],
      safetyChecks: this.getNodeSafetyChecks(node),
      rollbackPlan: this.createRollbackPlan(node)
    };
  }

  private async createDeviceOperationSequence(
    node: VisualWorkflowNode,
    deviceCategory: DeviceCategory
  ): Promise<DeviceOperationSequence> {
    // Create safety context based on device category and workflow metadata
    const safetyContext: SafetyContext = {
      deviceCategory,
      userPermissions: ['device_control'], // Will be updated from actual user context
      operationRisk: deviceCategory === 'medical' ? 'high' : 'medium'
    };

    // Get or create device operations for this node
    const operations: DeviceOperation[] = [];

    // Use ActionLanguage mappings if available
    if (node.data.iotVerbMapping) {
      const mapping = node.data.iotVerbMapping;
      operations.push({
        sequence: 1,
        capability: mapping.capability,
        parameters: {
          ...mapping.parameters,
          ...node.data.parameters,
          actionLanguage: node.data.actionLanguage,
          verb: node.data.actionLanguage?.split(' ')[0],
          noun: node.data.actionLanguage?.split(' ')[1]
        },
        expectedResult: node.data.expectedResult,
        validationRules: [`validate_${mapping.capability}`]
      });
    } else if (node.data.capability && node.data.parameters) {
      // Fallback to direct capability specification
      operations.push({
        sequence: 1,
        capability: node.data.capability,
        parameters: node.data.parameters,
        expectedResult: node.data.expectedResult
      });
    } else if (node.data.action) {
      // Parse action and create operation from it
      try {
        const action = this.actionLanguageService.parseAction(node.data.action);
        const validation = this.validateNodeAction(action, deviceCategory);

        if (validation.valid) {
          const mapping = this.mapVerbToIoTOperation(action, deviceCategory);
          operations.push({
            sequence: 1,
            capability: mapping.capability,
            parameters: {
              ...mapping.parameters,
              ...node.data.parameters,
              actionLanguage: node.data.action,
              originalAction: action
            },
            expectedResult: node.data.expectedResult
          });
        }
      } catch (error) {
        console.warn(`Failed to create device operation from action for node ${node.id}:`, error);
      }
    }

    return {
      deviceId: node.data.deviceId!,
      deviceCategory,
      operations,
      safetyContext,
      timeout: this.getTimeoutForDeviceCategory(deviceCategory),
      retryCount: deviceCategory === 'medical' ? 1 : 3
    };
  }

  private getNodeSafetyChecks(node: VisualWorkflowNode): string[] {
    const checks: string[] = ['parameter_validation', 'device_state'];

    if (node.data.deviceId) {
      checks.push('access_control');
    }

    if (node.type === 'api') {
      checks.push('network_security');
    }

    return checks;
  }

  private createRollbackPlan(node: VisualWorkflowNode): RollbackStep[] {
    const rollbackSteps: RollbackStep[] = [];

    if (node.type === 'api' && node.data.parameters) {
      // Add basic rollback for parameter changes
      rollbackSteps.push({
        sequence: 1,
        operation: {
          sequence: 1,
          capability: 'reset_parameters',
          parameters: { original: node.data.parameters }
        },
        condition: 'on_error'
      });
    }

    return rollbackSteps;
  }

  private establishStepDependencies(steps: ExecutionStep[], connections: VisualWorkflowConnection[]): void {
    for (const connection of connections) {
      const fromStep = steps.find(s => s.nodeId === connection.from.node.id);
      const toStep = steps.find(s => s.nodeId === connection.to.node.id);

      if (fromStep && toStep) {
        toStep.dependencies.push(fromStep.id);
      }
    }
  }

  private async compileExecutionStep(step: ExecutionStep, metadata: VisualWorkflow['metadata']): Promise<ExecutionStep> {
    const compiledStep = { ...step };

    // Compile device operations using template engine
    for (const sequence of compiledStep.deviceOperations) {
      for (const operation of sequence.operations) {
        if (operation.templateId) {
          try {
            const compiled = await this.templateEngine.compileTemplate(
              operation.templateId,
              operation.parameters,
              { deviceId: sequence.deviceId, category: sequence.deviceCategory }
            );

            if (compiled.errors.length === 0) {
              operation.parameters = { ...operation.parameters, _compiled: compiled.code };
            }
          } catch (error) {
            console.warn(`Failed to compile template ${operation.templateId}:`, error);
          }
        }
      }
    }

    return compiledStep;
  }

  private calculateEstimatedDuration(steps: ExecutionStep[]): number {
    // Simple estimation: 2 seconds per step + device operation time
    let totalTime = steps.length * 2000; // Base time

    for (const step of steps) {
      totalTime += step.deviceOperations.length * 1000; // Device operation time
    }

    return totalTime;
  }

  private async executeWorkflowSteps(
    execution: WorkflowExecution,
    compiledWorkflow: CompiledWorkflow,
    options?: any
  ): Promise<void> {
    const _stepsById = new Map(compiledWorkflow.executionPlan.map(step => [step.id, step]));
    const completedSteps = new Set<string>();

    // Execute steps in dependency order
    for (const step of compiledWorkflow.executionPlan) {
      // Check if all dependencies are completed
      if (!step.dependencies.every(dep => completedSteps.has(dep))) {
        continue;
      }

      // Execute step
      await this.executeStep(execution, step, options);
      completedSteps.add(step.id);

      // Update progress
      const completedCount = completedSteps.size;
      const totalSteps = compiledWorkflow.executionPlan.length;
      execution.progress = (completedCount / totalSteps) * 100;

      // Emit progress update
      this.emit('progressUpdate', {
        executionId: execution.id,
        progress: execution.progress,
        currentStep: step.id
      });
    }

    // Handle any remaining steps that might be independent
    for (const step of compiledWorkflow.executionPlan) {
      if (!completedSteps.has(step.id)) {
        await this.executeStep(execution, step, options);
        completedSteps.add(step.id);
        execution.progress = (completedSteps.size / compiledWorkflow.executionPlan.length) * 100;
      }
    }
  }

  private async executeStep(
    execution: WorkflowExecution,
    step: ExecutionStep,
    options?: any
  ): Promise<void> {
    const stepExecution = execution.steps.find(s => s.stepId === step.id);
    if (!stepExecution) return;

    stepExecution.status = 'running';
    stepExecution.startTime = new Date();

    this.emit('stepStarted', {
      executionId: execution.id,
      stepId: step.id,
      nodeId: step.nodeId
    });

    try {
      // Execute device operations for this step
      for (const sequence of step.deviceOperations) {
        await this.executeDeviceOperationSequence(
          execution,
          stepExecution,
          sequence,
          options
        );
      }

      stepExecution.status = 'completed';
      stepExecution.endTime = new Date();

      this.emit('stepCompleted', {
        executionId: execution.id,
        stepId: step.id,
        duration: stepExecution.endTime.getTime() - stepExecution.startTime.getTime()
      });

    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.error = {
        code: 'STEP_EXECUTION_FAILED',
        message: (error as Error).message,
        stepId: step.id,
        timestamp: new Date(),
        severity: 'high',
        recoverable: true
      };

      this.emit('stepFailed', {
        executionId: execution.id,
        stepId: step.id,
        error: stepExecution.error
      });

      throw error;
    }
  }

  private async executeDeviceOperationSequence(
    execution: WorkflowExecution,
    stepExecution: StepExecution,
    sequence: DeviceOperationSequence,
    options?: any
  ): Promise<void> {
    for (const operation of sequence.operations) {
      await this.executeDeviceOperation(
        execution,
        stepExecution,
        sequence,
        operation,
        options
      );
    }
  }

  private async executeDeviceOperation(
    execution: WorkflowExecution,
    stepExecution: StepExecution,
    sequence: DeviceOperationSequence,
    operation: DeviceOperation,
    options?: any
  ): Promise<void> {
    const operationExecution = stepExecution.deviceOperations.find(
      op => op.sequence === operation.sequence && op.deviceId === sequence.deviceId
    );
    if (!operationExecution) return;

    operationExecution.status = 'running';
    operationExecution.startTime = new Date();

    try {
      // Run safety checks before execution
      if (!options?.skipSafetyChecks) {
        const safetyResult = await this.runSafetyChecks(
          operation,
          sequence,
          execution.userContext!
        );
        stepExecution.safetyResults.push(safetyResult);

        if (!safetyResult.passed && safetyResult.violations.some(v => v.severity === 'critical')) {
          throw new Error('Critical safety violations detected');
        }

        operationExecution.safetyViolations = safetyResult.violations.map(v => v.message);
      }

      // Execute the actual device operation with ActionLanguage context
      const deviceOperation = {
        deviceId: sequence.deviceId,
        operation: 'execute' as const,
        command: {
          capability: operation.capability,
          parameters: operation.parameters,
          priority: 'normal' as const,
          // Add ActionLanguage context if available
          actionLanguageContext: operation.parameters.actionLanguage ? {
            dsl: operation.parameters.actionLanguage,
            verb: operation.parameters.verb,
            noun: operation.parameters.noun,
            reflexCard: operation.parameters.reflexCard
          } : undefined
        },
        timeout: sequence.timeout,
        safetyCheck: true,
        expectedResult: operation.expectedResult
      };

      const result = await this.siEngine.executeDeviceOperation(deviceOperation);

      operationExecution.status = 'completed';
      operationExecution.endTime = new Date();
      operationExecution.result = result;

      // Record result for workflow
      const workflowResult: WorkflowResult = {
        nodeId: stepExecution.stepId as any,
        result: result.result,
        timestamp: new Date(),
        deviceId: sequence.deviceId,
        safetyCompliant: result.metrics.safetyCompliant
      };
      execution.results.push(workflowResult);

      this.emit('deviceOperationCompleted', {
        executionId: execution.id,
        deviceId: sequence.deviceId,
        operation: operation.capability,
        result: result.result
      });

    } catch (error) {
      operationExecution.status = 'failed';
      operationExecution.error = (error as Error).message;
      operationExecution.endTime = new Date();

      // Attempt retry if allowed
      if (operationExecution.retryAttempt < sequence.retryCount) {
        operationExecution.retryAttempt++;
        operationExecution.status = 'retrying';

        await new Promise(resolve => setTimeout(resolve, 1000 * operationExecution.retryAttempt));
        return this.executeDeviceOperation(
          execution,
          stepExecution,
          sequence,
          operation,
          options
        );
      }

      throw error;
    }
  }

  private async runSafetyChecks(
    operation: DeviceOperation,
    sequence: DeviceOperationSequence,
    userContext: UserContext
  ): Promise<SafetyCheckResult> {
    // Create device control request for safety validation
    const request: DeviceControlRequest = {
      deviceId: sequence.deviceId,
      capability: operation.capability,
      parameters: operation.parameters,
      timeout: sequence.timeout,
      priority: 'normal',
      userContext
    };

    // Run safety checks using DeviceSafetyManager
    return await deviceSafetyManager.validateOperation(request, sequence.safetyContext);
  }

  private getTimeoutForDeviceCategory(category: DeviceCategory): number {
    switch (category) {
      case 'medical': return 10000; // 10 seconds
      case 'personal': return 5000;  // 5 seconds
      default: return 5000;
    }
  }

  private async stopActiveOperations(execution: WorkflowExecution): Promise<void> {
    // Stop all active device operations
    for (const step of execution.steps) {
      for (const operation of step.deviceOperations) {
        if (operation.status === 'running' || operation.status === 'retrying') {
          // In a real implementation, this would send stop commands to devices
          operation.status = 'cancelled';
        }
      }
    }
  }

  private async cleanupExecution(executionId: string): Promise<void> {
    this.activeExecutions.delete(executionId);

    const timeout = this.executionTimeouts.get(executionId);
    if (timeout) {
      clearTimeout(timeout);
      this.executionTimeouts.delete(executionId);
    }
  }

  private handleExecutionTimeout(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = new Date();
    execution.error = {
      code: 'EXECUTION_TIMEOUT',
      message: 'Workflow execution timed out',
      timestamp: new Date(),
      severity: 'high',
      recoverable: false
    };

    this.emit('executionFailed', {
      executionId,
      error: execution.error
    });

    this.cleanupExecution(executionId);
  }

  private async attemptRollback(execution: WorkflowExecution, compiledWorkflow: CompiledWorkflow): Promise<void> {
    // Implement rollback logic for failed workflows
    // This is a simplified version - real implementation would be more sophisticated

    const failedSteps = execution.steps.filter(s => s.status === 'failed');

    for (const step of failedSteps) {
      if (step.stepId) {
        const compiledStep = compiledWorkflow.executionPlan.find(s => s.id === step.stepId);
        if (compiledStep?.rollbackPlan) {
          // Execute rollback operations
          for (const rollback of compiledStep.rollbackPlan) {
            try {
              await this.executeRollbackOperation(rollback, step);
            } catch (error) {
              console.warn('Rollback operation failed:', error);
            }
          }
        }
      }
    }
  }

  private async executeRollbackOperation(rollback: RollbackStep, stepExecution: StepExecution): Promise<void> {
    // Execute rollback operation
    // This is a simplified implementation
    console.log(`Executing rollback operation: ${rollback.operation.capability}`);
  }

  private handleSafetyIncident(incident: any): void {
    // Handle safety incidents from SI Engine
    this.emit('safetyIncident', incident);

    // Find affected executions and update status
    for (const [executionId, execution] of this.activeExecutions) {
      const affectedSteps = execution.steps.filter(step =>
        step.deviceOperations.some(op =>
          this.deviceConnections.get(op.deviceId)?.id === incident.deviceId
        )
      );

      if (affectedSteps.length > 0) {
        this.emit('executionAffectedBySafetyIncident', {
          executionId,
          incident,
          affectedSteps: affectedSteps.map(s => s.stepId)
        });
      }
    }
  }

  private handleTemplateExecution(outcome: any): void {
    // Handle template execution outcomes
    this.emit('templateExecution', outcome);
  }

  private async validateWorkflowWithActionLanguage(workflow: VisualWorkflow): Promise<void> {
    const mode = this.getModeFromDeviceCategory(workflow.metadata.deviceCategory);
    this.actionLanguageService.setMode(mode);

    for (const node of workflow.nodes) {
      if (node.data?.action) {
        try {
          const action = this.actionLanguageService.parseAction(node.data.action);
          const validation = this.validateNodeAction(action, workflow.metadata.deviceCategory);

          if (!validation.valid) {
            throw new Error(`Validation failed for node ${node.id}: ${validation.errors.join(', ')}`);
          }
        } catch (error) {
          console.warn(`Action validation failed for node ${node.id}:`, (error as Error).message);
        }
      }
    }
  }

  private getModeFromDeviceCategory(deviceCategory: DeviceCategory): 'medical' | 'vrf' | 'general' {
    switch (deviceCategory) {
      case 'medical':
        return 'medical';
      case 'personal':
        return 'general';
      case 'infrastructure':
        return 'general';
      case 'sensor':
        return 'general';
      default:
        return 'general';
    }
  }

  private validateNodeAction(action: any, deviceCategory: DeviceCategory): { valid: boolean; errors: string[] } {
    const mode = this.getModeFromDeviceCategory(deviceCategory);
    this.actionLanguageService.setMode(mode);

    const errors: string[] = [];
    const availableVerbs = this.actionLanguageService.getAvailableVerbs();

    if (!action.verb || !availableVerbs.includes(action.verb)) {
      errors.push(`Invalid or missing verb: ${action.verb}`);
    }

    if (action.verb) {
      const availableNouns = this.actionLanguageService.getAvailableNouns(action.verb);
      if (action.noun && availableNouns.length > 0 && !availableNouns.includes(action.noun)) {
        errors.push(`Noun '${action.noun}' not available for verb '${action.verb}' in ${mode} mode`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private generateActionLanguageDSL(action: any, deviceCategory: DeviceCategory): string {
    let dsl = `${action.verb} ${action.noun}`;

    if (action.where) {
      if (typeof action.where === 'object') {
        const whereStr = Object.entries(action.where)
          .map(([k, v]) => `${k}=${v}`)
          .join(',');
        dsl += ` where ${whereStr}`;
      } else {
        dsl += ` where ${action.where}`;
      }
    }

    if (action.with) {
      dsl += ` with ${JSON.stringify(action.with)}`;
    }

    if (action.as) {
      dsl += ` as ${action.as}`;
    }

    if (action.if) {
      dsl += ` if ${action.if}`;
    }

    if (action.until) {
      dsl += ` until ${action.until}`;
    }

    return dsl;
  }

  private async createReflexCardFromAction(action: any, deviceCategory: DeviceCategory): Promise<ReflexCard> {
    const mode = this.getModeFromDeviceCategory(deviceCategory);
    this.actionLanguageService.setMode(mode);

    return await this.actionLanguageService.actionToReflexCard(action);
  }

  private mapVerbToIoTOperation(action: any, deviceCategory: DeviceCategory): any {
    const mode = this.getModeFromDeviceCategory(deviceCategory);
    this.actionLanguageService.setMode(mode);

    // Map ActionLanguage verbs to IoT operations based on device category
    const verbMappings = {
      medical: {
        'read': {
          capability: 'read_sensor',
          parameters: { sensor_type: 'vital' },
          description: 'Read medical vital signs or device data'
        },
        'monitor': {
          capability: 'continuous_monitoring',
          parameters: { monitoring_type: 'vital' },
          description: 'Monitor vital signs continuously'
        },
        'notify': {
          capability: 'send_notification',
          parameters: { priority: 'medical' },
          description: 'Send medical alerts and notifications'
        },
        'get': {
          capability: 'retrieve_data',
          parameters: { data_type: 'medical_record' },
          description: 'Retrieve medical records or device data'
        },
        'write': {
          capability: 'update_record',
          parameters: { record_type: 'medical' },
          description: 'Write to medical records'
        }
      },
      personal: {
        'read': {
          capability: 'read_sensor',
          parameters: { sensor_type: 'environmental' },
          description: 'Read personal device sensors'
        },
        'monitor': {
          capability: 'continuous_monitoring',
          parameters: { monitoring_type: 'personal' },
          description: 'Monitor personal device status'
        },
        'notify': {
          capability: 'send_notification',
          parameters: { priority: 'normal' },
          description: 'Send personal notifications'
        },
        'get': {
          capability: 'retrieve_data',
          parameters: { data_type: 'personal_data' },
          description: 'Retrieve personal device data'
        },
        'call': {
          capability: 'initiate_call',
          parameters: { call_type: 'personal' },
          description: 'Make personal communications'
        }
      },
      general: {
        'read': {
          capability: 'read_data',
          parameters: { data_type: 'generic' },
          description: 'Read general device data'
        },
        'write': {
          capability: 'write_data',
          parameters: { data_type: 'generic' },
          description: 'Write general device data'
        },
        'get': {
          capability: 'retrieve_resource',
          parameters: { resource_type: 'generic' },
          description: 'Retrieve generic resources'
        },
        'call': {
          capability: 'api_call',
          parameters: { call_type: 'general' },
          description: 'Make general API calls'
        },
        'move': {
          capability: 'transfer_data',
          parameters: { transfer_type: 'generic' },
          description: 'Move or transfer data'
        }
      }
    };

    const modeMappings = verbMappings[mode as keyof typeof verbMappings] || verbMappings.general;
    return modeMappings[action.verb as keyof typeof modeMappings] || {
      capability: `${action.verb}_${action.noun}`,
      parameters: { generic: true },
      description: `Generic ${action.verb} operation for ${action.noun}`
    };
  }

  /**
   * Get available verbs for a specific device category
   */
  getAvailableVerbsForDeviceCategory(deviceCategory: DeviceCategory): string[] {
    const mode = this.getModeFromDeviceCategory(deviceCategory);
    this.actionLanguageService.setMode(mode);
    return this.actionLanguageService.getAvailableVerbs();
  }

  /**
   * Get available nouns for a specific verb and device category
   */
  getAvailableNounsForDeviceCategory(deviceCategory: DeviceCategory, verb: string): string[] {
    const mode = this.getModeFromDeviceCategory(deviceCategory);
    this.actionLanguageService.setMode(mode);
    return this.actionLanguageService.getAvailableNouns(verb);
  }

  /**
   * Convert a workflow node to a ReflexCard
   */
  async nodeToReflexCard(node: VisualWorkflowNode, deviceCategory: DeviceCategory): Promise<ReflexCard | null> {
    if (!node.data?.action) {
      return null;
    }

    try {
      const action = this.actionLanguageService.parseAction(node.data.action);
      const validation = this.validateNodeAction(action, deviceCategory);

      if (!validation.valid) {
        throw new Error(`Invalid action for ReflexCard conversion: ${validation.errors.join(', ')}`);
      }

      return await this.createReflexCardFromAction(action, deviceCategory);
    } catch (error) {
      console.warn(`Failed to convert node ${node.id} to ReflexCard:`, error);
      return null;
    }
  }

  /**
   * Generate ActionLanguage DSL for a workflow
   */
  generateWorkflowDSL(workflow: VisualWorkflow): string {
    const dslStatements: string[] = [];

    for (const node of workflow.nodes) {
      if (node.data?.actionLanguage) {
        dslStatements.push(`# Node ${node.id}: ${node.data.name}`);
        dslStatements.push(node.data.actionLanguage);

        if (node.data.parameters) {
          dslStatements.push(`# Parameters: ${JSON.stringify(node.data.parameters)}`);
        }
        dslStatements.push(''); // Empty line for readability
      }
    }

    return dslStatements.join('\n');
  }

  /**
   * Validate entire workflow against ActionLanguage constraints
   */
  async validateWorkflowConstraints(workflow: VisualWorkflow): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    summary: {
      totalNodes: number;
      validNodes: number;
      invalidNodes: number;
      medicalNodes: number;
      personalNodes: number;
      generalNodes: number;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let validNodes = 0;
    let medicalNodes = 0;
    let personalNodes = 0;
    let generalNodes = 0;

    for (const node of workflow.nodes) {
      const deviceCategory = workflow.metadata.deviceCategory;

      // Count nodes by category
      if (deviceCategory === 'medical') medicalNodes++;
      else if (deviceCategory === 'personal') personalNodes++;
      else generalNodes++;

      if (node.data?.action) {
        try {
          const action = this.actionLanguageService.parseAction(node.data.action);
          const validation = this.validateNodeAction(action, deviceCategory);

          if (validation.valid) {
            validNodes++;
          } else {
            errors.push(`Node ${node.id} (${node.data.name}): ${validation.errors.join(', ')}`);
          }
        } catch (error) {
          errors.push(`Node ${node.id} (${node.data.name}): Failed to parse action - ${(error as Error).message}`);
        }
      } else {
        warnings.push(`Node ${node.id} (${node.data.name}): No action specified`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalNodes: workflow.nodes.length,
        validNodes,
        invalidNodes: workflow.nodes.length - validNodes,
        medicalNodes,
        personalNodes,
        generalNodes
      }
    };
  }

  /**
   * Get comprehensive status including all active executions
   */
  getSystemStatus(): {
    activeExecutions: number;
    compiledWorkflows: number;
    systemHealth: 'healthy' | 'degraded' | 'critical';
    recentErrors: number;
    safetyIncidents: number;
  } {
    const activeExecutions = this.activeExecutions.size;
    const compiledWorkflows = this.compiledWorkflows.size;
    const recentErrors = Array.from(this.activeExecutions.values())
      .filter(exec => exec.error &&
        Date.now() - exec.error.timestamp.getTime() < 3600000 // Last hour
      ).length;

    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (recentErrors > 5 || activeExecutions > 20) {
      systemHealth = 'critical';
    } else if (recentErrors > 0 || activeExecutions > 10) {
      systemHealth = 'degraded';
    }

    return {
      activeExecutions,
      compiledWorkflows,
      systemHealth,
      recentErrors,
      safetyIncidents: 0 // Would be tracked separately
    };
  }
}

export default IoTWorkflowEngine;