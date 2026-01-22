/**
 * Stripe Connector - Type Definitions
 */

// Configuration
export interface StripeConfig {
    secretKey: string;
    publishableKey?: string;
    webhookSecret?: string;
    apiVersion?: string;
    timeout?: number;
}

// Payment Intent
export interface PaymentIntentParams {
    amount: number;
    currency?: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, string>;
    paymentMethodTypes?: string[];
}

export interface PaymentIntent {
    id: string;
    clientSecret: string;
    amount: number;
    currency: string;
    status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
    created: Date;
    metadata?: Record<string, string>;
}

// Customer
export interface Customer {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    address?: Address;
    created: Date;
    defaultSource?: string;
    metadata?: Record<string, string>;
}

export interface Address {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

// Subscription
export interface Subscription {
    id: string;
    customerId: string;
    status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' | 'incomplete';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    items: SubscriptionItem[];
}

export interface SubscriptionItem {
    id: string;
    priceId: string;
    quantity: number;
}

// Invoice
export interface Invoice {
    id: string;
    customerId: string;
    subscriptionId?: string;
    status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
    amountDue: number;
    amountPaid: number;
    currency: string;
    created: Date;
    dueDate?: Date;
}

// Charge
export interface Charge {
    id: string;
    amount: number;
    currency: string;
    customerId?: string;
    status: 'succeeded' | 'pending' | 'failed';
    created: Date;
    paymentMethodId?: string;
    receiptUrl?: string;
}

// Webhook
export interface WebhookEvent {
    id: string;
    type: StripeEventType;
    created: Date;
    data: {
        object: Record<string, unknown>;
    };
    livemode: boolean;
}

export type StripeEventType =
    | 'payment_intent.succeeded'
    | 'payment_intent.payment_failed'
    | 'customer.created'
    | 'customer.updated'
    | 'customer.deleted'
    | 'customer.subscription.created'
    | 'customer.subscription.updated'
    | 'customer.subscription.deleted'
    | 'invoice.created'
    | 'invoice.paid'
    | 'invoice.payment_failed'
    | 'charge.succeeded'
    | 'charge.failed'
    | 'charge.refunded';
