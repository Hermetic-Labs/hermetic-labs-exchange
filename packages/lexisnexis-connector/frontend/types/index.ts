/**
 * LexisNexis Connector Types
 * 
 * TypeScript type definitions for LexisNexis legal research
 * integration including case law, statutes, and Shepard's citations
 */

// Configuration Types
export interface LexisNexisConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface LexisNexisConnectionResponse {
  connected: boolean;
  baseUrl: string;
  apiVersion: string;
  tokenExpiresAt?: Date;
}

// Document Types
export type DocumentType = 'cases' | 'statutes' | 'regulations' | 'secondary' | 'briefs' | 'pleadings' | 'news';
export type Jurisdiction = 'US-FED' | 'US-STATE' | 'US-ALL' | 'UK' | 'CA' | 'AU';
export type TreatmentType = 'positive' | 'negative' | 'cautionary' | 'neutral' | 'questioned';
export type SortOrder = 'relevance' | 'date_desc' | 'date_asc' | 'citation';

export interface Headnote {
  number: number;
  text: string;
  topics: string[];
  keyNumbers: string[];
}

export interface Citation {
  fullCitation: string;
  reporter?: string;
  volume?: string;
  page?: string;
  parallelCitations: string[];
}

export interface LegalDocument {
  documentId: string;
  title: string;
  documentType: DocumentType;
  citation?: Citation;
  jurisdiction?: Jurisdiction;
  court?: string;
  dateDecided?: string;
  dateFiled?: string;
  judges: string[];
  parties: string[];
  attorneys: string[];
  headnotes: Headnote[];
  summary?: string;
  fullText?: string;
  wordCount?: number;
  topics: string[];
  keyNumbers: string[];
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
  topics?: string[];
  includeFullText?: boolean;
  sort?: SortOrder;
  offset?: number;
  limit?: number;
}

// Case Types
export interface LexisCase {
  caseId: string;
  caseName: string;
  shortName?: string;
  citation: Citation;
  parallelCitations: string[];
  court: string;
  courtLevel?: string;
  jurisdiction: Jurisdiction;
  dateDecided: string;
  dateFiled?: string;
  docketNumber?: string;
  judges: string[];
  parties: string[];
  attorneys: string[];
  disposition?: string;
  proceduralPosture?: string;
  headnotes: Headnote[];
  syllabus?: string;
  opinionText?: string;
  dissentText?: string;
  concurrenceText?: string;
  topics: string[];
  treatment?: TreatmentType;
}

export interface CaseListResponse {
  cases: LexisCase[];
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
  topics?: string[];
  keyNumbers?: string[];
  includeOpinion?: boolean;
  sort?: SortOrder;
  offset?: number;
  limit?: number;
}

// Statute Types
export interface LexisStatute {
  statuteId: string;
  title: string;
  codeName: string;
  codeTitle?: string;
  sectionNumber: string;
  sectionTitle?: string;
  jurisdiction: Jurisdiction;
  effectiveDate?: string;
  versionDate?: string;
  text?: string;
  history?: string;
  annotations: string[];
  crossReferences: string[];
  citingCases: string[];
  topics: string[];
}

export interface StatuteListResponse {
  statutes: LexisStatute[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface StatuteSearchParams {
  query: string;
  jurisdiction?: Jurisdiction;
  codeName?: string;
  includeAnnotations?: boolean;
  includeHistory?: boolean;
  sort?: SortOrder;
  offset?: number;
  limit?: number;
}

// Shepard's Types
export interface CitingReference {
  documentId: string;
  citation: string;
  caseName?: string;
  court?: string;
  dateDecided?: string;
  treatment: TreatmentType;
  headnoteNumbers: number[];
  discussionText?: string;
  depth: number;
}

export interface ShepardsAnalysis {
  citation: string;
  documentId?: string;
  caseName?: string;
  overallTreatment: TreatmentType;
  citingReferences: CitingReference[];
  positiveCount: number;
  negativeCount: number;
  cautionaryCount: number;
  neutralCount: number;
  totalCiting: number;
  history: CitingReference[];
  warningSignals: string[];
}

export interface ShepardizeParams {
  citation: string;
  includeHistory?: boolean;
  includeCitingReferences?: boolean;
  treatmentFilter?: TreatmentType;
  limit?: number;
}

// Event Types
export type LexisNexisConnectorEvent =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'document:found'
  | 'document:search'
  | 'case:found'
  | 'case:search'
  | 'statute:found'
  | 'statute:search'
  | 'shepardize:complete';

export interface LexisNexisConnectorEventData {
  event: LexisNexisConnectorEvent;
  timestamp: Date;
  data?: unknown;
  error?: Error;
}
