/**
 * Salesforce Connector Types
 * 
 * TypeScript type definitions for Salesforce CRM integration
 */

// Environment Types
export type SalesforceEnvironment = 'production' | 'sandbox';

// OAuth Types
export interface SalesforceCredentials {
  accessToken: string;
  refreshToken?: string;
  instanceUrl: string;
  tokenType: string;
  issuedAt?: string;
  expiresIn?: number;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope?: string;
  sandbox?: boolean;
}

export interface OAuthTokenRequest {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  token_type: string;
  issued_at: string;
  expires_in?: number;
  scope?: string;
}

// SOQL Query Types
export interface SOQLQueryRequest {
  query: string;
  includeDeleted?: boolean;
  batchSize?: number;
}

export interface SOQLQueryResponse<T = SObjectRecord> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}

// SObject Types
export interface SObjectAttributes {
  type: string;
  url: string;
}

export interface SObjectRecord {
  Id?: string;
  attributes?: SObjectAttributes;
  [key: string]: unknown;
}

export interface SObjectCreateRequest {
  objectType: string;
  fields: Record<string, unknown>;
}

export interface SObjectCreateResponse {
  id: string;
  success: boolean;
  errors: SalesforceError[];
}

export interface SObjectUpdateRequest {
  fields: Record<string, unknown>;
}

export interface SObjectDeleteResponse {
  id: string;
  success: boolean;
}

// Bulk Operation Types
export type BulkOperationType = 'insert' | 'update' | 'upsert' | 'delete' | 'query';

export type BulkJobState = 
  | 'Open'
  | 'UploadComplete'
  | 'InProgress'
  | 'JobComplete'
  | 'Aborted'
  | 'Failed';

export interface BulkOperationRequest {
  objectType: string;
  operation: BulkOperationType;
  records?: Record<string, unknown>[];
  query?: string;
  externalIdField?: string;
}

export interface BulkJobStatus {
  id: string;
  state: BulkJobState;
  object: string;
  operation: string;
  createdById: string;
  createdDate: string;
  systemModstamp: string;
  numberRecordsProcessed: number;
  numberRecordsFailed: number;
  totalProcessingTime?: number;
}

export interface BulkOperationResponse {
  jobId: string;
  state: BulkJobState;
  recordsProcessed: number;
  recordsFailed: number;
  results?: BulkRecordResult[];
}

export interface BulkRecordResult {
  id?: string;
  success: boolean;
  errors?: SalesforceError[];
}

// Describe Types
export interface DescribeObjectResponse {
  name: string;
  label: string;
  labelPlural: string;
  keyPrefix?: string;
  queryable: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
  fields: FieldDescribe[];
}

export interface FieldDescribe {
  name: string;
  label: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  nillable: boolean;
  createable: boolean;
  updateable: boolean;
  defaultValue?: unknown;
  picklistValues?: PicklistValue[];
  referenceTo?: string[];
}

export interface PicklistValue {
  value: string;
  label: string;
  active: boolean;
  defaultValue: boolean;
}

// Error Types
export interface SalesforceError {
  statusCode: string;
  message: string;
  fields?: string[];
}

// Connector Configuration
export interface SalesforceConnectorConfig {
  clientId: string;
  redirectUri: string;
  sandbox?: boolean;
  apiVersion?: string;
}

// Event Types
export interface SalesforceEvent {
  type: 'connected' | 'disconnected' | 'error' | 'token_refreshed';
  payload?: unknown;
  timestamp: Date;
}

export type SalesforceEventHandler = (event: SalesforceEvent) => void;

// Export all types
export type {
  SalesforceCredentials as Credentials,
  OAuthConfig as AuthConfig,
  SOQLQueryResponse as QueryResponse,
  SObjectRecord as Record,
};
