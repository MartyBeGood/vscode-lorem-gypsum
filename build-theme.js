#!/usr/bin/env node
'use strict';
// Generate VSCode color themes combining default VSCode UI colors with
// Alabaster-style minimal syntax highlighting.
// Run fetch-upstream.js first to populate upstream-themes/, then:
// Usage: node build-theme.js  (or: npm run generate)

const fs = require('fs');
const path = require('path');

const {
  THEME_FILES,
  resolveAllThemes,
  extractPaletteForTheme,
} = require('./extract-colors');

const REPO_ROOT = __dirname;
const THEMES_DIR = path.join(REPO_ROOT, 'themes');

function loadJsonWithComments(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const withoutBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLineComments = withoutBlockComments.replace(/\/\/[^\n]*/g, '');
  const withoutTrailingCommas = withoutLineComments.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(withoutTrailingCommas);
}

const TEMPLATE = loadJsonWithComments(path.join(REPO_ROOT, 'token-colors.json'));

// Filename -> [display_name, uiTheme]
// uiTheme must be one of: "vs", "vs-dark", "hc-black", "hc-light"
const THEME_METADATA = {
  'dark_vs.json':     ['Lorem Gypsum Dark (Visual Studio)', 'vs-dark'],
  'dark_plus.json':   ['Lorem Gypsum Dark+',                'vs-dark'],
  'dark_modern.json': ['Lorem Gypsum Dark Modern',          'vs-dark'],
  'light_vs.json':    ['Lorem Gypsum Light (Visual Studio)', 'vs'],
  'light_plus.json':  ['Lorem Gypsum Light+',               'vs'],
  'light_modern.json':['Lorem Gypsum Light Modern',         'vs'],
  'hc_black.json':    ['Lorem Gypsum High Contrast',        'hc-black'],
  'hc_light.json':    ['Lorem Gypsum High Contrast Light',  'hc-light'],
  '2026-dark.json':   ['Lorem Gypsum 2026 Dark',            'vs-dark'],
  '2026-light.json':  ['Lorem Gypsum 2026 Light',           'vs'],
};

const UI_THEME_TO_TYPE = {
  'vs-dark':  'dark',
  'vs':       'light',
  'hc-black': 'hc',
  'hc-light': 'hc',
};

function buildTheme(sourceFilename, displayName, resolvedThemes) {
  const [, uiTheme] = THEME_METADATA[sourceFilename];
  const resolved = resolvedThemes[sourceFilename];
  const palette = extractPaletteForTheme(sourceFilename, resolvedThemes);

  const tokenColors = JSON.parse(
    JSON.stringify(TEMPLATE),
    (key, value) => {
      if (typeof value !== 'string' || !value.startsWith('$')) return value;
      const palKey = value.slice(1);
      if (!(palKey in palette)) {
        console.warn(`  WARNING: ${sourceFilename}: unresolved placeholder $${palKey}`);
      }
      return palette[palKey] ?? value;
    }
  );

  const theme = {
    $schema: 'vscode://schemas/color-theme',
    name: displayName,
    type: UI_THEME_TO_TYPE[uiTheme] || 'dark',
    colors: resolved.colors || {},
    tokenColors,
    semanticHighlighting: false,
  };

  const outPath = path.join(THEMES_DIR, sourceFilename);
  fs.writeFileSync(outPath, JSON.stringify(theme, null, 2) + '\n', 'utf-8');

  console.log(`  ${displayName}`);
  for (const [name, color] of Object.entries(palette)) {
    console.log(`    $${name} -> ${color}`);
  }
}

function updatePackageJson(themesManifest) {
  const pkgPath = path.join(REPO_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name = 'vscode-lorem-gypsum';
  pkg.displayName = 'Lorem Gypsum';
  pkg.contributes.themes = themesManifest;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

function main() {
  fs.mkdirSync(THEMES_DIR, { recursive: true });

  console.log('Loading upstream themes...');
  const resolvedThemes = resolveAllThemes();

  // Clear stale generated theme files
  for (const fname of fs.readdirSync(THEMES_DIR)) {
    if (fname.endsWith('.json')) {
      fs.unlinkSync(path.join(THEMES_DIR, fname));
      console.log(`  Removed stale: ${fname}`);
    }
  }

  const themesManifest = [];

  console.log('\nGenerating themes...');
  for (const filename of THEME_FILES) {
    if (!(filename in THEME_METADATA)) {
      console.log(`  WARNING: ${filename} not in THEME_METADATA, skipping`);
      continue;
    }

    const [displayName, uiTheme] = THEME_METADATA[filename];
    buildTheme(filename, displayName, resolvedThemes);
    themesManifest.push({
      label: displayName,
      uiTheme,
      path: `./themes/${filename}`,
    });
  }

  updatePackageJson(themesManifest);

  console.log(`\nDone! Generated ${themesManifest.length} themes.`);
  console.log('Next steps:');
  console.log('  1. Press F5 in VSCode to test');
  console.log('  2. Bump version in package.json');
  console.log('  3. vsce publish');
}

if (require.main === module) {
  main();
}
