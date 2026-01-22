/**
 * @eve-os/plaid-connector
 *
 * Plaid banking integration for EVE-OS.
 * Provides secure access to financial data including accounts, transactions,
 * balances, identity verification, and investment tracking.
 */

export { default, default as PlaidConnectorPortal } from './PlaidConnectorPortal';

// Main connector class
export { PlaidConnector } from './PlaidConnector';

// All types
export type {
  PlaidConfig,
  LinkTokenRequest,
  AccountFilters,
  PlaidProduct,
  LinkTokenResponse,
  PlaidAccount,
  PlaidTransaction,
  PlaidInstitution,
  PlaidIdentity,
  PlaidAuthData,
  PlaidLiability,
  PlaidInvestmentHolding,
  PlaidSecurity,
  PlaidInvestmentTransaction,
  WebhookVerification,
  ItemStatus,
} from './PlaidConnector';

// Utilities
export { EventEmitter } from './EventEmitter';
