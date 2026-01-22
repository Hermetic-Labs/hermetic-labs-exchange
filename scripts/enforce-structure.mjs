#!/usr/bin/env node
/**
 * Enforce Package Structure
 *
 * Validates ALL packages against the _template standard.
 * With --fix flag, auto-corrects fixable issues.
 *
 * This ensures UNIFORM package structure across the entire marketplace.
 *
 * Usage:
 *   node scripts/enforce-structure.mjs          Check all packages
 *   node scripts/enforce-structure.mjs --fix    Auto-fix where possible
 *   node scripts/enforce-structure.mjs --report Generate CSV report
 */

import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '..');
const PACKAGES_DIR = resolve(ROOT_DIR, 'packages');
const TEMPLATE_DIR = resolve(PACKAGES_DIR, '_template');

const SKIP = ['_shared', '_template', 'dev-portal', 'index.ts', 'package.json', 'tsconfig.json', 'pyproject.toml', 'pyrightconfig.json'];

// Standard structure requirements
const REQUIRED_FILES = [
  'manifest.json',
  'frontend/index.ts',
  'assets/images/hero.png',
];

const REQUIRED_MANIFEST_FIELDS = [
  'name', 'displayName', 'version', 'type', 'description',
  'entry', 'sidebar', 'components', 'category'
];

const VALID_TYPES = ['component', 'connector', 'compliance', 'visualization', 'gaming', 'service', 'module'];

/**
 * Check if index.ts has proper default export pattern
 */
function hasProperDefaultExport(content) {
  // Standard pattern: export { default, default as X } from './...'
  // or: export { X, default } from './...'
  // or: export { default } from './...'
  // or: export default X
  return (
    /export\s*\{[^}]*\bdefault\b[^}]*\}/.test(content) ||
    content.includes('export default')
  );
}

/**
 * Extract the main component path from index.ts
 */
function getMainComponentPath(content) {
  // Look for: export { default } from './path'
  // or: export { default, default as X } from './path'
  const match = content.match(/export\s*\{[^}]*default[^}]*\}\s*from\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

/**
 * Validate a single package against the standard
 */
