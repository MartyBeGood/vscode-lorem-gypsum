#!/usr/bin/env node
// Extract placeholder color palettes from upstream VSCode themes.
// Run fetch-upstream.js first to populate upstream-themes/, then:
// Usage: node src/extract-colors.js  (or: npm run extract-colors)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { themeFiles, upstreamDir, palettesDir } from './constants.js';

const schemaPath = path.join(palettesDir, 'palette.schema.json');
const schemaRef = './palette.schema.json';

// Color mappings: placeholder name -> source scope to extract from.
const defaultMappings = {
  comment: 'string',
  string: 'comment',
  escape: 'keyword.control',
  constant: 'keyword.control',
  entityName: 'constant.language',
  invalid: 'invalid',
};

const mappingsFor2026Themes = {
  comment: 'keyword',
  string: 'entity.name.tag',
  escape: 'constant',
  constant: 'keyword.control',
  entityName: 'string',
};

export const mappingsOverrides = {
  '2026-dark.json': mappingsFor2026Themes,
  '2026-light.json': mappingsFor2026Themes,
};

function validateMappingsAgainstSchema() {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const schemaKeys = new Set(Object.keys(schema.properties).filter((k) => k !== '$schema'));
  const allMappingKeys = new Set([
    ...Object.keys(defaultMappings),
    ...Object.values(mappingsOverrides).flatMap(Object.keys),
  ]);
  const missing = [...allMappingKeys].filter((k) => !schemaKeys.has(k));
  if (missing.length > 0) {
    throw new Error(`Mapping keys not in schema: ${missing.join(', ')}`);
  }
}

function loadUpstream(filename) {
  const filePath = path.join(upstreamDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing upstream file: ${filePath}\n` +
      'Run `node src/fetch-upstream.js` (or `npm run fetch-upstream`) to download upstream theme files.'
    );
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function resolveTheme(filename, raw, memo) {
  if (filename in memo) return memo[filename];

  const data = raw[filename];
  if (!data) throw new Error(`Theme file not found in raw cache: ${filename}`);

  let resolved;
  if (data.include) {
    const parentFilename = path.basename(data.include);
    const parent = resolveTheme(parentFilename, raw, memo);
    const colors = { ...parent.colors, ...data.colors };
    const tokenColors = [...(data.tokenColors || []), ...(parent.tokenColors || [])];
    resolved = { ...data, colors, tokenColors };
    delete resolved.include;
  } else {
    resolved = { ...data };
  }

  memo[filename] = resolved;
  return resolved;
}

export function resolveAllThemes() {
  const raw = {};
  for (const filename of themeFiles) {
    raw[filename] = loadUpstream(filename);
  }

  const resolvedThemes = {};
  for (const filename of themeFiles) {
    resolveTheme(filename, raw, resolvedThemes);
  }

  return resolvedThemes;
}

function extractColorByScope(tokenColors, targetScope) {
  let fallback = null;
  for (const rule of tokenColors) {
    let scopes = rule.scope || [];
    if (typeof scopes === 'string') {
      scopes = scopes.split(',').map((scope) => scope.trim());
    }

    for (const scope of scopes) {
      const normalizedScope = scope.trim();
      if (normalizedScope === targetScope) {
        const foreground = rule.settings?.foreground;
        if (foreground) return foreground;
      } else if (fallback === null && normalizedScope.startsWith(targetScope + '.')) {
        const foreground = rule.settings?.foreground;
        if (foreground) fallback = foreground;
      }
    }
  }
  return fallback;
}

function extractColors(themeFilename, mappings, resolvedThemes) {
  const resolved = resolvedThemes[themeFilename];
  if (!resolved) throw new Error(`Theme not resolved: ${themeFilename}`);

  const tokenColors = resolved.tokenColors || [];
  const colors = {};
  for (const [name, sourceScope] of Object.entries(mappings)) {
    const color = extractColorByScope(tokenColors, sourceScope);
    if (color) colors[name] = color;
  }
  return colors;
}

export function getMappingsForTheme(sourceFilename) {
  return {
    ...defaultMappings,
    ...(mappingsOverrides[sourceFilename] || {}),
  };
}

export function extractPaletteForTheme(sourceFilename, resolvedThemes) {
  const mappings = getMappingsForTheme(sourceFilename);
  return extractColors(sourceFilename, mappings, resolvedThemes);
}

function writePalettes(resolvedThemes) {
  fs.mkdirSync(palettesDir, { recursive: true });

  for (const fname of fs.readdirSync(palettesDir)) {
    if (fname.endsWith('.json') && fname !== path.basename(schemaPath)) {
      fs.unlinkSync(path.join(palettesDir, fname));
      console.log(`  Removed stale: ${fname}`);
    }
  }

  for (const filename of themeFiles) {
    const palette = extractPaletteForTheme(filename, resolvedThemes);
    const outPath = path.join(palettesDir, filename);
    const output = { $schema: schemaRef, ...palette };
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
    console.log(`  Wrote palette: ${filename}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateMappingsAgainstSchema();
  console.log('Loading upstream themes...');
  const resolvedThemes = resolveAllThemes();

  console.log('\nWriting palettes...');
  writePalettes(resolvedThemes);

  console.log(`\nDone! Wrote ${themeFiles.length} palettes to palettes/.`);
}
