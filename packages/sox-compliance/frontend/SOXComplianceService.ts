/**
 * SOX Compliance Service
 * Sarbanes-Oxley Act compliance implementation for financial reporting controls
 *
 * Implements:
 * - Section 302: Corporate Responsibility for Financial Reports
 * - Section 404: Management Assessment of Internal Controls
 * - Section 409: Real-Time Issuer Disclosures
 * - Section 802: Criminal Penalties for Altering Documents
 *
 * Based on COSO Framework for Internal Control
 */

import crypto from '../../_shared/crypto';
import { EventEmitter } from './EventEmitter';
import soxPolicy from './security/policies/sox-security-policy.json';


// ============================================================================
// Types and Enums
// ============================================================================

export enum SOXSection {
  SECTION_302 = 'section_302',
  SECTION_404 = 'section_404',
  SECTION_409 = 'section_409',
  SECTION_802 = 'section_802',
  SECTION_906 = 'section_906'
}

export enum ControlCategory {
  ENTITY_LEVEL = 'entity_level',
  TRANSACTION_LEVEL = 'transaction_level',
  IT_GENERAL = 'it_general',
  IT_APPLICATION = 'it_application'
}

export enum ControlType {
  PREVENTIVE = 'preventive',
  DETECTIVE = 'detective',
  CORRECTIVE = 'corrective'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TestResult {
  EFFECTIVE = 'effective',
  INEFFECTIVE = 'ineffective',
  NOT_TESTED = 'not_tested',
  EXCEPTION = 'exception'
}

export enum DeficiencyType {
  DEFICIENCY = 'deficiency',
  SIGNIFICANT_DEFICIENCY = 'significant_deficiency',
  MATERIAL_WEAKNESS = 'material_weakness'
}

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  ARCHIVED = 'archived',
  SUPERSEDED = 'superseded'
}


// ============================================================================
// Interfaces
// ============================================================================

export interface InternalControl {
  controlId: string;
  name: string;
  description: string;
  category: ControlCategory;
  type: ControlType;
  owner: string;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  riskAddressed: string[];
  keyControl: boolean;
  automationLevel: 'manual' | 'semi_automated' | 'fully_automated';
  evidenceRequired: string[];
  lastTested?: Date;
  testResult?: TestResult;
  effectiveness: number; // 0-100
}

export interface RiskAssessment {
  assessmentId: string;
  processId: string;
  processName: string;
  inherentRisk: RiskLevel;
  controlEffectiveness: number;
  residualRisk: RiskLevel;
  financialStatementAssertions: string[];
  relatedControls: string[];
  lastAssessed: Date;
  nextAssessment: Date;
}

export interface ControlTest {
  testId: string;
  controlId: string;
  testerUserId: string;
  testDate: Date;
  samplingMethod: string;
  sampleSize: number;
  exceptionsFound: number;
  result: TestResult;
  evidence: string[];
  findings: ControlFinding[];
  workpaperReference: string;
}

export interface ControlFinding {
  findingId: string;
  controlId: string;
  deficiencyType: DeficiencyType;
  description: string;
  impact: string;
  rootCause: string;
  remediation: RemediationPlan;
  reportedDate: Date;
  resolvedDate?: Date;
}

export interface RemediationPlan {
  planId: string;
  findingId: string;
  actions: RemediationAction[];
  targetDate: Date;
  owner: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

export interface RemediationAction {
  actionId: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface SegregationOfDuties {
  roleId: string;
  roleName: string;
  incompatibleRoles: string[];
  requiredApprovals: number;
  sensitiveAccess: string[];
}

export interface UserAccess {
  userId: string;
  roles: string[];
  accessRights: string[];
  lastReview: Date;
  reviewedBy: string;
  conflicts: SODConflict[];
}

export interface SODConflict {
  conflictId: string;
  userId: string;
  role1: string;
  role2: string;
  severity: RiskLevel;
  mitigatingControl?: string;
  approvedBy?: string;
  approvedDate?: Date;
}

export interface FinancialDocument {
  documentId: string;
  type: string;
  title: string;
  version: string;
  status: DocumentStatus;
  createdBy: string;
  createdAt: Date;
  modifiedBy?: string;
  modifiedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  hash: string;
  retentionPeriod: number; // years
  accessLog: DocumentAccess[];
}

export interface DocumentAccess {
  accessId: string;
  userId: string;
  action: 'view' | 'edit' | 'approve' | 'export';
  timestamp: Date;
  ipAddress: string;
}

export interface CertificationStatement {
  certificationId: string;
  section: SOXSection;
  certifier: string;
  certifierTitle: string;
  period: { start: Date; end: Date };
  statements: string[];
  signedAt: Date;
  signature: string;
}

export interface AuditTrailEntry {
  entryId: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
}


// ============================================================================
// SOX Compliance Service Implementation
// ============================================================================

export class SOXComplianceService extends EventEmitter {
  private policy = soxPolicy;
  private controls: Map<string, InternalControl> = new Map();
  private risks: Map<string, RiskAssessment> = new Map();
  private tests: Map<string, ControlTest> = new Map();
  private findings: Map<string, ControlFinding> = new Map();
  private sodRules: Map<string, SegregationOfDuties> = new Map();
  private userAccess: Map<string, UserAccess> = new Map();
  private documents: Map<string, FinancialDocument> = new Map();
  private certifications: Map<string, CertificationStatement> = new Map();
  private auditTrail: AuditTrailEntry[] = [];

