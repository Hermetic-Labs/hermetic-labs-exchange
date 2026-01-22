/**
 * Form Builder Component - Marketplace Package
 *
 * A drag-and-drop form builder component that provides:
 * - Field palette with 14+ field types
 * - Live form preview
 * - URL-encoded form sharing
 * - Form submission handling
 * - LocalStorage persistence
 *
 * This is a COMPONENT type package that can be embedded in any view.
 */

// ============================================================================
// Component Metadata
// ============================================================================

export const COMPONENT_ID = 'form-builder';
export const COMPONENT_TYPE = 'component';
export const COMPONENT_VERSION = '1.0.0';

// ============================================================================
// Core Exports
// ============================================================================

// Main component - the FormBuilder page
export { default, default as FormBuilder } from './pages/BuilderPage';

// Components (all use default export)
export { default as FormRenderer } from './components/FormRenderer';
export { default as FieldPalette } from './components/FieldPalette';
export { default as FormCanvas } from './components/FormCanvas';
export { default as FieldEditor } from './components/FieldEditor';
export { default as ErrorBoundary } from './components/ErrorBoundary';

// Additional pages (all use default export)
export { default as FillFormPage } from './pages/FillFormPage';
export { default as HomePage } from './pages/HomePage';

// Types
export type {
  FieldType,
  FieldOption,
  FormField,
  FormConfig,
  FormSubmission,
} from './types/form';

export { createField, FIELD_TYPES } from './types/form';

// Utilities
export {
  saveForm,
  getFormById,
  getAllForms,
  deleteForm,
  createNewForm,
  encodeFormToUrl,
  decodeFormFromUrl,
} from './utils/formStorage';

// ============================================================================
// Capability Detection API
// ============================================================================

/**
 * Check if form builder capabilities are available
 */
export function isFormBuilderAvailable(): boolean {
  return true; // Component is loaded
}

/**
 * Get form builder capabilities
 */
export interface FormBuilderCapabilities {
  dragDrop: boolean;
  livePreview: boolean;
  urlSharing: boolean;
  localStorage: boolean;
  signatureCapture: boolean;
  fileUpload: boolean;
  geolocation: boolean;
}

export function getFormBuilderCapabilities(): FormBuilderCapabilities {
  return {
    dragDrop: true,
    livePreview: true,
    urlSharing: true,
    localStorage: typeof localStorage !== 'undefined',
    signatureCapture: true,
    fileUpload: true,
    geolocation: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  };
}

// ============================================================================
// Integration API
// ============================================================================

export interface FormBuilderConfig {
  autoSave?: boolean;
  saveInterval?: number;
  maxFields?: number;
  allowedFieldTypes?: string[];
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: FormBuilderConfig = {
  autoSave: true,
  saveInterval: 5000,
  maxFields: 50,
};
