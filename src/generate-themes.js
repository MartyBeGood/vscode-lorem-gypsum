#!/usr/bin/env node
// Generate all VSCode color themes and refresh package.json theme manifest.
// Run fetch-upstream.js and extract-colors.js first, then:
// Usage: node src/generate-themes.js  (or: npm run generate)

import fs from 'fs';
import path from 'path';
import { themeFiles, repoRoot, themeMetadata, themesDir } from './constants.js';
import { resolveAllThemes } from './extract-colors.js';
import { buildTheme } from './build-theme.js';

function updatePackageJson(themesManifest) {
  const pkgPath = path.join(repoRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name = 'vscode-lorem-gypsum';
  pkg.displayName = 'Lorem Gypsum';
  pkg.contributes.themes = themesManifest;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

function main() {
  fs.mkdirSync(themesDir, { recursive: true });

  console.log('Loading upstream themes...');
  const resolvedThemes = resolveAllThemes();

  // Clear stale generated theme files
  for (const fname of fs.readdirSync(themesDir)) {
    if (fname.endsWith('.json')) {
      fs.unlinkSync(path.join(themesDir, fname));
      console.log(`  Removed stale: ${fname}`);
    }
  }

  const themesManifest = [];

  console.log('\nGenerating themes...');
  for (const filename of themeFiles) {
    const metadata = themeMetadata[filename];
    if (!metadata) {
      console.log(`  WARNING: ${filename} not in themeMetadata, skipping`);
      continue;
    }

    buildTheme(filename, metadata.displayName, resolvedThemes);
    themesManifest.push({
      label: metadata.displayName,
      uiTheme: metadata.uiTheme,
      path: `./themes/${filename}`,
    });
  }

  updatePackageJson(themesManifest);

  console.log(`\nDone! Generated ${themesManifest.length} themes.`);
}

main();
