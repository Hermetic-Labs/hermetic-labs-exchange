#!/usr/bin/env node
/**
 * Preflight Validation Script
 *
 * Run before build-all.mjs to catch issues early:
 *   - Manifest structure validation
 *   - Entry point existence
 *   - Component export validation
 *   - Dependency checking
 *   - Image asset verification
 *
 * Usage:
 *   node scripts/preflight-check.mjs
 *   node scripts/preflight-check.mjs --fix   (auto-fix where possible)
 */

import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile, stat, access, constants } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '..');
const PACKAGES_DIR = resolve(ROOT_DIR, 'packages');

// Skip these directories
const SKIP_PACKAGES = ['_shared', '_template', 'dev-portal', 'index.ts', 'package.json', 'tsconfig.json', 'pyproject.toml', 'pyrightconfig.json'];

// Service class patterns (should NOT be first component)
const SERVICE_PATTERNS = ['Service', 'Manager', 'Engine', 'Processor', 'Adapter', 'Discovery', 'Protocols', 'Safety', 'Pairing', 'Client', 'Provider', 'Store'];

// Required manifest fields
const REQUIRED_FIELDS = ['name', 'displayName', 'version', 'type', 'sidebar'];

// Allowed manifest types
const ALLOWED_TYPES = ['component', 'service', 'connector', 'compliance', 'visualization', 'gaming'];

// Results tracking
const results = {
  passed: 0,
  warnings: 0,
  errors: 0,
  packages: []
};

/**
 * Validate manifest.json structure
 */
async function validateManifest(packageName, manifestPath) {
  const issues = [];

  try {
    const content = await readFile(manifestPath, 'utf-8');
    let manifest;

    try {
      manifest = JSON.parse(content);
    } catch (parseError) {
      issues.push({ type: 'error', msg: `Invalid JSON: ${parseError.message}` });
      return issues;
    }

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!(field in manifest)) {
        issues.push({ type: 'error', msg: `Missing required field: ${field}` });
      }
    }

    // Check type is valid
    if (manifest.type && !ALLOWED_TYPES.includes(manifest.type)) {
      issues.push({ type: 'warning', msg: `Unknown type "${manifest.type}" - should be one of: ${ALLOWED_TYPES.join(', ')}` });
    }

    // Check components array
    if (!manifest.components || !Array.isArray(manifest.components) || manifest.components.length === 0) {
      issues.push({ type: 'error', msg: 'Missing or empty "components" array' });
    } else {
      // First component should NOT be a service class
      const firstComp = manifest.components[0];
      for (const pattern of SERVICE_PATTERNS) {
        if (firstComp.endsWith(pattern)) {
          issues.push({ type: 'error', msg: `First component "${firstComp}" appears to be a service class. First component should be the UI component for sidebar integration.` });
        }
      }
    }

    // Check entry point
    const entry = manifest.entry || './frontend/index.ts';
    const entryPath = resolve(dirname(manifestPath), entry);
    if (!existsSync(entryPath)) {
      issues.push({ type: 'error', msg: `Entry point not found: ${entry}` });
    }

    // Check for documentation
    if (!manifest.documentation) {
      issues.push({ type: 'warning', msg: 'Missing documentation section' });
    }

    // Check sidebar is boolean
    if (typeof manifest.sidebar !== 'boolean') {
      issues.push({ type: 'warning', msg: `"sidebar" should be boolean, got ${typeof manifest.sidebar}` });
    }

  } catch (error) {
    issues.push({ type: 'error', msg: `Failed to read manifest: ${error.message}` });
  }

  return issues;
}

/**
 * Validate entry point exports
 */
async function validateEntryPoint(packageName, packageDir) {
  const issues = [];
  const entryPath = join(packageDir, 'frontend', 'index.ts');

  if (!existsSync(entryPath)) {
    issues.push({ type: 'error', msg: 'Entry point frontend/index.ts not found' });
    return issues;
  }

  try {
    const content = await readFile(entryPath, 'utf-8');

    // Check for default export (required for sidebar modules)
    // Valid patterns:
    // - export default X
    // - export { default } from '...'
    // - export { default, default as X } from '...'
    // - export { X as default } from '...'
    // - export { X, default } from '...'
    const hasDefaultExport =
      content.includes('export default') ||
      /export\s*\{[^}]*\bdefault\b[^}]*\}/.test(content);

    if (!hasDefaultExport) {
      issues.push({ type: 'warning', msg: 'No default export found - required for sidebar integration' });
    }

    // Check for common issues
    if (content.includes("from './components/SocialCortexIntegration'")) {
      issues.push({ type: 'error', msg: 'Unresolved import: SocialCortexIntegration (use @/components/devportal/ path)' });
    }

    if (content.includes("from '../lib/assistantsClient")) {
      issues.push({ type: 'error', msg: 'Unresolved import: assistantsClient (use @/components/lib/ path)' });
    }

    // Check for relative remix imports that might break
    if (content.includes("from './remix'") && !existsSync(join(packageDir, 'frontend', 'remix'))) {
      issues.push({ type: 'error', msg: 'Import ./remix not found - check path' });
    }

  } catch (error) {
    issues.push({ type: 'error', msg: `Failed to read entry point: ${error.message}` });
  }

  return issues;
}

