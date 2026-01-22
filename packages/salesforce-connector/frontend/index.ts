/**
 * salesforce-connector - EVE OS Marketplace Package
 *
 * Full Salesforce CRM integration with OAuth authentication,
 * SOQL queries, object CRUD operations, and bulk data processing.
 */

export { default, default as SalesforcePortal } from './SalesforcePortal';

// Components
export { SalesforceConnector } from './SalesforceConnector';

// Types
export * from './types';

// Utilities
export { EventEmitter } from './EventEmitter';
export { encrypt, decrypt, hash } from '../../_shared/crypto';
