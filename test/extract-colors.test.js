import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMappingsForTheme,
  extractPaletteForTheme,
  resolveAllThemes,
  mappingsOverrides,
} from '../src/extract-colors.js';
import { themeFiles } from '../src/constants.js';

// --- getMappingsForTheme ---

test('getMappingsForTheme returns default mappings for an unknown theme', () => {
  const mappings = getMappingsForTheme('some-unknown-theme.json');
  assert.equal(mappings.comment, 'string');
  assert.equal(mappings.string, 'comment');
  assert.equal(mappings.escape, 'keyword.control');
  assert.equal(mappings.constant, 'keyword.control');
  assert.equal(mappings.entityName, 'constant.language');
  assert.equal(mappings.invalid, 'invalid');
});

test('getMappingsForTheme merges 2026 overrides for 2026-dark.json', () => {
  const mappings = getMappingsForTheme('2026-dark.json');
  // 2026 overrides these
  assert.equal(mappings.comment, mappingsOverrides['2026-dark.json'].comment);
  assert.equal(mappings.string, mappingsOverrides['2026-dark.json'].string);
  // default keys not overridden should still be present
  assert.ok('escape' in mappings);
});

test('getMappingsForTheme merges 2026 overrides for 2026-light.json', () => {
  const mappings = getMappingsForTheme('2026-light.json');
  assert.equal(mappings.comment, mappingsOverrides['2026-light.json'].comment);
});

test('getMappingsForTheme merges vs overrides for dark_vs.json', () => {
  const mappings = getMappingsForTheme('dark_vs.json');
  assert.equal(mappings.constant, mappingsOverrides['dark_vs.json'].constant);
  // defaults not overridden
  assert.equal(mappings.comment, 'string');
});

test('getMappingsForTheme merges vs overrides for light_vs.json', () => {
  const mappings = getMappingsForTheme('light_vs.json');
  assert.equal(mappings.constant, mappingsOverrides['light_vs.json'].constant);
});

test('getMappingsForTheme result is a new object (no mutation of defaults)', () => {
  const a = getMappingsForTheme('dark_vs.json');
  const b = getMappingsForTheme('dark_vs.json');
  a.comment = 'MUTATED';
  assert.notEqual(b.comment, 'MUTATED');
});

// --- extractPaletteForTheme ---

function makeResolvedThemes(filename, tokenColors, colors = {}) {
  return { [filename]: { tokenColors, colors } };
}

test('extractPaletteForTheme extracts color by exact scope match', () => {
  const resolvedThemes = makeResolvedThemes('dark_plus.json', [
    { scope: 'string', settings: { foreground: '#ce9178' } },
    { scope: 'comment', settings: { foreground: '#6a9955' } },
    { scope: 'keyword.control', settings: { foreground: '#c586c0' } },
    { scope: 'constant.language', settings: { foreground: '#569cd6' } },
    { scope: 'invalid', settings: { foreground: '#f44747' } },
  ]);
  const palette = extractPaletteForTheme('dark_plus.json', resolvedThemes);
  assert.equal(palette.comment, '#ce9178'); // comment <- 'string' scope
  assert.equal(palette.string, '#6a9955'); // string <- 'comment' scope
  assert.equal(palette.escape, '#c586c0'); // escape <- 'keyword.control' scope
  assert.equal(palette.constant, '#c586c0'); // constant <- 'keyword.control' scope
  assert.equal(palette.entityName, '#569cd6'); // entityName <- 'constant.language' scope
  assert.equal(palette.invalid, '#f44747'); // invalid <- 'invalid' scope
});

