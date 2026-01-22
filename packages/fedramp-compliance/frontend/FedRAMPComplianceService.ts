/**
 * FedRAMP Compliance Service
 *
 * Implements Federal Risk and Authorization Management Program (FedRAMP)
 * compliance controls based on NIST SP 800-53 security controls.
 *
 * Supports Low, Moderate, and High impact levels with appropriate controls.
 */

import { EventEmitter } from './EventEmitter';
import crypto from '../../_shared/crypto';

// ============================================================================
// Type Definitions
// ============================================================================

export type ImpactLevel = 'low' | 'moderate' | 'high';

export type ControlFamily =
  | 'AC' // Access Control
  | 'AT' // Awareness and Training
  | 'AU' // Audit and Accountability
  | 'CA' // Assessment, Authorization, and Monitoring
  | 'CM' // Configuration Management
  | 'CP' // Contingency Planning
  | 'IA' // Identification and Authentication
  | 'IR' // Incident Response
  | 'MA' // Maintenance
  | 'MP' // Media Protection
  | 'PE' // Physical and Environmental Protection
  | 'PL' // Planning
  | 'PM' // Program Management
  | 'PS' // Personnel Security
  | 'PT' // PII Processing and Transparency
  | 'RA' // Risk Assessment
  | 'SA' // System and Services Acquisition
  | 'SC' // System and Communications Protection
  | 'SI' // System and Information Integrity
  | 'SR'; // Supply Chain Risk Management

export type ControlStatus = 'implemented' | 'partially_implemented' | 'planned' | 'not_applicable' | 'not_implemented';

export type AuthorizationStatus = 'authorized' | 'pending' | 'denied' | 'revoked' | 'expired';

export type ClearanceLevel = 'public_trust' | 'secret' | 'top_secret' | 'none';

export interface SecurityControl {
  controlId: string;
  family: ControlFamily;
  title: string;
  description: string;
  impactLevel: ImpactLevel;
  status: ControlStatus;
  implementationDetails?: string;
  responsibleParty?: string;
  testDate?: Date;
  testResult?: 'pass' | 'fail' | 'partial';
  evidence?: string[];
  poamId?: string; // Plan of Action and Milestones
}

export interface UserClearance {
  userId: string;
  clearanceLevel: ClearanceLevel;
  backgroundCheckDate: Date;
  expirationDate: Date;
  sponsoringAgency?: string;
  isActive: boolean;
  citizenshipVerified: boolean;
  usPersonStatus: boolean;
}

export interface SystemAuthorization {
  systemId: string;
  systemName: string;
  impactLevel: ImpactLevel;
  authorizationStatus: AuthorizationStatus;
  authorizedDate?: Date;
  expirationDate?: Date;
  authorizingOfficial: string;
  continuousMonitoringEnabled: boolean;
  lastAssessmentDate?: Date;
  nextAssessmentDate?: Date;
  poams: POAM[];
}

export interface POAM {
  poamId: string;
  controlId: string;
  weakness: string;
  plannedMilestones: Milestone[];
  scheduledCompletionDate: Date;
  actualCompletionDate?: Date;
  status: 'open' | 'closed' | 'delayed';
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  responsibleParty: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  milestoneId: string;
  description: string;
  targetDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface ContinuousMonitoringEvent {
  eventId: string;
  systemId: string;
  eventType: 'vulnerability_scan' | 'configuration_check' | 'access_review' | 'incident' | 'change_request';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  affectedControls: string[];
  remediationActions?: string;
}

export interface ComplianceAssessment {
  assessmentId: string;
  systemId: string;
  assessorName: string;
  assessorOrganization: string;
  assessmentType: 'initial' | 'annual' | 'significant_change' | 'continuous';
  startDate: Date;
  endDate?: Date;
  controlResults: ControlAssessmentResult[];
  overallStatus: 'pass' | 'fail' | 'conditional';
  findings: Finding[];
  recommendations: string[];
}

export interface ControlAssessmentResult {
  controlId: string;
  status: ControlStatus;
  findings: string[];
  evidence: string[];
  assessorNotes?: string;
}

export interface Finding {
  findingId: string;
  controlId: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  recommendation: string;
  responseDueDate: Date;
  status: 'open' | 'in_remediation' | 'closed';
}

export interface AuditLogEntry {
  entryId: string;
  timestamp: Date;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
}

export interface IncidentReport {
  incidentId: string;
  systemId: string;
  reportedBy: string;
  reportedAt: Date;
  incidentType: 'security_breach' | 'data_exposure' | 'unauthorized_access' | 'malware' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedSystems: string[];
  affectedData: string[];
  containmentActions: string[];
  eradicationActions: string[];
  recoveryActions: string[];
  lessonsLearned?: string;
  status: 'reported' | 'investigating' | 'contained' | 'eradicated' | 'recovered' | 'closed';
  usertNotificationRequired: boolean;
  agencyNotificationRequired: boolean;
  closedAt?: Date;
}

export interface ValidationResult {
  isCompliant: boolean;
  findings: string[];
  controlsAssessed: number;
  controlsPassed: number;
  controlsFailed: number;
  riskScore: number;
}

// ============================================================================
// FedRAMP Compliance Service
// ============================================================================

export class FedRAMPComplianceService extends EventEmitter {
  private controls: Map<string, SecurityControl> = new Map();
  private userClearances: Map<string, UserClearance> = new Map();
  private systemAuthorizations: Map<string, SystemAuthorization> = new Map();
  private poams: Map<string, POAM> = new Map();
  private monitoringEvents: Map<string, ContinuousMonitoringEvent> = new Map();
  private assessments: Map<string, ComplianceAssessment> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private incidents: Map<string, IncidentReport> = new Map();

