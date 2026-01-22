import { EventEmitter } from './EventEmitter';

// ============================================================================
// USASpending.gov Connector - Full Implementation
// Supports federal contract/grant search, agency data, spending analysis
// ============================================================================

export interface USASpendingConfig {
  apiKey?: string; // Optional - public API
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface FederalContract {
  id: string;
  piid: string;
  awardDescription: string;
  awardAmount: number;
  totalObligatedAmount: number;
  awardingAgency: AgencyInfo;
  fundingAgency?: AgencyInfo;
  recipientName: string;
  recipientUei?: string;
  recipientDuns?: string;
  recipientLocation?: LocationInfo;
  startDate: string;
  endDate: string;
  currentEndDate?: string;
  description: string;
  awardType: string;
  pscCode?: string;
  pscDescription?: string;
  naicsCode?: string;
  naicsDescription?: string;
  placeOfPerformance?: LocationInfo;
  setAsideType?: string;
  setAsideDescription?: string;
  typeOfContractPricing?: string;
  extent_competed?: string;
}

export interface FederalGrant {
  id: string;
  fain: string;
  uri?: string;
  awardDescription: string;
  awardAmount: number;
  totalObligatedAmount: number;
  awardingAgency: AgencyInfo;
  fundingAgency?: AgencyInfo;
  recipientName: string;
  recipientUei?: string;
  recipientLocation?: LocationInfo;
  startDate: string;
  endDate: string;
  description: string;
  cfdaNumber?: string;
  cfdaTitle?: string;
  assistanceType?: string;
  placeOfPerformance?: LocationInfo;
}

export interface AgencyInfo {
  id: string;
  name: string;
  abbreviation?: string;
  subtierName?: string;
  officeName?: string;
}

export interface LocationInfo {
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  county?: string;
  country?: string;
  countryCode?: string;
  zipCode?: string;
  congressionalDistrict?: string;
}

export interface FederalAgency {
  id: string;
  name: string;
  abbreviation: string;
  totalObligations: number;
  totalBudgetAuthority?: number;
  missionStatement?: string;
  website?: string;
  subtierAgencies?: SubtierAgency[];
}

export interface SubtierAgency {
  id: string;
  name: string;
  abbreviation?: string;
  totalObligations: number;
}

export interface SpendingCategory {
  code: string;
  name: string;
  amount: number;
  percentage: number;
  count?: number;
}

export interface StateSpending {
  stateCode: string;
  stateName: string;
  totalAmount: number;
  population?: number;
  perCapita?: number;
  awardCount?: number;
}

export interface RecipientProfile {
  uei: string;
  duns?: string;
  name: string;
  parentUei?: string;
  parentName?: string;
  location?: LocationInfo;
  businessTypes?: string[];
  totalAwards: number;
  totalAmount: number;
  contractAmount: number;
  grantAmount: number;
  loanAmount: number;
}

export interface SearchFilters {
  awardType?: ('contracts' | 'grants' | 'loans' | 'direct_payments' | 'other')[];
  agencies?: string[];
  recipients?: string[];
  naicsCodes?: string[];
  pscCodes?: string[];
  cfdaNumbers?: string[];
  states?: string[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  awardAmountRange?: {
    min?: number;
    max?: number;
  };
  setAsideType?: string[];
}

export interface SearchResult<T> {
  results: T[];
  page: PageInfo;
  hasMore: boolean;
}

export interface PageInfo {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export class USASpendingConnector extends EventEmitter {
  private config: USASpendingConfig | null = null;
  private baseUrl: string = 'https://api.usaspending.gov/api';
  private timeout: number = 30000;
  private maxRetries: number = 3;

  configure(config: USASpendingConfig): void {
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
   * Test USASpending API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.apiRequest('/v2/references/agency/', { method: 'GET' });
      return response !== null;
    } catch (error) {
      this.emit('error', { type: 'connection', error });
      return false;
    }
  }

