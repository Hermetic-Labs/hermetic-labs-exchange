/**
 * ITAR Compliance Service
 *
 * Implements International Traffic in Arms Regulations (ITAR) compliance
 * controls for defense articles, technical data, and defense services.
 *
 * ITAR is administered by the U.S. Department of State, Directorate of
 * Defense Trade Controls (DDTC).
 */

import { EventEmitter } from './EventEmitter';
import crypto from '../../_shared/crypto';

// ============================================================================
// Type Definitions
// ============================================================================

export type USMLCategory =
  | 'I' // Firearms, Close Assault Weapons
  | 'II' // Guns and Armament
  | 'III' // Ammunition/Ordnance
  | 'IV' // Launch Vehicles, Guided Missiles
  | 'V' // Explosives and Energetic Materials
  | 'VI' // Surface Vessels of War
  | 'VII' // Ground Vehicles
  | 'VIII' // Aircraft and Related Articles
  | 'IX' // Military Training Equipment
  | 'X' // Personal Protective Equipment
  | 'XI' // Military Electronics
  | 'XII' // Fire Control, Range Finder
  | 'XIII' // Materials and Miscellaneous
  | 'XIV' // Toxicological Agents
  | 'XV' // Spacecraft and Related
  | 'XVI' // Nuclear Weapons Related
  | 'XVII' // Classified Articles
  | 'XVIII' // Directed Energy Weapons
  | 'XIX' // Gas Turbine Engines
  | 'XX' // Submersible Vessels
  | 'XXI' // Articles and Services not Otherwise Enumerated;

export type PersonStatus = 'us_citizen' | 'permanent_resident' | 'protected_individual' | 'foreign_national' | 'unknown';

export type LicenseType =
  | 'DSP-5' // Permanent export
  | 'DSP-61' // Temporary import
  | 'DSP-73' // Temporary export
  | 'DSP-85' // Amendment
  | 'TAA' // Technical Assistance Agreement
  | 'MLA' // Manufacturing License Agreement
  | 'WDA'; // Warehouse Distribution Agreement

export type ScreeningResult = 'clear' | 'match' | 'potential_match' | 'error';

export type AccessDecision = 'granted' | 'denied' | 'pending_verification';

export interface USPerson {
  personId: string;
  fullName: string;
  status: PersonStatus;
  citizenshipCountry: string;
  verificationDate: Date;
  verificationMethod: string;
  documentType?: string;
  documentNumber?: string;
  employerId?: string;
  clearanceLevel?: string;
  expirationDate?: Date;
  isActive: boolean;
  verifiedBy: string;
}

export interface DeniedPartyRecord {
  entityName: string;
  aliases: string[];
  listType: 'DPL' | 'SDN' | 'ENTITY' | 'UNVERIFIED' | 'DEBARRED' | 'NONPROLIFERATION';
  country: string;
  address?: string;
  matchScore: number;
  effectiveDate: Date;
  expirationDate?: Date;
  federalRegisterNotice?: string;
  sourceList: string;
}

export interface DefenseArticle {
  articleId: string;
  description: string;
  usmlCategory: USMLCategory;
  classification: 'unclassified' | 'cui' | 'confidential' | 'secret' | 'top_secret';
  technicalDataIncluded: boolean;
  significantMilitaryEquipment: boolean;
  eccn?: string; // Export Control Classification Number (for EAR items)
  registrationNumber?: string;
  createdAt: Date;
  createdBy: string;
  lastReviewedAt?: Date;
  lastReviewedBy?: string;
}

export interface ExportLicense {
  licenseId: string;
  licenseNumber?: string;
  licenseType: LicenseType;
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'denied' | 'expired' | 'revoked';
  applicant: string;
  consignee: string;
  endUser: string;
  endUserCountry: string;
  articles: string[]; // articleId references
  totalValue: number;
  validFrom?: Date;
  validUntil?: Date;
  provisos: string[];
  createdAt: Date;
  submittedAt?: Date;
  approvedAt?: Date;
  deniedReason?: string;
}

