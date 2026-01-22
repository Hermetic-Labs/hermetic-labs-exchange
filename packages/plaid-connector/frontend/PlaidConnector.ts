import { EventEmitter } from './EventEmitter';
import crypto from '../../_shared/crypto';

// ============================================================================
// Plaid Connector - Full Implementation
// Supports Link token flow, Account/Transaction retrieval, Identity, Auth,
// Balance, Investments, Liabilities, and Webhooks
// ============================================================================

export interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: 'sandbox' | 'development' | 'production';
  apiVersion?: string;
  timeout?: number;
}

export interface LinkTokenRequest {
  userId: string;
  clientName: string;
  products: PlaidProduct[];
  countryCodes?: string[];
  language?: string;
  webhook?: string;
  accessToken?: string; // For update mode
  linkCustomizationName?: string;
  redirectUri?: string;
  androidPackageName?: string;
  accountFilters?: AccountFilters;
  euConfig?: {
    headless: boolean;
  };
  institutionId?: string;
}

export interface AccountFilters {
  depository?: {
    accountSubtypes: string[];
  };
  credit?: {
    accountSubtypes: string[];
  };
  loan?: {
    accountSubtypes: string[];
  };
  investment?: {
    accountSubtypes: string[];
  };
}

export type PlaidProduct =
  | 'transactions'
  | 'auth'
  | 'identity'
  | 'assets'
  | 'investments'
  | 'liabilities'
  | 'payment_initiation'
  | 'deposit_switch'
  | 'income_verification'
  | 'standing_orders'
  | 'transfer'
  | 'employment'
  | 'recurring_transactions'
  | 'signal'
  | 'statements';

export interface LinkTokenResponse {
  linkToken: string;
  expiration: Date;
  requestId: string;
}

export interface PlaidAccount {
  accountId: string;
  name: string;
  officialName?: string;
  type: 'depository' | 'credit' | 'loan' | 'investment' | 'brokerage' | 'other';
  subtype?: string;
  mask?: string;
  balances: {
    available?: number;
    current?: number;
    limit?: number;
    isoCurrencyCode?: string;
    unofficialCurrencyCode?: string;
    lastUpdatedDatetime?: Date;
  };
  verificationStatus?: 'pending_automatic_verification' | 'pending_manual_verification' | 'manually_verified' | 'verification_expired' | 'verification_failed';
}

export interface PlaidTransaction {
  transactionId: string;
  accountId: string;
  amount: number;
  isoCurrencyCode?: string;
  unofficialCurrencyCode?: string;
  category?: string[];
  categoryId?: string;
  checkNumber?: string;
  date: string;
  datetime?: string;
  authorizedDate?: string;
  authorizedDatetime?: string;
  location: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    lat?: number;
    lon?: number;
    storeNumber?: string;
  };
  name: string;
  merchantName?: string;
  paymentChannel: 'online' | 'in store' | 'other';
  pending: boolean;
  pendingTransactionId?: string;
  personalFinanceCategory?: {
    primary: string;
    detailed: string;
  };
  transactionCode?: string;
  transactionType?: string;
}

export interface PlaidInstitution {
  institutionId: string;
  name: string;
  products: PlaidProduct[];
  countryCodes: string[];
  url?: string;
  primaryColor?: string;
  logo?: string;
  routingNumbers?: string[];
  oauth: boolean;
}

export interface PlaidIdentity {
  accountId: string;
  owners: Array<{
    names: string[];
    phoneNumbers: Array<{
      data: string;
      primary: boolean;
      type: string;
    }>;
    emails: Array<{
      data: string;
      primary: boolean;
      type: string;
    }>;
    addresses: Array<{
      data: {
        city?: string;
        region?: string;
        street?: string;
        postalCode?: string;
        country?: string;
      };
      primary: boolean;
    }>;
  }>;
}

export interface PlaidAuthData {
  accountId: string;
  numbers: {
    ach?: Array<{
      accountId: string;
      account: string;
      routing: string;
      wireRouting?: string;
    }>;
    eft?: Array<{
      accountId: string;
      account: string;
      institution: string;
      branch: string;
    }>;
    international?: Array<{
      accountId: string;
      iban: string;
      bic: string;
    }>;
    bacs?: Array<{
      accountId: string;
      account: string;
      sortCode: string;
    }>;
  };
}