  /**
   * Search contracts
   */
  async searchContracts(
    query: string,
    filters?: SearchFilters,
    options?: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ): Promise<SearchResult<FederalContract>> {
    const payload: any = {
      filters: this.buildFilters(filters, ['contracts']),
      page: options?.page || 1,
      limit: options?.pageSize || 25,
      sort: options?.sortBy || 'Award Amount',
      order: options?.sortOrder || 'desc'
    };

    if (query) {
      payload.keywords = [query];
    }

    const response = await this.apiRequest('/v2/search/spending_by_award/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = (response.results || []).map((r: any) => this.mapContract(r));

    this.emit('searchComplete', { type: 'contracts', resultCount: results.length });

    return {
      results,
      page: {
        number: options?.page || 1,
        size: options?.pageSize || 25,
        totalElements: response.page_metadata?.total || 0,
        totalPages: Math.ceil((response.page_metadata?.total || 0) / (options?.pageSize || 25))
      },
      hasMore: response.page_metadata?.hasNext || false
    };
  }

  /**
   * Get contract by ID
   */
  async getContract(id: string): Promise<FederalContract | null> {
    try {
      const response = await this.apiRequest(`/v2/awards/${id}/`, { method: 'GET' });
      return this.mapContract(response);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search grants
   */
  async searchGrants(
    query: string,
    filters?: SearchFilters,
    options?: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ): Promise<SearchResult<FederalGrant>> {
    const payload: any = {
      filters: this.buildFilters(filters, ['grants']),
      page: options?.page || 1,
      limit: options?.pageSize || 25,
      sort: options?.sortBy || 'Award Amount',
      order: options?.sortOrder || 'desc'
    };

    if (query) {
      payload.keywords = [query];
    }

    const response = await this.apiRequest('/v2/search/spending_by_award/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = (response.results || []).map((r: any) => this.mapGrant(r));

    return {
      results,
      page: {
        number: options?.page || 1,
        size: options?.pageSize || 25,
        totalElements: response.page_metadata?.total || 0,
        totalPages: Math.ceil((response.page_metadata?.total || 0) / (options?.pageSize || 25))
      },
      hasMore: response.page_metadata?.hasNext || false
    };
  }

  /**
   * Get agency details
   */
  async getAgency(id: string): Promise<FederalAgency | null> {
    try {
      const response = await this.apiRequest(`/v2/references/agency/${id}/`, { method: 'GET' });

      return {
        id: response.agency_id || id,
        name: response.agency_name,
        abbreviation: response.abbreviation || '',
        totalObligations: response.budget_authority || 0,
        totalBudgetAuthority: response.obligated_amount,
        missionStatement: response.mission,
        website: response.website,
        subtierAgencies: (response.subtier_agencies || []).map((s: any) => ({
          id: s.subtier_agency_code,
          name: s.subtier_agency_name,
          abbreviation: s.abbreviation,
          totalObligations: s.total_obligations || 0
        }))
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all agencies
   */
  async listAgencies(options?: { page?: number; pageSize?: number }): Promise<SearchResult<FederalAgency>> {
    const payload = {
      page: options?.page || 1,
      limit: options?.pageSize || 100,
      sort: 'agency_name',
      order: 'asc'
    };

    const response = await this.apiRequest('/v2/references/agency/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = (response.results || []).map((a: any) => ({
      id: a.agency_id || a.toptier_code,
      name: a.agency_name || a.toptier_agency_name,
      abbreviation: a.abbreviation || '',
      totalObligations: a.obligated_amount || 0,
      totalBudgetAuthority: a.budget_authority
    }));

    return {
      results,
      page: {
        number: options?.page || 1,
        size: options?.pageSize || 100,
        totalElements: response.page_metadata?.total || results.length,
        totalPages: Math.ceil((response.page_metadata?.total || results.length) / (options?.pageSize || 100))
      },
      hasMore: response.page_metadata?.hasNext || false
    };
  }

  /**
   * Get spending by category
   */
  async getSpendingByCategory(
    category: 'awarding_agency' | 'funding_agency' | 'recipient' | 'cfda' | 'naics' | 'psc' | 'country' | 'state_territory',
    fiscalYear?: number,
    options?: { page?: number; pageSize?: number }
  ): Promise<SpendingCategory[]> {
    const payload: any = {
      category,
      filters: {
        time_period: [{
          start_date: `${fiscalYear || new Date().getFullYear() - 1}-10-01`,
          end_date: `${fiscalYear || new Date().getFullYear()}-09-30`
        }]
      },
      page: options?.page || 1,
      limit: options?.pageSize || 50
    };

    const response = await this.apiRequest('/v2/search/spending_by_category/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const totalAmount = response.results?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0;

    return (response.results || []).map((r: any) => ({
      code: r.id || r.code,
      name: r.name,
      amount: r.amount || 0,
      percentage: totalAmount > 0 ? ((r.amount || 0) / totalAmount) * 100 : 0,
      count: r.count
    }));
  }

  /**
   * Get spending by geography (state)
   */
  async getSpendingByState(fiscalYear?: number): Promise<StateSpending[]> {
    const payload = {
      scope: 'place_of_performance',
      geo_layer: 'state',
      filters: {
        time_period: [{
          start_date: `${fiscalYear || new Date().getFullYear() - 1}-10-01`,
          end_date: `${fiscalYear || new Date().getFullYear()}-09-30`
        }]
      }
    };

    const response = await this.apiRequest('/v2/search/spending_by_geography/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return (response.results || []).map((r: any) => ({
      stateCode: r.shape_code,
      stateName: r.display_name,
      totalAmount: r.aggregated_amount || 0,
      population: r.population,
      perCapita: r.per_capita,
      awardCount: r.award_count
    }));
  }

  /**
   * Get recipient profile
   */
  async getRecipientProfile(uei: string): Promise<RecipientProfile | null> {
    try {
      const response = await this.apiRequest(`/v2/recipient/duns/${uei}/`, { method: 'GET' });

      return {
        uei: response.uei || uei,
        duns: response.duns,
        name: response.name,
        parentUei: response.parent_uei,
        parentName: response.parent_name,
        location: response.location ? {
          address: response.location.address_line1,
          city: response.location.city_name,
          state: response.location.state_code,
          country: response.location.country_code,
          zipCode: response.location.zip
        } : undefined,
        businessTypes: response.business_types,
        totalAwards: response.total_prime_awards || 0,
        totalAmount: response.total_prime_amount || 0,
        contractAmount: response.total_contracts_amount || 0,
        grantAmount: response.total_grants_amount || 0,
        loanAmount: response.total_loans_amount || 0
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search recipients
   */
  async searchRecipients(
    query: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<SearchResult<RecipientProfile>> {
    const payload = {
      keyword: query,
      page: options?.page || 1,
      limit: options?.pageSize || 25
    };

    const response = await this.apiRequest('/v2/recipient/search/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const results = (response.results || []).map((r: any) => ({
      uei: r.uei,
      duns: r.duns,
      name: r.name,
      parentUei: r.parent_uei,
      parentName: r.parent_name,
      totalAwards: r.total_awards || 0,
      totalAmount: r.total_amount || 0,
      contractAmount: r.total_contract_amount || 0,
      grantAmount: r.total_grant_amount || 0,
      loanAmount: r.total_loan_amount || 0
    }));

    return {
      results,
      page: {
        number: options?.page || 1,
        size: options?.pageSize || 25,
        totalElements: response.page_metadata?.total || 0,
        totalPages: Math.ceil((response.page_metadata?.total || 0) / (options?.pageSize || 25))
      },
      hasMore: response.page_metadata?.hasNext || false
    };
  }

  /**
   * Get fiscal year spending totals
   */
  async getFiscalYearSpending(fiscalYear?: number): Promise<{
    fiscalYear: number;
    totalObligations: number;
    totalBudgetAuthority: number;
    awardCount: number;
    byAwardType: Array<{ type: string; amount: number; count: number }>;
  }> {
    const year = fiscalYear || new Date().getFullYear();

    const payload = {
      filters: {
        time_period: [{
          start_date: `${year - 1}-10-01`,
          end_date: `${year}-09-30`
        }]
      }
    };

    const response = await this.apiRequest('/v2/search/spending_over_time/', {
      method: 'POST',
      body: JSON.stringify({ ...payload, group: 'fiscal_year' })
    });

    const yearData = response.results?.find((r: any) => r.time_period?.fiscal_year === year) || {};

    // Get breakdown by award type
    const typeResponse = await this.apiRequest('/v2/search/spending_by_category/', {
      method: 'POST',
      body: JSON.stringify({ ...payload, category: 'award_type' })
    });

    return {
      fiscalYear: year,
      totalObligations: yearData.aggregated_amount || 0,
      totalBudgetAuthority: yearData.budget_authority || 0,
      awardCount: yearData.award_count || 0,
      byAwardType: (typeResponse.results || []).map((r: any) => ({
        type: r.name,
        amount: r.amount || 0,
        count: r.count || 0
      }))
    };
  }

  /**
   * Get NAICS code information
   */
  async getNAICSCodes(query?: string): Promise<Array<{ code: string; description: string }>> {
    const params = query ? `?filter=${encodeURIComponent(query)}` : '';
    const response = await this.apiRequest(`/v2/references/naics/${params}`, { method: 'GET' });

    return (response.results || []).map((n: any) => ({
      code: n.naics_code,
      description: n.naics_description
    }));
  }

  /**
   * Get PSC (Product/Service) codes
   */
  async getPSCCodes(query?: string): Promise<Array<{ code: string; description: string }>> {
    const params = query ? `?filter=${encodeURIComponent(query)}` : '';
    const response = await this.apiRequest(`/v2/references/psc/${params}`, { method: 'GET' });

    return (response.results || []).map((p: any) => ({
      code: p.psc_code,
      description: p.psc_description
    }));
  }

  /**
   * Get CFDA (Federal Assistance Listing) programs
   */
  async getCFDAPrograms(query?: string): Promise<Array<{ number: string; title: string; objectives?: string }>> {
    const params = query ? `?filter=${encodeURIComponent(query)}` : '';
    const response = await this.apiRequest(`/v2/references/cfda/${params}`, { method: 'GET' });

    return (response.results || []).map((c: any) => ({
      number: c.program_number,
      title: c.program_title,
      objectives: c.objectives
    }));
  }

  // ==================== Private Methods ====================

  private async apiRequest<T = any>(endpoint: string, options: RequestInit): Promise<T> {
    if (!this.config) {
      // USASpending is a public API, so configure with defaults if not set
      this.config = {};
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    // Add API key if provided
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

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

  private buildFilters(filters?: SearchFilters, awardTypes?: string[]): Record<string, any> {
    const result: Record<string, any> = {};

    // Award types mapping
    const typeMapping: Record<string, string[]> = {
      contracts: ['A', 'B', 'C', 'D'],
      grants: ['02', '03', '04', '05'],
      loans: ['07', '08'],
      direct_payments: ['06', '10'],
      other: ['09', '11']
    };

    const types = filters?.awardType || awardTypes;
    if (types?.length) {
      result.award_type_codes = types.flatMap(t => typeMapping[t] || []);
    }

    if (filters?.agencies?.length) {
      result.agencies = filters.agencies.map(a => ({
        type: 'awarding',
        tier: 'toptier',
        name: a
      }));
    }

    if (filters?.recipients?.length) {
      result.recipient_search_text = filters.recipients;
    }

    if (filters?.naicsCodes?.length) {
      result.naics_codes = filters.naicsCodes;
    }

    if (filters?.pscCodes?.length) {
      result.psc_codes = filters.pscCodes;
    }

    if (filters?.cfdaNumbers?.length) {
      result.program_numbers = filters.cfdaNumbers;
    }

    if (filters?.states?.length) {
      result.recipient_locations = filters.states.map(s => ({
        state: s,
        country: 'USA'
      }));
    }

    if (filters?.dateRange) {
      result.time_period = [{
        start_date: filters.dateRange.startDate,
        end_date: filters.dateRange.endDate
      }];
    }

    if (filters?.awardAmountRange) {
      result.award_amounts = [{
        lower_bound: filters.awardAmountRange.min,
        upper_bound: filters.awardAmountRange.max
      }];
    }

    if (filters?.setAsideType?.length) {
      result.set_aside_type_codes = filters.setAsideType;
    }

    return result;
  }

  private mapContract(data: any): FederalContract {
    return {
      id: data.generated_internal_id || data.award_id,
      piid: data.piid || data.Award_ID,
      awardDescription: data.description || data.Award_Description || '',
      awardAmount: parseFloat(data.Award_Amount) || data.total_obligation || 0,
      totalObligatedAmount: data.total_obligated_amount || data.total_obligation || 0,
      awardingAgency: {
        id: data.awarding_toptier_agency_code || '',
        name: data.awarding_agency_name || data.Awarding_Agency || '',
        abbreviation: data.awarding_agency_abbreviation,
        subtierName: data.awarding_subtier_agency_name,
        officeName: data.awarding_office_name
      },
      fundingAgency: data.funding_agency_name ? {
        id: data.funding_toptier_agency_code || '',
        name: data.funding_agency_name,
        abbreviation: data.funding_agency_abbreviation,
        subtierName: data.funding_subtier_agency_name
      } : undefined,
      recipientName: data.recipient_name || data.Recipient_Name || '',
      recipientUei: data.recipient_uei,
      recipientDuns: data.recipient_duns,
      recipientLocation: data.recipient_location ? {
        city: data.recipient_location.city_name,
        state: data.recipient_location.state_code,
        country: data.recipient_location.country_code,
        zipCode: data.recipient_location.zip5
      } : undefined,
      startDate: data.period_of_performance_start_date || data.Start_Date || '',
      endDate: data.period_of_performance_end_date || data.End_Date || '',
      currentEndDate: data.period_of_performance_current_end_date,
      description: data.description || '',
      awardType: data.type_description || data.type || '',
      pscCode: data.psc_code || data.product_or_service_code,
      pscDescription: data.psc_description,
      naicsCode: data.naics_code,
      naicsDescription: data.naics_description,
      placeOfPerformance: data.pop_city_name ? {
        city: data.pop_city_name,
        state: data.pop_state_code,
        country: data.pop_country_code,
        zipCode: data.pop_zip5
      } : undefined,
      setAsideType: data.type_of_set_aside,
      setAsideDescription: data.type_of_set_aside_description,
      typeOfContractPricing: data.type_of_contract_pricing,
      extent_competed: data.extent_competed
    };
  }

  private mapGrant(data: any): FederalGrant {
    return {
      id: data.generated_internal_id || data.award_id,
      fain: data.fain || data.Award_ID,
      uri: data.uri,
      awardDescription: data.description || '',
      awardAmount: parseFloat(data.Award_Amount) || data.total_obligation || 0,
      totalObligatedAmount: data.total_obligated_amount || data.total_obligation || 0,
      awardingAgency: {
        id: data.awarding_toptier_agency_code || '',
        name: data.awarding_agency_name || '',
        abbreviation: data.awarding_agency_abbreviation,
        subtierName: data.awarding_subtier_agency_name
      },
      fundingAgency: data.funding_agency_name ? {
        id: data.funding_toptier_agency_code || '',
        name: data.funding_agency_name,
        abbreviation: data.funding_agency_abbreviation
      } : undefined,
      recipientName: data.recipient_name || '',
      recipientUei: data.recipient_uei,
      recipientLocation: data.recipient_location ? {
        city: data.recipient_location.city_name,
        state: data.recipient_location.state_code,
        country: data.recipient_location.country_code
      } : undefined,
      startDate: data.period_of_performance_start_date || '',
      endDate: data.period_of_performance_end_date || '',
      description: data.description || '',
      cfdaNumber: data.cfda_number,
      cfdaTitle: data.cfda_title,
      assistanceType: data.assistance_type_description || data.assistance_type,
      placeOfPerformance: data.pop_city_name ? {
        city: data.pop_city_name,
        state: data.pop_state_code,
        country: data.pop_country_code
      } : undefined
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const usaSpendingConnector = new USASpendingConnector();
export default USASpendingConnector;
