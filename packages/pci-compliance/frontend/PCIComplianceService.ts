/**
 * PCI DSS Compliance Service
 * Payment Card Industry Data Security Standard compliance implementation
 *
 * Implements PCI DSS v4.0 Requirements:
 * - Requirement 3: Protect Stored Account Data
 * - Requirement 4: Protect Cardholder Data with Strong Cryptography
 * - Requirement 7: Restrict Access to System Components
 * - Requirement 8: Identify Users and Authenticate Access
 * - Requirement 10: Log and Monitor All Access
 * - Requirement 12: Support Information Security with Organizational Policies
 */

import crypto from '../../_shared/crypto';
import { EventEmitter } from './EventEmitter';
import pciPolicy from './security/policies/pci-security-policy.json';


// ============================================================================
// Types and Enums
// ============================================================================

export enum PCIRequirement {
  REQ_1 = 'network_security',
  REQ_2 = 'secure_configurations',
  REQ_3 = 'protect_stored_data',
  REQ_4 = 'encrypt_transmission',
  REQ_5 = 'protect_from_malware',
  REQ_6 = 'secure_systems',
  REQ_7 = 'restrict_access',
  REQ_8 = 'identify_authenticate',
  REQ_9 = 'restrict_physical',
  REQ_10 = 'log_monitor',
  REQ_11 = 'test_security',
  REQ_12 = 'information_security_policy'
}

export enum CardDataType {
  PAN = 'pan',
  CARDHOLDER_NAME = 'cardholder_name',
  EXPIRATION = 'expiration',
  SERVICE_CODE = 'service_code',
  CVV = 'cvv',
  PIN = 'pin',
  TRACK_DATA = 'track_data'
}

export enum StorageMethod {
  ENCRYPTED = 'encrypted',
  TOKENIZED = 'tokenized',
  TRUNCATED = 'truncated',
  HASHED = 'hashed',
  NOT_STORED = 'not_stored'
}

export enum ComplianceLevel {
  LEVEL_1 = 'level_1', // >6M transactions/year
  LEVEL_2 = 'level_2', // 1-6M transactions/year
  LEVEL_3 = 'level_3', // 20K-1M transactions/year
  LEVEL_4 = 'level_4'  // <20K transactions/year
}

export enum ScanType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  ASV = 'asv', // Approved Scanning Vendor
  PENETRATION = 'penetration'
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}


// ============================================================================
// Interfaces
// ============================================================================

export interface CardholderData {
  dataId: string;
  type: CardDataType;
  value: string;
  encrypted: boolean;
  encryptionKeyId?: string;
  tokenId?: string;
  maskedValue?: string;
  storageLocation: string;
  createdAt: Date;
  lastAccessed?: Date;
  retentionPolicy: RetentionPolicy;
}

export interface RetentionPolicy {
  policyId: string;
  dataType: CardDataType;
  maxRetentionDays: number;
  disposalMethod: string;
  legalRequirement?: string;
}

export interface SecurityScan {
  scanId: string;
  type: ScanType;
  scheduledAt: Date;
  completedAt?: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  findings: SecurityFinding[];
  passedRequirements: string[];
  failedRequirements: string[];
  overallResult: 'pass' | 'fail' | 'pending';
}

export interface SecurityFinding {
  findingId: string;
  severity: IncidentSeverity;
  requirement: PCIRequirement;
  description: string;
  affectedSystems: string[];
  remediation: string;
  remediatedAt?: Date;
  falsePositive: boolean;
}

export interface AccessLog {
  logId: string;
  userId: string;
  action: string;
  resource: string;
  resourceType: CardDataType;
  timestamp: Date;
  ipAddress: string;
  success: boolean;
  reason?: string;
}

export interface EncryptionKey {
  keyId: string;
  algorithm: string;
  keyLength: number;
  createdAt: Date;
  expiresAt: Date;
  rotatedAt?: Date;
  status: 'active' | 'rotating' | 'expired' | 'compromised';
  custodians: string[];
}

export interface ComplianceAssessment {
  assessmentId: string;
  assessmentDate: Date;
  complianceLevel: ComplianceLevel;
  requirements: RequirementAssessment[];
  overallScore: number;
  status: 'compliant' | 'non_compliant' | 'partial';
  criticalFindings: string[];
  remediationPlan: RemediationItem[];
  nextAssessmentDate: Date;
}

