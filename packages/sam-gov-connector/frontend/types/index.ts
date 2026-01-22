/**
 * SAM.gov Connector Types
 * 
 * TypeScript type definitions for SAM.gov federal contractor
 * registration and entity search integration
 */

// Configuration Types
export interface SAMGovConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface SAMGovConnectionResponse {
  connected: boolean;
  baseUrl: string;
  apiVersion: string;
}

// Entity Types
export type EntityStatus = 'Active' | 'Inactive' | 'Expired';
export type EntityType = 'Business' | 'Government' | 'Individual';

export interface AddressInfo {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
}

export interface SAMEntity {
  uei: string;
  cageCode?: string;
  legalBusinessName: string;
  dbaName?: string;
  entityType: EntityType;
  status: EntityStatus;
  registrationDate?: string;
  expirationDate?: string;
  physicalAddress?: AddressInfo;
  mailingAddress?: AddressInfo;
  naicsCodes: string[];
  pscCodes: string[];
  samExtractCode?: string;
  exclusionStatus: boolean;
}

export interface EntityListResponse {
  entities: SAMEntity[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface EntitySearchParams {
  query?: string;
  uei?: string;
  cageCode?: string;
  legalBusinessName?: string;
  status?: EntityStatus;
  entityType?: EntityType;
  state?: string;
  naicsCode?: string;
  offset?: number;
  limit?: number;
}

// Exclusion Types
export type ExclusionType = 'Ineligible' | 'Prohibited' | 'Voluntary';

export interface SAMExclusion {
  id: string;
  name: string;
  uei?: string;
  cageCode?: string;
  exclusionType: ExclusionType;
  exclusionProgram: string;
  excludingAgency: string;
  ctCode?: string;
  exclusionDate: string;
  terminationDate?: string;
  active: boolean;
  samNumber?: string;
  description?: string;
}

export interface ExclusionListResponse {
  exclusions: SAMExclusion[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface ExclusionSearchParams {
  name?: string;
  uei?: string;
  cageCode?: string;
  exclusionType?: ExclusionType;
  excludingAgency?: string;
  activeOnly?: boolean;
  offset?: number;
  limit?: number;
}

// Opportunity Types
export type SetAsideType = 'SBA' | 'WOSB' | 'HUBZone' | 'SDVOSB' | '8(a)' | 'None';

export interface SAMOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber?: string;
  department?: string;
  agency?: string;
  office?: string;
  postedDate?: string;
  responseDeadline?: string;
  archiveDate?: string;
  setAside?: SetAsideType;
  naicsCode?: string;
  classificationCode?: string;
  placeOfPerformance?: AddressInfo;
  description?: string;
  url?: string;
  active: boolean;
}

export interface OpportunityListResponse {
  opportunities: SAMOpportunity[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface OpportunitySearchParams {
  query?: string;
  agency?: string;
  naicsCode?: string;
  setAside?: SetAsideType;
  postedFrom?: string;
  postedTo?: string;
  activeOnly?: boolean;
  offset?: number;
  limit?: number;
}

// Event Types
export type SAMConnectorEvent =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'entity:found'
  | 'entity:search'
  | 'exclusion:found'
  | 'exclusion:search'
  | 'opportunity:found'
  | 'opportunity:search';

export interface SAMConnectorEventData {
  event: SAMConnectorEvent;
  timestamp: Date;
  data?: unknown;
  error?: Error;
}
