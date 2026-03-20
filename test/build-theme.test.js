import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildTheme } from '../src/build-theme.js';
import { resolveAllThemes } from '../src/extract-colors.js';
import { themesDir } from '../src/constants.js';

const resolvedThemes = resolveAllThemes();
const outPath = path.join(themesDir, 'dark_plus.json');

function readOutput() {
  return JSON.parse(fs.readFileSync(outPath, 'utf-8'));
}

describe('buildTheme', () => {
  let content;

  before(() => {
    buildTheme('dark_plus.json', 'Test Dark+', resolvedThemes);
    content = readOutput();
  });

  test('writes the output file', () => {
    assert.ok(fs.existsSync(outPath));
  });

  test('has required top-level fields', () => {
    assert.equal(content.$schema, 'vscode://schemas/color-theme');
    assert.ok('name' in content);
    assert.ok('type' in content);
    assert.ok('colors' in content);
    assert.ok('tokenColors' in content);
    assert.ok('semanticHighlighting' in content);
  });

  test('uses the provided displayName', () => {
    assert.equal(content.name, 'Test Dark+');
  });

  test('sets type from themeMetadata', () => {
    assert.equal(content.type, 'dark');
  });

  test('sets semanticHighlighting to false', () => {
    assert.equal(content.semanticHighlighting, false);
  });

  test('tokenColors is a non-empty array', () => {
    assert.ok(Array.isArray(content.tokenColors));
    assert.ok(content.tokenColors.length > 0);
  });

  test('resolves all $placeholder tokens in tokenColors', () => {
    for (const rule of content.tokenColors) {
      if (rule.settings?.foreground) {
        assert.ok(
          !rule.settings.foreground.startsWith('$'),
          `Unresolved placeholder: ${rule.settings.foreground}`
        );
      }
    }
  });

  test('colors come from the resolved upstream theme', () => {
    // dark_plus inherits from dark_vs which defines editor.background
    assert.ok(typeof content.colors['editor.background'] === 'string');
  });
});
