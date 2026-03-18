#!/usr/bin/env node
'use strict';
// Download upstream theme files into upstream-themes/.
// Run this before generate.js to refresh local copies of the VSCode default
// themes and the Alabaster theme.
// Usage: node fetch-upstream.js  (or: npm run fetch-upstream)

const fs = require('fs');
const path = require('path');

const vsCodeThemesBase =
  'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes';

const alabasterThemeBase =
  'https://raw.githubusercontent.com/tonsky/vscode-theme-alabaster/refs/heads/master/theme';

const vscodeThemeFiles = [
  'dark_vs.json',
  'light_vs.json',
  'hc_black.json',
  'hc_light.json',
  'dark_plus.json',
  'light_plus.json',
  'dark_modern.json',
  'light_modern.json',
  '2026-dark.json',
  '2026-light.json',
];

const repoRoot = __dirname;
const upstreamDir = path.join(repoRoot, 'upstream-themes');

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'vscode-default-alabaster/generate' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function stripJsoncComments(text) {
  // Preserve quoted strings; remove // line comments and /* */ block comments.
  text = text.replace(/"(?:[^"\\]|\\.)*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
    m.startsWith('"') ? m : ''
  );
  // Remove trailing commas before ] or }
  text = text.replace(/,(\s*[}\]])/g, '$1');
  return text;
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(stripJsoncComments(text));
}

async function fetchAndSave(url, filename) {
  const data = await fetchJson(url);
  const outPath = path.join(upstreamDir, filename);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`  ${filename}`);
}

async function fetchFirstAndSave(candidates, filename) {
  let lastError;
  for (const url of candidates) {
    try {
      await fetchAndSave(url, filename);
      return;
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`All candidates failed. Last error: ${lastError}`);
}

async function main() {
  fs.mkdirSync(upstreamDir, { recursive: true });

  console.log('Fetching VSCode default themes...');
  await Promise.all(
    vscodeThemeFiles.map((filename) => fetchAndSave(`${vsCodeThemesBase}/${filename}`, filename))
  );

  console.log('Fetching Alabaster theme...');
  await fetchAndSave(`${alabasterThemeBase}/alabaster-color-theme.json`, 'alabaster-color-theme.json');

  console.log(`\nDone! ${vscodeThemeFiles.length + 1} files saved to upstream-themes/`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
