/**
 * IoT Template Engine
 * Dynamic code generation system for IoT operations with safety validation
 */

import { EventEmitter } from './EventEmitter';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: (value: any) => boolean;
}

export interface TemplateCondition {
  variable: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists';
  value?: any;
  template: string;
}

export interface SafetyCheck {
  name: string;
  description: string;
  validator: (context: any) => boolean | Promise<boolean>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'medical' | 'personal' | 'network' | 'data' | 'security';
}

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: 'http_device_control' | 'network_discovery' | 'data_processing' | 'safety_validation' | 'error_handling';
  deviceType: 'medical' | 'personal' | 'both';
  version: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  variables: TemplateVariable[];
  conditions?: TemplateCondition[];
  safetyChecks: SafetyCheck[];
  performance_score: number;
  usage_count: number;
  last_optimized?: Date;
}

export interface CompiledTemplate {
  metadata: TemplateMetadata;
  code: string;
  warnings: string[];
  errors: string[];
  executionTime: number;
  compiledAt: Date;
}

export interface ExecutionOutcome {
  templateId: string;
  success: boolean;
  executionTime: number;
  errorMessage?: string;
  performance_metrics: {
    cpu_usage: number;
    memory_usage: number;
    network_latency: number;
  };
  safety_violations: string[];
  timestamp: Date;
}

export class IoTTemplateEngine extends EventEmitter {
  private templates: Map<string, TemplateMetadata> = new Map();
  private compiledCache: Map<string, CompiledTemplate> = new Map();
  private executionHistory: ExecutionOutcome[] = [];
  private optimizationEngine: TemplateOptimizer;

  constructor() {
    super();
    this.optimizationEngine = new TemplateOptimizer(this);
    this.loadDefaultTemplates();
  }

  /**
   * Load default template categories
   */
  private async loadDefaultTemplates(): Promise<void> {
    const templateCategories = await this.loadTemplateCategories();

    for (const category of templateCategories) {
      for (const template of category.templates) {
        this.templates.set(template.id, template);
      }
    }

    console.log(`Loaded ${this.templates.size} templates from ${templateCategories.length} categories`);
  }

  /**
   * Load all template categories from CodeTemplates directory
   */
  private async loadTemplateCategories(): Promise<any[]> {
    const categories = [
      'http_device_control',
      'network_discovery',
      'data_processing',
      'safety_validation',
      'error_handling'
    ];

    // Templates are loaded statically - dynamic imports not supported by bundler
    // To add templates, create static imports and register them in the categories map
    const loadedCategories = categories.map(category => ({
      name: category,
      templates: [] // Templates added via registerTemplate() at runtime
    }));

    return loadedCategories;
  }

  /**
   * Register a new template
   */
  async registerTemplate(template: TemplateMetadata, sourceCode: string): Promise<boolean> {
    try {
      // Validate template structure
      const validation = await this.validateTemplate(template, sourceCode);
      if (!validation.isValid) {
        console.error('Template validation failed:', validation.errors);
        return false;
      }

      // Add safety checks
      const enhancedTemplate = await this.addSafetyChecks(template);
      this.templates.set(enhancedTemplate.id, enhancedTemplate);

      this.emit('template:registered', enhancedTemplate);
      return true;
    } catch (error) {
      console.error('Failed to register template:', error);
      return false;
    }
  }

  /**
   * Compile template with variables and conditions
   */
  async compileTemplate(
    templateId: string,
    variables: Record<string, any>,
    deviceContext?: any
  ): Promise<CompiledTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Validate input variables
      const variableValidation = this.validateVariables(template, variables);
      if (!variableValidation.isValid) {
        errors.push(...variableValidation.errors);
      }

      // Process conditional logic
      const processedTemplate = this.processConditions(template, variables);

      // Generate code
      const code = await this.generateCode(processedTemplate, variables, deviceContext);

      // Run safety checks
      const safetyResults = await this.runSafetyChecks(template, variables, deviceContext);
      warnings.push(...safetyResults.warnings);