test('extractPaletteForTheme falls back to prefix match when exact scope absent', () => {
  const resolvedThemes = makeResolvedThemes('dark_plus.json', [
    { scope: 'string.quoted.double', settings: { foreground: '#aabbcc' } },
    { scope: 'comment.line', settings: { foreground: '#112233' } },
    { scope: 'keyword.control.flow', settings: { foreground: '#998877' } },
    { scope: 'constant.language.true', settings: { foreground: '#445566' } },
    { scope: 'invalid.illegal', settings: { foreground: '#ff0000' } },
  ]);
  const palette = extractPaletteForTheme('dark_plus.json', resolvedThemes);
  assert.equal(palette.comment, '#aabbcc'); // comment <- prefix match on 'string.*'
  assert.equal(palette.string, '#112233'); // string <- prefix match on 'comment.*'
  assert.equal(palette.escape, '#998877');
  assert.equal(palette.entityName, '#445566');
});

test('extractPaletteForTheme exact scope takes priority over prefix match', () => {
  const resolvedThemes = makeResolvedThemes('dark_plus.json', [
    { scope: 'string.quoted', settings: { foreground: '#prefix' } },
    { scope: 'string', settings: { foreground: '#exact' } },
    { scope: 'comment', settings: { foreground: '#111111' } },
    { scope: 'keyword.control', settings: { foreground: '#222222' } },
    { scope: 'constant.language', settings: { foreground: '#333333' } },
  ]);
  const palette = extractPaletteForTheme('dark_plus.json', resolvedThemes);
  assert.equal(palette.comment, '#exact');
});

test('extractPaletteForTheme skips rules without foreground', () => {
  const resolvedThemes = makeResolvedThemes('dark_plus.json', [
    { scope: 'string', settings: { fontStyle: 'bold' } }, // no foreground
    { scope: 'comment', settings: { foreground: '#aaaaaa' } },
    { scope: 'keyword.control', settings: { foreground: '#bbbbbb' } },
    { scope: 'constant.language', settings: { foreground: '#cccccc' } },
  ]);
  const palette = extractPaletteForTheme('dark_plus.json', resolvedThemes);
  assert.ok(!('comment' in palette)); // comment <- 'string' scope, which has no foreground
  assert.equal(palette.string, '#aaaaaa'); // string <- 'comment' scope
});

test('extractPaletteForTheme handles scope as comma-separated string', () => {
  const resolvedThemes = makeResolvedThemes('dark_plus.json', [
    { scope: 'keyword, string, entity', settings: { foreground: '#abcdef' } },
    { scope: 'comment', settings: { foreground: '#654321' } },
    { scope: 'keyword.control', settings: { foreground: '#111111' } },
    { scope: 'constant.language', settings: { foreground: '#222222' } },
  ]);
  const palette = extractPaletteForTheme('dark_plus.json', resolvedThemes);
  assert.equal(palette.comment, '#abcdef'); // comment <- 'string' scope, found in comma list
});

// --- resolveAllThemes (integration) ---

test('resolveAllThemes returns an entry for every theme file', () => {
  const resolved = resolveAllThemes();
  for (const filename of themeFiles) {
    assert.ok(filename in resolved, `${filename} should be in resolved themes`);
  }
});

test('resolveAllThemes gives each theme a tokenColors array', () => {
  const resolved = resolveAllThemes();
  for (const [filename, theme] of Object.entries(resolved)) {
    assert.ok(
      Array.isArray(theme.tokenColors),
      `${filename}: tokenColors should be an array`
    );
    assert.ok(theme.tokenColors.length > 0, `${filename}: tokenColors should not be empty`);
  }
});

test('resolveAllThemes resolves inheritance (no include key in result)', () => {
  const resolved = resolveAllThemes();
  for (const [filename, theme] of Object.entries(resolved)) {
    assert.ok(!('include' in theme), `${filename}: resolved theme should not have an 'include' key`);
  }
});

test('resolveAllThemes gives each theme a colors object', () => {
  const resolved = resolveAllThemes();
  for (const [filename, theme] of Object.entries(resolved)) {
    assert.ok(
      theme.colors !== null && typeof theme.colors === 'object',
      `${filename}: colors should be an object`
    );
  }
});