export interface TechnologyControlPlan {
  tcpId: string;
  projectName: string;
  description: string;
  classification: 'unclassified' | 'cui' | 'confidential' | 'secret' | 'top_secret';
  usmlCategories: USMLCategory[];
  authorizedPersonnel: string[]; // personId references
  physicalSecurityMeasures: string[];
  itSecurityMeasures: string[];
  accessControlProcedures: string[];
  disposalProcedures: string[];
  trainingRequirements: string[];
  effectiveDate: Date;
  reviewDate: Date;
  approvedBy: string;
  status: 'draft' | 'active' | 'expired' | 'superseded';
}

export interface AccessRequest {
  requestId: string;
  personId: string;
  articleId: string;
  purpose: string;
  requestedAt: Date;
  decision: AccessDecision;
  decidedAt?: Date;
  decidedBy?: string;
  denialReason?: string;
  accessGrantedUntil?: Date;
  conditions?: string[];
}

export interface ScreeningRecord {
  screeningId: string;
  entityName: string;
  entityType: 'individual' | 'organization';
  screenedAt: Date;
  result: ScreeningResult;
  listsChecked: string[];
  matches: DeniedPartyRecord[];
  screenedBy: string;
  notes?: string;
  overridden: boolean;
  overrideReason?: string;
  overrideApprovedBy?: string;
}

export interface ViolationReport {
  violationId: string;
  type: 'unauthorized_access' | 'unauthorized_export' | 'disclosure' | 'screening_bypass' | 'other';
  severity: 'minor' | 'significant' | 'major' | 'willful';
  description: string;
  involvedPersons: string[];
  involvedArticles: string[];
  discoveredAt: Date;
  discoveredBy: string;
  reportedToDDTC: boolean;
  reportedAt?: Date;
  correctiveActions: string[];
  status: 'open' | 'investigating' | 'remediated' | 'closed' | 'reported';
  voluntaryDisclosure: boolean;
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
  details: Record<string, any>;
}

export interface TrainingRecord {
  recordId: string;
  personId: string;
  trainingType: 'initial' | 'annual_refresh' | 'specialized';
  courseTitle: string;
  completedAt: Date;
  expiresAt: Date;
  score?: number;
  passed: boolean;
  certificateId?: string;
}

export interface ValidationResult {
  isCompliant: boolean;
  usPersonVerified: boolean;
  screeningPassed: boolean;
  trainingCurrent: boolean;
  accessAuthorized: boolean;
  findings: string[];
}

// ============================================================================
// ITAR Compliance Service
// ============================================================================

export class ITARComplianceService extends EventEmitter {
  private usPersons: Map<string, USPerson> = new Map();
  private defenseArticles: Map<string, DefenseArticle> = new Map();
  private exportLicenses: Map<string, ExportLicense> = new Map();
  private technologyControlPlans: Map<string, TechnologyControlPlan> = new Map();
  private accessRequests: Map<string, AccessRequest> = new Map();
  private screeningRecords: Map<string, ScreeningRecord> = new Map();
  private violations: Map<string, ViolationReport> = new Map();
  private trainingRecords: Map<string, TrainingRecord[]> = new Map();
  private auditLog: AuditLogEntry[] = [];

  // Denied parties list (simulated)
  private deniedParties: DeniedPartyRecord[] = [];

  // USML Category descriptions
  private usmlDescriptions: Record<USMLCategory, string> = {
    'I': 'Firearms, Close Assault Weapons and Combat Shotguns',
    'II': 'Guns and Armament',
    'III': 'Ammunition/Ordnance',
    'IV': 'Launch Vehicles, Guided Missiles, Ballistic Missiles',
    'V': 'Explosives and Energetic Materials',
    'VI': 'Surface Vessels of War and Special Naval Equipment',
    'VII': 'Ground Vehicles',
    'VIII': 'Aircraft and Related Articles',
    'IX': 'Military Training Equipment and Training',
    'X': 'Personal Protective Equipment',
    'XI': 'Military Electronics',
    'XII': 'Fire Control, Range Finder, Optical and Guidance',
    'XIII': 'Materials and Miscellaneous Articles',
    'XIV': 'Toxicological Agents',
    'XV': 'Spacecraft and Related Articles',
    'XVI': 'Nuclear Weapons Related Articles',
    'XVII': 'Classified Articles, Technical Data and Defense Services',
    'XVIII': 'Directed Energy Weapons',
    'XIX': 'Gas Turbine Engines and Associated Equipment',
    'XX': 'Submersible Vessels and Related Articles',
    'XXI': 'Articles, Technical Data and Defense Services Not Otherwise Enumerated'
  };