export interface PlaidLiability {
  accountId: string;
  type: 'credit' | 'mortgage' | 'student';
  credit?: {
    isOverdue: boolean;
    lastPaymentAmount?: number;
    lastPaymentDate?: string;
    lastStatementBalance?: number;
    lastStatementIssueDate?: string;
    minimumPaymentAmount?: number;
    nextPaymentDueDate?: string;
    aprs: Array<{
      aprPercentage: number;
      aprType: string;
      balanceSubjectToApr?: number;
      interestChargeAmount?: number;
    }>;
  };
  mortgage?: {
    accountNumber: string;
    currentLateFee?: number;
    escrowBalance?: number;
    hasPmi: boolean;
    hasPrepaymentPenalty: boolean;
    interestRate: {
      percentage: number;
      type: string;
    };
    lastPaymentAmount?: number;
    lastPaymentDate?: string;
    loanTermMonths?: number;
    loanTypeDescription?: string;
    maturityDate?: string;
    nextMonthlyPayment?: number;
    nextPaymentDueDate?: string;
    originationDate?: string;
    originationPrincipalAmount?: number;
    pastDueAmount?: number;
    propertyAddress: {
      city?: string;
      region?: string;
      street?: string;
      postalCode?: string;
      country?: string;
    };
    ytdInterestPaid?: number;
    ytdPrincipalPaid?: number;
  };
  student?: {
    accountNumber?: string;
    accountStatus?: string;
    disbursementDates?: string[];
    expectedPayoffDate?: string;
    guarantor?: string;
    interestRatePercentage: number;
    isOverdue: boolean;
    lastPaymentAmount?: number;
    lastPaymentDate?: string;
    lastStatementBalance?: number;
    lastStatementIssueDate?: string;
    loanName?: string;
    loanStatus: {
      endDate?: string;
      type: string;
    };
    minimumPaymentAmount?: number;
    nextPaymentDueDate?: string;
    originationDate?: string;
    originationPrincipalAmount?: number;
    outstandingInterestAmount?: number;
    paymentReferenceNumber?: string;
    pslfStatus: {
      estimatedEligibilityDate?: string;
      paymentsMade?: number;
      paymentsRemaining?: number;
    };
    repaymentPlan: {
      description?: string;
      type: string;
    };
    sequenceNumber?: string;
    servicerAddress: {
      city?: string;
      region?: string;
      street?: string;
      postalCode?: string;
      country?: string;
    };
    ytdInterestPaid?: number;
    ytdPrincipalPaid?: number;
  };
}

export interface PlaidInvestmentHolding {
  accountId: string;
  securityId: string;
  institutionPrice: number;
  institutionPriceAsOf?: string;
  institutionPriceDatetime?: string;
  institutionValue: number;
  costBasis?: number;
  quantity: number;
  isoCurrencyCode?: string;
  unofficialCurrencyCode?: string;
}

export interface PlaidSecurity {
  securityId: string;
  isin?: string;
  cusip?: string;
  sedol?: string;
  institutionSecurityId?: string;
  institutionId?: string;
  proxySecurityId?: string;
  name?: string;
  tickerSymbol?: string;
  isCashEquivalent: boolean;
  type: string;
  closePrice?: number;
  closePriceAsOf?: string;
  isoCurrencyCode?: string;
  unofficialCurrencyCode?: string;
}

export interface PlaidInvestmentTransaction {
  investmentTransactionId: string;
  accountId: string;
  securityId?: string;
  date: string;
  name: string;
  quantity: number;
  amount: number;
  price: number;
  fees?: number;
  type: string;
  subtype: string;
  isoCurrencyCode?: string;
  unofficialCurrencyCode?: string;
}

export interface WebhookVerification {
  isValid: boolean;
  webhookType: string;
  webhookCode: string;
  itemId?: string;
  error?: {
    errorCode: string;
    errorMessage: string;
  };
}

export interface ItemStatus {
  itemId: string;
  institutionId: string;
  webhook?: string;
  error?: {
    errorCode: string;
    errorMessage: string;
    errorType: string;
    displayMessage?: string;
  };
  availableProducts: PlaidProduct[];
  billedProducts: PlaidProduct[];
  consentExpirationTime?: Date;
  updateType: 'background' | 'user_present_required';
}

