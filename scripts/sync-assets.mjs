#!/usr/bin/env node
/**
 * Sync Assets Script
 *
 * Copies package assets (images, icons) to the public folder
 * for serving via the exchange site.
 *
 * Usage:
 *   node scripts/sync-assets.mjs
 */

import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readdir, mkdir, copyFile, stat } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '..');
const PACKAGES_DIR = resolve(ROOT_DIR, 'packages');
const PUBLIC_PACKAGES_DIR = resolve(ROOT_DIR, 'public', 'packages');

const SKIP_PACKAGES = ['_shared', '_template', 'dev-portal', 'index.ts', 'package.json', 'tsconfig.json', 'pyproject.toml', 'pyrightconfig.json'];

/**
 * Recursively copy directory contents
 */
async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function syncPackageAssets(packageName) {
  const packageDir = join(PACKAGES_DIR, packageName);
  const assetsDir = join(packageDir, 'assets');
  const destDir = join(PUBLIC_PACKAGES_DIR, packageName, 'assets');

  if (!existsSync(assetsDir)) {
    return { skipped: true, reason: 'no assets folder' };
  }

  try {
    await copyDir(assetsDir, destDir);

    // Count files
    const countFiles = async (dir) => {
      if (!existsSync(dir)) return 0;
      const entries = await readdir(dir, { withFileTypes: true });
      let count = 0;
      for (const entry of entries) {
        if (entry.isDirectory()) {
          count += await countFiles(join(dir, entry.name));
        } else {
          count++;
        }
      }
      return count;
    };

    const fileCount = await countFiles(destDir);
    return { synced: true, files: fileCount };
  } catch (err) {
    return { error: true, message: err.message };
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Sync Assets - Copy Package Images to Public         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const packages = await readdir(PACKAGES_DIR);
  const buildablePackages = packages.filter(p =>
    !SKIP_PACKAGES.includes(p) && !p.startsWith('.')
  );

  await mkdir(PUBLIC_PACKAGES_DIR, { recursive: true });

  let synced = 0;
  let skipped = 0;
  let errors = 0;
  let totalFiles = 0;

  for (const pkg of buildablePackages) {
    const result = await syncPackageAssets(pkg);

    if (result.synced) {
      console.log(`[OK] ${pkg} - ${result.files} files`);
      synced++;
      totalFiles += result.files;
    } else if (result.skipped) {
      console.log(`⏭️  ${pkg} - ${result.reason}`);
      skipped++;
    } else if (result.error) {
      console.log(`[ERR] ${pkg} - ${result.message}`);
      errors++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`[STAT] Results: ${synced} packages synced, ${totalFiles} total files`);
  console.log(`   Skipped: ${skipped}, Errors: ${errors}`);
  console.log(`\n[DIR] Output: ${PUBLIC_PACKAGES_DIR}\n`);
}

main().catch(console.error);
