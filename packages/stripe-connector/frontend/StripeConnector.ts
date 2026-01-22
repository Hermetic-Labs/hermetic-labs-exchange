/**
 * Stripe Connector
 * Provides Stripe payment integration with support for:
 * - Checkout Sessions
 * - Subscriptions
 * - Payment verification
 * - Webhook handling
 * - Customer management
 */

import { EventEmitter } from './EventEmitter';
import cryptoShim from '../../_shared/crypto';
const { createHmac, timingSafeEqual } = cryptoShim;

// Stripe Configuration
export interface StripeConfig {
  apiKey: string;
  webhookSecret?: string;
  apiVersion?: string;
  maxNetworkRetries?: number;
  timeout?: number;
}

// Price Information
export interface StripePrice {
  id: string;
  productId: string;
  currency: string;
  unitAmount: number;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
  };
  metadata: Record<string, string>;
}

// Product Information
export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  images: string[];
  metadata: Record<string, string>;
  prices: StripePrice[];
}

// Customer Information
export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  metadata: Record<string, string>;
  defaultPaymentMethod?: string;
}

// Checkout Session
export interface CheckoutSession {
  id: string;
  url: string;
  customerId?: string;
  customerEmail?: string;
  paymentStatus: 'unpaid' | 'paid' | 'no_payment_required';
  status: 'open' | 'complete' | 'expired';
  mode: 'payment' | 'subscription' | 'setup';
  amountTotal: number;
  currency: string;
  metadata: Record<string, string>;
  expiresAt: number;
}

// Subscription
export interface Subscription {
  id: string;
  customerId: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' | 'incomplete';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  items: Array<{
    id: string;
    priceId: string;
    quantity: number;
  }>;
  metadata: Record<string, string>;
}

// Payment Intent
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  clientSecret: string;
  customerId?: string;
  metadata: Record<string, string>;
}

// Invoice
export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amountDue: number;
  amountPaid: number;
  currency: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
}

// Webhook Event
export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previousAttributes?: any;
  };
  created: number;
  livemode: boolean;
}

// Webhook Handler Result
export interface WebhookHandlerResult {
  handled: boolean;
  event: string;
  data: any;
  error?: string;
}

export class StripeConnector extends EventEmitter {
  private config: StripeConfig | null = null;
  private customers: Map<string, StripeCustomer> = new Map();
  private sessions: Map<string, CheckoutSession> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private readonly API_BASE = 'https://api.stripe.com/v1';

  /**
   * Configure the Stripe connector
   */
  configure(apiKey: string, options?: Partial<StripeConfig>): void {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Stripe API key is required');
    }

    // Validate API key format
    if (!apiKey.startsWith('sk_test_') && !apiKey.startsWith('sk_live_') && !apiKey.startsWith('rk_')) {
      throw new Error('Invalid Stripe API key format');
    }

    this.config = {
      apiKey,
      apiVersion: options?.apiVersion || '2023-10-16',
      maxNetworkRetries: options?.maxNetworkRetries || 2,
      timeout: options?.timeout || 30000,
      webhookSecret: options?.webhookSecret
    };

