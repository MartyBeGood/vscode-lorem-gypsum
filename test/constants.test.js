import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themeFiles, themeMetadata, repoRoot, upstreamDir, palettesDir, themesDir, vsCodeThemesBase, alabasterThemeBase } from '../src/constants.js';

const validUiThemes = new Set(['vs', 'vs-dark', 'hc-black', 'hc-light']);
const validTypes = new Set(['dark', 'light', 'hc']);

test('themeFiles matches Object.keys(themeMetadata)', () => {
  assert.deepEqual(themeFiles, Object.keys(themeMetadata));
});

test('themeFiles contains only .json filenames', () => {
  for (const filename of themeFiles) {
    assert.ok(filename.endsWith('.json'), `${filename} should end with .json`);
  }
});

test('each themeMetadata entry has a non-empty displayName', () => {
  for (const [filename, meta] of Object.entries(themeMetadata)) {
    assert.ok(
      typeof meta.displayName === 'string' && meta.displayName.length > 0,
      `${filename}: displayName should be a non-empty string`
    );
  }
});

test('each themeMetadata entry has a valid uiTheme', () => {
  for (const [filename, meta] of Object.entries(themeMetadata)) {
    assert.ok(
      validUiThemes.has(meta.uiTheme),
      `${filename}: uiTheme "${meta.uiTheme}" should be one of ${[...validUiThemes].join(', ')}`
    );
  }
});

test('each themeMetadata entry has a valid type', () => {
  for (const [filename, meta] of Object.entries(themeMetadata)) {
    assert.ok(
      validTypes.has(meta.type),
      `${filename}: type "${meta.type}" should be one of ${[...validTypes].join(', ')}`
    );
  }
});

test('hc-black uiTheme entries have type hc', () => {
  for (const [filename, meta] of Object.entries(themeMetadata)) {
    if (meta.uiTheme === 'hc-black' || meta.uiTheme === 'hc-light') {
      assert.equal(meta.type, 'hc', `${filename}: hc uiTheme should have type 'hc'`);
    }
  }
});

test('vs uiTheme entries have type light', () => {
  for (const [filename, meta] of Object.entries(themeMetadata)) {
    if (meta.uiTheme === 'vs') {
      assert.equal(meta.type, 'light', `${filename}: vs uiTheme should have type 'light'`);
    }
  }
});

test('vs-dark uiTheme entries have type dark', () => {
  for (const [filename, meta] of Object.entries(themeMetadata)) {
    if (meta.uiTheme === 'vs-dark') {
      assert.equal(meta.type, 'dark', `${filename}: vs-dark uiTheme should have type 'dark'`);
    }
  }
});

test('directory paths are absolute', () => {
  for (const dir of [repoRoot, upstreamDir, palettesDir, themesDir]) {
    assert.ok(dir.startsWith('/'), `${dir} should be an absolute path`);
  }
});

test('vsCodeThemesBase is the expected GitHub raw URL', () => {
  assert.ok(vsCodeThemesBase.startsWith('https://raw.githubusercontent.com/microsoft/vscode/'));
  assert.ok(vsCodeThemesBase.includes('theme-defaults/themes'));
});

test('alabasterThemeBase is the expected GitHub raw URL', () => {
  assert.ok(alabasterThemeBase.startsWith('https://raw.githubusercontent.com/tonsky/vscode-theme-alabaster/'));
});