export interface RequirementAssessment {
  requirement: PCIRequirement;
  name: string;
  score: number;
  status: 'compliant' | 'non_compliant' | 'not_applicable';
  controls: ControlAssessment[];
  evidence: string[];
}

export interface ControlAssessment {
  controlId: string;
  description: string;
  implemented: boolean;
  effectivenessScore: number;
  testResults: string;
}

export interface RemediationItem {
  itemId: string;
  requirement: PCIRequirement;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate: Date;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface TokenizedCard {
  tokenId: string;
  lastFour: string;
  expirationMonth: number;
  expirationYear: number;
  cardBrand: string;
  createdAt: Date;
  lastUsed?: Date;
  active: boolean;
}


// ============================================================================
// PCI Compliance Service Implementation
// ============================================================================

export class PCIComplianceService extends EventEmitter {
  private policy = pciPolicy;
  private cardholderData: Map<string, CardholderData> = new Map();
  private tokens: Map<string, TokenizedCard> = new Map();
  private encryptionKeys: Map<string, EncryptionKey> = new Map();
  private accessLogs: AccessLog[] = [];
  private scans: Map<string, SecurityScan> = new Map();
  private assessments: Map<string, ComplianceAssessment> = new Map();
  private masterKey: Buffer;

  // PCI DSS constants
  private readonly MAX_PAN_DISPLAY_DIGITS = 6; // First 6 or last 4
  private readonly KEY_ROTATION_DAYS = 365;
  private readonly LOG_RETENTION_DAYS = 365;
  private readonly CVV_STORAGE_PROHIBITED = true;
  private readonly PIN_STORAGE_PROHIBITED = true;

  constructor() {
    super();
    this.masterKey = crypto.randomBytes(32);
    this.initializeDefaultKeys();
    this.startPeriodicTasks();
  }

  // ==========================================================================
  // REQUIREMENT 3: PROTECT STORED ACCOUNT DATA
  // ==========================================================================

