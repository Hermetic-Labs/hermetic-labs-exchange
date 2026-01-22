/**
 * Plaid Connector Type Definitions
 * 
 * Re-exports all types from the PlaidConnector module.
 */

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
} from '../PlaidConnector';

export { PlaidConnector } from '../PlaidConnector';
