import { EventEmitter } from './EventEmitter';
import crypto from '../../_shared/crypto';

// ============================================================================
// SAP Connector - Full Implementation
// Supports SAP OData, RFC/BAPI calls, IDoc processing, and S/4HANA integration
// ============================================================================

export interface SAPConfig {
  host: string;
  client: string;
  username: string;
  password: string;
  language?: string;
  sysnr?: string;
  sapRouter?: string;
  useTLS?: boolean;
  timeout?: number;
  maxRetries?: number;
}

export interface SAPODataConfig {
  serviceUrl: string;
  apiKey?: string;
  oauthConfig?: {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope?: string;
  };
}

export interface RFCResult {
  success: boolean;
  exports: Record<string, any>;
  tables: Record<string, any[]>;
  changing?: Record<string, any>;
  exception?: string;
  messages: RFCMessage[];
}

export interface RFCMessage {
  type: 'S' | 'E' | 'W' | 'I' | 'A'; // Success, Error, Warning, Info, Abort
  id: string;
  number: string;
  message: string;
  logNo?: string;
  logMsgNo?: string;
  messageV1?: string;
  messageV2?: string;
  messageV3?: string;
  messageV4?: string;
}

export interface TableReadOptions {
  delimiter?: string;
  noData?: boolean;
  rowSkips?: number;
  rowCount?: number;
  options?: string[];
}

export interface ODataEntity {
  __metadata?: {
    uri: string;
    type: string;
    etag?: string;
  };
  [key: string]: any;
}

export interface ODataResponse<T = ODataEntity> {
  d: {
    results?: T[];
    __count?: string;
    __next?: string;
  } & T;
}

export interface ODataBatchRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: any;
  headers?: Record<string, string>;
  changeSetId?: string;
}

export interface ODataBatchResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}

export interface IDocData {
  docType: string;
  mesType: string;
  senderPort: string;
  senderPartner: string;
  senderPartnerType: string;
  receiverPort: string;
  receiverPartner: string;
  receiverPartnerType: string;
  segments: IDocSegment[];
}

export interface IDocSegment {
  segmentName: string;
  segmentNumber: number;
  parentNumber: number;
  fields: Record<string, string>;
  children?: IDocSegment[];
}

export interface IDocResult {
  docNum: string;
  status: string;
  statusText: string;
  createdAt: Date;
}

export interface BAPIResult<T = any> {
  success: boolean;
  data: T;
  return: BAPIReturn[];
}

export interface BAPIReturn {
  type: 'S' | 'E' | 'W' | 'I' | 'A';
  id: string;
  number: string;
  message: string;
  logNo?: string;
  logMsgNo?: string;
  messageV1?: string;
  messageV2?: string;
  messageV3?: string;
  messageV4?: string;
  parameter?: string;
  row?: number;
  field?: string;
  system?: string;
}

export interface MaterialData {
  materialNumber: string;
  description: string;
  materialType: string;
  industryStd: string;
  baseUnit: string;
  plant?: string;
  storageLocation?: string;
  salesOrg?: string;
  distributionChannel?: string;
}

export interface SalesOrderData {
  orderType: string;
  salesOrg: string;
  distributionChannel: string;
  division: string;
  soldToParty: string;
  purchaseOrderNo?: string;
  items: SalesOrderItem[];
}

export interface SalesOrderItem {
  itemNumber?: string;
  material: string;
  quantity: number;
  unit?: string;
  plant?: string;
  netPrice?: number;
  currency?: string;
}

export interface SalesOrderResult {
  salesOrderNumber: string;
  items: Array<{
    itemNumber: string;
    material: string;
    quantity: number;
    netValue: number;
    currency: string;
  }>;
  messages: BAPIReturn[];
}

interface TokenStore {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  scope?: string;
}