  // Control families and their baseline requirements per impact level
  private controlBaselines: Record<ImpactLevel, Record<ControlFamily, number>> = {
    low: {
      AC: 8, AT: 3, AU: 6, CA: 5, CM: 7, CP: 5, IA: 6, IR: 5,
      MA: 4, MP: 4, PE: 8, PL: 4, PM: 5, PS: 6, PT: 3, RA: 4,
      SA: 7, SC: 12, SI: 7, SR: 3
    },
    moderate: {
      AC: 16, AT: 4, AU: 12, CA: 7, CM: 11, CP: 9, IA: 11, IR: 8,
      MA: 6, MP: 7, PE: 17, PL: 4, PM: 9, PS: 7, PT: 5, RA: 5,
      SA: 15, SC: 28, SI: 12, SR: 6
    },
    high: {
      AC: 22, AT: 4, AU: 14, CA: 9, CM: 11, CP: 13, IA: 12, IR: 10,
      MA: 6, MP: 8, PE: 20, PL: 4, PM: 12, PS: 8, PT: 6, RA: 6,
      SA: 22, SC: 39, SI: 16, SR: 8
    }
  };

  constructor() {
    super();
    this.initializeBaselineControls();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeBaselineControls(): void {
    // Initialize common controls across all families
    const commonControls: Partial<SecurityControl>[] = [
      { controlId: 'AC-1', family: 'AC', title: 'Policy and Procedures', impactLevel: 'low' },
      { controlId: 'AC-2', family: 'AC', title: 'Account Management', impactLevel: 'low' },
      { controlId: 'AC-3', family: 'AC', title: 'Access Enforcement', impactLevel: 'low' },
      { controlId: 'AC-6', family: 'AC', title: 'Least Privilege', impactLevel: 'moderate' },
      { controlId: 'AC-7', family: 'AC', title: 'Unsuccessful Logon Attempts', impactLevel: 'low' },
      { controlId: 'AU-1', family: 'AU', title: 'Policy and Procedures', impactLevel: 'low' },
      { controlId: 'AU-2', family: 'AU', title: 'Event Logging', impactLevel: 'low' },
      { controlId: 'AU-3', family: 'AU', title: 'Content of Audit Records', impactLevel: 'low' },
      { controlId: 'AU-6', family: 'AU', title: 'Audit Record Review', impactLevel: 'low' },
      { controlId: 'CA-1', family: 'CA', title: 'Policy and Procedures', impactLevel: 'low' },
      { controlId: 'CA-2', family: 'CA', title: 'Control Assessments', impactLevel: 'low' },
      { controlId: 'CA-5', family: 'CA', title: 'Plan of Action and Milestones', impactLevel: 'low' },
      { controlId: 'CA-7', family: 'CA', title: 'Continuous Monitoring', impactLevel: 'low' },
      { controlId: 'CM-1', family: 'CM', title: 'Policy and Procedures', impactLevel: 'low' },
      { controlId: 'CM-2', family: 'CM', title: 'Baseline Configuration', impactLevel: 'low' },
      { controlId: 'CM-6', family: 'CM', title: 'Configuration Settings', impactLevel: 'low' },
      { controlId: 'IA-1', family: 'IA', title: 'Policy and Procedures', impactLevel: 'low' },
      { controlId: 'IA-2', family: 'IA', title: 'Identification and Authentication', impactLevel: 'low' },
      { controlId: 'IA-5', family: 'IA', title: 'Authenticator Management', impactLevel: 'low' },
      { controlId: 'IR-1', family: 'IR', title: 'Policy and Procedures', impactLevel: 'low' },
      { controlId: 'IR-4', family: 'IR', title: 'Incident Handling', impactLevel: 'low' },
      { controlId: 'IR-6', family: 'IR', title: 'Incident Reporting', impactLevel: 'low' },
      { controlId: 'SC-1', family: 'SC', title: 'Policy and Procedures', impactLevel: 'low' },
      { controlId: 'SC-7', family: 'SC', title: 'Boundary Protection', impactLevel: 'low' },
      { controlId: 'SC-8', family: 'SC', title: 'Transmission Confidentiality', impactLevel: 'moderate' },
      { controlId: 'SC-12', family: 'SC', title: 'Cryptographic Key Management', impactLevel: 'low' },
      { controlId: 'SC-13', family: 'SC', title: 'Cryptographic Protection', impactLevel: 'low' },
      { controlId: 'SI-1', family: 'SI', title: 'Policy and Procedures', impactLevel: 'low' },
      { controlId: 'SI-2', family: 'SI', title: 'Flaw Remediation', impactLevel: 'low' },
      { controlId: 'SI-3', family: 'SI', title: 'Malicious Code Protection', impactLevel: 'low' },
      { controlId: 'SI-4', family: 'SI', title: 'System Monitoring', impactLevel: 'low' },
    ];

    for (const control of commonControls) {
      const fullControl: SecurityControl = {
        controlId: control.controlId!,
        family: control.family!,
        title: control.title!,
        description: `NIST SP 800-53 ${control.controlId} - ${control.title}`,
        impactLevel: control.impactLevel!,
        status: 'not_implemented'
      };
      this.controls.set(control.controlId!, fullControl);
    }
  }

  // ============================================================================
  // Policy Access
  // ============================================================================

  getPolicy(): Record<string, any> {
    return {
      framework: 'FedRAMP',
      version: 'Rev 5',
      basedOn: 'NIST SP 800-53 Rev 5',
      impactLevels: ['low', 'moderate', 'high'],
      controlFamilies: Object.keys(this.controlBaselines.low),
      continuousMonitoringRequired: true,
      annualAssessmentRequired: true
    };
  }

  // ============================================================================
  // Compliance Validation
  // ============================================================================

  async validateCompliance(systemId: string, impactLevel: ImpactLevel = 'moderate'): Promise<ValidationResult> {
    const findings: string[] = [];
    let controlsAssessed = 0;
    let controlsPassed = 0;
    let controlsFailed = 0;

    // Get system authorization
    const authorization = this.systemAuthorizations.get(systemId);
    if (!authorization) {
      findings.push(`System ${systemId} has no authorization record`);
    } else if (authorization.authorizationStatus !== 'authorized') {
      findings.push(`System ${systemId} is not currently authorized (status: ${authorization.authorizationStatus})`);
    }

    // Check required controls for impact level
    const requiredControls = this.getRequiredControlsForLevel(impactLevel);

    for (const controlId of requiredControls) {
      controlsAssessed++;
      const control = this.controls.get(controlId);

      if (!control) {
        controlsFailed++;
        findings.push(`Required control ${controlId} not found`);
        continue;
      }

      if (control.status === 'implemented') {
        controlsPassed++;
      } else if (control.status === 'partially_implemented') {
        controlsPassed += 0.5;
        findings.push(`Control ${controlId} is only partially implemented`);
      } else if (control.status !== 'not_applicable') {
        controlsFailed++;
        findings.push(`Control ${controlId} is not implemented (status: ${control.status})`);
      }
    }

    // Check for open POAMs
    const openPOAMs = Array.from(this.poams.values()).filter(p => p.status === 'open');
    if (openPOAMs.length > 0) {
      findings.push(`${openPOAMs.length} open POAMs require attention`);

      const criticalPOAMs = openPOAMs.filter(p => p.riskLevel === 'critical');
      if (criticalPOAMs.length > 0) {
        findings.push(`${criticalPOAMs.length} POAMs are critical risk level`);
      }
    }

    // Check continuous monitoring status
    if (authorization?.continuousMonitoringEnabled === false) {
      findings.push('Continuous monitoring is not enabled');
    }

    // Calculate risk score (0-100, lower is better)
    const complianceRate = controlsAssessed > 0 ? controlsPassed / controlsAssessed : 0;
    const poamPenalty = Math.min(openPOAMs.length * 2, 20);
    const riskScore = Math.round((1 - complianceRate) * 80 + poamPenalty);

    const isCompliant = complianceRate >= 0.95 && openPOAMs.filter(p => p.riskLevel === 'critical').length === 0;

    this.logAuditEvent('system', 'compliance_validation', systemId, isCompliant ? 'success' : 'failure', {
      impactLevel,
      controlsAssessed,
      controlsPassed,
      controlsFailed,
      riskScore
    });

    this.emit('compliance:validated', {
      systemId,
      impactLevel,
      isCompliant,
      riskScore,
      timestamp: new Date()
    });

    return {
      isCompliant,
      findings,
      controlsAssessed,
      controlsPassed: Math.floor(controlsPassed),
      controlsFailed,
      riskScore
    };
  }

  private getRequiredControlsForLevel(impactLevel: ImpactLevel): string[] {
    // Return control IDs that apply to this impact level
    const controls: string[] = [];

    for (const [controlId, control] of this.controls) {
      const levelOrder = { low: 1, moderate: 2, high: 3 };
      if (levelOrder[control.impactLevel] <= levelOrder[impactLevel]) {
        controls.push(controlId);
      }
    }

    return controls;
  }

  // ============================================================================
  // Clearance Management
  // ============================================================================

  async verifyClearance(userId: string, requiredLevel: ClearanceLevel = 'public_trust'): Promise<boolean> {
    const clearance = this.userClearances.get(userId);

    if (!clearance) {
      this.logAuditEvent('user', 'clearance_verification', userId, 'failure', {
        reason: 'No clearance record found'
      });
      return false;
    }

    if (!clearance.isActive) {
      this.logAuditEvent('user', 'clearance_verification', userId, 'failure', {
        reason: 'Clearance is not active'
      });
      return false;
    }

    if (clearance.expirationDate < new Date()) {
      this.logAuditEvent('user', 'clearance_verification', userId, 'failure', {
        reason: 'Clearance has expired'
      });
      return false;
    }

    // Check level hierarchy
    const levelOrder: Record<ClearanceLevel, number> = {
      none: 0,
      public_trust: 1,
      secret: 2,
      top_secret: 3
    };

    const hasRequiredLevel = levelOrder[clearance.clearanceLevel] >= levelOrder[requiredLevel];

    this.logAuditEvent('user', 'clearance_verification', userId, hasRequiredLevel ? 'success' : 'failure', {
      requiredLevel,
      actualLevel: clearance.clearanceLevel
    });

    return hasRequiredLevel;
  }

  async grantClearance(
    userId: string,
    level: ClearanceLevel,
    sponsoringAgency: string,
    citizenshipVerified: boolean,
    usPersonStatus: boolean
  ): Promise<UserClearance> {
    const now = new Date();
    const expirationDate = new Date(now);

    // Set expiration based on clearance level
    switch (level) {
      case 'top_secret':
        expirationDate.setFullYear(expirationDate.getFullYear() + 5);
        break;
      case 'secret':
        expirationDate.setFullYear(expirationDate.getFullYear() + 10);
        break;
      case 'public_trust':
        expirationDate.setFullYear(expirationDate.getFullYear() + 5);
        break;
      default:
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    }

    const clearance: UserClearance = {
      userId,
      clearanceLevel: level,
      backgroundCheckDate: now,
      expirationDate,
      sponsoringAgency,
      isActive: true,
      citizenshipVerified,
      usPersonStatus
    };

    this.userClearances.set(userId, clearance);

    this.logAuditEvent('user', 'clearance_granted', userId, 'success', {
      level,
      sponsoringAgency,
      expirationDate: expirationDate.toISOString()
    });

    this.emit('clearance:granted', { userId, level, timestamp: now });

    return clearance;
  }

  async revokeClearance(userId: string, reason: string): Promise<boolean> {
    const clearance = this.userClearances.get(userId);

    if (!clearance) {
      return false;
    }

    clearance.isActive = false;

    this.logAuditEvent('user', 'clearance_revoked', userId, 'success', { reason });
    this.emit('clearance:revoked', { userId, reason, timestamp: new Date() });

    return true;
  }

  // ============================================================================
  // System Authorization
  // ============================================================================

  async authorizeSystem(
    systemId: string,
    systemName: string,
    impactLevel: ImpactLevel,
    authorizingOfficial: string
  ): Promise<SystemAuthorization> {
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setFullYear(expirationDate.getFullYear() + 3); // ATO valid for 3 years

    const nextAssessmentDate = new Date(now);
    nextAssessmentDate.setFullYear(nextAssessmentDate.getFullYear() + 1);

    const authorization: SystemAuthorization = {
      systemId,
      systemName,
      impactLevel,
      authorizationStatus: 'authorized',
      authorizedDate: now,
      expirationDate,
      authorizingOfficial,
      continuousMonitoringEnabled: true,
      lastAssessmentDate: now,
      nextAssessmentDate,
      poams: []
    };

    this.systemAuthorizations.set(systemId, authorization);

    this.logAuditEvent('system', 'authorization_granted', systemId, 'success', {
      impactLevel,
      authorizingOfficial,
      expirationDate: expirationDate.toISOString()
    });

    this.emit('system:authorized', { systemId, impactLevel, timestamp: now });

    return authorization;
  }

  async revokeSystemAuthorization(systemId: string, reason: string): Promise<boolean> {
    const authorization = this.systemAuthorizations.get(systemId);

    if (!authorization) {
      return false;
    }

    authorization.authorizationStatus = 'revoked';

    this.logAuditEvent('system', 'authorization_revoked', systemId, 'success', { reason });
    this.emit('system:authorization_revoked', { systemId, reason, timestamp: new Date() });

    return true;
  }

  getSystemAuthorization(systemId: string): SystemAuthorization | undefined {
    return this.systemAuthorizations.get(systemId);
  }

  // ============================================================================
  // Control Management
  // ============================================================================

  async implementControl(
    controlId: string,
    implementationDetails: string,
    responsibleParty: string,
    evidence: string[] = []
  ): Promise<SecurityControl> {
    let control = this.controls.get(controlId);

    if (!control) {
      // Create new control
      const family = controlId.split('-')[0] as ControlFamily;
      control = {
        controlId,
        family,
        title: `Control ${controlId}`,
        description: `Security control ${controlId}`,
        impactLevel: 'moderate',
        status: 'not_implemented'
      };
    }

    control.status = 'implemented';
    control.implementationDetails = implementationDetails;
    control.responsibleParty = responsibleParty;
    control.evidence = evidence;
    control.testDate = new Date();

    this.controls.set(controlId, control);

    this.logAuditEvent('control', 'implemented', controlId, 'success', {
      responsibleParty,
      evidenceCount: evidence.length
    });

    this.emit('control:implemented', { controlId, timestamp: new Date() });

    return control;
  }

  async testControl(
    controlId: string,
    testResult: 'pass' | 'fail' | 'partial',
    evidence: string[]
  ): Promise<SecurityControl | undefined> {
    const control = this.controls.get(controlId);

    if (!control) {
      return undefined;
    }

    control.testDate = new Date();
    control.testResult = testResult;
    control.evidence = [...(control.evidence || []), ...evidence];

    if (testResult === 'fail') {
      control.status = 'not_implemented';
    } else if (testResult === 'partial') {
      control.status = 'partially_implemented';
    }

    this.logAuditEvent('control', 'tested', controlId, testResult === 'pass' ? 'success' : 'failure', {
      testResult,
      evidenceCount: evidence.length
    });

    this.emit('control:tested', { controlId, testResult, timestamp: new Date() });

    return control;
  }

  getControl(controlId: string): SecurityControl | undefined {
    return this.controls.get(controlId);
  }

  getControlsByFamily(family: ControlFamily): SecurityControl[] {
    return Array.from(this.controls.values()).filter(c => c.family === family);
  }

  // ============================================================================
  // POAM Management
  // ============================================================================

  async createPOAM(
    controlId: string,
    weakness: string,
    riskLevel: 'low' | 'moderate' | 'high' | 'critical',
    scheduledCompletionDate: Date,
    responsibleParty: string,
    milestones: Omit<Milestone, 'milestoneId'>[] = []
  ): Promise<POAM> {
    const poamId = `POAM-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();

    const poam: POAM = {
      poamId,
      controlId,
      weakness,
      plannedMilestones: milestones.map((m, i) => ({
        ...m,
        milestoneId: `${poamId}-M${i + 1}`
      })),
      scheduledCompletionDate,
      status: 'open',
      riskLevel,
      responsibleParty,
      createdAt: now,
      updatedAt: now
    };

    this.poams.set(poamId, poam);

    // Link POAM to control
    const control = this.controls.get(controlId);
    if (control) {
      control.poamId = poamId;
    }

    this.logAuditEvent('poam', 'created', poamId, 'success', {
      controlId,
      riskLevel,
      scheduledCompletionDate: scheduledCompletionDate.toISOString()
    });

    this.emit('poam:created', { poamId, controlId, riskLevel, timestamp: now });

    return poam;
  }

  async closePOAM(poamId: string): Promise<POAM | undefined> {
    const poam = this.poams.get(poamId);

    if (!poam) {
      return undefined;
    }

    poam.status = 'closed';
    poam.actualCompletionDate = new Date();
    poam.updatedAt = new Date();

    // Update all milestones as completed
    for (const milestone of poam.plannedMilestones) {
      if (milestone.status !== 'completed') {
        milestone.status = 'completed';
        milestone.completedDate = new Date();
      }
    }

    // Clear POAM link from control
    const control = this.controls.get(poam.controlId);
    if (control) {
      control.poamId = undefined;
    }

    this.logAuditEvent('poam', 'closed', poamId, 'success', {
      controlId: poam.controlId
    });

    this.emit('poam:closed', { poamId, timestamp: new Date() });

    return poam;
  }

  async updateMilestone(
    poamId: string,
    milestoneId: string,
    status: 'pending' | 'in_progress' | 'completed'
  ): Promise<Milestone | undefined> {
    const poam = this.poams.get(poamId);

    if (!poam) {
      return undefined;
    }

    const milestone = poam.plannedMilestones.find(m => m.milestoneId === milestoneId);

    if (!milestone) {
      return undefined;
    }

    milestone.status = status;
    if (status === 'completed') {
      milestone.completedDate = new Date();
    }
    poam.updatedAt = new Date();

    this.logAuditEvent('milestone', 'updated', milestoneId, 'success', {
      poamId,
      newStatus: status
    });

    return milestone;
  }

  getOpenPOAMs(): POAM[] {
    return Array.from(this.poams.values()).filter(p => p.status === 'open');
  }

  getPOAM(poamId: string): POAM | undefined {
    return this.poams.get(poamId);
  }

  // ============================================================================
  // Continuous Monitoring
  // ============================================================================

  async recordMonitoringEvent(
    systemId: string,
    eventType: ContinuousMonitoringEvent['eventType'],
    severity: ContinuousMonitoringEvent['severity'],
    description: string,
    affectedControls: string[] = []
  ): Promise<ContinuousMonitoringEvent> {
    const eventId = `MON-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const event: ContinuousMonitoringEvent = {
      eventId,
      systemId,
      eventType,
      severity,
      description,
      detectedAt: new Date(),
      affectedControls
    };

    this.monitoringEvents.set(eventId, event);

    this.logAuditEvent('monitoring', 'event_recorded', eventId, 'success', {
      systemId,
      eventType,
      severity
    });

    if (severity === 'high' || severity === 'critical') {
      this.emit('monitoring:critical_event', { event, timestamp: new Date() });
    }

    this.emit('monitoring:event', { event, timestamp: new Date() });

    return event;
  }

  async resolveMonitoringEvent(eventId: string, remediationActions: string): Promise<ContinuousMonitoringEvent | undefined> {
    const event = this.monitoringEvents.get(eventId);

    if (!event) {
      return undefined;
    }

    event.resolvedAt = new Date();
    event.remediationActions = remediationActions;

    this.logAuditEvent('monitoring', 'event_resolved', eventId, 'success', {
      remediationActions
    });

    this.emit('monitoring:event_resolved', { eventId, timestamp: new Date() });

    return event;
  }

  getMonitoringEvents(systemId?: string, unresolvedOnly: boolean = false): ContinuousMonitoringEvent[] {
    let events = Array.from(this.monitoringEvents.values());

    if (systemId) {
      events = events.filter(e => e.systemId === systemId);
    }

    if (unresolvedOnly) {
      events = events.filter(e => !e.resolvedAt);
    }

    return events.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  // ============================================================================
  // Assessments
  // ============================================================================

  async createAssessment(
    systemId: string,
    assessorName: string,
    assessorOrganization: string,
    assessmentType: ComplianceAssessment['assessmentType']
  ): Promise<ComplianceAssessment> {
    const assessmentId = `ASM-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const assessment: ComplianceAssessment = {
      assessmentId,
      systemId,
      assessorName,
      assessorOrganization,
      assessmentType,
      startDate: new Date(),
      controlResults: [],
      overallStatus: 'pass',
      findings: [],
      recommendations: []
    };

    this.assessments.set(assessmentId, assessment);

    this.logAuditEvent('assessment', 'created', assessmentId, 'success', {
      systemId,
      assessmentType,
      assessorName
    });

    this.emit('assessment:started', { assessmentId, systemId, timestamp: new Date() });

    return assessment;
  }

  async recordControlAssessment(
    assessmentId: string,
    controlId: string,
    status: ControlStatus,
    findings: string[] = [],
    evidence: string[] = [],
    assessorNotes?: string
  ): Promise<ControlAssessmentResult | undefined> {
    const assessment = this.assessments.get(assessmentId);

    if (!assessment) {
      return undefined;
    }

    const result: ControlAssessmentResult = {
      controlId,
      status,
      findings,
      evidence,
      assessorNotes
    };

    // Remove existing result for this control if any
    assessment.controlResults = assessment.controlResults.filter(r => r.controlId !== controlId);
    assessment.controlResults.push(result);

    // Create findings for failed controls
    if (status === 'not_implemented' || status === 'partially_implemented') {
      for (const findingDesc of findings) {
        const finding: Finding = {
          findingId: `FND-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          controlId,
          severity: status === 'not_implemented' ? 'high' : 'moderate',
          description: findingDesc,
          recommendation: 'Implement control as specified in NIST SP 800-53',
          responseDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'open'
        };
        assessment.findings.push(finding);
      }
    }