  constructor() {
    super();
    this.initializeDeniedParties();
  }

  private initializeDeniedParties(): void {
    // Initialize with sample denied parties for testing
    this.deniedParties = [
      {
        entityName: 'Example Prohibited Entity',
        aliases: ['EPE', 'Example PE'],
        listType: 'SDN',
        country: 'XX',
        matchScore: 1.0,
        effectiveDate: new Date('2020-01-01'),
        sourceList: 'OFAC SDN'
      }
    ];
  }

  // ============================================================================
  // Policy Access
  // ============================================================================

  getPolicy(): Record<string, any> {
    return {
      regulation: 'ITAR',
      authority: '22 CFR Parts 120-130',
      administrator: 'Directorate of Defense Trade Controls (DDTC)',
      agency: 'U.S. Department of State',
      usmlCategories: Object.entries(this.usmlDescriptions).map(([cat, desc]) => ({
        category: cat,
        description: desc
      })),
      usPersonRequired: true,
      screeningRequired: true,
      trainingRequired: true
    };
  }

  // ============================================================================
  // Access Validation
  // ============================================================================

  async validateAccess(userId: string, resourceId: string): Promise<ValidationResult> {
    const findings: string[] = [];

    // Check US Person status
    const _person = this.usPersons.get(userId);
    const usPersonVerified = await this.verifyUSPerson(userId);

    if (!usPersonVerified) {
      findings.push('User is not verified as a U.S. Person');
    }

    // Check screening status
    const screeningPassed = await this.checkRecentScreening(userId);
    if (!screeningPassed) {
      findings.push('User has not passed recent denied party screening');
    }

    // Check training status
    const trainingCurrent = await this.verifyTrainingCurrent(userId);
    if (!trainingCurrent) {
      findings.push('User ITAR training is not current');
    }

    // Check access authorization
    const article = this.defenseArticles.get(resourceId);
    let accessAuthorized = false;

    if (article) {
      // Check TCP authorization
      const authorizedTCPs = Array.from(this.technologyControlPlans.values())
        .filter(tcp =>
          tcp.status === 'active' &&
          tcp.usmlCategories.includes(article.usmlCategory) &&
          tcp.authorizedPersonnel.includes(userId)
        );

      if (authorizedTCPs.length > 0) {
        accessAuthorized = true;
      } else {
        findings.push('User is not authorized under any active Technology Control Plan');
      }
    } else {
      findings.push('Resource not found in defense articles registry');
    }

    const isCompliant = usPersonVerified && screeningPassed && trainingCurrent && accessAuthorized;

    this.logAuditEvent('access', 'validation', userId, isCompliant ? 'success' : 'failure', {
      resourceId,
      usPersonVerified,
      screeningPassed,
      trainingCurrent,
      accessAuthorized
    });

    this.emit('access:validated', {
      userId,
      resourceId,
      isCompliant,
      timestamp: new Date()
    });

    return {
      isCompliant,
      usPersonVerified,
      screeningPassed,
      trainingCurrent,
      accessAuthorized,
      findings
    };
  }

  // ============================================================================
  // US Person Verification
  // ============================================================================

  async verifyUSPerson(userId: string): Promise<boolean> {
    const person = this.usPersons.get(userId);

    if (!person) {
      return false;
    }

    if (!person.isActive) {
      return false;
    }

    if (person.expirationDate && person.expirationDate < new Date()) {
      return false;
    }

    const validStatuses: PersonStatus[] = ['us_citizen', 'permanent_resident', 'protected_individual'];
    return validStatuses.includes(person.status);
  }