export class SAPConnector extends EventEmitter {
  private config: SAPConfig | null = null;
  private odataConfig: SAPODataConfig | null = null;
  private connected: boolean = false;
  private csrfToken: string | null = null;
  private sessionCookie: string | null = null;
  private tokenStore: TokenStore | null = null;
  private timeout: number = 30000;
  private maxRetries: number = 3;

  configure(config: SAPConfig): void {
    this.config = config;
    if (config.timeout) {
      this.timeout = config.timeout;
    }
    if (config.maxRetries) {
      this.maxRetries = config.maxRetries;
    }
    this.emit('configured', { host: config.host, client: config.client });
  }

  /**
   * Configure OData service connection
   */
  configureOData(config: SAPODataConfig): void {
    this.odataConfig = config;
    this.emit('odataConfigured', { serviceUrl: config.serviceUrl });
  }

  /**
   * Establish connection to SAP system
   */
  async connect(): Promise<boolean> {
    if (!this.config) {
      throw new Error('SAP connector not configured');
    }

    try {
      // Authenticate and get session
      const authResult = await this.authenticate();
      if (authResult) {
        this.connected = true;
        this.emit('connected', { host: this.config.host });
        return true;
      }
      return false;
    } catch (error) {
      this.emit('error', { type: 'connection', error });
      throw error;
    }
  }

