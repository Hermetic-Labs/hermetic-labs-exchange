/**
 * workday-connector - EVE OS Marketplace Package
 *
 * Workday HCM integration with workers, time off, payroll, and benefits
 */

// Main UI component (default export for sidebar)
export { default, default as WorkdayPortal } from './WorkdayPortal';

// Service class (NOT a React component - do NOT use as default)
export { WorkdayConnector } from './WorkdayConnector';

// Types
export * from './types';

// Utilities
export { EventEmitter } from './EventEmitter';