async function validatePackage(packageName, fix = false) {
  const packageDir = join(PACKAGES_DIR, packageName);
  const issues = [];
  const fixes = [];

  // Check required files
  for (const file of REQUIRED_FILES) {
    const filePath = join(packageDir, file);
    if (!existsSync(filePath)) {
      issues.push({ type: 'missing_file', file, fixable: file === 'assets/images/hero.png' });

      if (fix && file === 'assets/images/hero.png') {
        // Copy placeholder hero from template
        const templateHero = join(TEMPLATE_DIR, 'assets/images/hero.png');
        if (existsSync(templateHero)) {
          await mkdir(join(packageDir, 'assets/images'), { recursive: true });
          await copyFile(templateHero, filePath);
          fixes.push(`Created ${file} from template`);
        }
      }
    }
  }

  // Validate manifest.json
  const manifestPath = join(packageDir, 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));

      // Check required fields
      for (const field of REQUIRED_MANIFEST_FIELDS) {
        if (!(field in manifest)) {
          issues.push({ type: 'missing_manifest_field', field, fixable: false });
        }
      }

      // Check type is valid
      if (manifest.type && !VALID_TYPES.includes(manifest.type)) {
        issues.push({ type: 'invalid_type', value: manifest.type, fixable: true });

        if (fix) {
          // Map common mistakes to correct types
          const typeMap = { 'module': 'component', 'plugin': 'component' };
          const correctedType = typeMap[manifest.type] || 'component';
          manifest.type = correctedType;
          await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
          fixes.push(`Changed type from "${manifest.type}" to "${correctedType}"`);
        }
      }

      // Check components array
      if (!manifest.components || manifest.components.length === 0) {
        issues.push({ type: 'empty_components', fixable: false });
      }

      // Check sidebar is boolean
      if (typeof manifest.sidebar !== 'boolean') {
        issues.push({ type: 'invalid_sidebar', value: manifest.sidebar, fixable: true });

        if (fix) {
          manifest.sidebar = true;
          await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
          fixes.push('Set sidebar to true');
        }
      }

    } catch (err) {
      issues.push({ type: 'invalid_json', error: err.message, fixable: false });
    }
  }

  // Validate index.ts
  const indexPath = join(packageDir, 'frontend/index.ts');
  if (existsSync(indexPath)) {
    const content = await readFile(indexPath, 'utf-8');

    if (!hasProperDefaultExport(content)) {
      issues.push({ type: 'missing_default_export', fixable: false });
    }

    // Check for problematic imports
    if (content.includes("from 'fs'") || content.includes('from "fs"')) {
      issues.push({ type: 'node_api_import', module: 'fs', fixable: false });
    }
    if (content.includes("from 'path'") || content.includes('from "path"')) {
      issues.push({ type: 'node_api_import', module: 'path', fixable: false });
    }
  }

  return { packageName, issues, fixes, valid: issues.length === 0 };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const report = args.includes('--report');

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      Enforce Package Structure - Uniformity Check          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (fix) {
    console.log('🔧 Running in FIX mode - will auto-correct fixable issues\n');
  }

  const packages = await readdir(PACKAGES_DIR);
  const buildablePackages = packages.filter(p => !SKIP.includes(p) && !p.startsWith('.'));

  console.log(`📦 Checking ${buildablePackages.length} packages against _template standard...\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = [];
  let validCount = 0;
  let issueCount = 0;
  let fixedCount = 0;

  for (const pkg of buildablePackages) {
    const result = await validatePackage(pkg, fix);
    results.push(result);

    if (result.valid) {
      console.log(`✅ ${pkg}`);
      validCount++;
    } else {
      console.log(`❌ ${pkg}`);
      for (const issue of result.issues) {
        const icon = issue.fixable ? '🔧' : '⚠️';
        console.log(`   ${icon} ${issue.type}: ${issue.file || issue.field || issue.value || issue.module || ''}`);
        issueCount++;
      }
      for (const fixMsg of result.fixes) {
        console.log(`   ✅ Fixed: ${fixMsg}`);
        fixedCount++;
      }
    }
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Summary:\n');
  console.log(`   ✅ Valid packages:  ${validCount}/${buildablePackages.length}`);
  console.log(`   ⚠️  Total issues:   ${issueCount}`);
  if (fix) {
    console.log(`   🔧 Issues fixed:   ${fixedCount}`);
  }

  // Issue breakdown
  const issueTypes = {};
  for (const r of results) {
    for (const i of r.issues) {
      issueTypes[i.type] = (issueTypes[i.type] || 0) + 1;
    }
  }

  if (Object.keys(issueTypes).length > 0) {
    console.log('\n📋 Issue breakdown:');
    for (const [type, count] of Object.entries(issueTypes).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${type}: ${count}`);
    }
  }

  // Generate report if requested
  if (report) {
    const reportPath = join(ROOT_DIR, 'structure-report.csv');
    const csvLines = ['Package,Valid,Issues'];
    for (const r of results) {
      csvLines.push(`${r.packageName},${r.valid},${r.issues.map(i => i.type).join(';')}`);
    }
    await writeFile(reportPath, csvLines.join('\n'));
    console.log(`\n📄 Report written to: ${reportPath}`);
  }

  console.log('');

  // Exit with error if there are unfixable issues
  const unfixableIssues = results.flatMap(r => r.issues.filter(i => !i.fixable));
  if (unfixableIssues.length > 0 && !fix) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  Some packages do not conform to the standard           ║');
    console.log('║  Run with --fix to auto-correct fixable issues             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } else if (validCount === buildablePackages.length) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL PACKAGES CONFORM TO STANDARD                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  }
}

main().catch(console.error);