  /**
   * Authenticate with SAP and obtain session/CSRF token
   */
  private async authenticate(): Promise<boolean> {
    if (!this.config) {
      throw new Error('SAP connector not configured');
    }

    const protocol = this.config.useTLS ? 'https' : 'http';
    const baseUrl = `${protocol}://${this.config.host}`;

    // Basic auth header
    const authHeader = 'Basic ' + Buffer.from(
      `${this.config.username}:${this.config.password}`
    ).toString('base64');

    // Request CSRF token
    const response = await this.httpRequest(`${baseUrl}/sap/bc/ping`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'X-CSRF-Token': 'Fetch',
        'sap-client': this.config.client,
        'sap-language': this.config.language || 'EN'
      }
    });

    if (response.ok) {
      this.csrfToken = response.headers.get('x-csrf-token');
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        // Extract session cookie
        const sessionMatch = cookies.match(/SAP_SESSIONID_[^=]+=([^;]+)/);
        if (sessionMatch) {
          this.sessionCookie = sessionMatch[0];
        }
      }
      return true;
    }

    throw new Error(`SAP authentication failed: ${response.status} ${response.statusText}`);
  }

  /**
   * Get OAuth token for OData services
   */
  private async getOAuthToken(): Promise<string> {
    if (!this.odataConfig?.oauthConfig) {
      throw new Error('OAuth not configured');
    }

    // Check if we have a valid token
    if (this.tokenStore && this.tokenStore.expiresAt > Date.now() + 60000) {
      return this.tokenStore.accessToken;
    }

    const { tokenUrl, clientId, clientSecret, scope } = this.odataConfig.oauthConfig;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    });

    if (scope) {
      body.set('scope', scope);
    }

    const response = await this.httpRequest(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error(`OAuth token request failed: ${response.status}`);
    }

    const tokenData = await response.json();
    this.tokenStore = {
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      scope: tokenData.scope
    };

    return this.tokenStore.accessToken;
  }

  /**
   * Call an RFC function module
   */
  async callRFC(functionName: string, params: Record<string, any>): Promise<RFCResult> {
    await this.ensureConnected();

    if (!this.config) {
      throw new Error('SAP connector not configured');
    }

    const protocol = this.config.useTLS ? 'https' : 'http';
    const baseUrl = `${protocol}://${this.config.host}`;
    const rfcUrl = `${baseUrl}/sap/bc/soap/rfc`;

    // Build SOAP envelope for RFC call
    const soapEnvelope = this.buildRFCSoapEnvelope(functionName, params);

    const response = await this.authenticatedRequest(rfcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `urn:sap-com:document:sap:rfc:functions:${functionName}`
      },
      body: soapEnvelope
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RFC call failed: ${response.status} - ${errorText}`);
    }

    const responseXml = await response.text();
    const result = this.parseRFCResponse(functionName, responseXml);

    this.emit('rfcCalled', { functionName, success: result.success });
    return result;
  }

  /**
   * Read SAP table using RFC_READ_TABLE
   */
  async readTable(
    tableName: string,
    fields: string[],
    options: TableReadOptions = {}
  ): Promise<any[]> {
    const params: Record<string, any> = {
      QUERY_TABLE: tableName,
      DELIMITER: options.delimiter || '|',
      NO_DATA: options.noData ? 'X' : '',
      ROWSKIPS: options.rowSkips || 0,
      ROWCOUNT: options.rowCount || 0
    };

    // Add field selection
    if (fields.length > 0) {
      params.FIELDS = fields.map(f => ({ FIELDNAME: f }));
    }

    // Add WHERE conditions
    if (options.options && options.options.length > 0) {
      params.OPTIONS = options.options.map(o => ({ TEXT: o }));
    }

    const result = await this.callRFC('RFC_READ_TABLE', params);

    if (!result.success) {
      throw new Error(`Table read failed: ${result.exception || 'Unknown error'}`);
    }

    // Parse the DATA table using field metadata
    const fieldInfo = result.tables.FIELDS || [];
    const dataRows = result.tables.DATA || [];
    const delimiter = options.delimiter || '|';

    return dataRows.map((row: any) => {
      const values = (row.WA || '').split(delimiter);
      const record: Record<string, any> = {};

      fieldInfo.forEach((field: any, index: number) => {
        const fieldName = field.FIELDNAME;
        let value = values[index] || '';

        // Trim based on offset and length
        const offset = parseInt(field.OFFSET) || 0;
        const length = parseInt(field.LENGTH) || value.length;
        value = value.substring(offset, offset + length).trim();

        // Type conversion
        switch (field.TYPE) {
          case 'I': // Integer
          case 'b': // Int1
          case 's': // Int2
            record[fieldName] = parseInt(value) || 0;
            break;
          case 'P': // Packed decimal
          case 'F': // Float
            record[fieldName] = parseFloat(value) || 0;
            break;
          case 'D': // Date
            if (value && value !== '00000000') {
              record[fieldName] = new Date(
                parseInt(value.substring(0, 4)),
                parseInt(value.substring(4, 6)) - 1,
                parseInt(value.substring(6, 8))
              );
            } else {
              record[fieldName] = null;
            }
            break;
          case 'T': // Time
            if (value) {
              record[fieldName] = `${value.substring(0, 2)}:${value.substring(2, 4)}:${value.substring(4, 6)}`;
            } else {
              record[fieldName] = null;
            }
            break;
          default:
            record[fieldName] = value;
        }
      });

      return record;
    });
  }

  // ==================== OData Operations ====================

  /**
   * OData GET request
   */
  async odataGet<T = ODataEntity>(
    entitySet: string,
    options: {
      key?: string | Record<string, any>;
      select?: string[];
      expand?: string[];
      filter?: string;
      orderby?: string;
      top?: number;
      skip?: number;
      count?: boolean;
    } = {}
  ): Promise<T[]> {
    const url = this.buildODataUrl(entitySet, options);
    const response = await this.odataRequest<ODataResponse<T>>(url, { method: 'GET' });

    if (response.d.results) {
      return response.d.results;
    }

    // Single entity response
    return [response.d as T];
  }

  /**
   * OData POST (create entity)
   */
  async odataCreate<T = ODataEntity>(entitySet: string, data: Partial<T>): Promise<T> {
    const url = `${this.odataConfig?.serviceUrl}/${entitySet}`;
    const response = await this.odataRequest<ODataResponse<T>>(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    this.emit('odataCreate', { entitySet });
    return response.d as T;
  }

  /**
   * OData PATCH (update entity)
   */
  async odataUpdate<T = ODataEntity>(
    entitySet: string,
    key: string | Record<string, any>,
    data: Partial<T>,
    etag?: string
  ): Promise<void> {
    const keyStr = typeof key === 'string' ? key : this.formatODataKey(key);
    const url = `${this.odataConfig?.serviceUrl}/${entitySet}(${keyStr})`;

    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-Match'] = etag;
    }

    await this.odataRequest(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });

    this.emit('odataUpdate', { entitySet, key });
  }

  /**
   * OData DELETE
   */
  async odataDelete(
    entitySet: string,
    key: string | Record<string, any>,
    etag?: string
  ): Promise<void> {
    const keyStr = typeof key === 'string' ? key : this.formatODataKey(key);
    const url = `${this.odataConfig?.serviceUrl}/${entitySet}(${keyStr})`;

    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-Match'] = etag;
    }

    await this.odataRequest(url, {
      method: 'DELETE',
      headers
    });

    this.emit('odataDelete', { entitySet, key });
  }

  /**
   * OData batch request
   */
  async odataBatch(requests: ODataBatchRequest[]): Promise<ODataBatchResponse[]> {
    const boundary = `batch_${crypto.randomBytes(16).toString('hex')}`;
    const changeSetBoundary = `changeset_${crypto.randomBytes(16).toString('hex')}`;

    let batchBody = '';
    let inChangeSet = false;

    for (const req of requests) {
      if (req.method !== 'GET' && !inChangeSet) {
        // Start changeset for modification requests
        batchBody += `--${boundary}\r\n`;
        batchBody += `Content-Type: multipart/mixed; boundary=${changeSetBoundary}\r\n\r\n`;
        inChangeSet = true;
      } else if (req.method === 'GET' && inChangeSet) {
        // Close changeset
        batchBody += `--${changeSetBoundary}--\r\n`;
        inChangeSet = false;
      }

      const partBoundary = inChangeSet ? changeSetBoundary : boundary;
      batchBody += `--${partBoundary}\r\n`;
      batchBody += 'Content-Type: application/http\r\n';
      batchBody += 'Content-Transfer-Encoding: binary\r\n\r\n';
      batchBody += `${req.method} ${req.url} HTTP/1.1\r\n`;

      // Add headers
      const headers = req.headers || {};
      if (req.body) {
        headers['Content-Type'] = 'application/json';
      }
      for (const [key, value] of Object.entries(headers)) {
        batchBody += `${key}: ${value}\r\n`;
      }
      batchBody += '\r\n';

      if (req.body) {
        batchBody += JSON.stringify(req.body);
      }
      batchBody += '\r\n';
    }

    if (inChangeSet) {
      batchBody += `--${changeSetBoundary}--\r\n`;
    }
    batchBody += `--${boundary}--\r\n`;

    const response = await this.odataRequest<string>(
      `${this.odataConfig?.serviceUrl}/$batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/mixed; boundary=${boundary}`
        },
        body: batchBody
      },
      true
    );

    return this.parseBatchResponse(response, boundary);
  }

  // ==================== BAPI Wrappers ====================

  /**
   * Get material details using BAPI_MATERIAL_GET_DETAIL
   */
  async getMaterial(materialNumber: string, plant?: string): Promise<MaterialData | null> {
    const params: Record<string, any> = {
      MATERIAL: materialNumber.padStart(18, '0')
    };

    if (plant) {
      params.PLANT = plant;
    }

    const result = await this.callRFC('BAPI_MATERIAL_GET_DETAIL', params);

    if (!result.success || result.exception) {
      return null;
    }

    const header = result.exports.MATERIAL_GENERAL_DATA || {};
    return {
      materialNumber: header.MATERIAL?.trim() || materialNumber,
      description: header.MATL_DESC?.trim() || '',
      materialType: header.MATL_TYPE?.trim() || '',
      industryStd: header.IND_SECTOR?.trim() || '',
      baseUnit: header.BASE_UOM?.trim() || '',
      plant: plant
    };
  }

  /**
   * Create sales order using BAPI_SALESORDER_CREATEFROMDAT2
   */
  async createSalesOrder(orderData: SalesOrderData): Promise<SalesOrderResult> {
    const params: Record<string, any> = {
      ORDER_HEADER_IN: {
        DOC_TYPE: orderData.orderType,
        SALES_ORG: orderData.salesOrg,
        DISTR_CHAN: orderData.distributionChannel,
        DIVISION: orderData.division,
        PURCH_NO_C: orderData.purchaseOrderNo || ''
      },
      ORDER_PARTNERS: [
        {
          PARTN_ROLE: 'AG', // Sold-to party
          PARTN_NUMB: orderData.soldToParty.padStart(10, '0')
        }
      ],
      ORDER_ITEMS_IN: orderData.items.map((item, index) => ({
        ITM_NUMBER: item.itemNumber || String((index + 1) * 10).padStart(6, '0'),
        MATERIAL: item.material.padStart(18, '0'),
        TARGET_QTY: item.quantity,
        TARGET_QU: item.unit || 'EA',
        PLANT: item.plant || ''
      })),
      ORDER_CONDITIONS_IN: orderData.items
        .filter(item => item.netPrice !== undefined)
        .map((item, index) => ({
          ITM_NUMBER: item.itemNumber || String((index + 1) * 10).padStart(6, '0'),
          COND_TYPE: 'PR00',
          COND_VALUE: item.netPrice,
          CURRENCY: item.currency || 'USD'
        }))
    };

    const result = await this.callRFC('BAPI_SALESORDER_CREATEFROMDAT2', params);

    // Check for errors in RETURN table
    const returnMessages: BAPIReturn[] = (result.tables.RETURN || []).map((r: any) => ({
      type: r.TYPE,
      id: r.ID,
      number: r.NUMBER,
      message: r.MESSAGE,
      parameter: r.PARAMETER,
      row: r.ROW,
      field: r.FIELD
    }));

    const errors = returnMessages.filter(m => m.type === 'E' || m.type === 'A');
    if (errors.length > 0) {
      throw new Error(`Sales order creation failed: ${errors.map(e => e.message).join('; ')}`);
    }

    const salesOrderNumber = result.exports.SALESDOCUMENT || '';

    // Commit the transaction
    await this.callRFC('BAPI_TRANSACTION_COMMIT', { WAIT: 'X' });

    this.emit('salesOrderCreated', { salesOrderNumber });

    return {
      salesOrderNumber,
      items: (result.tables.ORDER_ITEMS_OUT || []).map((item: any) => ({
        itemNumber: item.ITM_NUMBER,
        material: item.MATERIAL,
        quantity: parseFloat(item.TARGET_QTY) || 0,
        netValue: parseFloat(item.NET_VALUE) || 0,
        currency: item.CURRENCY
      })),
      messages: returnMessages
    };
  }

  /**
   * Get customer details using BAPI_CUSTOMER_GETDETAIL2
   */
  async getCustomer(customerNumber: string): Promise<any> {
    const params = {
      CUSTOMERNO: customerNumber.padStart(10, '0')
    };

    const result = await this.callRFC('BAPI_CUSTOMER_GETDETAIL2', params);

    if (!result.success) {
      return null;
    }

    const generalData = result.exports.CUSTOMERADDRESS || {};
    const companyData = result.tables.CUSTOMERBANKDETAIL || [];

    return {
      customerNumber: customerNumber,
      name: generalData.NAME?.trim() || '',
      street: generalData.STREET?.trim() || '',
      city: generalData.CITY?.trim() || '',
      postalCode: generalData.POSTL_COD1?.trim() || '',
      country: generalData.COUNTRY?.trim() || '',
      region: generalData.REGION?.trim() || '',
      telephone: generalData.TEL1_NUMBR?.trim() || '',
      fax: generalData.FAX_NUMBER?.trim() || '',
      email: generalData.E_MAIL?.trim() || '',
      bankDetails: companyData
    };
  }

  // ==================== IDoc Processing ====================

  /**
   * Send IDoc to SAP
   */
  async sendIDoc(idocData: IDocData): Promise<IDocResult> {
    await this.ensureConnected();

    if (!this.config) {
      throw new Error('SAP connector not configured');
    }

    // Build IDoc XML
    const idocXml = this.buildIDocXml(idocData);

    const protocol = this.config.useTLS ? 'https' : 'http';
    const idocUrl = `${protocol}://${this.config.host}/sap/bc/idoc_xml/inbound`;

    const response = await this.authenticatedRequest(idocUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8'
      },
      body: idocXml
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IDoc send failed: ${response.status} - ${errorText}`);
    }

    const resultXml = await response.text();
    const result = this.parseIDocResponse(resultXml);

    this.emit('idocSent', { docType: idocData.docType, docNum: result.docNum });
    return result;
  }

  /**
   * Check IDoc status
   */
  async getIDocStatus(docNum: string): Promise<{ status: string; statusText: string }> {
    const result = await this.callRFC('IDOC_READ_COMPLETELY', {
      DOCUMENT_NUMBER: docNum
    });

    if (!result.success) {
      throw new Error(`Failed to read IDoc: ${result.exception}`);
    }

    const controlRecord = result.exports.EDIDC || {};
    const statusCode = controlRecord.STATUS || '';

    const statusTexts: Record<string, string> = {
      '01': 'IDoc created',
      '03': 'Data passed to port OK',
      '12': 'Dispatch OK',
      '30': 'IDoc ready to be transferred to application',
      '50': 'IDoc added',
      '51': 'Application document not posted',
      '53': 'Application document posted',
      '64': 'IDoc ready for dispatch',
      '68': 'Error - no further processing'
    };

    return {
      status: statusCode,
      statusText: statusTexts[statusCode] || 'Unknown status'
    };
  }

  // ==================== Connection Management ====================

  /**
   * Disconnect from SAP
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.csrfToken = null;
    this.sessionCookie = null;
    this.tokenStore = null;
    this.emit('disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Ping SAP system
   */
  async ping(): Promise<boolean> {
    try {
      await this.ensureConnected();
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Private Methods ====================

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  private buildODataUrl(
    entitySet: string,
    options: {
      key?: string | Record<string, any>;
      select?: string[];
      expand?: string[];
      filter?: string;
      orderby?: string;
      top?: number;
      skip?: number;
      count?: boolean;
    }
  ): string {
    let url = `${this.odataConfig?.serviceUrl}/${entitySet}`;

    if (options.key) {
      const keyStr = typeof options.key === 'string'
        ? options.key
        : this.formatODataKey(options.key);
      url += `(${keyStr})`;
    }

    const params = new URLSearchParams();

    if (options.select?.length) {
      params.set('$select', options.select.join(','));
    }
    if (options.expand?.length) {
      params.set('$expand', options.expand.join(','));
    }
    if (options.filter) {
      params.set('$filter', options.filter);
    }
    if (options.orderby) {
      params.set('$orderby', options.orderby);
    }
    if (options.top !== undefined) {
      params.set('$top', String(options.top));
    }
    if (options.skip !== undefined) {
      params.set('$skip', String(options.skip));
    }
    if (options.count) {
      params.set('$inlinecount', 'allpages');
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  private formatODataKey(key: Record<string, any>): string {
    return Object.entries(key)
      .map(([k, v]) => {
        if (typeof v === 'string') {
          return `${k}='${v}'`;
        }
        return `${k}=${v}`;
      })
      .join(',');
  }

  private async odataRequest<T>(
    url: string,
    options: RequestInit,
    rawResponse: boolean = false
  ): Promise<T> {
    if (!this.odataConfig) {
      throw new Error('OData not configured');
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    // Add authentication
    if (this.odataConfig.oauthConfig) {
      const token = await this.getOAuthToken();
      headers['Authorization'] = `Bearer ${token}`;
    } else if (this.odataConfig.apiKey) {
      headers['APIKey'] = this.odataConfig.apiKey;
    } else if (this.config) {
      headers['Authorization'] = 'Basic ' + Buffer.from(
        `${this.config.username}:${this.config.password}`
      ).toString('base64');
      headers['sap-client'] = this.config.client;
    }

    // Get CSRF token for modifying requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || '')) {
      if (!this.csrfToken) {
        await this.fetchCsrfToken(url, headers);
      }
      headers['X-CSRF-Token'] = this.csrfToken!;
    }

    const response = await this.httpRequest(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OData request failed: ${response.status} - ${errorBody}`);
    }

    if (rawResponse) {
      return await response.text() as unknown as T;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  }

  private async fetchCsrfToken(url: string, headers: Record<string, string>): Promise<void> {
    const baseUrl = url.split('?')[0];
    const response = await this.httpRequest(baseUrl, {
      method: 'GET',
      headers: {
        ...headers,
        'X-CSRF-Token': 'Fetch'
      }
    });

    this.csrfToken = response.headers.get('x-csrf-token');
  }

  private async authenticatedRequest(url: string, options: RequestInit): Promise<Response> {
    if (!this.config) {
      throw new Error('SAP connector not configured');
    }

    const headers: Record<string, string> = {
      'Authorization': 'Basic ' + Buffer.from(
        `${this.config.username}:${this.config.password}`
      ).toString('base64'),
      'sap-client': this.config.client,
      'sap-language': this.config.language || 'EN',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || '')) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }

    return await this.httpRequest(url, {
      ...options,
      headers
    });
  }

  private buildRFCSoapEnvelope(functionName: string, params: Record<string, any>): string {
    const xmlParams = this.objectToXml(params);

    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:urn="urn:sap-com:document:sap:rfc:functions">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:${functionName}>
      ${xmlParams}
    </urn:${functionName}>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private objectToXml(obj: any, indent: string = ''): string {
    if (obj === null || obj === undefined) {
      return '';
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.objectToXml(item, indent)).join('\n');
    }

    if (typeof obj === 'object') {
      return Object.entries(obj)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return value.map(item =>
              `${indent}<${key}>\n${this.objectToXml(item, indent + '  ')}\n${indent}</${key}>`
            ).join('\n');
          }
          if (typeof value === 'object' && value !== null) {
            return `${indent}<${key}>\n${this.objectToXml(value, indent + '  ')}\n${indent}</${key}>`;
          }
          return `${indent}<${key}>${this.escapeXml(String(value))}</${key}>`;
        })
        .join('\n');
    }

    return this.escapeXml(String(obj));
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private parseRFCResponse(functionName: string, xml: string): RFCResult {
    // Simple XML parsing for RFC response
    const result: RFCResult = {
      success: true,
      exports: {},
      tables: {},
      messages: []
    };

    // Check for SOAP fault
    const faultMatch = xml.match(/<faultstring>([^<]*)<\/faultstring>/);
    if (faultMatch) {
      result.success = false;
      result.exception = faultMatch[1];
      return result;
    }

    // Parse exports (simple values)
    const responseMatch = xml.match(new RegExp(`<urn:${functionName}.Response[^>]*>([\\s\\S]*?)<\\/urn:${functionName}.Response>`));
    if (responseMatch) {
      const responseContent = responseMatch[1];

      // Extract table data
      const tableMatches = responseContent.matchAll(/<(\w+)>\s*<item>([\s\S]*?)<\/item>\s*<\/\1>/g);
      for (const match of tableMatches) {
        const tableName = match[1];
        const itemsContent = match[0];
        const items: any[] = [];

        const itemMatches = itemsContent.matchAll(/<item>([\s\S]*?)<\/item>/g);
        for (const itemMatch of itemMatches) {
          const item: Record<string, string> = {};
          const fieldMatches = itemMatch[1].matchAll(/<(\w+)>([^<]*)<\/\1>/g);
          for (const fieldMatch of fieldMatches) {
            item[fieldMatch[1]] = fieldMatch[2];
          }
          items.push(item);
        }

        result.tables[tableName] = items;
      }

      // Extract simple export parameters
      const simpleMatches = responseContent.matchAll(/<(\w+)>([^<]*)<\/\1>/g);
      for (const match of simpleMatches) {
        if (!result.tables[match[1]]) {
          result.exports[match[1]] = match[2];
        }
      }
    }

    return result;
  }

  private buildIDocXml(idocData: IDocData): string {
    const segmentsXml = this.buildSegmentsXml(idocData.segments);

    return `<?xml version="1.0" encoding="UTF-8"?>
<IDOC BEGIN="1">
  <EDI_DC40 SEGMENT="1">
    <DOCTYP>${idocData.docType}</DOCTYP>
    <MESTYP>${idocData.mesType}</MESTYP>
    <SNDPOR>${idocData.senderPort}</SNDPOR>
    <SNDPRT>${idocData.senderPartnerType}</SNDPRT>
    <SNDPRN>${idocData.senderPartner}</SNDPRN>
    <RCVPOR>${idocData.receiverPort}</RCVPOR>
    <RCVPRT>${idocData.receiverPartnerType}</RCVPRT>
    <RCVPRN>${idocData.receiverPartner}</RCVPRN>
  </EDI_DC40>
  ${segmentsXml}
</IDOC>`;
  }

  private buildSegmentsXml(segments: IDocSegment[], indent: string = ''): string {
    return segments.map(seg => {
      const fieldsXml = Object.entries(seg.fields)
        .map(([key, value]) => `${indent}    <${key}>${this.escapeXml(value)}</${key}>`)
        .join('\n');

      const childrenXml = seg.children ? this.buildSegmentsXml(seg.children, indent + '  ') : '';

      return `${indent}  <${seg.segmentName} SEGMENT="1">
${fieldsXml}
${childrenXml}${indent}  </${seg.segmentName}>`;
    }).join('\n');
  }

  private parseIDocResponse(xml: string): IDocResult {
    // Parse IDoc response
    const docNumMatch = xml.match(/<DOCNUM>(\d+)<\/DOCNUM>/);
    const statusMatch = xml.match(/<STATUS>(\d+)<\/STATUS>/);

    return {
      docNum: docNumMatch?.[1] || '',
      status: statusMatch?.[1] || '',
      statusText: this.getIDocStatusText(statusMatch?.[1] || ''),
      createdAt: new Date()
    };
  }

  private getIDocStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      '01': 'IDoc created',
      '03': 'Data passed to port OK',
      '12': 'Dispatch OK',
      '30': 'IDoc ready for application',
      '53': 'Application document posted'
    };
    return statusMap[status] || 'Unknown status';
  }

  private parseBatchResponse(response: string, boundary: string): ODataBatchResponse[] {
    const results: ODataBatchResponse[] = [];
    const parts = response.split(`--${boundary}`);

    for (const part of parts) {
      if (part.includes('HTTP/1.1')) {
        const lines = part.split('\r\n');
        let statusLine = '';
        const headers: Record<string, string> = {};
        let bodyStart = false;
        let body = '';

        for (const line of lines) {
          if (line.startsWith('HTTP/1.1')) {
            statusLine = line;
          } else if (bodyStart) {
            body += line;
          } else if (line === '') {
            bodyStart = true;
          } else if (line.includes(':')) {
            const [key, value] = line.split(':').map(s => s.trim());
            headers[key] = value;
          }
        }

        const statusMatch = statusLine.match(/HTTP\/1\.1 (\d+)/);
        const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

        results.push({
          statusCode,
          headers,
          body: body ? JSON.parse(body) : null
        });
      }
    }

    return results;
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
}

export const sapConnector = new SAPConnector();
export default SAPConnector;
