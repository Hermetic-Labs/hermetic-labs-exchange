/**
 * PackageGeneratorService
 *
 * Generates new marketplace packages from the Remix Basket.
 * Handles:
 * - Transitive dependency resolution
 * - Code extraction and bundling
 * - Manifest generation
 * - Type export handling
 *
 * Phase 3 of Remix IDE implementation
 */

import { RemixElement } from '../context/GraphContext';

// ============================================================================
// Types
// ============================================================================

export interface GeneratedPackage {
    name: string;
    displayName: string;
    version: string;
    description: string;
    manifest: PackageManifest;
    files: GeneratedFile[];
    warnings: string[];
}

export interface PackageManifest {
    $schema: string;
    name: string;
    version: string;
    type: 'component' | 'connector' | 'compliance' | 'extension';
    displayName: string;
    description: string;
    entry: string;
    icon: string;
    sidebar: boolean;
    components: string[];
    permissions: string[];
    tags: string[];
    category: string;
    author: string;
    license: string;
    marketId: string;
    price: string;
    features: string[];
    dependencies: {
        npm: string[];
        python: string[];
        packages: string[];
    };
}

export interface GeneratedFile {
    path: string;
    content: string;
    type: 'component' | 'service' | 'hook' | 'type' | 'style' | 'index' | 'manifest' | 'readme';
}

export interface DependencyNode {
    element: RemixElement;
    resolvedDeps: DependencyNode[];
    isExternal: boolean;
    externalPackage?: string;
}

export interface GeneratorOptions {
    packageName: string;
    displayName?: string;
    description?: string;
    author?: string;
    category?: string;
    icon?: string;
    version?: string;
    includeTypes?: boolean;
    generateReadme?: boolean;
}

// ============================================================================
// PackageGeneratorService
// ============================================================================

class PackageGeneratorService {
    private readonly NPM_EXTERNALS = [
        'react', 'react-dom', 'react-router-dom',
        '@xyflow/react', 'zustand', 'three', '@react-three/fiber',
        'lucide-react', 'framer-motion'
    ];

    /**
     * Generate a new package from remix basket elements
     */
    async generatePackage(
        elements: RemixElement[],
        options: GeneratorOptions
    ): Promise<GeneratedPackage> {
        const warnings: string[] = [];

        // 1. Resolve all dependencies (including transitive)
        const { allElements, externalDeps, missingDeps } = await this.resolveDependencies(elements);

        if (missingDeps.length > 0) {
            warnings.push(`Missing dependencies: ${missingDeps.join(', ')}`);
        }

        // 2. Group elements by type
        const grouped = this.groupElementsByType(allElements);

        // 3. Generate files
        const files: GeneratedFile[] = [];

        // Generate component files
        for (const element of grouped.components) {
            files.push(this.generateComponentFile(element, options.packageName));
        }

        // Generate service files
        for (const element of grouped.services) {
            files.push(this.generateServiceFile(element, options.packageName));
        }

        // Generate hook files
        for (const element of grouped.hooks) {
            files.push(this.generateHookFile(element, options.packageName));
        }

        // Generate type files
        if (options.includeTypes !== false) {
            const typeFile = this.generateTypesFile(grouped.types, options.packageName);
            if (typeFile) files.push(typeFile);
        }

        // Generate index.ts barrel export
        files.push(this.generateIndexFile(allElements, options));

        // Generate manifest.json
        const manifest = this.generateManifest(allElements, externalDeps, options);
        files.push({
            path: 'manifest.json',
            content: JSON.stringify(manifest, null, 4),
            type: 'manifest'
        });

        // Generate README
        if (options.generateReadme !== false) {
            files.push(this.generateReadme(allElements, options));
        }

        return {
            name: options.packageName,
            displayName: options.displayName || this.toDisplayName(options.packageName),
            version: options.version || '1.0.0',
            description: options.description || `Generated package containing ${allElements.length} elements`,
            manifest,
            files,
            warnings
        };
    }