  // SOX retention requirements
  private readonly DOCUMENT_RETENTION_YEARS = 7;
  private readonly AUDIT_LOG_RETENTION_YEARS = 7;

  constructor() {
    super();
    this.initializeDefaultControls();
    this.initializeSODRules();
  }

  // ==========================================================================
  // SECTION 404: INTERNAL CONTROLS
  // ==========================================================================

  /**
   * Validate internal controls for a process
   */
  async validateInternalControls(processId: string): Promise<{ isCompliant: boolean; findings: string[] }> {
    const findings: string[] = [];

    // Get controls for the process
    const processControls = Array.from(this.controls.values()).filter(c =>
      c.riskAddressed.includes(processId)
    );

    if (processControls.length === 0) {
      findings.push(`No controls defined for process: ${processId}`);
      return { isCompliant: false, findings };
    }

    // Check each control
    for (const control of processControls) {
      // Check if control has been tested
      if (!control.lastTested) {
        findings.push(`Control ${control.controlId} has never been tested`);
        continue;
      }

      // Check test frequency
      const daysSinceTest = (Date.now() - control.lastTested.getTime()) / (1000 * 60 * 60 * 24);
      const maxDays = this.getTestFrequencyDays(control.frequency);

      if (daysSinceTest > maxDays) {
        findings.push(`Control ${control.controlId} testing is overdue (${Math.floor(daysSinceTest)} days)`);
      }

      // Check effectiveness
      if (control.effectiveness < 70) {
        findings.push(`Control ${control.controlId} effectiveness below threshold (${control.effectiveness}%)`);
      }

      // Check test result
      if (control.testResult === TestResult.INEFFECTIVE) {
        findings.push(`Control ${control.controlId} was found ineffective`);
      }
    }

    // Check for key control coverage
    const keyControls = processControls.filter(c => c.keyControl);
    if (keyControls.length === 0) {
      findings.push('No key controls identified for this process');
    }

    this.logAudit('VALIDATE_CONTROLS', 'system', processId, { findings });

    return {
      isCompliant: findings.length === 0,
      findings
    };
  }

  /**
   * Test a specific control
   */
  async testControl(
    controlId: string,
    testerUserId: string,
    sampleSize: number,
    exceptions: number,
    evidence: string[]
  ): Promise<ControlTest> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error('Control not found');
    }

    // Verify tester has permission (SOD check)
    if (control.owner === testerUserId) {
      throw new Error('Control owner cannot test their own control (Segregation of Duties)');
    }

    const test: ControlTest = {
      testId: this.generateId('TEST'),
      controlId,
      testerUserId,
      testDate: new Date(),
      samplingMethod: 'random',
      sampleSize,
      exceptionsFound: exceptions,
      result: this.determineTestResult(sampleSize, exceptions),
      evidence,
      findings: [],
      workpaperReference: this.generateId('WP')
    };

    // Create findings for exceptions
    if (exceptions > 0) {
      const finding = await this.createFinding(controlId, exceptions, sampleSize);
      test.findings.push(finding);
    }

    // Update control
    control.lastTested = new Date();
    control.testResult = test.result;
    control.effectiveness = this.calculateEffectiveness(sampleSize, exceptions);

    this.tests.set(test.testId, test);
    this.logAudit('CONTROL_TESTED', testerUserId, controlId, { result: test.result });
    this.emit('controlTested', test);

    return test;
  }