  async registerUSPerson(
    personId: string,
    fullName: string,
    status: PersonStatus,
    citizenshipCountry: string,
    verificationMethod: string,
    verifiedBy: string,
    options: {
      documentType?: string;
      documentNumber?: string;
      employerId?: string;
      clearanceLevel?: string;
    } = {}
  ): Promise<USPerson> {
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setFullYear(expirationDate.getFullYear() + 1); // Re-verification required annually

    const person: USPerson = {
      personId,
      fullName,
      status,
      citizenshipCountry,
      verificationDate: now,
      verificationMethod,
      documentType: options.documentType,
      documentNumber: options.documentNumber,
      employerId: options.employerId,
      clearanceLevel: options.clearanceLevel,
      expirationDate,
      isActive: true,
      verifiedBy
    };

    this.usPersons.set(personId, person);

    this.logAuditEvent('person', 'registered', personId, 'success', {
      status,
      verificationMethod
    });

    this.emit('person:registered', { personId, status, timestamp: now });

    return person;
  }

  async deactivateUSPerson(personId: string, reason: string): Promise<boolean> {
    const person = this.usPersons.get(personId);

    if (!person) {
      return false;
    }

    person.isActive = false;

    this.logAuditEvent('person', 'deactivated', personId, 'success', { reason });
    this.emit('person:deactivated', { personId, reason, timestamp: new Date() });

    return true;
  }

  getUSPerson(personId: string): USPerson | undefined {
    return this.usPersons.get(personId);
  }

  // ============================================================================
  // Denied Party Screening
  // ============================================================================

  async screenDeniedParties(entityName: string, entityType: 'individual' | 'organization' = 'individual'): Promise<boolean> {
    const screeningId = `SCR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();

    const matches: DeniedPartyRecord[] = [];

    // Check against all denied parties lists
    const normalizedName = entityName.toLowerCase().trim();

    for (const party of this.deniedParties) {
      const partyName = party.entityName.toLowerCase();
      const aliasMatch = party.aliases.some(a => a.toLowerCase() === normalizedName);

      if (partyName === normalizedName || aliasMatch) {
        matches.push({ ...party, matchScore: 1.0 });
      } else if (partyName.includes(normalizedName) || normalizedName.includes(partyName)) {
        matches.push({ ...party, matchScore: 0.7 });
      } else {
        // Fuzzy matching (simplified)
        const similarity = this.calculateSimilarity(normalizedName, partyName);
        if (similarity > 0.8) {
          matches.push({ ...party, matchScore: similarity });
        }
      }
    }

    const result: ScreeningResult = matches.length > 0
      ? (matches.some(m => m.matchScore >= 0.95) ? 'match' : 'potential_match')
      : 'clear';

    const record: ScreeningRecord = {
      screeningId,
      entityName,
      entityType,
      screenedAt: now,
      result,
      listsChecked: ['OFAC SDN', 'DPL', 'Entity List', 'Unverified List', 'Debarred List'],
      matches,
      screenedBy: 'system',
      overridden: false
    };

    this.screeningRecords.set(screeningId, record);

    this.logAuditEvent('screening', 'performed', screeningId, 'success', {
      entityName,
      result,
      matchCount: matches.length
    });

    this.emit('screening:completed', { screeningId, result, timestamp: now });

    return result === 'clear';
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const set1 = new Set(str1.split(' '));
    const set2 = new Set(str2.split(' '));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private async checkRecentScreening(personId: string): Promise<boolean> {
    const person = this.usPersons.get(personId);
    if (!person) return false;

    // Find most recent screening
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const record of this.screeningRecords.values()) {
      if (
        record.entityName.toLowerCase() === person.fullName.toLowerCase() &&
        record.screenedAt >= thirtyDaysAgo &&
        (record.result === 'clear' || record.overridden)
      ) {
        return true;
      }
    }

    return false;
  }

  async overrideScreening(
    screeningId: string,
    reason: string,
    approvedBy: string
  ): Promise<ScreeningRecord | undefined> {
    const record = this.screeningRecords.get(screeningId);

    if (!record) {
      return undefined;
    }

    record.overridden = true;
    record.overrideReason = reason;
    record.overrideApprovedBy = approvedBy;

    this.logAuditEvent('screening', 'overridden', screeningId, 'success', {
      reason,
      approvedBy
    });

    this.emit('screening:overridden', { screeningId, approvedBy, timestamp: new Date() });

    return record;
  }

  getScreeningRecord(screeningId: string): ScreeningRecord | undefined {
    return this.screeningRecords.get(screeningId);
  }

  // ============================================================================
  // Defense Article Management
  // ============================================================================

  async registerDefenseArticle(
    articleId: string,
    description: string,
    usmlCategory: USMLCategory,
    classification: DefenseArticle['classification'],
    createdBy: string,
    options: {
      technicalDataIncluded?: boolean;
      significantMilitaryEquipment?: boolean;
      eccn?: string;
      registrationNumber?: string;
    } = {}
  ): Promise<DefenseArticle> {
    const now = new Date();

    const article: DefenseArticle = {
      articleId,
      description,
      usmlCategory,
      classification,
      technicalDataIncluded: options.technicalDataIncluded ?? false,
      significantMilitaryEquipment: options.significantMilitaryEquipment ?? false,
      eccn: options.eccn,
      registrationNumber: options.registrationNumber,
      createdAt: now,
      createdBy
    };

    this.defenseArticles.set(articleId, article);

    this.logAuditEvent('article', 'registered', articleId, 'success', {
      usmlCategory,
      classification
    });

    this.emit('article:registered', { articleId, usmlCategory, timestamp: now });

    return article;
  }

  async reviewDefenseArticle(articleId: string, reviewedBy: string): Promise<DefenseArticle | undefined> {
    const article = this.defenseArticles.get(articleId);

    if (!article) {
      return undefined;
    }

    article.lastReviewedAt = new Date();
    article.lastReviewedBy = reviewedBy;

    this.logAuditEvent('article', 'reviewed', articleId, 'success', { reviewedBy });

    return article;
  }

  getDefenseArticle(articleId: string): DefenseArticle | undefined {
    return this.defenseArticles.get(articleId);
  }

  getArticlesByCategory(category: USMLCategory): DefenseArticle[] {
    return Array.from(this.defenseArticles.values())
      .filter(a => a.usmlCategory === category);
  }

  // ============================================================================
  // Export License Management
  // ============================================================================

  async createExportLicense(
    licenseType: LicenseType,
    applicant: string,
    consignee: string,
    endUser: string,
    endUserCountry: string,
    articles: string[],
    totalValue: number
  ): Promise<ExportLicense> {
    const licenseId = `LIC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();

    const license: ExportLicense = {
      licenseId,
      licenseType,
      status: 'draft',
      applicant,
      consignee,
      endUser,
      endUserCountry,
      articles,
      totalValue,
      provisos: [],
      createdAt: now
    };

    this.exportLicenses.set(licenseId, license);

    this.logAuditEvent('license', 'created', licenseId, 'success', {
      licenseType,
      endUserCountry,
      totalValue
    });

    this.emit('license:created', { licenseId, licenseType, timestamp: now });

    return license;
  }