    /**
     * Resolve all dependencies including transitive ones
     */
    private async resolveDependencies(elements: RemixElement[]): Promise<{
        allElements: RemixElement[];
        externalDeps: string[];
        missingDeps: string[];
    }> {
        const seen = new Set<string>();
        const allElements: RemixElement[] = [];
        const externalDeps: string[] = [];
        const missingDeps: string[] = [];

        const resolve = async (element: RemixElement) => {
            if (seen.has(element.id)) return;
            seen.add(element.id);
            allElements.push(element);

            for (const depId of element.dependencies) {
                // Check if it's an external npm package
                if (this.isExternalNpmDep(depId)) {
                    if (!externalDeps.includes(depId)) {
                        externalDeps.push(depId);
                    }
                    continue;
                }

                // Check if it's another element we have
                const depElement = elements.find(e => e.id === depId);
                if (depElement) {
                    await resolve(depElement);
                } else {
                    // Try to find in registry (would need ElementRegistryService)
                    // For now, mark as missing
                    if (!missingDeps.includes(depId)) {
                        missingDeps.push(depId);
                    }
                }
            }
        };

        for (const element of elements) {
            await resolve(element);
        }

        return { allElements, externalDeps, missingDeps };
    }

    /**
     * Check if a dependency ID is an external npm package
     */
    private isExternalNpmDep(depId: string): boolean {
        return this.NPM_EXTERNALS.some(ext =>
            depId === ext || depId.startsWith(`${ext}/`)
        );
    }

    /**
     * Group elements by their type
     */
    private groupElementsByType(elements: RemixElement[]): {
        components: RemixElement[];
        services: RemixElement[];
        hooks: RemixElement[];
        types: RemixElement[];
        functions: RemixElement[];
        constants: RemixElement[];
    } {
        return {
            components: elements.filter(e => e.type === 'component'),
            services: elements.filter(e => e.type === 'service'),
            hooks: elements.filter(e => e.type === 'hook'),
            types: elements.filter(e => e.type === 'type'),
            functions: elements.filter(e => e.type === 'function'),
            constants: elements.filter(e => e.type === 'constant'),
        };
    }

    /**
     * Generate a component file
     */
    private generateComponentFile(element: RemixElement, packageName: string): GeneratedFile {
        const content = element.code || this.generatePlaceholderComponent(element);

        return {
            path: `frontend/components/${element.name}.tsx`,
            content: this.rewriteImports(content, packageName),
            type: 'component'
        };
    }

    /**
     * Generate a service file
     */
    private generateServiceFile(element: RemixElement, packageName: string): GeneratedFile {
        const content = element.code || this.generatePlaceholderService(element);

        return {
            path: `frontend/services/${element.name}.ts`,
            content: this.rewriteImports(content, packageName),
            type: 'service'
        };
    }

    /**
     * Generate a hook file
     */
    private generateHookFile(element: RemixElement, packageName: string): GeneratedFile {
        const content = element.code || this.generatePlaceholderHook(element);

        return {
            path: `frontend/hooks/${element.name}.ts`,
            content: this.rewriteImports(content, packageName),
            type: 'hook'
        };
    }

    /**
     * Generate types file
     */
    private generateTypesFile(types: RemixElement[], packageName: string): GeneratedFile | null {
        if (types.length === 0) return null;

        const typeExports = types.map(t => t.code || `export interface ${t.name} {}`).join('\n\n');

        return {
            path: 'frontend/types/index.ts',
            content: `/**\n * Type definitions for ${packageName}\n */\n\n${typeExports}\n`,
            type: 'type'
        };
    }

