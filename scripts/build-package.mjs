#!/usr/bin/env node
/**
 * EVE OS Marketplace Package Bundler
 *
 * Builds marketplace packages as standalone ESM bundles that can be
 * dynamically imported at runtime without Vite's compile-time processing.
 *
 * Usage:
 *   node build-package.mjs <package-name>     Build single package
 *   node build-package.mjs --all              Build all packages
 *   node build-package.mjs --watch <name>     Watch mode for development
 */

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile, writeFile, mkdir, copyFile, stat } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGES_DIR = resolve(__dirname, '../packages');
const OUTPUT_DIR = resolve(__dirname, '../../Final Production/frontend/public/bundles');
const VAULT_DIR = resolve(__dirname, '../../Final Production/backend/vault');

// Packages to skip (templates, shared utils, non-UI)
const SKIP_PACKAGES = ['_shared', '_template', 'dev-portal'];

// External dependencies - these will be provided by the host app
// Bundles import these and expect them to be available at runtime via window globals
const EXTERNALS = [
  // React ecosystem
  'react',
  'react-dom',
  'react/jsx-runtime',
  // Three.js ecosystem - provided via window.__EVE_THREE__ etc
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  // UI libraries
  'lucide-react',
  'zustand',
  'clsx',
  'tailwind-merge',
  // EVE OS app services - must be accessed via dependency injection, not direct imports
  // These patterns match any import starting with @/services or @/types
];

// Regex patterns for externals that can't be simple strings
// These match imports like `@/services/ActionLanguageService` or `@/types`
const EXTERNAL_PATTERNS = [
  /^@\/services\/.*/,  // Main app services
  /^@\/types$/,        // Main app types
  /^@\/types\/.*/,     // Main app type files
  /^@market\/.*/,      // Other marketplace packages (cross-dependencies)
];

/**
 * Build a single package into a standalone ESM bundle
 */
async function buildPackage(packageName) {
  const packageDir = join(PACKAGES_DIR, packageName);
  const manifestPath = join(packageDir, 'manifest.json');

  // Check package exists
  if (!existsSync(packageDir)) {
    console.error(`[ERR] Package not found: ${packageName}`);
    return false;
  }

  // Check manifest exists
  if (!existsSync(manifestPath)) {
    console.error(`[ERR] No manifest.json in ${packageName}`);
    return false;
  }

  // Read manifest
  const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
  const entryPoint = manifest.entry || './frontend/index.ts';
  const entryPath = resolve(packageDir, entryPoint);

  if (!existsSync(entryPath)) {
    console.error(`[ERR] Entry point not found: ${entryPath}`);
    return false;
  }

  console.log(`\n[PKG] Building ${packageName}...`);
  console.log(`   Entry: ${entryPoint}`);

  const outputFileName = `${packageName}.bundle.js`;
  const outputPath = join(OUTPUT_DIR, outputFileName);

  try {
    await build({
      configFile: false,
      root: packageDir,
      plugins: [
        react(),
        nodePolyfills({
          include: ['crypto', 'path', 'buffer', 'stream', 'events'],
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
        }),
      ],
      resolve: {
        alias: {
          '@': resolve(packageDir, './frontend'),
          // Resolve shared utilities
          '../../_shared': resolve(PACKAGES_DIR, '_shared'),
          '../_shared': resolve(PACKAGES_DIR, '_shared'),
        },
        extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
      build: {
        lib: {
          entry: entryPath,
          name: packageName.replace(/-/g, '_'),
          formats: ['es'],
          fileName: () => outputFileName,
        },
        outDir: OUTPUT_DIR,
        emptyOutDir: false, // Don't clear other bundles
        rollupOptions: {
          // External function: check against simple list + regex patterns
          external: (id) => {
            // Simple string matches
            if (EXTERNALS.includes(id)) return true;
            // Regex pattern matches (for @/services/*, @/types/*, @market/*)
            for (const pattern of EXTERNAL_PATTERNS) {
              if (pattern.test(id)) return true;
            }
            return false;
          },
          output: {
            // Global variable mappings for UMD (not used in ESM but good to have)
            globals: {
              'react': 'React',
              'react-dom': 'ReactDOM',
              'react/jsx-runtime': 'jsxRuntime',
              'three': 'THREE',
              '@react-three/fiber': 'ReactThreeFiber',
              '@react-three/drei': 'ReactThreeDrei',
              'lucide-react': 'LucideReact',
              'zustand': 'zustand',
              'clsx': 'clsx',
              'tailwind-merge': 'tailwindMerge',
            },
            // Preserve export names
            exports: 'named',
            // Preserve export names
            exports: 'named',
          },
        },
        minify: 'esbuild',
        sourcemap: true,
      },
      logLevel: 'warn',
    });

    // Update manifest with bundle info
    manifest.bundle = `/bundles/${outputFileName}`;
    manifest.bundleVersion = Date.now().toString();
    await writeFile(manifestPath, JSON.stringify(manifest, null, 4));

    // Also copy bundle to vault for distribution
    const vaultBundlePath = join(VAULT_DIR, outputFileName);
    await copyFile(outputPath, vaultBundlePath);

    const stats = await stat(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(1);

    console.log(`   [OK] Built: ${outputFileName} (${sizeKB} KB)`);
    console.log(`   [DIR] Output: ${outputPath}`);
    console.log(`   [DIR] Vault: ${vaultBundlePath}`);

    return true;
  } catch (error) {
    console.error(`   [ERR] Build failed for ${packageName}:`, error.message);
    return false;
  }
}

/**
 * Build all packages
 */
async function buildAll() {
  // Ensure output directories exist
  await mkdir(OUTPUT_DIR, { recursive: true });

  const packages = await readdir(PACKAGES_DIR);
  const buildablePackages = packages.filter(p =>
    !SKIP_PACKAGES.includes(p) &&
    !p.startsWith('.')
  );

  console.log(`\n[BUILD]️  Building ${buildablePackages.length} marketplace packages...\n`);

  let success = 0;
  let failed = 0;

  for (const pkg of buildablePackages) {
    const result = await buildPackage(pkg);
    if (result) success++;
    else failed++;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`[STAT] Build Summary:`);
  console.log(`   [OK] Success: ${success}`);
  console.log(`   [ERR] Failed: ${failed}`);
  console.log(`   [DIR] Output: ${OUTPUT_DIR}`);
  console.log(`${'='.repeat(50)}\n`);

  return failed === 0;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
EVE OS Marketplace Package Bundler

Usage:
  node build-package.mjs <package-name>     Build single package
  node build-package.mjs --all              Build all packages
  node build-package.mjs --list             List available packages

Examples:
  node build-package.mjs salesforce-connector
  node build-package.mjs --all
`);
    process.exit(0);
  }

  if (args[0] === '--list') {
    const packages = await readdir(PACKAGES_DIR);
    console.log('\nAvailable packages:');
    packages
      .filter(p => !SKIP_PACKAGES.includes(p) && !p.startsWith('.'))
      .forEach(p => console.log(`  - ${p}`));
    console.log('');
    process.exit(0);
  }

  if (args[0] === '--all') {
    const success = await buildAll();
    process.exit(success ? 0 : 1);
  }

  // Build specific package
  const packageName = args[0];
  const success = await buildPackage(packageName);
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
