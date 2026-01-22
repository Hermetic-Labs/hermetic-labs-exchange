import { VoiceCommandHistory, VoiceAnalytics, TranscriptEntry } from '@/types';

/**
 * VoiceInterfaceManager - Centralized management for voice interactions
 * Provides analytics, history management, and advanced voice features
 */
export class VoiceInterfaceManager {
  private analytics: VoiceAnalytics;
  private commandHistory: VoiceCommandHistory[] = [];
  private sessionData: Map<string, any> = new Map();
  private onAnalyticsUpdate?: (analytics: VoiceAnalytics) => void;

  constructor(onAnalyticsUpdate?: (analytics: VoiceAnalytics) => void) {
    this.onAnalyticsUpdate = onAnalyticsUpdate;
    this.analytics = {
      session_duration: 0,
      commands_executed: 0,
      accuracy_rate: 0,
      most_used_commands: [],
      medical_term_usage: [],
      error_patterns: [],
      improvement_suggestions: []
    };
  }

  /**
   * Record command execution for analytics
   */
  public recordCommandExecution(command: any): void {
    this.analytics.commands_executed += 1;

    // Update accuracy rate
    const currentAccuracy = this.analytics.accuracy_rate;
    const newAccuracy = command.confidence > 0.7 ? 1 : 0;
    this.analytics.accuracy_rate =
      (currentAccuracy * (this.analytics.commands_executed - 1) + newAccuracy) /
      this.analytics.commands_executed;

    // Track command patterns
    this.updateCommandPatterns(command);

    // Generate improvement suggestions
    this.generateImprovementSuggestions();

    this.onAnalyticsUpdate?.(this.analytics);
  }

  /**
   * Record medical term usage
   */
  public recordMedicalTermUsage(terms: any[]): void {
    terms.forEach(term => {
      const existing = this.analytics.medical_term_usage.find(t => t.term === term.term);
      if (existing) {
        existing.position = term.position;
      } else {
        this.analytics.medical_term_usage.push({ ...term });
      }
    });
  }

  /**
   * Record transcription for analytics
   */
  public recordTranscription(transcript: TranscriptEntry): void {
    // Track speech patterns and confidence levels
    if (transcript.medical_terms.length > 0) {
      this.recordMedicalTermUsage(transcript.medical_terms);
    }

    // Update session duration
    this.analytics.session_duration = Date.now() - this.getSessionStart();
  }

  /**
   * Get voice analytics
   */
  public getAnalytics(): VoiceAnalytics {
    return { ...this.analytics };
  }

  /**
   * Export command history for reporting
   */
  public exportCommandHistory(): any {
    const exportData = {
      analytics: this.analytics,
      history: this.commandHistory,
      session_info: {
        start_time: this.getSessionStart(),
        end_time: Date.now(),
        duration_minutes: Math.round((Date.now() - this.getSessionStart()) / 60000)
      },
      medical_term_frequency: this.generateTermFrequency(),
      performance_metrics: this.calculatePerformanceMetrics()
    };

    return exportData;
  }

  /**
   * Clear command history
   */
  public clearHistory(): void {
    this.commandHistory = [];
    this.sessionData.clear();
    this.resetAnalytics();
  }

  /**
   * Set session metadata
   */
  public setSessionData(key: string, value: any): void {
    this.sessionData.set(key, value);
  }

  /**
   * Get session metadata
   */
  public getSessionData(key: string): any {
    return this.sessionData.get(key);
  }

  /**
   * Generate voice interface statistics for medical environments
   */
  public generateMedicalReport(): any {
    const medicalCommands = this.commandHistory.filter(entry =>
      entry.command.medical_terms && entry.command.medical_terms.length > 0
    );

    return {
      total_commands: this.commandHistory.length,
      medical_commands: medicalCommands.length,
      medical_accuracy: medicalCommands.length > 0 ?
        medicalCommands.reduce((acc, cmd) => acc + cmd.command.confidence, 0) / medicalCommands.length : 0,
      most_used_medical_terms: this.getMostUsedMedicalTerms(),
      emergency_commands: this.commandHistory.filter(entry =>
        entry.command.transcript.toLowerCase().includes('emergency') ||
        entry.command.transcript.toLowerCase().includes('urgent')
      ).length,
      device_commands: this.commandHistory.filter(entry =>
        ['monitor', 'device', 'sensor'].some(word =>
          entry.command.transcript.toLowerCase().includes(word)
        )
      ).length,
      session_summary: this.getSessionSummary()
    };
  }

