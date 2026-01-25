#!/usr/bin/env node
/**
 * Fix Exports Script
 *
 * Adds missing default exports to package index.ts files.
 * This is required for sidebar integration.
 *
 * Usage:
 *   node scripts/fix-exports.mjs
 */

import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '..');
const PACKAGES_DIR = resolve(ROOT_DIR, 'packages');

const SKIP_PACKAGES = ['_shared', '_template', 'dev-portal', 'index.ts', 'package.json', 'tsconfig.json', 'pyproject.toml', 'pyrightconfig.json'];

async function fixPackageExports(packageName) {
  const packageDir = join(PACKAGES_DIR, packageName);
  const indexPath = join(packageDir, 'frontend', 'index.ts');
  const manifestPath = join(packageDir, 'manifest.json');

  if (!existsSync(indexPath)) {
    return { skipped: true, reason: 'no index.ts' };
  }

  if (!existsSync(manifestPath)) {
    return { skipped: true, reason: 'no manifest.json' };
  }

  // Read manifest to find main component name
  const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
  const mainComponent = manifest.components?.[0];

  if (!mainComponent) {
    return { skipped: true, reason: 'no components in manifest' };
  }

  // Read current index.ts
  let content = await readFile(indexPath, 'utf-8');

  // Check if default export already exists
  if (content.includes('export default') || content.includes('export { default }')) {
    return { skipped: true, reason: 'already has default export' };
  }

  // Find the named export for the main component
  const exportPatterns = [
    // export { ComponentName } from './ComponentName'
    new RegExp(`export\\s*{\\s*(?:default\\s+as\\s+)?${mainComponent}\\s*}\\s*from`, 'g'),
    // export { default as ComponentName } from './ComponentName'
    new RegExp(`export\\s*{\\s*default\\s+as\\s+${mainComponent}\\s*}\\s*from\\s*['"]([^'"]+)['"]`, 'g'),
  ];

  let componentPath = null;

  // Try to find the component export path
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes(mainComponent) && line.includes('export') && line.includes('from')) {
      // Extract the path
      const pathMatch = line.match(/from\s*['"]([^'"]+)['"]/);
      if (pathMatch) {
        componentPath = pathMatch[1];
        break;
      }
    }
  }

  if (!componentPath) {
    // Try to guess the path from the component name
    const possiblePaths = [
      `./${mainComponent}`,
      `./components/${mainComponent}`,
      `./${mainComponent.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1)}`,
    ];

    for (const p of possiblePaths) {
      const fullPath = join(packageDir, 'frontend', p.replace(/^\.\//, '') + '.tsx');
      if (existsSync(fullPath)) {
        componentPath = p;
        break;
      }
    }
  }

  if (!componentPath) {
    return { skipped: true, reason: `could not find path for ${mainComponent}` };
  }

  // Add default export at the end
  const defaultExport = `\n// Default export for sidebar integration\nexport { default } from '${componentPath}';\n`;

  // Check if we need to add it
  if (!content.endsWith('\n')) {
    content += '\n';
  }

  content += defaultExport;

  await writeFile(indexPath, content);

  return { fixed: true, component: mainComponent, path: componentPath };
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Fix Exports - Adding Default Exports                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const packages = await readdir(PACKAGES_DIR);
  const buildablePackages = packages.filter(p =>
    !SKIP_PACKAGES.includes(p) && !p.startsWith('.')
  );

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const pkg of buildablePackages) {
    try {
      const result = await fixPackageExports(pkg);
      if (result.fixed) {
        console.log(`[OK] ${pkg} - added default export for ${result.component}`);
        fixed++;
      } else if (result.skipped) {
        console.log(`⏭️  ${pkg} - ${result.reason}`);
        skipped++;
      }
    } catch (err) {
      console.log(`[ERR] ${pkg} - ${err.message}`);
      errors++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`[STAT] Results: ${fixed} fixed, ${skipped} skipped, ${errors} errors\n`);
}

main().catch(console.error);