  async submitExportLicense(licenseId: string): Promise<ExportLicense | undefined> {
    const license = this.exportLicenses.get(licenseId);

    if (!license || license.status !== 'draft') {
      return undefined;
    }

    license.status = 'submitted';
    license.submittedAt = new Date();

    this.logAuditEvent('license', 'submitted', licenseId, 'success', {});

    this.emit('license:submitted', { licenseId, timestamp: new Date() });

    return license;
  }

  async approveExportLicense(
    licenseId: string,
    licenseNumber: string,
    validFrom: Date,
    validUntil: Date,
    provisos: string[] = []
  ): Promise<ExportLicense | undefined> {
    const license = this.exportLicenses.get(licenseId);

    if (!license) {
      return undefined;
    }

    license.status = 'approved';
    license.licenseNumber = licenseNumber;
    license.validFrom = validFrom;
    license.validUntil = validUntil;
    license.provisos = provisos;
    license.approvedAt = new Date();

    this.logAuditEvent('license', 'approved', licenseId, 'success', {
      licenseNumber,
      validUntil: validUntil.toISOString()
    });

    this.emit('license:approved', { licenseId, licenseNumber, timestamp: new Date() });

    return license;
  }

  async denyExportLicense(licenseId: string, reason: string): Promise<ExportLicense | undefined> {
    const license = this.exportLicenses.get(licenseId);

    if (!license) {
      return undefined;
    }

    license.status = 'denied';
    license.deniedReason = reason;

    this.logAuditEvent('license', 'denied', licenseId, 'success', { reason });

    this.emit('license:denied', { licenseId, reason, timestamp: new Date() });

    return license;
  }

