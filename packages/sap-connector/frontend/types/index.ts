/**
 * SAP Connector Types
 * 
 * TypeScript type definitions for SAP ERP integration
 */

// Authentication Types
export type SAPAuthType = 'basic' | 'sso' | 'certificate';

export interface SAPCredentials {
  username: string;
  password: string;
  authType?: SAPAuthType;
  certificatePath?: string;
}

export interface SAPConnectionConfig {
  host: string;
  systemNumber: string;
  client: string;
  language?: string;
  poolSize?: number;
  timeout?: number;
}

export interface SAPConnectionResponse {
  connected: boolean;
  sessionId?: string;
  systemInfo?: {
    host: string;
    systemNumber: string;
    client: string;
  };
}

// RFC Types
export interface RFCParameter {
  name: string;
  type: string;
  direction: 'import' | 'export' | 'changing' | 'tables';
  optional: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface RFCMetadata {
  name: string;
  description?: string;
  importParams: RFCParameter[];
  exportParams: RFCParameter[];
  changingParams: RFCParameter[];
  tableParams: RFCParameter[];
}

export interface RFCCallRequest {
  functionName: string;
  parameters?: Record<string, unknown>;
  commit?: boolean;
}

export interface RFCCallResponse {
  success: boolean;
  exportParams: Record<string, unknown>;
  tables: Record<string, Record<string, unknown>[]>;
  messages: RFCMessage[];
  executionTimeMs?: number;
}

export interface RFCMessage {
  type: 'S' | 'E' | 'W' | 'I' | 'A';
  id: string;
  number: string;
  message: string;
}

// BAPI Types
export interface BAPICallRequest {
  bapiName: string;
  parameters?: Record<string, unknown>;
  autoCommit?: boolean;
}

export interface BAPIMessage {
  type: string;
  id: string;
  number: string;
  message: string;
  logNumber?: string;
  logMsgNumber?: string;
}

export interface BAPICallResponse {
  success: boolean;
  data: Record<string, unknown>;
  tables: Record<string, Record<string, unknown>[]>;
  returnMessages: BAPIMessage[];
  committed: boolean;
}

// OData Types
export type ODataVersion = 'v2' | 'v4';

export interface ODataRequest {
  servicePath: string;
  entitySet: string;
  key?: string;
  select?: string[];
  filter?: string;
  expand?: string[];
  orderby?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

export interface ODataResponse<T = unknown> {
  success: boolean;
  data: T;
  count?: number;
  nextLink?: string;
  metadata?: Record<string, unknown>;
}

export interface ODataEntityRequest {
  servicePath: string;
  entitySet: string;
  key?: string;
  data: Record<string, unknown>;
}

// IDoc Types
export type IDocDirection = 'inbound' | 'outbound';

export type IDocState = 
  | 'created'
  | 'ready'
  | 'sent'
  | 'received'
  | 'processed'
  | 'error';

export interface IDocSegment {
  name: string;
  data: Record<string, unknown>;
  children?: IDocSegment[];
}

export interface IDocType {
  name: string;
  description?: string;
  extension?: string;
  messageType: string;
  segments?: IDocSegmentDefinition[];
}

export interface IDocSegmentDefinition {
  name: string;
  description: string;
  minOccurs: number;
  maxOccurs: number;
  fields: IDocFieldDefinition[];
}

export interface IDocFieldDefinition {
  name: string;
  type: string;
  length: number;
  description: string;
}

export interface IDocSendRequest {
  idocType: string;
  messageType: string;
  receiverPartner: string;
  receiverPort: string;
  segments: IDocSegment[];
}

export interface IDocSendResponse {
  success: boolean;
  idocNumber: string;
  status: IDocState;
  messages: string[];
}

export interface IDocStatus {
  idocNumber: string;
  idocType: string;
  messageType: string;
  direction: IDocDirection;
  status: IDocState;
  statusText: string;
  createdAt: string;
  updatedAt: string;
  partner: string;
}

// Connector Configuration
export interface SAPConnectorConfig {
  host: string;
  systemNumber: string;
  client: string;
  language?: string;
}

// Event Types
export interface SAPEvent {
  type: 'connected' | 'disconnected' | 'error' | 'rfc_complete' | 'bapi_complete';
  payload?: unknown;
  timestamp: Date;
}

export type SAPEventHandler = (event: SAPEvent) => void;

// Export aliases
export type {
  SAPCredentials as Credentials,
  SAPConnectionConfig as ConnectionConfig,
  RFCCallResponse as RFCResponse,
  BAPICallResponse as BAPIResponse,
};