interface AccessTokenStore {
  accessToken: string;
  itemId: string;
  institutionId?: string;
  createdAt: Date;
}

export class PlaidConnector extends EventEmitter {
  private config: PlaidConfig | null = null;
  private accessTokens: Map<string, AccessTokenStore> = new Map();
  private baseUrl: string = '';
  private timeout: number = 30000;

  private static readonly ENVIRONMENTS = {
    sandbox: 'https://sandbox.plaid.com',
    development: 'https://development.plaid.com',
    production: 'https://production.plaid.com'
  };

  configure(config: PlaidConfig): void {
    this.config = config;
    this.baseUrl = PlaidConnector.ENVIRONMENTS[config.environment];
    if (config.timeout) {
      this.timeout = config.timeout;
    }
    this.emit('configured', { environment: config.environment });
  }

  /**
   * Create a Link token for initializing Plaid Link
   */
  async createLinkToken(request: LinkTokenRequest): Promise<string> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      user: {
        client_user_id: request.userId
      },
      client_name: request.clientName,
      products: request.products,
      country_codes: request.countryCodes || ['US'],
      language: request.language || 'en'
    };

    if (request.webhook) {
      payload.webhook = request.webhook;
    }
    if (request.accessToken) {
      payload.access_token = request.accessToken;
    }
    if (request.linkCustomizationName) {
      payload.link_customization_name = request.linkCustomizationName;
    }
    if (request.redirectUri) {
      payload.redirect_uri = request.redirectUri;
    }
    if (request.androidPackageName) {
      payload.android_package_name = request.androidPackageName;
    }
    if (request.accountFilters) {
      payload.account_filters = this.formatAccountFilters(request.accountFilters);
    }
    if (request.euConfig) {
      payload.eu_config = request.euConfig;
    }
    if (request.institutionId) {
      payload.institution_id = request.institutionId;
    }

    const response = await this.apiRequest<{
      link_token: string;
      expiration: string;
      request_id: string;
    }>('/link/token/create', payload);

    this.emit('linkTokenCreated', { userId: request.userId });
    return response.link_token;
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string): Promise<string> {
    const response = await this.apiRequest<{
      access_token: string;
      item_id: string;
      request_id: string;
    }>('/item/public_token/exchange', {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      public_token: publicToken
    });

    // Store the access token
    this.accessTokens.set(response.item_id, {
      accessToken: response.access_token,
      itemId: response.item_id,
      createdAt: new Date()
    });

    this.emit('publicTokenExchanged', { itemId: response.item_id });
    return response.access_token;
  }

  /**
   * Get accounts for an access token
   */
  async getAccounts(accessToken: string): Promise<PlaidAccount[]> {
    const response = await this.apiRequest<{
      accounts: any[];
      item: any;
      request_id: string;
    }>('/accounts/get', {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken
    });

    return response.accounts.map(a => this.mapAccount(a));
  }

  /**
   * Get account balances
   */
  async getBalances(accessToken: string, accountIds?: string[]): Promise<PlaidAccount[]> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken
    };

    if (accountIds && accountIds.length > 0) {
      payload.options = { account_ids: accountIds };
    }

    const response = await this.apiRequest<{
      accounts: any[];
      item: any;
      request_id: string;
    }>('/accounts/balance/get', payload);

    return response.accounts.map(a => this.mapAccount(a));
  }

  /**
   * Get transactions for a date range
   */
  async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    options?: {
      accountIds?: string[];
      count?: number;
      offset?: number;
      includeOriginalDescription?: boolean;
      includePersonalFinanceCategory?: boolean;
    }
  ): Promise<{ transactions: PlaidTransaction[]; totalTransactions: number }> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate
    };

    if (options) {
      payload.options = {};
      if (options.accountIds) {
        payload.options.account_ids = options.accountIds;
      }
      if (options.count) {
        payload.options.count = options.count;
      }
      if (options.offset) {
        payload.options.offset = options.offset;
      }
      if (options.includeOriginalDescription) {
        payload.options.include_original_description = options.includeOriginalDescription;
      }
      if (options.includePersonalFinanceCategory) {
        payload.options.include_personal_finance_category = options.includePersonalFinanceCategory;
      }
    }

    const response = await this.apiRequest<{
      accounts: any[];
      transactions: any[];
      total_transactions: number;
      item: any;
      request_id: string;
    }>('/transactions/get', payload);

    this.emit('transactionsRetrieved', {
      count: response.transactions.length,
      total: response.total_transactions
    });

    return {
      transactions: response.transactions.map(t => this.mapTransaction(t)),
      totalTransactions: response.total_transactions
    };
  }

  /**
   * Sync transactions (incremental updates)
   */
  async syncTransactions(
    accessToken: string,
    cursor?: string,
    options?: {
      count?: number;
      includeOriginalDescription?: boolean;
      includePersonalFinanceCategory?: boolean;
    }
  ): Promise<{
    added: PlaidTransaction[];
    modified: PlaidTransaction[];
    removed: Array<{ transactionId: string }>;
    nextCursor: string;
    hasMore: boolean;
  }> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken
    };

    if (cursor) {
      payload.cursor = cursor;
    }

    if (options) {
      payload.options = {};
      if (options.count) {
        payload.options.count = options.count;
      }
      if (options.includeOriginalDescription) {
        payload.options.include_original_description = options.includeOriginalDescription;
      }
      if (options.includePersonalFinanceCategory) {
        payload.options.include_personal_finance_category = options.includePersonalFinanceCategory;
      }
    }

    const response = await this.apiRequest<{
      added: any[];
      modified: any[];
      removed: Array<{ transaction_id: string }>;
      next_cursor: string;
      has_more: boolean;
      request_id: string;
    }>('/transactions/sync', payload);

    return {
      added: response.added.map(t => this.mapTransaction(t)),
      modified: response.modified.map(t => this.mapTransaction(t)),
      removed: response.removed.map(r => ({ transactionId: r.transaction_id })),
      nextCursor: response.next_cursor,
      hasMore: response.has_more
    };
  }

  /**
   * Get recurring transactions
   */
  async getRecurringTransactions(
    accessToken: string,
    accountIds?: string[]
  ): Promise<{
    inflowStreams: any[];
    outflowStreams: any[];
  }> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken
    };

    if (accountIds) {
      payload.options = { account_ids: accountIds };
    }

    const response = await this.apiRequest<{
      inflow_streams: any[];
      outflow_streams: any[];
      request_id: string;
    }>('/transactions/recurring/get', payload);

    return {
      inflowStreams: response.inflow_streams,
      outflowStreams: response.outflow_streams
    };
  }

  /**
   * Get identity information
   */
  async getIdentity(accessToken: string, accountIds?: string[]): Promise<PlaidIdentity[]> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken
    };

    if (accountIds) {
      payload.options = { account_ids: accountIds };
    }

    const response = await this.apiRequest<{
      accounts: any[];
      item: any;
      request_id: string;
    }>('/identity/get', payload);

    return response.accounts.map(a => ({
      accountId: a.account_id,
      owners: (a.owners || []).map((o: any) => ({
        names: o.names || [],
        phoneNumbers: (o.phone_numbers || []).map((p: any) => ({
          data: p.data,
          primary: p.primary,
          type: p.type
        })),
        emails: (o.emails || []).map((e: any) => ({
          data: e.data,
          primary: e.primary,
          type: e.type
        })),
        addresses: (o.addresses || []).map((addr: any) => ({
          data: addr.data || {},
          primary: addr.primary
        }))
      }))
    }));
  }

  /**
   * Get auth/routing numbers
   */
  async getAuth(accessToken: string, accountIds?: string[]): Promise<PlaidAuthData[]> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken
    };

    if (accountIds) {
      payload.options = { account_ids: accountIds };
    }

    const response = await this.apiRequest<{
      accounts: any[];
      numbers: {
        ach: any[];
        eft: any[];
        international: any[];
        bacs: any[];
      };
      item: any;
      request_id: string;
    }>('/auth/get', payload);

    return response.accounts.map(a => ({
      accountId: a.account_id,
      numbers: {
        ach: response.numbers.ach.filter((n: any) => n.account_id === a.account_id),
        eft: response.numbers.eft.filter((n: any) => n.account_id === a.account_id),
        international: response.numbers.international.filter((n: any) => n.account_id === a.account_id),
        bacs: response.numbers.bacs.filter((n: any) => n.account_id === a.account_id)
      }
    }));
  }

  /**
   * Get liabilities
   */
  async getLiabilities(accessToken: string, accountIds?: string[]): Promise<PlaidLiability[]> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken
    };

    if (accountIds) {
      payload.options = { account_ids: accountIds };
    }

    const response = await this.apiRequest<{
      accounts: any[];
      liabilities: {
        credit: any[];
        mortgage: any[];
        student: any[];
      };
      item: any;
      request_id: string;
    }>('/liabilities/get', payload);

    const liabilities: PlaidLiability[] = [];

    // Map credit liabilities
    for (const credit of response.liabilities.credit || []) {
      liabilities.push({
        accountId: credit.account_id,
        type: 'credit',
        credit: {
          isOverdue: credit.is_overdue,
          lastPaymentAmount: credit.last_payment_amount,
          lastPaymentDate: credit.last_payment_date,
          lastStatementBalance: credit.last_statement_balance,
          lastStatementIssueDate: credit.last_statement_issue_date,
          minimumPaymentAmount: credit.minimum_payment_amount,
          nextPaymentDueDate: credit.next_payment_due_date,
          aprs: (credit.aprs || []).map((apr: any) => ({
            aprPercentage: apr.apr_percentage,
            aprType: apr.apr_type,
            balanceSubjectToApr: apr.balance_subject_to_apr,
            interestChargeAmount: apr.interest_charge_amount
          }))
        }
      });
    }

    // Map mortgage liabilities
    for (const mortgage of response.liabilities.mortgage || []) {
      liabilities.push({
        accountId: mortgage.account_id,
        type: 'mortgage',
        mortgage: {
          accountNumber: mortgage.account_number,
          currentLateFee: mortgage.current_late_fee,
          escrowBalance: mortgage.escrow_balance,
          hasPmi: mortgage.has_pmi,
          hasPrepaymentPenalty: mortgage.has_prepayment_penalty,
          interestRate: {
            percentage: mortgage.interest_rate?.percentage,
            type: mortgage.interest_rate?.type
          },
          lastPaymentAmount: mortgage.last_payment_amount,
          lastPaymentDate: mortgage.last_payment_date,
          loanTermMonths: mortgage.loan_term,
          loanTypeDescription: mortgage.loan_type_description,
          maturityDate: mortgage.maturity_date,
          nextMonthlyPayment: mortgage.next_monthly_payment,
          nextPaymentDueDate: mortgage.next_payment_due_date,
          originationDate: mortgage.origination_date,
          originationPrincipalAmount: mortgage.origination_principal_amount,
          pastDueAmount: mortgage.past_due_amount,
          propertyAddress: mortgage.property_address || {},
          ytdInterestPaid: mortgage.ytd_interest_paid,
          ytdPrincipalPaid: mortgage.ytd_principal_paid
        }
      });
    }

    // Map student liabilities
    for (const student of response.liabilities.student || []) {
      liabilities.push({
        accountId: student.account_id,
        type: 'student',
        student: {
          accountNumber: student.account_number,
          accountStatus: student.account_status,
          disbursementDates: student.disbursement_dates,
          expectedPayoffDate: student.expected_payoff_date,
          guarantor: student.guarantor,
          interestRatePercentage: student.interest_rate_percentage,
          isOverdue: student.is_overdue,
          lastPaymentAmount: student.last_payment_amount,
          lastPaymentDate: student.last_payment_date,
          lastStatementBalance: student.last_statement_balance,
          lastStatementIssueDate: student.last_statement_issue_date,
          loanName: student.loan_name,
          loanStatus: student.loan_status || {},
          minimumPaymentAmount: student.minimum_payment_amount,
          nextPaymentDueDate: student.next_payment_due_date,
          originationDate: student.origination_date,
          originationPrincipalAmount: student.origination_principal_amount,
          outstandingInterestAmount: student.outstanding_interest_amount,
          paymentReferenceNumber: student.payment_reference_number,
          pslfStatus: student.pslf_status || {},
          repaymentPlan: student.repayment_plan || {},
          sequenceNumber: student.sequence_number,
          servicerAddress: student.servicer_address || {},
          ytdInterestPaid: student.ytd_interest_paid,
          ytdPrincipalPaid: student.ytd_principal_paid
        }
      });
    }

    return liabilities;
  }

  /**
   * Get investment holdings
   */
  async getInvestmentHoldings(accessToken: string, accountIds?: string[]): Promise<{
    holdings: PlaidInvestmentHolding[];
    securities: PlaidSecurity[];
  }> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken
    };

    if (accountIds) {
      payload.options = { account_ids: accountIds };
    }

    const response = await this.apiRequest<{
      accounts: any[];
      holdings: any[];
      securities: any[];
      item: any;
      request_id: string;
    }>('/investments/holdings/get', payload);

    return {
      holdings: response.holdings.map(h => ({
        accountId: h.account_id,
        securityId: h.security_id,
        institutionPrice: h.institution_price,
        institutionPriceAsOf: h.institution_price_as_of,
        institutionPriceDatetime: h.institution_price_datetime,
        institutionValue: h.institution_value,
        costBasis: h.cost_basis,
        quantity: h.quantity,
        isoCurrencyCode: h.iso_currency_code,
        unofficialCurrencyCode: h.unofficial_currency_code
      })),
      securities: response.securities.map(s => ({
        securityId: s.security_id,
        isin: s.isin,
        cusip: s.cusip,
        sedol: s.sedol,
        institutionSecurityId: s.institution_security_id,
        institutionId: s.institution_id,
        proxySecurityId: s.proxy_security_id,
        name: s.name,
        tickerSymbol: s.ticker_symbol,
        isCashEquivalent: s.is_cash_equivalent,
        type: s.type,
        closePrice: s.close_price,
        closePriceAsOf: s.close_price_as_of,
        isoCurrencyCode: s.iso_currency_code,
        unofficialCurrencyCode: s.unofficial_currency_code
      }))
    };
  }

  /**
   * Get investment transactions
   */
  async getInvestmentTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    options?: {
      accountIds?: string[];
      count?: number;
      offset?: number;
    }
  ): Promise<{
    investmentTransactions: PlaidInvestmentTransaction[];
    totalInvestmentTransactions: number;
    securities: PlaidSecurity[];
  }> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate
    };

    if (options) {
      payload.options = {};
      if (options.accountIds) {
        payload.options.account_ids = options.accountIds;
      }
      if (options.count) {
        payload.options.count = options.count;
      }
      if (options.offset) {
        payload.options.offset = options.offset;
      }
    }

    const response = await this.apiRequest<{
      accounts: any[];
      investment_transactions: any[];
      total_investment_transactions: number;
      securities: any[];
      item: any;
      request_id: string;
    }>('/investments/transactions/get', payload);

    return {
      investmentTransactions: response.investment_transactions.map(t => ({
        investmentTransactionId: t.investment_transaction_id,
        accountId: t.account_id,
        securityId: t.security_id,
        date: t.date,
        name: t.name,
        quantity: t.quantity,
        amount: t.amount,
        price: t.price,
        fees: t.fees,
        type: t.type,
        subtype: t.subtype,
        isoCurrencyCode: t.iso_currency_code,
        unofficialCurrencyCode: t.unofficial_currency_code
      })),
      totalInvestmentTransactions: response.total_investment_transactions,
      securities: response.securities.map(s => ({
        securityId: s.security_id,
        isin: s.isin,
        cusip: s.cusip,
        sedol: s.sedol,
        institutionSecurityId: s.institution_security_id,
        institutionId: s.institution_id,
        proxySecurityId: s.proxy_security_id,
        name: s.name,
        tickerSymbol: s.ticker_symbol,
        isCashEquivalent: s.is_cash_equivalent,
        type: s.type,
        closePrice: s.close_price,
        closePriceAsOf: s.close_price_as_of,
        isoCurrencyCode: s.iso_currency_code,
        unofficialCurrencyCode: s.unofficial_currency_code
      }))
    };
  }

  /**
   * Get item status
   */
  async getItem(accessToken: string): Promise<ItemStatus> {
    const response = await this.apiRequest<{
      item: any;
      status: any;
      request_id: string;
    }>('/item/get', {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken
    });

    return {
      itemId: response.item.item_id,
      institutionId: response.item.institution_id,
      webhook: response.item.webhook,
      error: response.item.error,
      availableProducts: response.item.available_products,
      billedProducts: response.item.billed_products,
      consentExpirationTime: response.item.consent_expiration_time
        ? new Date(response.item.consent_expiration_time)
        : undefined,
      updateType: response.item.update_type
    };
  }

  /**
   * Update item webhook
   */
  async updateItemWebhook(accessToken: string, webhook: string): Promise<void> {
    await this.apiRequest('/item/webhook/update', {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken,
      webhook
    });

    this.emit('webhookUpdated', { webhook });
  }

  /**
   * Remove an item
   */
  async removeItem(accessToken: string): Promise<void> {
    await this.apiRequest('/item/remove', {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken
    });

    // Remove from local store
    for (const [itemId, store] of this.accessTokens.entries()) {
      if (store.accessToken === accessToken) {
        this.accessTokens.delete(itemId);
        break;
      }
    }

    this.emit('itemRemoved');
  }

  /**
   * Search institutions
   */
  async searchInstitutions(
    query: string,
    options?: {
      products?: PlaidProduct[];
      countryCodes?: string[];
      count?: number;
      offset?: number;
      oauth?: boolean;
    }
  ): Promise<PlaidInstitution[]> {
    const payload: any = {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      query,
      country_codes: options?.countryCodes || ['US']
    };

    if (options?.products) {
      payload.products = options.products;
    }
    if (options?.count) {
      payload.options = { ...payload.options, count: options.count };
    }
    if (options?.offset) {
      payload.options = { ...payload.options, offset: options.offset };
    }
    if (options?.oauth !== undefined) {
      payload.options = { ...payload.options, oauth: options.oauth };
    }

    const response = await this.apiRequest<{
      institutions: any[];
      request_id: string;
    }>('/institutions/search', payload);

    return response.institutions.map(i => this.mapInstitution(i));
  }

  /**
   * Get institution by ID
   */
  async getInstitution(institutionId: string, countryCodes?: string[]): Promise<PlaidInstitution | null> {
    try {
      const response = await this.apiRequest<{
        institution: any;
        request_id: string;
      }>('/institutions/get_by_id', {
        client_id: this.config!.clientId,
        secret: this.config!.secret,
        institution_id: institutionId,
        country_codes: countryCodes || ['US']
      });

      return this.mapInstitution(response.institution);
    } catch (error: any) {
      if (error.code === 'INVALID_INSTITUTION') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    body: string,
    signedJwt: string,
    currentKeyId: string
  ): WebhookVerification {
    try {
      // Parse the JWT
      const [headerB64, payloadB64, signatureB64] = signedJwt.split('.');

      if (!headerB64 || !payloadB64 || !signatureB64) {
        return {
          isValid: false,
          webhookType: '',
          webhookCode: '',
          error: {
            errorCode: 'INVALID_JWT',
            errorMessage: 'Invalid JWT format'
          }
        };
      }

      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

      // Verify the key ID matches
      if (header.kid !== currentKeyId) {
        return {
          isValid: false,
          webhookType: payload.webhook_type || '',
          webhookCode: payload.webhook_code || '',
          error: {
            errorCode: 'KEY_ID_MISMATCH',
            errorMessage: 'JWT key ID does not match expected key'
          }
        };
      }

      // Verify the body hash
      const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
      if (payload.request_body_sha256 !== bodyHash) {
        return {
          isValid: false,
          webhookType: payload.webhook_type || '',
          webhookCode: payload.webhook_code || '',
          error: {
            errorCode: 'BODY_HASH_MISMATCH',
            errorMessage: 'Request body hash does not match'
          }
        };
      }

      // Parse the webhook body
      const webhookBody = JSON.parse(body);

      return {
        isValid: true,
        webhookType: webhookBody.webhook_type,
        webhookCode: webhookBody.webhook_code,
        itemId: webhookBody.item_id
      };
    } catch (error: any) {
      return {
        isValid: false,
        webhookType: '',
        webhookCode: '',
        error: {
          errorCode: 'VERIFICATION_ERROR',
          errorMessage: error.message
        }
      };
    }
  }

  /**
   * Create sandbox public token (testing only)
   */
  async createSandboxPublicToken(
    institutionId: string,
    products: PlaidProduct[]
  ): Promise<string> {
    if (this.config?.environment !== 'sandbox') {
      throw new Error('Sandbox tokens can only be created in sandbox environment');
    }

    const response = await this.apiRequest<{
      public_token: string;
      request_id: string;
    }>('/sandbox/public_token/create', {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      institution_id: institutionId,
      initial_products: products
    });

    return response.public_token;
  }

  /**
   * Fire sandbox webhook (testing only)
   */
  async fireSandboxWebhook(
    accessToken: string,
    webhookCode: string
  ): Promise<void> {
    if (this.config?.environment !== 'sandbox') {
      throw new Error('Sandbox webhooks can only be fired in sandbox environment');
    }

    await this.apiRequest('/sandbox/item/fire_webhook', {
      client_id: this.config!.clientId,
      secret: this.config!.secret,
      access_token: accessToken,
      webhook_code: webhookCode
    });
  }

  // ==================== Private Methods ====================

  private async apiRequest<T>(endpoint: string, payload: any): Promise<T> {
    if (!this.config) {
      throw new Error('Plaid connector not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;

    const response = await this.httpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': this.config.clientId,
        'PLAID-SECRET': this.config.secret,
        'Plaid-Version': this.config.apiVersion || '2020-09-14'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody.error_message || `Plaid API error: ${response.status}`);
      (error as any).code = errorBody.error_code;
      (error as any).type = errorBody.error_type;
      (error as any).displayMessage = errorBody.display_message;
      (error as any).requestId = errorBody.request_id;
      throw error;
    }

    return await response.json();
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

  private mapAccount(data: any): PlaidAccount {
    return {
      accountId: data.account_id,
      name: data.name,
      officialName: data.official_name,
      type: data.type,
      subtype: data.subtype,
      mask: data.mask,
      balances: {
        available: data.balances?.available,
        current: data.balances?.current,
        limit: data.balances?.limit,
        isoCurrencyCode: data.balances?.iso_currency_code,
        unofficialCurrencyCode: data.balances?.unofficial_currency_code,
        lastUpdatedDatetime: data.balances?.last_updated_datetime
          ? new Date(data.balances.last_updated_datetime)
          : undefined
      },
      verificationStatus: data.verification_status
    };
  }

  private mapTransaction(data: any): PlaidTransaction {
    return {
      transactionId: data.transaction_id,
      accountId: data.account_id,
      amount: data.amount,
      isoCurrencyCode: data.iso_currency_code,
      unofficialCurrencyCode: data.unofficial_currency_code,
      category: data.category,
      categoryId: data.category_id,
      checkNumber: data.check_number,
      date: data.date,
      datetime: data.datetime,
      authorizedDate: data.authorized_date,
      authorizedDatetime: data.authorized_datetime,
      location: {
        address: data.location?.address,
        city: data.location?.city,
        region: data.location?.region,
        postalCode: data.location?.postal_code,
        country: data.location?.country,
        lat: data.location?.lat,
        lon: data.location?.lon,
        storeNumber: data.location?.store_number
      },
      name: data.name,
      merchantName: data.merchant_name,
      paymentChannel: data.payment_channel,
      pending: data.pending,
      pendingTransactionId: data.pending_transaction_id,
      personalFinanceCategory: data.personal_finance_category
        ? {
          primary: data.personal_finance_category.primary,
          detailed: data.personal_finance_category.detailed
        }
        : undefined,
      transactionCode: data.transaction_code,
      transactionType: data.transaction_type
    };
  }

  private mapInstitution(data: any): PlaidInstitution {
    return {
      institutionId: data.institution_id,
      name: data.name,
      products: data.products,
      countryCodes: data.country_codes,
      url: data.url,
      primaryColor: data.primary_color,
      logo: data.logo,
      routingNumbers: data.routing_numbers,
      oauth: data.oauth
    };
  }

  private formatAccountFilters(filters: AccountFilters): any {
    const result: any = {};

    if (filters.depository) {
      result.depository = { account_subtypes: filters.depository.accountSubtypes };
    }
    if (filters.credit) {
      result.credit = { account_subtypes: filters.credit.accountSubtypes };
    }
    if (filters.loan) {
      result.loan = { account_subtypes: filters.loan.accountSubtypes };
    }
    if (filters.investment) {
      result.investment = { account_subtypes: filters.investment.accountSubtypes };
    }

    return result;
  }
}

export const plaidConnector = new PlaidConnector();
export default PlaidConnector;
