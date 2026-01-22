import { EventEmitter } from './EventEmitter';
// ============================================================================
// Workday Connector - Full Implementation
// Supports Workday REST API, WQL, RAAS Reports, and Integration APIs
// ============================================================================

export interface WorkdayConfig {
  tenantUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  apiVersion?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface WorkdayWorker {
  id: string;
  workerId: string;
  employeeId?: string;
  contingentWorkerId?: string;
  fullName: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  workEmail?: string;
  phone?: string;
  workPhone?: string;
  jobTitle?: string;
  businessTitle?: string;
  department?: string;
  location?: string;
  manager?: {
    id: string;
    name: string;
  };
  hireDate?: Date;
  terminationDate?: Date;
  status: 'Active' | 'Terminated' | 'On Leave' | 'Inactive';
  employeeType?: string;
  payGroup?: string;
  costCenter?: string;
  company?: string;
}

export interface WorkdayOrganization {
  id: string;
  name: string;
  code: string;
  type: string;
  parentOrg?: {
    id: string;
    name: string;
  };
  manager?: {
    id: string;
    name: string;
  };
  level?: number;
  effectiveDate?: Date;
  inactive: boolean;
  subOrganizations?: WorkdayOrganization[];
}

export interface WorkdayJobProfile {
  id: string;
  name: string;
  jobCode: string;
  jobFamily?: string;
  jobFamilyGroup?: string;
  managementLevel?: string;
  payRateType?: string;
  inactive: boolean;
}

export interface WorkdayCompensation {
  workerId: string;
  compensationType: string;
  amount: number;
  currency: string;
  frequency: string;
  effectiveDate: Date;
  endDate?: Date;
  reason?: string;
}

export interface WorkdayTimeOff {
  workerId: string;
  requestId: string;
  timeOffType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalHours: number;
  status: 'Pending' | 'Approved' | 'Denied' | 'Cancelled';
  comments?: string;
}

export interface WorkdayPayslip {
  workerId: string;
  payPeriod: string;
  payDate: Date;
  grossPay: number;
  netPay: number;
  currency: string;
  earnings: Array<{
    type: string;
    amount: number;
    hours?: number;
  }>;
  deductions: Array<{
    type: string;
    amount: number;
  }>;
  taxes: Array<{
    type: string;
    amount: number;
  }>;
}

export interface WQLQuery {
  query: string;
  offset?: number;
  limit?: number;
}

export interface WQLResult<T = any> {
  total: number;
  data: T[];
}

export interface RAASReportParams {
  reportPath: string;
  format?: 'json' | 'csv' | 'xlsx';
  parameters?: Record<string, string>;
}

export interface IntegrationEvent {
  integrationId: string;
  eventId: string;
  eventType: string;
  status: 'Completed' | 'Failed' | 'In Progress' | 'Queued';
  startTime: Date;
  endTime?: Date;
  recordsProcessed?: number;
  errors?: string[];
}

export interface BusinessProcessRequest {
  businessProcessType: string;
  effectiveDate: Date;
  subject: {
    id: string;
    type: string;
  };
  initiator?: {
    id: string;
  };
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    contentType: string;
    data: string; // Base64
  }>;
}

export interface BusinessProcessResult {
  businessProcessId: string;
  status: 'Initiated' | 'In Progress' | 'Completed' | 'Denied' | 'Cancelled';
  currentStep?: string;
  approvers?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  completedDate?: Date;
}

interface TokenStore {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  refreshToken: string;
  scope?: string;
}

export class WorkdayConnector extends EventEmitter {
  private config: WorkdayConfig | null = null;
  private tokenStore: TokenStore | null = null;
  private apiVersion: string = 'v1';
  private timeout: number = 30000;
  private maxRetries: number = 3;

  configure(config: WorkdayConfig): void {
    this.config = config;
    if (config.apiVersion) {
      this.apiVersion = config.apiVersion;
    }
    if (config.timeout) {
      this.timeout = config.timeout;
    }
    if (config.maxRetries) {
      this.maxRetries = config.maxRetries;
    }
    this.emit('configured', { tenantUrl: config.tenantUrl });
  }