    this.logAuditEvent('assessment', 'control_assessed', controlId, 'success', {
      assessmentId,
      status
    });

    return result;
  }

  async completeAssessment(
    assessmentId: string,
    recommendations: string[] = []
  ): Promise<ComplianceAssessment | undefined> {
    const assessment = this.assessments.get(assessmentId);

    if (!assessment) {
      return undefined;
    }

    assessment.endDate = new Date();
    assessment.recommendations = recommendations;

    // Determine overall status
    const failedCount = assessment.controlResults.filter(
      r => r.status === 'not_implemented'
    ).length;

    const partialCount = assessment.controlResults.filter(
      r => r.status === 'partially_implemented'
    ).length;

    if (failedCount > 0) {
      assessment.overallStatus = 'fail';
    } else if (partialCount > 0) {
      assessment.overallStatus = 'conditional';
    } else {
      assessment.overallStatus = 'pass';
    }

    // Update system authorization with assessment date
    const authorization = this.systemAuthorizations.get(assessment.systemId);
    if (authorization) {
      authorization.lastAssessmentDate = assessment.endDate;
      const nextDate = new Date(assessment.endDate);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      authorization.nextAssessmentDate = nextDate;
    }

    this.logAuditEvent('assessment', 'completed', assessmentId, 'success', {
      overallStatus: assessment.overallStatus,
      findingsCount: assessment.findings.length
    });

    this.emit('assessment:completed', {
      assessmentId,
      systemId: assessment.systemId,
      overallStatus: assessment.overallStatus,
      timestamp: new Date()
    });

    return assessment;
  }