/**
 * Validate image assets exist
 */
async function validateAssets(packageName, packageDir) {
  const issues = [];
  const assetsDir = join(packageDir, 'assets');
  const imagesDir = join(assetsDir, 'images');

  if (!existsSync(assetsDir)) {
    issues.push({ type: 'warning', msg: 'Missing assets/ directory' });
    return issues;
  }

  if (!existsSync(imagesDir)) {
    issues.push({ type: 'warning', msg: 'Missing assets/images/ directory' });
    return issues;
  }

  // Check for hero image (used in catalog)
  const heroPath = join(imagesDir, 'hero.png');
  if (!existsSync(heroPath)) {
    // Try hero.jpg
    const heroJpgPath = join(imagesDir, 'hero.jpg');
    if (!existsSync(heroJpgPath)) {
      issues.push({ type: 'warning', msg: 'Missing hero.png or hero.jpg in assets/images/' });
    }
  }

  return issues;
}

/**
 * Check for common TypeScript/import issues
 */
async function checkTypeScriptFiles(packageName, packageDir) {
  const issues = [];
  const frontendDir = join(packageDir, 'frontend');

  if (!existsSync(frontendDir)) {
    return issues;
  }

  async function scanDir(dir) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          const content = await readFile(fullPath, 'utf-8');
          const relativePath = fullPath.replace(packageDir + '\\', '').replace(packageDir + '/', '');

          // Check for problematic imports
          if (content.includes("from 'three/examples")) {
            issues.push({ type: 'warning', msg: `${relativePath}: Imports from three/examples may not be available in bundle` });
          }

          // Check for import * as THREE patterns
          if (content.includes("import * as THREE from 'three'") || content.includes('import * as THREE from "three"')) {
            // This is fine, but needs runtime THREE global
          }

          // Check for @/ imports that might not resolve
          const atImports = content.match(/from ['"]@\/[^'"]+['"]/g) || [];
          for (const imp of atImports) {
            // In marketplace packages, @/ should resolve to ./frontend/ per build config
            // But sometimes people copy code expecting it to be the main app's @/
            if (imp.includes('@/components/ui') || imp.includes('@/services/api') || imp.includes('@/contexts/')) {
              issues.push({ type: 'warning', msg: `${relativePath}: ${imp} - Main app import may not resolve in standalone bundle` });
            }
          }
        }
      }
    } catch (err) {
      // Directory might not exist
    }
  }

  await scanDir(frontendDir);
  return issues;
}

/**
 * Validate a single package
 */
async function validatePackage(packageName) {
  const packageDir = join(PACKAGES_DIR, packageName);
  const manifestPath = join(packageDir, 'manifest.json');

  const pkgResult = {
    name: packageName,
    issues: [],
    hasErrors: false,
    hasWarnings: false
  };

  // Check if manifest exists
  if (!existsSync(manifestPath)) {
    pkgResult.issues.push({ type: 'error', msg: 'Missing manifest.json' });
    pkgResult.hasErrors = true;
    return pkgResult;
  }

  // Run all validations
  const manifestIssues = await validateManifest(packageName, manifestPath);
  const entryIssues = await validateEntryPoint(packageName, packageDir);
  const assetIssues = await validateAssets(packageName, packageDir);
  const tsIssues = await checkTypeScriptFiles(packageName, packageDir);

  pkgResult.issues = [...manifestIssues, ...entryIssues, ...assetIssues, ...tsIssues];

  for (const issue of pkgResult.issues) {
    if (issue.type === 'error') pkgResult.hasErrors = true;
    if (issue.type === 'warning') pkgResult.hasWarnings = true;
  }

  return pkgResult;
}

/**
 * Main function
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Preflight Validation - Package Structure Check       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const packages = await readdir(PACKAGES_DIR);
  const buildablePackages = packages.filter(p =>
    !SKIP_PACKAGES.includes(p) && !p.startsWith('.')
  );

  console.log(`📦 Checking ${buildablePackages.length} packages...\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let totalErrors = 0;
  let totalWarnings = 0;
  let passedCount = 0;

  for (const pkg of buildablePackages) {
    const result = await validatePackage(pkg);
    results.packages.push(result);

    if (result.hasErrors) {
      console.log(`❌ ${pkg}`);
      totalErrors += result.issues.filter(i => i.type === 'error').length;
    } else if (result.hasWarnings) {
      console.log(`⚠️  ${pkg}`);
      totalWarnings += result.issues.filter(i => i.type === 'warning').length;
    } else {
      console.log(`✅ ${pkg}`);
      passedCount++;
    }

    // Print issues for this package
    for (const issue of result.issues) {
      const icon = issue.type === 'error' ? '   ❌' : '   ⚠️';
      console.log(`${icon} ${issue.msg}`);
    }

    if (result.issues.length > 0) console.log('');
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Summary:\n');
  console.log(`   ✅ Passed:   ${passedCount}`);
  console.log(`   ⚠️  Warnings: ${totalWarnings}`);
  console.log(`   ❌ Errors:   ${totalErrors}`);
  console.log('');

  if (totalErrors > 0) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ❌ PREFLIGHT FAILED - Fix errors before building          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  Preflight passed with warnings                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    process.exit(0);
  } else {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL PACKAGES PASSED - Ready to build                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
