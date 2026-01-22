import { EventEmitter } from './EventEmitter';
import crypto from '../../_shared/crypto';

// ============================================================================
// Salesforce Connector - Full Implementation
// Supports OAuth 2.0 Web Server Flow, REST API, SOQL, Bulk API
// ============================================================================

export interface SalesforceConfig {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiVersion?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface SalesforceAuthResult {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  tokenType: string;
  issuedAt: string;
  signature: string;
  scope?: string;
  idToken?: string;
  expiresIn?: number;
}

export interface SalesforceUser {
  id: string;
  organizationId: string;
  userName: string;
  displayName: string;
  email: string;
  active: boolean;
  userType: string;
  profileId: string;
  roleId?: string;
  timezone: string;
  locale: string;
  language: string;
}

export interface SObject {
  Id: string;
  attributes: {
    type: string;
    url: string;
  };
  [key: string]: any;
}

export interface QueryResult<T = SObject> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}

export interface CreateResult {
  id: string;
  success: boolean;
  errors: SalesforceError[];
}

export interface UpdateResult {
  id: string;
  success: boolean;
  errors: SalesforceError[];
}

export interface DeleteResult {
  id: string;
  success: boolean;
  errors: SalesforceError[];
}

export interface SalesforceError {
  statusCode: string;
  message: string;
  fields?: string[];
  errorCode?: string;
}

export interface DescribeSObjectResult {
  name: string;
  label: string;
  labelPlural: string;
  keyPrefix: string;
  custom: boolean;
  createable: boolean;
  deletable: boolean;
  queryable: boolean;
  updateable: boolean;
  searchable: boolean;
  fields: SObjectField[];
  recordTypeInfos: RecordTypeInfo[];
  childRelationships: ChildRelationship[];
}

export interface SObjectField {
  name: string;
  label: string;
  type: string;
  length: number;
  precision: number;
  scale: number;
  nillable: boolean;
  createable: boolean;
  updateable: boolean;
  unique: boolean;
  externalId: boolean;
  defaultValue?: any;
  picklistValues?: PicklistValue[];
  referenceTo?: string[];
  relationshipName?: string;
}

export interface PicklistValue {
  value: string;
  label: string;
  active: boolean;
  defaultValue: boolean;
}

export interface RecordTypeInfo {
  recordTypeId: string;
  name: string;
  developerName: string;
  defaultRecordTypeMapping: boolean;
  available: boolean;
  master: boolean;
}

export interface ChildRelationship {
  field: string;
  childSObject: string;
  relationshipName: string;
  cascadeDelete: boolean;
  restrictedDelete: boolean;
}

export interface BulkJobInfo {
  id: string;
  operation: 'insert' | 'update' | 'upsert' | 'delete' | 'hardDelete' | 'query';
  object: string;
  state: 'Open' | 'Closed' | 'Aborted' | 'Failed' | 'UploadComplete' | 'InProgress' | 'JobComplete';
  createdById: string;
  createdDate: string;
  systemModstamp: string;
  concurrencyMode: 'Parallel' | 'Serial';
  contentType: 'CSV' | 'JSON' | 'XML';
  apiVersion: string;
  lineEnding: 'LF' | 'CRLF';
  columnDelimiter: 'COMMA' | 'TAB' | 'PIPE' | 'SEMICOLON' | 'CARET' | 'BACKQUOTE';
  numberRecordsProcessed?: number;
  numberRecordsFailed?: number;
  retries?: number;
  totalProcessingTime?: number;
}

export interface ApexExecuteResult {
  success: boolean;
  compiled: boolean;
  compileProblem?: string;
  exceptionMessage?: string;
  exceptionStackTrace?: string;
  line?: number;
  column?: number;
  logs: string;
}

export interface CompositeRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  referenceId: string;
  body?: any;
  httpHeaders?: Record<string, string>;
}

export interface CompositeResponse {
  referenceId: string;
  httpStatusCode: number;
  httpHeaders: Record<string, string>;
  body: any;
}

export interface SearchResult {
  searchRecords: Array<{
    Id: string;
    attributes: {
      type: string;
      url: string;
    };
    Name?: string;
    [key: string]: any;
  }>;
}