  getAssessment(assessmentId: string): ComplianceAssessment | undefined {
    return this.assessments.get(assessmentId);
  }

  // ============================================================================
  // Incident Response
  // ============================================================================

  async reportIncident(
    systemId: string,
    reportedBy: string,
    incidentType: IncidentReport['incidentType'],
    severity: IncidentReport['severity'],
    description: string,
    affectedSystems: string[] = [],
    affectedData: string[] = []
  ): Promise<IncidentReport> {
    const incidentId = `INC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const incident: IncidentReport = {
      incidentId,
      systemId,
      reportedBy,
      reportedAt: new Date(),
      incidentType,
      severity,
      description,
      affectedSystems: [systemId, ...affectedSystems],
      affectedData,
      containmentActions: [],
      eradicationActions: [],
      recoveryActions: [],
      status: 'reported',
      usertNotificationRequired: severity === 'high' || severity === 'critical',
      agencyNotificationRequired: severity === 'critical'
    };

    this.incidents.set(incidentId, incident);

    this.logAuditEvent('incident', 'reported', incidentId, 'success', {
      systemId,
      incidentType,
      severity
    });

    this.emit('incident:reported', { incident, timestamp: new Date() });

    // For critical incidents, emit special alert
    if (severity === 'critical') {
      this.emit('incident:critical', { incident, timestamp: new Date() });
    }

    return incident;
  }

  async updateIncidentStatus(
    incidentId: string,
    status: IncidentReport['status'],
    actions?: string[],
    actionType?: 'containment' | 'eradication' | 'recovery'
  ): Promise<IncidentReport | undefined> {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      return undefined;
    }

    incident.status = status;

    if (actions && actionType) {
      switch (actionType) {
        case 'containment':
          incident.containmentActions.push(...actions);
          break;
        case 'eradication':
          incident.eradicationActions.push(...actions);
          break;
        case 'recovery':
          incident.recoveryActions.push(...actions);
          break;
      }
    }

    if (status === 'closed') {
      incident.closedAt = new Date();
    }

    this.logAuditEvent('incident', 'status_updated', incidentId, 'success', {
      newStatus: status,
      actionType
    });

    this.emit('incident:updated', { incidentId, status, timestamp: new Date() });

    return incident;
  }

  async addLessonsLearned(incidentId: string, lessonsLearned: string): Promise<IncidentReport | undefined> {
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      return undefined;
    }

    incident.lessonsLearned = lessonsLearned;

    this.logAuditEvent('incident', 'lessons_recorded', incidentId, 'success', {});

    return incident;
  }

  getIncident(incidentId: string): IncidentReport | undefined {
    return this.incidents.get(incidentId);
  }

  getOpenIncidents(): IncidentReport[] {
    return Array.from(this.incidents.values()).filter(i => i.status !== 'closed');
  }

  // ============================================================================
  // Audit Logging
  // ============================================================================

  private logAuditEvent(
    resourceType: string,
    action: string,
    resourceId: string,
    outcome: 'success' | 'failure',
    details: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      entryId: `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date(),
      userId: 'system', // Would be actual user in production
      action,
      resourceType,
      resourceId,
      outcome,
      details
    };

