#!/usr/bin/env node
'use strict';
// Generate VSCode color themes combining default VSCode UI colors with
// Alabaster-style minimal syntax highlighting.
// Run fetch-upstream.js first to populate upstream-themes/, then:
// Usage: node extract-colors.js  (or: npm run generate)

const fs = require('fs');
const path = require('path');

// --- Constants ---

const THEME_FILES = [
  'dark_modern.json',
  'light_modern.json',
  'dark_plus.json',
  'light_plus.json',
  '2026-dark.json',
  '2026-light.json',
  'dark_vs.json',
  'light_vs.json',
  'hc_black.json',
  'hc_light.json',
];

// Filename → [display_name, uiTheme]
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

const REPO_ROOT = __dirname;
const THEMES_DIR = path.join(REPO_ROOT, 'themes');
const UPSTREAM_DIR = path.join(REPO_ROOT, 'upstream-themes');

const TEMPLATE = require('./token-colors.json');

// --- Color mappings: placeholder name → source scope to extract from ---
//
// Each object maps every $placeholder in token-colors.json to the
// TextMate scope whose foreground color should fill that slot.

const DEFAULT_MAPPINGS = {
  comment:    'string',           // swap: comments steal the string color
  string:     'comment',          // swap: strings steal the comment color
  escape:     'keyword',
  constant:   'keyword',
  entityName: 'entity.name',
  punctuation:'keyword',
};

// HC themes: preserve Alabaster's original color roles (no comment/string swap)
const MAPPINGS_HC = {
  escape:     'keyword',
  constant:   'keyword',
  entityName: 'entity.name',
  punctuation:'keyword',
};

// 2026 (GitHub-style) themes:
// - Comments → keyword (red-ish)
// - Strings → entity.name.tag (green)
// - Constants/escape/punctuation → constant (distinct blue, not keyword red)
const MAPPINGS_2026 = {
  comment:    'keyword',
  string:     'entity.name.tag',
  escape:     'constant',
  constant:   'keyword.control',
  entityName: 'string',
  punctuation:'constant',
};

const MAPPINGS_OVERRIDES = {
  // 'hc_black.json':   MAPPINGS_HC,
  // 'hc_light.json':   MAPPINGS_HC,
  '2026-dark.json':  MAPPINGS_2026,
  '2026-light.json': MAPPINGS_2026,
};

function loadUpstream(filename) {
  const p = path.join(UPSTREAM_DIR, filename);
  if (!fs.existsSync(p)) {
    throw new Error(
      `Missing upstream file: ${p}\n` +
      'Run `node fetch-upstream.js` (or `npm run fetch-upstream`) to download upstream theme files.'
    );
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

// --- Theme inheritance resolution ---

const memo = {};

function resolveTheme(filename, raw) {
  if (filename in memo) return memo[filename];

  const data = raw[filename];
  if (!data) throw new Error(`Theme file not found in raw cache: ${filename}`);

  let resolved;
  if (data.include) {
    const parentFilename = path.basename(data.include);
    const parent = resolveTheme(parentFilename, raw);
    // colors: parent base, child overrides
    const colors = { ...parent.colors, ...data.colors };
    // tokenColors: child first so extractColorByScope finds the most specific override
    const tokenColors = [...(data.tokenColors || []), ...(parent.tokenColors || [])];
    resolved = { ...data, colors, tokenColors };
    delete resolved.include;
  } else {
    resolved = { ...data };
  }

  memo[filename] = resolved;
  return resolved;
}

function extractColorByScope(tokenColors, targetScope) {
  let fallback = null;
  for (const rule of tokenColors) {
    let scopes = rule.scope || [];
    if (typeof scopes === 'string') {
      scopes = scopes.split(',').map((s) => s.trim());
    }
    for (const scope of scopes) {
      const s = scope.trim();
      if (s === targetScope) {
        const fg = rule.settings?.foreground;
        if (fg) return fg;
      } else if (fallback === null && s.startsWith(targetScope + '.')) {
        const fg = rule.settings?.foreground;
        if (fg) fallback = fg;
      }
    }
  }
  return fallback;
}

// Returns an object mapping each placeholder name to the extracted color.
// mappings: { comment: 'string', string: 'comment', ... }
function extractColors(themeFilename, mappings) {
  const resolved = memo[themeFilename];
  if (!resolved) throw new Error(`Theme not resolved: ${themeFilename}`);

  const tokenColors = resolved.tokenColors || [];
  const colors = {};
  for (const [name, sourceScope] of Object.entries(mappings)) {
    const color = extractColorByScope(tokenColors, sourceScope);
    if (color) colors[name] = color;
  }
  return colors;
}

function buildTheme(sourceFilename, displayName) {
  const [, uiTheme] = THEME_METADATA[sourceFilename];
  const resolved = memo[sourceFilename];
  const mappings = MAPPINGS_OVERRIDES[sourceFilename] || DEFAULT_MAPPINGS;

  const colors = extractColors(sourceFilename, mappings);

  const tokenColors = JSON.parse(
    JSON.stringify(TEMPLATE),
    (key, value) =>
      typeof value === 'string' && value.startsWith('$')
        ? (colors[value.slice(1)] ?? value)
        : value
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
  for (const [name, color] of Object.entries(colors)) {
    console.log(`    $${name} → ${color}`);
  }
}

// --- package.json update ---

function updatePackageJson(themesManifest) {
  const pkgPath = path.join(REPO_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name = 'vscode-lorem-gypsum';
  pkg.displayName = 'Lorem Gypsum';
  pkg.contributes.themes = themesManifest;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

// --- Main ---

function main() {
  fs.mkdirSync(THEMES_DIR, { recursive: true });

  console.log('Loading upstream themes...');
  const raw = {};
  for (const filename of THEME_FILES) {
    raw[filename] = loadUpstream(filename);
  }

  // Clear stale generated theme files
  for (const fname of fs.readdirSync(THEMES_DIR)) {
    if (fname.endsWith('.json')) {
      fs.unlinkSync(path.join(THEMES_DIR, fname));
      console.log(`  Removed stale: ${fname}`);
    }
  }

  // Resolve all inheritance chains
  for (const filename of THEME_FILES) {
    resolveTheme(filename, raw);
  }

  const themesManifest = [];

  console.log('\nGenerating themes...');
  for (const filename of THEME_FILES) {
    if (!(filename in THEME_METADATA)) {
      console.log(`  WARNING: ${filename} not in THEME_METADATA, skipping`);
      continue;
    }

    const [displayName, uiTheme] = THEME_METADATA[filename];
    buildTheme(filename, displayName);
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

main();