  /**
   * Authenticate with Workday using OAuth 2.0
   */
  async authenticate(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Workday connector not configured');
    }

    try {
      // Use refresh token to get access token
      const tokenResult = await this.refreshAccessToken();
      return tokenResult;
    } catch (error) {
      this.emit('error', { type: 'authentication', error });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Workday connector not configured');
    }

    const tokenUrl = `${this.config.tenantUrl}/ccx/oauth2/${this.getTenantName()}/token`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.config.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await this.httpRequest(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Token refresh failed: ${error.error_description || error.error || response.statusText}`);
    }

    const tokenData = await response.json();
    this.tokenStore = {
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      refreshToken: tokenData.refresh_token || this.config.refreshToken,
      scope: tokenData.scope
    };

    // Update config with new refresh token if provided
    if (tokenData.refresh_token) {
      this.config.refreshToken = tokenData.refresh_token;
    }

    this.emit('authenticated');
    return true;
  }

  /**
   * Get workers with optional filters
   */
  async getWorkers(filters?: {
    managerId?: string;
    organizationId?: string;
    locationId?: string;
    hiredAfter?: Date;
    hiredBefore?: Date;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<WorkdayWorker[]> {
    await this.ensureAuthenticated();

    const params = new URLSearchParams();

    if (filters?.limit) {
      params.set('limit', String(filters.limit));
    }
    if (filters?.offset) {
      params.set('offset', String(filters.offset));
    }

    const url = `${this.getApiBaseUrl()}/workers${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.apiRequest<{ data: any[] }>(url, { method: 'GET' });

    let workers = response.data.map(w => this.mapWorkerResponse(w));

    // Apply client-side filters
    if (filters) {
      if (filters.managerId) {
        workers = workers.filter(w => w.manager?.id === filters.managerId);
      }
      if (filters.organizationId) {
        workers = workers.filter(w => w.department === filters.organizationId);
      }
      if (filters.locationId) {
        workers = workers.filter(w => w.location === filters.locationId);
      }
      if (filters.hiredAfter) {
        workers = workers.filter(w => w.hireDate && w.hireDate >= filters.hiredAfter!);
      }
      if (filters.hiredBefore) {
        workers = workers.filter(w => w.hireDate && w.hireDate <= filters.hiredBefore!);
      }
      if (filters.activeOnly) {
        workers = workers.filter(w => w.status === 'Active');
      }
    }

    this.emit('workersRetrieved', { count: workers.length });
    return workers;
  }

  /**
   * Get single worker by ID
   */
  async getWorker(workerId: string): Promise<WorkdayWorker | null> {
    await this.ensureAuthenticated();

    try {
      const url = `${this.getApiBaseUrl()}/workers/${workerId}`;
      const response = await this.apiRequest<any>(url, { method: 'GET' });
      return this.mapWorkerResponse(response);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get worker's direct reports
   */
  async getDirectReports(managerId: string): Promise<WorkdayWorker[]> {
    await this.ensureAuthenticated();

    const url = `${this.getApiBaseUrl()}/workers/${managerId}/directReports`;
    const response = await this.apiRequest<{ data: any[] }>(url, { method: 'GET' });

    return response.data.map(w => this.mapWorkerResponse(w));
  }

  /**
   * Get organizations
   */
  async getOrganizations(filters?: {
    type?: string;
    parentId?: string;
    includeInactive?: boolean;
    effectiveDate?: Date;
  }): Promise<WorkdayOrganization[]> {
    await this.ensureAuthenticated();

    const params = new URLSearchParams();
    if (filters?.type) {
      params.set('type', filters.type);
    }
    if (filters?.effectiveDate) {
      params.set('effectiveDate', filters.effectiveDate.toISOString().split('T')[0]);
    }

    const url = `${this.getApiBaseUrl()}/organizations${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.apiRequest<{ data: any[] }>(url, { method: 'GET' });

    let orgs = response.data.map(o => this.mapOrganizationResponse(o));

    if (filters?.parentId) {
      orgs = orgs.filter(o => o.parentOrg?.id === filters.parentId);
    }
    if (!filters?.includeInactive) {
      orgs = orgs.filter(o => !o.inactive);
    }

    return orgs;
  }

  /**
   * Get organization hierarchy
   */
  async getOrganizationHierarchy(rootOrgId: string, maxDepth: number = 10): Promise<WorkdayOrganization | null> {
    await this.ensureAuthenticated();

    const allOrgs = await this.getOrganizations({ includeInactive: false });

    const buildHierarchy = (parentId: string, depth: number): WorkdayOrganization | null => {
      if (depth > maxDepth) return null;

      const org = allOrgs.find(o => o.id === parentId);
      if (!org) return null;

      const children = allOrgs.filter(o => o.parentOrg?.id === parentId);
      org.subOrganizations = children
        .map(c => buildHierarchy(c.id, depth + 1))
        .filter((o): o is WorkdayOrganization => o !== null);

      return org;
    };

    return buildHierarchy(rootOrgId, 0);
  }

  /**
   * Get job profiles
   */
  async getJobProfiles(filters?: {
    jobFamily?: string;
    inactive?: boolean;
  }): Promise<WorkdayJobProfile[]> {
    await this.ensureAuthenticated();

    const url = `${this.getApiBaseUrl()}/jobProfiles`;
    const response = await this.apiRequest<{ data: any[] }>(url, { method: 'GET' });

    let profiles = response.data.map(p => ({
      id: p.id,
      name: p.jobProfileName || p.descriptor,
      jobCode: p.jobCode || '',
      jobFamily: p.jobFamily?.descriptor,
      jobFamilyGroup: p.jobFamilyGroup?.descriptor,
      managementLevel: p.managementLevel?.descriptor,
      payRateType: p.payRateType?.descriptor,
      inactive: p.inactive || false
    }));

    if (filters?.jobFamily) {
      profiles = profiles.filter(p => p.jobFamily === filters.jobFamily);
    }
    if (filters?.inactive !== undefined) {
      profiles = profiles.filter(p => p.inactive === filters.inactive);
    }

    return profiles;
  }

  /**
   * Get worker compensation
   */
  async getWorkerCompensation(workerId: string): Promise<WorkdayCompensation[]> {
    await this.ensureAuthenticated();

    const url = `${this.getApiBaseUrl()}/workers/${workerId}/compensation`;
    const response = await this.apiRequest<{ data: any[] }>(url, { method: 'GET' });

    return response.data.map(c => ({
      workerId,
      compensationType: c.compensationPlanType?.descriptor || '',
      amount: parseFloat(c.amount) || 0,
      currency: c.currency?.id || 'USD',
      frequency: c.frequency?.descriptor || '',
      effectiveDate: new Date(c.effectiveDate),
      endDate: c.endDate ? new Date(c.endDate) : undefined,
      reason: c.reason?.descriptor
    }));
  }

  /**
   * Get worker time off requests
   */
  async getWorkerTimeOff(workerId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    status?: 'Pending' | 'Approved' | 'Denied' | 'Cancelled';
  }): Promise<WorkdayTimeOff[]> {
    await this.ensureAuthenticated();

    const params = new URLSearchParams();
    if (options?.startDate) {
      params.set('startDate', options.startDate.toISOString().split('T')[0]);
    }
    if (options?.endDate) {
      params.set('endDate', options.endDate.toISOString().split('T')[0]);
    }

    const url = `${this.getApiBaseUrl()}/workers/${workerId}/timeOffRequests${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.apiRequest<{ data: any[] }>(url, { method: 'GET' });

    let timeOffs = response.data.map(t => ({
      workerId,
      requestId: t.id,
      timeOffType: t.timeOffType?.descriptor || '',
      startDate: new Date(t.startDate),
      endDate: new Date(t.endDate),
      totalDays: parseFloat(t.totalDays) || 0,
      totalHours: parseFloat(t.totalHours) || 0,
      status: t.status as WorkdayTimeOff['status'],
      comments: t.comments
    }));

    if (options?.status) {
      timeOffs = timeOffs.filter(t => t.status === options.status);
    }

    return timeOffs;
  }

  /**
   * Get worker payslips
   */
  async getWorkerPayslips(workerId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<WorkdayPayslip[]> {
    await this.ensureAuthenticated();

    const params = new URLSearchParams();
    if (options?.startDate) {
      params.set('startDate', options.startDate.toISOString().split('T')[0]);
    }
    if (options?.endDate) {
      params.set('endDate', options.endDate.toISOString().split('T')[0]);
    }
    if (options?.limit) {
      params.set('limit', String(options.limit));
    }

    const url = `${this.getApiBaseUrl()}/workers/${workerId}/payslips${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.apiRequest<{ data: any[] }>(url, { method: 'GET' });

    return response.data.map(p => ({
      workerId,
      payPeriod: p.payPeriod,
      payDate: new Date(p.payDate),
      grossPay: parseFloat(p.grossPay) || 0,
      netPay: parseFloat(p.netPay) || 0,
      currency: p.currency?.id || 'USD',
      earnings: (p.earnings || []).map((e: any) => ({
        type: e.type?.descriptor || '',
        amount: parseFloat(e.amount) || 0,
        hours: e.hours ? parseFloat(e.hours) : undefined
      })),
      deductions: (p.deductions || []).map((d: any) => ({
        type: d.type?.descriptor || '',
        amount: parseFloat(d.amount) || 0
      })),
      taxes: (p.taxes || []).map((t: any) => ({
        type: t.type?.descriptor || '',
        amount: parseFloat(t.amount) || 0
      }))
    }));
  }

  // ==================== WQL (Workday Query Language) ====================

  /**
   * Execute WQL query
   */
  async executeWQL<T = any>(query: WQLQuery): Promise<WQLResult<T>> {
    await this.ensureAuthenticated();

    const url = `${this.getApiBaseUrl()}/wql`;
    const response = await this.apiRequest<{ total: number; data: T[] }>(url, {
      method: 'POST',
      body: JSON.stringify({
        query: query.query,
        offset: query.offset || 0,
        limit: query.limit || 100
      })
    });

    this.emit('wqlExecuted', { query: query.query, resultCount: response.data.length });
    return response;
  }

  /**
   * Execute WQL with automatic pagination
   */
  async executeWQLAll<T = any>(query: string, batchSize: number = 100): Promise<T[]> {
    const allResults: T[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await this.executeWQL<T>({
        query,
        offset,
        limit: batchSize
      });

      allResults.push(...result.data);
      offset += batchSize;
      hasMore = allResults.length < result.total;
    }

    return allResults;
  }

  // ==================== RAAS Reports ====================

  /**
   * Execute RAAS (Report-as-a-Service) report
   */
  async executeReport<T = any>(params: RAASReportParams): Promise<T[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    queryParams.set('format', params.format || 'json');

    if (params.parameters) {
      for (const [key, value] of Object.entries(params.parameters)) {
        queryParams.set(key, value);
      }
    }

    const url = `${this.config!.tenantUrl}/ccx/service/customreport2/${this.getTenantName()}/${params.reportPath}?${queryParams.toString()}`;

    const response = await this.rawApiRequest(url, { method: 'GET' });

    if (params.format === 'csv') {
      const csvText = await response.text();
      return this.parseCSV(csvText) as T[];
    }

    const jsonResponse = await response.json();
    return jsonResponse.Report_Entry || [];
  }

  /**
   * Get available RAAS reports
   */
  async getAvailableReports(): Promise<Array<{ name: string; path: string; owner: string }>> {
    await this.ensureAuthenticated();

    // This would typically call a metadata endpoint
    // For now, return empty - actual implementation depends on Workday tenant setup
    return [];
  }

  // ==================== Business Processes ====================

  /**
   * Initiate a business process
   */
  async initiateBusinessProcess(request: BusinessProcessRequest): Promise<BusinessProcessResult> {
    await this.ensureAuthenticated();

    const url = `${this.getApiBaseUrl()}/businessProcesses`;
    const response = await this.apiRequest<any>(url, {
      method: 'POST',
      body: JSON.stringify({
        businessProcessType: { id: request.businessProcessType },
        effectiveDate: request.effectiveDate.toISOString().split('T')[0],
        subject: request.subject,
        initiator: request.initiator,
        ...request.data,
        attachments: request.attachments?.map(a => ({
          fileName: a.filename,
          contentType: a.contentType,
          content: a.data
        }))
      })
    });

    this.emit('businessProcessInitiated', {
      type: request.businessProcessType,
      id: response.id
    });

    return {
      businessProcessId: response.id,
      status: response.status || 'Initiated',
      currentStep: response.currentStep?.descriptor,
      approvers: response.approvers?.map((a: any) => ({
        id: a.worker?.id,
        name: a.worker?.descriptor,
        status: a.status?.descriptor
      }))
    };
  }

  /**
   * Get business process status
   */
  async getBusinessProcessStatus(processId: string): Promise<BusinessProcessResult> {
    await this.ensureAuthenticated();

    const url = `${this.getApiBaseUrl()}/businessProcesses/${processId}`;
    const response = await this.apiRequest<any>(url, { method: 'GET' });

    return {
      businessProcessId: response.id,
      status: response.status?.descriptor || 'Unknown',
      currentStep: response.currentStep?.descriptor,
      approvers: response.approvers?.map((a: any) => ({
        id: a.worker?.id,
        name: a.worker?.descriptor,
        status: a.status?.descriptor
      })),
      completedDate: response.completedDate ? new Date(response.completedDate) : undefined
    };
  }

  /**
   * Cancel a business process
   */
  async cancelBusinessProcess(processId: string, reason?: string): Promise<boolean> {
    await this.ensureAuthenticated();

    const url = `${this.getApiBaseUrl()}/businessProcesses/${processId}/cancel`;
    await this.apiRequest(url, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });

    this.emit('businessProcessCancelled', { processId });
    return true;
  }

  // ==================== Integrations ====================

  /**
   * Get integration events
   */
  async getIntegrationEvents(integrationId: string, options?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<IntegrationEvent[]> {
    await this.ensureAuthenticated();

    const params = new URLSearchParams();
    if (options?.status) {
      params.set('status', options.status);
    }
    if (options?.startDate) {
      params.set('startDate', options.startDate.toISOString());
    }
    if (options?.endDate) {
      params.set('endDate', options.endDate.toISOString());
    }
    if (options?.limit) {
      params.set('limit', String(options.limit));
    }

    const url = `${this.getApiBaseUrl()}/integrations/${integrationId}/events${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.apiRequest<{ data: any[] }>(url, { method: 'GET' });

    return response.data.map(e => ({
      integrationId,
      eventId: e.id,
      eventType: e.eventType?.descriptor || '',
      status: e.status?.descriptor as IntegrationEvent['status'],
      startTime: new Date(e.startTime),
      endTime: e.endTime ? new Date(e.endTime) : undefined,
      recordsProcessed: e.recordsProcessed,
      errors: e.errors
    }));
  }

  /**
   * Trigger an integration
   */
  async triggerIntegration(integrationId: string, parameters?: Record<string, any>): Promise<string> {
    await this.ensureAuthenticated();

    const url = `${this.getApiBaseUrl()}/integrations/${integrationId}/trigger`;
    const response = await this.apiRequest<{ eventId: string }>(url, {
      method: 'POST',
      body: JSON.stringify(parameters || {})
    });

    this.emit('integrationTriggered', { integrationId, eventId: response.eventId });
    return response.eventId;
  }

  // ==================== Utility Methods ====================

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.tokenStore !== null && this.tokenStore.expiresAt > Date.now();
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.tokenStore?.accessToken || null;
  }

  /**
   * Logout / clear tokens
   */
  logout(): void {
    this.tokenStore = null;
    this.emit('logout');
  }

  // ==================== Private Methods ====================

  private getTenantName(): string {
    if (!this.config) {
      throw new Error('Workday connector not configured');
    }
    // Extract tenant name from URL (e.g., https://impl.workday.com/ccx/... -> impl)
    const match = this.config.tenantUrl.match(/\/\/([^.]+)\./);
    return match?.[1] || 'impl';
  }

  private getApiBaseUrl(): string {
    if (!this.config) {
      throw new Error('Workday connector not configured');
    }
    return `${this.config.tenantUrl}/ccx/api/${this.apiVersion}/${this.getTenantName()}`;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.tokenStore) {
      await this.authenticate();
      return;
    }

    // Refresh if token expires within 5 minutes
    if (this.tokenStore.expiresAt < Date.now() + 300000) {
      await this.refreshAccessToken();
    }
  }

  private async apiRequest<T>(url: string, options: RequestInit): Promise<T> {
    const response = await this.rawApiRequest(url, options);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody.error?.message || `API request failed: ${response.status}`);
      (error as any).statusCode = response.status;
      throw error;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  }

  private async rawApiRequest(url: string, options: RequestInit): Promise<Response> {
    await this.ensureAuthenticated();

    const headers: Record<string, string> = {
      'Authorization': `${this.tokenStore!.tokenType} ${this.tokenStore!.accessToken}`,
      'Content-Type': 'application/json',
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

        // Handle token expiration
        if (response.status === 401) {
          await this.refreshAccessToken();
          headers['Authorization'] = `${this.tokenStore!.tokenType} ${this.tokenStore!.accessToken}`;
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

  private mapWorkerResponse(data: any): WorkdayWorker {
    return {
      id: data.id,
      workerId: data.workerId || data.id,
      employeeId: data.employeeId,
      contingentWorkerId: data.contingentWorkerId,
      fullName: data.descriptor || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      firstName: data.firstName || data.legalName?.firstName || '',
      lastName: data.lastName || data.legalName?.lastName || '',
      preferredName: data.preferredName,
      email: data.email || data.primaryEmail,
      workEmail: data.workEmail,
      phone: data.phone || data.primaryPhone,
      workPhone: data.workPhone,
      jobTitle: data.jobTitle || data.primaryJob?.jobProfile?.descriptor,
      businessTitle: data.businessTitle,
      department: data.department || data.primaryJob?.supervisoryOrganization?.descriptor,
      location: data.location || data.primaryJob?.location?.descriptor,
      manager: data.manager ? {
        id: data.manager.id,
        name: data.manager.descriptor
      } : undefined,
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      terminationDate: data.terminationDate ? new Date(data.terminationDate) : undefined,
      status: this.mapWorkerStatus(data.workerStatus || data.status),
      employeeType: data.employeeType?.descriptor,
      payGroup: data.payGroup?.descriptor,
      costCenter: data.costCenter?.descriptor,
      company: data.company?.descriptor
    };
  }

  private mapWorkerStatus(status: any): WorkdayWorker['status'] {
    if (!status) return 'Active';

    const statusStr = typeof status === 'string' ? status : status.descriptor || status.id;
    const normalizedStatus = statusStr?.toLowerCase() || '';

    if (normalizedStatus.includes('terminated') || normalizedStatus.includes('term')) {
      return 'Terminated';
    }
    if (normalizedStatus.includes('leave')) {
      return 'On Leave';
    }
    if (normalizedStatus.includes('inactive')) {
      return 'Inactive';
    }
    return 'Active';
  }

  private mapOrganizationResponse(data: any): WorkdayOrganization {
    return {
      id: data.id,
      name: data.descriptor || data.name,
      code: data.code || data.organizationCode || '',
      type: data.organizationType?.descriptor || data.type || '',
      parentOrg: data.superiorOrganization ? {
        id: data.superiorOrganization.id,
        name: data.superiorOrganization.descriptor
      } : undefined,
      manager: data.manager ? {
        id: data.manager.id,
        name: data.manager.descriptor
      } : undefined,
      level: data.level,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
      inactive: data.inactive || false
    };
  }

  private parseCSV(csvText: string): Record<string, string>[] {
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const results: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      results.push(row);
    }

    return results;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const workdayConnector = new WorkdayConnector();