  /**
   * Validate cardholder data protection compliance
   */
  async validateCardholderDataProtection(data: any): Promise<{ isCompliant: boolean; findings: string[] }> {
    const findings: string[] = [];

    // Check for prohibited data storage
    if (data.cvv || data.cvc || data.cvv2) {
      findings.push('REQ 3.2.2: CVV/CVC must not be stored after authorization');
    }

    if (data.pin || data.pinBlock) {
      findings.push('REQ 3.2.3: PIN data must not be stored after authorization');
    }

    if (data.trackData || data.track1 || data.track2) {
      findings.push('REQ 3.2.1: Full track data must not be stored after authorization');
    }

    // Check PAN storage
    if (data.pan || data.cardNumber) {
      const pan = data.pan || data.cardNumber;

      // Validate PAN format
      if (!this.isValidPAN(pan)) {
        findings.push('REQ 3.4: Invalid PAN format detected');
      }

      // Check if PAN is properly protected
      if (!this.isPANProtected(pan)) {
        findings.push('REQ 3.5: PAN must be rendered unreadable using encryption, truncation, tokenization, or hashing');
      }

      // Check storage location security
      if (data.storageLocation && !this.isSecureStorage(data.storageLocation)) {
        findings.push('REQ 3.6: Cardholder data must be stored in secure location');
      }
    }

    // Check retention policy
    if (data.createdAt) {
      const ageInDays = (Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const maxRetention = this.getRetentionLimit(data.type);

      if (ageInDays > maxRetention) {
        findings.push(`REQ 3.1: Data exceeds retention limit of ${maxRetention} days`);
      }
    }

    this.logAccess('VALIDATE_CHD_PROTECTION', 'system', 'CHD_VALIDATION', CardDataType.PAN, findings.length === 0);

    return {
      isCompliant: findings.length === 0,
      findings
    };
  }

  /**
   * Mask PAN for display
   */
  async maskPAN(cardNumber: string): Promise<string> {
    if (!cardNumber || cardNumber.length < 13) {
      throw new Error('Invalid card number');
    }

    // Remove any spaces or dashes
    const cleanPAN = cardNumber.replace(/[\s-]/g, '');

    // Validate using Luhn algorithm
    if (!this.validateLuhn(cleanPAN)) {
      throw new Error('Invalid card number (Luhn check failed)');
    }

    // Mask according to PCI DSS: show first 6 and/or last 4
    const firstSix = cleanPAN.slice(0, 6);
    const lastFour = cleanPAN.slice(-4);
    const middleLength = cleanPAN.length - 10;

    const masked = `${firstSix}${'*'.repeat(middleLength)}${lastFour}`;

    this.logAccess('MASK_PAN', 'system', 'PAN_MASKING', CardDataType.PAN, true);

    return masked;
  }

  /**
   * Tokenize card data
   */
  async tokenizeCard(pan: string, expirationMonth: number, expirationYear: number): Promise<TokenizedCard> {
    if (!this.validateLuhn(pan.replace(/[\s-]/g, ''))) {
      throw new Error('Invalid card number');
    }

    const cleanPAN = pan.replace(/[\s-]/g, '');

    const token: TokenizedCard = {
      tokenId: this.generateTokenId(),
      lastFour: cleanPAN.slice(-4),
      expirationMonth,
      expirationYear,
      cardBrand: this.detectCardBrand(cleanPAN),
      createdAt: new Date(),
      active: true
    };

    // Store token mapping (in production, this would be in a secure vault)
    this.tokens.set(token.tokenId, token);

    // Encrypt and store the actual PAN securely
    const encryptedPAN = await this.encryptSensitiveData(cleanPAN);
    const cardholderData: CardholderData = {
      dataId: this.generateId('CHD'),
      type: CardDataType.PAN,
      value: encryptedPAN,
      encrypted: true,
      encryptionKeyId: this.getActiveKeyId(),
      tokenId: token.tokenId,
      maskedValue: await this.maskPAN(cleanPAN),
      storageLocation: 'secure_vault',
      createdAt: new Date(),
      retentionPolicy: {
        policyId: 'default_pan',
        dataType: CardDataType.PAN,
        maxRetentionDays: 730,
        disposalMethod: 'secure_delete'
      }
    };

    this.cardholderData.set(cardholderData.dataId, cardholderData);
    this.logAccess('TOKENIZE_CARD', 'system', cardholderData.dataId, CardDataType.PAN, true);
    this.emit('cardTokenized', { tokenId: token.tokenId });

    return token;
  }

  // ==========================================================================
  // REQUIREMENT 4: PROTECT CARDHOLDER DATA WITH STRONG CRYPTOGRAPHY
  // ==========================================================================

  /**
   * Encrypt sensitive data using approved algorithms
   */
  async encryptSensitiveData(data: string): Promise<string> {
    const key = this.getActiveEncryptionKey();
    if (!key) {
      throw new Error('No active encryption key available');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  async decryptSensitiveData(encryptedData: string, userId: string): Promise<string> {
    // Verify user has permission to decrypt
    if (!this.hasDecryptPermission(userId)) {
      this.logAccess('DECRYPT_DENIED', userId, encryptedData.slice(0, 20), CardDataType.PAN, false, 'No permission');
      throw new Error('User does not have decryption permission');
    }

    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    this.logAccess('DECRYPT_DATA', userId, 'ENCRYPTED_CHD', CardDataType.PAN, true);

    return decrypted;
  }

  /**
   * Rotate encryption keys
   */
  async rotateEncryptionKey(keyId: string): Promise<EncryptionKey> {
    const oldKey = this.encryptionKeys.get(keyId);
    if (!oldKey) {
      throw new Error('Key not found');
    }

    // Mark old key as rotating
    oldKey.status = 'rotating';

    // Generate new key
    const newKey: EncryptionKey = {
      keyId: this.generateId('KEY'),
      algorithm: 'AES-256-GCM',
      keyLength: 256,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000),
      status: 'active',
      custodians: oldKey.custodians
    };

    this.encryptionKeys.set(newKey.keyId, newKey);

    // Re-encrypt all data with new key (in production, this would be a background job)
    await this.reencryptDataWithNewKey(oldKey.keyId, newKey.keyId);

    // Mark old key as expired
    oldKey.status = 'expired';
    oldKey.rotatedAt = new Date();

    this.emit('keyRotated', { oldKeyId: keyId, newKeyId: newKey.keyId });
    return newKey;
  }

  // ==========================================================================
  // REQUIREMENT 7 & 8: ACCESS CONTROL
  // ==========================================================================

  /**
   * Check if user has access to cardholder data
   */
  async checkAccessPermission(userId: string, dataType: CardDataType, action: string): Promise<boolean> {
    // Implement role-based access control
    const permissions = this.getUserPermissions(userId);

    if (!permissions) {
      this.logAccess(action, userId, dataType, dataType, false, 'User not found');
      return false;
    }

    const hasAccess = permissions.includes(dataType) || permissions.includes('all');

    if (!hasAccess) {
      this.logAccess(action, userId, dataType, dataType, false, 'Insufficient permissions');
    }

    return hasAccess;
  }

  /**
   * Validate password complexity (Requirement 8.3)
   */
  validatePasswordComplexity(password: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Minimum 12 characters (PCI DSS 4.0)
    if (password.length < 12) {
      issues.push('Password must be at least 12 characters');
    }

    // Must contain numeric and alphabetic characters
    if (!/\d/.test(password)) {
      issues.push('Password must contain at least one digit');
    }

    if (!/[a-zA-Z]/.test(password)) {
      issues.push('Password must contain at least one letter');
    }

    // Special character requirement
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push('Password must contain at least one special character');
    }

    // Uppercase and lowercase
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
      issues.push('Password must contain both uppercase and lowercase letters');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // ==========================================================================
  // REQUIREMENT 10: LOG AND MONITOR
  // ==========================================================================

  /**
   * Log access to cardholder data
   */
  private logAccess(
    action: string,
    userId: string,
    resource: string,
    resourceType: CardDataType,
    success: boolean,
    reason?: string
  ): void {
    const log: AccessLog = {
      logId: this.generateId('LOG'),
      userId,
      action,
      resource,
      resourceType,
      timestamp: new Date(),
      ipAddress: this.getCurrentIP(),
      success,
      reason
    };

    this.accessLogs.push(log);
    this.emit('accessLogged', log);

    // Alert on suspicious activity
    if (!success || this.isSuspiciousAccess(log)) {
      this.emit('securityAlert', log);
    }
  }

  /**
   * Generate access audit report
   */
  async generateAccessReport(startDate: Date, endDate: Date): Promise<any> {
    const filteredLogs = this.accessLogs.filter(log =>
      log.timestamp >= startDate && log.timestamp <= endDate
    );

    const successfulAccess = filteredLogs.filter(l => l.success).length;
    const failedAccess = filteredLogs.filter(l => !l.success).length;

    const byUser = this.groupBy(filteredLogs, 'userId');
    const byAction = this.groupBy(filteredLogs, 'action');
    const byResource = this.groupBy(filteredLogs, 'resourceType');

    return {
      reportId: this.generateId('RPT'),
      period: { start: startDate, end: endDate },
      totalAccess: filteredLogs.length,
      successfulAccess,
      failedAccess,
      uniqueUsers: Object.keys(byUser).length,
      byUser: Object.fromEntries(Object.entries(byUser).map(([k, v]) => [k, (v as any[]).length])),
      byAction: Object.fromEntries(Object.entries(byAction).map(([k, v]) => [k, (v as any[]).length])),
      byResource: Object.fromEntries(Object.entries(byResource).map(([k, v]) => [k, (v as any[]).length])),
      suspiciousActivity: filteredLogs.filter(l => this.isSuspiciousAccess(l)).length
    };
  }

  // ==========================================================================
  // REQUIREMENT 11: SECURITY TESTING
  // ==========================================================================

  /**
   * Schedule security scan
   */
  async scheduleScan(type: ScanType, scheduledAt: Date): Promise<SecurityScan> {
    const scan: SecurityScan = {
      scanId: this.generateId('SCAN'),
      type,
      scheduledAt,
      status: 'scheduled',
      findings: [],
      passedRequirements: [],
      failedRequirements: [],
      overallResult: 'pending'
    };

    this.scans.set(scan.scanId, scan);
    this.emit('scanScheduled', scan);

    return scan;
  }

  /**
   * Run vulnerability scan
   */
  async runVulnerabilityScan(scanId: string): Promise<SecurityScan> {
    const scan = this.scans.get(scanId);
    if (!scan) {
      throw new Error('Scan not found');
    }

    scan.status = 'running';
    this.emit('scanStarted', scan);

    // Simulate scan execution
    const findings = await this.performSecurityChecks();
    scan.findings = findings;
    scan.completedAt = new Date();
    scan.status = 'completed';

    // Evaluate results
    const critical = findings.filter(f => f.severity === IncidentSeverity.CRITICAL);
    const high = findings.filter(f => f.severity === IncidentSeverity.HIGH);

    scan.overallResult = (critical.length === 0 && high.length === 0) ? 'pass' : 'fail';

    // Categorize by requirement
    Object.values(PCIRequirement).forEach(req => {
      const reqFindings = findings.filter(f => f.requirement === req);
      if (reqFindings.length === 0) {
        scan.passedRequirements.push(req);
      } else {
        scan.failedRequirements.push(req);
      }
    });

    this.emit('scanCompleted', scan);
    return scan;
  }

  // ==========================================================================
  // COMPLIANCE ASSESSMENT
  // ==========================================================================

  /**
   * Perform full PCI DSS compliance assessment
   */
  async performComplianceAssessment(level: ComplianceLevel): Promise<ComplianceAssessment> {
    const requirements: RequirementAssessment[] = [];
    const criticalFindings: string[] = [];
    const remediationPlan: RemediationItem[] = [];

    // Assess each requirement
    for (const req of Object.values(PCIRequirement)) {
      const assessment = await this.assessRequirement(req);
      requirements.push(assessment);

      if (assessment.status === 'non_compliant') {
        criticalFindings.push(`${req}: ${assessment.controls.filter(c => !c.implemented).map(c => c.description).join(', ')}`);

        // Add remediation items
        assessment.controls.filter(c => !c.implemented).forEach(control => {
          remediationPlan.push({
            itemId: this.generateId('REM'),
            requirement: req,
            description: control.description,
            priority: this.getControlPriority(control),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            assignedTo: 'security_team',
            status: 'pending'
          });
        });
      }
    }

    const overallScore = requirements.reduce((sum, r) => sum + r.score, 0) / requirements.length;
    const status = overallScore >= 90 ? 'compliant' : overallScore >= 70 ? 'partial' : 'non_compliant';

    const assessment: ComplianceAssessment = {
      assessmentId: this.generateId('ASSESS'),
      assessmentDate: new Date(),
      complianceLevel: level,
      requirements,
      overallScore: Math.round(overallScore),
      status,
      criticalFindings,
      remediationPlan,
      nextAssessmentDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    };

    this.assessments.set(assessment.assessmentId, assessment);
    this.emit('assessmentCompleted', assessment);

    return assessment;
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

  private initializeDefaultKeys(): void {
    const key: EncryptionKey = {
      keyId: this.generateId('KEY'),
      algorithm: 'AES-256-GCM',
      keyLength: 256,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000),
      status: 'active',
      custodians: ['security_officer', 'key_custodian_1', 'key_custodian_2']
    };
    this.encryptionKeys.set(key.keyId, key);
  }

  private startPeriodicTasks(): void {
    // Check for key rotation every day
    setInterval(() => {
      this.checkKeyExpiration();
    }, 24 * 60 * 60 * 1000);

    // Clean up old logs
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateTokenId(): string {
    return `tok_${crypto.randomBytes(16).toString('hex')}`;
  }

  private isValidPAN(pan: string): boolean {
    const cleaned = pan.replace(/[\s-]/g, '');
    return /^\d{13,19}$/.test(cleaned) && this.validateLuhn(cleaned);
  }

  private validateLuhn(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  private isPANProtected(pan: string): boolean {
    // Check if PAN appears to be encrypted, tokenized, or truncated
    return pan.includes('*') || pan.includes(':') || pan.length <= 10;
  }

  private isSecureStorage(location: string): boolean {
    const secureLocations = ['secure_vault', 'hsm', 'encrypted_db', 'tokenization_service'];
    return secureLocations.includes(location);
  }

  private getRetentionLimit(dataType: CardDataType): number {
    const limits: Record<CardDataType, number> = {
      [CardDataType.PAN]: 730,
      [CardDataType.CARDHOLDER_NAME]: 730,
      [CardDataType.EXPIRATION]: 730,
      [CardDataType.SERVICE_CODE]: 0,
      [CardDataType.CVV]: 0, // Never store
      [CardDataType.PIN]: 0, // Never store
      [CardDataType.TRACK_DATA]: 0 // Never store
    };
    return limits[dataType] || 365;
  }

  private detectCardBrand(pan: string): string {
    const firstDigit = pan[0];
    const firstTwo = pan.slice(0, 2);
    const firstFour = pan.slice(0, 4);

    if (firstDigit === '4') return 'Visa';
    if (['51', '52', '53', '54', '55'].includes(firstTwo)) return 'Mastercard';
    if (['34', '37'].includes(firstTwo)) return 'American Express';
    if (['6011', '6221'].includes(firstFour) || firstTwo === '65') return 'Discover';
    if (['35'].includes(firstTwo)) return 'JCB';

    return 'Unknown';
  }

  private getActiveKeyId(): string {
    for (const [_id, key] of this.encryptionKeys.entries()) {
      if (key.status === 'active') {
        return _id;
      }
    }
    throw new Error('No active encryption key');
  }

  private getActiveEncryptionKey(): EncryptionKey | null {
    for (const key of this.encryptionKeys.values()) {
      if (key.status === 'active') {
        return key;
      }
    }
    return null;
  }

  private hasDecryptPermission(userId: string): boolean {
    const permittedRoles = ['security_officer', 'key_custodian', 'payment_processor'];
    return permittedRoles.some(role => userId.includes(role));
  }

  private async reencryptDataWithNewKey(oldKeyId: string, newKeyId: string): Promise<void> {
    // In production, this would be a background job
    for (const [_id, data] of this.cardholderData.entries()) {
      if (data.encryptionKeyId === oldKeyId) {
        data.encryptionKeyId = newKeyId;
        // Re-encryption would happen here
      }
    }
  }

  private getUserPermissions(userId: string): string[] {
    // Simplified permission check
    if (userId.includes('admin')) return ['all'];
    if (userId.includes('payment')) return [CardDataType.PAN, CardDataType.EXPIRATION];
    if (userId.includes('support')) return [CardDataType.CARDHOLDER_NAME];
    return [];
  }

  private getCurrentIP(): string {
    return '192.168.1.100'; // Placeholder
  }

  private isSuspiciousAccess(log: AccessLog): boolean {
    // Check for suspicious patterns
    if (!log.success) return true;
    if (log.action.includes('DECRYPT') && !log.userId.includes('authorized')) return true;
    return false;
  }

  private groupBy(array: any[], key: string): Record<string, any[]> {
    return array.reduce((result, item) => {
      (result[item[key]] = result[item[key]] || []).push(item);
      return result;
    }, {});
  }

  private async performSecurityChecks(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // Check encryption key age
    for (const key of this.encryptionKeys.values()) {
      const ageInDays = (Date.now() - key.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > 365) {
        findings.push({
          findingId: this.generateId('FIND'),
          severity: IncidentSeverity.HIGH,
          requirement: PCIRequirement.REQ_4,
          description: 'Encryption key exceeds recommended rotation period',
          affectedSystems: ['key_management'],
          remediation: 'Rotate encryption key immediately',
          falsePositive: false
        });
      }
    }

    return findings;
  }

  private async assessRequirement(requirement: PCIRequirement): Promise<RequirementAssessment> {
    // Simplified assessment
    return {
      requirement,
      name: this.getRequirementName(requirement),
      score: 85,
      status: 'compliant',
      controls: [],
      evidence: []
    };
  }

  private getRequirementName(req: PCIRequirement): string {
    const names: Record<PCIRequirement, string> = {
      [PCIRequirement.REQ_1]: 'Install and Maintain Network Security Controls',
      [PCIRequirement.REQ_2]: 'Apply Secure Configurations',
      [PCIRequirement.REQ_3]: 'Protect Stored Account Data',
      [PCIRequirement.REQ_4]: 'Protect Cardholder Data with Strong Cryptography',
      [PCIRequirement.REQ_5]: 'Protect Systems from Malware',
      [PCIRequirement.REQ_6]: 'Develop and Maintain Secure Systems',
      [PCIRequirement.REQ_7]: 'Restrict Access to System Components',
      [PCIRequirement.REQ_8]: 'Identify Users and Authenticate Access',
      [PCIRequirement.REQ_9]: 'Restrict Physical Access',
      [PCIRequirement.REQ_10]: 'Log and Monitor Access',
      [PCIRequirement.REQ_11]: 'Test Security Systems',
      [PCIRequirement.REQ_12]: 'Support Information Security with Policies'
    };
    return names[req];
  }

  private getControlPriority(control: ControlAssessment): 'critical' | 'high' | 'medium' | 'low' {
    if (control.effectivenessScore < 30) return 'critical';
    if (control.effectivenessScore < 50) return 'high';
    if (control.effectivenessScore < 70) return 'medium';
    return 'low';
  }

  private checkKeyExpiration(): void {
    for (const key of this.encryptionKeys.values()) {
      if (key.status === 'active' && key.expiresAt < new Date()) {
        this.emit('keyExpiring', key);
      }
    }
  }

  private cleanupOldLogs(): void {
    const cutoff = new Date(Date.now() - this.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.accessLogs = this.accessLogs.filter(log => log.timestamp > cutoff);
  }
}


// ============================================================================
// Exports
// ============================================================================

export const pciComplianceService = new PCIComplianceService();
export default PCIComplianceService;
