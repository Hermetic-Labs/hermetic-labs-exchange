import { EventEmitter } from './EventEmitter';

// ============================================================================
// SAM.gov Connector - Full Implementation
// Supports entity search, exclusions, opportunities, and contract data
// ============================================================================

export interface SAMConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface SAMEntity {
  ueiSAM: string;
  legalBusinessName: string;
  dbaName: string | null;
  cageCode: string;
  registrationStatus: string;
  registrationDate?: string;
  expirationDate?: string;
  lastUpdatedDate?: string;
  physicalAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  mailingAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  businessTypes: string[];
  entityTypes: string[];
  naicsCodes: NAICSCode[];
  pscCodes: string[];
  socioEconomicStatuses: string[];
  pointsOfContact: {
    government?: ContactInfo;
    electronic?: ContactInfo;
    past_performance?: ContactInfo;
  };
  congressionalDistrict?: string;
  stateOfIncorporation?: string;
  countryOfIncorporation?: string;
  organizationType?: string;
  entityStructure?: string;
  disasterRegistry?: boolean;
  samRegistration?: {
    purposeOfRegistrationCode: string;
    purposeOfRegistrationDesc: string;
  };
}

export interface NAICSCode {
  code: string;
  description: string;
  isPrimary: boolean;
  smallBusinessSize?: string;
}

export interface ContactInfo {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  title?: string;
  email?: string;
  phone?: string;
  fax?: string;
}

export interface SAMExclusion {
  ueiSAM: string;
  name: string;
  exclusionType: string;
  exclusionProgram: string;
  activationDate: string;
  terminationDate: string | null;
  agency: string;
  ctCode?: string;
  moreLocations?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  dnbInvestigation?: string;
  recordStatus?: string;
  crossReference?: Array<{
    type: string;
    value: string;
  }>;
  exclusionActions?: Array<{
    createDate: string;
    updateDate: string;
    actionType: string;
    agencyComponent: string;
  }>;
  description?: string;
}

export interface SAMOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber?: string;
  fullParentPathName?: string;
  fullParentPathCode?: string;
  postedDate: string;
  type: OpportunityType;
  baseType: string;
  archiveType?: string;
  archiveDate?: string;
  setAside?: string;
  setAsideDescription?: string;
  responseDeadLine?: string;
  naicsCode?: string;
  classificationCode?: string;
  active: boolean;
  description?: string;
  organizationType?: string;
  officeAddress?: {
    city: string;
    state: string;
    zipcode: string;
    countryCode: string;
  };
  placeOfPerformance?: {
    city?: string;
    state?: string;
    country?: string;
  };
  pointOfContact?: Array<{
    type: string;
    fullName: string;
    email: string;
    phone?: string;
  }>;
  links?: Array<{
    rel: string;
    href: string;
  }>;
  award?: {
    awardee?: {
      name: string;
      duns?: string;
      ueiSAM?: string;
      location?: {
        city: string;
        state: string;
        country: string;
      };
    };
    date?: string;
    number?: string;
    amount?: number;
  };
}

export type OpportunityType =
  | 'Presolicitation'
  | 'Combined Synopsis/Solicitation'
  | 'Sources Sought'
  | 'Special Notice'
  | 'Award Notice'
  | 'Intent to Bundle'
  | 'Justification'
  | 'Fair Opportunity / Limited Sources Justification'
  | 'Sole Source'
  | 'Sale of Surplus Property'
  | 'Foreign Government Standard';

export interface SAMWage {
  wdId: string;
  title: string;
  state: string;
  county?: string;
  constructionType?: string;
  revisionNumber?: string;
  revisionDate?: string;
  activeDate?: string;
  expirationDate?: string;
  rates?: WageRate[];
}

export interface WageRate {
  laborCategory: string;
  rate: number;
  healthWelfare?: number;
  vacation?: number;
  pension?: number;
  total?: number;
}

export interface EntitySearchFilters {
  legalBusinessName?: string;
  dbaName?: string;
  cageCode?: string;
  registrationStatus?: 'Active' | 'Inactive' | 'All';
  purposeOfRegistration?: string;
  entityType?: string[];
  naicsCode?: string[];
  state?: string[];
  country?: string;
  socioEconomicStatus?: string[];
  disasterResponse?: boolean;
  includeSections?: string[];
}