    /**
     * Generate index.ts barrel export
     */
    private generateIndexFile(elements: RemixElement[], options: GeneratorOptions): GeneratedFile {
        const grouped = this.groupElementsByType(elements);
        const lines: string[] = [
            `/**`,
            ` * ${options.displayName || this.toDisplayName(options.packageName)}`,
            ` * `,
            ` * ${options.description || 'Generated package'}`,
            ` */`,
            ``,
            `// Package Metadata`,
            `export const PACKAGE_ID = '${options.packageName}';`,
            `export const PACKAGE_VERSION = '${options.version || '1.0.0'}';`,
            ``
        ];

        // Export components - default export is REQUIRED for sidebar rendering
        if (grouped.components.length > 0) {
            lines.push(`// Main component - default export for sidebar`);
            // First component is the main one - export its default as THE default
            const mainComp = grouped.components[0];
            lines.push(`export { default, default as ${mainComp.name} } from './components/${mainComp.name}';`);

            // Additional components as named exports only
            if (grouped.components.length > 1) {
                lines.push(``);
                lines.push(`// Additional components`);
                for (const comp of grouped.components.slice(1)) {
                    lines.push(`export { default as ${comp.name} } from './components/${comp.name}';`);
                }
            }
            lines.push(``);
        }

        // Export services
        if (grouped.services.length > 0) {
            lines.push(`// Services`);
            for (const svc of grouped.services) {
                lines.push(`export { ${svc.name} } from './services/${svc.name}';`);
            }
            lines.push(``);
        }

        // Export hooks
        if (grouped.hooks.length > 0) {
            lines.push(`// Hooks`);
            for (const hook of grouped.hooks) {
                lines.push(`export { ${hook.name} } from './hooks/${hook.name}';`);
            }
            lines.push(``);
        }

        // Export types
        if (grouped.types.length > 0) {
            lines.push(`// Types`);
            lines.push(`export type {`);
            for (const type of grouped.types) {
                lines.push(`    ${type.name},`);
            }
            lines.push(`} from './types';`);
            lines.push(``);
        }

        return {
            path: 'frontend/index.ts',
            content: lines.join('\n'),
            type: 'index'
        };
    }

    /**
     * Generate manifest.json
     */
    private generateManifest(
        elements: RemixElement[],
        externalDeps: string[],
        options: GeneratorOptions
    ): PackageManifest {
        const grouped = this.groupElementsByType(elements);
        const componentNames = grouped.components.map(c => c.name);

        // Collect source packages for attribution
        const sourcePackages = [...new Set(elements.map(e => e.sourcePackage))];

        return {
            $schema: '../_shared/manifest.schema.json',
            name: options.packageName,
            version: options.version || '1.0.0',
            type: 'component',
            displayName: options.displayName || this.toDisplayName(options.packageName),
            description: options.description || `Generated package containing ${elements.length} elements from ${sourcePackages.join(', ')}`,
            entry: './frontend/index.ts',
            icon: options.icon || '📦',
            sidebar: true,
            components: componentNames,
            permissions: [],
            tags: ['remix', 'generated', ...sourcePackages],
            category: options.category || 'Generated',
            author: options.author || 'Remix IDE',
            license: 'EVE-MARKET-001',
            marketId: `${options.packageName}-${options.version || '1.0.0'}`,
            price: 'free',
            features: [
                `${grouped.components.length} components`,
                `${grouped.services.length} services`,
                `${grouped.hooks.length} hooks`,
            ].filter(f => !f.startsWith('0')),
            dependencies: {
                npm: externalDeps,
                python: [],
                packages: sourcePackages
            }
        };
    }