  getExportLicense(licenseId: string): ExportLicense | undefined {
    return this.exportLicenses.get(licenseId);
  }

  // ============================================================================
  // Technology Control Plan Management
  // ============================================================================

  async createTechnologyControlPlan(
    projectName: string,
    description: string,
    classification: TechnologyControlPlan['classification'],
    usmlCategories: USMLCategory[],
    authorizedPersonnel: string[],
    approvedBy: string,
    options: {
      physicalSecurityMeasures?: string[];
      itSecurityMeasures?: string[];
      accessControlProcedures?: string[];
      disposalProcedures?: string[];
      trainingRequirements?: string[];
    } = {}
  ): Promise<TechnologyControlPlan> {
    const tcpId = `TCP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();
    const reviewDate = new Date(now);
    reviewDate.setFullYear(reviewDate.getFullYear() + 1);

    const tcp: TechnologyControlPlan = {
      tcpId,
      projectName,
      description,
      classification,
      usmlCategories,
      authorizedPersonnel,
      physicalSecurityMeasures: options.physicalSecurityMeasures || [],
      itSecurityMeasures: options.itSecurityMeasures || [],
      accessControlProcedures: options.accessControlProcedures || [],
      disposalProcedures: options.disposalProcedures || [],
      trainingRequirements: options.trainingRequirements || [],
      effectiveDate: now,
      reviewDate,
      approvedBy,
      status: 'active'
    };

    this.technologyControlPlans.set(tcpId, tcp);

    this.logAuditEvent('tcp', 'created', tcpId, 'success', {
      projectName,
      classification,
      authorizedCount: authorizedPersonnel.length
    });

    this.emit('tcp:created', { tcpId, projectName, timestamp: now });

    return tcp;
  }

  async addPersonnelToTCP(tcpId: string, personId: string): Promise<TechnologyControlPlan | undefined> {
    const tcp = this.technologyControlPlans.get(tcpId);

    if (!tcp) {
      return undefined;
    }

    // Verify person is a US Person
    const isUSPerson = await this.verifyUSPerson(personId);
    if (!isUSPerson) {
      this.logAuditEvent('tcp', 'add_personnel_failed', tcpId, 'failure', {
        personId,
        reason: 'Not verified as US Person'
      });
      return undefined;
    }

    if (!tcp.authorizedPersonnel.includes(personId)) {
      tcp.authorizedPersonnel.push(personId);

      this.logAuditEvent('tcp', 'personnel_added', tcpId, 'success', { personId });
      this.emit('tcp:personnel_added', { tcpId, personId, timestamp: new Date() });
    }

    return tcp;
  }

  async removePersonnelFromTCP(tcpId: string, personId: string): Promise<TechnologyControlPlan | undefined> {
    const tcp = this.technologyControlPlans.get(tcpId);

    if (!tcp) {
      return undefined;
    }

    tcp.authorizedPersonnel = tcp.authorizedPersonnel.filter(p => p !== personId);

    this.logAuditEvent('tcp', 'personnel_removed', tcpId, 'success', { personId });
    this.emit('tcp:personnel_removed', { tcpId, personId, timestamp: new Date() });

    return tcp;
  }

  async expireTCP(tcpId: string): Promise<TechnologyControlPlan | undefined> {
    const tcp = this.technologyControlPlans.get(tcpId);

    if (!tcp) {
      return undefined;
    }

    tcp.status = 'expired';

    this.logAuditEvent('tcp', 'expired', tcpId, 'success', {});
    this.emit('tcp:expired', { tcpId, timestamp: new Date() });

    return tcp;
  }

  getTCP(tcpId: string): TechnologyControlPlan | undefined {
    return this.technologyControlPlans.get(tcpId);
  }

  getActiveTCPs(): TechnologyControlPlan[] {
    return Array.from(this.technologyControlPlans.values())
      .filter(tcp => tcp.status === 'active');
  }

  // ============================================================================
  // Training Management
  // ============================================================================

  async recordTraining(
    personId: string,
    trainingType: TrainingRecord['trainingType'],
    courseTitle: string,
    score?: number
  ): Promise<TrainingRecord> {
    const recordId = `TRN-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const passed = score === undefined || score >= 80;

    const record: TrainingRecord = {
      recordId,
      personId,
      trainingType,
      courseTitle,
      completedAt: now,
      expiresAt,
      score,
      passed
    };

    const personRecords = this.trainingRecords.get(personId) || [];
    personRecords.push(record);
    this.trainingRecords.set(personId, personRecords);

    this.logAuditEvent('training', 'recorded', recordId, 'success', {
      personId,
      trainingType,
      passed
    });

    this.emit('training:completed', { recordId, personId, passed, timestamp: now });

    return record;
  }