    this.auditLog.push(entry);

    // Keep only last 10000 entries
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }

  getAuditLog(filters?: {
    resourceType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let entries = [...this.auditLog];

    if (filters?.resourceType) {
      entries = entries.filter(e => e.resourceType === filters.resourceType);
    }

    if (filters?.action) {
      entries = entries.filter(e => e.action === filters.action);
    }

    if (filters?.startDate) {
      entries = entries.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      entries = entries.filter(e => e.timestamp <= filters.endDate!);
    }

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      entries = entries.slice(0, filters.limit);
    }

    return entries;
  }

  // ============================================================================
  // Compliance Reporting
  // ============================================================================

  async generateComplianceReport(systemId: string): Promise<{
    systemId: string;
    generatedAt: Date;
    authorization: SystemAuthorization | undefined;
    complianceStatus: ValidationResult;
    controlSummary: Record<ControlStatus, number>;
    openPOAMs: POAM[];
    recentFindings: Finding[];
    monitoringStatus: {
      enabled: boolean;
      unresolvedEvents: number;
      criticalEvents: number;
    };
    recommendations: string[];
  }> {
    const authorization = this.systemAuthorizations.get(systemId);
    const impactLevel = authorization?.impactLevel || 'moderate';

    const complianceStatus = await this.validateCompliance(systemId, impactLevel);

    // Count controls by status
    const controlSummary: Record<ControlStatus, number> = {
      implemented: 0,
      partially_implemented: 0,
      planned: 0,
      not_applicable: 0,
      not_implemented: 0
    };

    for (const control of this.controls.values()) {
      controlSummary[control.status]++;
    }

    // Get open POAMs for this system
    const openPOAMs = Array.from(this.poams.values()).filter(p => p.status === 'open');

    // Get recent findings from assessments
    const recentFindings: Finding[] = [];
    for (const assessment of this.assessments.values()) {
      if (assessment.systemId === systemId) {
        recentFindings.push(...assessment.findings.filter(f => f.status === 'open'));
      }
    }

    // Monitoring status
    const unresolvedEvents = this.getMonitoringEvents(systemId, true);
    const criticalEvents = unresolvedEvents.filter(e => e.severity === 'critical');

    const recommendations: string[] = [];

    if (complianceStatus.riskScore > 20) {
      recommendations.push('Address high-risk findings to improve compliance posture');
    }

    if (openPOAMs.length > 5) {
      recommendations.push('Prioritize POAM closure to reduce risk exposure');
    }

    if (!authorization?.continuousMonitoringEnabled) {
      recommendations.push('Enable continuous monitoring as required by FedRAMP');
    }

    if (criticalEvents.length > 0) {
      recommendations.push('Immediately address critical monitoring events');
    }

    return {
      systemId,
      generatedAt: new Date(),
      authorization,
      complianceStatus,
      controlSummary,
      openPOAMs,
      recentFindings: recentFindings.slice(0, 10),
      monitoringStatus: {
        enabled: authorization?.continuousMonitoringEnabled ?? false,
        unresolvedEvents: unresolvedEvents.length,
        criticalEvents: criticalEvents.length
      },
      recommendations
    };
  }
}

// Global instance
export const fedRAMPComplianceService = new FedRAMPComplianceService();
export default FedRAMPComplianceService;
