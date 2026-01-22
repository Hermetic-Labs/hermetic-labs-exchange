/**
 * USASpending Connector Types
 * 
 * TypeScript type definitions for USASpending.gov
 * federal spending data integration
 */

// Configuration Types
export interface USASpendingConfig {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface USASpendingConnectionResponse {
  connected: boolean;
  baseUrl: string;
  apiVersion: string;
}

// Award Types
export type AwardType = 'contract' | 'grant' | 'loan' | 'direct_payment' | 'other';
export type AwardCategory = 'contracts' | 'grants' | 'loans' | 'direct_payments' | 'other_financial_assistance';

export interface LocationInfo {
  stateCode?: string;
  stateName?: string;
  countyCode?: string;
  countyName?: string;
  congressionalDistrict?: string;
  cityName?: string;
  zipCode?: string;
  countryCode: string;
  countryName: string;
}

export interface USASpendingAward {
  awardId: string;
  generatedUniqueAwardId: string;
  piid?: string;
  fain?: string;
  uri?: string;
  awardType: AwardType;
  awardTypeDescription?: string;
  category: AwardCategory;
  description?: string;
  totalObligation: number;
  totalOutlay?: number;
  baseAndAllOptionsValue?: number;
  awardingAgencyName?: string;
  awardingAgencyCode?: string;
  awardingSubAgencyName?: string;
  fundingAgencyName?: string;
  fundingAgencyCode?: string;
  recipientName?: string;
  recipientUei?: string;
  recipientLocation?: LocationInfo;
  placeOfPerformance?: LocationInfo;
  startDate?: string;
  endDate?: string;
  lastModifiedDate?: string;
  fiscalYear?: number;
  naicsCode?: string;
  naicsDescription?: string;
  pscCode?: string;
  pscDescription?: string;
  cfdaNumber?: string;
  cfdaTitle?: string;
}

export interface AwardListResponse {
  awards: USASpendingAward[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface AwardSearchParams {
  keywords?: string[];
  awardType?: AwardType;
  category?: AwardCategory;
  awardingAgencyCode?: string;
  fundingAgencyCode?: string;
  recipientName?: string;
  recipientUei?: string;
  stateCode?: string;
  countyCode?: string;
  congressionalDistrict?: string;
  naicsCode?: string;
  pscCode?: string;
  cfdaNumber?: string;
  fiscalYear?: number;
  startDateFrom?: string;
  startDateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  offset?: number;
  limit?: number;
}

// Agency Types
export interface SubAgencySpending {
  subAgencyName: string;
  subAgencyCode?: string;
  totalObligations: number;
  totalOutlays?: number;
  awardCount: number;
}

export interface AgencySpending {
  agencyName: string;
  agencyCode: string;
  fiscalYear: number;
  totalObligations: number;
  totalOutlays?: number;
  totalBudgetaryResources?: number;
  awardCount: number;
  subAgencies: SubAgencySpending[];
  byAwardType: Record<string, number>;
}

export interface AgencySpendingParams {
  agencyCode: string;
  fiscalYear?: number;
  includeSubAgencies?: boolean;
}

// Recipient Types
export interface USASpendingRecipient {
  recipientId: string;
  recipientHash: string;
  uei?: string;
  duns?: string;
  name: string;
  parentName?: string;
  parentUei?: string;
  recipientLevel: string;
  location?: LocationInfo;
  businessTypes: string[];
  totalTransactionAmount: number;
  totalAwards: number;
}

export interface RecipientListResponse {
  recipients: USASpendingRecipient[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface RecipientSearchParams {
  query?: string;
  uei?: string;
  name?: string;
  stateCode?: string;
  recipientLevel?: string;
  offset?: number;
  limit?: number;
}

// Geographic Types
export interface StateSpending {
  stateCode: string;
  stateName: string;
  totalObligations: number;
  totalOutlays?: number;
  awardCount: number;
  perCapita?: number;
}

export interface CountySpending {
  countyCode: string;
  countyName: string;
  stateCode: string;
  totalObligations: number;
  awardCount: number;
}

export interface GeographicSpending {
  fiscalYear?: number;
  scope: string;
  results: Record<string, unknown>[];
  totalObligations: number;
}

export interface GeographicSpendingParams {
  scope: 'state' | 'county' | 'congressional_district';
  fiscalYear?: number;
  agencyCode?: string;
  awardType?: AwardType;
  stateCode?: string;
}

// Fiscal Year Types
export interface FiscalYearSpending {
  fiscalYear: number;
  totalObligations: number;
  totalOutlays?: number;
  totalBudgetaryResources?: number;
  awardCount: number;
  byAwardType: Record<string, number>;
  byAgency: Record<string, number>;
  monthlyData: Record<string, unknown>[];
}

// Event Types
export type USASpendingConnectorEvent =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'award:found'
  | 'award:search'
  | 'agency:spending'
  | 'recipient:found'
  | 'recipient:search'
  | 'geographic:data';

export interface USASpendingConnectorEventData {
  event: USASpendingConnectorEvent;
  timestamp: Date;
  data?: unknown;
  error?: Error;
}