    /**
     * Generate README.md
     */
    private generateReadme(elements: RemixElement[], options: GeneratorOptions): GeneratedFile {
        const grouped = this.groupElementsByType(elements);
        const sourcePackages = [...new Set(elements.map(e => e.sourcePackage))];

        const lines = [
            `# ${options.displayName || this.toDisplayName(options.packageName)}`,
            ``,
            options.description || 'Generated with EVE-OS Remix IDE',
            ``,
            `## Source Packages`,
            ``,
            `This package was generated from elements in:`,
            ...sourcePackages.map(p => `- ${p}`),
            ``,
            `## Contents`,
            ``,
        ];

        if (grouped.components.length > 0) {
            lines.push(`### Components`);
            lines.push(``);
            lines.push(`| Component | Source |`);
            lines.push(`|-----------|--------|`);
            for (const comp of grouped.components) {
                lines.push(`| ${comp.name} | ${comp.sourcePackage} |`);
            }
            lines.push(``);
        }

        if (grouped.services.length > 0) {
            lines.push(`### Services`);
            lines.push(``);
            for (const svc of grouped.services) {
                lines.push(`- \`${svc.name}\` from ${svc.sourcePackage}`);
            }
            lines.push(``);
        }

        if (grouped.hooks.length > 0) {
            lines.push(`### Hooks`);
            lines.push(``);
            for (const hook of grouped.hooks) {
                lines.push(`- \`${hook.name}\` from ${hook.sourcePackage}`);
            }
            lines.push(``);
        }

        lines.push(`## Installation`);
        lines.push(``);
        lines.push(`\`\`\`bash`);
        lines.push(`eve install ${options.packageName}`);
        lines.push(`\`\`\``);
        lines.push(``);
        lines.push(`## License`);
        lines.push(``);
        lines.push(`EVE-MARKET-001`);
        lines.push(``);
        lines.push(`---`);
        lines.push(``);
        lines.push(`*Generated by EVE-OS Remix IDE*`);

        return {
            path: 'README.md',
            content: lines.join('\n'),
            type: 'readme'
        };
    }

    /**
     * Rewrite imports to be relative within the package
     */
    private rewriteImports(code: string, packageName: string): string {
        // Replace @/components/devportal/ imports with local paths
        // Replace @/services/ imports with local paths
        // Keep external package imports as-is

        let rewritten = code;

        // Rewrite common patterns
        rewritten = rewritten.replace(
            /@\/components\/devportal\//g,
            '../'
        );
        rewritten = rewritten.replace(
            /@\/services\//g,
            '../services/'
        );
        rewritten = rewritten.replace(
            /@\/hooks\//g,
            '../hooks/'
        );

        return rewritten;
    }

    /**
     * Convert package name to display name
     */
    private toDisplayName(name: string): string {
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Generate placeholder component code
     */
    private generatePlaceholderComponent(element: RemixElement): string {
        return `/**
 * ${element.name}
 * Imported from ${element.sourcePackage}
 */
import React from 'react';

export interface ${element.name}Props {
    // TODO: Add props
}

export function ${element.name}(props: ${element.name}Props) {
    return (
        <div className="${element.name.toLowerCase()}">
            <h2>${element.name}</h2>
            <p>Component imported from ${element.sourcePackage}</p>
        </div>
    );
}

export default ${element.name};
`;
    }

    /**
     * Generate placeholder service code
     */
    private generatePlaceholderService(element: RemixElement): string {
        return `/**
 * ${element.name}
 * Imported from ${element.sourcePackage}
 */

class ${element.name}Class {
    // TODO: Implement service methods
}

export const ${element.name} = new ${element.name}Class();
export default ${element.name};
`;
    }

    /**
     * Generate placeholder hook code
     */
    private generatePlaceholderHook(element: RemixElement): string {
        return `/**
 * ${element.name}
 * Imported from ${element.sourcePackage}
 */
import { useState, useCallback } from 'react';

export function ${element.name}() {
    // TODO: Implement hook logic
    return {};
}

export default ${element.name};
`;
    }

    /**
     * Download the generated package as a zip file
     */
    async downloadAsZip(pkg: GeneratedPackage): Promise<Blob> {
        // In a real implementation, this would use JSZip or similar
        // For now, return a JSON representation
        const content = JSON.stringify(pkg, null, 2);
        return new Blob([content], { type: 'application/json' });
    }

    /**
     * Save the generated package to the market_source directory
     */
    async saveToMarketSource(pkg: GeneratedPackage): Promise<boolean> {
        // This would need backend support to write files
        // For now, log and return true
        console.log('[PackageGenerator] Would save package:', pkg.name);
        console.log('[PackageGenerator] Files:', pkg.files.map(f => f.path));
        return true;
    }
}

// Export singleton
export const packageGenerator = new PackageGeneratorService();
export { PackageGeneratorService };