interface TokenStore {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  expiresAt: number;
  userId?: string;
  orgId?: string;
}

export class SalesforceConnector extends EventEmitter {
  private config: SalesforceConfig | null = null;
  private tokenStore: TokenStore | null = null;
  private apiVersion: string = 'v59.0';
  private timeout: number = 30000;
  private maxRetries: number = 3;

  // OAuth endpoints
  private static readonly AUTH_ENDPOINTS = {
    production: 'https://login.salesforce.com',
    sandbox: 'https://test.salesforce.com',
    custom: '' // Will use instanceUrl
  };

  configure(config: SalesforceConfig): void {
    this.config = config;
    if (config.apiVersion) {
      this.apiVersion = config.apiVersion.startsWith('v') ? config.apiVersion : `v${config.apiVersion}`;
    }
    if (config.timeout) {
      this.timeout = config.timeout;
    }
    if (config.maxRetries) {
      this.maxRetries = config.maxRetries;
    }
    this.emit('configured', { instanceUrl: config.instanceUrl });
  }

  /**
   * Get OAuth authorization URL for user consent
   */
  getAuthorizationUrl(options: {
    state?: string;
    scope?: string[];
    prompt?: 'login' | 'consent' | 'select_account';
    loginHint?: string;
    environment?: 'production' | 'sandbox';
  } = {}): string {
    if (!this.config) {
      throw new Error('Connector not configured');
    }

    const baseUrl = options.environment === 'sandbox'
      ? SalesforceConnector.AUTH_ENDPOINTS.sandbox
      : SalesforceConnector.AUTH_ENDPOINTS.production;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state: options.state || crypto.randomBytes(16).toString('hex'),
      scope: (options.scope || ['api', 'refresh_token', 'openid']).join(' ')
    });

    if (options.prompt) {
      params.set('prompt', options.prompt);
    }
    if (options.loginHint) {
      params.set('login_hint', options.loginHint);
    }

    return `${baseUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async authenticate(authorizationCode?: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('Connector not configured');
    }

    try {
      if (authorizationCode) {
        // OAuth 2.0 authorization code flow
        const tokenResult = await this.exchangeAuthorizationCode(authorizationCode);
        this.storeTokens(tokenResult);
        return true;
      } else if (this.tokenStore?.refreshToken) {
        // Refresh existing token
        return await this.refreshAccessToken();
      }

      throw new Error('No authorization code or refresh token available');
    } catch (error) {
      this.emit('error', { type: 'authentication', error });
      throw error;
    }
  }

  /**
   * Authenticate using OAuth 2.0 Username-Password flow
   * Note: This flow is less secure and should only be used for server-to-server integrations
   */
  async authenticateWithCredentials(username: string, password: string, securityToken: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('Connector not configured');
    }

    const baseUrl = this.getLoginUrl();
    const tokenUrl = `${baseUrl}/services/oauth2/token`;

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      username: username,
      password: `${password}${securityToken}`
    });

    const response = await this.httpRequest(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Authentication failed: ${error.error_description || error.error}`);
    }

    const tokenResult = await response.json() as SalesforceAuthResult;
    this.storeTokens(tokenResult);
    this.emit('authenticated', { instanceUrl: tokenResult.instanceUrl });
    return true;
  }

  /**
   * Authenticate using JWT Bearer Token flow for server-to-server
   */
  async authenticateWithJWT(
    privateKey: string,
    username: string,
    audience?: string
  ): Promise<boolean> {
    if (!this.config) {
      throw new Error('Connector not configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const aud = audience || this.getLoginUrl();

    // Create JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    // Create JWT claims
    const claims = {
      iss: this.config.clientId,
      sub: username,
      aud: aud,
      exp: now + 180 // 3 minutes
    };

    // Sign JWT
    const token = this.signJWT(header, claims, privateKey);

    const tokenUrl = `${aud}/services/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token
    });

    const response = await this.httpRequest(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`JWT authentication failed: ${error.error_description || error.error}`);
    }

    const tokenResult = await response.json();
    this.storeTokens({
      ...tokenResult,
      refreshToken: '' // JWT flow doesn't provide refresh token
    });
    this.emit('authenticated', { instanceUrl: tokenResult.instance_url });
    return true;
  }

  /**
   * Execute SOQL query
   */
  async query<T = SObject>(soql: string): Promise<T[]> {
    await this.ensureAuthenticated();

    const allRecords: T[] = [];
    let queryUrl = `${this.getBaseUrl()}/query?q=${encodeURIComponent(soql)}`;

    do {
      const response = await this.apiRequest<QueryResult<T>>(queryUrl, { method: 'GET' });
      allRecords.push(...response.records);

      if (response.done || !response.nextRecordsUrl) {
        break;
      }

      queryUrl = `${this.tokenStore!.instanceUrl}${response.nextRecordsUrl}`;
      // eslint-disable-next-line no-constant-condition
    } while (true);

    this.emit('query', { soql, recordCount: allRecords.length });
    return allRecords;
  }

  /**
   * Execute SOQL query with pagination control
   */
  async queryWithPagination<T = SObject>(
    soql: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<QueryResult<T>> {
    await this.ensureAuthenticated();

    let modifiedSoql = soql;
    if (options.limit && !soql.toLowerCase().includes(' limit ')) {
      modifiedSoql += ` LIMIT ${options.limit}`;
    }
    if (options.offset && !soql.toLowerCase().includes(' offset ')) {
      modifiedSoql += ` OFFSET ${options.offset}`;
    }

    const queryUrl = `${this.getBaseUrl()}/query?q=${encodeURIComponent(modifiedSoql)}`;
    return await this.apiRequest<QueryResult<T>>(queryUrl, { method: 'GET' });
  }

  /**
   * Fetch more records using queryLocator
   */
  async queryMore<T = SObject>(nextRecordsUrl: string): Promise<QueryResult<T>> {
    await this.ensureAuthenticated();
    const fullUrl = nextRecordsUrl.startsWith('http')
      ? nextRecordsUrl
      : `${this.tokenStore!.instanceUrl}${nextRecordsUrl}`;
    return await this.apiRequest<QueryResult<T>>(fullUrl, { method: 'GET' });
  }

  /**
   * Execute SOSL search
   */
  async search(sosl: string): Promise<SearchResult> {
    await this.ensureAuthenticated();
    const searchUrl = `${this.getBaseUrl()}/search?q=${encodeURIComponent(sosl)}`;
    return await this.apiRequest<SearchResult>(searchUrl, { method: 'GET' });
  }

  /**
   * Create a new SObject record
   */
  async create(sobject: string, data: Record<string, any>): Promise<string> {
    await this.ensureAuthenticated();

    const url = `${this.getBaseUrl()}/sobjects/${sobject}`;
    const result = await this.apiRequest<CreateResult>(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!result.success) {
      throw new Error(`Create failed: ${result.errors.map(e => e.message).join(', ')}`);
    }

    this.emit('create', { sobject, id: result.id });
    return result.id;
  }

  /**
   * Create multiple records in a single request (up to 200)
   */
  async createMultiple(sobject: string, records: Record<string, any>[]): Promise<CreateResult[]> {
    await this.ensureAuthenticated();

    if (records.length > 200) {
      throw new Error('Maximum 200 records per batch');
    }

    const url = `${this.getBaseUrl()}/composite/sobjects`;
    const payload = {
      allOrNone: false,
      records: records.map(r => ({ attributes: { type: sobject }, ...r }))
    };

    const results = await this.apiRequest<CreateResult[]>(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    this.emit('createMultiple', { sobject, count: records.length, successCount: results.filter(r => r.success).length });
    return results;
  }

  /**
   * Update an existing SObject record
   */
  async update(sobject: string, id: string, data: Record<string, any>): Promise<boolean> {
    await this.ensureAuthenticated();

    const url = `${this.getBaseUrl()}/sobjects/${sobject}/${id}`;
    const response = await this.rawApiRequest(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });

    // 204 No Content indicates success
    const success = response.status === 204;
    if (success) {
      this.emit('update', { sobject, id });
    }
    return success;
  }

  /**
   * Update multiple records in a single request
   */
  async updateMultiple(sobject: string, records: Array<{ Id: string;[key: string]: any }>): Promise<UpdateResult[]> {
    await this.ensureAuthenticated();

    if (records.length > 200) {
      throw new Error('Maximum 200 records per batch');
    }

    const url = `${this.getBaseUrl()}/composite/sobjects`;
    const payload = {
      allOrNone: false,
      records: records.map(r => ({ attributes: { type: sobject }, ...r }))
    };

    return await this.apiRequest<UpdateResult[]>(url, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Upsert a record using external ID
   */
  async upsert(
    sobject: string,
    externalIdField: string,
    externalIdValue: string,
    data: Record<string, any>
  ): Promise<{ id: string; created: boolean }> {
    await this.ensureAuthenticated();

    const url = `${this.getBaseUrl()}/sobjects/${sobject}/${externalIdField}/${externalIdValue}`;
    const response = await this.rawApiRequest(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });

    if (response.status === 201) {
      const result = await response.json();
      return { id: result.id, created: true };
    } else if (response.status === 204) {
      // Get the ID from the header or re-query
      return { id: externalIdValue, created: false };
    }

    const error = await response.json();
    throw new Error(`Upsert failed: ${JSON.stringify(error)}`);
  }

  /**
   * Delete an SObject record
   */
  async delete(sobject: string, id: string): Promise<boolean> {
    await this.ensureAuthenticated();

    const url = `${this.getBaseUrl()}/sobjects/${sobject}/${id}`;
    const response = await this.rawApiRequest(url, { method: 'DELETE' });

    const success = response.status === 204;
    if (success) {
      this.emit('delete', { sobject, id });
    }
    return success;
  }

  /**
   * Delete multiple records
   */
  async deleteMultiple(ids: string[], allOrNone: boolean = false): Promise<DeleteResult[]> {
    await this.ensureAuthenticated();

    if (ids.length > 200) {
      throw new Error('Maximum 200 records per batch');
    }

    const url = `${this.getBaseUrl()}/composite/sobjects?ids=${ids.join(',')}&allOrNone=${allOrNone}`;
    return await this.apiRequest<DeleteResult[]>(url, { method: 'DELETE' });
  }

  /**
   * Get a single record by ID
   */
  async retrieve(sobject: string, id: string, fields?: string[]): Promise<SObject | null> {
    await this.ensureAuthenticated();

    let url = `${this.getBaseUrl()}/sobjects/${sobject}/${id}`;
    if (fields && fields.length > 0) {
      url += `?fields=${fields.join(',')}`;
    }

    try {
      return await this.apiRequest<SObject>(url, { method: 'GET' });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Describe an SObject
   */
  async describe(sobject: string): Promise<DescribeSObjectResult> {
    await this.ensureAuthenticated();
    const url = `${this.getBaseUrl()}/sobjects/${sobject}/describe`;
    return await this.apiRequest<DescribeSObjectResult>(url, { method: 'GET' });
  }

  /**
   * Get global describe information
   */
  async describeGlobal(): Promise<{ sobjects: Array<{ name: string; label: string; keyPrefix: string; custom: boolean }> }> {
    await this.ensureAuthenticated();
    const url = `${this.getBaseUrl()}/sobjects`;
    return await this.apiRequest(url, { method: 'GET' });
  }

  /**
   * Execute composite request (up to 25 subrequests)
   */
  async composite(
    requests: CompositeRequest[],
    allOrNone: boolean = false
  ): Promise<{ compositeResponse: CompositeResponse[] }> {
    await this.ensureAuthenticated();

    if (requests.length > 25) {
      throw new Error('Maximum 25 subrequests per composite call');
    }

    const url = `${this.getBaseUrl()}/composite`;
    const payload = {
      allOrNone,
      compositeRequest: requests
    };

    return await this.apiRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Execute anonymous Apex
   */
  async executeAnonymousApex(code: string): Promise<ApexExecuteResult> {
    await this.ensureAuthenticated();

    const url = `${this.tokenStore!.instanceUrl}/services/data/${this.apiVersion}/tooling/executeAnonymous?anonymousBody=${encodeURIComponent(code)}`;
    return await this.apiRequest<ApexExecuteResult>(url, { method: 'GET' });
  }

  // ==================== Bulk API 2.0 ====================

  /**
   * Create a bulk ingest job
   */
  async createBulkJob(
    object: string,
    operation: 'insert' | 'update' | 'upsert' | 'delete' | 'hardDelete',
    options: {
      externalIdFieldName?: string;
      contentType?: 'CSV' | 'JSON';
      lineEnding?: 'LF' | 'CRLF';
      columnDelimiter?: 'COMMA' | 'TAB' | 'PIPE' | 'SEMICOLON';
    } = {}
  ): Promise<BulkJobInfo> {
    await this.ensureAuthenticated();

    const url = `${this.tokenStore!.instanceUrl}/services/data/${this.apiVersion}/jobs/ingest`;
    const payload: any = {
      object,
      operation,
      contentType: options.contentType || 'CSV',
      lineEnding: options.lineEnding || 'LF',
      columnDelimiter: options.columnDelimiter || 'COMMA'
    };

    if (operation === 'upsert' && options.externalIdFieldName) {
      payload.externalIdFieldName = options.externalIdFieldName;
    }

    return await this.apiRequest<BulkJobInfo>(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Upload data to a bulk job
   */
  async uploadBulkJobData(jobId: string, csvData: string): Promise<void> {
    await this.ensureAuthenticated();

    const url = `${this.tokenStore!.instanceUrl}/services/data/${this.apiVersion}/jobs/ingest/${jobId}/batches`;
    const response = await this.rawApiRequest(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/csv'
      },
      body: csvData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload bulk data: ${error}`);
    }
  }

  /**
   * Close a bulk job to start processing
   */
  async closeBulkJob(jobId: string): Promise<BulkJobInfo> {
    await this.ensureAuthenticated();

    const url = `${this.tokenStore!.instanceUrl}/services/data/${this.apiVersion}/jobs/ingest/${jobId}`;
    return await this.apiRequest<BulkJobInfo>(url, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'UploadComplete' })
    });
  }

  /**
   * Get bulk job status
   */
  async getBulkJobStatus(jobId: string): Promise<BulkJobInfo> {
    await this.ensureAuthenticated();

    const url = `${this.tokenStore!.instanceUrl}/services/data/${this.apiVersion}/jobs/ingest/${jobId}`;
    return await this.apiRequest<BulkJobInfo>(url, { method: 'GET' });
  }

  /**
   * Get bulk job results
   */
  async getBulkJobResults(jobId: string, resultType: 'successfulResults' | 'failedResults' | 'unprocessedRecords'): Promise<string> {
    await this.ensureAuthenticated();

    const url = `${this.tokenStore!.instanceUrl}/services/data/${this.apiVersion}/jobs/ingest/${jobId}/${resultType}`;
    const response = await this.rawApiRequest(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv'
      }
    });

    return await response.text();
  }

  /**
   * Abort a bulk job
   */
  async abortBulkJob(jobId: string): Promise<BulkJobInfo> {
    await this.ensureAuthenticated();

    const url = `${this.tokenStore!.instanceUrl}/services/data/${this.apiVersion}/jobs/ingest/${jobId}`;
    return await this.apiRequest<BulkJobInfo>(url, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'Aborted' })
    });
  }

  // ==================== User & Identity ====================

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<SalesforceUser> {
    await this.ensureAuthenticated();

    const url = `${this.tokenStore!.instanceUrl}/services/oauth2/userinfo`;
    const response = await this.rawApiRequest(url, { method: 'GET' });
    const userInfo = await response.json();

    return {
      id: userInfo.user_id,
      organizationId: userInfo.organization_id,
      userName: userInfo.preferred_username,
      displayName: userInfo.name,
      email: userInfo.email,
      active: userInfo.active,
      userType: userInfo.user_type,
      profileId: userInfo.profile,
      timezone: userInfo.zoneinfo,
      locale: userInfo.locale,
      language: userInfo.language
    };
  }

  /**
   * Get organization limits
   */
  async getLimits(): Promise<Record<string, { Max: number; Remaining: number }>> {
    await this.ensureAuthenticated();
    const url = `${this.getBaseUrl()}/limits`;
    return await this.apiRequest(url, { method: 'GET' });
  }

  /**
   * Revoke access token
   */
  async logout(): Promise<void> {
    if (!this.tokenStore) {
      return;
    }

    const revokeUrl = `${this.getLoginUrl()}/services/oauth2/revoke`;
    try {
      await this.httpRequest(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `token=${this.tokenStore.accessToken}`
      });
    } catch (error) {
      // Ignore revocation errors
    }

    this.tokenStore = null;
    this.emit('logout');
  }

  /**
   * Check if connector is authenticated
   */
  isAuthenticated(): boolean {
    return this.tokenStore !== null && this.tokenStore.accessToken !== '';
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.tokenStore?.accessToken || null;
  }

  /**
   * Get instance URL
   */
  getInstanceUrl(): string | null {
    return this.tokenStore?.instanceUrl || null;
  }

  // ==================== Private Methods ====================

  private getLoginUrl(): string {
    if (this.config?.instanceUrl.includes('sandbox') || this.config?.instanceUrl.includes('test.salesforce')) {
      return SalesforceConnector.AUTH_ENDPOINTS.sandbox;
    }
    return SalesforceConnector.AUTH_ENDPOINTS.production;
  }

  private getBaseUrl(): string {
    if (!this.tokenStore) {
      throw new Error('Not authenticated');
    }
    return `${this.tokenStore.instanceUrl}/services/data/${this.apiVersion}`;
  }

  private async exchangeAuthorizationCode(code: string): Promise<SalesforceAuthResult> {
    const tokenUrl = `${this.getLoginUrl()}/services/oauth2/token`;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: this.config!.clientId,
      client_secret: this.config!.clientSecret,
      redirect_uri: this.config!.redirectUri
    });

    const response = await this.httpRequest(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    return await response.json();
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.tokenStore?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenUrl = `${this.getLoginUrl()}/services/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.tokenStore.refreshToken,
      client_id: this.config!.clientId,
      client_secret: this.config!.clientSecret
    });

    const response = await this.httpRequest(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      this.tokenStore = null;
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const tokenResult = await response.json();
    this.tokenStore = {
      ...this.tokenStore,
      accessToken: tokenResult.access_token,
      instanceUrl: tokenResult.instance_url || this.tokenStore.instanceUrl,
      expiresAt: Date.now() + 7200000 // 2 hours default
    };

    this.emit('tokenRefreshed');
    return true;
  }

  private storeTokens(result: SalesforceAuthResult): void {
    this.tokenStore = {
      accessToken: result.accessToken || (result as any).access_token,
      refreshToken: result.refreshToken || (result as any).refresh_token || '',
      instanceUrl: result.instanceUrl || (result as any).instance_url,
      expiresAt: result.expiresIn
        ? Date.now() + (result.expiresIn * 1000)
        : Date.now() + 7200000 // 2 hours default
    };
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.tokenStore) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    // Check if token is expired (with 5 min buffer)
    if (this.tokenStore.expiresAt < Date.now() + 300000) {
      if (this.tokenStore.refreshToken) {
        await this.refreshAccessToken();
      } else {
        throw new Error('Access token expired and no refresh token available');
      }
    }
  }

  private async apiRequest<T>(url: string, options: RequestInit): Promise<T> {
    const response = await this.rawApiRequest(url, options);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(
        Array.isArray(errorBody)
          ? errorBody.map((e: any) => e.message).join(', ')
          : errorBody.message || `API request failed with status ${response.status}`
      );
      (error as any).statusCode = response.status;
      (error as any).errorCode = Array.isArray(errorBody) ? errorBody[0]?.errorCode : errorBody.errorCode;
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  }

  private async rawApiRequest(url: string, options: RequestInit): Promise<Response> {
    await this.ensureAuthenticated();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.tokenStore!.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.httpRequest(url, {
          ...options,
          headers
        });

        // Handle token expiration
        if (response.status === 401) {
          await this.refreshAccessToken();
          headers['Authorization'] = `Bearer ${this.tokenStore!.accessToken}`;
          continue;
        }

        return response;
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

  private signJWT(header: object, claims: object, privateKey: string): string {
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signingInput = `${encodedHeader}.${encodedClaims}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(privateKey, 'base64url');

    return `${signingInput}.${signature}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const salesforceConnector = new SalesforceConnector();
export default SalesforceConnector;