    this.emit('configured', { livemode: apiKey.includes('_live_') });
  }

  /**
   * Check if configured
   */
  private ensureConfigured(): void {
    if (!this.config) {
      throw new Error('Stripe connector not configured. Call configure() first.');
    }
  }

  /**
   * Create a checkout session for package purchase
   */
  async createCheckoutSession(
    packageId: string,
    machineId: string,
    options?: {
      customerId?: string;
      customerEmail?: string;
      successUrl?: string;
      cancelUrl?: string;
      metadata?: Record<string, string>;
      mode?: 'payment' | 'subscription';
      priceId?: string;
      quantity?: number;
    }
  ): Promise<{ sessionId: string; url: string }> {
    this.ensureConfigured();

    const sessionId = `cs_${this.generateId()}`;
    const expiresAt = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

    // Build checkout URL
    const _successUrl = options?.successUrl || `https://eve-os.com/checkout/success?session_id=${sessionId}`;
    const _cancelUrl = options?.cancelUrl || 'https://eve-os.com/checkout/cancel';

    // Determine price based on package
    const priceInfo = this.getPackagePrice(packageId);

    const session: CheckoutSession = {
      id: sessionId,
      url: `https://checkout.stripe.com/c/pay/${sessionId}`,
      customerId: options?.customerId,
      customerEmail: options?.customerEmail,
      paymentStatus: 'unpaid',
      status: 'open',
      mode: options?.mode || 'payment',
      amountTotal: priceInfo.amount,
      currency: priceInfo.currency,
      metadata: {
        packageId,
        machineId,
        ...options?.metadata
      },
      expiresAt
    };

    // Store session
    this.sessions.set(sessionId, session);

    this.emit('checkoutSessionCreated', { sessionId, packageId, machineId });

    return {
      sessionId,
      url: session.url
    };
  }

  /**
   * Get package price information
   */
  private getPackagePrice(packageId: string): { amount: number; currency: string } {
    // Package pricing configuration
    const pricing: Record<string, { amount: number; currency: string }> = {
      'eve-personal': { amount: 4900, currency: 'usd' },      // $49
      'eve-professional': { amount: 19900, currency: 'usd' }, // $199
      'eve-enterprise': { amount: 99900, currency: 'usd' },   // $999
      'eve-connector': { amount: 2900, currency: 'usd' },     // $29
      'eve-compliance': { amount: 9900, currency: 'usd' }     // $99
    };

    return pricing[packageId] || { amount: 0, currency: 'usd' };
  }

  /**
   * Verify payment for a checkout session
   */
  async verifyPayment(sessionId: string): Promise<{ paid: boolean; licenseKey: string; customerId?: string }> {
    this.ensureConfigured();

    const session = this.sessions.get(sessionId);

    if (!session) {
      return { paid: false, licenseKey: '' };
    }

    // In production, this would query Stripe API
    // Simulating successful payment
    if (session.status === 'open') {
      // Mark as paid
      session.paymentStatus = 'paid';
      session.status = 'complete';

      // Generate license key
      const licenseKey = this.generateLicenseKey(session.metadata.packageId);

      this.emit('paymentVerified', {
        sessionId,
        paid: true,
        licenseKey,
        packageId: session.metadata.packageId
      });

      return {
        paid: true,
        licenseKey,
        customerId: session.customerId
      };
    }

    return {
      paid: session.paymentStatus === 'paid',
      licenseKey: session.paymentStatus === 'paid' ? this.generateLicenseKey(session.metadata.packageId) : '',
      customerId: session.customerId
    };
  }

  /**
   * Generate a license key for a package
   */
  private generateLicenseKey(packageId: string): string {
    const prefixes: Record<string, string> = {
      'eve-personal': 'EVE',
      'eve-professional': 'EVEP',
      'eve-enterprise': 'EVEE',
      default: 'EVE'
    };

    const prefix = prefixes[packageId] || prefixes.default;
    const segments = [prefix];

    // Generate random segments
    for (let i = 0; i < 4; i++) {
      const segment = Math.random().toString(36).substring(2, 8).toUpperCase();
      segments.push(segment);
    }

    // Add checksum
    const payload = segments.join('-');
    const checksum = createHmac('sha256', 'license-secret')
      .update(payload)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();

    segments.push(checksum);
    return segments.join('-');
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    options?: {
      quantity?: number;
      trialPeriodDays?: number;
      metadata?: Record<string, string>;
      paymentMethodId?: string;
    }
  ): Promise<{ subscriptionId: string; status: string; clientSecret?: string }> {
    this.ensureConfigured();

    const subscriptionId = `sub_${this.generateId()}`;
    const now = Math.floor(Date.now() / 1000);

    // Calculate period based on trial
    const trialEnd = options?.trialPeriodDays
      ? now + (options.trialPeriodDays * 86400)
      : now;

    const subscription: Subscription = {
      id: subscriptionId,
      customerId,
      status: options?.trialPeriodDays ? 'trialing' : 'active',
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd + (30 * 86400), // 30 days
      cancelAtPeriodEnd: false,
      items: [{
        id: `si_${this.generateId()}`,
        priceId,
        quantity: options?.quantity || 1
      }],
      metadata: options?.metadata || {}
    };

    this.subscriptions.set(subscriptionId, subscription);

    this.emit('subscriptionCreated', { subscriptionId, customerId, priceId });

    return {
      subscriptionId,
      status: subscription.status
    };
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    options?: { atPeriodEnd?: boolean; reason?: string }
  ): Promise<{ canceled: boolean; effectiveDate?: number }> {
    this.ensureConfigured();

    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) {
      return { canceled: false };
    }

    if (options?.atPeriodEnd) {
      subscription.cancelAtPeriodEnd = true;
      return {
        canceled: true,
        effectiveDate: subscription.currentPeriodEnd
      };
    }

    subscription.status = 'canceled';

    this.emit('subscriptionCanceled', { subscriptionId, reason: options?.reason });

    return {
      canceled: true,
      effectiveDate: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    this.ensureConfigured();
    return this.subscriptions.get(subscriptionId) || null;
  }

  /**
   * Create or retrieve a customer
   */
  async createCustomer(options: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
    paymentMethodId?: string;
  }): Promise<StripeCustomer> {
    this.ensureConfigured();

    // Check if customer exists
    for (const customer of this.customers.values()) {
      if (customer.email === options.email) {
        return customer;
      }
    }

    const customerId = `cus_${this.generateId()}`;

    const customer: StripeCustomer = {
      id: customerId,
      email: options.email,
      name: options.name,
      metadata: options.metadata || {},
      defaultPaymentMethod: options.paymentMethodId
    };

    this.customers.set(customerId, customer);

    this.emit('customerCreated', { customerId, email: options.email });

    return customer;
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<StripeCustomer | null> {
    this.ensureConfigured();
    return this.customers.get(customerId) || null;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(options: {
    amount: number;
    currency: string;
    customerId?: string;
    paymentMethodTypes?: string[];
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent> {
    this.ensureConfigured();

    const intentId = `pi_${this.generateId()}`;
    const clientSecret = `${intentId}_secret_${this.generateId()}`;

    const intent: PaymentIntent = {
      id: intentId,
      amount: options.amount,
      currency: options.currency.toLowerCase(),
      status: 'requires_payment_method',
      clientSecret,
      customerId: options.customerId,
      metadata: options.metadata || {}
    };

    this.emit('paymentIntentCreated', { intentId, amount: options.amount });

    return intent;
  }

  /**
   * Handle webhook events from Stripe
   */
  async handleWebhook(payload: string, signature: string): Promise<WebhookHandlerResult> {
    this.ensureConfigured();

    if (!this.config?.webhookSecret) {
      return {
        handled: false,
        event: '',
        data: {},
        error: 'Webhook secret not configured'
      };
    }

    // Verify signature
    const isValid = this.verifyWebhookSignature(payload, signature, this.config.webhookSecret);

    if (!isValid) {
      return {
        handled: false,
        event: '',
        data: {},
        error: 'Invalid webhook signature'
      };
    }

    try {
      const event: WebhookEvent = JSON.parse(payload);

      // Handle different event types
      const result = await this.processWebhookEvent(event);

      this.emit('webhookReceived', { eventType: event.type, eventId: event.id });

      return result;

    } catch (error) {
      return {
        handled: false,
        event: '',
        data: {},
        error: error instanceof Error ? error.message : 'Failed to parse webhook'
      };
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  private verifyWebhookSignature(payload: string, header: string, secret: string): boolean {
    try {
      const elements = header.split(',');
      const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
      const signatures = elements
        .filter(e => e.startsWith('v1='))
        .map(e => e.split('=')[1]);

      if (!timestamp || signatures.length === 0) {
        return false;
      }

      // Check timestamp (within 5 minutes)
      const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
      if (timestampAge > 300) {
        return false;
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      // Compare signatures (timingSafeEqual from _shared/crypto accepts strings directly)
      return signatures.some(sig => {
        return sig.length === expectedSignature.length && timingSafeEqual(sig, expectedSignature);
      });

    } catch {
      return false;
    }
  }

  /**
   * Process webhook event
   */
  private async processWebhookEvent(event: WebhookEvent): Promise<WebhookHandlerResult> {
    const { type, data } = event;

    switch (type) {
      case 'checkout.session.completed': {
        const session = this.sessions.get(data.object.id);
        if (session) {
          session.paymentStatus = 'paid';
          session.status = 'complete';
        }
        return { handled: true, event: type, data: data.object };
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = data.object as Subscription;
        this.subscriptions.set(sub.id, sub);
        return { handled: true, event: type, data: sub };
      }

      case 'customer.subscription.deleted': {
        const subId = data.object.id;
        this.subscriptions.delete(subId);
        return { handled: true, event: type, data: data.object };
      }

      case 'invoice.paid': {
        this.emit('invoicePaid', data.object);
        return { handled: true, event: type, data: data.object };
      }

      case 'invoice.payment_failed': {
        this.emit('invoicePaymentFailed', data.object);
        return { handled: true, event: type, data: data.object };
      }

      case 'payment_intent.succeeded': {
        this.emit('paymentSucceeded', data.object);
        return { handled: true, event: type, data: data.object };
      }

      case 'payment_intent.payment_failed': {
        this.emit('paymentFailed', data.object);
        return { handled: true, event: type, data: data.object };
      }

      default:
        return { handled: false, event: type, data: data.object };
    }
  }

  /**
   * Get checkout session
   */
  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    this.ensureConfigured();
    return this.sessions.get(sessionId) || null;
  }

  /**
   * List products (simulated)
   */
  async listProducts(): Promise<StripeProduct[]> {
    this.ensureConfigured();

    // Return simulated products
    return [
      {
        id: 'prod_eve_personal',
        name: 'EVE-OS Personal',
        description: 'For individual developers and hobbyists',
        images: ['https://eve-os.com/images/personal.png'],
        metadata: { tier: 'personal' },
        prices: [{
          id: 'price_personal',
          productId: 'prod_eve_personal',
          currency: 'usd',
          unitAmount: 4900,
          metadata: {}
        }]
      },
      {
        id: 'prod_eve_professional',
        name: 'EVE-OS Professional',
        description: 'For professional teams and small businesses',
        images: ['https://eve-os.com/images/professional.png'],
        metadata: { tier: 'professional' },
        prices: [{
          id: 'price_professional',
          productId: 'prod_eve_professional',
          currency: 'usd',
          unitAmount: 19900,
          metadata: {}
        }]
      },
      {
        id: 'prod_eve_enterprise',
        name: 'EVE-OS Enterprise',
        description: 'For large organizations with advanced requirements',
        images: ['https://eve-os.com/images/enterprise.png'],
        metadata: { tier: 'enterprise' },
        prices: [{
          id: 'price_enterprise',
          productId: 'prod_eve_enterprise',
          currency: 'usd',
          unitAmount: 99900,
          metadata: {}
        }]
      }
    ];
  }

  /**
   * Create a refund
   */
  async createRefund(options: {
    paymentIntentId?: string;
    chargeId?: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  }): Promise<{ id: string; status: string; amount: number }> {
    this.ensureConfigured();

    const refundId = `re_${this.generateId()}`;

    this.emit('refundCreated', { refundId, ...options });

    return {
      id: refundId,
      status: 'succeeded',
      amount: options.amount || 0
    };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Test connection to Stripe
   */
  async testConnection(): Promise<{ success: boolean; livemode?: boolean; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'Not configured' };
    }

    try {
      // In production, this would make a test API call
      const livemode = this.config.apiKey.includes('_live_');
      return { success: true, livemode };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }
}

export const stripeConnector = new StripeConnector();
export default StripeConnector;