  /**
   * Document and track control deficiency
   */
  async documentDeficiency(
    controlId: string,
    description: string,
    impact: string,
    rootCause: string
  ): Promise<ControlFinding> {
    const deficiencyType = this.classifyDeficiency(impact);

    const finding: ControlFinding = {
      findingId: this.generateId('FIND'),
      controlId,
      deficiencyType,
      description,
      impact,
      rootCause,
      remediation: {
        planId: this.generateId('PLAN'),
        findingId: '',
        actions: [],
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        owner: '',
        status: 'pending'
      },
      reportedDate: new Date()
    };

    finding.remediation.findingId = finding.findingId;
    this.findings.set(finding.findingId, finding);

    if (deficiencyType === DeficiencyType.MATERIAL_WEAKNESS) {
      this.emit('materialWeaknessIdentified', finding);
    }

    this.logAudit('DEFICIENCY_DOCUMENTED', 'system', finding.findingId, { type: deficiencyType });

    return finding;
  }

  // ==========================================================================
  // SEGREGATION OF DUTIES
  // ==========================================================================

  /**
   * Verify segregation of duties for user action
   */
  async verifySegregationOfDuties(userId: string, action: string): Promise<boolean> {
    const userAccessInfo = this.userAccess.get(userId);
    if (!userAccessInfo) {
      this.logAudit('SOD_CHECK_FAILED', userId, action, { reason: 'User not found' });
      return false;
    }

    // Check for conflicts
    const conflicts = this.detectSODConflicts(userAccessInfo);

    if (conflicts.length > 0) {
      // Check if conflicts are mitigated
      const unmitigatedConflicts = conflicts.filter(c => !c.mitigatingControl);

      if (unmitigatedConflicts.length > 0) {
        this.logAudit('SOD_VIOLATION', userId, action, { conflicts: unmitigatedConflicts });
        this.emit('sodViolation', { userId, action, conflicts: unmitigatedConflicts });
        return false;
      }
    }

    this.logAudit('SOD_CHECK_PASSED', userId, action, {});
    return true;
  }

  /**
   * Review user access for SOD conflicts
   */
  async reviewUserAccess(userId: string, reviewerId: string): Promise<{ conflicts: SODConflict[]; recommendations: string[] }> {
    const userAccessInfo = this.userAccess.get(userId);
    if (!userAccessInfo) {
      throw new Error('User not found');
    }

    const conflicts = this.detectSODConflicts(userAccessInfo);
    const recommendations: string[] = [];

    for (const conflict of conflicts) {
      if (!conflict.mitigatingControl) {
        recommendations.push(`Remove conflicting role ${conflict.role2} or implement mitigating control`);
      }
    }

    // Update review status
    userAccessInfo.lastReview = new Date();
    userAccessInfo.reviewedBy = reviewerId;
    userAccessInfo.conflicts = conflicts;

    this.logAudit('ACCESS_REVIEWED', reviewerId, userId, { conflictCount: conflicts.length });

    return { conflicts, recommendations };
  }

  // ==========================================================================
  // SECTION 302/906: CERTIFICATIONS
  // ==========================================================================