export interface SearchResult<T> {
  results: T[];
  totalRecords: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export class SAMConnector extends EventEmitter {
  private config: SAMConfig | null = null;
  private baseUrl: string = 'https://api.sam.gov';
  private timeout: number = 30000;
  private maxRetries: number = 3;

  configure(config: SAMConfig): void {
    this.config = config;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
    if (config.timeout) {
      this.timeout = config.timeout;
    }
    if (config.maxRetries) {
      this.maxRetries = config.maxRetries;
    }
    this.emit('configured');
  }

  /**
   * Test SAM.gov API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use a simple search to test connectivity
      const response = await this.apiRequest(
        '/entity-information/v3/entities?registrationStatus=A&api_key=' + this.config!.apiKey + '&samRegistered=Yes&page=0&size=1',
        { method: 'GET' }
      );
      return response !== null;
    } catch (error) {
      this.emit('error', { type: 'connection', error });
      return false;
    }
  }

  /**
   * Search registered entities
   */
  async searchEntities(
    query: string,
    filters?: EntitySearchFilters,
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<SAMEntity>> {
    const params = new URLSearchParams();
    params.set('api_key', this.config!.apiKey);
    params.set('samRegistered', 'Yes');
    params.set('page', String((options?.page || 1) - 1)); // SAM uses 0-based
    params.set('size', String(options?.pageSize || 25));

    // Add search query
    if (query) {
      params.set('q', query);
    }

    // Add filters
    if (filters) {
      if (filters.legalBusinessName) {
        params.set('legalBusinessName', filters.legalBusinessName);
      }
      if (filters.dbaName) {
        params.set('dbaName', filters.dbaName);
      }
      if (filters.cageCode) {
        params.set('cageCode', filters.cageCode);
      }
      if (filters.registrationStatus) {
        params.set('registrationStatus', filters.registrationStatus === 'Active' ? 'A' : 'I');
      }
      if (filters.purposeOfRegistration) {
        params.set('purposeOfRegistrationCode', filters.purposeOfRegistration);
      }
      if (filters.entityType?.length) {
        params.set('businessTypeCode', filters.entityType.join('~'));
      }
      if (filters.naicsCode?.length) {
        params.set('naicsCode', filters.naicsCode.join('~'));
      }
      if (filters.state?.length) {
        params.set('physicalAddressStateCode', filters.state.join('~'));
      }
      if (filters.country) {
        params.set('physicalAddressCountryCode', filters.country);
      }
      if (filters.socioEconomicStatus?.length) {
        params.set('sbaBusinessTypeCode', filters.socioEconomicStatus.join('~'));
      }
      if (filters.disasterResponse) {
        params.set('disasterResponse', 'Y');
      }
      if (filters.includeSections?.length) {
        params.set('includeSections', filters.includeSections.join(','));
      }
    }

    const response = await this.apiRequest(
      `/entity-information/v3/entities?${params.toString()}`,
      { method: 'GET' }
    );

    const results = (response.entityData || []).map((e: any) => this.mapEntity(e));

    this.emit('searchComplete', { type: 'entities', resultCount: results.length });

    return {
      results,
      totalRecords: response.totalRecords || 0,
      page: options?.page || 1,
      pageSize: options?.pageSize || 25,
      hasMore: results.length === (options?.pageSize || 25)
    };
  }

  /**
   * Get entity by UEI (Unique Entity Identifier)
   */
  async getEntity(ueiSAM: string): Promise<SAMEntity | null> {
    const params = new URLSearchParams();
    params.set('api_key', this.config!.apiKey);
    params.set('samRegistered', 'Yes');
    params.set('ueiSAM', ueiSAM);

    try {
      const response = await this.apiRequest(
        `/entity-information/v3/entities?${params.toString()}`,
        { method: 'GET' }
      );

      if (response.entityData && response.entityData.length > 0) {
        return this.mapEntity(response.entityData[0]);
      }
      return null;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get entity by CAGE code
   */
  async getEntityByCage(cageCode: string): Promise<SAMEntity | null> {
    const params = new URLSearchParams();
    params.set('api_key', this.config!.apiKey);
    params.set('samRegistered', 'Yes');
    params.set('cageCode', cageCode);

    try {
      const response = await this.apiRequest(
        `/entity-information/v3/entities?${params.toString()}`,
        { method: 'GET' }
      );

      if (response.entityData && response.entityData.length > 0) {
        return this.mapEntity(response.entityData[0]);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check exclusions for an entity
   */
  async checkExclusions(ueiSAM: string): Promise<SAMExclusion[]> {
    const params = new URLSearchParams();
    params.set('api_key', this.config!.apiKey);
    params.set('ueiSAM', ueiSAM);

    const response = await this.apiRequest(
      `/entity-information/v2/exclusions?${params.toString()}`,
      { method: 'GET' }
    );

    return (response.exclusionData || []).map((e: any) => this.mapExclusion(e));
  }

  /**
   * Search exclusions
   */
  async searchExclusions(
    query: string,
    filters?: {
      exclusionType?: string[];
      agency?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<SAMExclusion>> {
    const params = new URLSearchParams();
    params.set('api_key', this.config!.apiKey);
    params.set('page', String((options?.page || 1) - 1));
    params.set('size', String(options?.pageSize || 25));

    if (query) {
      params.set('q', query);
    }

    if (filters) {
      if (filters.exclusionType?.length) {
        params.set('excludingAgencyCode', filters.exclusionType.join('~'));
      }
      if (filters.agency) {
        params.set('excludingAgencyCode', filters.agency);
      }
      if (filters.dateFrom) {
        params.set('activationDate', `[${filters.dateFrom},]`);
      }
      if (filters.dateTo) {
        params.set('activationDate', `[,${filters.dateTo}]`);
      }
    }

    const response = await this.apiRequest(
      `/entity-information/v2/exclusions?${params.toString()}`,
      { method: 'GET' }
    );

    const results = (response.exclusionData || []).map((e: any) => this.mapExclusion(e));

    return {
      results,
      totalRecords: response.totalRecords || 0,
      page: options?.page || 1,
      pageSize: options?.pageSize || 25,
      hasMore: results.length === (options?.pageSize || 25)
    };
  }

  /**
   * Validate entity status
   */
  async validateEntity(ueiSAM: string): Promise<{ valid: boolean; status: string; details: string }> {
    const entity = await this.getEntity(ueiSAM);

    if (!entity) {
      return {
        valid: false,
        status: 'NOT_FOUND',
        details: 'Entity not found in SAM.gov'
      };
    }

    // Check exclusions
    const exclusions = await this.checkExclusions(ueiSAM);
    if (exclusions.length > 0) {
      const activeExclusions = exclusions.filter(e => !e.terminationDate || new Date(e.terminationDate) > new Date());
      if (activeExclusions.length > 0) {
        return {
          valid: false,
          status: 'EXCLUDED',
          details: `Entity has ${activeExclusions.length} active exclusion(s)`
        };
      }
    }

    // Check registration status
    if (entity.registrationStatus !== 'Active') {
      return {
        valid: false,
        status: 'INACTIVE',
        details: `Entity registration status: ${entity.registrationStatus}`
      };
    }

    // Check expiration
    if (entity.expirationDate) {
      const expDate = new Date(entity.expirationDate);
      const now = new Date();
      const daysUntilExpiration = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiration < 0) {
        return {
          valid: false,
          status: 'EXPIRED',
          details: 'Entity registration has expired'
        };
      }

      if (daysUntilExpiration < 30) {
        return {
          valid: true,
          status: 'EXPIRING_SOON',
          details: `Registration expires in ${daysUntilExpiration} days`
        };
      }
    }

    return {
      valid: true,
      status: 'ACTIVE',
      details: 'Entity is active and in good standing'
    };
  }

  /**
   * Search opportunities (federal contracts)
   */
  async searchOpportunities(
    query: string,
    filters?: {
      type?: OpportunityType[];
      naicsCode?: string[];
      setAside?: string[];
      postedFrom?: string;
      postedTo?: string;
      responseDeadlineFrom?: string;
      responseDeadlineTo?: string;
      active?: boolean;
    },
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<SAMOpportunity>> {
    const params = new URLSearchParams();
    params.set('api_key', this.config!.apiKey);
    params.set('page', String((options?.page || 1) - 1));
    params.set('limit', String(options?.pageSize || 25));

    if (query) {
      params.set('q', query);
    }

    if (filters) {
      if (filters.type?.length) {
        params.set('ptype', filters.type.join(','));
      }
      if (filters.naicsCode?.length) {
        params.set('naics', filters.naicsCode.join(','));
      }
      if (filters.setAside?.length) {
        params.set('typeOfSetAside', filters.setAside.join(','));
      }
      if (filters.postedFrom) {
        params.set('postedFrom', filters.postedFrom);
      }
      if (filters.postedTo) {
        params.set('postedTo', filters.postedTo);
      }
      if (filters.responseDeadlineFrom) {
        params.set('rdlfrom', filters.responseDeadlineFrom);
      }
      if (filters.responseDeadlineTo) {
        params.set('rdlto', filters.responseDeadlineTo);
      }
      if (filters.active !== undefined) {
        params.set('active', filters.active ? 'true' : 'false');
      }
    }

    const response = await this.apiRequest(
      `/opportunities/v2/search?${params.toString()}`,
      { method: 'GET' }
    );

    const results = (response.opportunitiesData || []).map((o: any) => this.mapOpportunity(o));

    return {
      results,
      totalRecords: response.totalRecords || 0,
      page: options?.page || 1,
      pageSize: options?.pageSize || 25,
      hasMore: results.length === (options?.pageSize || 25)
    };
  }

  /**
   * Get opportunity by notice ID
   */
  async getOpportunity(noticeId: string): Promise<SAMOpportunity | null> {
    const params = new URLSearchParams();
    params.set('api_key', this.config!.apiKey);
    params.set('noticeid', noticeId);

    try {
      const response = await this.apiRequest(
        `/opportunities/v2/search?${params.toString()}`,
        { method: 'GET' }
      );

      if (response.opportunitiesData && response.opportunitiesData.length > 0) {
        return this.mapOpportunity(response.opportunitiesData[0]);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get wage determinations
   */
  async getWageDeterminations(
    state: string,
    county?: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<SAMWage>> {
    const params = new URLSearchParams();
    params.set('api_key', this.config!.apiKey);
    params.set('state', state);
    params.set('page', String((options?.page || 1) - 1));
    params.set('size', String(options?.pageSize || 25));

    if (county) {
      params.set('county', county);
    }

    const response = await this.apiRequest(
      `/wage-determination/v1/search?${params.toString()}`,
      { method: 'GET' }
    );

    const results = (response.wdData || []).map((w: any) => ({
      wdId: w.wdId,
      title: w.title,
      state: w.state,
      county: w.county,
      constructionType: w.constructionType,
      revisionNumber: w.revisionNumber,
      revisionDate: w.revisionDate,
      activeDate: w.activeDate,
      expirationDate: w.expirationDate,
      rates: w.rates
    }));

    return {
      results,
      totalRecords: response.totalRecords || 0,
      page: options?.page || 1,
      pageSize: options?.pageSize || 25,
      hasMore: results.length === (options?.pageSize || 25)
    };
  }

  // ==================== Private Methods ====================

  private async apiRequest<T = any>(endpoint: string, options: RequestInit): Promise<T> {
    if (!this.config) {
      throw new Error('SAM connector not configured');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.httpRequest(url, {
          ...options,
          headers
        });

        if (!response.ok) {
          const error = new Error(`API request failed: ${response.status}`);
          (error as any).statusCode = response.status;
          throw error;
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private async httpRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private mapEntity(data: any): SAMEntity {
    const entityData = data.entityRegistration || data;
    const coreData = data.coreData || {};
    const assertions = data.assertions || {};

    return {
      ueiSAM: entityData.ueiSAM || data.ueiSAM,
      legalBusinessName: entityData.legalBusinessName || coreData.entityInformation?.entityName,
      dbaName: entityData.dbaName || coreData.entityInformation?.dbaName || null,
      cageCode: entityData.cageCode || coreData.entityInformation?.cageCode,
      registrationStatus: entityData.registrationStatus || 'Unknown',
      registrationDate: entityData.registrationDate,
      expirationDate: entityData.expirationDate,
      lastUpdatedDate: entityData.lastUpdatedDate,
      physicalAddress: {
        addressLine1: coreData.physicalAddress?.addressLine1 || '',
        addressLine2: coreData.physicalAddress?.addressLine2,
        city: coreData.physicalAddress?.city || '',
        state: coreData.physicalAddress?.stateOrProvinceCode || '',
        country: coreData.physicalAddress?.countryCode || 'USA',
        zipCode: coreData.physicalAddress?.zipCode || ''
      },
      mailingAddress: coreData.mailingAddress ? {
        addressLine1: coreData.mailingAddress.addressLine1,
        addressLine2: coreData.mailingAddress.addressLine2,
        city: coreData.mailingAddress.city,
        state: coreData.mailingAddress.stateOrProvinceCode,
        country: coreData.mailingAddress.countryCode,
        zipCode: coreData.mailingAddress.zipCode
      } : undefined,
      businessTypes: entityData.businessTypes || [],
      entityTypes: coreData.entityInformation?.entityType ? [coreData.entityInformation.entityType] : [],
      naicsCodes: (coreData.naicsCodeList || []).map((n: any) => ({
        code: n.naicsCode,
        description: n.naicsDescription || '',
        isPrimary: n.primaryNaics === 'Y',
        smallBusinessSize: n.smallBusinessSize
      })),
      pscCodes: coreData.pscCodeList || [],
      socioEconomicStatuses: assertions.sbaBusinessTypeList || [],
      pointsOfContact: {
        government: this.mapContact(data.pointsOfContact?.governmentBusinessPOC),
        electronic: this.mapContact(data.pointsOfContact?.electronicBusinessPOC),
        past_performance: this.mapContact(data.pointsOfContact?.pastPerformancePOC)
      },
      congressionalDistrict: coreData.congressionalDistrict,
      stateOfIncorporation: coreData.entityInformation?.stateOfIncorporation,
      countryOfIncorporation: coreData.entityInformation?.countryOfIncorporation,
      organizationType: coreData.entityInformation?.organizationType,
      entityStructure: coreData.entityInformation?.entityStructure,
      disasterRegistry: entityData.disasterRegistry === 'Y',
      samRegistration: entityData.samRegistration
    };
  }

  private mapContact(data: any): ContactInfo | undefined {
    if (!data) return undefined;

    return {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleInitial,
      title: data.title,
      email: data.email,
      phone: data.phone,
      fax: data.fax
    };
  }

  private mapExclusion(data: any): SAMExclusion {
    return {
      ueiSAM: data.ueiSAM || data.samNumber,
      name: data.name || data.firstName + ' ' + data.lastName,
      exclusionType: data.exclusionType || data.ctCode,
      exclusionProgram: data.exclusionProgram || '',
      activationDate: data.activationDate,
      terminationDate: data.terminationDate,
      agency: data.excludingAgencyName || data.agency,
      ctCode: data.ctCode,
      moreLocations: data.moreLocations,
      addressLine1: data.addressLine1,
      city: data.city,
      state: data.state,
      country: data.country,
      zipCode: data.zipCode,
      dnbInvestigation: data.dnbInvestigation,
      recordStatus: data.recordStatus,
      crossReference: data.crossReferences,
      exclusionActions: data.exclusionActions,
      description: data.description
    };
  }

  private mapOpportunity(data: any): SAMOpportunity {
    return {
      noticeId: data.noticeId,
      title: data.title,
      solicitationNumber: data.solicitationNumber,
      fullParentPathName: data.fullParentPathName,
      fullParentPathCode: data.fullParentPathCode,
      postedDate: data.postedDate,
      type: data.type,
      baseType: data.baseType,
      archiveType: data.archiveType,
      archiveDate: data.archiveDate,
      setAside: data.typeOfSetAside,
      setAsideDescription: data.typeOfSetAsideDescription,
      responseDeadLine: data.responseDeadLine,
      naicsCode: data.naicsCode,
      classificationCode: data.classificationCode,
      active: data.active === 'Yes' || data.active === true,
      description: data.description,
      organizationType: data.organizationType,
      officeAddress: data.officeAddress,
      placeOfPerformance: data.placeOfPerformance,
      pointOfContact: data.pointOfContact,
      links: data.links,
      award: data.award
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const samConnector = new SAMConnector();
export default SAMConnector;
