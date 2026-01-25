#!/usr/bin/env node
/**
 * Fix Duplicate Exports Script
 *
 * Removes duplicate default exports that were incorrectly added.
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

async function fixPackage(packageName) {
  const indexPath = join(PACKAGES_DIR, packageName, 'frontend', 'index.ts');

  if (!existsSync(indexPath)) {
    return { skipped: true };
  }

  let content = await readFile(indexPath, 'utf-8');
  const originalContent = content;

  // Remove the duplicate default export we added
  // Pattern: // Default export for sidebar integration\nexport { default } from '...';\n
  content = content.replace(/\n\/\/ Default export for sidebar integration\nexport \{ default \} from '[^']+';(\n)?$/g, '');

  // Also handle case where it's export { default } from "..."
  content = content.replace(/\n\/\/ Default export for sidebar integration\nexport \{ default \} from "[^"]+";(\n)?$/g, '');

  if (content !== originalContent) {
    await writeFile(indexPath, content);
    return { fixed: true };
  }

  return { unchanged: true };
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Fix Duplicate Exports - Remove Incorrectly Added Exports  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const packages = await readdir(PACKAGES_DIR);
  const buildablePackages = packages.filter(p =>
    !SKIP_PACKAGES.includes(p) && !p.startsWith('.')
  );

  let fixed = 0;
  let unchanged = 0;

  for (const pkg of buildablePackages) {
    const result = await fixPackage(pkg);
    if (result.fixed) {
      console.log(`[OK] ${pkg} - removed duplicate export`);
      fixed++;
    } else if (result.unchanged) {
      console.log(`⏭️  ${pkg} - no changes needed`);
      unchanged++;
    }
  }

  console.log(`\n[STAT] Fixed: ${fixed}, Unchanged: ${unchanged}\n`);
}

main().catch(console.error);
