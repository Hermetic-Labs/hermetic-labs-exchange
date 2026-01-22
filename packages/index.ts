/**
 * EVE-OS Marketplace Packages Index
 * 
 * Central export for all marketplace packages.
 * Packages are lazy-loaded via dynamic imports for optimal bundle size.
 * 
 * @packageDocumentation
 */

// ============================================================================
// PACKAGE REGISTRY
// ============================================================================

export const PACKAGE_REGISTRY = {
    // Payment & Financial
    'stripe-connector': () => import('./stripe-connector/frontend'),
    'plaid-connector': () => import('./plaid-connector/frontend'),
    
    // Cloud Storage
    'aws-s3-connector': () => import('./aws-s3-connector/frontend'),
    'azure-blob-connector': () => import('./azure-blob-connector/frontend'),
    'gcs-connector': () => import('./gcs-connector/frontend'),
    
    // Enterprise
    'salesforce-connector': () => import('./salesforce-connector/frontend'),
    'sap-connector': () => import('./sap-connector/frontend'),
    'workday-connector': () => import('./workday-connector/frontend'),
    
    // Government
    'sam-gov-connector': () => import('./sam-gov-connector/frontend'),
    'usaspending-connector': () => import('./usaspending-connector/frontend'),
    
    // Legal
    'lexisnexis-connector': () => import('./lexisnexis-connector/frontend'),
    'westlaw-connector': () => import('./westlaw-connector/frontend'),
    
    // IoT & Voice
    'iot-connector': () => import('./iot-connector/frontend'),
    'voice-connector': () => import('./voice-connector/frontend'),
    
    // Compliance
    'hipaa-compliance': () => import('./hipaa-compliance/frontend'),
    'fhir-compliance': () => import('./fhir-compliance/frontend'),
    'pci-compliance': () => import('./pci-compliance/frontend'),
    'sox-compliance': () => import('./sox-compliance/frontend'),
    'fedramp-compliance': () => import('./fedramp-compliance/frontend'),
    'itar-compliance': () => import('./itar-compliance/frontend'),
    
    // Healthcare
    'medical-module': () => import('./medical-module/frontend'),
    
    // VR/XR
    'vr-spatial-engine': () => import('./vr-spatial-engine/src'),
    'vrm-companion': () => import('./vrm-companion/frontend'),
} as const;

export type PackageId = keyof typeof PACKAGE_REGISTRY;

// ============================================================================
// PACKAGE CATEGORIES
// ============================================================================

export const PACKAGE_CATEGORIES = {
    'payment': ['stripe-connector', 'plaid-connector'],
    'cloud-storage': ['aws-s3-connector', 'azure-blob-connector', 'gcs-connector'],
    'enterprise': ['salesforce-connector', 'sap-connector', 'workday-connector'],
    'government': ['sam-gov-connector', 'usaspending-connector'],
    'legal': ['lexisnexis-connector', 'westlaw-connector'],
    'iot-voice': ['iot-connector', 'voice-connector'],
    'compliance': ['hipaa-compliance', 'fhir-compliance', 'pci-compliance', 'sox-compliance', 'fedramp-compliance', 'itar-compliance'],
    'healthcare': ['medical-module'],
    'vr-xr': ['vr-spatial-engine', 'vrm-companion'],
} as const;

export type CategoryId = keyof typeof PACKAGE_CATEGORIES;

// ============================================================================
// DYNAMIC LOADER
// ============================================================================

/**
 * Dynamically load a package by ID
 */
export async function loadPackage(packageId: PackageId): Promise<unknown> {
    const loader = PACKAGE_REGISTRY[packageId];
    if (!loader) {
        throw new Error(`Unknown package: ${packageId}`);
    }
    return await loader();
}

/**
 * Get all packages in a category
 */
export function getPackagesByCategory(categoryId: CategoryId): PackageId[] {
    return [...PACKAGE_CATEGORIES[categoryId]] as PackageId[];
}

/**
 * Get all package IDs
 */
export function getAllPackageIds(): PackageId[] {
    return Object.keys(PACKAGE_REGISTRY) as PackageId[];
}

// ============================================================================
// SHARED UTILITIES
// ============================================================================

export { EventEmitter } from './_shared/EventEmitter';
export { Buffer } from './_shared/Buffer';
export * as crypto from './_shared/crypto';