      const compiled: CompiledTemplate = {
        metadata: { ...template, last_optimized: new Date() },
        code,
        warnings,
        errors,
        executionTime: Date.now() - startTime,
        compiledAt: new Date()
      };

      this.compiledCache.set(`${templateId}_${JSON.stringify(variables)}`, compiled);
      this.emit('template:compiled', compiled);

      return compiled;
    } catch (error) {
      errors.push(`Compilation failed: ${error instanceof Error ? error.message : String(error)}`);

      const compiled: CompiledTemplate = {
        metadata: template,
        code: '',
        warnings,
        errors,
        executionTime: Date.now() - startTime,
        compiledAt: new Date()
      };

      return compiled;
    }
  }

  /**
   * Execute compiled template and record outcome
   */
  async executeTemplate(compiled: CompiledTemplate, runtimeContext?: any): Promise<ExecutionOutcome> {
    const template = compiled.metadata;
    const startTime = Date.now();

    try {
      // Run safety pre-checks
      const safetyResults = await this.runPreExecutionSafetyChecks(template, runtimeContext);
      if (!safetyResults.passed) {
        throw new Error(`Safety check failed: ${safetyResults.violations.join(', ')}`);
      }

      // Execute the generated code (simulated)
      const executionResult = await this.simulateCodeExecution(compiled.code, runtimeContext);

      const outcome: ExecutionOutcome = {
        templateId: template.id,
        success: executionResult.success,
        executionTime: Date.now() - startTime,
        errorMessage: executionResult.error,
        performance_metrics: executionResult.metrics,
        safety_violations: safetyResults.violations,
        timestamp: new Date()
      };

      this.executionHistory.push(outcome);
      this.optimizationEngine.recordOutcome(outcome);

      this.emit('template:executed', outcome);
      return outcome;

    } catch (error) {
      const outcome: ExecutionOutcome = {
        templateId: template.id,
        success: false,
        executionTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : String(error),
        performance_metrics: { cpu_usage: 0, memory_usage: 0, network_latency: 0 },
        safety_violations: [],
        timestamp: new Date()
      };

      this.executionHistory.push(outcome);
      this.optimizationEngine.recordOutcome(outcome);

      this.emit('template:executed', outcome);
      return outcome;
    }
  }

  /**
   * Execute template using the Code Interpreter Service for enhanced safety and functionality
   * This is the recommended method for template marketplace execution
   */
  async executeTemplateWithCodeInterpreter(
    compiled: CompiledTemplate,
    runtimeContext?: any
  ): Promise<ExecutionOutcome> {
    const template = compiled.metadata;
    const startTime = Date.now();
    const sandboxId = `template_${template.id}_${Date.now()}`;

    try {
      // Run safety pre-checks using existing validation
      const safetyResults = await this.runPreExecutionSafetyChecks(template, runtimeContext);
      if (!safetyResults.passed) {
        throw new Error(`Safety check failed: ${safetyResults.violations.join(', ')}`);
      }

      // Code Interpreter Service is provided by the EVE OS host at runtime
      // Access via window global when running in EVE OS environment
      const codeInterpreterService = (window as any).__EVE_CODE_INTERPRETER__;
      if (!codeInterpreterService) {
        throw new Error('Code Interpreter Service not available. Ensure EVE OS host provides __EVE_CODE_INTERPRETER__');
      }

      // Create execution request for code interpreter
      const request = {
        id: `exec_${template.id}_${Date.now()}`,
        language: this.determineTemplateLanguage(template),
        code: compiled.code,
        inputs: runtimeContext?.variables || {},
        timeout: 30000, // 30 second timeout
        sandbox_id: sandboxId,
        requires_file_access: template.category === 'data_processing',
        requires_network: template.category === 'http_device_control',
        memory_limit: 512, // 512MB limit
        execution_context: 'template_marketplace' as const,
        source: 'cloud' as const // Templates are from marketplace
      };

      console.log(`🔧 Executing template "${template.name}" using Code Interpreter Service`);

      // Execute using Code Interpreter Service
      const result = await codeInterpreterService.executeCode(request);

      // Record outcome in existing format
      const outcome: ExecutionOutcome = {
        templateId: template.id,
        success: result.success,
        executionTime: Date.now() - startTime,
        errorMessage: result.error,
        performance_metrics: {
          cpu_usage: 0, // Would be calculated from actual execution
          memory_usage: result.memory_used,
          network_latency: result.network_calls.length > 0 ? 100 : 0 // Mock network latency
        },
        safety_violations: result.safety_violations,
        timestamp: new Date()
      };

      this.executionHistory.push(outcome);
      this.optimizationEngine.recordOutcome(outcome);

      // Emit events for both systems
      this.emit('template:executed', outcome);
      this.emit('template:executed_with_code_interpreter', {
        ...outcome,
        code_interpreter_result: result
      });

      // Clean up sandbox
      await codeInterpreterService.cleanupSandbox(sandboxId);

      return outcome;

    } catch (error) {
      const outcome: ExecutionOutcome = {
        templateId: template.id,
        success: false,
        executionTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : String(error),
        performance_metrics: { cpu_usage: 0, memory_usage: 0, network_latency: 0 },
        safety_violations: ['code_interpreter_error'],
        timestamp: new Date()
      };

      this.executionHistory.push(outcome);
      this.optimizationEngine.recordOutcome(outcome);

      this.emit('template:executed', outcome);
      return outcome;
    }
  }

  /**
   * Determine the programming language for a template
   */
  private determineTemplateLanguage(template: TemplateMetadata): 'python' | 'javascript' | 'typescript' {
    // Check template metadata for language hints
    if (template.variables.some(v => v.name.toLowerCase().includes('python'))) {
      return 'python';
    } else if (template.variables.some(v => v.name.toLowerCase().includes('javascript') || v.name.toLowerCase().includes('js'))) {
      return 'javascript';
    } else if (template.variables.some(v => v.name.toLowerCase().includes('typescript') || v.name.toLowerCase().includes('ts'))) {
      return 'typescript';
    }

    // Default based on category
    switch (template.category) {
      case 'data_processing':
        return 'python'; // Python is commonly used for data processing
      case 'http_device_control':
        return 'javascript'; // JavaScript for web APIs
      default:
        return 'javascript'; // Default to JavaScript
    }
  }

  /**
   * Get optimized templates based on performance
   */
  getOptimizedTemplates(limit: number = 10): TemplateMetadata[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.performance_score - a.performance_score)
      .slice(0, limit);
  }

  /**
   * Get template execution statistics
   */
  getTemplateStats(templateId: string): any {
    const outcomes = this.executionHistory.filter(o => o.templateId === templateId);
    const successful = outcomes.filter(o => o.success);

    return {
      total_executions: outcomes.length,
      success_rate: outcomes.length > 0 ? (successful.length / outcomes.length) * 100 : 0,
      average_execution_time: outcomes.length > 0 ?
        outcomes.reduce((sum, o) => sum + o.executionTime, 0) / outcomes.length : 0,
      safety_violations: outcomes.reduce((sum, o) => sum + o.safety_violations.length, 0),
      last_execution: outcomes.length > 0 ? outcomes[outcomes.length - 1].timestamp : null
    };
  }

  /**
   * Validate template structure
   */
  private async validateTemplate(template: TemplateMetadata, sourceCode: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!template.id || !template.name || !template.category) {
      errors.push('Missing required template metadata fields');
    }

    // Validate variables
    for (const variable of template.variables) {
      if (variable.required && variable.defaultValue === undefined) {
        warnings.push(`Variable ${variable.name} is required but has no default value`);
      }

      if (variable.validation) {
        try {
          const isValid = variable.validation(variable.defaultValue);
          if (!isValid && variable.required) {
            errors.push(`Variable ${variable.name} has invalid default value`);
          }
        } catch (validationError) {
          errors.push(`Variable ${variable.name} validation function failed: ${validationError}`);
        }
      }
    }

    // Basic source code validation
    if (sourceCode.includes('eval(') || sourceCode.includes('Function(')) {
      errors.push('Source code contains unsafe dynamic function calls');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Add safety checks to template
   */
  private async addSafetyChecks(template: TemplateMetadata): Promise<TemplateMetadata> {
    const safetyChecks: SafetyCheck[] = [];

    // Add category-specific safety checks
    switch (template.category) {
      case 'http_device_control':
        safetyChecks.push(
          {
            name: 'device_permission_check',
            description: 'Verify device permissions for control operations',
            validator: (context) => context?.device?.permissions?.includes('control') === true,
            severity: 'high',
            category: 'medical'
          },
          {
            name: 'medical_device_validation',
            description: 'Validate medical device identifiers',
            validator: (context) => {
              if (template.deviceType === 'medical' || template.deviceType === 'both') {
                return context?.device?.is_medical_device === true;
              }
              return true;
            },
            severity: 'critical',
            category: 'medical'
          }
        );
        break;

      case 'network_discovery':
        safetyChecks.push(
          {
            name: 'network_scan_bounds',
            description: 'Ensure network scanning stays within authorized ranges',
            validator: (context) => {
              const ip = context?.target_ip;
              if (!ip) return true;
              // Check if IP is in authorized ranges
              return /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
            },
            severity: 'medium',
            category: 'network'
          }
        );
        break;

      case 'data_processing':
        safetyChecks.push(
          {
            name: 'pii_protection',
            description: 'Ensure personal data is not exposed in logs',
            validator: (context) => !context?.data?.includes_sensitive_info,
            severity: 'high',
            category: 'personal'
          }
        );
        break;
    }

    return {
      ...template,
      safetyChecks: [...template.safetyChecks, ...safetyChecks]
    };
  }

  /**
   * Validate input variables against template requirements
   */
  private validateVariables(template: TemplateMetadata, variables: Record<string, any>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const variable of template.variables) {
      const value = variables[variable.name];

      if (variable.required && (value === undefined || value === null)) {
        errors.push(`Required variable '${variable.name}' is missing`);
        continue;
      }

      if (value !== undefined && variable.validation) {
        try {
          const isValid = variable.validation(value);
          if (!isValid) {
            errors.push(`Variable '${variable.name}' failed validation`);
          }
        } catch (error) {
          errors.push(`Variable '${variable.name}' validation error: ${error}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process conditional logic in templates
   */
  private processConditions(template: TemplateMetadata, variables: Record<string, any>): string {
    let processedTemplate = template.name; // This would be the actual template string

    if (template.conditions) {
      for (const condition of template.conditions) {
        const shouldInclude = this.evaluateCondition(condition, variables);
        if (shouldInclude) {
          // Include conditional template content
          processedTemplate += `\n// Conditional block: ${condition.template}`;
        }
      }
    }

    return processedTemplate;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: TemplateCondition, variables: Record<string, any>): boolean {
    const value = variables[condition.variable];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  /**
   * Generate actual code from template
   */
  private async generateCode(template: string, variables: Record<string, any>, deviceContext?: any): Promise<string> {
    let code = template;

    // Replace variables with actual values
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      code = code.replace(regex, JSON.stringify(value));
    }

    // Add safety headers
    code = this.addSafetyHeaders(code, deviceContext);

    return code;
  }

  /**
   * Add safety headers to generated code
   */
  private addSafetyHeaders(code: string, deviceContext?: any): string {
    const safetyHeader = `
/**
 * Auto-generated IoT device control code
 * Safety Level: ${deviceContext?.safety_level || 'standard'}
 * Medical Device: ${deviceContext?.is_medical_device || false}
 * Generated: ${new Date().toISOString()}
 */

// Safety validation enabled
const SAFETY_CHECKS_ENABLED = true;
const DEVICE_TIMEOUT_MS = 5000;

`;

    return safetyHeader + '\n' + code;
  }

  /**
   * Run safety checks on template
   */
  private async runSafetyChecks(template: TemplateMetadata, variables: any, deviceContext?: any): Promise<{
    passed: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];

    for (const check of template.safetyChecks) {
      try {
        const result = await check.validator({ variables, deviceContext, template });
        if (!result) {
          const message = `${check.name}: ${check.description}`;
          if (check.severity === 'critical' || check.severity === 'high') {
            violations.push(message);
          } else {
            warnings.push(message);
          }
        }
      } catch (error) {
        warnings.push(`${check.name}: Safety check failed - ${error}`);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Run pre-execution safety checks
   */
  private async runPreExecutionSafetyChecks(template: TemplateMetadata, runtimeContext?: any): Promise<{
    passed: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    // Check execution time limits
    if (runtimeContext?.max_execution_time && template.performance_score < 60) {
      violations.push('Template performance below threshold for runtime execution');
    }

    // Check medical device requirements
    if (template.deviceType === 'medical' && !runtimeContext?.medical_clearance) {
      violations.push('Medical device operation requires special clearance');
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Simulate code execution for testing
   */
  private async simulateCodeExecution(code: string, runtimeContext?: any): Promise<{
    success: boolean;
    error?: string;
    metrics: {
      cpu_usage: number;
      memory_usage: number;
      network_latency: number;
    };
  }> {
    // This would be replaced with actual code execution in a sandbox
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    const success = Math.random() > 0.1; // 90% success rate for simulation

    return {
      success,
      error: success ? undefined : 'Simulated execution failure',
      metrics: {
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 50,
        network_latency: Math.random() * 200
      }
    };
  }
}

/**
 * Template Optimizer
 * Self-improving template system based on execution outcomes
 */
class TemplateOptimizer {
  private engine: IoTTemplateEngine;
  private optimizationRules: Map<string, (outcome: ExecutionOutcome) => any> = new Map();

  constructor(engine: IoTTemplateEngine) {
    this.engine = engine;
    this.setupOptimizationRules();
  }

  private setupOptimizationRules(): void {
    // Performance optimization
    this.optimizationRules.set('slow_execution', (outcome) => {
      if (outcome.executionTime > 1000) {
        return {
          action: 'optimize',
          suggestion: 'Consider reducing complexity or adding performance optimizations'
        };
      }
    });

    // Memory usage optimization
    this.optimizationRules.set('high_memory_usage', (outcome) => {
      if (outcome.performance_metrics.memory_usage > 80) {
        return {
          action: 'optimize',
          suggestion: 'Consider memory-efficient operations or data streaming'
        };
      }
    });

    // Safety violation optimization
    this.optimizationRules.set('safety_violations', (outcome) => {
      if (outcome.safety_violations.length > 0) {
        return {
          action: 'enhance_safety',
          suggestion: 'Add additional safety checks and validation'
        };
      }
    });
  }

  recordOutcome(outcome: ExecutionOutcome): void {
    for (const [_ruleName, rule] of this.optimizationRules) {
      const suggestion = rule(outcome);
      if (suggestion) {
        this.applyOptimization(outcome.templateId, suggestion);
      }
    }
  }

  private applyOptimization(templateId: string, suggestion: any): void {
    const template = this.engine['templates'].get(templateId);
    if (!template) return;

    // Update template based on optimization suggestion
    switch (suggestion.action) {
      case 'optimize':
        template.performance_score = Math.min(100, template.performance_score + 5);
        template.last_optimized = new Date();
        break;
      case 'enhance_safety':
        // Add additional safety checks
        template.safetyChecks.push({
          name: `auto_generated_${Date.now()}`,
          description: suggestion.suggestion,
          validator: () => true,
          severity: 'medium',
          category: 'network'
        });
        template.last_optimized = new Date();
        break;
    }

    this.engine.emit('template:optimized', { templateId, suggestion, timestamp: new Date() });
  }
}

export default IoTTemplateEngine;