  async verifyTrainingCurrent(personId: string): Promise<boolean> {
    const records = this.trainingRecords.get(personId);

    if (!records || records.length === 0) {
      return false;
    }

    const now = new Date();

    // Check for valid training
    return records.some(r =>
      r.passed &&
      r.expiresAt > now &&
      (r.trainingType === 'initial' || r.trainingType === 'annual_refresh')
    );
  }

  getTrainingRecords(personId: string): TrainingRecord[] {
    return this.trainingRecords.get(personId) || [];
  }

  // ============================================================================
  // Violation Reporting
  // ============================================================================

  async reportViolation(
    type: ViolationReport['type'],
    severity: ViolationReport['severity'],
    description: string,
    discoveredBy: string,
    involvedPersons: string[] = [],
    involvedArticles: string[] = []
  ): Promise<ViolationReport> {
    const violationId = `VIO-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();

    const violation: ViolationReport = {
      violationId,
      type,
      severity,
      description,
      involvedPersons,
      involvedArticles,
      discoveredAt: now,
      discoveredBy,
      reportedToDDTC: false,
      correctiveActions: [],
      status: 'open',
      voluntaryDisclosure: false
    };

    this.violations.set(violationId, violation);

    this.logAuditEvent('violation', 'reported', violationId, 'success', {
      type,
      severity
    });

    this.emit('violation:reported', { violationId, severity, timestamp: now });

    // For major or willful violations, emit critical alert
    if (severity === 'major' || severity === 'willful') {
      this.emit('violation:critical', { violation, timestamp: now });
    }

    return violation;
  }

  async submitVoluntaryDisclosure(violationId: string): Promise<ViolationReport | undefined> {
    const violation = this.violations.get(violationId);

    if (!violation) {
      return undefined;
    }

    violation.voluntaryDisclosure = true;
    violation.reportedToDDTC = true;
    violation.reportedAt = new Date();
    violation.status = 'reported';

    this.logAuditEvent('violation', 'disclosed', violationId, 'success', {});

    this.emit('violation:disclosed', { violationId, timestamp: new Date() });

    return violation;
  }

  async addCorrectiveAction(violationId: string, action: string): Promise<ViolationReport | undefined> {
    const violation = this.violations.get(violationId);

    if (!violation) {
      return undefined;
    }

    violation.correctiveActions.push(action);

    this.logAuditEvent('violation', 'corrective_action_added', violationId, 'success', { action });

    return violation;
  }

  async closeViolation(violationId: string): Promise<ViolationReport | undefined> {
    const violation = this.violations.get(violationId);

    if (!violation) {
      return undefined;
    }

    violation.status = 'closed';

    this.logAuditEvent('violation', 'closed', violationId, 'success', {});

    this.emit('violation:closed', { violationId, timestamp: new Date() });

    return violation;
  }

  getViolation(violationId: string): ViolationReport | undefined {
    return this.violations.get(violationId);
  }

  getOpenViolations(): ViolationReport[] {
    return Array.from(this.violations.values())
      .filter(v => v.status !== 'closed');
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
      userId: 'system',
      action,
      resourceType,
      resourceId,
      outcome,
      details
    };

    this.auditLog.push(entry);

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

  async generateComplianceReport(): Promise<{
    generatedAt: Date;
    usPersonStats: {
      total: number;
      active: number;
      byStatus: Record<PersonStatus, number>;
    };
    articleStats: {
      total: number;
      byCategory: Record<string, number>;
      byClassification: Record<string, number>;
    };
    licenseStats: {
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
    };
    tcpStats: {
      total: number;
      active: number;
    };
    screeningStats: {
      total: number;
      cleared: number;
      matches: number;
    };
    violationStats: {
      total: number;
      open: number;
      bySeverity: Record<string, number>;
    };
    trainingStats: {
      personsWithCurrentTraining: number;
      personsNeedingRefresh: number;
    };
    recommendations: string[];
  }> {
    const now = new Date();

    // US Person stats
    const allPersons = Array.from(this.usPersons.values());
    const byStatus: Record<PersonStatus, number> = {
      us_citizen: 0,
      permanent_resident: 0,
      protected_individual: 0,
      foreign_national: 0,
      unknown: 0
    };
    allPersons.forEach(p => byStatus[p.status]++);

    // Article stats
    const allArticles = Array.from(this.defenseArticles.values());
    const byCategory: Record<string, number> = {};
    const byClassification: Record<string, number> = {};
    allArticles.forEach(a => {
      byCategory[a.usmlCategory] = (byCategory[a.usmlCategory] || 0) + 1;
      byClassification[a.classification] = (byClassification[a.classification] || 0) + 1;
    });

    // License stats
    const allLicenses = Array.from(this.exportLicenses.values());
    const licenseByStatus: Record<string, number> = {};
    const licenseByType: Record<string, number> = {};
    allLicenses.forEach(l => {
      licenseByStatus[l.status] = (licenseByStatus[l.status] || 0) + 1;
      licenseByType[l.licenseType] = (licenseByType[l.licenseType] || 0) + 1;
    });

    // TCP stats
    const allTCPs = Array.from(this.technologyControlPlans.values());
    const activeTCPs = allTCPs.filter(t => t.status === 'active');

    // Screening stats
    const allScreenings = Array.from(this.screeningRecords.values());
    const clearedScreenings = allScreenings.filter(s => s.result === 'clear' || s.overridden);
    const matchScreenings = allScreenings.filter(s => s.result === 'match' || s.result === 'potential_match');

    // Violation stats
    const allViolations = Array.from(this.violations.values());
    const openViolations = allViolations.filter(v => v.status !== 'closed');
    const bySeverity: Record<string, number> = {};
    allViolations.forEach(v => {
      bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
    });

    // Training stats
    let personsWithCurrentTraining = 0;
    let personsNeedingRefresh = 0;

    for (const personId of this.usPersons.keys()) {
      const isCurrent = await this.verifyTrainingCurrent(personId);
      if (isCurrent) {
        personsWithCurrentTraining++;
      } else {
        personsNeedingRefresh++;
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (personsNeedingRefresh > 0) {
      recommendations.push(`${personsNeedingRefresh} personnel need ITAR training refresh`);
    }

    if (openViolations.length > 0) {
      recommendations.push(`${openViolations.length} open violations require attention`);
    }

    const expiringSoon = allLicenses.filter(l =>
      l.validUntil && l.status === 'approved' &&
      l.validUntil.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000
    );
    if (expiringSoon.length > 0) {
      recommendations.push(`${expiringSoon.length} licenses expiring within 30 days`);
    }

    const tcpsNeedingReview = allTCPs.filter(t =>
      t.status === 'active' && t.reviewDate < now
    );
    if (tcpsNeedingReview.length > 0) {
      recommendations.push(`${tcpsNeedingReview.length} TCPs are past review date`);
    }

    return {
      generatedAt: now,
      usPersonStats: {
        total: allPersons.length,
        active: allPersons.filter(p => p.isActive).length,
        byStatus
      },
      articleStats: {
        total: allArticles.length,
        byCategory,
        byClassification
      },
      licenseStats: {
        total: allLicenses.length,
        byStatus: licenseByStatus,
        byType: licenseByType
      },
      tcpStats: {
        total: allTCPs.length,
        active: activeTCPs.length
      },
      screeningStats: {
        total: allScreenings.length,
        cleared: clearedScreenings.length,
        matches: matchScreenings.length
      },
      violationStats: {
        total: allViolations.length,
        open: openViolations.length,
        bySeverity
      },
      trainingStats: {
        personsWithCurrentTraining,
        personsNeedingRefresh
      },
      recommendations
    };
  }
}

// Global instance
export const itarComplianceService = new ITARComplianceService();
export default ITARComplianceService;