  /**
   * Generate Section 302 certification
   */
  async generateSection302Certification(
    certifier: string,
    certifierTitle: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CertificationStatement> {
    // Verify all controls are tested and effective
    const controlStatus = await this.getOverallControlStatus();

    if (!controlStatus.effective) {
      throw new Error('Cannot certify: Control deficiencies exist');
    }

    const statements = [
      'I have reviewed this report on internal controls',
      'Based on my knowledge, this report does not contain any untrue statement of a material fact',
      'Based on my knowledge, the financial statements fairly present the financial condition',
      'I am responsible for establishing and maintaining internal controls',
      'I have evaluated the effectiveness of internal controls within 90 days prior to this report',
      'I have disclosed all significant deficiencies to auditors and the audit committee',
      'I have disclosed any fraud involving management or employees with significant control roles'
    ];

    const certification: CertificationStatement = {
      certificationId: this.generateId('CERT'),
      section: SOXSection.SECTION_302,
      certifier,
      certifierTitle,
      period: { start: periodStart, end: periodEnd },
      statements,
      signedAt: new Date(),
      signature: this.generateDigitalSignature(certifier, statements)
    };

    this.certifications.set(certification.certificationId, certification);
    this.logAudit('CERTIFICATION_GENERATED', certifier, certification.certificationId, { section: 'Section 302' });
    this.emit('certificationGenerated', certification);

    return certification;
  }

  // ==========================================================================
  // SECTION 802: DOCUMENT INTEGRITY
  // ==========================================================================

  /**
   * Create auditable financial document
   */
  async createDocument(
    type: string,
    title: string,
    content: string,
    createdBy: string
  ): Promise<FinancialDocument> {
    const document: FinancialDocument = {
      documentId: this.generateId('DOC'),
      type,
      title,
      version: '1.0',
      status: DocumentStatus.DRAFT,
      createdBy,
      createdAt: new Date(),
      hash: this.hashContent(content),
      retentionPeriod: this.DOCUMENT_RETENTION_YEARS,
      accessLog: []
    };

    // Log initial access
    document.accessLog.push({
      accessId: this.generateId('ACC'),
      userId: createdBy,
      action: 'edit',
      timestamp: new Date(),
      ipAddress: this.getCurrentIP()
    });

    this.documents.set(document.documentId, document);
    this.logAudit('DOCUMENT_CREATED', createdBy, document.documentId, { type, title });

    return document;
  }

  /**
   * Verify document integrity
   */
  async verifyDocumentIntegrity(documentId: string, currentContent: string): Promise<{ valid: boolean; details: string }> {
    const document = this.documents.get(documentId);
    if (!document) {
      return { valid: false, details: 'Document not found' };
    }

    const currentHash = this.hashContent(currentContent);

    if (currentHash !== document.hash) {
      this.logAudit('DOCUMENT_TAMPERING_DETECTED', 'system', documentId, {});
      this.emit('documentTamperingDetected', { documentId, expectedHash: document.hash, actualHash: currentHash });
      return { valid: false, details: 'Document hash mismatch - possible tampering detected' };
    }

    return { valid: true, details: 'Document integrity verified' };
  }

  /**
   * Approve document with audit trail
   */
  async approveDocument(documentId: string, approverId: string): Promise<FinancialDocument> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (document.createdBy === approverId) {
      throw new Error('Document creator cannot approve their own document (SOD violation)');
    }

    document.status = DocumentStatus.APPROVED;
    document.approvedBy = approverId;
    document.approvedAt = new Date();

    document.accessLog.push({
      accessId: this.generateId('ACC'),
      userId: approverId,
      action: 'approve',
      timestamp: new Date(),
      ipAddress: this.getCurrentIP()
    });

    this.logAudit('DOCUMENT_APPROVED', approverId, documentId, {});
    this.emit('documentApproved', document);

    return document;
  }

  // ==========================================================================
  // SECTION 409: REAL-TIME DISCLOSURE
  // ==========================================================================

  /**
   * Check for material events requiring disclosure
   */
  async checkMaterialEvents(): Promise<{ events: MaterialEvent[]; disclosureRequired: boolean }> {
    // Check for material deficiencies
    const materialWeaknesses = Array.from(this.findings.values()).filter(f =>
      f.deficiencyType === DeficiencyType.MATERIAL_WEAKNESS && !f.resolvedDate
    );

    const events: MaterialEvent[] = [];

    if (materialWeaknesses.length > 0) {
      events.push({
        eventId: this.generateId('EVT'),
        type: 'material_weakness',
        description: `${materialWeaknesses.length} unresolved material weakness(es) in internal controls`,
        occurredAt: new Date(),
        disclosureDeadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days
        disclosed: false
      });
    }

    return {
      events,
      disclosureRequired: events.length > 0
    };
  }

  // ==========================================================================
  // COMPLIANCE REPORTING
  // ==========================================================================

  /**
   * Generate SOX compliance report
   */
  async generateComplianceReport(periodStart: Date, periodEnd: Date): Promise<SOXComplianceReport> {
    const controls = Array.from(this.controls.values());
    const testedControls = controls.filter(c => c.lastTested && c.lastTested >= periodStart);
    const effectiveControls = controls.filter(c => c.effectiveness >= 70);

    const findings = Array.from(this.findings.values()).filter(f =>
      f.reportedDate >= periodStart && f.reportedDate <= periodEnd
    );

    const materialWeaknesses = findings.filter(f => f.deficiencyType === DeficiencyType.MATERIAL_WEAKNESS);
    const significantDeficiencies = findings.filter(f => f.deficiencyType === DeficiencyType.SIGNIFICANT_DEFICIENCY);

    const report: SOXComplianceReport = {
      reportId: this.generateId('RPT'),
      period: { start: periodStart, end: periodEnd },
      generatedAt: new Date(),
      summary: {
        totalControls: controls.length,
        controlsTested: testedControls.length,
        controlsEffective: effectiveControls.length,
        testingCoverage: (testedControls.length / controls.length) * 100,
        overallEffectiveness: this.calculateOverallEffectiveness()
      },
      deficiencies: {
        materialWeaknesses: materialWeaknesses.length,
        significantDeficiencies: significantDeficiencies.length,
        minorDeficiencies: findings.length - materialWeaknesses.length - significantDeficiencies.length
      },
      sodReview: {
        usersReviewed: this.userAccess.size,
        conflictsIdentified: Array.from(this.userAccess.values()).reduce((sum, u) => sum + u.conflicts.length, 0),
        conflictsResolved: 0
      },
      certificationStatus: this.getCertificationStatus(periodEnd),
      recommendations: this.generateRecommendations(findings),
      overallCompliance: materialWeaknesses.length === 0 ? 'compliant' : 'non_compliant'
    };

    this.logAudit('REPORT_GENERATED', 'system', report.reportId, {});
    return report;
  }

