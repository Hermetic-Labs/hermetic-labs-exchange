/**
 * Westlaw Connector Types
 * 
 * TypeScript type definitions for Westlaw legal research
 * integration including KeyCite, case law, and statutes
 */

// Configuration Types
export interface WestlawConfig {
  apiKey: string;
  clientId: string;
  clientSecret?: string;
  baseUrl?: string;
  cacheDir?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface WestlawConnectionResponse {
  connected: boolean;
  baseUrl: string;
  apiVersion: string;
  tokenExpiresAt?: Date;
}

// Document Types
export type DocumentType = 'cases' | 'statutes' | 'regulations' | 'secondary' | 'briefs' | 'trial_court' | 'forms';
export type Jurisdiction = 'US-FED' | 'US-STATE' | 'US-ALL' | 'UK' | 'CA' | 'AU';
export type KeyCiteStatus = 'good' | 'caution' | 'negative' | 'unknown';
export type TreatmentType = 'followed' | 'distinguished' | 'cited' | 'overruled' | 'reversed' | 'questioned';
export type SortOrder = 'relevance' | 'date_desc' | 'date_asc' | 'citation' | 'court_rank';

export interface LegalCitation {
  cite: string;
  title: string;
  court: string;
  date: string;
  jurisdiction: string;
  parallelCitations?: string[];
  reporterVolume?: string;
  reporterPage?: string;
  reporter?: string;
}

export interface Headnote {
  number: number;
  text: string;
  keyNumbers: string[];
  topics: string[];
}

export interface KeyNumber {
  number: string;
  topic: string;
  description: string;
  hierarchy: string[];
}

export interface LegalDocument {
  documentId: string;
  title: string;
  documentType: DocumentType;
  citation?: LegalCitation;
  jurisdiction?: Jurisdiction;
  court?: string;
  dateDecided?: string;
  dateFiled?: string;
  judges: string[];
  parties: string[];
  attorneys: string[];
  headnotes: Headnote[];
  keyNumbers: KeyNumber[];
  synopsis?: string;
  fullText?: string;
  wordCount?: number;
  topics: string[];
}

export interface DocumentListResponse {
  documents: LegalDocument[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  queryId?: string;
}

export interface DocumentSearchParams {
  query: string;
  documentType?: DocumentType;
  jurisdiction?: Jurisdiction;
  court?: string;
  dateFrom?: string;
  dateTo?: string;
  keyNumbers?: string[];
  sortOrder?: SortOrder;
  offset?: number;
  limit?: number;
}

// Case Types
export interface CaseDocument {
  caseId: string;
  caseName: string;
  citation: LegalCitation;
  court: string;
  dateDecided: string;
  docketNumber?: string;
  judges: string[];
  parties: string[];
  attorneys: string[];
  headnotes: Headnote[];
  keyNumbers: KeyNumber[];
  synopsis?: string;
  holding?: string;
  disposition?: string;
  proceduralHistory: string[];
  fullText?: string;
}

export interface CaseListResponse {
  cases: CaseDocument[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface CaseSearchParams {
  query: string;
  jurisdiction?: Jurisdiction;
  court?: string;
  dateFrom?: string;
  dateTo?: string;
  keyNumbers?: string[];
  topics?: string[];
  judge?: string;
  sortOrder?: SortOrder;
  offset?: number;
  limit?: number;
}

// Statute Types
export interface Statute {
  statuteId: string;
  title: string;
  citation: string;
  jurisdiction: Jurisdiction;
  codeName: string;
  sectionNumber: string;
  effectiveDate?: string;
  text?: string;
  history: string[];
  annotations: string[];
  crossReferences: string[];
  notes?: string;
}

export interface StatuteListResponse {
  statutes: Statute[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface StatuteSearchParams {
  query: string;
  jurisdiction?: Jurisdiction;
  codeName?: string;
  dateFrom?: string;
  dateTo?: string;
  includeAnnotations?: boolean;
  sortOrder?: SortOrder;
  offset?: number;
  limit?: number;
}

// KeyCite Types
export interface CitingReference {
  citation: string;
  caseName: string;
  court: string;
  date: string;
  depth: number;
  headnoteNumbers?: number[];
  quotedText?: string;
  treatment?: TreatmentType;
}

export interface NegativeHistory {
  citation: string;
  caseName: string;
  action: 'overruled' | 'reversed' | 'vacated' | 'superseded' | 'abrogated';
  court: string;
  date: string;
  description: string;
}

export interface PositiveHistory {
  citation: string;
  caseName: string;
  action: 'affirmed' | 'followed' | 'cited' | 'distinguished';
  court: string;
  date: string;
}

export interface KeyCiteResult {
  citation: string;
  status: KeyCiteStatus;
  statusIcon: 'green' | 'yellow' | 'red' | 'none';
  statusDescription: string;
  citingReferences: CitingReference[];
  negativeHistory: NegativeHistory[];
  positiveHistory: PositiveHistory[];
  totalCitingReferences: number;
  lastUpdated: Date;
}

export interface KeyCiteParams {
  citation: string;
  includeCitingRefs?: boolean;
  includeHistory?: boolean;
  depthLimit?: number;
}

// Event Types
export type WestlawEventType = 
  | 'connected'
  | 'disconnected'
  | 'search:start'
  | 'search:complete'
  | 'keycite:start'
  | 'keycite:complete'
  | 'error';

export interface WestlawEvent {
  type: WestlawEventType;
  timestamp: Date;
  data?: unknown;
}

// Error Types
export interface WestlawError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
