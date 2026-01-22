/**
 * Stripe Connector - EVE-OS Marketplace Package
 *
 * Payment processing module featuring:
 * - StripeConnectorPortal: Main UI dashboard (default)
 * - StripeConnector: Service class for API interactions
 *
 * Self-contained module - all imports are relative (no @/ aliases)
 * @packageDocumentation
 */

// Main tabbed container (default export for sidebar tab)
export { default, default as StripeConnectorPortal } from './StripeConnectorPortal';

// Service class (for programmatic access, NOT a React component)
export { StripeConnector, stripeConnector } from './StripeConnector';

// Types
export type {
    StripeConfig,
    PaymentIntentParams,
    PaymentIntent,
    Customer,
    Subscription,
    Invoice,
    Charge,
    WebhookEvent,
    StripeEventType
} from './types';