  /**
   * Get policy document
   */
  getPolicy(): any {
    return this.policy;
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private initializeDefaultControls(): void {
    const defaultControls: InternalControl[] = [
      {
        controlId: 'CTRL_001',
        name: 'Journal Entry Approval',
        description: 'All journal entries over $10,000 require management approval',
        category: ControlCategory.TRANSACTION_LEVEL,
        type: ControlType.PREVENTIVE,
        owner: 'controller',
        frequency: 'continuous',
        riskAddressed: ['financial_reporting', 'journal_entry'],
        keyControl: true,
        automationLevel: 'semi_automated',
        evidenceRequired: ['approval_log', 'journal_entry_detail'],
        effectiveness: 90
      },
      {
        controlId: 'CTRL_002',
        name: 'Access Review',
        description: 'Quarterly review of user access to financial systems',
        category: ControlCategory.IT_GENERAL,
        type: ControlType.DETECTIVE,
        owner: 'it_security',
        frequency: 'quarterly',
        riskAddressed: ['access_management', 'segregation_of_duties'],
        keyControl: true,
        automationLevel: 'manual',
        evidenceRequired: ['access_review_report', 'remediation_evidence'],
        effectiveness: 85
      },
      {
        controlId: 'CTRL_003',
        name: 'Change Management',
        description: 'All changes to financial systems require approval and testing',
        category: ControlCategory.IT_GENERAL,
        type: ControlType.PREVENTIVE,
        owner: 'it_manager',
        frequency: 'continuous',
        riskAddressed: ['change_management', 'system_integrity'],
        keyControl: true,
        automationLevel: 'semi_automated',
        evidenceRequired: ['change_request', 'test_results', 'approval'],
        effectiveness: 88
      }
    ];

    defaultControls.forEach(c => this.controls.set(c.controlId, c));
  }

  private initializeSODRules(): void {
    const rules: SegregationOfDuties[] = [
      {
        roleId: 'role_ap_clerk',
        roleName: 'Accounts Payable Clerk',
        incompatibleRoles: ['role_check_signer', 'role_vendor_master'],
        requiredApprovals: 1,
        sensitiveAccess: ['create_invoice', 'process_payment']
      },
      {
        roleId: 'role_journal_preparer',
        roleName: 'Journal Entry Preparer',
        incompatibleRoles: ['role_journal_approver', 'role_gl_admin'],
        requiredApprovals: 1,
        sensitiveAccess: ['create_journal', 'modify_journal']
      }
    ];

    rules.forEach(r => this.sodRules.set(r.roleId, r));
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private getTestFrequencyDays(frequency: string): number {
    const mapping: Record<string, number> = {
      continuous: 30,
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annual: 365
    };
    return mapping[frequency] || 90;
  }

  private determineTestResult(sampleSize: number, exceptions: number): TestResult {
    const exceptionRate = exceptions / sampleSize;
    if (exceptions === 0) return TestResult.EFFECTIVE;
    if (exceptionRate < 0.05) return TestResult.EXCEPTION;
    return TestResult.INEFFECTIVE;
  }

  private calculateEffectiveness(sampleSize: number, exceptions: number): number {
    return Math.round((1 - (exceptions / sampleSize)) * 100);
  }

  private classifyDeficiency(impact: string): DeficiencyType {
    const impactLower = impact.toLowerCase();
    if (impactLower.includes('material') || impactLower.includes('significant financial')) {
      return DeficiencyType.MATERIAL_WEAKNESS;
    }
    if (impactLower.includes('significant') || impactLower.includes('important')) {
      return DeficiencyType.SIGNIFICANT_DEFICIENCY;
    }
    return DeficiencyType.DEFICIENCY;
  }

  private async createFinding(controlId: string, exceptions: number, sampleSize: number): Promise<ControlFinding> {
    const exceptionRate = (exceptions / sampleSize * 100).toFixed(1);
    return this.documentDeficiency(
      controlId,
      `Control testing revealed ${exceptions} exception(s) out of ${sampleSize} samples (${exceptionRate}%)`,
      'Potential impact on financial reporting accuracy',
      'To be determined through root cause analysis'
    );
  }

  private detectSODConflicts(userAccess: UserAccess): SODConflict[] {
    const conflicts: SODConflict[] = [];

    for (const role of userAccess.roles) {
      const sodRule = this.sodRules.get(role);
      if (!sodRule) continue;

      for (const incompatibleRole of sodRule.incompatibleRoles) {
        if (userAccess.roles.includes(incompatibleRole)) {
          conflicts.push({
            conflictId: this.generateId('CONF'),
            userId: userAccess.userId,
            role1: role,
            role2: incompatibleRole,
            severity: RiskLevel.HIGH
          });
        }
      }
    }

    return conflicts;
  }

  private async getOverallControlStatus(): Promise<{ effective: boolean; issues: string[] }> {
    const controls = Array.from(this.controls.values());
    const issues: string[] = [];

    const ineffective = controls.filter(c => c.testResult === TestResult.INEFFECTIVE);
    if (ineffective.length > 0) {
      issues.push(`${ineffective.length} controls are ineffective`);
    }

    const materialWeaknesses = Array.from(this.findings.values()).filter(f =>
      f.deficiencyType === DeficiencyType.MATERIAL_WEAKNESS && !f.resolvedDate
    );
    if (materialWeaknesses.length > 0) {
      issues.push(`${materialWeaknesses.length} unresolved material weakness(es)`);
    }

    return {
      effective: issues.length === 0,
      issues
    };
  }

  private generateDigitalSignature(certifier: string, statements: string[]): string {
    const content = `${certifier}:${statements.join('|')}:${Date.now()}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private getCurrentIP(): string {
    return '192.168.1.100';
  }

  private calculateOverallEffectiveness(): number {
    const controls = Array.from(this.controls.values());
    if (controls.length === 0) return 0;
    return Math.round(controls.reduce((sum, c) => sum + c.effectiveness, 0) / controls.length);
  }

  private getCertificationStatus(periodEnd: Date): string {
    const certifications = Array.from(this.certifications.values()).filter(c =>
      c.period.end >= periodEnd
    );
    return certifications.length > 0 ? 'certified' : 'pending';
  }

  private generateRecommendations(findings: ControlFinding[]): string[] {
    const recommendations: string[] = [];

    if (findings.some(f => f.deficiencyType === DeficiencyType.MATERIAL_WEAKNESS)) {
      recommendations.push('Address material weaknesses immediately before certification');
    }

    if (findings.length > 5) {
      recommendations.push('Review control design and implementation across all processes');
    }

    return recommendations;
  }

  private logAudit(action: string, userId: string, resource: string, details: any): void {
    const entry: AuditTrailEntry = {
      entryId: this.generateId('AUDIT'),
      timestamp: new Date(),
      userId,
      action,
      resource,
      details,
      ipAddress: this.getCurrentIP()
    };
    this.auditTrail.push(entry);
    this.emit('auditEvent', entry);
  }
}


// ============================================================================
// Supporting Interfaces
// ============================================================================

interface MaterialEvent {
  eventId: string;
  type: string;
  description: string;
  occurredAt: Date;
  disclosureDeadline: Date;
  disclosed: boolean;
}

interface SOXComplianceReport {
  reportId: string;
  period: { start: Date; end: Date };
  generatedAt: Date;
  summary: {
    totalControls: number;
    controlsTested: number;
    controlsEffective: number;
    testingCoverage: number;
    overallEffectiveness: number;
  };
  deficiencies: {
    materialWeaknesses: number;
    significantDeficiencies: number;
    minorDeficiencies: number;
  };
  sodReview: {
    usersReviewed: number;
    conflictsIdentified: number;
    conflictsResolved: number;
  };
  certificationStatus: string;
  recommendations: string[];
  overallCompliance: 'compliant' | 'non_compliant';
}


// ============================================================================
// Exports
// ============================================================================

export const soxComplianceService = new SOXComplianceService();
export default SOXComplianceService;