  /**
   * Validate voice commands for medical safety
   */
  public validateMedicalSafety(command: string): {
    is_safe: boolean;
    risk_level: 'low' | 'medium' | 'high';
    concerns: string[];
    recommendations: string[];
  } {
    const concerns: string[] = [];
    const recommendations: string[] = [];
    const lowerCommand = command.toLowerCase();

    // High-risk patterns
    const highRiskPatterns = [
      'stop', 'halt', 'cease', 'discontinue',
      'emergency', 'urgent', 'immediately', 'stat',
      'medication', 'drug', 'dosage', 'prescription'
    ];

    // Medium-risk patterns
    const mediumRiskPatterns = [
      'adjust', 'change', 'modify', 'increase', 'decrease',
      'patient', 'record', 'chart', 'note'
    ];

    let risk_level: 'low' | 'medium' | 'high' = 'low';

    // Check for high-risk commands
    if (highRiskPatterns.some(pattern => lowerCommand.includes(pattern))) {
      risk_level = 'high';
      concerns.push('Command contains high-risk medical terminology');
      recommendations.push('Require confirmation before execution');
      recommendations.push('Verify with clinical staff');
    }

    // Check for medium-risk commands
    if (mediumRiskPatterns.some(pattern => lowerCommand.includes(pattern))) {
      risk_level = risk_level === 'high' ? 'high' : 'medium';
      concerns.push('Command may affect patient care');
      recommendations.push('Review command parameters carefully');
    }

    // Check for emergency patterns
    if (['emergency', 'urgent', 'stat', 'immediately'].some(pattern => lowerCommand.includes(pattern))) {
      concerns.push('Emergency context detected');
      recommendations.push('Ensure emergency protocols are followed');
    }

    return {
      is_safe: concerns.length === 0,
      risk_level,
      concerns,
      recommendations
    };
  }

  private updateCommandPatterns(command: any): void {
    // Track most used commands
    const commandText = command.transcript.toLowerCase();
    const existingIndex = this.analytics.most_used_commands.indexOf(commandText);

    if (existingIndex === -1) {
      this.analytics.most_used_commands.push(commandText);
    }

    // Track error patterns
    if (command.status === 'failed') {
      const errorType = this.categorizeError(command.feedback || 'Unknown error');
      this.analytics.error_patterns.push(errorType);
    }
  }

  private categorizeError(errorMessage: string): string {
    if (errorMessage.includes('speech') || errorMessage.includes('recognition')) {
      return 'Speech Recognition Error';
    }
    if (errorMessage.includes('medical') || errorMessage.includes('safety')) {
      return 'Medical Safety Error';
    }
    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      return 'Permission Error';
    }
    return 'General Error';
  }

  private generateImprovementSuggestions(): void {
    const suggestions: string[] = [];

    // Based on accuracy rate
    if (this.analytics.accuracy_rate < 0.8) {
      suggestions.push('Consider adjusting microphone sensitivity');
      suggestions.push('Check ambient noise levels');
    }

    // Based on medical term usage
    if (this.analytics.medical_term_usage.length === 0) {
      suggestions.push('Enable medical vocabulary enhancement for better recognition');
    }

    // Based on error patterns
    const errorCounts = this.analytics.error_patterns.reduce((acc, error) => {
      acc[error] = (acc[error] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (errorCounts['Speech Recognition Error'] > 3) {
      suggestions.push('Try speaking more clearly or in a quieter environment');
    }

    this.analytics.improvement_suggestions = suggestions;
  }

  private getSessionStart(): number {
    return this.sessionData.get('start_time') || Date.now();
  }

  private getMostUsedMedicalTerms(): Array<{ term: string; count: number }> {
    const termCounts = this.analytics.medical_term_usage.reduce((acc, term) => {
      acc[term.term] = (acc[term.term] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(termCounts)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getSessionSummary(): string {
    const duration = Math.round((Date.now() - this.getSessionStart()) / 60000);
    const medicalCommands = this.commandHistory.filter(entry =>
      entry.command.medical_terms && entry.command.medical_terms.length > 0
    ).length;

    return `Session lasted ${duration} minutes with ${this.commandHistory.length} commands, ` +
      `${medicalCommands} medical-specific commands, ` +
      `${Math.round(this.analytics.accuracy_rate * 100)}% accuracy`;
  }

  private generateTermFrequency(): Record<string, number> {
    return this.analytics.medical_term_usage.reduce((acc, term) => {
      acc[term.term] = (acc[term.term] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculatePerformanceMetrics(): any {
    const now = Date.now();
    const sessionDuration = now - this.getSessionStart();

    return {
      commands_per_minute: this.analytics.commands_executed / (sessionDuration / 60000),
      medical_terms_per_command: this.analytics.medical_term_usage.length / this.analytics.commands_executed,
      average_confidence: this.commandHistory.length > 0 ?
        this.commandHistory.reduce((acc, cmd) => acc + cmd.command.confidence, 0) / this.commandHistory.length : 0,
      success_rate: this.commandHistory.length > 0 ?
        this.commandHistory.filter(cmd => cmd.execution_status === 'success').length / this.commandHistory.length : 0
    };
  }

  private resetAnalytics(): void {
    this.analytics = {
      session_duration: 0,
      commands_executed: 0,
      accuracy_rate: 0,
      most_used_commands: [],
      medical_term_usage: [],
      error_patterns: [],
      improvement_suggestions: []
    };
  }
}